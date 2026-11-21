"""IntelligenceReport — the structured report from the business-intelligence engine."""

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, new_id, utc_now


class IntelligenceReport(Base, TimestampMixin):
    __tablename__ = "intelligence_reports"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    company_id: Mapped[str] = mapped_column(String(36), ForeignKey("companies.id"), nullable=False, index=True)
    run_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("research_runs.id"), nullable=True, index=True)
    version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    generated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=utc_now)
    executive_summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    sections: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    findings_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    ai_usage_json: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    model: Mapped[str | None] = mapped_column(String(100), nullable=True)
