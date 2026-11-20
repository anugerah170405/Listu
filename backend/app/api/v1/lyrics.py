from pathlib import Path
from typing import List, Optional

from fastapi import APIRouter, HTTPException, status

from app.api.deps import get_track_or_404, require_audio_file, run_engine_task
from app.core.config import LYRICS_DIR
from app.schemas.track import Track
from app.services import track_repository as repo
from app.services.lyrics_engine import LyricsEngine

router = APIRouter()

lyrics_engine = LyricsEngine(model_size="small", output_dir=str(LYRICS_DIR))


def fit_times(times: List[float], size: int) -> List[float]:
    pad = times[-1] if times else 0.0
    return (times + [pad] * size)[:size]


@router.post("/{track_id}", response_model=Track, summary="Generate lyrics & auto-synchronize via Whisper")
def generate_track_lyrics(track_id: str, language: Optional[str] = None):
    track = get_track_or_404(track_id)
    audio_path = require_audio_file(track.audio.vocals_url or track.audio.original_url)

    with run_engine_task(track_id, "lyrics", "Failed to process lyrics"):
        result = lyrics_engine.transcribe_and_sync(str(audio_path), language=language)
        lines = [line for line in result["lines"] if line["text"]]

        lrc_file = result.get("files", {}).get("lrc")
        raw_lrc = Path(lrc_file).read_text(encoding="utf-8") if lrc_file and Path(lrc_file).exists() else None

        repo.update_track_fields(track_id, {
            "lyrics.lines": [line["text"] for line in lines],
            "lyrics.line_times": [float(line["start"]) for line in lines],
            "lyrics.raw_lrc": raw_lrc,
            "lyrics.language": result.get("language") or language or "id",
        })

    return repo.get_track(track_id)


@router.post("/{track_id}/align", response_model=Track, summary="Auto-align timing for existing lyrics text")
def align_track_lyrics(track_id: str, language: Optional[str] = None):
    track = get_track_or_404(track_id)

    lines = [line.strip() for line in track.lyrics.lines if line and line.strip()]
    if not lines:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This track does not have lyrics text yet. Please write lyrics first.",
        )
    audio_path = require_audio_file(track.audio.vocals_url or track.audio.original_url)

    with run_engine_task(track_id, "lyrics", "Failed to align lyrics"):
        target_lang = language or track.lyrics.language
        result = lyrics_engine.align_existing_lyrics(str(audio_path), "\n".join(lines), language=target_lang)
        times = [float(line["start"]) for line in result["lines"]]

        repo.update_track_fields(track_id, {
            "lyrics.lines": lines,
            "lyrics.line_times": fit_times(times, len(lines)),
            "lyrics.language": result.get("language") or target_lang or "id",
        })

    return repo.get_track(track_id)
