"""Alan modelleri: motif kataloğu ve mühür tanımı.

Bu katman ne FastAPI'yi ne de veritabanını tanır.
"""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum


class MotifSlot(str, Enum):
    """Mühürdeki üç bölgeden biri."""

    FRAME = "frame"
    SYMBOL = "symbol"
    TRIBE = "tribe"


SLOT_ORDER: tuple[MotifSlot, ...] = (MotifSlot.FRAME, MotifSlot.SYMBOL, MotifSlot.TRIBE)

SLOT_LABELS: dict[MotifSlot, str] = {
    MotifSlot.FRAME: "Dış Kuşak",
    MotifSlot.SYMBOL: "Merkez Arma",
    MotifSlot.TRIBE: "Boy Damgası",
}


class StyleId(str, Enum):
    """Renk stilleri.

    Palet değerleri ön uçtaki ``seal/styles.ts`` içinde tanımlıdır: render tek
    kaynaktan yapılır (bkz. PRD-tamamlayici.md S-2). Arka uç yalnızca kimliği
    doğrular, renk üretmez.
    """

    TDT_TURKUAZ = "tdt-turkuaz"
    ANTIK_TUNC = "antik-tunc"
    GECE_LACIVERT = "gece-lacivert"


DEFAULT_STYLE = StyleId.TDT_TURKUAZ

MAX_NAME_LENGTH = 24


@dataclass(frozen=True, slots=True)
class Motif:
    id: str
    slug: str
    slot: MotifSlot
    name: str
    period: str
    blurb: str
    history: str
    source: str
    bbox: tuple[float, float, float, float]
    body: str
    repeat: int | None = None


@dataclass(frozen=True, slots=True)
class MotifCatalog:
    generated_at: str
    period: str
    view_box: tuple[float, float, float, float]
    motifs: tuple[Motif, ...]

    def get(self, motif_id: str) -> Motif | None:
        return next((m for m in self.motifs if m.id == motif_id), None)

    def by_slot(self, slot: MotifSlot) -> tuple[Motif, ...]:
        return tuple(m for m in self.motifs if m.slot is slot)


@dataclass(frozen=True, slots=True)
class SealSpec:
    """Bir mührü tam olarak belirleyen kullanıcı seçimleri.

    Üç slot da isteğe bağlıdır: kullanıcı hiçbirini seçmemişken de stüdyo
    çalışır (T9 boş durum).
    """

    frame_id: str | None = None
    symbol_id: str | None = None
    tribe_id: str | None = None
    latin_name: str = ""
    style_id: StyleId = DEFAULT_STYLE

    @property
    def motif_ids(self) -> tuple[str, ...]:
        """Seçili motifler; mühürdeki bölge sırasıyla."""
        return tuple(i for i in (self.frame_id, self.symbol_id, self.tribe_id) if i)

    @property
    def is_empty(self) -> bool:
        return not self.motif_ids
