# =========================================================
# NETSENTRY AI — Dataset Analysis Endpoint
# POST /api/dataset/analyze
# Receives CSV upload → runs existing pipeline → returns results
# =========================================================

import io
import pandas as pd
from fastapi import APIRouter, UploadFile, File, HTTPException

from services.attack_service import detect_attack, forecast_attack, calculate_risk, generate_explanation

router = APIRouter()


@router.post("/api/dataset/analyze")
async def analyze_dataset(file: UploadFile = File(...)):
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are accepted.")

    try:
        contents = await file.read()
        traffic_df = pd.read_csv(io.BytesIO(contents))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Could not read CSV: {e}")

    # Clean column names — matches app.py
    traffic_df.columns = traffic_df.columns.astype(str).str.strip()

    num_records  = len(traffic_df)
    num_features = len(traffic_df.columns)

    # ── Detection ─────────────────────────────────────────
    try:
        detection_result = detect_attack(traffic_df)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

    attack_type          = detection_result["attack_type"]
    detection_confidence = detection_result["detection_confidence"]
    attack_distribution  = detection_result["attack_distribution"]

    # ── Forecast ──────────────────────────────────────────
    try:
        future_probability = forecast_attack(traffic_df)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

    # ── Risk ──────────────────────────────────────────────
    risk_result = calculate_risk(attack_type, detection_confidence, future_probability)

    # ── XAI ───────────────────────────────────────────────
    feature_importance = generate_explanation()

    # ── Risk timeline (one point per 50-record chunk) ─────
    risk_data = _build_risk_timeline(traffic_df, detection_result["detection_features"])

    return {
        "dataset_name":         file.filename,
        "num_records":          num_records,
        "num_features":         num_features,
        "attack_type":          attack_type,
        "detection_confidence": detection_confidence,
        "unknown_pattern":      detection_result["unknown_pattern"],
        "future_probability":   future_probability,
        "risk_score":           risk_result["risk_score"],
        "risk_level":           risk_result["risk_level"],
        "recommended_action":   risk_result["recommended_action"],
        "feature_importance":   feature_importance,
        "attack_distribution":  attack_distribution,
        "risk_data":            risk_data,
    }


# ── Helpers ───────────────────────────────────────────────

def _build_risk_timeline(
    traffic_df: pd.DataFrame,
    detection_features: list[str],
    chunk_size: int = 50,
) -> list[dict]:
    """
    Splits data into chunks and runs the pipeline on each chunk
    to build a risk-score timeline for the chart.
    """
    from services.attack_service import _clean_df, get_attack_severity, SEQUENCE_FEATURES
    from services.ml_models import get_rf_model, get_label_encoder, get_lstm_model, get_scaler, get_device
    import numpy as np
    import torch

    rf_model      = get_rf_model()
    label_encoder = get_label_encoder()
    lstm_model    = get_lstm_model()
    scaler        = get_scaler()
    device        = get_device()

    has_lstm = all(f in traffic_df.columns for f in SEQUENCE_FEATURES)
    timeline  = []

    for i in range(0, min(len(traffic_df), 500), chunk_size):
        chunk = traffic_df.iloc[i : i + chunk_size]
        if len(chunk) == 0:
            break

        det = _clean_df(chunk[detection_features].copy())
        preds   = rf_model.predict(det)
        probs   = rf_model.predict_proba(det)
        names   = label_encoder.inverse_transform(preds)
        conf    = float(probs.max(axis=1).mean() * 100)
        attack  = pd.Series(names).value_counts().index[0]

        fut = 0.0
        if has_lstm and len(chunk) >= 20:
            lstm_df  = _clean_df(chunk[SEQUENCE_FEATURES].copy())
            scaled   = scaler.transform(lstm_df)
            seq      = scaled[-20:]
            t_in     = torch.tensor(seq, dtype=torch.float32).unsqueeze(0).to(device)
            lstm_model.eval()
            with torch.no_grad():
                fut = torch.sigmoid(lstm_model(t_in)).item() * 100

        severity   = get_attack_severity(attack)
        risk_score = min(0.40 * fut + 0.35 * conf + 0.25 * severity, 100)

        timeline.append({
            "index":      i + chunk_size,
            "risk_score": round(risk_score, 2),
            "attack":     attack,
        })

    return timeline
