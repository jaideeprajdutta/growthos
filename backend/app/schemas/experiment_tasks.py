"""Execution task schemas — the actionable plan for an experiment."""

from datetime import datetime

from pydantic import BaseModel, Field

from app.models.experiment_tasks import ExperimentTask
from app.schemas.common import ExperimentTaskStatus, TaskApprovalStatus


class TaskCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    description: str | None = Field(default=None, max_length=2000)
    owner: str | None = Field(default=None, max_length=200)
    dueDate: datetime | None = None
    requiresApproval: bool = True


class TaskUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = Field(default=None, max_length=2000)
    owner: str | None = Field(default=None, max_length=200)
    dueDate: datetime | None = None
    requiresApproval: bool | None = None


class TaskStatusUpdate(BaseModel):
    status: ExperimentTaskStatus
    note: str | None = Field(default=None, max_length=2000)


class TaskNoteCreate(BaseModel):
    note: str = Field(min_length=1, max_length=2000)
    evidenceIds: list[str] = Field(default_factory=list, max_length=50)


class TaskApprove(BaseModel):
    note: str | None = Field(default=None, max_length=2000)


class TaskOut(BaseModel):
    id: str
    companyId: str
    experimentId: str
    title: str
    description: str
    owner: str
    dueDate: datetime | None
    status: ExperimentTaskStatus
    requiresApproval: bool
    approvalStatus: TaskApprovalStatus
    approvedBy: str | None
    approvedAt: datetime | None
    executedBy: str | None
    executedAt: datetime | None
    notes: list[dict]
    evidenceIds: list[str]
    createdAt: datetime
    updatedAt: datetime


def task_out(task: ExperimentTask) -> TaskOut:
    return TaskOut(
        id=task.id,
        companyId=task.company_id,
        experimentId=task.experiment_id,
        title=task.title,
        description=task.description or "",
        owner=task.owner or "",
        dueDate=task.due_date,
        status=task.status,
        requiresApproval=bool(task.requires_approval),
        approvalStatus=task.approval_status,
        approvedBy=task.approved_by,
        approvedAt=task.approved_at,
        executedBy=task.executed_by,
        executedAt=task.executed_at,
        notes=task.notes or [],
        evidenceIds=task.evidence_ids or [],
        createdAt=task.created_at,
        updatedAt=task.updated_at,
    )
