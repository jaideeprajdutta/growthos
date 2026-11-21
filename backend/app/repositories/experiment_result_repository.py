"""Experiment result repository."""

from collections.abc import Sequence

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundError
from app.models import ExperimentResult
from app.schemas.experiment_results import ExperimentResultCreate, ExperimentResultUpdate


def create_experiment_result(db: Session, experiment_id: str, company_id: str, data: ExperimentResultCreate) -> ExperimentResult:
    result = ExperimentResult(
        company_id=company_id,
        experiment_id=experiment_id,
        outcome=data.outcome,
        metrics_json=data.metrics,
    )
    db.add(result)
    db.commit()
    db.refresh(result)
    return result


def list_experiment_results(db: Session, experiment_id: str, company_id: str) -> Sequence[ExperimentResult]:
    return db.execute(
        select(ExperimentResult)
        .where(ExperimentResult.experiment_id == experiment_id, ExperimentResult.company_id == company_id)
        .order_by(ExperimentResult.recorded_at.desc(), ExperimentResult.id.desc())
    ).scalars().all()


def _get_scoped(db: Session, result_id: str, experiment_id: str, company_id: str) -> ExperimentResult:
    result = db.execute(
        select(ExperimentResult)
        .where(
            ExperimentResult.id == result_id,
            ExperimentResult.experiment_id == experiment_id,
            ExperimentResult.company_id == company_id,
        )
    ).scalar_one_or_none()
    if result is None:
        raise NotFoundError(f"Experiment result {result_id} not found.")
    return result


def update_experiment_result(db: Session, result_id: str, experiment_id: str, company_id: str, data: ExperimentResultUpdate) -> ExperimentResult:
    result = _get_scoped(db, result_id, experiment_id, company_id)
    if data.outcome is not None:
        result.outcome = data.outcome
    if data.metrics is not None:
        result.metrics_json = data.metrics
    db.commit()
    db.refresh(result)
    return result


def delete_experiment_result(db: Session, result_id: str, experiment_id: str, company_id: str) -> None:
    result = _get_scoped(db, result_id, experiment_id, company_id)
    db.delete(result)
    db.commit()
