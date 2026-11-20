import logging
from pathlib import Path
from typing import Callable, Optional, Union

import numpy as np
import soundfile as sf

from app.core.config import TRANSFORMED_DIR

logger = logging.getLogger(__name__)


def apply_per_channel(fn: Callable[[np.ndarray], np.ndarray], y: np.ndarray) -> np.ndarray:
    return np.array([fn(ch) for ch in y]) if y.ndim > 1 else fn(y)


class MusicTransformerEngine:
    def __init__(self, output_dir: Optional[Union[str, Path]] = None):
        self.output_dir = Path(output_dir) if output_dir else TRANSFORMED_DIR
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self._musicgen_model = None
        self._musicgen_processor = None

    def _write(self, name: str, data: np.ndarray, sr: int) -> str:
        out_path = self.output_dir / name
        sf.write(str(out_path), data.T if data.ndim > 1 else data, sr)
        logger.info("Saved to: %s", out_path)
        return str(out_path)

    def pitch_shift(self, audio_path: str, n_semitones: float, output_filename: Optional[str] = None) -> str:
        import librosa

        y, sr = librosa.load(audio_path, sr=None, mono=False)
        shifted = apply_per_channel(lambda ch: librosa.effects.pitch_shift(ch, sr=sr, n_steps=n_semitones), y)
        return self._write(output_filename or f"{Path(audio_path).stem}_pitch_{n_semitones:+g}.wav", shifted, sr)

    def time_stretch(self, audio_path: str, rate: float, output_filename: Optional[str] = None) -> str:
        import librosa

        y, sr = librosa.load(audio_path, sr=None, mono=False)
        stretched = apply_per_channel(lambda ch: librosa.effects.time_stretch(ch, rate=rate), y)
        return self._write(output_filename or f"{Path(audio_path).stem}_tempo_{rate}x.wav", stretched, sr)

    def apply_lofi_style(
        self,
        audio_path: str,
        bit_depth: int = 8,
        target_sr: int = 16000,
        output_filename: Optional[str] = None,
    ) -> str:
        import librosa
        from scipy import signal

        y, sr = librosa.load(audio_path, sr=None, mono=False)

        y = librosa.resample(y, orig_sr=sr, target_sr=target_sr)
        max_val = 2 ** (bit_depth - 1)
        y = np.round(y * max_val) / max_val
        y = librosa.resample(y, orig_sr=target_sr, target_sr=sr)

        b, a = signal.butter(4, 3500 / (0.5 * sr), btype="low")
        y = apply_per_channel(lambda ch: signal.lfilter(b, a, ch), y)
        return self._write(output_filename or f"{Path(audio_path).stem}_lofi.wav", y, sr)

    def generate_music_variation(
        self,
        melody_audio_path: str,
        style_prompt: str,
        duration_seconds: int = 15,
        model_id: str = "facebook/musicgen-melody",
        output_filename: Optional[str] = None,
    ) -> str:
        try:
            import librosa
            import torch
            from transformers import AutoProcessor, MusicgenForConditionalGeneration
        except ImportError as e:
            raise ImportError("Run: pip install transformers scipy torch torchaudio") from e

        if torch.cuda.is_available():
            device = "cuda"
        elif torch.backends.mps.is_available():
            device = "mps"
        else:
            device = "cpu"

        if self._musicgen_model is None:
            self._musicgen_processor = AutoProcessor.from_pretrained(model_id)
            self._musicgen_model = MusicgenForConditionalGeneration.from_pretrained(model_id).to(device)

        y, sr = librosa.load(melody_audio_path, sr=32000, mono=True)
        inputs = self._musicgen_processor(
            audio=y[: sr * duration_seconds],
            sampling_rate=sr,
            text=[style_prompt],
            padding=True,
            return_tensors="pt",
        ).to(device)

        # MusicGen menghasilkan 50 token per detik audio
        audio_values = self._musicgen_model.generate(**inputs, max_new_tokens=duration_seconds * 50)
        out_sr = self._musicgen_model.config.audio_encoder.sampling_rate
        return self._write(
            output_filename or f"{Path(melody_audio_path).stem}_ai_transformed.wav",
            audio_values[0, 0].cpu().numpy(),
            out_sr,
        )
