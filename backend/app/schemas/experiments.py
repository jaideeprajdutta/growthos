"""Experiment request and response schemas."""

from datetime import datetime

from pydantic import BaseModel, Field

from app.models.experiments import Experiment
from app.schemas.common import ExperimentStatus
from app.schemas.experiment_learnings import LearningOut
from app.schemas.experiment_results import ExperimentResultOut
from app.schemas.experiment_tasks import TaskOut


class ExperimentCreate(BaseModel):
    name: str | None = Field(default=None, max_length=200)
    description: str | None = Field(default=None, max_length=4000)
    hypothesis: str = Field(min_length=1, max_length=1000)
    problem: str | None = Field(default=None, max_length=2000)
    action: str | None = Field(default=None, max_length=2000)
    targetAudience: str | None = Field(default=None, max_length=2000)
    successMetric: str | None = Field(default=None, max_length=2000)
    baseline: str | None = Field(default=None, max_length=2000)
    target: str | None = Field(default=None, max_length=2000)
    guardrailMetrics: list[str] = Field(default_factory=list, max_length=20)
    startDate: datetime | None = None
    endDate: datetime | None = None
    owner: str | None = Field(default=None, max_length=200)
    status: ExperimentStatus = "proposed"
    opportunityId: str | None = Field(default=None, max_length=36)
    diagnosticFindingId: str | None = Field(default=None, max_length=36)


class ExperimentUpdate(BaseModel):
    name: str | None = Field(default=None, max_length=200)
    description: str | None = Field(default=None, max_length=4000)
    hypothesis: str | None = Field(default=None, min_length=1, max_length=1000)
    problem: str | None = Field(default=None, max_length=2000)
    action: str | None = Field(default=None, max_length=2000)
    targetAudience: str | None = Field(default=None, max_length=2000)
    successMetric: str | None = Field(default=None, max_length=2000)
    baseline: str | None = Field(default=None, max_length=2000)
    target: str | None = Field(default=None, max_length=2000)
    guardrailMetrics: list[str] | None = Field(default=None, max_length=20)
    startDate: datetime | None = None
    endDate: datetime | None = None
    owner: str | None = Field(default=None, max_length=200)
    status: ExperimentStatus | None = None
    opportunityId: str | None = Field(default=None, max_length=36)
    diagnosticFindingId: str | None = Field(default=None, max_length=36)
    actualOutcome: str | None = Field(default=None, max_length=2000)


class ExperimentStatusUpdate(BaseModel):
    status: ExperimentStatus
    note: str | None = Field(default=None, max_length=2000)


class ExperimentOut(BaseModel):
    id: str
    companyId: str
    opportunityId: str | None
    diagnosticFindingId: str | None
    name: str
    description: str
    hypothesis: str
    problem: str
    action: str
    targetAudience: str
    successMetric: str
    baseline: str
    target: str
    guardrailMetrics: list[str]
    startDate: datetime | None
    endDate: datetime | None
    owner: str
    status: ExperimentStatus
    decisionHistory: list[dict]
    approvedAt: datetime | None
    approvedBy: str | None
    completedAt: datetime | None
    outcome: str | None
    actualOutcome: str | None
    createdAt: datetime
    updatedAt: datetime


class ExperimentDetailOut(BaseModel):
    """Everything needed to run one experiment, without extra page requests."""

    experiment: ExperimentOut
    tasks: list[TaskOut]
    results: list[ExperimentResultOut]
    learning: LearningOut | None


def experiment_out(experiment: Experiment) -> ExperimentOut:
    return ExperimentOut(
        id=experiment.id,
        companyId=experiment.company_id,
        opportunityId=experiment.opportunity_id,
        diagnosticFindingId=experiment.diagnostic_finding_id,
        name=experiment.name or experiment.hypothesis[:200],
        description=experiment.description or "",
        hypothesis=experiment.hypothesis,
        problem=experiment.problem or "",
        action=experiment.action or "",
        targetAudience=experiment.target_audience or "",
        successMetric=experiment.success_metric or "",
        baseline=experiment.baseline or "",
        target=experiment.target or "",
        guardrailMetrics=experiment.guardrail_metrics or [],
        startDate=experiment.start_date,
        endDate=experiment.end_date,
        owner=experiment.owner or "",
        status=experiment.status,
        decisionHistory=experiment.decision_history or [],
        approvedAt=experiment.approved_at,
        approvedBy=experiment.approved_by,
        completedAt=experiment.completed_at,
        outcome=experiment.outcome,
        actualOutcome=experiment.actual_outcome,
        createdAt=experiment.created_at,
        updatedAt=experiment.updated_at,
    )
