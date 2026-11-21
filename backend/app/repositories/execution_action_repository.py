"""Execution action repository — CRUD scoped by company."""

from collections.abc import Sequence

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundError
from app.models import ExecutionAction
from app.models.base import utc_now
from app.schemas.execution_actions import ExecutionActionCreate, ExecutionActionUpdate


def create_execution_action(db: Session, company_id: str, data: ExecutionActionCreate) -> ExecutionAction:
    action = ExecutionAction(
        company_id=company_id,
        title=data.title,
        description=data.description or "",
        status=data.status,
        executed_at=data.executedAt,
        last_error=data.lastError,
    )
    db.add(action)
    db.commit()
    db.refresh(action)
    return action


def list_execution_actions(db: Session, company_id: str) -> Sequence[ExecutionAction]:
    return db.execute(
        select(ExecutionAction)
        .where(ExecutionAction.company_id == company_id)
        .order_by(ExecutionAction.created_at.desc(), ExecutionAction.id.desc())
    ).scalars().all()


def _get_scoped(db: Session, action_id: str, company_id: str) -> ExecutionAction:
    action = db.execute(
        select(ExecutionAction).where(ExecutionAction.id == action_id, ExecutionAction.company_id == company_id)
    ).scalar_one_or_none()
    if action is None:
        raise NotFoundError(f"Execution action {action_id} not found.")
    return action


def update_execution_action(db: Session, action_id: str, company_id: str, data: ExecutionActionUpdate) -> ExecutionAction:
    action = _get_scoped(db, action_id, company_id)
    if data.title is not None:
        action.title = data.title
    if data.description is not None:
        action.description = data.description
    if data.status is not None:
        action.status = data.status
    if data.executedAt is not None:
        action.executed_at = data.executedAt
    if data.lastError is not None:
        action.last_error = data.lastError
    if action.status == "executed" and action.executed_at is None:
        action.executed_at = utc_now()
    db.commit()
    db.refresh(action)
    return action


def delete_execution_action(db: Session, action_id: str, company_id: str) -> None:
    action = _get_scoped(db, action_id, company_id)
    db.delete(action)
    db.commit()
