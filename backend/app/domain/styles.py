"""Renk stilleri (PRD §10 + TDT kurumsal turkuazı).

Kural: açık zeminlerde koyu mürekkep, koyu zeminde açık mürekkep.
Accent çizgiler glow tonundan gelir.
"""

from __future__ import annotations

from .models import SealStyle

SEAL_STYLES: tuple[SealStyle, ...] = (
    SealStyle(
        id="tdt-turkuaz",
        name="TDT Açık Turkuaz",
        ground="#e8fafb",
        ink="#0c3c46",
        mid="#14707d",
        accent="#009e95",
    ),
    SealStyle(
        id="antik-tunc",
        name="Antik Tunç",
        ground="#e8e0d2",
        ink="#463016",
        mid="#78582a",
        accent="#a08246",
    ),
    SealStyle(
        id="gece-lacivert",
        name="Gece Lacivert",
        ground="#122434",
        ink="#d2e6eb",
        mid="#508c96",
        accent="#009e95",
        dark=True,
    ),
)

DEFAULT_STYLE_ID = SEAL_STYLES[0].id
STYLES_BY_ID = {style.id: style for style in SEAL_STYLES}
