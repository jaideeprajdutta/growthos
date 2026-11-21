"""Experiment model — measurable experiments derived from opportunities."""

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, new_id


class Experiment(Base, TimestampMixin):
    __tablename__ = "experiments"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    company_id: Mapped[str] = mapped_column(String(36), ForeignKey("companies.id"), nullable=False, index=True)
    hypothesis: Mapped[str] = mapped_column(Text, nullable=False)
    problem: Mapped[str] = mapped_column(Text, nullable=False, default="")
    action: Mapped[str] = mapped_column(Text, nullable=False, default="")
    target_audience: Mapped[str] = mapped_column(Text, nullable=False, default="")
    success_metric: Mapped[str] = mapped_column(Text, nullable=False, default="")
    baseline: Mapped[str] = mapped_column(Text, nullable=False, default="")
    target: Mapped[str] = mapped_column(Text, nullable=False, default="")
    start_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    end_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="proposed")
    opportunity_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("opportunities.id"), nullable=True, index=True)
    actual_outcome: Mapped[str | None] = mapped_column(Text, nullable=True)
