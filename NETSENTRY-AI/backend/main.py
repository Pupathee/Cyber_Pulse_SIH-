# =========================================================
# NETSENTRY AI — FastAPI Backend
# Wraps the existing ML pipeline as a REST/SSE API.
# Models are loaded once at startup; never modified.
# =========================================================

import sys
import os

# Make sure the backend/ directory is on the Python path
# so that "from services.xxx" imports work correctly.
sys.path.insert(0, os.path.dirname(__file__))

# Load environment variables from .env file if present
_env_path = os.path.join(os.path.dirname(__file__), ".env")
if os.path.exists(_env_path):
    with open(_env_path, encoding="utf-8", errors="ignore") as _f:
        for _line in _f:
            _line = _line.strip()
            if _line and not _line.startswith("#") and "=" in _line:
                _key, _, _val = _line.partition("=")
                os.environ.setdefault(_key.strip(), _val.strip())

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.health  import router as health_router
from api.dataset import router as dataset_router
from api.live    import router as live_router
from api.alerts  import router as alerts_router
from api.assistant import router as assistant_router
from api.analytics import router as analytics_router
from services.ml_models import load_models

# =========================================================
# APP INSTANCE
# =========================================================

app = FastAPI(
    title="NETSENTRY AI",
    description="AI-Based Network Attack Forecasting API",
    version="1.0.0",
)

# =========================================================
# CORS — allow the Vite dev server (port 5173) and any
# production origin.  Adjust origins in production.
# =========================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =========================================================
# ROUTERS
# =========================================================

app.include_router(health_router)
app.include_router(dataset_router)
app.include_router(live_router)
app.include_router(alerts_router)
app.include_router(assistant_router)
app.include_router(analytics_router)

# =========================================================
# STARTUP — pre-load models so first request is fast
# =========================================================

@app.on_event("startup")
def on_startup():
    print("NETSENTRY AI — loading models …")
    load_models()
    print("NETSENTRY AI — models ready.")


@app.get("/")
def root():
    return {
        "service": "NETSENTRY AI",
        "docs":    "/docs",
        "health":  "/api/health",
    }
