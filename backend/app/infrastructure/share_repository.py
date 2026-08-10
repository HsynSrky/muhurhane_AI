"""Paylaşılan mühür konfigürasyonlarının saklanması (PRD-tamamlayici.md E-1)."""

from __future__ import annotations

import json
import secrets
import sqlite3
import time
from typing import Any

from .database import Database

# Okunurken karıştırılabilecek harfler (I, L, O, U) alfabede yok: kod sözlü
# olarak da aktarılabilsin diye.
CODE_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ"
CODE_LENGTH = 8
MAX_ATTEMPTS = 8


class ShareCodeCollisionError(RuntimeError):
    pass


class SqliteShareRepository:
    def __init__(self, database: Database) -> None:
        self._database = database

    def save(self, spec: dict[str, Any]) -> str:
        payload = json.dumps(spec, ensure_ascii=False, separators=(",", ":"))
        with self._database.connect() as connection:
            for _ in range(MAX_ATTEMPTS):
                code = _generate_code()
                try:
                    connection.execute(
                        "INSERT INTO shares (code, spec, created_at) VALUES (?, ?, ?)",
                        (code, payload, time.time()),
                    )
                except sqlite3.IntegrityError:
                    continue
                return code
        raise ShareCodeCollisionError("Boş paylaşım kodu üretilemedi")

    def get(self, code: str) -> dict[str, Any] | None:
        with self._database.connect() as connection:
            row = connection.execute(
                "SELECT spec, created_at FROM shares WHERE code = ?",
                (code.strip().upper(),),
            ).fetchone()
        if row is None:
            return None
        return {"spec": json.loads(row["spec"]), "createdAt": row["created_at"]}


def _generate_code() -> str:
    return "".join(secrets.choice(CODE_ALPHABET) for _ in range(CODE_LENGTH))
