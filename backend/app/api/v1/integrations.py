"""Integration routes: create, list, update, delete."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.v1.dependencies import get_workspace
from app.db.session import get_db
from app.models.workspaces import Workspace
from app.repositories import company_repository, integration_repository
from app.schemas.integrations import IntegrationCreate, IntegrationOut, IntegrationUpdate, integration_out

router = APIRouter(tags=["integrations"])


@router.post("/companies/{company_id}/integrations", response_model=IntegrationOut, status_code=201)
def create_integration(
    company_id: str,
    data: IntegrationCreate,
    db: Session = Depends(get_db),
    workspace: Workspace = Depends(get_workspace),
) -> IntegrationOut:
    company_repository.require_company(db, company_id, workspace.id)
    integration = integration_repository.create_integration(db, company_id, data)
    return integration_out(integration)


@router.get("/companies/{company_id}/integrations", response_model=list[IntegrationOut])
def list_integrations(
    company_id: str,
    db: Session = Depends(get_db),
    workspace: Workspace = Depends(get_workspace),
) -> list[IntegrationOut]:
    company_repository.require_company(db, company_id, workspace.id)
    return [integration_out(integration) for integration in integration_repository.list_integrations(db, company_id)]


@router.put("/companies/{company_id}/integrations/{integration_id}", response_model=IntegrationOut)
def update_integration(
    company_id: str,
    integration_id: str,
    data: IntegrationUpdate,
    db: Session = Depends(get_db),
    workspace: Workspace = Depends(get_workspace),
) -> IntegrationOut:
    company_repository.require_company(db, company_id, workspace.id)
    integration = integration_repository.update_integration(db, integration_id, company_id, data)
    return integration_out(integration)


@router.delete("/companies/{company_id}/integrations/{integration_id}", status_code=204)
def delete_integration(
    company_id: str,
    integration_id: str,
    db: Session = Depends(get_db),
    workspace: Workspace = Depends(get_workspace),
) -> None:
    company_repository.require_company(db, company_id, workspace.id)
    integration_repository.delete_integration(db, integration_id, company_id)
