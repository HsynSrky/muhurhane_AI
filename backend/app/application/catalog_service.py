"""Motif kataloğu ve mühür tanımı doğrulaması."""

from __future__ import annotations

from typing import Any

from ..domain.models import (
    MAX_NAME_LENGTH,
    SLOT_LABELS,
    SLOT_ORDER,
    Motif,
    MotifCatalog,
    MotifSlot,
    SealSpec,
    StyleId,
)
from ..infrastructure.motif_repository import JsonMotifRepository
from .errors import ValidationError


class CatalogService:
    def __init__(self, repository: JsonMotifRepository) -> None:
        self._repository = repository
        self._payload: dict[str, Any] | None = None
        self._source: MotifCatalog | None = None

    def payload(self) -> dict[str, Any]:
        """Ön ucun ihtiyaç duyduğu tam katalog; kurulup bellekte tutulur.

        Depo diskteki dosya değiştiğinde yeni bir katalog nesnesi döndürür;
        gövde de o zaman yeniden kurulur.
        """
        catalog = self._repository.load()
        if self._payload is None or catalog is not self._source:
            self._source = catalog
            self._payload = {
                "generatedAt": catalog.generated_at,
                "period": catalog.period,
                "viewBox": list(catalog.view_box),
                "slots": [
                    {
                        "id": slot.value,
                        "label": SLOT_LABELS[slot],
                        "motifs": [_motif_payload(m) for m in catalog.by_slot(slot)],
                    }
                    for slot in SLOT_ORDER
                ],
                "styles": [style.value for style in StyleId],
                "maxNameLength": MAX_NAME_LENGTH,
            }
        return self._payload

    def version(self) -> str:
        """Katalog sürümü; her normalizasyonda değişir, HTTP önbelleğini tazeler."""
        return self._repository.load().generated_at

    def motif_names(self, spec: SealSpec) -> list[str]:
        """Seçili motiflerin adları; mühürdeki bölge sırasıyla."""
        catalog = self._repository.load()
        names = []
        for motif_id in spec.motif_ids:
            motif = catalog.get(motif_id)
            if motif is not None:
                names.append(motif.name)
        return names

    def period(self) -> str:
        return self._repository.load().period

    def resolve_spec(self, raw: dict[str, Any]) -> SealSpec:
        """Ham istek gövdesini doğrulanmış bir ``SealSpec``e çevirir."""
        catalog = self._repository.load()

        def motif_for(key: str, slot: MotifSlot) -> str | None:
            motif_id = raw.get(key)
            if motif_id in (None, ""):
                return None
            if not isinstance(motif_id, str):
                raise ValidationError(f"{key} bir metin olmalı")
            motif = catalog.get(motif_id)
            if motif is None:
                raise ValidationError(f"Bilinmeyen motif: {motif_id}")
            if motif.slot is not slot:
                raise ValidationError(
                    f"{motif.name} motifi {slot.value} bölgesine konamaz "
                    f"({motif.slot.value} motifi)"
                )
            return motif.id

        raw_style = raw.get("styleId") or StyleId.ACIK_TURKUAZ.value
        try:
            style = StyleId(raw_style)
        except ValueError as error:
            raise ValidationError(f"Bilinmeyen stil: {raw_style}") from error

        name = str(raw.get("latinName") or "").strip()
        if len(name) > MAX_NAME_LENGTH:
            raise ValidationError(f"İsim en fazla {MAX_NAME_LENGTH} karakter olabilir")

        return SealSpec(
            frame_id=motif_for("frameId", MotifSlot.FRAME),
            symbol_id=motif_for("symbolId", MotifSlot.SYMBOL),
            tribe_id=motif_for("tribeId", MotifSlot.TRIBE),
            latin_name=name,
            style_id=style,
        )


def spec_payload(spec: SealSpec) -> dict[str, Any]:
    return {
        "frameId": spec.frame_id,
        "symbolId": spec.symbol_id,
        "tribeId": spec.tribe_id,
        "latinName": spec.latin_name,
        "styleId": spec.style_id.value,
    }


def _motif_payload(motif: Motif) -> dict[str, Any]:
    return {
        "id": motif.id,
        "slug": motif.slug,
        "slot": motif.slot.value,
        "name": motif.name,
        "period": motif.period,
        "blurb": motif.blurb,
        "history": motif.history,
        "citations": list(motif.citations),
        "repeat": motif.repeat,
        "bbox": list(motif.bbox),
        "body": motif.body,
    }
