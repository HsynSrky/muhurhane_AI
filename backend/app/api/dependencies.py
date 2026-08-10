"""Servis örneklerinin kurulumu.

Tüm servisler durumsuz ya da salt okunur önbellek taşıdığı için süreç ömrü
boyunca tek örnek yeterli. ``lru_cache`` ilk çağrıda kurar, sonrakiler bedava.
"""

from __future__ import annotations

from functools import lru_cache

from ..application.catalog_service import CatalogService
from ..application.certificate_service import CertificateService
from ..application.metrics_service import MetricsService
from ..application.share_service import ShareService
from ..infrastructure.metrics_repository import SqliteMetricsRepository
from ..infrastructure.motif_repository import get_motif_repository
from ..infrastructure.share_repository import SqliteShareRepository


@lru_cache(maxsize=1)
def get_catalog_service() -> CatalogService:
    return CatalogService(get_motif_repository())


@lru_cache(maxsize=1)
def get_certificate_service() -> CertificateService:
    repository = get_motif_repository()
    return CertificateService(get_catalog_service(), repository.period)


@lru_cache(maxsize=1)
def get_share_service() -> ShareService:
    return ShareService(SqliteShareRepository(), get_motif_repository())


@lru_cache(maxsize=1)
def get_metrics_service() -> MetricsService:
    return MetricsService(SqliteMetricsRepository())
