"""Opportunity request and response schemas."""

from datetime import datetime

from pydantic import BaseModel, Field

from app.models.opportunities import Opportunity
from app.schemas.common import OpportunityStatus


class OpportunityCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    description: str | None = Field(default=None, max_length=2000)
    supportingEvidence: str | None = Field(default=None, max_length=2000)
    expectedImpact: str | None = Field(default=None, max_length=2000)
    confidence: int = Field(default=50, ge=0, le=100)
    effort: int = Field(default=5, ge=1, le=10)
    risk: str | None = Field(default=None, max_length=2000)
    priorityScore: int | None = Field(default=None, ge=0, le=100)
    status: OpportunityStatus = "proposed"
    recommendedNextAction: str | None = Field(default=None, max_length=2000)


class OpportunityUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = Field(default=None, max_length=2000)
    supportingEvidence: str | None = Field(default=None, max_length=2000)
    expectedImpact: str | None = Field(default=None, max_length=2000)
    confidence: int | None = Field(default=None, ge=0, le=100)
    effort: int | None = Field(default=None, ge=1, le=10)
    risk: str | None = Field(default=None, max_length=2000)
    priorityScore: int | None = Field(default=None, ge=0, le=100)
    status: OpportunityStatus | None = None
    recommendedNextAction: str | None = Field(default=None, max_length=2000)


class OpportunityOut(BaseModel):
    id: str
    companyId: str
    title: str
    description: str
    supportingEvidence: str
    expectedImpact: str
    confidence: int
    effort: int
    risk: str
    priorityScore: int | None
    status: OpportunityStatus
    recommendedNextAction: str
    createdAt: datetime
    updatedAt: datetime


def opportunity_out(opportunity: Opportunity) -> OpportunityOut:
    return OpportunityOut(
        id=opportunity.id,
        companyId=opportunity.company_id,
        title=opportunity.title,
        description=opportunity.description,
        supportingEvidence=opportunity.supporting_evidence,
        expectedImpact=opportunity.expected_impact,
        confidence=opportunity.confidence,
        effort=opportunity.effort,
        risk=opportunity.risk,
        priorityScore=opportunity.priority_score,
        status=opportunity.status,
        recommendedNextAction=opportunity.recommended_next_action,
        createdAt=opportunity.created_at,
        updatedAt=opportunity.updated_at,
    )
