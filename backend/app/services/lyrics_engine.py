import json
import logging
from pathlib import Path
from typing import Any, Dict, Optional

logger = logging.getLogger(__name__)

NO_LANGUAGE = {"", "none", "null", "undefined", "auto"}
FALLBACK_LANGUAGE = "id"


def normalize_language(language: Optional[str]) -> Optional[str]:
    lang = (language or "").strip().lower()
    return None if lang in NO_LANGUAGE else lang


class LyricsEngine:
    def __init__(self, model_size: str = "small", device: Optional[str] = None, output_dir: str = "./output/lyrics"):
        self.model_size = model_size
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
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

    def _detect_language(self, audio: Path) -> str:
        try:
            import whisper

            sample = whisper.pad_or_trim(whisper.load_audio(str(audio)))
            mel = whisper.log_mel_spectrogram(sample).to(self._model.device)
            _, probs = self._model.detect_language(mel)
            return max(probs, key=probs.get)
        except Exception as e:
            logger.warning("Language detection failed, fallback to '%s': %s", FALLBACK_LANGUAGE, e)
            return FALLBACK_LANGUAGE

    def transcribe_and_sync(self, vocal_audio_path: str, language: Optional[str] = None, vad: bool = False) -> Dict[str, Any]:
        self._load_model()
        audio = self._resolve_audio(vocal_audio_path)

        result = self._model.transcribe(
            str(audio),
            language=normalize_language(language),
            vad=vad,
            regroup=True,
        )
        data = self._format_result(result)

        lrc_path = self.output_dir / f"{audio.stem}.lrc"
        json_path = self.output_dir / f"{audio.stem}.json"
        self.save_lrc(data, lrc_path)
        self.save_json(data, json_path)
        data["files"] = {"lrc": str(lrc_path.resolve()), "json": str(json_path.resolve())}
        return data

    def align_existing_lyrics(self, vocal_audio_path: str, lyrics_text: str, language: Optional[str] = None) -> Dict[str, Any]:
        self._load_model()
        audio = self._resolve_audio(vocal_audio_path)

        lang = normalize_language(language) or self._detect_language(audio)
        result = self._model.align(str(audio), lyrics_text, language=lang, original_split=True)

        data = self._format_result(result)
        data["language"] = lang
        return data

    @staticmethod
    def _format_result(result) -> Dict[str, Any]:
        lines = []
        for segment in result.segments:
            text = segment.text.strip()
            words = [
                {
                    "word": w.word.strip(),
                    "start": round(w.start, 2),
                    "end": round(w.end, 2),
                    "probability": round(getattr(w, "probability", 1.0), 3),
                }
                for w in getattr(segment, "words", None) or []
            ]
            lines.append({
                "id": segment.id,
                "start": round(segment.start, 2),
                "end": round(segment.end, 2),
                "text": text,
                "words": words,
            })

        return {
            "language": getattr(result, "language", "unknown"),
            "full_lyrics": "\n".join(line["text"] for line in lines),
            "lines": lines,
        }

    @staticmethod
    def save_lrc(data: Dict[str, Any], output_path: Path) -> None:
        rows = [f"[{int(l['start'] // 60):02d}:{l['start'] % 60:05.2f}]{l['text']}" for l in data["lines"]]
        Path(output_path).write_text("\n".join(rows), encoding="utf-8")

    @staticmethod
    def save_json(data: Dict[str, Any], output_path: Path) -> None:
        Path(output_path).write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")
