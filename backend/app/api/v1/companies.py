"""Company routes: create, list, retrieve, update, delete, stats."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.v1.dependencies import get_workspace
from app.db.session import get_db
from app.models.workspaces import Workspace
from app.repositories import company_repository
from app.schemas.companies import CompanyCreate, CompanyOut, CompanyUpdate, company_out
from app.schemas.stats import CompanyStatsOut
from app.services import company_service, stats_service

router = APIRouter(tags=["companies"])


@router.post("/companies", status_code=201, response_model=CompanyOut)
def create_company(
    data: CompanyCreate,
    db: Session = Depends(get_db),
    workspace: Workspace = Depends(get_workspace),
) -> CompanyOut:
    company = company_service.create_company(db, workspace.id, data)
    return company_out(company)


@router.get("/companies", response_model=list[CompanyOut])
def list_companies(
    db: Session = Depends(get_db),
    workspace: Workspace = Depends(get_workspace),
) -> list[CompanyOut]:
    return [company_out(company) for company in company_repository.list_companies(db, workspace.id)]


@router.get("/companies/{company_id}", response_model=CompanyOut)
def get_company(
    company_id: str,
    db: Session = Depends(get_db),
    workspace: Workspace = Depends(get_workspace),
) -> CompanyOut:
    return company_out(company_repository.require_company(db, company_id, workspace.id))


@router.put("/companies/{company_id}", response_model=CompanyOut)
def update_company(
    company_id: str,
    data: CompanyUpdate,
    db: Session = Depends(get_db),
    workspace: Workspace = Depends(get_workspace),
) -> CompanyOut:
    company = company_service.update_company(db, company_id, workspace.id, data)
    return company_out(company)


@router.delete("/companies/{company_id}", status_code=204)
def delete_company(
    company_id: str,
    db: Session = Depends(get_db),
    workspace: Workspace = Depends(get_workspace),
) -> None:
    company_service.delete_company(db, company_id, workspace.id)


@router.get("/companies/{company_id}/stats", response_model=CompanyStatsOut)
def company_stats(
    company_id: str,
    db: Session = Depends(get_db),
    workspace: Workspace = Depends(get_workspace),
) -> CompanyStatsOut:
    company_repository.require_company(db, company_id, workspace.id)
    return stats_service.get_company_stats(db, company_id)
