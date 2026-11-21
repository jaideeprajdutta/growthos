"""Experiment model — measurable experiments derived from opportunities."""

from datetime import datetime

from sqlalchemy import JSON, DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, new_id


class Experiment(Base, TimestampMixin):
    __tablename__ = "experiments"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    company_id: Mapped[str] = mapped_column(String(36), ForeignKey("companies.id"), nullable=False, index=True)
    # Phase 3: a human-readable name alongside the required hypothesis.
    name: Mapped[str | None] = mapped_column(String(200), nullable=True, default="")
    description: Mapped[str | None] = mapped_column(Text, nullable=True, default="")
    hypothesis: Mapped[str] = mapped_column(Text, nullable=False)
    problem: Mapped[str] = mapped_column(Text, nullable=False, default="")
    action: Mapped[str] = mapped_column(Text, nullable=False, default="")
    target_audience: Mapped[str] = mapped_column(Text, nullable=False, default="")
    success_metric: Mapped[str] = mapped_column(Text, nullable=False, default="")
    baseline: Mapped[str] = mapped_column(Text, nullable=False, default="")
    target: Mapped[str] = mapped_column(Text, nullable=False, default="")
    guardrail_metrics: Mapped[list | None] = mapped_column(JSON, nullable=True, default=list)
    start_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    end_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    owner: Mapped[str | None] = mapped_column(String(200), nullable=True, default="")
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="proposed")
    opportunity_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("opportunities.id"), nullable=True, index=True)
    diagnostic_finding_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("diagnostic_findings.id"), nullable=True, index=True
    )
    decision_history: Mapped[list | None] = mapped_column(JSON, nullable=True, default=list)
    approved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    approved_by: Mapped[str | None] = mapped_column(String(200), nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    outcome: Mapped[str | None] = mapped_column(String(50), nullable=True)
    actual_outcome: Mapped[str | None] = mapped_column(Text, nullable=True)
