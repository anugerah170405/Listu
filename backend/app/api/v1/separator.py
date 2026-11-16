import os
import uuid
import shutil
from pathlib import Path
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, status
from app.schemas.separator import SeparatorTrackResponse
from app.services.vocal_separator import VocalSeparatorEngine

router = APIRouter()

# Folder untuk menyimpan file upload dan hasil
UPLOAD_DIR = Path("output/uploads")
OUTPUT_DIR = Path("output/separated")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# In-Memory Database (data disimpan sementara di list selama server berjalan)
separated_tracks_db: List[dict] = []

# Singleton instance engine agar model tidak perlu di-reload setiap kali request
separator_engine = VocalSeparatorEngine(
    output_dir=str(OUTPUT_DIR),
    output_format="WAV"
)

@router.get("/tracks", response_model=List[SeparatorTrackResponse], summary="Ambil semua riwayat pemisahan lagu")
def get_separated_tracks():
    """Mengambil list semua lagu yang telah dipisahkan (dari memori RAM sementara)."""
    return separated_tracks_db

@router.get("/tracks/{track_id}", response_model=SeparatorTrackResponse, summary="Ambil detail track berdasarkan ID")
def get_separated_track(track_id: str):
    track = next((t for t in separated_tracks_db if t["id"] == track_id), None)
    if not track:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Track dengan ID {track_id} tidak ditemukan"
        )
    return track

@router.post("/separate", response_model=SeparatorTrackResponse, summary="Upload & Pisahkan Vokal dan Musik")
async def separate_audio(
    file: Optional[UploadFile] = File(None),
    audio_path: Optional[str] = Form(None)
):
    """
    Memisahkan audio menjadi vokal dan instrumental.
    Bisa via upload file audio (mp3/wav) atau via audio_path lokal.
    """
    track_id = f"track-{uuid.uuid4().hex[:8]}"

    if file:
        filename = file.filename or f"{track_id}.wav"
        save_path = UPLOAD_DIR / f"{track_id}_{filename}"
        
        # Simpan file yang di-upload
        with open(save_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        target_audio_path = str(save_path)
        display_name = filename
    elif audio_path:
        if not os.path.exists(audio_path):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Path file audio lokal '{audio_path}' tidak ditemukan."
            )
        target_audio_path = audio_path
        display_name = Path(audio_path).name
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Harap sertakan file audio (upload) atau audio_path."
        )

    try:
        # Panggil VocalSeparatorEngine
        outputs = separator_engine.separate(target_audio_path)

        # Ubah path lokal menjadi URL yang bisa diakses oleh browser / frontend
        vocals_path = outputs.get("vocals")
        instrumental_path = outputs.get("instrumental")

        vocals_url = f"/output/separated/{Path(vocals_path).name}" if vocals_path else None
        instrumental_url = f"/output/separated/{Path(instrumental_path).name}" if instrumental_path else None

        record = {
            "id": track_id,
            "original_filename": display_name,
            "vocals_url": vocals_url,
            "instrumental_url": instrumental_url,
            "status": "completed",
            "created_at": datetime.now(timezone.utc)
        }

        # Simpan ke In-Memory DB (list)
        separated_tracks_db.insert(0, record)
        return record

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Gagal memproses pemisahan vokal: {str(e)}"
        )
