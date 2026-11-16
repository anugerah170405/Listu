from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict

class ExampleBase(BaseModel):
    title: str
    description: Optional[str] = None

class ExampleCreate(ExampleBase):
    pass

class ExampleUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None

class ExampleResponse(ExampleBase):
    id: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
