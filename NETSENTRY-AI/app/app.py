# =========================================================
# NETSENTRY AI
# AI-BASED NETWORK ATTACK FORECASTING
# COMPLETE STREAMLIT DASHBOARD
# =========================================================

import os
import time
from collections import deque

import joblib
import numpy as np
import pandas as pd
import streamlit as st
import torch
import torch.nn as nn


# =========================================================
# PAGE CONFIG
# =========================================================

st.set_page_config(
    page_title="NETSENTRY AI",
    page_icon="🛡️",
    layout="wide",
    initial_sidebar_state="expanded"
)


# =========================================================
# CYBER SECURITY THEME
# =========================================================

st.markdown(
    """
<style>

.stApp {
    background:
        radial-gradient(
            circle at 10% 10%,
            rgba(0, 245, 212, 0.08),
            transparent 25%
        ),
        radial-gradient(
            circle at 90% 10%,
            rgba(0, 140, 255, 0.07),
            transparent 25%
        ),
        #050b14;
    color: #e8f7ff;
}

.block-container {
    max-width: 1450px;
    padding-top: 2rem;
    padding-bottom: 3rem;
}

.main-title {
    font-size: 44px;
    font-weight: 900;
    letter-spacing: 2px;
    color: #00f5d4;
    margin-bottom: 0;
}

.sub-title {
    color: #87a4b5;
    font-size: 15px;
    letter-spacing: 1.5px;
    margin-top: 4px;
}

.online-status {
    display: inline-block;
    margin-top: 14px;
    padding: 7px 14px;
    border-radius: 20px;
    color: #00ff9d;
    border: 1px solid rgba(0,255,157,.35);
    background: rgba(0,255,157,.07);
    font-weight: 700;
    font-size: 12px;
    letter-spacing: 1px;
}

.section-title {
    color: #00f5d4;
    font-size: 21px;
    font-weight: 800;
    letter-spacing: 1px;
    margin-top: 20px;
    margin-bottom: 6px;
}

.section-description {
    color: #88a2b2;
    font-size: 13px;
    margin-bottom: 15px;
}

.cyber-card {
    background:
        linear-gradient(
            145deg,
            rgba(14, 29, 44, 0.96),
            rgba(7, 17, 28, 0.96)
        );
    border: 1px solid rgba(0,245,212,.18);
    border-radius: 16px;
    padding: 20px;
    min-height: 145px;
    box-shadow: 0 0 22px rgba(0,245,212,.05);
}

.card-title {
    color: #7d99aa;
    font-size: 12px;
    font-weight: 800;
    letter-spacing: 1.4px;
    text-transform: uppercase;
}

.card-value {
    color: #ffffff;
    font-size: 26px;
    font-weight: 900;
    margin-top: 8px;
}

.card-desc {
    color: #7e95a4;
    font-size: 12px;
    line-height: 1.5;
    margin-top: 8px;
}

.info-box {
    background: rgba(0,245,212,.04);
    border-left: 3px solid #00f5d4;
    border-radius: 8px;
    padding: 14px 18px;
    color: #a6bdc9;
    margin: 12px 0;
}

.critical-box {
    background: rgba(255,45,65,.07);
    border: 1px solid rgba(255,45,65,.42);
    border-radius: 16px;
    padding: 20px;
}

.high-box {
    background: rgba(255,145,0,.07);
    border: 1px solid rgba(255,145,0,.40);
    border-radius: 16px;
    padding: 20px;
}

.medium-box {
    background: rgba(255,200,0,.06);
    border: 1px solid rgba(255,200,0,.35);
    border-radius: 16px;
    padding: 20px;
}

.low-box {
    background: rgba(0,255,157,.06);
    border: 1px solid rgba(0,255,157,.30);
    border-radius: 16px;
    padding: 20px;
}

.stButton > button {
    background:
        linear-gradient(
            90deg,
            #00bfa6,
            #00f5d4
        );
    color: #00120f;
    font-weight: 900;
    border: none;
    border-radius: 10px;
    padding: 10px 20px;
}

.stButton > button:hover {
    box-shadow: 0 0 22px rgba(0,245,212,.35);
}

[data-testid="stFileUploader"] {
    background: rgba(8,20,32,.75);
    border: 1px dashed rgba(0,245,212,.25);
    border-radius: 14px;
    padding: 12px;
}

[data-testid="stMetric"] {
    background:
        linear-gradient(
            145deg,
            rgba(12,26,41,.95),
            rgba(7,17,28,.95)
        );
    border: 1px solid rgba(0,245,212,.15);
    border-radius: 14px;
    padding: 14px;
}

</style>
""",
    unsafe_allow_html=True
)


