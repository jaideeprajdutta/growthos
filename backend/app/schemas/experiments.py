"""Experiment request and response schemas."""

from datetime import datetime

from pydantic import BaseModel, Field

from app.models.experiments import Experiment
from app.schemas.common import ExperimentStatus


class ExperimentCreate(BaseModel):
    hypothesis: str = Field(min_length=1, max_length=1000)
    problem: str | None = Field(default=None, max_length=2000)
    action: str | None = Field(default=None, max_length=2000)
    targetAudience: str | None = Field(default=None, max_length=2000)
    successMetric: str | None = Field(default=None, max_length=2000)
    baseline: str | None = Field(default=None, max_length=2000)
    target: str | None = Field(default=None, max_length=2000)
    startDate: datetime | None = None
    endDate: datetime | None = None
    status: ExperimentStatus = "proposed"


class ExperimentUpdate(BaseModel):
    hypothesis: str | None = Field(default=None, min_length=1, max_length=1000)
    problem: str | None = Field(default=None, max_length=2000)
    action: str | None = Field(default=None, max_length=2000)
    targetAudience: str | None = Field(default=None, max_length=2000)
    successMetric: str | None = Field(default=None, max_length=2000)
    baseline: str | None = Field(default=None, max_length=2000)
    target: str | None = Field(default=None, max_length=2000)
    startDate: datetime | None = None
    endDate: datetime | None = None
    status: ExperimentStatus | None = None
    actualOutcome: str | None = Field(default=None, max_length=2000)


class ExperimentOut(BaseModel):
    id: str
    companyId: str
    hypothesis: str
    problem: str
    action: str
    targetAudience: str
    successMetric: str
    baseline: str
    target: str
    startDate: datetime | None
    endDate: datetime | None
    status: ExperimentStatus
    actualOutcome: str | None
    createdAt: datetime
    updatedAt: datetime


def experiment_out(experiment: Experiment) -> ExperimentOut:
    return ExperimentOut(
        id=experiment.id,
        companyId=experiment.company_id,
        hypothesis=experiment.hypothesis,
        problem=experiment.problem,
        action=experiment.action,
        targetAudience=experiment.target_audience,
        successMetric=experiment.success_metric,
        baseline=experiment.baseline,
        target=experiment.target,
        startDate=experiment.start_date,
        endDate=experiment.end_date,
        status=experiment.status,
        actualOutcome=experiment.actual_outcome,
        createdAt=experiment.created_at,
        updatedAt=experiment.updated_at,
    )
