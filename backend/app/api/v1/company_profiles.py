"""Company profile routes: read, create, update."""

from typing import Optional

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.v1.dependencies import get_workspace
from app.db.session import get_db
from app.models.workspaces import Workspace
from app.repositories import company_profile_repository, company_repository
from app.schemas.company_profiles import CompanyProfileCreate, CompanyProfileOut, company_profile_out

router = APIRouter(tags=["company-profiles"])


@router.get("/companies/{company_id}/profile", response_model=Optional[CompanyProfileOut])
def get_company_profile(
    company_id: str,
    db: Session = Depends(get_db),
    workspace: Workspace = Depends(get_workspace),
) -> Optional[CompanyProfileOut]:
    company_repository.require_company(db, company_id, workspace.id)
    profile = company_profile_repository.get_profile(db, company_id, workspace.id)
    return company_profile_out(profile) if profile is not None else None


@router.post("/companies/{company_id}/profile", response_model=CompanyProfileOut, status_code=201)
def create_company_profile(
    company_id: str,
    data: CompanyProfileCreate,
    db: Session = Depends(get_db),
    workspace: Workspace = Depends(get_workspace),
) -> CompanyProfileOut:
    company_repository.require_company(db, company_id, workspace.id)
    profile = company_profile_repository.upsert_profile(db, company_id, data)
    return company_profile_out(profile)


@router.put("/companies/{company_id}/profile", response_model=CompanyProfileOut)
def update_company_profile(
    company_id: str,
    data: CompanyProfileCreate,
    db: Session = Depends(get_db),
    workspace: Workspace = Depends(get_workspace),
) -> CompanyProfileOut:
    company_repository.require_company(db, company_id, workspace.id)
    profile = company_profile_repository.upsert_profile(db, company_id, data)
    return company_profile_out(profile)
