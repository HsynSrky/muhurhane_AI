"""Sertifika metni birim testleri."""

from __future__ import annotations

import unittest

from app.domain.certificate import FALLBACK_NAME, build_certificate_text, join_names


class JoinNamesTest(unittest.TestCase):
    def test_one(self) -> None:
        self.assertEqual(join_names(["Kayı"]), "Kayı")

    def test_two(self) -> None:
        self.assertEqual(join_names(["A", "B"]), "A ve B")

    def test_three(self) -> None:
        self.assertEqual(join_names(["A", "B", "C"]), "A, B ve C")


class CertificateTextTest(unittest.TestCase):
    def test_fallback_name(self) -> None:
        text = build_certificate_text("", ["Selçuklu Yıldızı"])
        self.assertTrue(text.body.startswith(FALLBACK_NAME))

    def test_three_motifs(self) -> None:
        text = build_certificate_text("Eren Bey", ["Kuşak", "Arma", "Damga"])
        self.assertIn("Kuşak, Arma ve Damga", text.body)
        self.assertEqual(text.full, text.body)

    def test_no_motifs(self) -> None:
        text = build_certificate_text("Ayşe", [])
        self.assertIn("motiflerle size özel üretilmiştir", text.body)


if __name__ == "__main__":
    unittest.main()