# =========================================================
# SESSION STATE
# =========================================================

if "alert_history" not in st.session_state:
    st.session_state.alert_history = []

if "live_results" not in st.session_state:
    st.session_state.live_results = []

if "last_uploaded_file" not in st.session_state:
    st.session_state.last_uploaded_file = None


# =========================================================
# HEADER
# =========================================================

st.markdown(
    '<div class="main-title">🛡️ NETSENTRY AI</div>',
    unsafe_allow_html=True
)

st.markdown(
    '<div class="sub-title">'
    'AI-POWERED NETWORK ATTACK FORECASTING • SECURITY OPERATIONS CENTER'
    '</div>',
    unsafe_allow_html=True
)

st.markdown(
    '<span class="online-status">● AI ENGINE ONLINE</span>',
    unsafe_allow_html=True
)

st.write("")


# =========================================================
# PROJECT PATHS
# =========================================================

BASE_DIR = os.path.dirname(
    os.path.dirname(
        os.path.abspath(__file__)
    )
)

MODEL_DIR = os.path.join(
    BASE_DIR,
    "models"
)

RF_MODEL_PATH = os.path.join(
    MODEL_DIR,
    "multi_class_attack_classifier.pkl"
)

LABEL_ENCODER_PATH = os.path.join(
    MODEL_DIR,
    "attack_label_encoder.pkl"
)

LSTM_MODEL_PATH = os.path.join(
    MODEL_DIR,
    "lstm_attack_forecaster.pth"
)

SCALER_PATH = os.path.join(
    MODEL_DIR,
    "lstm_scaler.pkl"
)


# =========================================================
# CHECK MODEL FILES
# =========================================================

required_files = {
    "Random Forest model": RF_MODEL_PATH,
    "Label encoder": LABEL_ENCODER_PATH,
    "LSTM model": LSTM_MODEL_PATH,
    "LSTM scaler": SCALER_PATH
}

missing_files = [
    f"{name}: {path}"
    for name, path in required_files.items()
    if not os.path.exists(path)
]

if missing_files:

    st.error("❌ Required model files are missing.")

    for item in missing_files:
        st.write(item)

    st.stop()


# =========================================================
# LOAD RANDOM FOREST
# =========================================================

try:

    multi_model = joblib.load(
        RF_MODEL_PATH
    )

    label_encoder = joblib.load(
        LABEL_ENCODER_PATH
    )

except Exception as e:

    st.error(
        f"❌ Random Forest loading error: {e}"
    )

    st.stop()


# =========================================================
# LSTM MODEL
# =========================================================

class AttackLSTM(nn.Module):

    def __init__(self):

        super().__init__()

        self.lstm = nn.LSTM(
            input_size=10,
            hidden_size=64,
            num_layers=2,
            batch_first=True,
            dropout=0.2
        )

        self.fc = nn.Linear(
            64,
            1
        )

    def forward(self, x):

        output, _ = self.lstm(x)

        last_output = output[:, -1, :]

        return self.fc(last_output)


# =========================================================
# LOAD LSTM
# =========================================================

try:

    device = torch.device(
        "cuda"
        if torch.cuda.is_available()
        else "cpu"
    )

    lstm_model = AttackLSTM().to(device)

    lstm_model.load_state_dict(
        torch.load(
            LSTM_MODEL_PATH,
            map_location=device
        )
    )

    lstm_model.eval()

    scaler = joblib.load(
        SCALER_PATH
    )

