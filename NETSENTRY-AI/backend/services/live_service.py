# =========================================================
# NETSENTRY AI — Live Monitoring Service
# Auto-loads the Monday dataset and loops continuously.
# Replicates the exact sliding-window pipeline from app.py.
# =========================================================

import asyncio
import json
import os
from collections import deque
from typing import AsyncGenerator, Any

import numpy as np
import pandas as pd
import torch

from .attack_service import (
    SEQUENCE_FEATURES,
    _clean_df,
    detect_unknown_pattern,
    explain_prediction,
    get_attack_severity,
)
from .alert_service import add_alert
from .ml_models import (
    get_rf_model,
    get_label_encoder,
    get_lstm_model,
    get_scaler,
    get_device,
)

# ── Default dataset path (used for auto-stream) ─────────────
_BASE_DIR    = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
_DATASET_DIR = os.path.join(_BASE_DIR, "dataset")

_DEFAULT_DATASETS = [
    "Monday-WorkingHours.pcap_ISCX.csv",
    "Friday-WorkingHours-Afternoon-DDos.pcap_ISCX.csv",
    "Friday-WorkingHours-Afternoon-PortScan.pcap_ISCX.csv",
    "Tuesday-WorkingHours.pcap_ISCX.csv",
    "Wednesday-workingHours.pcap_ISCX.csv",
]

# Global state
_live_results: list[dict[str, Any]] = []
_live_running: bool = False
_current_df:   pd.DataFrame | None = None


def is_running() -> bool:
    return _live_running


def get_live_results() -> list[dict[str, Any]]:
    return list(_live_results)


def set_dataframe(df: pd.DataFrame) -> None:
    """Called by the API router when a CSV is uploaded."""
    global _current_df
    _current_df = df


def get_or_load_dataframe() -> pd.DataFrame:
    """Return _current_df, or auto-load the first available dataset."""
    global _current_df
    if _current_df is not None:
        return _current_df

    for name in _DEFAULT_DATASETS:
        path = os.path.join(_DATASET_DIR, name)
        if os.path.exists(path):
            df = pd.read_csv(path)
            df.columns = df.columns.astype(str).str.strip()
            _current_df = df
            print(f"NETSENTRY AI — auto-loaded dataset: {name} ({len(df):,} rows)")
            return df

    raise RuntimeError("No dataset available. Upload a CSV via POST /api/live/start.")


# ── Batch size for one simulation pass ──────────────────────
_BATCH_SIZE = 60   # records per pass before looping


async def run_live_simulation(
    traffic_df: pd.DataFrame | None = None,
) -> AsyncGenerator[str, None]:
    """
    Continuously streams live simulation events.
    Loops over the dataset indefinitely (until the client disconnects).
    """
    global _live_results, _live_running

    if traffic_df is None:
        traffic_df = get_or_load_dataframe()

    _live_results = []
    _live_running = True

    rf_model      = get_rf_model()
    label_encoder = get_label_encoder()
    lstm_model    = get_lstm_model()
    scaler        = get_scaler()
    device        = get_device()

    detection_features = list(rf_model.feature_names_in_)

    try:
        pass_num = 0
        while True:            # ← loop forever
            pass_num += 1

            # Sample a fresh batch each pass
            batch = traffic_df.sample(
                n=min(_BATCH_SIZE, len(traffic_df)), random_state=None
            ).reset_index(drop=True)

            traffic_buffer: deque = deque(maxlen=20)

            for index, row in batch.iterrows():
                traffic_buffer.append(row.to_dict())

                if len(traffic_buffer) < 20:
                    await asyncio.sleep(0.05)
                    continue

                traffic_window = pd.DataFrame(list(traffic_buffer))

                # ── Random Forest ──────────────────────────────
                window_det   = _clean_df(traffic_window[detection_features].copy())
                window_preds = rf_model.predict(window_det)
                window_proba = rf_model.predict_proba(window_det)
                window_names = label_encoder.inverse_transform(window_preds)
                window_conf  = window_proba.max(axis=1) * 100

                live_attack     = pd.Series(window_names).value_counts().index[0]
                live_confidence = float(window_conf.mean())
                unknown_pattern = detect_unknown_pattern(window_proba[-1])
                shap_explanation = explain_prediction(traffic_window)

                # ── LSTM ───────────────────────────────────────
                window_lstm   = _clean_df(traffic_window[SEQUENCE_FEATURES].copy())
                window_scaled = scaler.transform(window_lstm)
                sequence      = window_scaled[-20:]

                lstm_input = (
                    torch.tensor(sequence, dtype=torch.float32)
                    .unsqueeze(0)
                    .to(device)
                )
                lstm_model.eval()
                with torch.no_grad():
                    output = lstm_model(lstm_input)
                    live_future_probability = torch.sigmoid(output).item() * 100

                # ── Risk Engine ────────────────────────────────
                live_severity   = get_attack_severity(live_attack)
                live_risk_score = (
                    0.40 * live_future_probability
                    + 0.35 * live_confidence
                    + 0.25 * live_severity
                )
                live_risk_score = min(round(live_risk_score, 2), 100)

                if live_risk_score < 30:
                    live_risk_level = "LOW"
                elif live_risk_score < 70:
                    live_risk_level = "MEDIUM"
                elif live_risk_score < 90:
                    live_risk_level = "HIGH"
                else:
                    live_risk_level = "CRITICAL"

                action_map = {
                    "LOW":      "Continue monitoring network traffic.",
                    "MEDIUM":   "Increase monitoring and inspect suspicious traffic.",
                    "HIGH":     "Investigate immediately and consider blocking the source.",
                    "CRITICAL": "Immediate response required. Isolate and investigate the threat.",
                }
                live_action = action_map[live_risk_level]

                alert_payload = None
                if live_risk_level in ("HIGH", "CRITICAL") or unknown_pattern["is_unknown"]:
                    alert_payload = {
                        "title": "POTENTIAL UNKNOWN THREAT" if unknown_pattern["is_unknown"] else f"{live_risk_level} THREAT",
                        "attack": live_attack,
                        "risk_score": live_risk_score,
                        "future_probability": round(live_future_probability, 2),
                        "recommended_action": live_action,
                    }

                result: dict[str, Any] = {
                    "record":               int(index) + 1,
                    "total":                _BATCH_SIZE,
                    "attack_type":          live_attack,
                    "detection_confidence": round(live_confidence, 2),
                    "future_probability":   round(live_future_probability, 2),
                    "risk_score":           live_risk_score,
                    "risk_level":           live_risk_level,
                    "recommended_action":   live_action,
                    "explanation":           shap_explanation,
                    "unknown_pattern":       unknown_pattern,
                    "alert":                  alert_payload,
                }
                _live_results.append(result)

                add_alert(
                    attack_type=live_attack,
                    confidence=round(live_confidence, 2),
                    future_probability=round(live_future_probability, 2),
                    risk_score=live_risk_score,
                    risk_level=live_risk_level,
                    recommended_action=live_action,
                    record_index=int(index) + 1,
                    unknown_pattern=unknown_pattern["is_unknown"],
                    anomaly_score=unknown_pattern["anomaly_score"],
                )

                yield f"data: {json.dumps(result)}\n\n"
                await asyncio.sleep(0.4)   # ~2–3 rows/sec for realistic feel

            # Brief pause between passes, signal loop restart
            yield f"data: {json.dumps({'event': 'loop', 'pass': pass_num})}\n\n"
            await asyncio.sleep(0.5)

    except asyncio.CancelledError:
        pass
    finally:
        _live_running = False
