"""Activity log request and response schemas."""

from datetime import datetime
from typing import Any

from pydantic import BaseModel

from app.models.activity_log import ActivityLogEntry


class ActivityLogOut(BaseModel):
    id: str
    companyId: str
    actorId: str | None
    action: str
    title: str
    description: str
    metadata: dict[str, Any] | None
    createdAt: datetime


def activity_log_out(entry: ActivityLogEntry) -> ActivityLogOut:
    return ActivityLogOut(
        id=entry.id,
        companyId=entry.company_id,
        actorId=entry.actor_id,
        action=entry.action,
        title=entry.title,
        description=entry.description,
        metadata=entry.metadata_json,
        createdAt=entry.created_at,
    )
