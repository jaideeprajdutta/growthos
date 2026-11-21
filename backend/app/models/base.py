"""Shared SQLAlchemy base, helpers and timestamp mixin."""

from datetime import datetime, timezone
from uuid import uuid4

from sqlalchemy.orm import DeclarativeBase, declared_attr
from sqlalchemy import DateTime
from sqlalchemy.orm import Mapped, mapped_column


def utc_now() -> datetime:
    """Current time as an aware UTC datetime."""
    return datetime.now(timezone.utc)


def new_id() -> str:
    """New UUID string for primary keys."""
    return str(uuid4())


class Base(DeclarativeBase):
    """Base class for all SQLAlchemy models."""


class TimestampMixin:
    """Adds ``created_at`` and ``updated_at`` (UTC) to every model."""

    @declared_attr
    def created_at(cls) -> Mapped[datetime]:
        return mapped_column(DateTime(timezone=True), nullable=False, default=utc_now)

    @declared_attr
    def updated_at(cls) -> Mapped[datetime]:
        return mapped_column(DateTime(timezone=True), nullable=False, default=utc_now, onupdate=utc_now)
