from contextlib import contextmanager
from pathlib import Path
from typing import Optional

from fastapi import HTTPException, status

from app.core.config import url_to_local_path
from app.schemas.track import TaskStatus, Track
from app.services import track_repository as repo


def get_track_or_404(track_id: str) -> Track:
    track = repo.get_track(track_id)
    if not track:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Track with ID '{track_id}' not found.",
        )
    return track


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


@contextmanager
def run_engine_task(track_id: str, engine: str, failure_message: str):
    repo.update_engine_task(track_id, engine, TaskStatus.PROCESSING)
    try:
        yield
    except Exception as e:
        repo.update_engine_task(track_id, engine, TaskStatus.FAILED, error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"{failure_message}: {e}",
        ) from e
    repo.update_engine_task(track_id, engine, TaskStatus.COMPLETED)
