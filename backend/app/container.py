"""Bağımlılık kurulumu.

Servisler açılışta bir kez kurulur; uçlar somut sınıfları değil bu kabı görür.
"""

from __future__ import annotations

from dataclasses import dataclass

from .application.catalog_service import CatalogService
from .application.certificate_service import CertificateService
from .application.metrics_service import MetricsService
from .application.share_service import ShareService
from .application.transliteration_service import TransliterationService
from .config import BACKEND_DIR, Settings
from .infrastructure.database import Database
from .infrastructure.metrics_repository import SqliteMetricsRepository
from .infrastructure.motif_repository import JsonMotifRepository, JsonOrkhonMapRepository
from .infrastructure.share_repository import SqliteShareRepository


@dataclass(frozen=True, slots=True)
class Container:
    catalog: CatalogService
    transliteration: TransliterationService
    certificate: CertificateService
    share: ShareService
    metrics: MetricsService


def build_container(settings: Settings) -> Container:
    database = Database(settings.database_file)
    database.initialise()

    catalog = CatalogService(JsonMotifRepository(settings.catalog_file))
    transliteration = TransliterationService(
        JsonOrkhonMapRepository(BACKEND_DIR / "data" / "orkhon_map.json")
    )

    return Container(
        catalog=catalog,
        transliteration=transliteration,
        certificate=CertificateService(catalog),
        share=ShareService(SqliteShareRepository(database), catalog),
        metrics=MetricsService(SqliteMetricsRepository(database)),
    )
