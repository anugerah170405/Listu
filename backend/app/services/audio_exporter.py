import logging
import shutil
import subprocess
from pathlib import Path
from typing import List, Optional, Union

from app.core.config import EXPORTS_DIR

logger = logging.getLogger(__name__)


class AudioExporterEngine:
    def __init__(self, ffmpeg_path: Optional[str] = None, output_dir: Optional[Union[str, Path]] = None):
        self.output_dir = Path(output_dir) if output_dir else EXPORTS_DIR
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.ffmpeg_bin = ffmpeg_path or shutil.which("ffmpeg") or "/opt/homebrew/bin/ffmpeg"
        if not Path(self.ffmpeg_bin).exists() and not shutil.which("ffmpeg"):
            raise FileNotFoundError("FFmpeg was not found on the system. Please ensure it is installed.")

    def _run(self, args: List[str], output_filename: str) -> str:
        out_path = self.output_dir / output_filename
        cmd = [self.ffmpeg_bin, "-y", *args, str(out_path.resolve())]
        proc = subprocess.run(cmd, capture_output=True, text=True)
        if proc.returncode != 0:
            raise RuntimeError(f"FFmpeg Error:\n{proc.stderr}")
        logger.info("Saved to: %s", out_path)
        return str(out_path)

    def mix_tracks(
        self,
        vocal_path: str,
        instrumental_path: str,
        output_filename: str = "karaoke_mix.mp3",
        vocal_volume: float = 1.0,
        instrumental_volume: float = 1.0,
        bitrate: str = "320k",
    ) -> str:
        filter_complex = (
            f"[0:a]volume={vocal_volume}[v];"
            f"[1:a]volume={instrumental_volume}[i];"
            "[v][i]amix=inputs=2:duration=longest:dropout_transition=2[out]"
        )
        return self._run(
            [
                "-i", str(Path(vocal_path).resolve()),
                "-i", str(Path(instrumental_path).resolve()),
                "-filter_complex", filter_complex,
                "-map", "[out]",
                "-b:a", bitrate,
            ],
            output_filename,
        )

    def export_adjusted_instrumental(
        self,
        instrumental_path: str,
        output_filename: str = "custom_instrumental.mp3",
        pitch_semitones: float = 0.0,
        tempo_factor: float = 1.0,
        bitrate: str = "320k",
    ) -> str:
        filters = []
        if tempo_factor != 1.0:
            filters.append(f"atempo={tempo_factor}")
        if pitch_semitones != 0:
            filters.append(f"rubberband=pitch={2 ** (pitch_semitones / 12.0)}")

        return self._run(
            [
                "-i", str(Path(instrumental_path).resolve()),
                "-af", ",".join(filters) or "anull",
                "-b:a", bitrate,
            ],
            output_filename,
        )

    def export_karaoke_video(
        self,
        audio_path: str,
        srt_or_ass_path: str,
        output_filename: str = "karaoke_video.mp4",
        resolution: str = "1280x720",
        bg_color: str = "black",
    ) -> str:
        sub_file = Path(srt_or_ass_path).resolve()
        video_filter = f"subtitles='{sub_file}':force_style='FontSize=24,PrimaryColour=&H00FFFF,Alignment=2'"

        return self._run(
            [
                "-f", "lavfi", "-i", f"color=c={bg_color}:s={resolution}:r=24",
                "-i", str(Path(audio_path).resolve()),
                "-vf", video_filter,
                "-c:v", "libx264", "-tune", "stillimage",
                "-c:a", "aac", "-b:a", "192k",
                "-shortest",
            ],
            output_filename,
        )
