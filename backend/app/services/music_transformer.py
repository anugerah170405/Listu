"""
Module 2: Music Transformation Engine
Architecture: Audio Style Transfer / Generative Audio / DSP Transformation
Libraries: librosa, soundfile, scipy, transformers (MusicGen / AudioLDM optional)

Deskripsi:
Melakukan transformasi pada track musik / instrumental:
1. DSP Style Transformation (Pitch Shift / Key Change, Tempo Shift, Lo-Fi / 8-Bit, Reverb, EQ)
2. AI Style Transfer / Generative Variation (Menggunakan MusicGen / AudioLDM via HuggingFace)
"""

import os
from pathlib import Path
from typing import Optional, Dict, Any
import numpy as np
import soundfile as sf


class MusicTransformerEngine:
    """
    Engine untuk memodifikasi dan mentransformasi karakter musik/audio.
    """

    def __init__(self, output_dir: str = "./output/transformed"):
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self._musicgen_model = None
        self._musicgen_processor = None

    # =========================================================================
    # 1. DSP & Audio Style Transformations (Ringan & Cepat)
    # =========================================================================

    def pitch_shift(
        self,
        audio_path: str,
        n_semitones: float,
        output_filename: Optional[str] = None
    ) -> str:
        """
        Mengubah nada dasar (Key/Pitch) lagu tanpa mengubah tempo.
        n_semitones: Nilai positif (menaikkan nada) atau negatif (menurunkan nada).
        """
        import librosa

        y, sr = librosa.load(audio_path, sr=None, mono=False)
        print(f"[MusicTransformer] Melakukan Pitch Shift: {n_semitones} semitone...")

        # Menangani multi-channel (stereo)
        if y.ndim > 1:
            shifted = np.array([librosa.effects.pitch_shift(ch, sr=sr, n_steps=n_semitones) for ch in y])
        else:
            shifted = librosa.effects.pitch_shift(y, sr=sr, n_steps=n_semitones)

        out_name = output_filename or f"{Path(audio_path).stem}_pitch_{n_semitones:+g}.wav"
        out_path = self.output_dir / out_name
        sf.write(str(out_path), shifted.T if y.ndim > 1 else shifted, sr)
        print(f"[MusicTransformer] Tersimpan di: {out_path}")
        return str(out_path)

    def time_stretch(
        self,
        audio_path: str,
        rate: float,
        output_filename: Optional[str] = None
    ) -> str:
        """
        Mengubah tempo/kecepatan lagu tanpa mengubah nada (pitch).
        rate > 1.0 = lebih cepat, rate < 1.0 = lebih lambat.
        """
        import librosa

        y, sr = librosa.load(audio_path, sr=None, mono=False)
        print(f"[MusicTransformer] Melakukan Time Stretch: rate {rate}x...")

        if y.ndim > 1:
            stretched = np.array([librosa.effects.time_stretch(ch, rate=rate) for ch in y])
        else:
            stretched = librosa.effects.time_stretch(y, rate=rate)

        out_name = output_filename or f"{Path(audio_path).stem}_tempo_{rate}x.wav"
        out_path = self.output_dir / out_name
        sf.write(str(out_path), stretched.T if y.ndim > 1 else stretched, sr)
        print(f"[MusicTransformer] Tersimpan di: {out_path}")
        return str(out_path)

    def apply_lofi_style(
        self,
        audio_path: str,
        bit_depth: int = 8,
        target_sr: int = 16000,
        output_filename: Optional[str] = None
    ) -> str:
        """
        Memberikan nuansa vintage / retro Lo-Fi / 8-bit style.
        """
        import librosa
        from scipy import signal

        y, sr = librosa.load(audio_path, sr=None, mono=False)
        print(f"[MusicTransformer] Menerapkan Lo-Fi style filter...")

        # 1. Downsampling sample rate untuk kesan vintage
        y_resampled = librosa.resample(y, orig_sr=sr, target_sr=target_sr)

        # 2. Bitcrush (reduksi bit-depth)
        max_val = 2 ** (bit_depth - 1)
        y_crushed = np.round(y_resampled * max_val) / max_val

        # 3. Resample kembali ke SR asli
        y_final = librosa.resample(y_crushed, orig_sr=target_sr, target_sr=sr)

        # 4. Low-pass filter (memotong frekuensi tinggi ala radio tua)
        nyq = 0.5 * sr
        cutoff = 3500 / nyq
        b, a = signal.butter(4, cutoff, btype="low")
        if y_final.ndim > 1:
            y_final = np.array([signal.lfilter(b, a, ch) for ch in y_final])
        else:
            y_final = signal.lfilter(b, a, y_final)

        out_name = output_filename or f"{Path(audio_path).stem}_lofi.wav"
        out_path = self.output_dir / out_name
        sf.write(str(out_path), y_final.T if y_final.ndim > 1 else y_final, sr)
        print(f"[MusicTransformer] Hasil Lo-Fi tersimpan di: {out_path}")
        return str(out_path)

    # =========================================================================
    # 2. Generative Audio Style Variation (MusicGen AI)
    # =========================================================================

    def generate_music_variation(
        self,
        melody_audio_path: str,
        style_prompt: str,
        duration_seconds: int = 15,
        model_id: str = "facebook/musicgen-melody",
        output_filename: Optional[str] = None
    ) -> str:
        """
        Mengubah gaya musik menggunakan AI Generatif (MusicGen Melody)
        berdasarkan panduan melodi dari lagu asli + teks deskripsi gaya baru.
        
        Contoh prompt:
        - "Lo-fi chillhop beat, cozy acoustic piano, relaxing vibe"
        - "Upbeat 80s synthwave, electronic drums, driving bass"
        - "Traditional acoustic jazz quartet, soft upright bass"
        """
        try:
            import torch
            from transformers import AutoProcessor, MusicgenForConditionalGeneration
            import librosa
        except ImportError:
            raise ImportError(
                "Pustaka AI generatif belum lengkap. "
                "Jalankan: pip install transformers scipy torch torchaudio"
            )

        print(f"[MusicTransformer] Memuat model AI Generatif: {model_id}...")
        device = "cuda" if torch.cuda.is_available() else ("mps" if torch.backends.mps.is_available() else "cpu")

        if self._musicgen_model is None:
            self._musicgen_processor = AutoProcessor.from_pretrained(model_id)
            self._musicgen_model = MusicgenForConditionalGeneration.from_pretrained(model_id).to(device)

        # Muat melodi acuan
        y, sr = librosa.load(melody_audio_path, sr=32000, mono=True)
        # Batasi ke durasi tertentu jika lagu panjang
        max_samples = sr * duration_seconds
        y_clip = y[:max_samples]

        print(f"[MusicTransformer] Mengenerate gaya baru dengan prompt: '{style_prompt}'...")
        inputs = self._musicgen_processor(
            audio=y_clip,
            sampling_rate=sr,
            text=[style_prompt],
            padding=True,
            return_tensors="pt"
        ).to(device)

        # Hitung max_new_tokens (50 token per detik audio)
        max_tokens = int(duration_seconds * 50)
        audio_values = self._musicgen_model.generate(**inputs, max_new_tokens=max_tokens)

        sampling_rate = self._musicgen_model.config.audio_encoder.sampling_rate
        out_audio = audio_values[0, 0].cpu().numpy()

        out_name = output_filename or f"{Path(melody_audio_path).stem}_ai_transformed.wav"
        out_path = self.output_dir / out_name
        sf.write(str(out_path), out_audio, sampling_rate)

        print(f"[MusicTransformer] Musik generatif tersimpan di: {out_path}")
        return str(out_path)


# --- Template Pengujian / CLI Standalone ---
if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Music Transformation Engine")
    parser.add_argument("input_audio", help="Path file audio instrumental")
    parser.add_argument("--mode", choices=["pitch", "tempo", "lofi", "generate"], default="pitch",
                        help="Mode transformasi")
    parser.add_argument("--semitones", type=float, default=2.0, help="Jumlah semitone untuk pitch shift")
    parser.add_argument("--tempo_rate", type=float, default=1.1, help="Faktor tempo (e.g. 1.2)")
    parser.add_argument("--prompt", default="Upbeat synthwave remix, 80s drums", help="Prompt untuk mode generate")

    args = parser.parse_args()
    engine = MusicTransformerEngine()

    if args.mode == "pitch":
        engine.pitch_shift(args.input_audio, n_semitones=args.semitones)
    elif args.mode == "tempo":
        engine.time_stretch(args.input_audio, rate=args.tempo_rate)
    elif args.mode == "lofi":
        engine.apply_lofi_style(args.input_audio)
    elif args.mode == "generate":
        engine.generate_music_variation(args.input_audio, style_prompt=args.prompt)

