"""Motif kataloğunun ve harf tablolarının okunması.

Her iki dosya da bir kez okunup bellekte tutulur. İstek başına yalnızca bir
``stat()`` yapılır; dosya damgası (mtime + boyut) değişmediyse çözümleme
tekrarlanmaz. Bu sayede ``normalize_motifs.py`` yeniden koşturulduğunda katalog
sunucu yeniden başlatılmadan tazelenir (PRD T10) ve p95 < 20 ms hedefi korunur.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from ..domain.models import Motif, MotifCatalog, MotifSlot


class CatalogNotFoundError(RuntimeError):
    """Katalog dosyası yok: normalize_motifs.py henüz çalıştırılmamış."""


def _stamp(file: Path) -> tuple[int, int] | None:
    try:
        info = file.stat()
    except OSError:
        return None
    return (info.st_mtime_ns, info.st_size)


class JsonMotifRepository:
    def __init__(self, catalog_file: Path) -> None:
        self._file = catalog_file
        self._catalog: MotifCatalog | None = None
        self._stamp: tuple[int, int] | None = None

    def load(self) -> MotifCatalog:
        stamp = _stamp(self._file)
        if self._catalog is None or stamp != self._stamp:
            self._catalog = self._read()
            self._stamp = stamp
        return self._catalog

    def _read(self) -> MotifCatalog:
        if not self._file.is_file():
            raise CatalogNotFoundError(
                f"Katalog bulunamadı: {self._file}. "
                "Önce `python backend/scripts/normalize_motifs.py` çalıştırın."
            )
        payload = json.loads(self._file.read_text(encoding="utf-8"))
        motifs = tuple(_to_motif(entry) for entry in payload["motifs"])
        view_box = tuple(float(v) for v in payload["viewBox"])
        return MotifCatalog(
            generated_at=payload["generatedAt"],
            period=payload["period"],
            view_box=view_box,  # type: ignore[arg-type]
            motifs=motifs,
        )


class JsonOrkhonMapRepository:
    def __init__(self, map_file: Path) -> None:
        self._file = map_file
        self._table: dict[str, Any] | None = None
        self._stamp: tuple[int, int] | None = None

    def load(self) -> dict[str, Any]:
        stamp = _stamp(self._file)
        if self._table is None or stamp != self._stamp:
            if not self._file.is_file():
                raise CatalogNotFoundError(f"Orhun harf tablosu bulunamadı: {self._file}")
            self._table = json.loads(self._file.read_text(encoding="utf-8"))
            self._stamp = stamp
        return self._table

    def version(self) -> str:
        stamp = self._stamp if self._table is not None else _stamp(self._file)
        return "-".join(str(part) for part in stamp) if stamp else "yok"


def _to_motif(entry: dict[str, Any]) -> Motif:
    bbox = tuple(float(v) for v in entry["bbox"])
    return Motif(
        id=entry["id"],
        slug=entry["slug"],
        slot=MotifSlot(entry["slot"]),
        name=entry["name"],
        period=entry["period"],
        blurb=entry["blurb"],
        history=entry["history"],
        source=entry["source"],
        bbox=bbox,  # type: ignore[arg-type]
        body=entry["body"],
        repeat=entry.get("repeat"),
    )
