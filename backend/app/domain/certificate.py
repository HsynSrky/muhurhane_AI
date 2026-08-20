"""Sertifika anı metni (PRD 11. bölüm).

Şablon:
    {İsim}; bu damga {dönem} dönemine ait olup {motifler} motiflerini içerir.
    Size özel üretilmiştir.
"""

from __future__ import annotations

from dataclasses import dataclass

FALLBACK_NAME = "Değerli Konuk"
DEFAULT_PERIOD = "Anadolu Selçuklu"


@dataclass(frozen=True, slots=True)
class CertificateText:
    body: str
    footer: str = ""

    @property
    def full(self) -> str:
        return f"{self.body}\n{self.footer}" if self.footer else self.body


def join_names(names: list[str]) -> str:
    """PRD 11 varyasyonları: tek ad, "A ve B", "A, B ve C"."""
    if len(names) == 1:
        return names[0]
    return f"{', '.join(names[:-1])} ve {names[-1]}"


def build_certificate_text(
    latin_name: str,
    motif_names: list[str],
    period: str = DEFAULT_PERIOD,
) -> CertificateText:
    display_name = latin_name.strip() or FALLBACK_NAME
    if not motif_names:
        body = (
            f"{display_name}; bu damga {period} dönemine ait motiflerle "
            "size özel üretilmiştir."
        )
    else:
        body = (
            f"{display_name}; bu damga {period} dönemine ait olup "
            f"{join_names(motif_names)} motiflerini içerir. Size özel üretilmiştir."
        )
    return CertificateText(body=body)
