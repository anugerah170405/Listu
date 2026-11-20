from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from app.core.firebase import db
from app.schemas.track import TaskStatus, Track

COLLECTION_NAME = "tracks"


def _doc(track_id: str):
    return db.collection(COLLECTION_NAME).document(track_id)


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def save_track(track: Track) -> Track:
    _doc(track.id).set(track.model_dump(mode="json"))
    return track


def get_track(track_id: str) -> Optional[Track]:
    doc = _doc(track_id).get()
    return Track.model_validate(doc.to_dict()) if doc.exists else None


def get_all_tracks() -> List[Track]:
    docs = db.collection(COLLECTION_NAME).order_by("created_at", direction="DESCENDING").stream()
    tracks = []
    for doc in docs:
        try:
            tracks.append(Track.model_validate(doc.to_dict()))
        except Exception:
            continue
    return tracks


def update_track_fields(track_id: str, fields: Dict[str, Any]) -> None:
    _doc(track_id).update({**fields, "updated_at": _now()})


def update_engine_task(
    track_id: str,
    engine_name: str,
    status: TaskStatus,
    error: Optional[str] = None,
    progress: Optional[float] = None,
) -> None:
    prefix = f"tasks.{engine_name}"
    fields: Dict[str, Any] = {
        f"{prefix}.status": status.value,
        f"{prefix}.error": error,
        f"{prefix}.updated_at": _now(),
    }
    if progress is not None:
        fields[f"{prefix}.progress"] = progress
    update_track_fields(track_id, fields)


def delete_track(track_id: str) -> None:
    _doc(track_id).delete()
