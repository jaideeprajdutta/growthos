"""Outcome review routes — recorded learning, no AI-generated conclusions."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.v1.dependencies import get_workspace
from app.db.session import get_db
from app.models.workspaces import Workspace
from app.repositories import company_repository, experiment_learning_repository
from app.schemas.experiment_learnings import LearningCreate, LearningOut, LearningUpdate, learning_out

router = APIRouter(tags=["experiment-learnings"])

BASE = "/companies/{company_id}/experiments/{experiment_id}/learning"


@router.get(BASE, response_model=LearningOut | None)
def get_learning(
    company_id: str,
    experiment_id: str,
    db: Session = Depends(get_db),
    workspace: Workspace = Depends(get_workspace),
) -> LearningOut | None:
    company_repository.require_company(db, company_id, workspace.id)
    learning = experiment_learning_repository.get_learning(db, experiment_id, company_id)
    return learning_out(learning) if learning is not None else None


@router.post(BASE, response_model=LearningOut, status_code=201)
def create_learning(
    company_id: str,
    experiment_id: str,
    data: LearningCreate,
    db: Session = Depends(get_db),
    workspace: Workspace = Depends(get_workspace),
) -> LearningOut:
    company_repository.require_company(db, company_id, workspace.id)
    return learning_out(experiment_learning_repository.save_learning(db, experiment_id, company_id, data))


@router.put(BASE, response_model=LearningOut)
def update_learning(
    company_id: str,
    experiment_id: str,
    data: LearningUpdate,
    db: Session = Depends(get_db),
    workspace: Workspace = Depends(get_workspace),
) -> LearningOut:
    company_repository.require_company(db, company_id, workspace.id)
    return learning_out(experiment_learning_repository.save_learning(db, experiment_id, company_id, data))
