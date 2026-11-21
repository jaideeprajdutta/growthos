"""Experiment result model — recorded, sourced measurements for an experiment."""

from datetime import datetime

from sqlalchemy import JSON, DateTime, Float, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, new_id, utc_now


class ExperimentResult(Base, TimestampMixin):
    __tablename__ = "experiment_results"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    company_id: Mapped[str] = mapped_column(String(36), ForeignKey("companies.id"), nullable=False, index=True)
    experiment_id: Mapped[str] = mapped_column(String(36), ForeignKey("experiments.id"), nullable=False, index=True)
    # Legacy fields retained for existing records and older API clients.
    outcome: Mapped[str] = mapped_column(Text, nullable=False, default="")
    metrics_json: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    # Phase 3 structured measurement fields.
    baseline_value: Mapped[float | None] = mapped_column(Float, nullable=True)
    observed_value: Mapped[float | None] = mapped_column(Float, nullable=True)
    target_value: Mapped[float | None] = mapped_column(Float, nullable=True)
    direction: Mapped[str | None] = mapped_column(String(20), nullable=True, default="increase")
    measurement_start: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    measurement_end: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    data_source: Mapped[str | None] = mapped_column(String(50), nullable=True, default="user_entered")
    source_name: Mapped[str | None] = mapped_column(String(200), nullable=True, default="")
    evidence_ids: Mapped[list | None] = mapped_column(JSON, nullable=True, default=list)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True, default="")
    interpretation: Mapped[str | None] = mapped_column(Text, nullable=True, default="")
    recorded_by: Mapped[str | None] = mapped_column(String(200), nullable=True, default="Local User")
    recorded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=utc_now)