except Exception as e:

    st.error(
        f"❌ LSTM loading error: {e}"
    )

    st.stop()


# =========================================================
# MODEL STATUS
# =========================================================

st.divider()

status_col1, status_col2, status_col3, status_col4 = st.columns(4)

with status_col1:
    st.metric(
        "Detection Engine",
        "Random Forest"
    )

with status_col2:
    st.metric(
        "Forecast Engine",
        "LSTM"
    )

with status_col3:
    st.metric(
        "Attack Classes",
        len(label_encoder.classes_)
    )

with status_col4:
    st.metric(
        "Compute",
        "GPU" if torch.cuda.is_available()
        else "CPU"
    )


# =========================================================
# SIDEBAR
# =========================================================

with st.sidebar:

    st.markdown("## 🛡️ NETSENTRY AI")

    st.markdown("---")

    st.write(
        "AI-powered network attack detection "
        "and forecasting."
    )

    st.markdown("### AI Pipeline")

    st.write("🔎 Random Forest — Detection")
    st.write("🧠 LSTM — Forecasting")
    st.write("⚠️ Risk Engine — Prioritization")
    st.write("🔍 XAI — Explanation")
    st.write("🚨 Alerts — Early Warning")

    st.markdown("---")

    st.markdown("### Supported Classes")

    for attack in label_encoder.classes_:
        st.write(f"• {attack}")

    st.markdown("---")

    st.caption(
        "NETSENTRY AI • SIH 2026 Prototype"
    )


# =========================================================
# TRAFFIC INPUT
# =========================================================

st.markdown(
    '<div class="section-title">'
    '📂 NETWORK TRAFFIC INPUT'
    '</div>',
    unsafe_allow_html=True
)

st.markdown(
    '<div class="section-description">'
    'Upload CIC-IDS2017 network-flow data for analysis.'
    '</div>',
    unsafe_allow_html=True
)

uploaded_file = st.file_uploader(
    "Upload Network Traffic CSV",
    type=["csv"],
    key="traffic_csv"
)


# =========================================================
# NO FILE STATE
# =========================================================

if uploaded_file is None:

    st.markdown(
        '<div class="cyber-card">'
        '<div class="card-title">📡 SYSTEM READY</div>'
        '<div class="card-value">Waiting for Network Traffic</div>'
        '<div class="card-desc">'
        'Upload a CIC-IDS2017 network traffic CSV to begin '
        'attack detection, forecasting, risk assessment '
        'and security monitoring.'
        '</div>'
        '</div>',
        unsafe_allow_html=True
    )

    st.write("")

    c1, c2, c3 = st.columns(3)

    with c1:

        st.markdown(
            '<div class="cyber-card">'
            '<div class="card-title">🔎 DETECT</div>'
            '<div class="card-desc">'
            'Random Forest identifies suspicious network '
            'activity and attack types.'
            '</div>'
            '</div>',
            unsafe_allow_html=True
        )

    with c2:

        st.markdown(
            '<div class="cyber-card">'
            '<div class="card-title">🧠 PREDICT</div>'
            '<div class="card-desc">'
            'LSTM analyzes recent traffic sequences to '
            'estimate future attack probability.'
            '</div>'
            '</div>',
            unsafe_allow_html=True
        )

    with c3:

        st.markdown(
            '<div class="cyber-card">'
            '<div class="card-title">🚨 PRIORITIZE</div>'
            '<div class="card-desc">'
            'Risk scoring and alerts help prioritize '
            'suspicious traffic.'
            '</div>'
            '</div>',
            unsafe_allow_html=True
        )

    st.stop()


# =========================================================
# READ DATA
# =========================================================

try:

    traffic_data = pd.read_csv(
        uploaded_file
    )

except Exception as e:

    st.error(
        f"❌ Could not read CSV: {e}"
    )

    st.stop()


# =========================================================
# CLEAN COLUMN NAMES
# =========================================================

