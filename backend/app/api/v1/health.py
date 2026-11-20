from datetime import datetime, timezone

from fastapi import APIRouter

router = APIRouter()


@router.get("/health", summary="Health Check")
def health_check():
    return {
        "status": "ok",
        "message": "FastAPI backend is running",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
