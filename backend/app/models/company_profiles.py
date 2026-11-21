"""Company profile model — structured business-intelligence context.

The profile holds the research/understanding layer of the growth system:
positioning, market context and competitor landscape.
"""

from sqlalchemy import ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, new_id


class CompanyProfile(Base, TimestampMixin):
    __tablename__ = "company_profiles"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    company_id: Mapped[str] = mapped_column(String(36), ForeignKey("companies.id"), nullable=False, unique=True)
    positioning_statement: Mapped[str] = mapped_column(Text, nullable=False, default="")
    competitive_landscape: Mapped[str] = mapped_column(Text, nullable=False, default="")
    market_context: Mapped[str] = mapped_column(Text, nullable=False, default="")
    product_description: Mapped[str] = mapped_column(Text, nullable=False, default="")
