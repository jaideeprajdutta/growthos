"""Experiment result repository — structured, sourced measurements."""

from collections.abc import Sequence

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.constants import LOCAL_ACTOR
from app.core.exceptions import DomainValidationError, NotFoundError
from app.models import ExperimentResult
from app.repositories import evidence_repository, experiment_repository
from app.schemas.experiment_results import ExperimentResultCreate, ExperimentResultUpdate, MeasurementImport


def _validate_range(start, end) -> None:
    if start and end and end < start:
        raise DomainValidationError("Measurement end must be after the start.")


def _create_record(company_id: str, experiment_id: str, data: ExperimentResultCreate) -> ExperimentResult:
    return ExperimentResult(
        company_id=company_id,
        experiment_id=experiment_id,
        outcome=data.outcome,
        metrics_json=data.metrics,
        baseline_value=data.baselineValue,
        observed_value=data.observedValue,
        target_value=data.targetValue,
        direction=data.direction,
        measurement_start=data.measurementStart,
        measurement_end=data.measurementEnd,
        data_source=data.dataSource,
        source_name=data.sourceName or "",
        evidence_ids=data.evidenceIds,
        notes=data.notes or "",
        interpretation=data.interpretation or "",
        recorded_by=LOCAL_ACTOR,
    )


def create_experiment_result(
    db: Session, experiment_id: str, company_id: str, data: ExperimentResultCreate
) -> ExperimentResult:
    experiment_repository.require_experiment(db, experiment_id, company_id)
    evidence_repository.validate_evidence_ids(db, company_id, data.evidenceIds)
    _validate_range(data.measurementStart, data.measurementEnd)
    result = _create_record(company_id, experiment_id, data)
    db.add(result)
    db.commit()
    db.refresh(result)
    return result


def import_measurements(
    db: Session, experiment_id: str, company_id: str, data: MeasurementImport
) -> Sequence[ExperimentResult]:
    """Persist a previewed CSV import in one transaction."""
    experiment_repository.require_experiment(db, experiment_id, company_id)
    results = []
    for row in data.rows:
        _validate_range(row.measurementStart, row.measurementEnd)
        result = ExperimentResult(
            company_id=company_id,
            experiment_id=experiment_id,
            outcome=f"Imported measurement from {data.sourceName}.",
            metrics_json=None,
            baseline_value=row.baselineValue,
            observed_value=row.observedValue,
            target_value=row.targetValue,
            direction=row.direction,
            measurement_start=row.measurementStart,
            measurement_end=row.measurementEnd,
            data_source="imported",
            source_name=data.sourceName,
            evidence_ids=[],
            notes=row.notes or "",
            interpretation="",
            recorded_by=LOCAL_ACTOR,
        )
        db.add(result)
        results.append(result)
    db.commit()
    for result in results:
        db.refresh(result)
    return results


def list_experiment_results(db: Session, experiment_id: str, company_id: str) -> Sequence[ExperimentResult]:
    return db.execute(
        select(ExperimentResult)
        .where(ExperimentResult.experiment_id == experiment_id, ExperimentResult.company_id == company_id)
        .order_by(ExperimentResult.recorded_at.desc(), ExperimentResult.id.desc())
    ).scalars().all()


def latest_experiment_result(db: Session, experiment_id: str, company_id: str) -> ExperimentResult | None:
    return db.execute(
        select(ExperimentResult)
        .where(ExperimentResult.experiment_id == experiment_id, ExperimentResult.company_id == company_id)
        .order_by(ExperimentResult.recorded_at.desc(), ExperimentResult.id.desc())
        .limit(1)
    ).scalar_one_or_none()


def _get_scoped(db: Session, result_id: str, experiment_id: str, company_id: str) -> ExperimentResult:
    result = db.execute(
        select(ExperimentResult).where(
            ExperimentResult.id == result_id,
            ExperimentResult.experiment_id == experiment_id,
            ExperimentResult.company_id == company_id,
        )
    ).scalar_one_or_none()
    if result is None:
        raise NotFoundError(f"Experiment result {result_id} not found.")
    return result


def update_experiment_result(
    db: Session, result_id: str, experiment_id: str, company_id: str, data: ExperimentResultUpdate
) -> ExperimentResult:
    result = _get_scoped(db, result_id, experiment_id, company_id)
    if data.evidenceIds is not None:
        evidence_repository.validate_evidence_ids(db, company_id, data.evidenceIds)
    _validate_range(
        data.measurementStart or result.measurement_start,
        data.measurementEnd or result.measurement_end,
    )
    for field, value in (
        ("outcome", data.outcome),
        ("metrics_json", data.metrics),
        ("baseline_value", data.baselineValue),
        ("observed_value", data.observedValue),
        ("target_value", data.targetValue),
        ("direction", data.direction),
        ("measurement_start", data.measurementStart),
        ("measurement_end", data.measurementEnd),
        ("data_source", data.dataSource),
        ("source_name", data.sourceName),
        ("evidence_ids", data.evidenceIds),
        ("notes", data.notes),
        ("interpretation", data.interpretation),
    ):
        if value is not None:
            setattr(result, field, value)
    db.commit()
    db.refresh(result)
    return result


def delete_experiment_result(db: Session, result_id: str, experiment_id: str, company_id: str) -> None:
    result = _get_scoped(db, result_id, experiment_id, company_id)
    db.delete(result)
    db.commit()
