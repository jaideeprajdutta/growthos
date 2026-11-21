"""Company model — the central entity of GrowthOS."""

from sqlalchemy import Boolean, ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, new_id


class Company(Base, TimestampMixin):
    __tablename__ = "companies"
    __table_args__ = (
        UniqueConstraint("workspace_id", "name", name="uq_companies_workspace_name"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    workspace_id: Mapped[str] = mapped_column(String(36), ForeignKey("workspaces.id"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    website: Mapped[str] = mapped_column(String(512), nullable=False, default="")
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    business_model: Mapped[str] = mapped_column(String(32), nullable=False, default="other")
    industry: Mapped[str] = mapped_column(String(200), nullable=False, default="")
    business_stage: Mapped[str] = mapped_column(String(32), nullable=False, default="startup")
    revenue_model: Mapped[str] = mapped_column(String(32), nullable=False, default="other")
    company_description: Mapped[str] = mapped_column(Text, nullable=False, default="")
    target_audience: Mapped[str] = mapped_column(Text, nullable=False, default="")
    main_product_or_service: Mapped[str] = mapped_column(Text, nullable=False, default="")
    primary_market: Mapped[str] = mapped_column(Text, nullable=False, default="")
