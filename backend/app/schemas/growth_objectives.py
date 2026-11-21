"""Growth objective request and response schemas."""

from datetime import datetime

from pydantic import BaseModel, Field

from app.models.growth_objectives import GrowthObjective
from app.schemas.common import GrowthObjectiveType


class GrowthObjectiveCreate(BaseModel):
    objectiveType: GrowthObjectiveType
    customObjective: str | None = Field(default=None, max_length=500)
    isPrimary: bool = False


class GrowthObjectiveUpdate(BaseModel):
    objectiveType: GrowthObjectiveType | None = None
    customObjective: str | None = Field(default=None, max_length=500)
    isPrimary: bool | None = None


class GrowthObjectiveOut(BaseModel):
    id: str
    companyId: str
    objectiveType: GrowthObjectiveType
    customObjective: str
    isPrimary: bool
    createdAt: datetime
    updatedAt: datetime


def objective_out(objective: GrowthObjective) -> GrowthObjectiveOut:
    return GrowthObjectiveOut(
        id=objective.id,
        companyId=objective.company_id,
        objectiveType=objective.objective_type,
        customObjective=objective.custom_objective,
        isPrimary=objective.is_primary,
        createdAt=objective.created_at,
        updatedAt=objective.updated_at,
    )
