"""Company understanding service — returns the structured profile for a company."""

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import CompanyIntelligenceProfile


def get_company_understanding(db: Session, company_id: str) -> CompanyIntelligenceProfile | None:
    """Return the company's intelligence profile, or ``None`` if never generated."""
    return db.execute(
        select(CompanyIntelligenceProfile).where(CompanyIntelligenceProfile.company_id == company_id)
    ).scalars().first()