traffic_data.columns = (
    traffic_data.columns
    .astype(str)
    .str.strip()
)


# =========================================================
# FILE CHANGE HANDLING
# =========================================================

current_file_name = uploaded_file.name

if (
    st.session_state.last_uploaded_file
    != current_file_name
):

    st.session_state.live_results = []

    st.session_state.last_uploaded_file = (
        current_file_name
    )


# =========================================================
# FILE INFO
# =========================================================

st.success(
    f"✅ Loaded {len(traffic_data):,} network records."
)

info_col1, info_col2, info_col3 = st.columns(3)

with info_col1:

    st.metric(
        "Traffic Records",
        f"{len(traffic_data):,}"
    )

with info_col2:

    st.metric(
        "Dataset Features",
        len(traffic_data.columns)
    )

with info_col3:

    st.metric(
        "Model Features",
        len(multi_model.feature_names_in_)
    )


with st.expander("👁️ View Traffic Preview"):

    st.dataframe(
        traffic_data.head(10),
        use_container_width=True
    )


# =========================================================
# FEATURE DEFINITIONS
# =========================================================

detection_features = list(
    multi_model.feature_names_in_
)

sequence_features = [
    "Flow Duration",
    "Total Fwd Packets",
    "Total Backward Packets",
    "Total Length of Fwd Packets",
    "Total Length of Bwd Packets",
    "Flow Bytes/s",
    "Flow Packets/s",
    "Packet Length Mean",
    "Packet Length Std",
    "Packet Length Variance"
]


# =========================================================
# FEATURE VALIDATION
# =========================================================

missing_detection = [
    f
    for f in detection_features
    if f not in traffic_data.columns
]

missing_lstm = [
    f
    for f in sequence_features
    if f not in traffic_data.columns
]

if missing_detection:

    st.error(
        "❌ Uploaded file is missing Random Forest features."
    )

    with st.expander("View Missing Features"):
        st.write(missing_detection)

    st.stop()


if missing_lstm:

    st.error(
        "❌ Uploaded file is missing LSTM features."
    )

    with st.expander("View Missing LSTM Features"):
        st.write(missing_lstm)

    st.stop()


# =========================================================
# ATTACK SEVERITY
# =========================================================

severity_map = {
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
    "WEB ATTACK": 75
}


def get_attack_severity(attack_name):

    normalized = (
        str(attack_name)
        .upper()
        .replace("�", "-")
        .strip()
    )

    for key, value in severity_map.items():

        if key in normalized:
            return value

    return 50


# =========================================================
# THREAT DETECTION
# =========================================================

st.markdown(
    '<div class="section-title">'
    '🔎 THREAT DETECTION'
    '</div>',
    unsafe_allow_html=True
)

st.markdown(
    '<div class="section-description">'
    'Random Forest identifies the most likely current '
    'network attack.'
    '</div>',
    unsafe_allow_html=True
)


detection_data = traffic_data[
    detection_features
].copy()

detection_data = detection_data.apply(
    pd.to_numeric,
    errors="coerce"
)

detection_data = detection_data.replace(
    [np.inf, -np.inf],
    0
)

detection_data = detection_data.fillna(0)


predictions = multi_model.predict(
    detection_data
)

probabilities = multi_model.predict_proba(
    detection_data
)

attack_names = label_encoder.inverse_transform(
    predictions
)

confidence_values = (
    probabilities.max(axis=1) * 100
)

detected_attack = (
    pd.Series(attack_names)
    .value_counts()
    .index[0]
)

average_confidence = float(
    confidence_values.mean()
)


# =========================================================
# LSTM FORECAST
# =========================================================

future_probability_percent = 0.0

