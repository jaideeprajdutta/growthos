"""Opportunity model — a concrete growth opportunity for a company."""

from sqlalchemy import ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, new_id


class Opportunity(Base, TimestampMixin):
    __tablename__ = "opportunities"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    company_id: Mapped[str] = mapped_column(String(36), ForeignKey("companies.id"), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False, default="")
    supporting_evidence: Mapped[str] = mapped_column(Text, nullable=False, default="")
    expected_impact: Mapped[str] = mapped_column(Text, nullable=False, default="")
    confidence: Mapped[int] = mapped_column(Integer, nullable=False, default=50)
    effort: Mapped[int] = mapped_column(Integer, nullable=False, default=5)
    risk: Mapped[str] = mapped_column(Text, nullable=False, default="")
    priority_score: Mapped[int | None] = mapped_column(Integer, nullable=True)
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="proposed")
    recommended_next_action: Mapped[str] = mapped_column(Text, nullable=False, default="")
    diagnostic_finding_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("diagnostic_findings.id"), nullable=True, index=True
    )
    # Phase 3: historical experiment outcomes feed future prioritisation.
    last_learning_outcome: Mapped[str | None] = mapped_column(String(50), nullable=True)
    last_learning_summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    outcome_adjustment: Mapped[int | None] = mapped_column(Integer, nullable=True, default=0)
