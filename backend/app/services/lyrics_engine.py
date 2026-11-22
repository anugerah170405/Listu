import logging
from pathlib import Path
from typing import Any, Dict, Optional

logger = logging.getLogger(__name__)

NO_LANGUAGE = {"", "none", "null", "undefined", "auto"}


def normalize_language(language: Optional[str]) -> Optional[str]:
    lang = (language or "").strip().lower()
    return None if lang in NO_LANGUAGE else lang


class LyricsEngine:
    def __init__(
        self,
        model_size: str = "small",
        device: Optional[str] = None,
    ):
        self.model_size = model_size
        self.device = device or self._detect_device()
        self._model = None

    @staticmethod
    def _detect_device() -> str:
        # Word-level DTW butuh float64 yang belum didukung MPS, jadi Mac memakai CPU
        try:
            import torch

            return "cuda" if torch.cuda.is_available() else "cpu"
        except Exception:
            return "cpu"

    def _load_model(self):
        if self._model is not None:
            return
        try:
            import stable_whisper
        except ImportError as e:
            raise ImportError("'stable-ts' library is not installed. Run: pip install stable-ts") from e

        logger.info("Loading Whisper (%s) on device: %s", self.model_size, self.device)
        self._model = stable_whisper.load_model(self.model_size, device=self.device)

    def _resolve_audio(self, path: str) -> Path:
        audio = Path(path)
        if not audio.exists():
            raise FileNotFoundError(f"Audio file not found: {path}")
        return audio.resolve()

    def transcribe_and_sync(self, vocal_audio_path: str, language: Optional[str] = None, vad: bool = True) -> Dict[str, Any]:
        self._load_model()
        audio = self._resolve_audio(vocal_audio_path)

        result = self._model.transcribe(
            str(audio),
            language=normalize_language(language),
            vad=vad,
            beam_size=1,
            regroup=True,
        )
        return self._format_result(result)

    @staticmethod
    def _format_result(result) -> Dict[str, Any]:
        lines = [
            {
                "id": segment.id,
                "start": round(segment.start, 2),
                "end": round(segment.end, 2),
                "text": segment.text.strip(),
            }
            for segment in result.segments
        ]
        return {
            "language": getattr(result, "language", "unknown"),
            "lines": lines,
        }