if len(traffic_data) >= 20:

    lstm_data = traffic_data[
        sequence_features
    ].copy()

    lstm_data = lstm_data.apply(
        pd.to_numeric,
        errors="coerce"
    )

    lstm_data = lstm_data.replace(
        [np.inf, -np.inf],
        0
    )

    lstm_data = lstm_data.fillna(0)

    scaled_data = scaler.transform(
        lstm_data
    )

    latest_sequence = scaled_data[-20:]

    lstm_input = torch.tensor(
        latest_sequence,
        dtype=torch.float32
    ).unsqueeze(0).to(device)

    lstm_model.eval()

    with torch.no_grad():

        output = lstm_model(
            lstm_input
        )

        future_probability_percent = (
            torch.sigmoid(
                output
            ).item() * 100
        )


# =========================================================
# RISK ENGINE
# =========================================================

attack_severity = get_attack_severity(
    detected_attack
)

risk_score = (
    0.40 * future_probability_percent
    +
    0.35 * average_confidence
    +
    0.25 * attack_severity
)

risk_score = min(
    round(risk_score, 2),
    100
)


if risk_score < 30:

    risk_level = "LOW"

elif risk_score < 70:

    risk_level = "MEDIUM"

elif risk_score < 90:

    risk_level = "HIGH"

else:

    risk_level = "CRITICAL"


# =========================================================
# SECURITY ACTION
# =========================================================

if risk_level == "LOW":

    security_action = (
        "Continue monitoring network traffic."
    )

elif risk_level == "MEDIUM":

    security_action = (
        "Increase monitoring and inspect suspicious traffic."
    )

elif risk_level == "HIGH":

    security_action = (
        "Investigate immediately and consider blocking the source."
    )

else:

    security_action = (
        "Immediate response required. "
        "Isolate and investigate the threat."
    )


# =========================================================
# SECURITY OVERVIEW
# =========================================================

st.divider()

st.markdown(
    '<div class="section-title">'
    '🛡️ SECURITY OVERVIEW'
    '</div>',
    unsafe_allow_html=True
)

col1, col2, col3, col4 = st.columns(4)

with col1:
    st.metric(
        "🔍 ATTACK",
        detected_attack
    )

with col2:
    st.metric(
        "🎯 CONFIDENCE",
        f"{average_confidence:.1f}%"
    )

with col3:
    st.metric(
        "🧠 FUTURE RISK",
        f"{future_probability_percent:.1f}%"
    )

with col4:
    st.metric(
        "⚠️ RISK SCORE",
        f"{risk_score}/100"
    )


st.markdown(
    '<div class="info-box">'
    '<b>How to read this:</b> '
    'Random Forest identifies the current attack, '
    'LSTM estimates future attack probability, '
    'and the Risk Engine combines these signals '
    'with attack severity to produce a security score.'
    '</div>',
    unsafe_allow_html=True
)


# =========================================================
# EXPLANATION CARDS
# =========================================================

card1, card2 = st.columns(2)

with card1:

    st.markdown(
        '<div class="cyber-card">'
        '<div class="card-title">🔎 ATTACK DETECTION</div>'
        '<div class="card-value">'
        f'{detected_attack}'
        '</div>'
        '<div class="card-desc">'
        'Random Forest classifies the current network '
        'traffic and identifies the most likely attack type.'
        '</div>'
        '</div>',
        unsafe_allow_html=True
    )

with card2:

    st.markdown(
        '<div class="cyber-card">'
        '<div class="card-title">🧠 ATTACK FORECAST</div>'
        '<div class="card-value">'
        f'{future_probability_percent:.1f}%'
        '</div>'
        '<div class="card-desc">'
        'LSTM analyzes the latest 20 traffic records '
        'to estimate future attack probability.'
        '</div>'
        '</div>',
        unsafe_allow_html=True
    )


# =========================================================
# RISK ASSESSMENT
# =========================================================

st.divider()

st.markdown(
    '<div class="section-title">'
    '⚠️ RISK ASSESSMENT'
    '</div>',
    unsafe_allow_html=True
)


if risk_level == "CRITICAL":

    st.markdown(
        '<div class="critical-box">'
        '<h3>🚨 CRITICAL SECURITY ALERT</h3>'
        f'<p><b>Risk Score:</b> {risk_score}/100</p>'
        '<p>'
        'The current prototype scoring logic indicates '
        'a critical risk level.'
        '</p>'
        f'<p><b>Recommended Action:</b> {security_action}</p>'
        '</div>',
        unsafe_allow_html=True
    )

