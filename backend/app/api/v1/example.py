from typing import List
from fastapi import APIRouter, HTTPException, status
from app.schemas.example import ExampleCreate, ExampleResponse
from app.services.example import example_service

router = APIRouter()

@router.get("/items", response_model=List[ExampleResponse], summary="Ambil semua items")
def get_items():
    return example_service.get_all()

@router.get("/items/{item_id}", response_model=ExampleResponse, summary="Ambil item berdasarkan ID")
def get_item(item_id: str):
    item = example_service.get_by_id(item_id)
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Item dengan id '{item_id}' tidak ditemukan"
        )
    return item

@router.post("/items", response_model=ExampleResponse, status_code=status.HTTP_201_CREATED, summary="Buat item baru")
def create_item(payload: ExampleCreate):
    return example_service.create(payload)
