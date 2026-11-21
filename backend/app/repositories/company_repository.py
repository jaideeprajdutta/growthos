"""Company repository — tenant-scoped company CRUD.

Every query filters by ``workspace_id`` so companies cannot be read or mutated
outside the workspace they belong to.
"""

from collections.abc import Sequence

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.core.exceptions import DuplicateError, NotFoundError
from app.models import (
    ActivityLogEntry,
    Company,
    CompanyIntelligenceProfile,
    CompanyProfile,
    DiagnosticFinding,
    DiagnosticRun,
    Evidence,
    Experiment,
    ExperimentResult,
    ExecutionAction,
    GrowthObjective,
    Integration,
    IntelligenceFinding,
    IntelligenceReport,
    Opportunity,
    OpportunityEvidence,
    ResearchPage,
    ResearchRun,
)
from app.schemas.companies import CompanyCreate, CompanyUpdate


def get_company(db: Session, company_id: str, workspace_id: str) -> Company | None:
    return db.execute(
        select(Company).where(Company.id == company_id, Company.workspace_id == workspace_id)
    ).scalar_one_or_none()


def require_company(db: Session, company_id: str, workspace_id: str) -> Company:
    company = get_company(db, company_id, workspace_id)
    if company is None:
        raise NotFoundError(f"Company {company_id} not found.")
    return company


def list_companies(db: Session, workspace_id: str) -> Sequence[Company]:
    return db.execute(
        select(Company).where(Company.workspace_id == workspace_id).order_by(Company.name)
    ).scalars().all()


def create_company(db: Session, workspace_id: str, data: CompanyCreate) -> Company:
    duplicate = db.execute(
        select(Company).where(Company.workspace_id == workspace_id, Company.name == data.name)
    ).scalar_one_or_none()
    if duplicate is not None:
        raise DuplicateError(f"A company named {data.name!r} already exists in this workspace.")
    company = Company(
        name=data.name,
        workspace_id=workspace_id,
        website=data.website or "",
        is_active=bool(data.isActive),
        business_model=data.businessModel or "other",
        industry=data.industry or "",
        business_stage=data.businessStage or "startup",
        revenue_model=data.revenueModel or "other",
        company_description=data.companyDescription or "",
        target_audience=data.targetAudience or "",
        main_product_or_service=data.mainProductOrService or "",
        primary_market=data.primaryMarket or "",
    )
    db.add(company)
    db.commit()
    db.refresh(company)
    return company


def update_company(db: Session, company_id: str, workspace_id: str, data: CompanyUpdate) -> Company:
    company = require_company(db, company_id, workspace_id)
    if data.name is not None:
        duplicate = db.execute(
            select(Company).where(Company.workspace_id == workspace_id, Company.name == data.name, Company.id != company_id)
        ).scalar_one_or_none()
        if duplicate is not None:
            raise DuplicateError(f"A company named {data.name!r} already exists in this workspace.")
        company.name = data.name
    if data.website is not None:
        company.website = data.website
    if data.isActive is not None:
        company.is_active = data.isActive
    if data.businessModel is not None:
        company.business_model = data.businessModel
    if data.industry is not None:
        company.industry = data.industry
    if data.businessStage is not None:
        company.business_stage = data.businessStage
    if data.revenueModel is not None:
        company.revenue_model = data.revenueModel
    if data.companyDescription is not None:
        company.company_description = data.companyDescription
    if data.targetAudience is not None:
        company.target_audience = data.targetAudience
    if data.mainProductOrService is not None:
        company.main_product_or_service = data.mainProductOrService
    if data.primaryMarket is not None:
        company.primary_market = data.primaryMarket
    db.commit()
    db.refresh(company)
    return company


def delete_company(db: Session, company_id: str, workspace_id: str) -> None:
    """Delete a company and every dependent record, in a single transaction.

    Deletion order follows the foreign-key graph: join rows first, then rows
    that reference diagnostic findings or research runs, then the parent rows.
    """
    company = require_company(db, company_id, workspace_id)
    opportunity_ids = select(Opportunity.id).where(Opportunity.company_id == company_id)
    db.execute(delete(OpportunityEvidence).where(OpportunityEvidence.opportunity_id.in_(opportunity_ids)))
    db.execute(delete(ExperimentResult).where(ExperimentResult.company_id == company_id))
    db.execute(delete(Experiment).where(Experiment.company_id == company_id))
    db.execute(delete(Opportunity).where(Opportunity.company_id == company_id))
    db.execute(delete(DiagnosticFinding).where(DiagnosticFinding.company_id == company_id))
    db.execute(delete(DiagnosticRun).where(DiagnosticRun.company_id == company_id))
    db.execute(delete(IntelligenceFinding).where(IntelligenceFinding.company_id == company_id))
    db.execute(delete(IntelligenceReport).where(IntelligenceReport.company_id == company_id))
    db.execute(delete(CompanyIntelligenceProfile).where(CompanyIntelligenceProfile.company_id == company_id))
    db.execute(delete(Evidence).where(Evidence.company_id == company_id))
    db.execute(delete(ResearchPage).where(ResearchPage.run_id.in_(select(ResearchRun.id).where(ResearchRun.company_id == company_id))))
    db.execute(delete(ResearchRun).where(ResearchRun.company_id == company_id))
    db.execute(delete(CompanyProfile).where(CompanyProfile.company_id == company_id))
    db.execute(delete(GrowthObjective).where(GrowthObjective.company_id == company_id))
    db.execute(delete(ExecutionAction).where(ExecutionAction.company_id == company_id))
    db.execute(delete(Integration).where(Integration.company_id == company_id))
    db.execute(delete(ActivityLogEntry).where(ActivityLogEntry.company_id == company_id))
    db.delete(company)
    db.commit()
