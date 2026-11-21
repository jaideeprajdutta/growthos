"""Diagnostic models — diagnostic runs and evidence-backed diagnostic findings."""

from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, Integer, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, new_id, utc_now


class DiagnosticRun(Base, TimestampMixin):
    __tablename__ = "diagnostic_runs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    company_id: Mapped[str] = mapped_column(String(36), ForeignKey("companies.id"), nullable=False, index=True)
    run_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=utc_now)
    model: Mapped[str | None] = mapped_column(String(100), nullable=True)
    ai_usage_json: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    input_summary: Mapped[str | None] = mapped_column(Text, nullable=True)


class DiagnosticFinding(Base, TimestampMixin):
    __tablename__ = "diagnostic_findings"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    run_id: Mapped[str] = mapped_column(String(36), ForeignKey("diagnostic_runs.id"), nullable=False, index=True)
    company_id: Mapped[str] = mapped_column(String(36), ForeignKey("companies.id"), nullable=False, index=True)
    dimension: Mapped[str] = mapped_column(String(100), nullable=False)
    problem_statement: Mapped[str | None] = mapped_column(Text, nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    category: Mapped[str] = mapped_column(String(50), nullable=False)
    severity: Mapped[int | None] = mapped_column(Integer, nullable=True)
    confidence: Mapped[float | None] = mapped_column(Float, nullable=True)
    evidence_ids: Mapped[list | None] = mapped_column(JSON, nullable=True)
    root_cause_hypothesis: Mapped[str | None] = mapped_column(Text, nullable=True)
    validation_method: Mapped[str | None] = mapped_column(Text, nullable=True)
    suggested_next_step: Mapped[str | None] = mapped_column(Text, nullable=True)
