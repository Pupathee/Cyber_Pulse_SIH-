# =========================================================
# NETSENTRY AI — Live Monitoring Endpoints
# GET  /api/live/events  — Auto-starts SSE stream using the
#                          pre-loaded dataset (no upload needed)
# POST /api/live/start   — Optional: upload a CSV to override
#                          the default dataset
# GET  /api/live/status  — Poll current state
# =========================================================

import io
import pandas as pd
from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import StreamingResponse

from services import live_service

router = APIRouter()


@router.post("/api/live/start")
async def start_live(file: UploadFile = File(...)):
    """Optional endpoint: upload a CSV to override the auto-loaded dataset."""
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are accepted.")

    try:
        contents = await file.read()
        df = pd.read_csv(io.BytesIO(contents))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Could not read CSV: {e}")

    df.columns = df.columns.astype(str).str.strip()
    live_service.set_dataframe(df)

    return {
        "status":      "dataset_loaded",
        "num_records": len(df),
        "message":     "Dataset loaded. Connect to /api/live/events.",
    }


@router.get("/api/live/status")
def live_status():
    return {
        "running":       live_service.is_running(),
        "results_count": len(live_service.get_live_results()),
    }


@router.get("/api/live/events")
async def live_events():
    """
    SSE stream — auto-loads the default dataset if no CSV has been uploaded.
    Streams continuously and loops. Connect directly without uploading a file.
    """
    async def event_generator():
        async for chunk in live_service.run_live_simulation():
            yield chunk

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control":               "no-cache",
            "X-Accel-Buffering":           "no",
            "Access-Control-Allow-Origin": "*",
        },
    )
