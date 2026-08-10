"""Metrik toplama ve özetleme (PRD 13. bölüm; PRD-tamamlayici.md E-2).

PRD bu metrikleri "önerilen, ölçüm henüz bağlı değil" diye işaretliyordu.
Buradaki olay adları PRD tablosundaki beş metriğin tam karşılığıdır.
"""

from __future__ import annotations

from typing import Any

from ..domain.models import DEFAULT_STYLE, StyleId
from ..infrastructure.metrics_repository import SessionTrace, SqliteMetricsRepository
from .errors import ValidationError

EVENT_NAMES = frozenset(
    {
        "landing_view",
        "studio_view",
        "slot_selected",
        "style_selected",
        "name_entered",
        "confirmed",
        "certificate_view",
        "download",
    }
)

MAX_SESSION_ID_LENGTH = 64

TARGETS = {
    "completionRate": 0.40,
    "averageMotifCount": 2.0,
    "nameFillRate": 0.70,
    "averageDurationSeconds": 240.0,
    "turquoiseShare": 0.50,
}


class MetricsService:
    def __init__(self, repository: SqliteMetricsRepository) -> None:
        self._repository = repository

    def record(self, session_id: str, name: str, payload: dict[str, Any] | None) -> None:
        session_id = (session_id or "").strip()
        if not session_id or len(session_id) > MAX_SESSION_ID_LENGTH:
            raise ValidationError("Geçersiz oturum kimliği")
        if name not in EVENT_NAMES:
            raise ValidationError(f"Bilinmeyen olay: {name}")
        self._repository.record(session_id, name, payload)

    def summary(self) -> dict[str, Any]:
        sessions = self._repository.sessions()
        landing = [s for s in sessions if s.has("landing_view")]
        studio = [s for s in sessions if s.has("studio_view")]
        certificate = [s for s in sessions if s.has("certificate_view")]

        completion = _ratio(len(certificate), len(landing))
        motif_average = _mean([_selected_slot_count(s) for s in studio])
        name_fill = _ratio(sum(1 for s in studio if _name_filled(s)), len(studio))
        durations = [d for d in (_duration(s) for s in sessions) if d is not None]
        styles = _style_distribution(studio)
        turquoise = _ratio(styles.get(StyleId.TDT_TURKUAZ.value, 0), sum(styles.values()))

        return {
            "sessions": {
                "total": len(sessions),
                "landing": len(landing),
                "studio": len(studio),
                "certificate": len(certificate),
                "downloaded": sum(1 for s in sessions if s.has("download")),
            },
            "metrics": [
                _metric(
                    "completionRate",
                    "Tamamlanma oranı",
                    "Landing → certificate",
                    completion,
                    "ratio",
                ),
                _metric(
                    "averageMotifCount",
                    "Ortalama motif sayısı",
                    "Seçilen slot ortalaması",
                    motif_average,
                    "count",
                ),
                _metric(
                    "nameFillRate",
                    "İsim doluluk",
                    "latin_name dolu oturum",
                    name_fill,
                    "ratio",
                ),
                _metric(
                    "averageDurationSeconds",
                    "Ortalama süre",
                    "Landing → indirme",
                    _mean(durations),
                    "seconds",
                    lower_is_better=True,
                ),
                _metric(
                    "turquoiseShare",
                    "Stil dağılımı",
                    "TDT Açık Turkuaz tercihi",
                    turquoise,
                    "ratio",
                ),
            ],
            "styleDistribution": styles,
            "eventCounts": self._repository.event_counts(),
        }


def _metric(
    key: str,
    label: str,
    description: str,
    value: float | None,
    unit: str,
    lower_is_better: bool = False,
) -> dict[str, Any]:
    target = TARGETS[key]
    met: bool | None = None
    if value is not None:
        met = value <= target if lower_is_better else value >= target
    return {
        "key": key,
        "label": label,
        "description": description,
        "value": value,
        "unit": unit,
        "target": target,
        "lowerIsBetter": lower_is_better,
        "met": met,
    }


def _selected_slot_count(session: SessionTrace) -> float:
    """Oturum sonundaki dolu slot sayısı (aynı slota tekrar seçim sayılmaz)."""
    latest: dict[str, str | None] = {}
    for name, payload, _ in session.events:
        if name != "slot_selected":
            continue
        slot = payload.get("slot")
        if isinstance(slot, str):
            latest[slot] = payload.get("motifId")
    return float(sum(1 for motif_id in latest.values() if motif_id))


def _name_filled(session: SessionTrace) -> bool:
    payload = session.last_payload_of("name_entered")
    return bool(payload and payload.get("filled"))


def _duration(session: SessionTrace) -> float | None:
    finished = session.first_time_of("download")
    if finished is None:
        return None
    return max(0.0, finished - session.first_seen)


def _style_distribution(sessions: list[SessionTrace]) -> dict[str, int]:
    distribution: dict[str, int] = {}
    for session in sessions:
        payload = session.last_payload_of("style_selected")
        style = (payload or {}).get("styleId") or DEFAULT_STYLE.value
        distribution[style] = distribution.get(style, 0) + 1
    return distribution


def _ratio(part: int, whole: int) -> float | None:
    return round(part / whole, 4) if whole else None


def _mean(values: list[float]) -> float | None:
    return round(sum(values) / len(values), 2) if values else None
