import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from google.api_core.exceptions import NotFound

from app.core.firebase import db
from app.schemas.track import Track

COLLECTION_NAME = "tracks"
logger = logging.getLogger(__name__)


def _doc(track_id: str):
    return db.collection(COLLECTION_NAME).document(track_id)


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _doc_to_track(doc) -> Track:
    data = doc.to_dict() or {}
    data.setdefault("id", doc.id)
    return Track.model_validate(data)


def save_track(track: Track) -> Track:
    _doc(track.id).set(track.model_dump(mode="json"))
    return track


def get_track(track_id: str) -> Optional[Track]:
    doc = _doc(track_id).get()
    if not doc.exists:
        return None
    try:
        return _doc_to_track(doc)
    except Exception as exc:
        logger.warning("Failed to validate track doc %s: %s", track_id, exc)
        return None


def get_all_tracks(user_id: Optional[str] = None) -> List[Track]:
    if not user_id:
        return []
    # No order_by in the query: Firestore silently drops docs missing that field.
    docs = db.collection(COLLECTION_NAME).where("user_id", "==", user_id).stream()
    tracks = []
    for doc in docs:
        try:
            tracks.append(_doc_to_track(doc))
        except Exception as exc:
            logger.warning("Skipping invalid track doc %s: %s", doc.id, exc)
    tracks.sort(key=lambda t: t.created_at.timestamp(), reverse=True)
    return tracks


def update_track_fields(track_id: str, fields: Dict[str, Any]) -> bool:
    #Update specific fields on a track document. Returns False if the track no longer exists.
    try:
        _doc(track_id).update({**fields, "updated_at": now_iso()})
        return True
    except NotFound:
        logger.warning("Track %s not found during update (may have been deleted)", track_id)
        return False


def delete_track(track_id: str) -> None:
    _doc(track_id).delete()


SERVER_BOOT_TIME = datetime.now(timezone.utc)


def cleanup_stale_processing_tasks(active_job: Optional[Dict[str, str]] = None) -> int:
    """Reset any task stuck in 'processing' state from a PREVIOUS crashed server instance.
    Never marks a task failed if it was updated after the current server booted or is actively executing.
    """
    count = 0
    try:
        docs = db.collection(COLLECTION_NAME).stream()
        for doc in docs:
            data = doc.to_dict() or {}
            proc = data.get("processing")
            if not isinstance(proc, dict):
                continue
            updates: Dict[str, Any] = {}
            for task_name, task_data in proc.items():
                if isinstance(task_data, dict) and task_data.get("status") == "processing":
                    # Jangan reset jika sedang aktif dijalankan di proses saat ini
                    if active_job and active_job.get("track_id") == doc.id and active_job.get("task_name") == task_name:
                        continue

                    # Jangan reset jika task ini baru saja dibuat/diupdate setelah server ini boot
                    updated_at_str = task_data.get("updated_at")
                    if updated_at_str:
                        try:
                            dt = datetime.fromisoformat(updated_at_str.replace("Z", "+00:00"))
                            if dt >= SERVER_BOOT_TIME:
                                continue
                        except Exception:
                            pass

                    updates[f"processing.{task_name}.status"] = "failed"
                    updates[f"processing.{task_name}.error"] = "Process interrupted (server restarted)"
                    updates[f"processing.{task_name}.updated_at"] = now_iso()
            if updates:
                _doc(doc.id).update({**updates, "updated_at": now_iso()})
                count += 1
                logger.info("Reset stale processing task for track %s", doc.id)
    except Exception as exc:
        logger.warning("Failed to cleanup stale processing tasks: %s", exc)
    return count
