# =========================================================
# NETSENTRY AI — Attack Detection & Forecast Service
# Wraps the EXISTING Random Forest + LSTM pipeline.
# Logic is preserved exactly from app/app.py.
# =========================================================

from collections import deque
from typing import Any

import numpy as np
import pandas as pd
import shap
import torch

from .ml_models import (
    get_rf_model,
    get_label_encoder,
    get_lstm_model,
    get_scaler,
    get_device,
)

# =========================================================
# LSTM SEQUENCE FEATURES — MUST MATCH app.py EXACTLY
# =========================================================

SEQUENCE_FEATURES = [
    "Flow Duration",
    "Total Fwd Packets",
    "Total Backward Packets",
    "Total Length of Fwd Packets",
    "Total Length of Bwd Packets",
    "Flow Bytes/s",
    "Flow Packets/s",
    "Packet Length Mean",
    "Packet Length Std",
    "Packet Length Variance",
]

# =========================================================
# ATTACK SEVERITY MAP — MUST MATCH app.py EXACTLY
# =========================================================

SEVERITY_MAP: dict[str, int] = {
    "BENIGN": 0,
    "BOT": 60,
    "PORTSCAN": 50,
    "FTP-PATATOR": 70,
    "SSH-PATATOR": 70,
    "DOS HULK": 90,
    "DOS GOLDENEYE": 90,
    "DOS SLOWLORIS": 85,
    "DOS SLOWHTTPTEST": 85,
    "DDOS": 100,
    "WEB ATTACK": 75,
}


def get_attack_severity(attack_name: str) -> int:
    """Mirrors app.py get_attack_severity() exactly."""
    normalized = str(attack_name).upper().replace("ï¿½", "-").strip()
    for key, value in SEVERITY_MAP.items():
        if key in normalized:
            return value
    return 50


def detect_unknown_pattern(probabilities: np.ndarray) -> dict[str, Any]:
    """Flag patterns that do not confidently match a trained RF class."""
    scores = np.asarray(probabilities, dtype=float).ravel()
    if scores.size == 0:
        return {"is_unknown": True, "anomaly_score": 100.0, "reason": "No class probabilities available."}

    ranked = np.sort(scores)[::-1]
    max_probability = float(ranked[0])
    margin = max_probability - float(ranked[1]) if len(ranked) > 1 else max_probability
    anomaly_score = min(100.0, max(0.0, (1.0 - max_probability) * 70 + (1.0 - margin) * 30))
    is_unknown = max_probability < 0.65 or margin < 0.15
    reason = (
        "Low classifier confidence or ambiguous class separation."
        if is_unknown else
        "Pattern matches a trained class with clear confidence."
    )
    return {
        "is_unknown": is_unknown,
        "anomaly_score": round(anomaly_score, 2),
        "max_probability": round(max_probability * 100, 2),
        "class_margin": round(margin * 100, 2),
        "reason": reason,
    }


# =========================================================
# PREPROCESSING HELPERS
# =========================================================

def _clean_df(df: pd.DataFrame) -> pd.DataFrame:
    """Coerce to numeric, drop inf, fill NaN — matches app.py."""
    df = df.apply(pd.to_numeric, errors="coerce")
    df = df.replace([np.inf, -np.inf], 0)
    df = df.fillna(0)
    return df


# =========================================================
# detect_attack()
# Runs Random Forest on the provided DataFrame.
# Returns detected attack name + average confidence.
# =========================================================

def detect_attack(traffic_df: pd.DataFrame) -> dict[str, Any]:
    rf_model      = get_rf_model()
    label_encoder = get_label_encoder()

    detection_features = list(rf_model.feature_names_in_)

    # Validate columns
    missing = [f for f in detection_features if f not in traffic_df.columns]
    if missing:
        raise ValueError(f"Missing RF features: {missing[:5]}{'…' if len(missing) > 5 else ''}")

    detection_data = _clean_df(traffic_df[detection_features].copy())

    predictions   = rf_model.predict(detection_data)
    probabilities = rf_model.predict_proba(detection_data)
    attack_names  = label_encoder.inverse_transform(predictions)

    confidence_values = probabilities.max(axis=1) * 100
    detected_attack   = pd.Series(attack_names).value_counts().index[0]
    average_confidence = float(confidence_values.mean())

    # Per-attack count for distribution chart
    attack_distribution = (
        pd.Series(attack_names)
        .value_counts()
        .rename_axis("attack")
        .reset_index(name="count")
        .to_dict(orient="records")
    )

    return {
        "attack_type": detected_attack,
        "detection_confidence": round(average_confidence, 2),
        "unknown_pattern": detect_unknown_pattern(probabilities[-1]),
        "attack_distribution": attack_distribution,
        "detection_features": detection_features,
    }


