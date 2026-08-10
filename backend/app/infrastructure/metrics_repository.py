"""Etkinlik olaylarının kaydı ve özetlenmesi (PRD 13. bölüm)."""

from __future__ import annotations

import json
import time
from dataclasses import dataclass
from typing import Any

from .database import Database


@dataclass(frozen=True, slots=True)
class SessionTrace:
    session_id: str
    first_seen: float
    events: tuple[tuple[str, dict[str, Any], float], ...]

    def has(self, name: str) -> bool:
        return any(event == name for event, _, _ in self.events)

    def first_time_of(self, name: str) -> float | None:
        return next((at for event, _, at in self.events if event == name), None)

    def last_payload_of(self, name: str) -> dict[str, Any] | None:
        found = [payload for event, payload, _ in self.events if event == name]
        return found[-1] if found else None


class SqliteMetricsRepository:
    def __init__(self, database: Database) -> None:
        self._database = database

    def record(self, session_id: str, name: str, payload: dict[str, Any] | None) -> None:
        with self._database.connect() as connection:
            connection.execute(
                "INSERT INTO events (session_id, name, payload, created_at) VALUES (?, ?, ?, ?)",
                (
                    session_id,
                    name,
                    json.dumps(payload or {}, ensure_ascii=False, separators=(",", ":")),
                    time.time(),
                ),
            )

    def sessions(self) -> list[SessionTrace]:
        with self._database.connect() as connection:
            rows = connection.execute(
                "SELECT session_id, name, payload, created_at FROM events "
                "ORDER BY session_id, created_at, id"
            ).fetchall()

        grouped: dict[str, list[tuple[str, dict[str, Any], float]]] = {}
        for row in rows:
            try:
                payload = json.loads(row["payload"] or "{}")
            except json.JSONDecodeError:
                payload = {}
            grouped.setdefault(row["session_id"], []).append(
                (row["name"], payload, float(row["created_at"]))
            )

        return [
            SessionTrace(session_id=key, first_seen=values[0][2], events=tuple(values))
            for key, values in grouped.items()
        ]

    def event_counts(self) -> dict[str, int]:
        with self._database.connect() as connection:
            rows = connection.execute(
                "SELECT name, COUNT(*) AS total FROM events GROUP BY name"
            ).fetchall()
        return {row["name"]: row["total"] for row in rows}
