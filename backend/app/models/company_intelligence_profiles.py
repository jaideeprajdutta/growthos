"""Company intelligence profile — the persistent, structured understanding of a company.

Combines onboarding information, website research and AI analysis into a
versioned, refreshable profile. Every field records provenance.
"""

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, JSON, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, new_id


class CompanyIntelligenceProfile(Base, TimestampMixin):
    __tablename__ = "company_intelligence_profiles"
    __table_args__ = (UniqueConstraint("company_id", name="uq_company_intelligence_profiles_company"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    company_id: Mapped[str] = mapped_column(String(36), ForeignKey("companies.id"), nullable=False, index=True)
    version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    source: Mapped[str | None] = mapped_column(String(100), nullable=True)
    generated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    refreshed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    provenance: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    value_proposition: Mapped[str | None] = mapped_column(Text, nullable=True, default="")
    target_audience: Mapped[str | None] = mapped_column(Text, nullable=True, default="")
    customer_pain_points: Mapped[str | None] = mapped_column(Text, nullable=True, default="")
    geographic_markets: Mapped[str | None] = mapped_column(Text, nullable=True, default="")
    company_size: Mapped[str | None] = mapped_column(Text, nullable=True, default="")
    key_differentiators: Mapped[str | None] = mapped_column(Text, nullable=True, default="")
    pricing_model: Mapped[str | None] = mapped_column(Text, nullable=True, default="")
    main_products: Mapped[str | None] = mapped_column(Text, nullable=True, default="")
    customer_acquisition_channels: Mapped[str | None] = mapped_column(Text, nullable=True, default="")
    sales_conversion_journey: Mapped[str | None] = mapped_column(Text, nullable=True, default="")
    retention_approach: Mapped[str | None] = mapped_column(Text, nullable=True, default="")
    competitors: Mapped[str | None] = mapped_column(Text, nullable=True, default="")
    strategic_priorities: Mapped[str | None] = mapped_column(Text, nullable=True, default="")
