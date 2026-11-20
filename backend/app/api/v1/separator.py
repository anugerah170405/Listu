from fastapi import APIRouter

from app.api.deps import get_track_or_404, require_audio_file, run_engine_task
from app.core.config import SEPARATED_DIR, local_path_to_url
from app.schemas.track import Track
from app.services import track_repository as repo
from app.services.vocal_separator import VocalSeparatorEngine

router = APIRouter()

separator_engine = VocalSeparatorEngine(output_dir=str(SEPARATED_DIR), output_format="WAV")


@router.post("/{track_id}", response_model=Track, summary="Separate vocals and instrumental for track")
def separate_track_by_id(track_id: str):
    track = get_track_or_404(track_id)
    audio_path = require_audio_file(track.audio.original_url)

    with run_engine_task(track_id, "separator", "Failed to separate audio"):
        outputs = separator_engine.separate(str(audio_path))
        repo.update_track_fields(track_id, {
            "audio.vocals_url": local_path_to_url(outputs["vocals"]) if outputs["vocals"] else None,
            "audio.instrumental_url": local_path_to_url(outputs["instrumental"]) if outputs["instrumental"] else None,
        })

    return repo.get_track(track_id)
