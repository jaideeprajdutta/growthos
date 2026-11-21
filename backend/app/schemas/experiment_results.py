"""Experiment result request and response schemas."""

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field

from app.models.experiment_results import ExperimentResult


class ExperimentResultCreate(BaseModel):
    outcome: str = Field(min_length=1, max_length=2000)
    metrics: dict[str, Any] | None = None


class ExperimentResultUpdate(BaseModel):
    outcome: str | None = Field(default=None, max_length=2000)
    metrics: dict[str, Any] | None = None


class ExperimentResultOut(BaseModel):
    id: str
    companyId: str
    experimentId: str
    outcome: str
    metrics: dict[str, Any] | None
    recordedAt: datetime
    createdAt: datetime
    updatedAt: datetime


def experiment_result_out(result: ExperimentResult) -> ExperimentResultOut:
    return ExperimentResultOut(
        id=result.id,
        companyId=result.company_id,
        experimentId=result.experiment_id,
        outcome=result.outcome,
        metrics=result.metrics_json,
        recordedAt=result.recorded_at,
        createdAt=result.created_at,
        updatedAt=result.updated_at,
    )
