"""FastAPI uygulaması.

Çalıştırma:
    uvicorn app.main:app --reload --port 8000    (backend/ klasöründen)
"""

from __future__ import annotations

from contextlib import asynccontextmanager
from typing import AsyncIterator

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from . import __version__
from .api.routes import router
from .application.errors import NotFoundError, ValidationError
from .config import get_settings
from .container import build_container
from .infrastructure.motif_repository import CatalogNotFoundError


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    settings = get_settings()
    container = build_container(settings)
    # Katalog ve harf tablosu ilk istekte değil açılışta okunur: eksik dosya
    # ilk kullanıcıya değil, başlatan kişiye hata verir.
    container.catalog.payload()
    container.transliteration.table()
    app.state.container = container
    yield


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title="Mühürhane AI",
        version=__version__,
        summary="Anadolu Selçuklu motiflerinden kişisel dijital mühür üreten atölyenin arka ucu.",
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=list(settings.cors_origins),
        allow_methods=["GET", "POST"],
        allow_headers=["*"],
    )

    app.include_router(router)
    _register_error_handlers(app)
    return app


def _register_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(ValidationError)
    async def _validation(_: Request, error: ValidationError) -> JSONResponse:
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content={"detail": str(error)},
        )

    @app.exception_handler(NotFoundError)
    async def _not_found(_: Request, error: NotFoundError) -> JSONResponse:
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content={"detail": str(error)},
        )

    @app.exception_handler(CatalogNotFoundError)
    async def _catalog_missing(_: Request, error: CatalogNotFoundError) -> JSONResponse:
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={"detail": str(error)},
        )


app = create_app()
