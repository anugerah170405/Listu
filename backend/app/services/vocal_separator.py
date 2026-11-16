"""
Module 1: Vocal Separation Engine
Architecture: BS-RoFormer / UVR (Ultimate Vocal Remover)
Library: audio-separator

Deskripsi:
Memisahkan lagu (audio mixed) menjadi track Vokal (Vocals) dan Musik Pengiring (Instrumental)
menggunakan model state-of-the-art BS-RoFormer atau arsitektur UVR lainnya.
"""

import os
import sys
from pathlib import Path
from typing import Dict, Optional, Tuple


class VocalSeparatorEngine:
    """
    Engine untuk pemisahan vokal dan instrumen.
    Mendukung model:
    - BS-RoFormer (Vocal/Instrumental SDR tertinggi saat ini)
    - MelBand-RoFormer
    - UVR-MDX-NET / Demucs
    """

    # Checkpoint model default yang direkomendasikan
    DEFAULT_BS_ROFORMER = "model_bs_roformer_ep_317_sdr_12.9755.ckpt"
    MEL_BAND_ROFORMER = "mel_band_roformer_kim_ft_unfrozen.ckpt"
    MDX23C_INST_VOC = "MDX23C-8KFFT-InstVoc_HQ.ckpt"

    def __init__(
        self,
        model_name: str = DEFAULT_BS_ROFORMER,
        output_dir: str = "./output/separated",
        output_format: str = "WAV",  # WAV atau MP3
        log_level: int = 20,         # 20 = INFO
    ):
        self.model_name = model_name
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.output_format = output_format.upper()
        self.log_level = log_level
        self._separator = None

    def _init_separator(self):
        """Lazy load separator instance dan download model jika belum ada."""
        if self._separator is not None:
            return

        try:
            from audio_separator.separator import Separator
        except ImportError:
            raise ImportError(
                "Pustaka 'audio-separator' belum terpasang. "
                "Jalankan: pip install audio-separator[cpu] atau pip install audio-separator[gpu]"
            )

        print(f"[VocalSeparator] Menginisialisasi separator...")
        print(f"[VocalSeparator] Output directory: {self.output_dir.resolve()}")
        print(f"[VocalSeparator] Model: {self.model_name}")

        self._separator = Separator(
            output_dir=str(self.output_dir),
            output_format=self.output_format,
            log_level=self.log_level,
        )

        print(f"[VocalSeparator] Memuat bobot model ({self.model_name})...")
        self._separator.load_model(model_filename=self.model_name)
        print("[VocalSeparator] Model berhasil dimuat.")

    def separate(
        self,
        audio_file_path: str,
        custom_output_names: Optional[Dict[str, str]] = None
    ) -> Dict[str, str]:
        """
        Memisahkan file audio menjadi vokal dan instrumental.

        Args:
            audio_file_path: Path file lagu input (mp3, wav, flac, dll.)
            custom_output_names: Opsi rename file hasil (misal: {"Vocals": "vocal.wav", "Instrumental": "inst.wav"})

        Returns:
            Dict berisi path file:
            {
                "vocals": "/path/to/Vocals.wav",
                "instrumental": "/path/to/Instrumental.wav"
            }
        """
        input_path = Path(audio_file_path)
        if not input_path.exists():
            raise FileNotFoundError(f"File audio tidak ditemukan: {audio_file_path}")

        self._init_separator()

        print(f"[VocalSeparator] Memproses pemisahan untuk: {input_path.name}")
        separated_files = self._separator.separate(str(input_path.resolve()))
        print(f"[VocalSeparator] Pemisahan selesai. File yang dihasilkan: {separated_files}")

        # Klasifikasikan file output ke vokal & instrumental
        result = {
            "vocals": None,
            "instrumental": None
        }

        for filename in separated_files:
            file_path = str(self.output_dir / filename)
            lower_name = filename.lower()
            if "vocal" in lower_name:
                result["vocals"] = file_path
            elif "instrumental" in lower_name or "inst" in lower_name:
                result["instrumental"] = file_path

        return result


# --- Template Pengujian / CLI Standalone ---
if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="AI Vocal Separation Engine (BS-RoFormer/UVR)")
    parser.add_argument("input_audio", help="Path ke file audio lagu (mp3/wav)")
    parser.add_argument("--model", default=VocalSeparatorEngine.DEFAULT_BS_ROFORMER, help="Nama checkpoint model")
    parser.add_argument("--output_dir", default="./output/separated", help="Folder tujuan hasil stem")
    parser.add_argument("--format", default="WAV", choices=["WAV", "MP3", "FLAC"], help="Format audio output")

    args = parser.parse_args()

    engine = VocalSeparatorEngine(
        model_name=args.model,
        output_dir=args.output_dir,
        output_format=args.format
    )

    outputs = engine.separate(args.input_audio)
    print("\n=== HASIL SEPARASI ===")
    print(f"Vocals Track      : {outputs['vocals']}")
    print(f"Instrumental Track: {outputs['instrumental']}")

