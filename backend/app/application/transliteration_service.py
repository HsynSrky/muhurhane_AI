"""Çeviriyazı kullanım senaryosu."""

from __future__ import annotations

from functools import lru_cache
from typing import Any

from ..domain.transliteration import OrkhonAlphabet, Transliteration
from ..infrastructure.motif_repository import JsonOrkhonMapRepository

CACHE_SIZE = 2048


class TransliterationService:
    def __init__(self, repository: JsonOrkhonMapRepository) -> None:
        self._repository = repository
        self._alphabet: OrkhonAlphabet | None = None
        self._source: dict[str, Any] | None = None
        self._cached = lru_cache(maxsize=CACHE_SIZE)(self._transliterate)

    @property
    def alphabet(self) -> OrkhonAlphabet:
        table = self._repository.load()
        # Depo dosya değişince yeni bir sözlük döndürür; alfabe de o zaman
        # yeniden kurulmalı, yoksa çeviriyazı eski tabloda kalır.
        if self._alphabet is None or table is not self._source:
            self._source = table
            self._alphabet = OrkhonAlphabet(table)
            self._cached.cache_clear()
        return self._alphabet

    def table(self) -> dict[str, Any]:
        """Ham harf tablosu; ön uç aynı kuralları bu veriyle uygular."""
        return self._repository.load()

    def version(self) -> str:
        return self._repository.version()

    def transliterate(self, source: str) -> dict[str, Any]:
        return self._cached(source.strip())

    def _transliterate(self, source: str) -> dict[str, Any]:
        return _payload(self.alphabet.transliterate(source))


def _payload(result: Transliteration) -> dict[str, Any]:
    return {
        "source": result.source,
        "text": result.text,
        "words": [
            {
                "latin": word.latin,
                "orkhon": word.orkhon,
                "harmony": word.harmony,
                "letters": [
                    {"latin": letter.latin, "orkhon": letter.orkhon} for letter in word.letters
                ],
            }
            for word in result.words
        ],
        "notes": list(result.notes),
    }
