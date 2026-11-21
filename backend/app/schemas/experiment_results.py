"""Experiment result/measurement request and response schemas."""

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field, model_validator

from app.models.experiment_results import ExperimentResult
from app.schemas.common import MeasurementDataSource, MeasurementDirection


def calculate_result(baseline: float | None, observed: float | None, target: float | None, direction: str) -> dict:
    """Derive change and attainment from recorded numbers only.

    ``direction`` says whether a higher or lower value is an improvement, so the
    attainment calculation stays correct for metrics such as churn or latency.
    Nothing is inferred when the required inputs are absent.
    """
    absolute_change = None if baseline is None or observed is None else observed - baseline
    percent_change = None
    if absolute_change is not None and baseline not in (None, 0):
        percent_change = absolute_change / abs(baseline) * 100

    attainment = None
    met_target = None
    if baseline is not None and observed is not None and target is not None:
        improvement = baseline - observed if direction == "decrease" else observed - baseline
        required = baseline - target if direction == "decrease" else target - baseline
        if required != 0:
            attainment = improvement / required * 100
            met_target = attainment >= 100
    return {
        "absoluteChange": absolute_change,
        "percentChange": percent_change,
        "targetAttainmentPct": attainment,
        "metTarget": met_target,
    }


class MeasurementRow(BaseModel):
    """One validated measurement row (used for both entry and CSV import)."""

    baselineValue: float
    observedValue: float
    targetValue: float
    direction: MeasurementDirection = "increase"
    measurementStart: datetime | None = None
    measurementEnd: datetime | None = None
    sourceName: str = Field(default="", max_length=200)
    notes: str = Field(default="", max_length=2000)


class ExperimentResultCreate(BaseModel):
    # Kept optional for structured measurements; a free-text outcome alone is
    # still valid for legacy clients. At least one form of data is required.
    outcome: str = Field(default="", max_length=2000)
    metrics: dict[str, Any] | None = None
    baselineValue: float | None = None
    observedValue: float | None = None
    targetValue: float | None = None
    direction: MeasurementDirection = "increase"
    measurementStart: datetime | None = None
    measurementEnd: datetime | None = None
    dataSource: MeasurementDataSource = "user_entered"
    sourceName: str = Field(default="", max_length=200)
    evidenceIds: list[str] = Field(default_factory=list, max_length=50)
    notes: str = Field(default="", max_length=2000)
    interpretation: str = Field(default="", max_length=4000)

    @model_validator(mode="after")
    def has_data(self):
        if not self.outcome.strip() and self.observedValue is None and not self.metrics:
            raise ValueError("Provide an observed value, an outcome, or metrics.")
        if self.measurementStart and self.measurementEnd and self.measurementEnd < self.measurementStart:
            raise ValueError("Measurement end must be after the start.")
        return self


class ExperimentResultUpdate(BaseModel):
    outcome: str | None = Field(default=None, max_length=2000)
    metrics: dict[str, Any] | None = None
    baselineValue: float | None = None
    observedValue: float | None = None
    targetValue: float | None = None
    direction: MeasurementDirection | None = None
    measurementStart: datetime | None = None
    measurementEnd: datetime | None = None
    dataSource: MeasurementDataSource | None = None
    sourceName: str | None = Field(default=None, max_length=200)
    evidenceIds: list[str] | None = Field(default=None, max_length=50)
    notes: str | None = Field(default=None, max_length=2000)
    interpretation: str | None = Field(default=None, max_length=4000)


class MeasurementImport(BaseModel):
    rows: list[MeasurementRow] = Field(min_length=1, max_length=200)
    sourceName: str = Field(default="CSV import", max_length=200)


class CsvPreviewRequest(BaseModel):
    csv: str = Field(min_length=1, max_length=1_000_000)


class CsvPreviewOut(BaseModel):
    headers: list[str]
    rows: list[dict]
    errors: list[str]


class ExperimentResultOut(BaseModel):
    id: str
    companyId: str
    experimentId: str
    outcome: str
    metrics: dict[str, Any] | None
    baselineValue: float | None
    observedValue: float | None
    targetValue: float | None
    direction: MeasurementDirection
    measurementStart: datetime | None
    measurementEnd: datetime | None
    dataSource: MeasurementDataSource
    sourceName: str
    evidenceIds: list[str]
    notes: str
    interpretation: str
    recordedBy: str
    recordedAt: datetime
    createdAt: datetime
    updatedAt: datetime
    absoluteChange: float | None
    percentChange: float | None
    targetAttainmentPct: float | None
    metTarget: bool | None


def experiment_result_out(result: ExperimentResult) -> ExperimentResultOut:
    derived = calculate_result(
        result.baseline_value, result.observed_value, result.target_value, result.direction or "increase"
    )
    return ExperimentResultOut(
        id=result.id,
        companyId=result.company_id,
        experimentId=result.experiment_id,
        outcome=result.outcome or "",
        metrics=result.metrics_json,
        baselineValue=result.baseline_value,
        observedValue=result.observed_value,
        targetValue=result.target_value,
        direction=result.direction or "increase",
        measurementStart=result.measurement_start,
        measurementEnd=result.measurement_end,
        dataSource=result.data_source or "user_entered",
        sourceName=result.source_name or "",
        evidenceIds=result.evidence_ids or [],
        notes=result.notes or "",
        interpretation=result.interpretation or "",
        recordedBy=result.recorded_by or "Local User",
        recordedAt=result.recorded_at,
        createdAt=result.created_at,
        updatedAt=result.updated_at,
        **derived,
    )
