"""Execution task repository — manual tasks with an explicit approval gate."""

from collections.abc import Sequence
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.constants import LOCAL_ACTOR
from app.core.exceptions import DomainValidationError, NotFoundError
from app.models import ExperimentTask
from app.models.base import utc_now
from app.repositories import evidence_repository, experiment_repository
from app.schemas.experiment_tasks import TaskCreate, TaskNoteCreate, TaskStatusUpdate, TaskUpdate

ALLOWED_TRANSITIONS: dict[str, set[str]] = {
    "pending": {"in_progress", "blocked"},
    "in_progress": {"completed", "blocked", "pending"},
    "blocked": {"in_progress", "pending"},
    "completed": set(),
}


def _note(text: str, kind: str, at: datetime) -> dict:
    return {"at": at.isoformat(), "actor": LOCAL_ACTOR, "kind": kind, "text": text}


def create_task(db: Session, experiment_id: str, company_id: str, data: TaskCreate) -> ExperimentTask:
    experiment_repository.require_experiment(db, experiment_id, company_id)
    task = ExperimentTask(
        company_id=company_id,
        experiment_id=experiment_id,
        title=data.title.strip(),
        description=data.description or "",
        owner=data.owner or "",
        due_date=data.dueDate,
        status="pending",
        requires_approval=bool(data.requiresApproval),
        approval_status="pending" if data.requiresApproval else "not_required",
        notes=[],
        evidence_ids=[],
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    return task


def list_tasks(db: Session, experiment_id: str, company_id: str) -> Sequence[ExperimentTask]:
    return db.execute(
        select(ExperimentTask)
        .where(ExperimentTask.experiment_id == experiment_id, ExperimentTask.company_id == company_id)
        .order_by(ExperimentTask.created_at, ExperimentTask.id)
    ).scalars().all()


def get_task(db: Session, task_id: str, experiment_id: str, company_id: str) -> ExperimentTask | None:
    return db.execute(
        select(ExperimentTask).where(
            ExperimentTask.id == task_id,
            ExperimentTask.experiment_id == experiment_id,
            ExperimentTask.company_id == company_id,
        )
    ).scalar_one_or_none()


def require_task(db: Session, task_id: str, experiment_id: str, company_id: str) -> ExperimentTask:
    task = get_task(db, task_id, experiment_id, company_id)
    if task is None:
        raise NotFoundError(f"Execution task {task_id} not found.")
    return task


def update_task(
    db: Session, task_id: str, experiment_id: str, company_id: str, data: TaskUpdate
) -> ExperimentTask:
    task = require_task(db, task_id, experiment_id, company_id)
    for field, value in (
        ("title", data.title),
        ("description", data.description),
        ("owner", data.owner),
        ("due_date", data.dueDate),
    ):
        if value is not None:
            setattr(task, field, value)
    if data.requiresApproval is not None and data.requiresApproval != bool(task.requires_approval):
        task.requires_approval = data.requiresApproval
        if not data.requiresApproval:
            task.approval_status = "not_required"
            task.approved_by = None
            task.approved_at = None
        elif task.approval_status == "not_required":
            task.approval_status = "pending"
    db.commit()
    db.refresh(task)
    return task


def change_status(
    db: Session, task_id: str, experiment_id: str, company_id: str, data: TaskStatusUpdate
) -> ExperimentTask:
    task = require_task(db, task_id, experiment_id, company_id)
    previous = task.status
    if previous != data.status:
        allowed = ALLOWED_TRANSITIONS.get(previous, set())
        if data.status not in allowed:
            raise DomainValidationError(
                f"Cannot change a task from {previous} to {data.status}. "
                f"Allowed next statuses: {', '.join(sorted(allowed)) or 'none'}."
            )
        if data.status in {"in_progress", "completed"} and task.requires_approval and task.approval_status != "approved":
            raise DomainValidationError("This task needs explicit approval before work can start.")
    now = utc_now()
    task.status = data.status
    if data.status == "completed" and previous != "completed":
        task.executed_by = LOCAL_ACTOR
        task.executed_at = now
    notes = list(task.notes or [])
    if data.note and data.note.strip():
        notes.append(_note(data.note.strip(), "status", now))
        task.notes = notes
    db.commit()
    db.refresh(task)
    return task


def add_note(
    db: Session, task_id: str, experiment_id: str, company_id: str, data: TaskNoteCreate
) -> ExperimentTask:
    task = require_task(db, task_id, experiment_id, company_id)
    evidence_repository.validate_evidence_ids(db, company_id, data.evidenceIds)
    notes = list(task.notes or [])
    notes.append(_note(data.note.strip(), "note", utc_now()))
    task.notes = notes
    evidence_ids = list(task.evidence_ids or [])
    for evidence_id in data.evidenceIds:
        if evidence_id not in evidence_ids:
            evidence_ids.append(evidence_id)
    task.evidence_ids = evidence_ids
    db.commit()
    db.refresh(task)
    return task


def set_approval(
    db: Session,
    task_id: str,
    experiment_id: str,
    company_id: str,
    approved: bool,
    note: str | None = None,
) -> ExperimentTask:
    task = require_task(db, task_id, experiment_id, company_id)
    if not task.requires_approval:
        raise DomainValidationError("This task does not require approval.")
    if task.status == "completed":
        raise DomainValidationError("A completed task cannot change approval state.")
    now = utc_now()
    task.approval_status = "approved" if approved else "rejected"
    task.approved_by = LOCAL_ACTOR
    task.approved_at = now
    notes = list(task.notes or [])
    label = "Task approved." if approved else "Task approval rejected."
    notes.append(_note(f"{label} {note or ''}".strip(), "approval", now))
    task.notes = notes
    db.commit()
    db.refresh(task)
    return task


def delete_task(db: Session, task_id: str, experiment_id: str, company_id: str) -> None:
    task = require_task(db, task_id, experiment_id, company_id)
    db.delete(task)
    db.commit()
