"""Orhun çeviriyazısı birim testleri."""

from __future__ import annotations

import json
import unittest
from pathlib import Path

from app.domain.transliteration import OrkhonAlphabet

MAP_FILE = Path(__file__).resolve().parents[1] / "data" / "orkhon_map.json"


def hex_cps(text: str) -> str:
    return " ".join(f"{ord(ch):x}" for ch in text)


class OrkhonTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        table = json.loads(MAP_FILE.read_text(encoding="utf-8"))
        cls.alphabet = OrkhonAlphabet(table)

    def test_eren_bey(self) -> None:
        result = self.alphabet.transliterate("Eren Bey")
        self.assertEqual(len(result.words), 2)
        self.assertEqual(result.words[0].latin, "Eren")
        self.assertEqual(result.words[0].harmony, "front")
        self.assertEqual(
            hex_cps(result.text),
            "10c00 10c3c 10c00 10c24 2009 10c0b 10c00 10c18",
        )

    def test_ahmet_mixed_harmony(self) -> None:
        result = self.alphabet.transliterate("Ahmet")
        self.assertEqual(result.words[0].harmony, "mixed")
        self.assertEqual(hex_cps(result.text), "10c00 10c34 10c22 10c00 10c45")
        self.assertTrue(any("Karışık ünlülü" in note for note in result.notes))

    def test_ayse_syllable_classes(self) -> None:
        result = self.alphabet.transliterate("Ayşe")
        self.assertEqual(hex_cps(result.text), "10c00 10c16 10c41 10c00")

    def test_koksal_keeps_front_kok(self) -> None:
        result = self.alphabet.transliterate("Köksal")
        self.assertEqual(hex_cps(result.text), "10c1c 10c07 10c1c 10c3d 10c00 10c1e")

    def test_empty(self) -> None:
        result = self.alphabet.transliterate("   ")
        self.assertEqual(result.words, ())


if __name__ == "__main__":
    unittest.main()
