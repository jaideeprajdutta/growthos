"""OpportunityEvidence — join table linking opportunities to supporting evidence."""

from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, new_id


class OpportunityEvidence(Base, TimestampMixin):
    __tablename__ = "opportunity_evidence"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    opportunity_id: Mapped[str] = mapped_column(String(36), ForeignKey("opportunities.id"), nullable=False, index=True)
    evidence_id: Mapped[str] = mapped_column(String(36), ForeignKey("evidence.id"), nullable=False, index=True)
