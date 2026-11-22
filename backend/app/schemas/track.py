from datetime import datetime, timezone
from typing import Dict, List, Optional

from pydantic import BaseModel, Field


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class TrackAudioAssets(BaseModel):
    original_url: Optional[str] = None
    vocals_url: Optional[str] = None
    instrumental_url: Optional[str] = None


class TrackLyrics(BaseModel):
    lines: List[str] = Field(default_factory=list)
    line_times: List[Optional[float]] = Field(default_factory=list)
    language: Optional[str] = None


class TaskStatus(BaseModel):
    status: str = "ready"               # "ready" | "processing" | "failed"
    source_id: Optional[str] = None     # for transformer: id of the source track
    detail: Optional[str] = None        # e.g. "Jazz", "15s"
    error: Optional[str] = None
    updated_at: Optional[str] = None


class Track(BaseModel):
    id: str
    user_id: Optional[str] = None
    title: str = "Untitled Track"
    artist: str = "Unknown Artist"
    duration: str = "00:00"
    cover_url: Optional[str] = None
    genre: Optional[str] = None
    audio: TrackAudioAssets = Field(default_factory=TrackAudioAssets)
    lyrics: TrackLyrics = Field(default_factory=TrackLyrics)
    processing: Dict[str, TaskStatus] = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow)


class TrackUpdate(BaseModel):
    title: Optional[str] = None
    artist: Optional[str] = None
    duration: Optional[str] = None
    cover_url: Optional[str] = None
    genre: Optional[str] = None
    lyrics_lines: Optional[List[str]] = None
    lyrics_times: Optional[List[Optional[float]]] = None
    lyrics_language: Optional[str] = None
