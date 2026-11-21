"""Execution task routes — the manual, approval-gated plan for an experiment."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.v1.dependencies import get_workspace
from app.db.session import get_db
from app.models.workspaces import Workspace
from app.repositories import company_repository, experiment_task_repository
from app.schemas.experiment_tasks import (
    TaskApprove,
    TaskCreate,
    TaskNoteCreate,
    TaskOut,
    TaskStatusUpdate,
    TaskUpdate,
    task_out,
)

router = APIRouter(tags=["execution-tasks"])

BASE = "/companies/{company_id}/experiments/{experiment_id}/tasks"


@router.post(f"{BASE}", response_model=TaskOut, status_code=201)
def create_task(
    company_id: str,
    experiment_id: str,
    data: TaskCreate,
    db: Session = Depends(get_db),
    workspace: Workspace = Depends(get_workspace),
) -> TaskOut:
    company_repository.require_company(db, company_id, workspace.id)
    return task_out(experiment_task_repository.create_task(db, experiment_id, company_id, data))


@router.get(f"{BASE}", response_model=list[TaskOut])
def list_tasks(
    company_id: str,
    experiment_id: str,
    db: Session = Depends(get_db),
    workspace: Workspace = Depends(get_workspace),
) -> list[TaskOut]:
    company_repository.require_company(db, company_id, workspace.id)
    return [task_out(task) for task in experiment_task_repository.list_tasks(db, experiment_id, company_id)]


@router.put(f"{BASE}/{{task_id}}", response_model=TaskOut)
def update_task(
    company_id: str,
    experiment_id: str,
    task_id: str,
    data: TaskUpdate,
    db: Session = Depends(get_db),
    workspace: Workspace = Depends(get_workspace),
) -> TaskOut:
    company_repository.require_company(db, company_id, workspace.id)
    return task_out(experiment_task_repository.update_task(db, task_id, experiment_id, company_id, data))


@router.delete(f"{BASE}/{{task_id}}", status_code=204)
def delete_task(
    company_id: str,
    experiment_id: str,
    task_id: str,
    db: Session = Depends(get_db),
    workspace: Workspace = Depends(get_workspace),
) -> None:
    company_repository.require_company(db, company_id, workspace.id)
    experiment_task_repository.delete_task(db, task_id, experiment_id, company_id)


@router.post(f"{BASE}/{{task_id}}/status", response_model=TaskOut)
def change_task_status(
    company_id: str,
    experiment_id: str,
    task_id: str,
    data: TaskStatusUpdate,
    db: Session = Depends(get_db),
    workspace: Workspace = Depends(get_workspace),
) -> TaskOut:
    company_repository.require_company(db, company_id, workspace.id)
    return task_out(experiment_task_repository.change_status(db, task_id, experiment_id, company_id, data))


@router.post(f"{BASE}/{{task_id}}/approve", response_model=TaskOut)
def approve_task(
    company_id: str,
    experiment_id: str,
    task_id: str,
    data: TaskApprove,
    db: Session = Depends(get_db),
    workspace: Workspace = Depends(get_workspace),
) -> TaskOut:
    company_repository.require_company(db, company_id, workspace.id)
    return task_out(
        experiment_task_repository.set_approval(db, task_id, experiment_id, company_id, True, data.note)
    )


@router.post(f"{BASE}/{{task_id}}/reject", response_model=TaskOut)
def reject_task(
    company_id: str,
    experiment_id: str,
    task_id: str,
    data: TaskApprove,
    db: Session = Depends(get_db),
    workspace: Workspace = Depends(get_workspace),
) -> TaskOut:
    company_repository.require_company(db, company_id, workspace.id)
    return task_out(
        experiment_task_repository.set_approval(db, task_id, experiment_id, company_id, False, data.note)
    )


@router.post(f"{BASE}/{{task_id}}/notes", response_model=TaskOut)
def add_task_note(
    company_id: str,
    experiment_id: str,
    task_id: str,
    data: TaskNoteCreate,
    db: Session = Depends(get_db),
    workspace: Workspace = Depends(get_workspace),
) -> TaskOut:
    company_repository.require_company(db, company_id, workspace.id)
    return task_out(experiment_task_repository.add_note(db, task_id, experiment_id, company_id, data))
