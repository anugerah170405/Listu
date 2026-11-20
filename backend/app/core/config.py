import json
from pathlib import Path
from typing import List, Optional, Union

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent.parent
OUTPUT_DIR = BASE_DIR / "output"
UPLOAD_DIR = OUTPUT_DIR / "uploads"
SEPARATED_DIR = OUTPUT_DIR / "separated"
TRANSFORMED_DIR = OUTPUT_DIR / "transformed"
LYRICS_DIR = OUTPUT_DIR / "lyrics"

for folder in (UPLOAD_DIR, SEPARATED_DIR, TRANSFORMED_DIR, LYRICS_DIR):
    folder.mkdir(parents=True, exist_ok=True)

URL_PREFIX = "/output/"


def url_to_local_path(url: Optional[str]) -> Optional[Path]:
    if not url or not url.startswith(URL_PREFIX):
        return None
    return OUTPUT_DIR / url[len(URL_PREFIX):].lstrip("/")


def local_path_to_url(path: Union[Path, str]) -> str:
    resolved = Path(path).resolve()
    try:
        return f"{URL_PREFIX}{resolved.relative_to(OUTPUT_DIR.resolve()).as_posix()}"
    except ValueError:
        return f"{URL_PREFIX}{resolved.name}"


class Settings(BaseSettings):
    PROJECT_NAME: str = "Listu Backend API"
    API_V1_STR: str = "/api/v1"
    HOST: str = "127.0.0.1"
    PORT: int = 8000
    CORS_ORIGINS: Union[List[str], str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v):
        if not isinstance(v, str):
            return v
        if v.startswith("[") and v.endswith("]"):
            try:
                return json.loads(v)
            except ValueError:
                pass
        return [i.strip() for i in v.split(",") if i.strip()]

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")


settings = Settings()
