from datetime import datetime, timezone
import uuid
from typing import List, Optional
from app.schemas.example import ExampleCreate, ExampleResponse

_mock_items: List[ExampleResponse] = [
    ExampleResponse(
        id="item-1",
        title="Contoh Item Template",
        description="Ini data template dari backend FastAPI.",
        created_at=datetime.now(timezone.utc)
    )
]

class ExampleService:
    @staticmethod
    def get_all() -> List[ExampleResponse]:
        return _mock_items

    @staticmethod
    def get_by_id(item_id: str) -> Optional[ExampleResponse]:
        for item in _mock_items:
            if item.id == item_id:
                return item
        return None

    @staticmethod
    def create(payload: ExampleCreate) -> ExampleResponse:
        new_item = ExampleResponse(
            id=f"item-{uuid.uuid4().hex[:6]}",
            title=payload.title,
            description=payload.description,
            created_at=datetime.now(timezone.utc)
        )
        _mock_items.append(new_item)
        return new_item

example_service = ExampleService()
