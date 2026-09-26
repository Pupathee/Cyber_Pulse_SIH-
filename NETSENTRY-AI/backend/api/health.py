# =========================================================
# NETSENTRY AI — Health & Model Status Endpoints
# =========================================================

import os
import torch
from fastapi import APIRouter
from services.ml_models import (
    get_rf_model,
    get_label_encoder,
    get_device,
    RF_MODEL_PATH,
    LABEL_ENC_PATH,
    LSTM_MODEL_PATH,
    SCALER_PATH,
)

router = APIRouter()


@router.get("/api/health")
def health_check():
    return {"status": "online", "service": "NETSENTRY AI"}


@router.get("/api/model-status")
def model_status():
    files_ok = all(
        os.path.exists(p)
        for p in [RF_MODEL_PATH, LABEL_ENC_PATH, LSTM_MODEL_PATH, SCALER_PATH]
    )

    if files_ok:
        rf    = get_rf_model()
        le    = get_label_encoder()
        dev   = get_device()
        return {
            "status":           "ready",
            "detection_engine": "Random Forest",
            "forecast_engine":  "LSTM",
            "attack_classes":   list(le.classes_),
            "num_classes":      len(le.classes_),
            "rf_features":      len(rf.feature_names_in_),
            "compute":          "GPU" if torch.cuda.is_available() else "CPU",
        }
    else:
        return {"status": "error", "message": "One or more model files are missing."}
