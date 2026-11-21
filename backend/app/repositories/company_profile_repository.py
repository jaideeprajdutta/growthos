"""Company profile repository — upsert company profiles (business-intelligence context)."""

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Company, CompanyProfile
from app.schemas.company_profiles import CompanyProfileCreate


def get_profile(db: Session, company_id: str, workspace_id: str) -> CompanyProfile | None:
    return db.execute(
        select(CompanyProfile)
        .join(Company, Company.id == CompanyProfile.company_id)
        .where(CompanyProfile.company_id == company_id, Company.workspace_id == workspace_id)
    ).scalar_one_or_none()


def upsert_profile(db: Session, company_id: str, data: CompanyProfileCreate) -> CompanyProfile:
    profile = db.execute(
        select(CompanyProfile).where(CompanyProfile.company_id == company_id)
    ).scalar_one_or_none()
    if profile is None:
        profile = CompanyProfile(
            company_id=company_id,
            positioning_statement=data.positioningStatement or "",
            competitive_landscape=data.competitiveLandscape or "",
            market_context=data.marketContext or "",
            product_description=data.productDescription or "",
        )
        db.add(profile)
    else:
        if data.positioningStatement is not None:
            profile.positioning_statement = data.positioningStatement
        if data.competitiveLandscape is not None:
            profile.competitive_landscape = data.competitiveLandscape
        if data.marketContext is not None:
            profile.market_context = data.marketContext
        if data.productDescription is not None:
            profile.product_description = data.productDescription
    db.commit()
    db.refresh(profile)
    return profile
