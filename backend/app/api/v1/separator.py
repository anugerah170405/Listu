from fastapi import APIRouter, Depends

from app.api.deps import ensure_can_start_task, get_current_user, get_user_track, require_audio_file
from app.schemas.track import Track
from app.services import job_queue, track_repository as repo

router = APIRouter()


@router.post("/{track_id}", response_model=Track, summary="Separate vocals and instrumental for track")
def separate_track_by_id(track_id: str, user: dict = Depends(get_current_user)):
    track = get_user_track(track_id, user)
    ensure_can_start_task(track_id, "separator", "Vocal separation", track=track)
    audio_path = require_audio_file(track.audio.original_url)

    job_queue.run_separator(track_id=track_id, audio_path=str(audio_path))
    return repo.get_track(track_id)
