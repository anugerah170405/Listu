from pathlib import Path
from typing import Any, Dict, Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from firebase_admin import auth

from app.core.config import url_to_local_path
from app.schemas.track import Track
from app.services import job_queue, track_repository as repo

security = HTTPBearer(auto_error=False)


def get_current_user(
    creds: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> Dict[str, Any]:
    if not creds or not creds.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please sign in with Google.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    try:
        decoded = auth.verify_id_token(creds.credentials)
        return {
            "uid": decoded["uid"],
            "email": decoded.get("email"),
            "name": decoded.get("name"),
            "picture": decoded.get("picture"),
        }
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication token.",
            headers={"WWW-Authenticate": "Bearer"},
        )


def get_user_track(track_id: str, user: Dict[str, Any]) -> Track:
    track = repo.get_track(track_id)
    if not track:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Track '{track_id}' not found.",
        )
    if track.user_id and track.user_id != user.get("uid"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to access or modify this track.",
        )
    return track


def ensure_can_start_task(
    track_id: str,
    task_name: str,
    label: str,
    track: Optional[Track] = None,
) -> None:
    if job_queue.is_busy():
        job_queue.update_task_status(
            track_id,
            task_name,
            "failed",
            error="Another AI task is currently in queue. Please wait.",
        )
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Another AI task is currently running in queue. Please wait.",
        )

    current_track = track or repo.get_track(track_id)
    if current_track:
        existing = current_track.processing.get(task_name)
        if existing and existing.status == "processing":
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"{label} is already in progress for this track.",
            )


def require_audio_file(url: Optional[str]) -> Path:
    if not url:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This track does not have an audio file yet.",
        )
    path = url_to_local_path(url)
    if not path or not path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Audio file not found on server.",
        )
    return path
