"""Uygulama katmanı hataları; HTTP'den bağımsızdır."""

from __future__ import annotations


class ApplicationError(Exception):
    """Tüm uygulama hatalarının ortak atası."""


class ValidationError(ApplicationError):
    """İstemciden gelen veri iş kurallarına uymuyor."""


class NotFoundError(ApplicationError):
    """İstenen kayıt yok."""
