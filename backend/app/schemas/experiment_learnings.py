"""Structured outcome-review schemas."""

from datetime import datetime

from pydantic import BaseModel, Field

from app.models.experiment_learnings import ExperimentLearning
from app.schemas.common import LearningOutcome


class LearningCreate(BaseModel):
    outcome: LearningOutcome
    metTarget: bool | None = None
    whatChanged: str = Field(default="", max_length=4000)
    evidenceIds: list[str] = Field(default_factory=list, max_length=50)
    whatWorked: str = Field(default="", max_length=4000)
    whatFailed: str = Field(default="", max_length=4000)
    nextSteps: str = Field(default="", max_length=4000)


class LearningUpdate(BaseModel):
    outcome: LearningOutcome | None = None
    metTarget: bool | None = None
    whatChanged: str | None = Field(default=None, max_length=4000)
    evidenceIds: list[str] | None = Field(default=None, max_length=50)
    whatWorked: str | None = Field(default=None, max_length=4000)
    whatFailed: str | None = Field(default=None, max_length=4000)
    nextSteps: str | None = Field(default=None, max_length=4000)


class LearningOut(BaseModel):
    id: str
    companyId: str
    experimentId: str
    outcome: LearningOutcome
    metTarget: bool | None
    whatChanged: str
    evidenceIds: list[str]
    whatWorked: str
    whatFailed: str
    nextSteps: str
    recordedBy: str
    createdAt: datetime
    updatedAt: datetime


def learning_out(learning: ExperimentLearning) -> LearningOut:
    return LearningOut(
        id=learning.id,
        companyId=learning.company_id,
        experimentId=learning.experiment_id,
        outcome=learning.outcome,
        metTarget=learning.met_target,
        whatChanged=learning.what_changed or "",
        evidenceIds=learning.evidence_ids or [],
        whatWorked=learning.what_worked or "",
        whatFailed=learning.what_failed or "",
        nextSteps=learning.next_steps or "",
        recordedBy=learning.recorded_by or "Local User",
        createdAt=learning.created_at,
        updatedAt=learning.updated_at,
    )
