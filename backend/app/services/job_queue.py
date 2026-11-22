import logging
import threading
from typing import Any, Callable, Dict, Optional

from app.core.config import SEPARATED_DIR, TRANSFORMED_DIR, local_path_to_url
from app.services import track_repository as repo
from app.services.lyrics_engine import LyricsEngine
from app.services.music_transformer import MusicTransformerEngine
from app.services.vocal_separator import VocalSeparatorEngine

logger = logging.getLogger(__name__)

_lock = threading.Lock()
_current_job: Optional[Dict[str, str]] = None

separator_engine = VocalSeparatorEngine(output_dir=str(SEPARATED_DIR), output_format="WAV")
lyrics_engine = LyricsEngine(model_size="small")
transformer_engine = MusicTransformerEngine(output_dir=str(TRANSFORMED_DIR))


def is_busy() -> bool:
    with _lock:
        return _current_job is not None


def update_task_status(
    track_id: str,
    task_name: str,
    status: str,
    error: Optional[str] = None,
    extra: Optional[Dict[str, Any]] = None,
) -> None:
    fields: Dict[str, Any] = {
        f"processing.{task_name}.status": status,
        f"processing.{task_name}.error": error,
        f"processing.{task_name}.updated_at": repo.now_iso(),
    }
    if extra:
        fields.update(extra)
    repo.update_track_fields(track_id, fields)


def _execute_job(
    track_id: str,
    task_name: str,
    worker_fn: Callable[[], Dict[str, Any]],
    initial_extra: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    global _current_job
    with _lock:
        _current_job = {"track_id": track_id, "task_name": task_name}

    logger.info("Executing AI task: %s for track: %s", task_name, track_id)
    update_task_status(track_id, task_name, "processing", extra=initial_extra)
    try:
        extra_fields = worker_fn()
        update_task_status(track_id, task_name, "ready", extra=extra_fields)
        logger.info("Completed AI task: %s for track: %s", task_name, track_id)
        return extra_fields
    except (Exception, KeyboardInterrupt, SystemExit) as exc:
        err_msg = str(exc) if not isinstance(exc, (KeyboardInterrupt, SystemExit)) else "Process interrupted"
        logger.exception("AI task %s failed for track: %s - %s", task_name, track_id, err_msg)
        update_task_status(track_id, task_name, "failed", error=err_msg)
        raise exc
    finally:
        with _lock:
            _current_job = None


def cancel_active_job() -> None:
    """Mark currently active job as failed in Firestore (used during shutdown/interruption)."""
    global _current_job
    with _lock:
        job = _current_job
        _current_job = None
    if job:
        logger.warning("Interrupting active AI job: %s for track %s", job["task_name"], job["track_id"])
        try:
            update_task_status(
                job["track_id"],
                job["task_name"],
                "failed",
                error="Process interrupted (backend stopped/restarted)",
            )
        except Exception as exc:
            logger.warning("Failed to update task status during cancel: %s", exc)


def run_separator(track_id: str, audio_path: str) -> Dict[str, Any]:
    def work() -> Dict[str, Any]:
        outputs = separator_engine.separate(audio_path)
        return {
            "audio.vocals_url": local_path_to_url(outputs["vocals"]) if outputs.get("vocals") else None,
            "audio.instrumental_url": local_path_to_url(outputs["instrumental"]) if outputs.get("instrumental") else None,
        }

    return _execute_job(
        track_id,
        "separator",
        work,
        initial_extra={
            "processing.separator.detail": "Separating Vocals & Instrumental",
            "audio.vocals_url": None,
            "audio.instrumental_url": None,
        },
    )


def run_lyrics(track_id: str, audio_path: str, language: Optional[str] = None) -> Dict[str, Any]:
    def work() -> Dict[str, Any]:
        result = lyrics_engine.transcribe_and_sync(audio_path, language=language)
        lines = [line for line in result["lines"] if line.get("text")]
        return {
            "lyrics.lines": [line["text"] for line in lines],
            "lyrics.line_times": [float(line["start"]) for line in lines],
            "lyrics.language": result.get("language") or language or "id",
        }

    return _execute_job(
        track_id,
        "lyrics",
        work,
        initial_extra={"processing.lyrics.detail": "Generating & Synchronizing Lyrics"},
    )


def run_transformer(
    new_track_id: str,
    source_audio_path: str,
    genre: str,
    vocals_audio_path: Optional[str] = None,
    duration_limit: Optional[int] = None,
) -> Dict[str, Any]:
    def work() -> Dict[str, Any]:
        output_path, actual_duration_sec = transformer_engine.transform_genre(
            source_audio_path,
            genre=genre,
            track_id=new_track_id,
            vocals_audio_path=vocals_audio_path,
            max_duration_seconds=float(duration_limit) if duration_limit else None,
        )
        mins = int(actual_duration_sec) // 60
        secs = int(actual_duration_sec) % 60
        return {
            "audio.original_url": local_path_to_url(output_path),
            "duration": f"{mins:02d}:{secs:02d}",
        }

    detail = f"{genre} ({duration_limit}s)" if duration_limit else f"{genre} (Full)"
    return _execute_job(
        new_track_id,
        "transformer",
        work,
        initial_extra={"processing.transformer.detail": detail},
    )
