from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class TaskStatus(str, Enum):
    IDLE = "idle"
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class EngineTask(BaseModel):
    status: TaskStatus = TaskStatus.IDLE
    progress: Optional[float] = 0.0
    error: Optional[str] = None
    updated_at: Optional[datetime] = None


class TrackAudioAssets(BaseModel):
    original_url: Optional[str] = None
    vocals_url: Optional[str] = None
    instrumental_url: Optional[str] = None
    transformed_url: Optional[str] = None
    mastered_url: Optional[str] = None


class TrackLyrics(BaseModel):
    lines: List[str] = Field(default_factory=list)
    line_times: List[float] = Field(default_factory=list)
    word_timestamps: Optional[List[Dict[str, Any]]] = None
    raw_lrc: Optional[str] = None
    language: Optional[str] = None


class Track(BaseModel):
    id: str
    title: str = "Untitled Track"
    artist: str = "Unknown Artist"
    duration: str = "00:00"
    cover_url: Optional[str] = None
    genre: Optional[str] = None
    audio: TrackAudioAssets = Field(default_factory=TrackAudioAssets)
    lyrics: TrackLyrics = Field(default_factory=TrackLyrics)
    tasks: Dict[str, EngineTask] = Field(
        default_factory=lambda: {
            name: EngineTask() for name in ("separator", "lyrics", "transformer", "exporter")
        }
    )
    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow)


class TrackUpdate(BaseModel):
    title: Optional[str] = None
    artist: Optional[str] = None
    duration: Optional[str] = None
    cover_url: Optional[str] = None
    genre: Optional[str] = None
    lyrics_lines: Optional[List[str]] = None
    lyrics_times: Optional[List[float]] = None
    lyrics_language: Optional[str] = None
