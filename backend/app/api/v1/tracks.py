import json
import shutil
import subprocess
import uuid
from pathlib import Path
from typing import List, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from firebase_admin import firestore

from app.api.deps import get_current_user, get_user_track
from app.core.config import (
    SEPARATED_DIR,
    TRANSFORMED_DIR,
    UPLOAD_DIR,
    url_to_local_path,
)
from app.schemas.track import Track, TrackAudioAssets, TrackUpdate
from app.services import track_repository as repo

router = APIRouter()

_HOMEBREW_FFPROBE = Path("/opt/homebrew/bin/ffprobe")
_HOMEBREW_FFMPEG = Path("/opt/homebrew/bin/ffmpeg")

FFPROBE_BIN = shutil.which("ffprobe") or (str(_HOMEBREW_FFPROBE) if _HOMEBREW_FFPROBE.exists() else "ffprobe")
FFMPEG_BIN = shutil.which("ffmpeg") or (str(_HOMEBREW_FFMPEG) if _HOMEBREW_FFMPEG.exists() else "ffmpeg")

FIELD_PATHS = {
    "lyrics_lines": "lyrics.lines",
    "lyrics_times": "lyrics.line_times",
    "lyrics_language": "lyrics.language",
}


def extract_audio_meta(path: Path) -> dict:
    cmd = [
        FFPROBE_BIN, "-v", "quiet",
        "-print_format", "json",
        "-show_format", "-show_streams",
        str(path.resolve()),
    ]
    proc = subprocess.run(cmd, capture_output=True, text=True)
    if proc.returncode != 0:
        return {}
    try:
        data = json.loads(proc.stdout)
        tags = {k.lower(): str(v).strip() for k, v in data.get("format", {}).get("tags", {}).items()}
        has_cover = any(s.get("disposition", {}).get("attached_pic") == 1 for s in data.get("streams", []))
        return {
            "title": tags.get("title"),
            "artist": tags.get("artist") or tags.get("album_artist"),
            "genre": tags.get("genre"),
            "has_cover": has_cover,
        }
    except Exception:
        return {}


def extract_embedded_cover(audio_path: Path, output_path: Path) -> bool:
    cmd = [
        FFMPEG_BIN, "-y", "-i", str(audio_path.resolve()),
        "-an", "-frames:v", "1", "-update", "1",
        str(output_path.resolve()),
    ]
    proc = subprocess.run(cmd, capture_output=True)
    return proc.returncode == 0 and output_path.exists()


def save_upload(file: UploadFile, filename: str) -> str:
    path = UPLOAD_DIR / filename
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    return f"/output/uploads/{filename}"


def delete_track_files(track: Track) -> None:
    urls = [*track.audio.model_dump().values(), track.cover_url]
    for url in urls:
        path = url_to_local_path(url)
        if path:
            try:
                path.unlink(missing_ok=True)
            except OSError:
                pass

    for folder in (UPLOAD_DIR, SEPARATED_DIR, TRANSFORMED_DIR):
        for f in folder.glob(f"{track.id}*"):
            try:
                f.unlink(missing_ok=True)
            except OSError:
                pass


@router.get("", response_model=List[Track], summary="Get all tracks")
def list_tracks(user: dict = Depends(get_current_user)):
    return repo.get_all_tracks(user_id=user["uid"])


@router.get("/{track_id}", response_model=Track, summary="Get track detail")
def get_track_detail(track_id: str, user: dict = Depends(get_current_user)):
    return get_user_track(track_id, user)