elif risk_level == "HIGH":

    st.markdown(
        '<div class="high-box">'
        '<h3>⚠️ HIGH RISK ACTIVITY</h3>'
        f'<p><b>Risk Score:</b> {risk_score}/100</p>'
        '<p>'
        'Suspicious activity requires immediate investigation.'
        '</p>'
        f'<p><b>Recommended Action:</b> {security_action}</p>'
        '</div>',
        unsafe_allow_html=True
    )

elif risk_level == "MEDIUM":

    st.markdown(
        '<div class="medium-box">'
        '<h3>🟡 MEDIUM RISK ACTIVITY</h3>'
        f'<p><b>Risk Score:</b> {risk_score}/100</p>'
        '<p>'
        'Suspicious activity should be monitored and inspected.'
        '</p>'
        f'<p><b>Recommended Action:</b> {security_action}</p>'
        '</div>',
        unsafe_allow_html=True
    )

else:

    st.markdown(
        '<div class="low-box">'
        '<h3>🟢 LOW RISK</h3>'
        f'<p><b>Risk Score:</b> {risk_score}/100</p>'
        '<p>'
        'Current traffic does not produce a high-risk '
        'condition under the prototype scoring logic.'
        '</p>'
        f'<p><b>Recommended Action:</b> {security_action}</p>'
        '</div>',
        unsafe_allow_html=True
    )


# =========================================================
# XAI
# =========================================================

st.divider()

st.markdown(
    '<div class="section-title">'
    '🔍 AI EXPLANATION'
    '</div>',
    unsafe_allow_html=True
)

st.markdown(
    '<div class="section-description">'
    'Top features that are influential to the trained '
    'Random Forest model.'
    '</div>',
    unsafe_allow_html=True
)


feature_importance = pd.DataFrame({
    "Feature": detection_features,
    "Importance": multi_model.feature_importances_
}).sort_values(
    by="Importance",
    ascending=False
)

top_features = feature_importance.head(5)

xai_col1, xai_col2 = st.columns(2)

with xai_col1:

    for _, row in top_features.iterrows():

        st.write(
            f"• **{row['Feature']}** "
            f"— Importance: {row['Importance']:.4f}"
        )

with xai_col2:

    st.bar_chart(
        top_features.set_index(
            "Feature"
        )[["Importance"]]
    )


# =========================================================
# REAL-TIME MONITORING
# =========================================================

st.divider()

st.markdown(
    '<div class="section-title">'
    '🔴 REAL-TIME TRAFFIC MONITORING'
    '</div>',
    unsafe_allow_html=True
)

st.markdown(
    '<div class="section-description">'
    'Prototype mode: uploaded network-flow records are '
    'replayed as a real-time traffic stream.'
    '</div>',
    unsafe_allow_html=True
)

st.markdown(
    '<div class="info-box">'
    '<b>Pipeline:</b> '
    'Traffic → Random Forest → LSTM → Risk Engine → Alert'
    '</div>',
    unsafe_allow_html=True
)

start_live = st.button(
    "▶ START LIVE MONITORING",
    key="start_live_monitoring"
)


# =========================================================
# LIVE MONITORING
# =========================================================

