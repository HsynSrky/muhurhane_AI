"""Sertifika metni kullanım senaryosu (PRD 11. bölüm)."""

from __future__ import annotations

from typing import Any

from ..domain.certificate import build_certificate_text
from ..domain.models import SealSpec
from .catalog_service import CatalogService


class CertificateService:
    def __init__(self, catalog: CatalogService) -> None:
        self._catalog = catalog

    def build(self, spec: SealSpec) -> dict[str, Any]:
        text = build_certificate_text(
            latin_name=spec.latin_name,
            motif_names=self._catalog.motif_names(spec),
            period=self._catalog.period(),
        )
        return {"body": text.body, "footer": text.footer, "full": text.full}
