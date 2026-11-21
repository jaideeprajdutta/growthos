"""Execution action request and response schemas."""

from datetime import datetime

from pydantic import BaseModel, Field

from app.models.execution_actions import ExecutionAction
from app.schemas.common import ExecutionActionStatus


class ExecutionActionCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    description: str | None = Field(default=None, max_length=2000)
    status: ExecutionActionStatus = "pending"
    executedAt: datetime | None = None
    lastError: str | None = Field(default=None, max_length=1000)


class ExecutionActionUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = Field(default=None, max_length=2000)
    status: ExecutionActionStatus | None = None
    executedAt: datetime | None = None
    lastError: str | None = Field(default=None, max_length=1000)


class ExecutionActionOut(BaseModel):
    id: str
    companyId: str
    title: str
    description: str
    status: ExecutionActionStatus
    executedAt: datetime | None
    lastError: str | None
    createdAt: datetime
    updatedAt: datetime


def execution_action_out(action: ExecutionAction) -> ExecutionActionOut:
    return ExecutionActionOut(
        id=action.id,
        companyId=action.company_id,
        title=action.title,
        description=action.description,
        status=action.status,
        executedAt=action.executed_at,
        lastError=action.last_error,
        createdAt=action.created_at,
        updatedAt=action.updated_at,
    )
