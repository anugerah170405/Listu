from fastapi import APIRouter
from app.api.v1 import health, separator, tracks, lyrics

api_router = APIRouter()

api_router.include_router(health.router, tags=["Health"])
api_router.include_router(tracks.router, prefix="/tracks", tags=["Tracks"])
api_router.include_router(separator.router, prefix="/separator", tags=["Vocal Separator"])
api_router.include_router(lyrics.router, prefix="/lyrics", tags=["Lyrics"])

