"""Uygulama ayarları.

Değerler ortam değişkeniyle geçersiz kılınabilir; varsayılanlar yerel geliştirme
içindir (bkz. README). Canlı site bu sürece ihtiyaç duymaz.
"""

from __future__ import annotations

import os
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[1]
PROJECT_ROOT = BACKEND_DIR.parent

DEFAULT_CORS_ORIGINS = (
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:4173",
    "http://127.0.0.1:4173",
)


@dataclass(frozen=True, slots=True)
class Settings:
    catalog_file: Path
    database_file: Path
    cors_origins: tuple[str, ...]
    metrics_token: str | None

    @property
    def project_root(self) -> Path:
        return PROJECT_ROOT


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    origins = os.getenv("MUHURHANE_CORS_ORIGINS")
    token = (os.getenv("MUHURHANE_METRICS_TOKEN") or "").strip() or None
    return Settings(
        catalog_file=Path(
            os.getenv("MUHURHANE_CATALOG_FILE", BACKEND_DIR / "data" / "motifs.generated.json")
        ),
        database_file=Path(
            os.getenv("MUHURHANE_DB_FILE", BACKEND_DIR / "data" / "muhurhane.sqlite3")
        ),
        cors_origins=tuple(o.strip() for o in origins.split(",") if o.strip())
        if origins
        else DEFAULT_CORS_ORIGINS,
        metrics_token=token,
    )
