import io
import logging
import re
import subprocess
from math import gcd
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Union

import numpy as np
import soundfile as sf
import torch
from scipy import signal
from tqdm import tqdm
from transformers.generation.streamers import BaseStreamer

from app.core.config import TRANSFORMED_DIR

logger = logging.getLogger(__name__)

DEFAULT_MUSICGEN_MODEL = "facebook/musicgen-melody"
TOKENS_PER_SECOND = 50

# Prompts tailored when generating a pure instrumental arrangement
GENRE_PROMPTS_INSTRUMENTAL: Dict[str, str] = {
    "ambient": "ambient atmospheric soundscape, warm lush ethereal synth pads, cinematic slow evolving textures, dreamy reverberant instrumental",
    "electronic": "modern electronic dance music, punchy EDM synthwave, driving analog bassline, crisp electronic drums and arpeggiated synthesizers, high quality studio instrumental",
    "jazz": "smooth acoustic jazz ensemble, warm saxophone lead, upright double bass walking groove, rhodes jazz piano chords, brushed swing drums instrumental",
    "hip-hop": "boom bap lo-fi hip hop beat, heavy 808 sub bass, punchy dusty vinyl drum groove, warm rhodes chords and soulful chill instrumental",
    "classical": "symphonic classical orchestra arrangement, expressive violin and cello string section, grand concert piano, woodwinds and orchestral acoustics",
    "soul": "vintage 70s soul and R&B groove, warm Motown bass guitar, Hammond B3 organ, rhodes electric piano, tight funky pocket drums instrumental",
    "pop": "modern upbeat radio pop instrumental, catchy bright synthesizers, tight punchy pop drums, clean funky guitar strums and polished bassline",
    "rock": "energetic rock band instrumental, overdriven electric guitars, powerful live acoustic drum kit, driving rock bass guitar and studio amplifier tone",
}

# Prompts tailored when generating an accompaniment backing track to support a vocal lead
GENRE_PROMPTS_VOCAL: Dict[str, str] = {
    "ambient": "ambient atmospheric accompaniment, gentle lush ethereal synth pads, dreamy evolving harmony and spacious reverb, subtle supportive backing instrumental",
    "electronic": "modern electronic dance rhythm section, driving synthwave bassline, punchy EDM drums, clean rhythm synths, supportive backing groove arrangement",
    "jazz": "smooth acoustic jazz rhythm section, walking upright bass, warm rhodes piano chords, subtle brushed swing drums, gentle supportive jazz backing",
    "hip-hop": "boom bap lo-fi hip hop backing beat, heavy 808 sub bass, dusty vinyl drum groove, warm rhodes chords, clean chill beat accompaniment",
    "classical": "symphonic orchestral accompaniment, rich cello and violin string ensemble, grand piano harmonies, gentle concert acoustics, backing orchestra",
    "soul": "vintage 70s soul rhythm section, warm Motown bass guitar, Hammond B3 organ chords, tight funky pocket drums, backing groove arrangement",
    "pop": "modern radio pop backing track, bright rhythm synthesizers, punchy pop drums, funky rhythm guitar strums and clean bassline, polished accompaniment",
    "rock": "energetic rock band rhythm section, driving rhythm electric guitars, powerful acoustic drums, solid rock bass, backing band arrangement",
}


