"""Company statistics schema — counts and summaries derived from real records."""

from pydantic import BaseModel

from app.schemas.common import LearningOutcome
from app.schemas.experiment_results import ExperimentResultOut


class ExperimentAnalyticsSummary(BaseModel):
    id: str
    name: str
    status: str
    opportunityId: str | None
    opportunityTitle: str | None
    learningOutcome: LearningOutcome | None
    latestMeasurement: ExperimentResultOut | None
    tasksTotal: int
    tasksCompleted: int
    tasksAwaitingApproval: int


class CompanyStatsOut(BaseModel):
    companyId: str
    opportunities: int
    runningExperiments: int
    objectives: int
    totalExperiments: int
    completedExperiments: int
    experimentsByStatus: dict[str, int]
    opportunitiesByStatus: dict[str, int]
    outcomesBySource: dict[str, int]
    tasksTotal: int
    tasksCompleted: int
    tasksInProgress: int
    tasksBlocked: int
    tasksAwaitingApproval: int
    measurementsRecorded: int
    successfulExperiments: int
    unsuccessfulExperiments: int
    inconclusiveExperiments: int
    experimentSummaries: list[ExperimentAnalyticsSummary]
