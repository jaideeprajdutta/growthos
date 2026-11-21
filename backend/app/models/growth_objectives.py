"""Growth objective model — primary or secondary growth goals per company."""

from sqlalchemy import Boolean, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, new_id


class GrowthObjective(Base, TimestampMixin):
    __tablename__ = "growth_objectives"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    company_id: Mapped[str] = mapped_column(String(36), ForeignKey("companies.id"), nullable=False, index=True)
    objective_type: Mapped[str] = mapped_column(String(50), nullable=False)
    custom_objective: Mapped[str] = mapped_column(Text, nullable=False, default="")
    is_primary: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
