"""HTTP uçları."""

from __future__ import annotations

import hashlib
import json
from collections.abc import Callable
from typing import Any

from fastapi import APIRouter, Depends, Request, Response, status

from ..container import Container
from .schemas import EventRequest, SealSpecRequest, TransliterateRequest

router = APIRouter(prefix="/api")

# Büyük gövdeler (katalog ~400 KB) sürüm başına bir kez serileştirilir.
# Anahtar: uç adı → (sürüm, gövde, ETag).
_serialised: dict[str, tuple[str, bytes, str]] = {}


def get_container(request: Request) -> Container:
    return request.app.state.container


@router.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@router.get("/catalog")
def catalog(
    request: Request,
    container: Container = Depends(get_container),
) -> Response:
    """Normalize edilmiş motif kataloğu.

    Gövde katalog sürümü başına bir kez serileştirilip ETag ile sunulur;
    tekrar ziyaretlerde 304 döner. ``normalize_motifs.py`` yeniden koşturulursa
    sürüm değişir ve gövde tazelenir.
    """
    return _cached_json(request, "catalog", container.catalog.version(), container.catalog.payload)


@router.get("/orkhon/map")
def orkhon_map(
    request: Request,
    container: Container = Depends(get_container),
) -> Response:
    """Orhun harf tabloları; ön uç anlık çeviriyazıyı bu veriyle yapar."""
    return _cached_json(
        request,
        "orkhon-map",
        container.transliteration.version(),
        container.transliteration.table,
    )


@router.post("/transliterate")
def transliterate(
    payload: TransliterateRequest,
    container: Container = Depends(get_container),
) -> dict[str, Any]:
    return container.transliteration.transliterate(payload.text)


@router.post("/certificate-text")
def certificate_text(
    payload: SealSpecRequest,
    container: Container = Depends(get_container),
) -> dict[str, Any]:
    spec = container.catalog.resolve_spec(payload.model_dump())
    return container.certificate.build(spec)


@router.post("/share", status_code=status.HTTP_201_CREATED)
def create_share(
    payload: SealSpecRequest,
    container: Container = Depends(get_container),
) -> dict[str, Any]:
    return container.share.create(payload.model_dump())


@router.get("/share/{code}")
def read_share(
    code: str,
    container: Container = Depends(get_container),
) -> dict[str, Any]:
    return container.share.resolve(code)


@router.post("/metrics/events", status_code=status.HTTP_202_ACCEPTED)
def record_event(
    payload: EventRequest,
    container: Container = Depends(get_container),
) -> dict[str, str]:
    container.metrics.record(payload.sessionId, payload.event, payload.payload)
    return {"status": "recorded"}


@router.get("/metrics/summary")
def metrics_summary(container: Container = Depends(get_container)) -> dict[str, Any]:
    return container.metrics.summary()


def _cached_json(
    request: Request,
    cache_key: str,
    version: str,
    build: Callable[[], dict[str, Any]],
) -> Response:
    """Gövdeyi sürümü değişene kadar yeniden serileştirmeden sunar.

    ``version`` veri kaynağının damgasıdır; katalog yeniden üretildiğinde
    değişir ve gövde de, ETag de tazelenir (T10).
    """
    cached = _serialised.get(cache_key)
    if cached is None or cached[0] != version:
        body = json.dumps(build(), ensure_ascii=False, separators=(",", ":")).encode("utf-8")
        etag = f'W/"{hashlib.blake2b(body, digest_size=12).hexdigest()}"'
        cached = (version, body, etag)
        _serialised[cache_key] = cached

    _, body, etag = cached
    headers = {"ETag": etag, "Cache-Control": "public, max-age=60"}

    if request.headers.get("if-none-match") == etag:
        return Response(status_code=status.HTTP_304_NOT_MODIFIED, headers=headers)

    return Response(content=body, media_type="application/json; charset=utf-8", headers=headers)
