"""IntelligenceFinding — evidence-backed findings from the intelligence engine."""

from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, Integer, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, new_id


class IntelligenceFinding(Base, TimestampMixin):
    __tablename__ = "intelligence_findings"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    company_id: Mapped[str] = mapped_column(String(36), ForeignKey("companies.id"), nullable=False, index=True)
    run_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("research_runs.id"), nullable=True, index=True)
    dimension: Mapped[str] = mapped_column(String(100), nullable=False)
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    category: Mapped[str] = mapped_column(String(50), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    confidence: Mapped[float | None] = mapped_column(Float, nullable=True)
    severity: Mapped[str | None] = mapped_column(String(50), nullable=True)
    evidence_ids: Mapped[list | None] = mapped_column(JSON, nullable=True)
    root_cause_hypothesis: Mapped[str | None] = mapped_column(Text, nullable=True)
    validation_method: Mapped[str | None] = mapped_column(Text, nullable=True)
    suggested_next_step: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="draft")
