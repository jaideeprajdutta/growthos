"""Company request and response schemas."""

from datetime import datetime

from pydantic import BaseModel, Field

from app.models.companies import Company
from app.schemas.common import CompanyBusinessModel, CompanyStage, RevenueModel


class CompanyCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    website: str | None = Field(default=None, max_length=512)
    businessModel: CompanyBusinessModel | None = None
    industry: str | None = Field(default=None, max_length=200)
    businessStage: CompanyStage | None = None
    revenueModel: RevenueModel | None = None
    companyDescription: str | None = Field(default=None, max_length=2000)
    targetAudience: str | None = Field(default=None, max_length=2000)
    mainProductOrService: str | None = Field(default=None, max_length=2000)
    primaryMarket: str | None = Field(default=None, max_length=2000)


class CompanyUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    website: str | None = Field(default=None, max_length=512)
    businessModel: CompanyBusinessModel | None = None
    industry: str | None = Field(default=None, max_length=200)
    businessStage: CompanyStage | None = None
    revenueModel: RevenueModel | None = None
    companyDescription: str | None = Field(default=None, max_length=2000)
    targetAudience: str | None = Field(default=None, max_length=2000)
    mainProductOrService: str | None = Field(default=None, max_length=2000)
    primaryMarket: str | None = Field(default=None, max_length=2000)


class CompanyOut(BaseModel):
    id: str
    name: str
    website: str
    isActive: bool
    businessModel: CompanyBusinessModel
    industry: str
    businessStage: CompanyStage
    revenueModel: RevenueModel
    companyDescription: str
    targetAudience: str
    mainProductOrService: str
    primaryMarket: str
    createdAt: datetime
    updatedAt: datetime


def company_out(company: Company) -> CompanyOut:
    return CompanyOut(
        id=company.id,
        name=company.name,
        website=company.website,
        isActive=company.is_active,
        businessModel=company.business_model,
        industry=company.industry,
        businessStage=company.business_stage,
        revenueModel=company.revenue_model,
        companyDescription=company.company_description,
        targetAudience=company.target_audience,
        mainProductOrService=company.main_product_or_service,
        primaryMarket=company.primary_market,
        createdAt=company.created_at,
        updatedAt=company.updated_at,
    )