# =========================================================
# forecast_attack()
# Runs LSTM on last 20 rows of the provided DataFrame.
# Returns future_attack_probability (0–100).
# =========================================================

def forecast_attack(traffic_df: pd.DataFrame) -> float:
    lstm_model = get_lstm_model()
    scaler     = get_scaler()
    device     = get_device()

    missing = [f for f in SEQUENCE_FEATURES if f not in traffic_df.columns]
    if missing:
        raise ValueError(f"Missing LSTM features: {missing}")

    if len(traffic_df) < 20:
        return 0.0

    lstm_data = _clean_df(traffic_df[SEQUENCE_FEATURES].copy())
    scaled    = scaler.transform(lstm_data)
    sequence  = scaled[-20:]

    lstm_input = (
        torch.tensor(sequence, dtype=torch.float32)
        .unsqueeze(0)
        .to(device)
    )

    lstm_model.eval()
    with torch.no_grad():
        output = lstm_model(lstm_input)
        probability = torch.sigmoid(output).item() * 100

    return round(float(probability), 2)


# =========================================================
# calculate_risk()
# Mirrors app.py risk formula EXACTLY.
# risk = 0.40*future_prob + 0.35*confidence + 0.25*severity
# =========================================================

def calculate_risk(
    attack_type: str,
    detection_confidence: float,
    future_probability: float,
) -> dict[str, Any]:

    severity   = get_attack_severity(attack_type)
    risk_score = (
        0.40 * future_probability
        + 0.35 * detection_confidence
        + 0.25 * severity
    )
    risk_score = min(round(risk_score, 2), 100)

    if risk_score < 30:
        risk_level = "LOW"
    elif risk_score < 70:
        risk_level = "MEDIUM"
    elif risk_score < 90:
        risk_level = "HIGH"
    else:
        risk_level = "CRITICAL"

    action_map = {
        "LOW":      "Continue monitoring network traffic.",
        "MEDIUM":   "Increase monitoring and inspect suspicious traffic.",
        "HIGH":     "Investigate immediately and consider blocking the source.",
        "CRITICAL": "Immediate response required. Isolate and investigate the threat.",
    }

    return {
        "risk_score":          risk_score,
        "risk_level":          risk_level,
        "recommended_action":  action_map[risk_level],
    }


# =========================================================
# generate_explanation()
# Returns Random Forest feature importances (XAI).
# =========================================================

def generate_explanation() -> list[dict[str, Any]]:
    rf_model = get_rf_model()
    features = list(rf_model.feature_names_in_)
    importances = rf_model.feature_importances_

    fi = sorted(
        zip(features, importances),
        key=lambda x: x[1],
        reverse=True,
    )

    return [
        {"feature": f, "importance": round(float(i), 6)}
        for f, i in fi[:15]
    ]


def explain_prediction(traffic_df: pd.DataFrame, max_features: int = 5) -> dict[str, Any]:
    """Explain the latest Random Forest prediction with per-event SHAP values."""
    rf_model = get_rf_model()
    label_encoder = get_label_encoder()
    features = list(rf_model.feature_names_in_)
    detection_data = _clean_df(traffic_df[features].copy())
    event = detection_data.iloc[[-1]]

    prediction = int(rf_model.predict(event)[0])
    attack_type = str(label_encoder.inverse_transform([prediction])[0])
    class_index = list(rf_model.classes_).index(prediction)

    shap_values = shap.TreeExplainer(rf_model).shap_values(event)
    if isinstance(shap_values, list):
        contributions = np.asarray(shap_values[class_index])[0]
    else:
        values = np.asarray(shap_values)
        contributions = values[0, :, class_index] if values.ndim == 3 else values[0]

    ranked = sorted(
        zip(features, event.iloc[0].to_numpy(), contributions),
        key=lambda item: abs(float(item[2])),
        reverse=True,
    )[:max_features]
    top_features = [
        {
            "feature": feature,
            "value": round(float(value), 4),
            "impact": round(float(impact), 4),
            "direction": "supports" if impact >= 0 else "opposes",
        }
        for feature, value, impact in ranked
    ]

    supporting = [item[0] for item in ranked if item[2] >= 0][:3]
    if supporting:
        feature_text = ", ".join(supporting[:-1])
        if len(supporting) > 1:
            feature_text += f" and {supporting[-1]}"
        else:
            feature_text = supporting[0]
        summary = f"This traffic was classified as {attack_type} mainly because of {feature_text}."
    else:
        summary = f"This traffic was classified as {attack_type}; no dominant positive feature contribution was found."

    return {
        "method": "SHAP TreeExplainer",
        "attack_type": attack_type,
        "summary": summary,
        "top_features": top_features,
    }
