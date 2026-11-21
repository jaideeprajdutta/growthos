"""Evidence — extracted, traceable statements with provenance."""

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, new_id, utc_now


class Evidence(Base, TimestampMixin):
    __tablename__ = "evidence"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    run_id: Mapped[str] = mapped_column(String(36), ForeignKey("research_runs.id"), nullable=False, index=True)
    company_id: Mapped[str] = mapped_column(String(36), ForeignKey("companies.id"), nullable=False, index=True)
    source_url: Mapped[str] = mapped_column(String(2048), nullable=False)
    source_title: Mapped[str | None] = mapped_column(String(500), nullable=True)
    source_type: Mapped[str] = mapped_column(String(100), nullable=False)
    extracted_statement: Mapped[str | None] = mapped_column(Text, nullable=True)
    supporting_excerpt: Mapped[str | None] = mapped_column(Text, nullable=True)
    observation_date: Mapped[str | None] = mapped_column(String(50), nullable=True)
    collected_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=utc_now)
    dimension: Mapped[str] = mapped_column(String(100), nullable=False)
    classification: Mapped[str] = mapped_column(String(50), nullable=False, default="observed")
    reliability_json: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    verification_status: Mapped[str] = mapped_column(String(50), nullable=False, default="unverified")
