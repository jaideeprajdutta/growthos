"""Experiment routes: CRUD, detail workspace and validated lifecycle changes."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.v1.dependencies import get_workspace
from app.db.session import get_db
from app.models.workspaces import Workspace
from app.repositories import (
    company_repository,
    experiment_learning_repository,
    experiment_repository,
    experiment_result_repository,
    experiment_task_repository,
)
from app.schemas.experiments import (
    ExperimentCreate,
    ExperimentDetailOut,
    ExperimentOut,
    ExperimentStatusUpdate,
    ExperimentUpdate,
    experiment_out,
)

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


@router.get("/companies/{company_id}/experiments/{experiment_id}", response_model=ExperimentDetailOut)
def get_experiment_detail(
    company_id: str,
    experiment_id: str,
    db: Session = Depends(get_db),
    workspace: Workspace = Depends(get_workspace),
) -> ExperimentDetailOut:
    company_repository.require_company(db, company_id, workspace.id)
    experiment = experiment_repository.require_experiment(db, experiment_id, company_id)
    from app.schemas.experiment_learnings import learning_out
    from app.schemas.experiment_results import experiment_result_out
    from app.schemas.experiment_tasks import task_out

    return ExperimentDetailOut(
        experiment=experiment_out(experiment),
        tasks=[task_out(task) for task in experiment_task_repository.list_tasks(db, experiment_id, company_id)],
        results=[
            experiment_result_out(result)
            for result in experiment_result_repository.list_experiment_results(db, experiment_id, company_id)
        ],
        learning=learning_out(learning)
        if (learning := experiment_learning_repository.get_learning(db, experiment_id, company_id)) is not None
        else None,
    )


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


@router.post("/companies/{company_id}/experiments/{experiment_id}/status", response_model=ExperimentOut)
def change_experiment_status(
    company_id: str,
    experiment_id: str,
    data: ExperimentStatusUpdate,
    db: Session = Depends(get_db),
    workspace: Workspace = Depends(get_workspace),
) -> ExperimentOut:
    """Approve, start, pause, resume, complete or cancel an experiment.

    Every transition is validated and recorded in the experiment's decision
    history with the acting identity and timestamp.
    """
    company_repository.require_company(db, company_id, workspace.id)
    experiment = experiment_repository.change_status(db, experiment_id, company_id, data.status, data.note)
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
