# =========================================================
# NETSENTRY AI — Alert History Endpoints
# GET  /api/alerts       — retrieve all HIGH/CRITICAL alerts
# POST /api/alerts/clear — clear alert history
# =========================================================

from fastapi import APIRouter
from services.alert_service import get_alerts, clear_alerts

router = APIRouter()


@router.get("/api/alerts")
def fetch_alerts():
    return {"alerts": get_alerts(), "count": len(get_alerts())}


@router.post("/api/alerts/clear")
def clear_alert_history():
    clear_alerts()
    return {"status": "cleared"}
