"""
Module 3 & 4: Lyrics Generation & Synchronization Engine
Architecture: OpenAI Whisper / stable-ts (Word-Level Timestamp Alignment)
Library: stable-ts / faster-whisper

Deskripsi:
1. Lyrics Generation: Mentranskripsi vokal menjadi teks lirik lagu otomatis.
2. Lyrics Synchronization: Menghasilkan word-level timestamps (penanda waktu persis per kata)
   dan line-level timestamps untuk format karaoke (LRC & JSON).
3. Forced Alignment: Menyelaraskan teks lirik yang sudah ada dengan audio jika lirik resmi sudah tersedia.
"""

import json
import os
from pathlib import Path
from typing import Dict, List, Any, Optional


class LyricsEngine:
    """
    Engine untuk ekstraksi lirik dan sinkronisasi timestamp kata-per-kata.
    """

    def __init__(
        self,
        model_size: str = "base",  # tiny, base, small, medium, large-v3
        device: Optional[str] = None,
        output_dir: str = "./output/lyrics"
    ):
        self.model_size = model_size
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self._model = None
        self.device = device or self._detect_device()

    def _detect_device(self) -> str:
        """
        Deteksi hardware akselerasi.
        Catatan Mac (Apple Silicon):
        Whisper Word-Level DTW Alignment memerlukan float64 yang belum didukung oleh PyTorch MPS.
        Oleh karena itu, di Mac kita gunakan 'cpu' yang dioptimalkan secara multi-thread dengan ARM NEON.
        """
        try:
            import torch
            if torch.cuda.is_available():
                return "cuda"
        except Exception:
            pass
        return "cpu"

    def _init_model(self):
        """Lazy load model Whisper stable-ts."""
        if self._model is not None:
            return

        try:
            import stable_whisper
        except ImportError:
            raise ImportError(
                "Pustaka 'stable-ts' belum terpasang. "
                "Jalankan: pip install stable-ts"
            )

        print(f"[LyricsEngine] Memuat Whisper ({self.model_size}) pada device: {self.device}...")
        self._model = stable_whisper.load_model(self.model_size, device=self.device)
        print("[LyricsEngine] Model Whisper siap digunakan.")

    def transcribe_and_sync(
        self,
        vocal_audio_path: str,
        language: Optional[str] = None,
        vad: bool = False
    ) -> Dict[str, Any]:
        """
        Mentranskripsi audio vokal dan menyelaraskan penanda waktu per kata (word-level).

        Args:
            vocal_audio_path: Path ke file vokal (hasil separasi disarankan)
            language: Kode bahasa (e.g. 'id', 'en', 'ja') atau None (auto-detect)
            vad: Voice Activity Detection (default False untuk lagu agar intro musik tidak memotong lirik)
        """
        self._init_model()

        audio_file = Path(vocal_audio_path)
        if not audio_file.exists():
            raise FileNotFoundError(f"File audio vokal tidak ditemukan: {vocal_audio_path}")

        print(f"[LyricsEngine] Memproses transkripsi & sinkronisasi untuk: {audio_file.name}...")

        # stable-ts transcribe dengan word timestamps presisi
        result = self._model.transcribe(
            str(audio_file.resolve()),
            language=language,
            vad=vad,
            regroup=True  # Mengelompokkan kata ke kalimat natural
        )

        structured_data = self._format_result_to_json(result)

        # Simpan file LRC dan JSON secara otomatis
        stem_name = audio_file.stem
        lrc_path = self.output_dir / f"{stem_name}.lrc"
        json_path = self.output_dir / f"{stem_name}.json"

        self.save_lrc(structured_data, str(lrc_path))
        self.save_json(structured_data, str(json_path))

        structured_data["files"] = {
            "lrc": str(lrc_path.resolve()),
            "json": str(json_path.resolve())
        }

        print(f"[LyricsEngine] Lirik berhasil diproses.")
        print(f" -> LRC : {lrc_path}")
        print(f" -> JSON: {json_path}")

        return structured_data

    def align_existing_lyrics(
        self,
        vocal_audio_path: str,
        lyrics_text: str,
        language: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Jika Anda sudah memiliki lirik teks resmi lagu, fungsi ini melakukan
        'Forced Alignment' agar lirik teks tersebut mendapatkan timestamp presisi
        dari audio lagu.
        """
        self._init_model()

        print(f"[LyricsEngine] Menyelaraskan teks lirik yang ada dengan audio...")
        result = self._model.align(
            self._model,
            str(Path(vocal_audio_path).resolve()),
            lyrics_text,
            language=language
        )

        structured_data = self._format_result_to_json(result)
        return structured_data

    def _format_result_to_json(self, result) -> Dict[str, Any]:
        """
        Mengonversi output stable-ts menjadi struktur data bersih
        yang siap dikonsumsi oleh Web Audio Karaoke Player frontend.
        """
        lines = []
        full_text_list = []

        for segment in result.segments:
            line_text = segment.text.strip()
            full_text_list.append(line_text)

            words_data = []
            if hasattr(segment, "words") and segment.words:
                for w in segment.words:
                    words_data.append({
                        "word": w.word.strip(),
                        "start": round(w.start, 2),
                        "end": round(w.end, 2),
                        "probability": round(getattr(w, "probability", 1.0), 3)
                    })

            lines.append({
                "id": segment.id,
                "start": round(segment.start, 2),
                "end": round(segment.end, 2),
                "text": line_text,
                "words": words_data
            })

        return {
            "language": getattr(result, "language", "unknown"),
            "full_lyrics": "\n".join(full_text_list),
            "lines": lines
        }

    def save_lrc(self, data: Dict[str, Any], output_path: str):
        """Menyimpan lirik ke format standar LRC karaoke ([mm:ss.xx])."""
        lrc_lines = []
        for line in data.get("lines", []):
            start = line["start"]
            minutes = int(start // 60)
            seconds = start % 60
            timestamp = f"[{minutes:02d}:{seconds:05.2f}]"
            lrc_lines.append(f"{timestamp}{line['text']}")

        with open(output_path, "w", encoding="utf-8") as f:
            f.write("\n".join(lrc_lines))

    def save_json(self, data: Dict[str, Any], output_path: str):
        """Menyimpan lirik dan word-level timing ke format JSON."""
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)


# --- Template Pengujian / CLI Standalone ---
if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Lyrics Generation & Alignment Engine (Whisper)")
    parser.add_argument("input_audio", help="Path file audio vokal (mp3/wav)")
    parser.add_argument("--model", default="base", choices=["tiny", "base", "small", "medium", "large-v3"],
                        help="Ukuran model Whisper")
    parser.add_argument("--lang", default=None, help="Kode bahasa (e.g. id, en, ja)")
    parser.add_argument("--output_dir", default="./output/lyrics", help="Folder output")

    args = parser.parse_args()

    engine = LyricsEngine(model_size=args.model, output_dir=args.output_dir)
    res = engine.transcribe_and_sync(args.input_audio, language=args.lang)

    print("\n=== PREVIEW 3 BARIS PERTAMA LIRIK & TIMING ===")
    for line in res["lines"][:3]:
        print(f"[{line['start']}s -> {line['end']}s] {line['text']}")
        for w in line["words"]:
            print(f"   -> '{w['word']}' ({w['start']}s - {w['end']}s)")

