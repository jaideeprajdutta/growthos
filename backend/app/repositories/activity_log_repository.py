"""Activity log repository."""

from collections.abc import Sequence

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import ActivityLogEntry


def log_activity(
    db: Session,
    company_id: str,
    action: str,
    title: str,
    description: str = "",
    actor_id: str | None = None,
) -> None:
    """Queue an activity entry; callers commit the session."""
    db.add(
        ActivityLogEntry(
            company_id=company_id,
            actor_id=actor_id,
            action=action,
            title=title,
            description=description,
        )
    )


def list_activity(db: Session, company_id: str, limit: int = 50, offset: int = 0) -> Sequence[ActivityLogEntry]:
    return db.execute(
        select(ActivityLogEntry)
        .where(ActivityLogEntry.company_id == company_id)
        .order_by(ActivityLogEntry.created_at.desc(), ActivityLogEntry.id.desc())
        .offset(offset)
        .limit(limit)
    ).scalars().all()
