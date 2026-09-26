# =========================================================
# NETSENTRY AI — Alert Service
# Stores MEDIUM / HIGH / CRITICAL and unknown-pattern alerts.
# =========================================================

import time
from typing import Any

_alert_history: list[dict[str, Any]] = []


def add_alert(
    attack_type: str,
    confidence: float,
    future_probability: float,
    risk_score: float,
    risk_level: str,
    recommended_action: str,
    record_index: int | None = None,
    unknown_pattern: bool = False,
    anomaly_score: float | None = None,
) -> None:
    """Append a high-risk or unknown-pattern alert to history."""
    if risk_level not in ("MEDIUM", "HIGH", "CRITICAL") and not unknown_pattern:
        return

    entry: dict[str, Any] = {
        "timestamp":           time.strftime("%H:%M:%S"),
        "attack_type":         attack_type,
        "confidence":          confidence,
        "future_probability":  future_probability,
        "risk_score":          risk_score,
        "risk_level":          risk_level,
        "recommended_action":  recommended_action,
        "alert_type":          "UNKNOWN_PATTERN" if unknown_pattern else "RISK_THRESHOLD",
        "unknown_pattern":     unknown_pattern,
    }
    if anomaly_score is not None:
        entry["anomaly_score"] = anomaly_score
    if record_index is not None:
        entry["record_index"] = record_index

    _alert_history.append(entry)


def get_alerts() -> list[dict[str, Any]]:
    return list(_alert_history)


def clear_alerts() -> None:
    _alert_history.clear()