def polish_and_blend_vocals(
    instrumental: np.ndarray,
    vocals_raw: np.ndarray,
    sr: int,
    vocal_gain: float = 0.68,
    instrumental_gain: float = 0.82,
) -> np.ndarray:
    """
    Cleans, spatializes, and glues separated vocals into the newly generated AI instrumental:
    1. 2nd-order High-Pass Filter (85 Hz) removes low-end separation rumble and mic thumps.
    2. Gentle Low-Pass Filter (8500 Hz) eliminates harsh metallic artifacts from AI separation.
    3. Early acoustic room reflections (reverb) seat the vocal inside the same acoustic space as the instrumental.
    4. Dynamic sidechain ducking attenuates the instrumental slightly (~1.5 dB) during active vocal phrases.
    5. Soft-limiting & peak normalization to 0.92 so the mix breathes naturally.
    """
    sos_hpf = signal.butter(2, 85, btype="highpass", fs=sr, output="sos")
    v = signal.sosfilt(sos_hpf, vocals_raw)

    sos_lpf = signal.butter(2, 8500, btype="lowpass", fs=sr, output="sos")
    v = signal.sosfilt(sos_lpf, v)

    reverb_len = int(sr * 0.35)
    ir = np.zeros(reverb_len, dtype=np.float32)
    ir[0] = 1.0
    ir[int(sr * 0.015)] = 0.22
    ir[int(sr * 0.030)] = 0.15
    ir[int(sr * 0.050)] = 0.10
    decay = np.exp(-np.linspace(0, 4.5, reverb_len)).astype(np.float32)
    ir = (ir * decay)
    ir /= np.sum(np.abs(ir))
    wet = signal.fftconvolve(v, ir, mode="same")
    v_polished = v * 0.82 + wet * 0.25

    min_len = min(len(instrumental), len(v_polished))
    inst_slice = instrumental[:min_len]
    voc_slice = v_polished[:min_len]

    env_win = int(sr * 0.1)
    squared = np.convolve(voc_slice**2, np.ones(env_win) / env_win, mode="same")
    voc_rms = np.sqrt(np.maximum(squared, 1e-6))
    duck = 1.0 - np.clip(voc_rms / 0.15, 0.0, 1.0) * 0.15
    inst_ducked = inst_slice * duck

    mixed = inst_ducked * instrumental_gain + voc_slice * vocal_gain
    max_val = float(np.max(np.abs(mixed)))
    if max_val > 0.92:
        mixed = (mixed / max_val) * 0.92
    return mixed


def normalize_peak(y: np.ndarray, peak: float = 0.92) -> np.ndarray:
    max_val = float(np.max(np.abs(y)))
    return (y / max_val) * peak if max_val > 1e-6 else y


