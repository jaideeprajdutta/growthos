"""Company profile request and response schemas."""

from datetime import datetime

from pydantic import BaseModel, Field

from app.models.company_profiles import CompanyProfile


class CompanyProfileCreate(BaseModel):
    positioningStatement: str | None = Field(default=None, max_length=2000)
    competitiveLandscape: str | None = Field(default=None, max_length=2000)
    marketContext: str | None = Field(default=None, max_length=2000)
    productDescription: str | None = Field(default=None, max_length=2000)


class CompanyProfileOut(BaseModel):
    id: str
    companyId: str
    positioningStatement: str
    competitiveLandscape: str
    marketContext: str
    productDescription: str
    createdAt: datetime
    updatedAt: datetime


def company_profile_out(profile: CompanyProfile) -> CompanyProfileOut:
    return CompanyProfileOut(
        id=profile.id,
        companyId=profile.company_id,
        positioningStatement=profile.positioning_statement,
        competitiveLandscape=profile.competitive_landscape,
        marketContext=profile.market_context,
        productDescription=profile.product_description,
        createdAt=profile.created_at,
        updatedAt=profile.updated_at,
    )
