import re
import shutil
import uuid
from typing import Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.api.deps import ensure_can_start_task, get_current_user, get_user_track, require_audio_file
from app.core.config import UPLOAD_DIR, local_path_to_url, url_to_local_path
from app.schemas.track import Track, TrackAudioAssets, TrackLyrics, TaskStatus
from app.services import job_queue, track_repository as repo

router = APIRouter()


class TransformGenreRequest(BaseModel):
    genre: str
    duration_limit: Optional[int] = None
    include_vocals: Optional[bool] = None


def build_genre_title(
    base_title: str,
    genre: str,
    duration_limit: Optional[int] = None,
    include_vocals: bool = True,
) -> str:
    cleaned = re.sub(r"\s*\([^)]*Version\)\s*$", "", base_title, flags=re.IGNORECASE).strip() or base_title
    cleaned = re.sub(r"\s*\([^)]*Instrumental\)\s*$", "", cleaned, flags=re.IGNORECASE).strip() or cleaned
    cleaned = re.sub(r"\s*\([^)]*Preview\)\s*$", "", cleaned, flags=re.IGNORECASE).strip() or cleaned
    tag = f"{genre} Version" if include_vocals else f"{genre} Instrumental"
    if duration_limit:
        return f"{cleaned} ({tag} - {duration_limit}s Preview)"
    return f"{cleaned} ({tag})"


def clone_cover_for_track(cover_url: str | None, new_track_id: str) -> str | None:
    if not cover_url:
        return None
    src_path = url_to_local_path(cover_url)
    if not src_path or not src_path.exists():
        return cover_url
    ext = src_path.suffix or ".jpg"
    dst_name = f"{new_track_id}_cover{ext}"
    dst_path = UPLOAD_DIR / dst_name
    shutil.copy2(src_path, dst_path)
    return local_path_to_url(dst_path)


@router.post("/{track_id}", response_model=Track, summary="Transform track into target genre")
def transform_track_genre(
    track_id: str,
    payload: TransformGenreRequest,
    user: dict = Depends(get_current_user),
):
    track = get_user_track(track_id, user)
    ensure_can_start_task(track_id, "transformer", "Genre transformation", track=track)

    has_separated = bool(track.audio.instrumental_url and track.audio.vocals_url)
    include_vocals = payload.include_vocals if payload.include_vocals is not None else has_separated

    # Condition MusicGen on vocals (or original song) so the arrangement follows the true vocal melody!
    if has_separated and track.audio.vocals_url:
        source_url = track.audio.vocals_url
    elif track.audio.original_url:
        source_url = track.audio.original_url
    else:
        source_url = track.audio.instrumental_url

    source_path = require_audio_file(source_url)

    vocals_path_str = None
    if has_separated and track.audio.vocals_url and include_vocals:
        v_path = url_to_local_path(track.audio.vocals_url)
        if v_path and v_path.exists():
            vocals_path_str = str(v_path)

    new_track_id = f"u-{uuid.uuid4().hex[:10]}"
    new_cover_url = clone_cover_for_track(track.cover_url, new_track_id)

    duration_placeholder = f"00:{payload.duration_limit:02d}" if payload.duration_limit else track.duration

    detail_tag = f"{payload.genre}" if include_vocals else f"{payload.genre} Instrumental"
    task_detail = f"{detail_tag} ({payload.duration_limit}s)" if payload.duration_limit else f"{detail_tag} (Full)"

    new_track = Track(
        id=new_track_id,
        user_id=user["uid"],
        title=build_genre_title(track.title, payload.genre, payload.duration_limit, include_vocals=include_vocals),
        artist=track.artist,
        duration=duration_placeholder,
        cover_url=new_cover_url,
        genre=payload.genre,
        processing={
            "transformer": TaskStatus(
                status="processing",
                source_id=track_id,
                detail=task_detail,
                updated_at=repo.now_iso(),
            )
        },
        audio=TrackAudioAssets(),
        lyrics=TrackLyrics(
            lines=list(track.lyrics.lines),
            line_times=list(track.lyrics.line_times),
            language=track.lyrics.language,
        ),
    )
    repo.save_track(new_track)

    job_queue.run_transformer(
        new_track_id=new_track_id,
        source_audio_path=str(source_path),
        genre=payload.genre,
        vocals_audio_path=vocals_path_str,
        duration_limit=payload.duration_limit,
    )
    return repo.get_track(new_track_id)
