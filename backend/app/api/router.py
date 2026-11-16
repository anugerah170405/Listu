# pyrefly: ignore[missing-import]
from fastapi import APIRouter
from app.api.v1 import health, example, separator

api_router = APIRouter()

api_router.include_router(health.router, tags=["Health"])
api_router.include_router(separator.router, prefix="/separator", tags=["Vocal Separator"])
api_router.include_router(example.router, prefix="/examples", tags=["Examples"])
