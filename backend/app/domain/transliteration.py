"""Latin → Orhun çeviriyazısı (docs/PRD-tamamlayici.md 7. bölüm).

Harf tabloları ``backend/data/orkhon_map.json`` dosyasındadır. Ön uç aynı
dosyayı derleme zamanında gömer; kural tabloları tek kaynakta tutulur.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Literal

TURKISH_LOWER = str.maketrans({"I": "ı", "İ": "i"})
MAX_ALIAS_DEPTH = 4
MIXED_NOTE = (
    "Karışık ünlülü ad: her ünsüz, kendi hecesinin ünlüsüne göre kalın veya ince yazıldı."
)

VowelClass = Literal["back", "front"]
Harmony = Literal["back", "front", "mixed"]


@dataclass(frozen=True, slots=True)
class Letter:
    latin: str
    orkhon: str
    note: str | None = None


@dataclass(frozen=True, slots=True)
class Word:
    latin: str
    orkhon: str
    harmony: str
    letters: tuple[Letter, ...] = field(default_factory=tuple)


@dataclass(frozen=True, slots=True)
class Transliteration:
    source: str
    text: str
    words: tuple[Word, ...]
    notes: tuple[str, ...]


class OrkhonAlphabet:
    """Harf tablolarını saran çeviriyazı motoru."""

    def __init__(self, table: dict[str, Any]) -> None:
        self._table = table
        classes = table["vowelClasses"]
        self.back = set(classes["back"])
        self.front = set(classes["front"])
        self.rounded = set(classes["rounded"])
        self.vowels = {k: _glyph(v) for k, v in table["vowels"].items()}
        self.dual = {
            k: {"back": _glyph(v["back"]), "front": _glyph(v["front"])}
            for k, v in table["dual"].items()
        }
        self.single = {k: _glyph(v) for k, v in table["single"].items()}
        self.quad = {k: {f: _glyph(c) for f, c in v.items()} for k, v in table["quad"].items()}
        self.digraphs: dict[str, str] = table["digraphs"]
        self.aliases: dict[str, str] = table["aliases"]
        self.approximations: dict[str, str] = table["approximations"]
        self.word_separator = _glyph(table["wordSeparator"])
        self.direction: str = table["direction"]

    # ----------------------------------------------------------------- #

    def transliterate(self, source: str) -> Transliteration:
        words: list[Word] = []
        notes: dict[str, None] = {}

        for raw_word in source.split():
            letters = self._letters_of(raw_word)
            if not letters:
                continue
            harmony = self._harmony(letters)
            rendered = self._render_word(letters)
            if not rendered:
                continue
            for letter in rendered:
                if letter.note:
                    notes[letter.note] = None
            if harmony == "mixed":
                notes[MIXED_NOTE] = None
            words.append(
                Word(
                    latin=raw_word,
                    orkhon="".join(l.orkhon for l in rendered),
                    harmony=harmony,
                    letters=tuple(rendered),
                )
            )

        return Transliteration(
            source=source,
            text=self.word_separator.join(w.orkhon for w in words),
            words=tuple(words),
            notes=tuple(notes),
        )

    # ----------------------------------------------------------------- #

    def _letters_of(self, word: str) -> list[str]:
        """Kelimeyi Türkçe küçük harfe indirip alfabetik olmayanları atar."""
        return [ch for ch in word.translate(TURKISH_LOWER).lower() if ch.isalpha()]

    def _is_vowel(self, letter: str) -> bool:
        return letter in self.vowels

    def _harmony(self, letters: list[str]) -> Harmony:
        """Kelime özeti; harf seçimini etkilemez."""
        seen: VowelClass | None = None
        for letter in letters:
            cls = self._class_of_vowel(letter)
            if cls is None:
                continue
            if seen is None:
                seen = cls
            elif seen != cls:
                return "mixed"
        return seen or "back"

    def _class_of_vowel(self, letter: str | None) -> VowelClass | None:
        if letter is None:
            return None
        if letter in self.front:
            return "front"
        if letter in self.back:
            return "back"
        return None

    def _syllable_vowel(self, letters: list[str], index: int) -> str | None:
        """Ünsüzün hece ünlüsü (PRD 7.5).

        İki ünlü arasında son ünsüz sonraki hecenin başı, kalanı önceki
        hecenin sonudur. Baştaki ünsüzler ilk ünlüye, sondakiler son ünlüye bağlanır.
        """
        if self._is_vowel(letters[index]):
            return letters[index]

        prev: int | None = None
        nxt: int | None = None
        for step in range(index - 1, -1, -1):
            if self._is_vowel(letters[step]):
                prev = step
                break
        for step in range(index + 1, len(letters)):
            if self._is_vowel(letters[step]):
                nxt = step
                break

        if prev is None and nxt is None:
            return None
        if prev is None:
            return letters[nxt]
        if nxt is None:
            return letters[prev]
        if index == nxt - 1:
            return letters[nxt]
        return letters[prev]

    def _resolve_alias(self, letter: str) -> tuple[str, str | None]:
        note = self.approximations.get(letter)
        current = letter
        for _ in range(MAX_ALIAS_DEPTH):
            nxt = self.aliases.get(current)
            if nxt is None or nxt == current:
                break
            current = nxt
        return current, note

    def _render_word(self, letters: list[str]) -> list[Letter]:
        rendered: list[Letter] = []
        index = 0
        while index < len(letters):
            latin = letters[index]
            consumed = 1

            digraph = "".join(letters[index : index + 2])
            if digraph in self.digraphs:
                latin = digraph
                consumed = 2

            base = self.digraphs.get(latin, latin)
            base, note = self._resolve_alias(base)
            glyph = self._glyph_for(base, letters, index)
            if glyph is not None:
                rendered.append(Letter(latin=latin, orkhon=glyph, note=note))
            index += consumed
        return rendered

    def _glyph_for(self, base: str, letters: list[str], index: int) -> str | None:
        if base in self.vowels:
            return self.vowels[base]
        if base in self.single:
            return self.single[base]
        if base in self.dual:
            cls = self._class_of_vowel(self._syllable_vowel(letters, index)) or "back"
            return self.dual[base][cls]
        if base in self.quad:
            return self._quad_glyph(self.quad[base], letters, index)
        return None

    def _quad_glyph(self, forms: dict[str, str], letters: list[str], index: int) -> str:
        """``k`` dört biçimlidir: hece ünlüsünün sınıfı + yuvarlaklığı (7.4)."""
        neighbour = self._syllable_vowel(letters, index)
        rounded = neighbour in self.rounded
        cls = self._class_of_vowel(neighbour) or "back"
        if cls == "front":
            if rounded:
                return forms["frontRounded"]
            return forms["frontPlain"]
        if rounded:
            return forms["backRounded"]
        if neighbour == "ı":
            return forms["backDotless"]
        return forms["backPlain"]


def _glyph(codepoint: str) -> str:
    return chr(int(codepoint, 16))
