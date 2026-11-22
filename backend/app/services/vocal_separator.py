import logging
from pathlib import Path
from typing import Dict, Optional, Union

from app.core.config import SEPARATED_DIR

logger = logging.getLogger(__name__)

DEFAULT_BS_ROFORMER = "model_bs_roformer_ep_317_sdr_12.9755.ckpt"


class VocalSeparatorEngine:
    def __init__(
        self,
        model_name: str = DEFAULT_BS_ROFORMER,
        output_dir: Optional[Union[str, Path]] = None,
        output_format: str = "WAV",
        log_level: int = 20,
    ):
        self.model_name = model_name
        self.output_dir = Path(output_dir) if output_dir else SEPARATED_DIR
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.output_format = output_format.upper()
        self.log_level = log_level
        self._separator = None

    def _load_separator(self):
        if self._separator is not None:
            return
        try:
            from audio_separator.separator import Separator
        except ImportError as e:
            raise ImportError(
                "'audio-separator' library is not installed. "
                "Run: pip install audio-separator[cpu] or pip install audio-separator[gpu]"
            ) from e

        logger.info("Loading separator model: %s", self.model_name)
        self._separator = Separator(
            output_dir=str(self.output_dir),
            output_format=self.output_format,
            log_level=self.log_level,
            use_autocast=True,
            mdxc_params={"segment_size": 256, "batch_size": 1, "overlap": 3},
        )
        self._separator.load_model(model_filename=self.model_name)

    def separate(self, audio_file_path: str) -> Dict[str, Optional[str]]:
        input_path = Path(audio_file_path)
        if not input_path.exists():
            raise FileNotFoundError(f"Audio file not found: {audio_file_path}")

        self._load_separator()
        files = self._separator.separate(str(input_path.resolve()))

        result: Dict[str, Optional[str]] = {"vocals": None, "instrumental": None}
        for filename in files:
            name = filename.lower()
            path = str(self.output_dir / filename)
            if "vocal" in name:
                result["vocals"] = path
            elif "inst" in name:
                result["instrumental"] = path
        return result
