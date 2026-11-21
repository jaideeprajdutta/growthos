"""Experiment routes: create, list, update, delete."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.v1.dependencies import get_workspace
from app.db.session import get_db
from app.models.workspaces import Workspace
from app.repositories import company_repository, experiment_repository
from app.schemas.experiments import ExperimentCreate, ExperimentOut, ExperimentUpdate, experiment_out

router = APIRouter(tags=["experiments"])


@router.post("/companies/{company_id}/experiments", response_model=ExperimentOut, status_code=201)
def create_experiment(
    company_id: str,
    data: ExperimentCreate,
    db: Session = Depends(get_db),
    workspace: Workspace = Depends(get_workspace),
) -> ExperimentOut:
    company_repository.require_company(db, company_id, workspace.id)
    experiment = experiment_repository.create_experiment(db, company_id, data)
    return experiment_out(experiment)


@router.get("/companies/{company_id}/experiments", response_model=list[ExperimentOut])
def list_experiments(
    company_id: str,
    db: Session = Depends(get_db),
    workspace: Workspace = Depends(get_workspace),
) -> list[ExperimentOut]:
    company_repository.require_company(db, company_id, workspace.id)
    return [experiment_out(experiment) for experiment in experiment_repository.list_experiments(db, company_id)]


@router.put("/companies/{company_id}/experiments/{experiment_id}", response_model=ExperimentOut)
def update_experiment(
    company_id: str,
    experiment_id: str,
    data: ExperimentUpdate,
    db: Session = Depends(get_db),
    workspace: Workspace = Depends(get_workspace),
) -> ExperimentOut:
    company_repository.require_company(db, company_id, workspace.id)
    experiment = experiment_repository.update_experiment(db, experiment_id, company_id, data)
    return experiment_out(experiment)


@router.delete("/companies/{company_id}/experiments/{experiment_id}", status_code=204)
def delete_experiment(
    company_id: str,
    experiment_id: str,
    db: Session = Depends(get_db),
    workspace: Workspace = Depends(get_workspace),
) -> None:
    company_repository.require_company(db, company_id, workspace.id)
    experiment_repository.delete_experiment(db, experiment_id, company_id)
