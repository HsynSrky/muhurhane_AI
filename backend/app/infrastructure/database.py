"""SQLite bağlantısı ve şema.

Bağlantı istek başına açılır: SQLite için ucuzdur, iş parçacığı paylaşımı
sorununu tamamen ortadan kaldırır ve uçlar `def` olarak tanımlandığı için
FastAPI bunları zaten iş parçacığı havuzunda çalıştırır.
"""

from __future__ import annotations

import sqlite3
from contextlib import contextmanager
from pathlib import Path
from typing import Iterator

SCHEMA = """
CREATE TABLE IF NOT EXISTS shares (
    code       TEXT PRIMARY KEY,
    spec       TEXT NOT NULL,
    created_at REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS events (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    name       TEXT NOT NULL,
    payload    TEXT,
    created_at REAL NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_events_session ON events (session_id);
CREATE INDEX IF NOT EXISTS idx_events_name ON events (name);
"""


class Database:
    def __init__(self, path: Path) -> None:
        self._path = path

    def initialise(self) -> None:
        self._path.parent.mkdir(parents=True, exist_ok=True)
        with self.connect() as connection:
            connection.executescript(SCHEMA)

    @contextmanager
    def connect(self) -> Iterator[sqlite3.Connection]:
        connection = sqlite3.connect(self._path, timeout=5.0)
        connection.row_factory = sqlite3.Row
        connection.execute("PRAGMA journal_mode = WAL")
        connection.execute("PRAGMA foreign_keys = ON")
        try:
            yield connection
            connection.commit()
        except Exception:
            connection.rollback()
            raise
        finally:
            connection.close()
