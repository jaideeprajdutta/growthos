"""Opportunity routes: create, list, update, delete."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.v1.dependencies import get_workspace
from app.db.session import get_db
from app.models.workspaces import Workspace
from app.repositories import company_repository, opportunity_repository
from app.schemas.opportunities import OpportunityCreate, OpportunityOut, OpportunityUpdate, opportunity_out

router = APIRouter(tags=["opportunities"])


@router.post("/companies/{company_id}/opportunities", response_model=OpportunityOut, status_code=201)
def create_opportunity(
    company_id: str,
    data: OpportunityCreate,
    db: Session = Depends(get_db),
    workspace: Workspace = Depends(get_workspace),
) -> OpportunityOut:
    company_repository.require_company(db, company_id, workspace.id)
    opportunity = opportunity_repository.create_opportunity(db, company_id, data)
    return opportunity_out(opportunity)


@router.get("/companies/{company_id}/opportunities", response_model=list[OpportunityOut])
def list_opportunities(
    company_id: str,
    db: Session = Depends(get_db),
    workspace: Workspace = Depends(get_workspace),
) -> list[OpportunityOut]:
    company_repository.require_company(db, company_id, workspace.id)
    return [opportunity_out(opportunity) for opportunity in opportunity_repository.list_opportunities(db, company_id)]


@router.put("/companies/{company_id}/opportunities/{opportunity_id}", response_model=OpportunityOut)
def update_opportunity(
    company_id: str,
    opportunity_id: str,
    data: OpportunityUpdate,
    db: Session = Depends(get_db),
    workspace: Workspace = Depends(get_workspace),
) -> OpportunityOut:
    company_repository.require_company(db, company_id, workspace.id)
    opportunity = opportunity_repository.update_opportunity(db, opportunity_id, company_id, data)
    return opportunity_out(opportunity)


@router.delete("/companies/{company_id}/opportunities/{opportunity_id}", status_code=204)
def delete_opportunity(
    company_id: str,
    opportunity_id: str,
    db: Session = Depends(get_db),
    workspace: Workspace = Depends(get_workspace),
) -> None:
    company_repository.require_company(db, company_id, workspace.id)
    opportunity_repository.delete_opportunity(db, opportunity_id, company_id)
