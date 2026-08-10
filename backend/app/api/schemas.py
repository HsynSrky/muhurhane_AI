"""İstek gövdeleri.

Yanıtlar sözlük olarak döner: servisler zaten ön ucun beklediği camelCase
biçimi üretiyor, araya ikinci bir model katmanı koymak yalnızca kopya olurdu.
"""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, ConfigDict, Field

from ..domain.models import MAX_NAME_LENGTH


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
