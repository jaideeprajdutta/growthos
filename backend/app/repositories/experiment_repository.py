"""Experiment repository — CRUD scoped by company."""

from collections.abc import Sequence

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundError
from app.models import Experiment
from app.schemas.experiments import ExperimentCreate, ExperimentUpdate


def create_experiment(db: Session, company_id: str, data: ExperimentCreate) -> Experiment:
    experiment = Experiment(
        company_id=company_id,
        hypothesis=data.hypothesis,
        problem=data.problem or "",
        action=data.action or "",
        target_audience=data.targetAudience or "",
        success_metric=data.successMetric or "",
        baseline=data.baseline or "",
        target=data.target or "",
        start_date=data.startDate,
        end_date=data.endDate,
        status=data.status,
        actual_outcome=None,
    )
    db.add(experiment)
    db.commit()
    db.refresh(experiment)
    return experiment


def list_experiments(db: Session, company_id: str) -> Sequence[Experiment]:
    return db.execute(
        select(Experiment)
        .where(Experiment.company_id == company_id)
        .order_by(Experiment.created_at.desc(), Experiment.id.desc())
    ).scalars().all()


def _get_scoped(db: Session, experiment_id: str, company_id: str) -> Experiment:
    experiment = db.execute(
        select(Experiment).where(Experiment.id == experiment_id, Experiment.company_id == company_id)
    ).scalar_one_or_none()
    if experiment is None:
        raise NotFoundError(f"Experiment {experiment_id} not found.")
    return experiment


def update_experiment(db: Session, experiment_id: str, company_id: str, data: ExperimentUpdate) -> Experiment:
    experiment = _get_scoped(db, experiment_id, company_id)
    if data.hypothesis is not None:
        experiment.hypothesis = data.hypothesis
    if data.problem is not None:
        experiment.problem = data.problem
    if data.action is not None:
        experiment.action = data.action
    if data.targetAudience is not None:
        experiment.target_audience = data.targetAudience
    if data.successMetric is not None:
        experiment.success_metric = data.successMetric
    if data.baseline is not None:
        experiment.baseline = data.baseline
    if data.target is not None:
        experiment.target = data.target
    if data.startDate is not None:
        experiment.start_date = data.startDate
    if data.endDate is not None:
        experiment.end_date = data.endDate
    if data.status is not None:
        experiment.status = data.status
    if data.actualOutcome is not None:
        experiment.actual_outcome = data.actualOutcome
    db.commit()
    db.refresh(experiment)
    return experiment


def delete_experiment(db: Session, experiment_id: str, company_id: str) -> None:
    experiment = _get_scoped(db, experiment_id, company_id)
    db.delete(experiment)
    db.commit()
