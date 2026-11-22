from typing import Optional

from fastapi import APIRouter, Depends

from app.api.deps import ensure_can_start_task, get_current_user, get_user_track, require_audio_file
from app.schemas.track import Track
from app.services import job_queue, track_repository as repo

router = APIRouter()


@router.post("/{track_id}", response_model=Track, summary="Generate lyrics & auto-synchronize via Whisper")
def generate_track_lyrics(track_id: str, language: Optional[str] = None, user: dict = Depends(get_current_user)):
    track = get_user_track(track_id, user)
    ensure_can_start_task(track_id, "lyrics", "Lyrics generation", track=track)
    audio_path = require_audio_file(track.audio.vocals_url or track.audio.original_url)

    job_queue.run_lyrics(track_id=track_id, audio_path=str(audio_path), language=language)
    return repo.get_track(track_id)
