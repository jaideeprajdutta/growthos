"""Experiment repository — CRUD, validated lifecycle and company scoping."""

from collections.abc import Sequence
from datetime import datetime

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.core.constants import LOCAL_ACTOR
from app.core.exceptions import DomainValidationError, NotFoundError
from app.models import (
    DiagnosticFinding,
    Experiment,
    ExperimentLearning,
    ExperimentResult,
    ExperimentTask,
    Opportunity,
)
from app.models.base import utc_now
from app.schemas.experiments import ExperimentCreate, ExperimentUpdate

ALLOWED_TRANSITIONS: dict[str, set[str]] = {
    "proposed": {"approved", "cancelled"},
    "approved": {"running", "paused", "cancelled"},
    "running": {"paused", "completed", "cancelled"},
    "paused": {"running", "cancelled"},
    "completed": set(),
    "cancelled": set(),
}


def validate_status_transition(current: str, target: str) -> None:
    if current == target:
        return
    allowed = ALLOWED_TRANSITIONS.get(current, set())
    if target not in allowed:
        raise DomainValidationError(
            f"Cannot change an experiment from {current} to {target}. "
            f"Allowed next statuses: {', '.join(sorted(allowed)) or 'none'}."
        )


def _history_entry(previous: str | None, target: str, note: str, at: datetime) -> dict:
    return {
        "from": previous,
        "to": target,
        "status": target,
        "actor": LOCAL_ACTOR,
        "at": at.isoformat(),
        "note": note,
    }


def _validate_dates(start: datetime | None, end: datetime | None) -> None:
    if start and end and end < start:
        raise DomainValidationError("Experiment end date must be after the start date.")


def _validate_links(
    db: Session,
    company_id: str,
    opportunity_id: str | None,
    diagnostic_finding_id: str | None,
) -> None:
    if opportunity_id and db.execute(
        select(Opportunity.id).where(Opportunity.id == opportunity_id, Opportunity.company_id == company_id)
    ).scalar_one_or_none() is None:
        raise DomainValidationError("The linked opportunity does not exist for this company.")
    if diagnostic_finding_id and db.execute(
        select(DiagnosticFinding.id).where(
            DiagnosticFinding.id == diagnostic_finding_id, DiagnosticFinding.company_id == company_id
        )
    ).scalar_one_or_none() is None:
        raise DomainValidationError("The linked diagnostic finding does not exist for this company.")


def _apply_status(experiment: Experiment, target: str, note: str, at: datetime) -> None:
    previous = experiment.status
    validate_status_transition(previous, target)
    experiment.status = target
    if target == "approved" and previous != "approved":
        experiment.approved_at = at
        experiment.approved_by = LOCAL_ACTOR
    if target == "running" and previous != "running" and experiment.start_date is None:
        experiment.start_date = at
    if target == "completed" and previous != "completed":
        experiment.completed_at = at
    history = list(experiment.decision_history or [])
    history.append(_history_entry(previous, target, note, at))
    experiment.decision_history = history


def create_experiment(db: Session, company_id: str, data: ExperimentCreate) -> Experiment:
    _validate_links(db, company_id, data.opportunityId, data.diagnosticFindingId)
    _validate_dates(data.startDate, data.endDate)
    now = utc_now()
    experiment = Experiment(
        company_id=company_id,
        name=(data.name or "").strip() or data.hypothesis[:200],
        description=data.description or "",
        hypothesis=data.hypothesis,
        problem=data.problem or "",
        action=data.action or "",
        target_audience=data.targetAudience or "",
        success_metric=data.successMetric or "",
        baseline=data.baseline or "",
        target=data.target or "",
        guardrail_metrics=data.guardrailMetrics,
        start_date=data.startDate,
        end_date=data.endDate,
        owner=data.owner or "",
        status=data.status,
        opportunity_id=data.opportunityId,
        diagnostic_finding_id=data.diagnosticFindingId,
        decision_history=[_history_entry(None, data.status, "Experiment created.", now)],
        actual_outcome=None,
    )
    if data.status == "approved":
        experiment.approved_at = now
        experiment.approved_by = LOCAL_ACTOR
    if data.status == "completed":
        experiment.completed_at = now
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


def list_experiments_by_opportunity(db: Session, opportunity_id: str) -> Sequence[Experiment]:
    """List experiments linked to an opportunity, newest first."""
    return db.execute(
        select(Experiment)
        .where(Experiment.opportunity_id == opportunity_id)
        .order_by(Experiment.created_at.desc(), Experiment.id.desc())
    ).scalars().all()


def get_experiment(db: Session, experiment_id: str, company_id: str) -> Experiment | None:
    return db.execute(
        select(Experiment).where(Experiment.id == experiment_id, Experiment.company_id == company_id)
    ).scalar_one_or_none()


def require_experiment(db: Session, experiment_id: str, company_id: str) -> Experiment:
    experiment = get_experiment(db, experiment_id, company_id)
    if experiment is None:
        raise NotFoundError(f"Experiment {experiment_id} not found.")
    return experiment


def _get_scoped(db: Session, experiment_id: str, company_id: str) -> Experiment:
    return require_experiment(db, experiment_id, company_id)


def change_status(
    db: Session,
    experiment_id: str,
    company_id: str,
    target: str,
    note: str | None = None,
) -> Experiment:
    experiment = require_experiment(db, experiment_id, company_id)
    _apply_status(experiment, target, (note or "").strip(), utc_now())
    db.commit()
    db.refresh(experiment)
    return experiment


def update_experiment(db: Session, experiment_id: str, company_id: str, data: ExperimentUpdate) -> Experiment:
    experiment = require_experiment(db, experiment_id, company_id)
    if data.opportunityId is not None or data.diagnosticFindingId is not None:
        _validate_links(
            db,
            company_id,
            data.opportunityId if data.opportunityId is not None else experiment.opportunity_id,
            data.diagnosticFindingId if data.diagnosticFindingId is not None else experiment.diagnostic_finding_id,
        )
    _validate_dates(data.startDate or experiment.start_date, data.endDate or experiment.end_date)

    for field, value in (
        ("name", data.name),
        ("description", data.description),
        ("hypothesis", data.hypothesis),
        ("problem", data.problem),
        ("action", data.action),
        ("target_audience", data.targetAudience),
        ("success_metric", data.successMetric),
        ("baseline", data.baseline),
        ("target", data.target),
        ("guardrail_metrics", data.guardrailMetrics),
        ("start_date", data.startDate),
        ("end_date", data.endDate),
        ("owner", data.owner),
        ("opportunity_id", data.opportunityId),
        ("diagnostic_finding_id", data.diagnosticFindingId),
        ("actual_outcome", data.actualOutcome),
    ):
        if value is not None:
            setattr(experiment, field, value)
    if data.status is not None:
        _apply_status(experiment, data.status, "Status changed during edit.", utc_now())
    db.commit()
    db.refresh(experiment)
    return experiment


def delete_experiment(db: Session, experiment_id: str, company_id: str) -> None:
    experiment = require_experiment(db, experiment_id, company_id)
    db.execute(delete(ExperimentLearning).where(ExperimentLearning.experiment_id == experiment.id))
    db.execute(delete(ExperimentResult).where(ExperimentResult.experiment_id == experiment.id))
    db.execute(delete(ExperimentTask).where(ExperimentTask.experiment_id == experiment.id))
    db.delete(experiment)
    db.commit()