@router.post("", response_model=Track, status_code=status.HTTP_201_CREATED, summary="Create new track with audio file")
def create_track(
    title: str = Form("Untitled Track"),
    artist: str = Form("Unknown Artist"),
    duration: str = Form("00:00"),
    id: Optional[str] = Form(None),
    cover_url: Optional[str] = Form(None),
    genre: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
    user: dict = Depends(get_current_user),
):
    if file and not (file.content_type or "").startswith("audio/"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only audio files are allowed.",
        )

    track_id = id or f"track-{uuid.uuid4().hex[:8]}"
    audio_url = None

    if file:
        filename = file.filename or f"{track_id}.mp3"
        save_filename = f"{track_id}_{filename}"
        audio_url = save_upload(file, save_filename)
        audio_path = UPLOAD_DIR / save_filename
        stem_title = Path(filename).stem

        meta = extract_audio_meta(audio_path)
        if meta.get("title"):
            title = meta["title"]
        elif title in ("Untitled Track", stem_title, ""):
            title = stem_title

        if meta.get("artist") and artist in ("Unknown Artist", "Unknown artist", ""):
            artist = meta["artist"]

        if meta.get("genre") and not genre:
            genre = meta["genre"]

        if meta.get("has_cover") and not cover_url:
            cover_filename = f"{track_id}_cover.jpg"
            if extract_embedded_cover(audio_path, UPLOAD_DIR / cover_filename):
                cover_url = f"/output/uploads/{cover_filename}"

    track = Track(
        id=track_id,
        user_id=user["uid"],
        title=title,
        artist=artist,
        duration=duration,
        cover_url=cover_url,
        genre=genre,
        audio=TrackAudioAssets(original_url=audio_url),
    )
    return repo.save_track(track)


@router.patch("/{track_id}", response_model=Track, summary="Update track metadata")
def update_track_metadata(track_id: str, payload: TrackUpdate, user: dict = Depends(get_current_user)):
    track = get_user_track(track_id, user)

    data = payload.model_dump(exclude_unset=True)
    if not data:
        return track

    repo.update_track_fields(track_id, {FIELD_PATHS.get(k, k): v for k, v in data.items()})
    return repo.get_track(track_id)


@router.post("/{track_id}/cover", response_model=Track, summary="Upload track cover image")
def upload_track_cover(track_id: str, file: UploadFile = File(...), user: dict = Depends(get_current_user)):
    get_user_track(track_id, user)

    ext = Path(file.filename or "cover.jpg").suffix or ".jpg"
    cover_url = save_upload(file, f"{track_id}_cover_{uuid.uuid4().hex[:6]}{ext}")

    repo.update_track_fields(track_id, {"cover_url": cover_url})
    return repo.get_track(track_id)


def delete_processed_audio_files(track: Track) -> None:
    urls = [
        track.audio.vocals_url,
        track.audio.instrumental_url,
    ]
    for url in urls:
        path = url_to_local_path(url)
        if path:
            path.unlink(missing_ok=True)

    for f in SEPARATED_DIR.glob(f"{track.id}*"):
        f.unlink(missing_ok=True)


@router.delete("/{track_id}/lyrics", response_model=Track, summary="Delete track lyrics")
def remove_lyrics(
    track_id: str,
    user: dict = Depends(get_current_user),
):
    get_user_track(track_id, user)
    repo.update_track_fields(track_id, {
        "lyrics.lines": [],
        "lyrics.line_times": [],
        "lyrics.language": None,
        "processing.lyrics": firestore.DELETE_FIELD,
    })
    return repo.get_track(track_id)


@router.delete("/{track_id}/processed-audio", response_model=Track, summary="Delete separated stems")
def remove_processed_audio(
    track_id: str,
    user: dict = Depends(get_current_user),
):
    track = get_user_track(track_id, user)
    delete_processed_audio_files(track)
    repo.update_track_fields(track_id, {
        "audio.vocals_url": None,
        "audio.instrumental_url": None,
        "processing.separator": firestore.DELETE_FIELD,
    })
    return repo.get_track(track_id)


@router.delete("/{track_id}", summary="Delete track and physical files")
def remove_track(
    track_id: str,
    user: dict = Depends(get_current_user),
):
    track = get_user_track(track_id, user)
    delete_track_files(track)
    repo.delete_track(track_id)
    return {"message": f"Track '{track_id}' and its physical files were successfully deleted."}
