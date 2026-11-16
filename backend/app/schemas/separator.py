from datetime import datetime
from typing import Optional, Dict
from pydantic import BaseModel

class SeparatorTrackResponse(BaseModel):
    id: str
    original_filename: str
    vocals_url: Optional[str] = None
    instrumental_url: Optional[str] = None
    status: str = "completed"
    created_at: datetime
