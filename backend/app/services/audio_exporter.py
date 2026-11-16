"""
Module 6: Audio Export Engine
Tool: FFmpeg
Libraries: ffmpeg-python / subprocess

Deskripsi:
Engine untuk rendering dan mixing audio akhir:
1. Multi-track Mixing: Menggabungkan track Vokal & Instrumental dengan kontrol volume masing-masing.
2. Export Karaoke Track: Menghasilkan audio instrumental dengan penyesuaian pitch & tempo via FFmpeg filter.
3. Video Generator: Menghasilkan file MP4 berisi audio + subtitle/lirik karaoke yang menempel (burned-in).
4. Audio Converter: Konversi ke MP3 (320kbps), WAV, FLAC, AAC, atau OGG.
"""

import os
import shutil
import subprocess
from pathlib import Path
from typing import Optional, List


class AudioExporterEngine:
    """
    Engine export dan mixing berbasis FFmpeg.
    """

    def __init__(self, ffmpeg_path: Optional[str] = None, output_dir: str = "./output/exports"):
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        # Cari executable ffmpeg di sistem
        self.ffmpeg_bin = ffmpeg_path or shutil.which("ffmpeg") or "/opt/homebrew/bin/ffmpeg"
        if not Path(self.ffmpeg_bin).exists() and not shutil.which("ffmpeg"):
            raise FileNotFoundError("FFmpeg tidak ditemukan pada sistem. Pastikan sudah terpasang.")

    def mix_tracks(
        self,
        vocal_path: str,
        instrumental_path: str,
        output_filename: str = "karaoke_mix.mp3",
        vocal_volume: float = 1.0,       # 0.0 (mute/karaoke murni) s/d 1.5
        instrumental_volume: float = 1.0,
        bitrate: str = "320k"
    ) -> str:
        """
        Menggabungkan (mix) track vokal dan instrumen menjadi satu file audio utuh.
        vocal_volume = 0.0 -> Menghasilkan versi full instrumental/karaoke.
        """
        out_path = self.output_dir / output_filename

        # Filter complex: atur volume masing-masing input lalu gabungkan via amix
        filter_complex = (
            f"[0:a]volume={vocal_volume}[v];"
            f"[1:a]volume={instrumental_volume}[i];"
            f"[v][i]amix=inputs=2:duration=longest:dropout_transition=2[out]"
        )

        cmd = [
            self.ffmpeg_bin, "-y",
            "-i", str(Path(vocal_path).resolve()),
            "-i", str(Path(instrumental_path).resolve()),
            "-filter_complex", filter_complex,
            "-map", "[out]",
            "-b:a", bitrate,
            str(out_path.resolve())
        ]

        print(f"[AudioExporter] Menjalankan mixing track vokal & instrumental...")
        self._run_cmd(cmd)
        print(f"[AudioExporter] Hasil mix tersimpan di: {out_path}")
        return str(out_path)

    def export_adjusted_instrumental(
        self,
        instrumental_path: str,
        output_filename: str = "custom_instrumental.mp3",
        pitch_semitones: float = 0.0,
        tempo_factor: float = 1.0,
        bitrate: str = "320k"
    ) -> str:
        """
        Mengekspor track instrumental dengan penyesuaian nada dasar (pitch)
        dan tempo menggunakan filter FFmpeg (rubberband/asetrate/atempo).
        """
        out_path = self.output_dir / output_filename
        filters = []

        # Mengubah tempo menggunakan atempo (0.5 s/d 2.0)
        if tempo_factor != 1.0:
            filters.append(f"atempo={tempo_factor}")

        # Mengubah pitch (memerlukan filter rubberband pada FFmpeg jika terpasang)
        if pitch_semitones != 0:
            # Gunakan filter rubberband jika tersedia
            pitch_scale = 2 ** (pitch_semitones / 12.0)
            filters.append(f"rubberband=pitch={pitch_scale}")

        filter_arg = ",".join(filters) if filters else "anull"

        cmd = [
            self.ffmpeg_bin, "-y",
            "-i", str(Path(instrumental_path).resolve()),
            "-af", filter_arg,
            "-b:a", bitrate,
            str(out_path.resolve())
        ]

        print(f"[AudioExporter] Mengekspor instrumental (pitch={pitch_semitones}, tempo={tempo_factor}x)...")
        self._run_cmd(cmd)
        print(f"[AudioExporter] Tersimpan di: {out_path}")
        return str(out_path)

    def export_karaoke_video(
        self,
        audio_path: str,
        srt_or_ass_path: str,
        output_filename: str = "karaoke_video.mp4",
        resolution: str = "1280x720",
        bg_color: str = "black"
    ) -> str:
        """
        Membuat video MP4 karaoke sederhana dengan lirik/subtitle menempel di layar.
        """
        out_path = self.output_dir / output_filename
        sub_file = Path(srt_or_ass_path).resolve()

        # Gunakan lavfi color generator untuk latar belakang polos
        # dan bakar subtitle menggunakan filter subtitles
        vf_filter = f"subtitles='{str(sub_file)}':force_style='FontSize=24,PrimaryColour=&H00FFFF,Alignment=2'"

        cmd = [
            self.ffmpeg_bin, "-y",
            "-f", "lavfi", "-i", f"color=c={bg_color}:s={resolution}:r=24",
            "-i", str(Path(audio_path).resolve()),
            "-vf", vf_filter,
            "-c:v", "libx264", "-tune", "stillimage",
            "-c:a", "aac", "-b:a", "192k",
            "-shortest",
            str(out_path.resolve())
        ]

        print(f"[AudioExporter] Membuat video karaoke MP4...")
        self._run_cmd(cmd)
        print(f"[AudioExporter] Video karaoke siap di: {out_path}")
        return str(out_path)

    def _run_cmd(self, cmd: List[str]):
        """Menjalankan command FFmpeg dan menangkap error jika gagal."""
        proc = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        if proc.returncode != 0:
            raise RuntimeError(f"FFmpeg Error:\n{proc.stderr}")


# --- Template Pengujian / CLI Standalone ---
if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="FFmpeg Audio Exporter Engine")
    parser.add_argument("--vocal", help="Path track vokal")
    parser.add_argument("--inst", required=True, help="Path track instrumental")
    parser.add_argument("--vocal_vol", type=float, default=0.5, help="Volume vokal (0.0 = mute)")
    parser.add_argument("--inst_vol", type=float, default=1.0, help="Volume instrumen")
    parser.add_argument("--output", default="mixed_karaoke.mp3", help="Nama file hasil")

    args = parser.parse_args()
    engine = AudioExporterEngine()

    if args.vocal:
        engine.mix_tracks(
            vocal_path=args.vocal,
            instrumental_path=args.inst,
            output_filename=args.output,
            vocal_volume=args.vocal_vol,
            instrumental_volume=args.inst_vol
        )
    else:
        engine.export_adjusted_instrumental(
            instrumental_path=args.inst,
            output_filename=args.output
        )

