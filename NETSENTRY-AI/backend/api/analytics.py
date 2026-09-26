"""Operational analytics derived from the live monitoring stream."""

from collections import Counter

from fastapi import APIRouter

from services import live_service
from services.alert_service import get_alerts

router = APIRouter()


@router.get("/api/analytics")
def analytics():
    results = live_service.get_live_results()
    recent = results[-100:]
    distribution = Counter(str(item.get("attack_type", "UNKNOWN")) for item in recent)

    return {
        "attack_distribution": [
            {"attack": attack, "count": count}
            for attack, count in distribution.most_common()
        ],
        "risk_trend": [
            {
                "index": index + 1,
                "risk_score": round(float(item.get("risk_score", 0)), 2),
                "attack": str(item.get("attack_type", "UNKNOWN")),
            }
            for index, item in enumerate(recent)
        ],
        "future_probability": [
            {
                "index": index + 1,
                "probability": round(float(item.get("future_probability", 0)), 2),
            }
            for index, item in enumerate(recent)
        ],
        "total_monitored_traffic": len(results),
        "high_risk_events": sum(item.get("risk_level") in ("HIGH", "CRITICAL") for item in results),
        "total_alerts": len(get_alerts()),
    }