def load_audio_resampled(path: str, target_sr: int, mono: bool = True) -> np.ndarray:
    """
    In-memory audio loader using soundfile, with automatic ffmpeg fallback for
    AAC, M4A, and other compressed formats not supported by libsndfile.
    """
    try:
        data, sr = sf.read(path, always_2d=True, dtype="float32")
    except Exception as exc:
        logger.info("sf.read failed for %s (%s), falling back to ffmpeg decoder", path, exc)
        cmd = ["ffmpeg", "-y", "-i", path, "-f", "wav", "-"]
        proc = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)
        data, sr = sf.read(io.BytesIO(proc.stdout), always_2d=True, dtype="float32")

    y = data.T  # (channels, samples)
    if mono:
        y_mono = np.mean(y, axis=0, dtype=np.float32)
        if int(sr) != int(target_sr):
            g = gcd(int(sr), int(target_sr))
            y_mono = signal.resample_poly(y_mono, int(target_sr) // g, int(sr) // g).astype(np.float32)
        return y_mono

    if y.shape[0] == 1:
        y = np.vstack([y, y])
    elif y.shape[0] > 2:
        y = y[:2]
    if int(sr) != int(target_sr):
        g = gcd(int(sr), int(target_sr))
        up, down = int(target_sr) // g, int(sr) // g
        y = np.array([signal.resample_poly(ch, up, down) for ch in y], dtype=np.float32)
    return y.astype(np.float32)


def crossfade_concat(chunks: List[np.ndarray], overlap_samples: int) -> np.ndarray:
    if not chunks:
        return np.zeros(0, dtype=np.float32)
    if len(chunks) == 1 or overlap_samples <= 0:
        return np.concatenate(chunks, axis=-1)

    fade_out = np.linspace(1.0, 0.0, overlap_samples, dtype=np.float32)
    fade_in = np.linspace(0.0, 1.0, overlap_samples, dtype=np.float32)

    out = chunks[0]
    for nxt in chunks[1:]:
        ov = min(overlap_samples, len(out), len(nxt))
        if ov > 0:
            fo = fade_out[:ov] if ov == overlap_samples else np.linspace(1.0, 0.0, ov, dtype=np.float32)
            fi = fade_in[:ov] if ov == overlap_samples else np.linspace(0.0, 1.0, ov, dtype=np.float32)
            blended = out[-ov:] * fo + nxt[:ov] * fi
            out = np.concatenate([out[:-ov], blended, nxt[ov:]], axis=-1)
        else:
            out = np.concatenate([out, nxt], axis=-1)
    return out


class TqdmAudioStreamer(BaseStreamer):
    """Live progress bar streamer for MusicGen autoregressive token generation."""

    def __init__(self, total_tokens: int, desc: str = "MusicGen"):
        self.total_tokens = total_tokens
        self.desc = desc
        self.pbar: Optional[tqdm] = None
        self.first_call = True

    def put(self, value):
        if self.first_call:
            self.first_call = False
            self.pbar = tqdm(
                total=self.total_tokens,
                desc=self.desc,
                unit="tok",
                dynamic_ncols=True,
                leave=True,
            )
            return
        if self.pbar is not None:
            self.pbar.update(1)

    def end(self):
        if self.pbar is not None:
            self.pbar.close()


class MusicTransformerEngine:
    """
    AI MusicGen-Melody Genre Transformer Engine (`facebook/musicgen-melody`).
    Conditions on the song's melody/chromagram and generates a brand-new instrumental arrangement
    in the target genre, then blends separated vocals back if available.
    """

    def __init__(
        self,
        model_id: str = DEFAULT_MUSICGEN_MODEL,
        output_dir: Optional[Union[str, Path]] = None,
        segment_duration: int = 30,
        overlap_seconds: float = 1.0,
    ):
        self.model_id = model_id
        self.output_dir = Path(output_dir) if output_dir else TRANSFORMED_DIR
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.segment_duration = segment_duration
        self.overlap_seconds = overlap_seconds
        self._model = None
        self._processor = None
        self._device = None

    @staticmethod
    def _detect_device() -> str:
        if torch.cuda.is_available():
            return "cuda"
        # Note: MusicGenMelody uses operations that fallback/run stably in float32 on CPU/MPS
        return "cpu"

    def _load_model(self):
        if self._model is not None and self._processor is not None:
            return
        from transformers import AutoProcessor, MusicgenMelodyForConditionalGeneration

        self._device = self._detect_device()
        logger.info("Loading AI MusicGen-Melody (%s) on device: %s", self.model_id, self._device)
        self._processor = AutoProcessor.from_pretrained(self.model_id)
        dtype = torch.float16 if self._device == "cuda" else torch.float32
        self._model = MusicgenMelodyForConditionalGeneration.from_pretrained(
            self.model_id,
            torch_dtype=dtype,
        ).to(self._device)
        self._model.eval()

    def _generate_chunk(self, melody_chunk: np.ndarray, sr: int, prompt: str, duration_sec: float) -> np.ndarray:
        max_new_tokens = max(50, int(round(duration_sec * TOKENS_PER_SECOND)))
        inputs = self._processor(
            audio=melody_chunk,
            sampling_rate=sr,
            text=[prompt],
            padding=True,
            return_tensors="pt",
        )
        inputs = {k: v.to(self._device) if hasattr(v, "to") else v for k, v in inputs.items()}

        streamer = TqdmAudioStreamer(
            total_tokens=max_new_tokens,
            desc=f"MusicGen ({duration_sec:.1f}s)",
        )

        with torch.inference_mode():
            audio_values = self._model.generate(
                **inputs,
                do_sample=True,
                guidance_scale=2.5,
                max_new_tokens=max_new_tokens,
                streamer=streamer,
            )

        generated = audio_values[0, 0].detach().cpu().float().numpy()
        out_sr = int(getattr(self._model.config.audio_encoder, "sampling_rate", 32000))
        target_samples = int(round(duration_sec * out_sr))
        if len(generated) > target_samples:
            generated = generated[:target_samples]
        return generated

    def transform_genre(
        self,
        source_audio_path: str,
        genre: str,
        track_id: Optional[str] = None,
        vocals_audio_path: Optional[str] = None,
        max_duration_seconds: Optional[float] = None,
    ) -> Tuple[str, float]:
        input_path = Path(source_audio_path)
        if not input_path.exists():
            raise FileNotFoundError(f"Source audio file not found: {source_audio_path}")

        key = genre.strip().lower()
        has_vocals = bool(vocals_audio_path and Path(vocals_audio_path).exists())
        prompt_dict = GENRE_PROMPTS_VOCAL if has_vocals else GENRE_PROMPTS_INSTRUMENTAL
        prompt = prompt_dict.get(
            key,
            f"{genre} supportive backing track, acoustic rhythm section, polished accompaniment"
            if has_vocals
            else f"{genre} instrumental music arrangement, high quality studio recording",
        )

        self._load_model()
        model_sr = int(getattr(self._model.config.audio_encoder, "sampling_rate", 32000))

        y = load_audio_resampled(str(input_path), target_sr=model_sr, mono=True)
        total_seconds = len(y) / float(model_sr)
        target_seconds = min(total_seconds, float(max_duration_seconds)) if max_duration_seconds and max_duration_seconds > 0 else total_seconds

        logger.info(
            "AI MusicGen-Melody transforming '%s' to genre '%s' (%.1fs / %.1fs total, device=%s)",
            input_path.name,
            genre,
            target_seconds,
            total_seconds,
            self._device,
        )

        win_sec = float(self.segment_duration)
        ov_sec = float(self.overlap_seconds) if target_seconds > win_sec else 0.0
        step_sec = max(1.0, win_sec - ov_sec)

        chunks: List[np.ndarray] = []
        start_sec = 0.0
        while start_sec < target_seconds - 0.25:
            end_sec = min(target_seconds, start_sec + win_sec)
            seg_len_sec = end_sec - start_sec
            if seg_len_sec < 1.5 and chunks:
                break

            start_idx = int(round(start_sec * model_sr))
            end_idx = int(round(end_sec * model_sr))
            melody_slice = y[start_idx:end_idx]

            logger.info("MusicGen generating segment %.1fs - %.1fs / %.1fs...", start_sec, end_sec, target_seconds)
            gen_chunk = self._generate_chunk(melody_slice, model_sr, prompt, seg_len_sec)
            chunks.append(gen_chunk)

            if end_sec >= target_seconds:
                break
            start_sec += step_sec

        overlap_samples = int(round(ov_sec * model_sr))
        merged = crossfade_concat(chunks, overlap_samples)
        merged = normalize_peak(merged, peak=0.88)

        # If separated clean vocals exist, polish & glue them into the new AI MusicGen instrumental
        if has_vocals:
            vocals_mono = load_audio_resampled(str(vocals_audio_path), target_sr=model_sr, mono=True)
            merged = polish_and_blend_vocals(merged, vocals_mono, sr=model_sr)

        safe_genre = re.sub(r"[^a-z0-9]+", "_", key).strip("_")
        suffix = f"_{int(round(target_seconds))}s" if max_duration_seconds and max_duration_seconds > 0 else ""
        prefix = f"{track_id}_" if track_id else f"{input_path.stem}_"
        out_name = f"{prefix}{safe_genre}{suffix}.wav"
        out_path = self.output_dir / out_name

        sf.write(str(out_path), merged, model_sr)
        actual_duration = float(len(merged)) / float(model_sr)
        logger.info("Saved AI MusicGen transformed track to: %s (duration: %.1fs)", out_path, actual_duration)
        return str(out_path), actual_duration
