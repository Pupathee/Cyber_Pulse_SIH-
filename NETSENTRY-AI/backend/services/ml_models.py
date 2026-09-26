# =========================================================
# NETSENTRY AI — ML Model Loader
# Loads the existing trained models EXACTLY as app.py does.
# DO NOT modify model architecture or weights.
# =========================================================

import os
import joblib
import torch
import torch.nn as nn

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
MODEL_DIR = os.path.join(BASE_DIR, "models")

RF_MODEL_PATH     = os.path.join(MODEL_DIR, "multi_class_attack_classifier.pkl")
LABEL_ENC_PATH    = os.path.join(MODEL_DIR, "attack_label_encoder.pkl")
LSTM_MODEL_PATH   = os.path.join(MODEL_DIR, "lstm_attack_forecaster.pth")
SCALER_PATH       = os.path.join(MODEL_DIR, "lstm_scaler.pkl")


# =========================================================
# LSTM ARCHITECTURE — MUST MATCH TRAINING EXACTLY
# input_size=10, hidden_size=64, num_layers=2
# =========================================================

class AttackLSTM(nn.Module):
    def __init__(self):
        super().__init__()
        self.lstm = nn.LSTM(
            input_size=10,
            hidden_size=64,
            num_layers=2,
            batch_first=True,
            dropout=0.2,
        )
        self.fc = nn.Linear(64, 1)

    def forward(self, x):
        output, _ = self.lstm(x)
        return self.fc(output[:, -1, :])


# =========================================================
# SINGLETON LOADER
# =========================================================

_rf_model      = None
_label_encoder = None
_lstm_model    = None
_scaler        = None
_device        = None


def load_models():
    global _rf_model, _label_encoder, _lstm_model, _scaler, _device

    if _rf_model is not None:
        return  # already loaded

    _rf_model      = joblib.load(RF_MODEL_PATH)
    _label_encoder = joblib.load(LABEL_ENC_PATH)

    _device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    _lstm_model = AttackLSTM().to(_device)
    _lstm_model.load_state_dict(
        torch.load(LSTM_MODEL_PATH, map_location=_device)
    )
    _lstm_model.eval()

    _scaler = joblib.load(SCALER_PATH)


def get_rf_model():
    load_models()
    return _rf_model

def get_label_encoder():
    load_models()
    return _label_encoder

def get_lstm_model():
    load_models()
    return _lstm_model

def get_scaler():
    load_models()
    return _scaler

def get_device():
    load_models()
    return _device
