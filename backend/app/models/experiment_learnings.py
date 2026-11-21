"""Structured outcome review — the learning half of the growth loop.

No AI-generated conclusions: every field is entered by a user. The review feeds
the recorded outcome back into the linked opportunity and intelligence profile.
"""

from sqlalchemy import JSON, Boolean, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, new_id


class ExperimentLearning(Base, TimestampMixin):
    __tablename__ = "experiment_learnings"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    company_id: Mapped[str] = mapped_column(String(36), ForeignKey("companies.id"), nullable=False, index=True)
    experiment_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("experiments.id"), nullable=False, index=True, unique=True
    )
    outcome: Mapped[str] = mapped_column(String(50), nullable=False)
    met_target: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    what_changed: Mapped[str] = mapped_column(Text, nullable=False, default="")
    evidence_ids: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    what_worked: Mapped[str] = mapped_column(Text, nullable=False, default="")
    what_failed: Mapped[str] = mapped_column(Text, nullable=False, default="")
    next_steps: Mapped[str] = mapped_column(Text, nullable=False, default="")
    recorded_by: Mapped[str] = mapped_column(String(200), nullable=False, default="Local User")