if start_live:

    # New graph run
    st.session_state.live_results = []

    # Use 30 records for demo
    live_data = traffic_data.sample(
        n=min(30, len(traffic_data)),
        random_state=None
    ).reset_index(drop=True)

    traffic_buffer = deque(
        maxlen=20
    )

    status_placeholder = st.empty()
    result_placeholder = st.empty()

    for index, row in live_data.iterrows():

        # Add traffic record
        traffic_buffer.append(
            row.to_dict()
        )

        status_placeholder.info(
            f"🔴 Monitoring traffic... "
            f"Record {index + 1}/{len(live_data)}"
        )

        # Need 20 records for LSTM
        if len(traffic_buffer) < 20:

            time.sleep(0.05)

            continue

        # Current traffic window
        traffic_window = pd.DataFrame(
            list(traffic_buffer)
        )

        # =================================================
        # RANDOM FOREST
        # =================================================

        window_detection = traffic_window[
            detection_features
        ].copy()

        window_detection = window_detection.apply(
            pd.to_numeric,
            errors="coerce"
        )

        window_detection = window_detection.replace(
            [np.inf, -np.inf],
            0
        )

        window_detection = window_detection.fillna(0)

        window_predictions = multi_model.predict(
            window_detection
        )

        window_probabilities = (
            multi_model.predict_proba(
                window_detection
            )
        )

        window_attack_names = (
            label_encoder.inverse_transform(
                window_predictions
            )
        )

        window_confidence = (
            window_probabilities.max(axis=1) * 100
        )

        live_attack = (
            pd.Series(
                window_attack_names
            )
            .value_counts()
            .index[0]
        )

        live_confidence = float(
            window_confidence.mean()
        )

        # =================================================
        # LSTM
        # =================================================

        window_lstm = traffic_window[
            sequence_features
        ].copy()

        window_lstm = window_lstm.apply(
            pd.to_numeric,
            errors="coerce"
        )

        window_lstm = window_lstm.replace(
            [np.inf, -np.inf],
            0
        )

        window_lstm = window_lstm.fillna(0)

        window_scaled = scaler.transform(
            window_lstm
        )

        latest_sequence = window_scaled[-20:]

        live_lstm_input = torch.tensor(
            latest_sequence,
            dtype=torch.float32
        ).unsqueeze(0).to(device)

        lstm_model.eval()

        with torch.no_grad():

            live_output = lstm_model(
                live_lstm_input
            )

            live_future_probability = (
                torch.sigmoid(
                    live_output
                ).item() * 100
            )

        # =================================================
        # RISK
        # =================================================

        live_severity = get_attack_severity(
            live_attack
        )

        live_risk_score = (
            0.40 * live_future_probability
            +
            0.35 * live_confidence
            +
            0.25 * live_severity
        )

        live_risk_score = min(
            round(live_risk_score, 2),
            100
        )

        # =================================================
        # RISK LEVEL
        # =================================================

        if live_risk_score < 30:
            live_risk_level = "LOW"

        elif live_risk_score < 70:
            live_risk_level = "MEDIUM"

        elif live_risk_score < 90:
            live_risk_level = "HIGH"

        else:
            live_risk_level = "CRITICAL"

        # =================================================
        # ACTION
        # =================================================

        if live_risk_level == "LOW":

            live_action = (
                "Continue monitoring network traffic."
            )

        elif live_risk_level == "MEDIUM":

            live_action = (
                "Increase monitoring and inspect suspicious traffic."
            )

        elif live_risk_level == "HIGH":

            live_action = (
                "Investigate immediately and consider blocking the source."
            )

        else:

            live_action = (
                "Immediate response required. "
                "Isolate and investigate the threat."
            )

        # =================================================
        # STORE RESULT
        # =================================================

        st.session_state.live_results.append({
            "Traffic Record": index + 1,
            "Attack Type": live_attack,
            "Confidence": round(
                live_confidence,
                2
            ),
            "Future Probability": round(
                live_future_probability,
                2
            ),
            "Risk Score": live_risk_score,
            "Risk Level": live_risk_level
        })

        # =================================================
        # ALERT HISTORY
        # =================================================

        if live_risk_level in [
            "HIGH",
            "CRITICAL"
        ]:

            st.session_state.alert_history.append({

                "Time": time.strftime(
                    "%H:%M:%S"
                ),

                "Traffic Record": index + 1,

                "Attack Type": live_attack,

                "Confidence": round(
                    live_confidence,
                    2
                ),

                "Future Probability": round(
                    live_future_probability,
                    2
                ),

                "Risk Score": live_risk_score,

                "Risk Level": live_risk_level,

                "Action": live_action
            })

        # =================================================
        # LIVE OUTPUT
        # =================================================

        with result_placeholder.container():

            live_col1, live_col2, live_col3, live_col4 = (
                st.columns(4)
            )

            with live_col1:
                st.metric(
                    "🔍 ATTACK",
                    live_attack
                )

            with live_col2:
                st.metric(
                    "🎯 CONFIDENCE",
                    f"{live_confidence:.1f}%"
                )

            with live_col3:
                st.metric(
                    "🧠 FUTURE RISK",
                    f"{live_future_probability:.1f}%"
                )

            with live_col4:
                st.metric(
                    "⚠️ RISK SCORE",
                    f"{live_risk_score}/100"
                )

            if live_risk_level == "CRITICAL":

                st.error(
                    "🔴 CRITICAL — Immediate response required"
                )

            elif live_risk_level == "HIGH":

                st.error(
                    "🟠 HIGH — Investigate immediately"
                )

            elif live_risk_level == "MEDIUM":

                st.warning(
                    "🟡 MEDIUM — Monitor suspicious traffic"
                )

            else:

                st.success(
                    "🟢 LOW — Continue monitoring"
                )

            st.info(
                f"🛡️ {live_action}"
            )

        time.sleep(0.05)

    status_placeholder.success(
        "✅ Real-time traffic simulation completed."
    )


