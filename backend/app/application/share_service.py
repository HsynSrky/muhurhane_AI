"""Paylaşım linki kullanım senaryosu (PRD-tamamlayici.md E-1)."""

from __future__ import annotations

from typing import Any

from ..infrastructure.share_repository import SqliteShareRepository
from .catalog_service import CatalogService, spec_payload
from .errors import NotFoundError


class ShareService:
    def __init__(self, repository: SqliteShareRepository, catalog: CatalogService) -> None:
        self._repository = repository
        self._catalog = catalog

    def create(self, raw_spec: dict[str, Any]) -> dict[str, Any]:
        spec = self._catalog.resolve_spec(raw_spec)
        code = self._repository.save(spec_payload(spec))
        return {"code": code, "spec": spec_payload(spec)}

    def resolve(self, code: str) -> dict[str, Any]:
        record = self._repository.get(code)
        if record is None:
            raise NotFoundError(f"Paylaşım kodu bulunamadı: {code}")
        # Kayıttan sonra katalog değişmiş olabilir; motifleri yeniden doğrula.
        spec = self._catalog.resolve_spec(record["spec"])
        return {
            "code": code.strip().upper(),
            "spec": spec_payload(spec),
            "createdAt": record["createdAt"],
        }
