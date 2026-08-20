"""İstek gövdeleri.

Yanıtlar sözlük olarak döner: servisler zaten ön ucun beklediği camelCase
biçimi üretiyor, araya ikinci bir model katmanı koymak yalnızca kopya olurdu.
"""

from __future__ import annotations

import json
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, field_validator

from ..domain.models import MAX_NAME_LENGTH

MAX_EVENT_PAYLOAD_CHARS = 1024


class SealSpecRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    frameId: str | None = None
    symbolId: str | None = None
    tribeId: str | None = None
    latinName: str = Field(default="", max_length=MAX_NAME_LENGTH)
    styleId: str | None = None


class TransliterateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    text: str = Field(default="", max_length=200)


class EventRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    sessionId: str = Field(min_length=1, max_length=64)
    event: str = Field(min_length=1, max_length=40)
    payload: dict[str, Any] | None = None

    @field_validator("payload")
    @classmethod
    def cap_payload(cls, value: dict[str, Any] | None) -> dict[str, Any] | None:
        if value is None:
            return None
        encoded = json.dumps(value, ensure_ascii=False, separators=(",", ":"))
        if len(encoded) > MAX_EVENT_PAYLOAD_CHARS:
            raise ValueError(
                f"Olay verisi en fazla {MAX_EVENT_PAYLOAD_CHARS} karakter olabilir"
            )
        return value