# =========================================================
# ALERT HISTORY
# =========================================================

st.divider()

st.markdown(
    '<div class="section-title">'
    '🚨 ALERT HISTORY'
    '</div>',
    unsafe_allow_html=True
)

st.markdown(
    '<div class="section-description">'
    'HIGH and CRITICAL events recorded during this session.'
    '</div>',
    unsafe_allow_html=True
)


if st.session_state.alert_history:

    alert_df = pd.DataFrame(
        st.session_state.alert_history
    )

    st.dataframe(
        alert_df,
        use_container_width=True,
        hide_index=True
    )

    if st.button(
        "🗑️ Clear Alert History",
        key="clear_alert_history"
    ):

        st.session_state.alert_history = []

        st.rerun()

else:

    st.info(
        "No HIGH or CRITICAL alerts recorded yet."
    )


# =========================================================
# SECURITY ANALYTICS
# =========================================================

if st.session_state.live_results:

    st.divider()

    st.markdown(
        '<div class="section-title">'
        '📊 SECURITY ANALYTICS'
        '</div>',
        unsafe_allow_html=True
    )

    st.markdown(
        '<div class="section-description">'
        'Visual summary of the latest monitoring run.'
        '</div>',
        unsafe_allow_html=True
    )

    analytics_df = pd.DataFrame(
        st.session_state.live_results
    )

    # =====================================================
    # ATTACK DISTRIBUTION
    # =====================================================

    st.subheader(
        "🔍 Attack Distribution"
    )

    attack_distribution = (
        analytics_df[
            "Attack Type"
        ]
        .value_counts()
    )

    st.bar_chart(
        attack_distribution
    )

    # =====================================================
    # RISK SCORE
    # =====================================================

    st.subheader(
        "⚠️ Risk Score Over Time"
    )

    risk_chart = (
        analytics_df
        .set_index(
            "Traffic Record"
        )[["Risk Score"]]
    )

    st.line_chart(
        risk_chart
    )

    # =====================================================
    # FUTURE PROBABILITY
    # =====================================================

    st.subheader(
        "🧠 Future Attack Probability"
    )

    future_chart = (
        analytics_df
        .set_index(
            "Traffic Record"
        )[["Future Probability"]]
    )

    st.line_chart(
        future_chart
    )


# =========================================================
# FOOTER
# =========================================================

st.divider()

st.caption(
    "NETSENTRY AI • AI-Based Network Attack Forecasting • SIH 2026 Prototype"
)

st.caption(
    "Current monitoring uses real-time replay of uploaded "
    "network-flow records. Actual packet capture and live "
    "flow extraction are future deployment scope."
)