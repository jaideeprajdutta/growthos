"""Execution action routes: create, list, update, delete."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.v1.dependencies import get_workspace
from app.db.session import get_db
from app.models.workspaces import Workspace
from app.repositories import company_repository, execution_action_repository
from app.schemas.execution_actions import ExecutionActionCreate, ExecutionActionOut, ExecutionActionUpdate, execution_action_out

router = APIRouter(tags=["execution-actions"])


@router.post("/companies/{company_id}/execution-actions", response_model=ExecutionActionOut, status_code=201)
def create_execution_action(
    company_id: str,
    data: ExecutionActionCreate,
    db: Session = Depends(get_db),
    workspace: Workspace = Depends(get_workspace),
) -> ExecutionActionOut:
    company_repository.require_company(db, company_id, workspace.id)
    action = execution_action_repository.create_execution_action(db, company_id, data)
    return execution_action_out(action)


@router.get("/companies/{company_id}/execution-actions", response_model=list[ExecutionActionOut])
def list_execution_actions(
    company_id: str,
    db: Session = Depends(get_db),
    workspace: Workspace = Depends(get_workspace),
) -> list[ExecutionActionOut]:
    company_repository.require_company(db, company_id, workspace.id)
    return [execution_action_out(action) for action in execution_action_repository.list_execution_actions(db, company_id)]


@router.put("/companies/{company_id}/execution-actions/{action_id}", response_model=ExecutionActionOut)
def update_execution_action(
    company_id: str,
    action_id: str,
    data: ExecutionActionUpdate,
    db: Session = Depends(get_db),
    workspace: Workspace = Depends(get_workspace),
) -> ExecutionActionOut:
    company_repository.require_company(db, company_id, workspace.id)
    action = execution_action_repository.update_execution_action(db, action_id, company_id, data)
    return execution_action_out(action)


@router.delete("/companies/{company_id}/execution-actions/{action_id}", status_code=204)
def delete_execution_action(
    company_id: str,
    action_id: str,
    db: Session = Depends(get_db),
    workspace: Workspace = Depends(get_workspace),
) -> None:
    company_repository.require_company(db, company_id, workspace.id)
    execution_action_repository.delete_execution_action(db, action_id, company_id)
