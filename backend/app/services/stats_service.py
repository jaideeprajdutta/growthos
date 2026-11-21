"""Company statistics service."""

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundError
from app.models import Company, Experiment, GrowthObjective, Opportunity
from app.schemas.stats import CompanyStatsOut


def get_company_stats(db: Session, company_id: str) -> CompanyStatsOut:
    """Count real records for a company: opportunities, running experiments, objectives."""
    if db.execute(select(Company).where(Company.id == company_id)).scalar_one_or_none() is None:
        raise NotFoundError(f"Company {company_id} not found.")
    opportunities = db.execute(
        select(func.count()).select_from(Opportunity).where(Opportunity.company_id == company_id)
    ).scalar_one()
    running_experiments = db.execute(
        select(func.count()).select_from(Experiment).where(
            Experiment.company_id == company_id, Experiment.status == "running"
        )
    ).scalar_one()
    objectives = db.execute(
        select(func.count()).select_from(GrowthObjective).where(GrowthObjective.company_id == company_id)
    ).scalar_one()
    return CompanyStatsOut(
        companyId=company_id,
        opportunities=opportunities,
        runningExperiments=running_experiments,
        objectives=objectives,
    )
