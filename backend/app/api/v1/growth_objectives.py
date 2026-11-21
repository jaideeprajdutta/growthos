"""Growth objective routes: create, list, update, delete."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.v1.dependencies import get_workspace
from app.db.session import get_db
from app.models.workspaces import Workspace
from app.repositories import company_repository, growth_objective_repository
from app.schemas.growth_objectives import GrowthObjectiveCreate, GrowthObjectiveOut, GrowthObjectiveUpdate, objective_out

router = APIRouter(tags=["growth-objectives"])


@router.post("/companies/{company_id}/growth-objectives", response_model=GrowthObjectiveOut, status_code=201)
def create_growth_objective(
    company_id: str,
    data: GrowthObjectiveCreate,
    db: Session = Depends(get_db),
    workspace: Workspace = Depends(get_workspace),
) -> GrowthObjectiveOut:
    company_repository.require_company(db, company_id, workspace.id)
    objective = growth_objective_repository.create_growth_objective(db, company_id, data)
    return objective_out(objective)


@router.get("/companies/{company_id}/growth-objectives", response_model=list[GrowthObjectiveOut])
def list_growth_objectives(
    company_id: str,
    db: Session = Depends(get_db),
    workspace: Workspace = Depends(get_workspace),
) -> list[GrowthObjectiveOut]:
    company_repository.require_company(db, company_id, workspace.id)
    return [objective_out(objective) for objective in growth_objective_repository.list_growth_objectives(db, company_id)]


@router.put("/companies/{company_id}/growth-objectives/{objective_id}", response_model=GrowthObjectiveOut)
def update_growth_objective(
    company_id: str,
    objective_id: str,
    data: GrowthObjectiveUpdate,
    db: Session = Depends(get_db),
    workspace: Workspace = Depends(get_workspace),
) -> GrowthObjectiveOut:
    company_repository.require_company(db, company_id, workspace.id)
    objective = growth_objective_repository.update_growth_objective(db, objective_id, company_id, data)
    return objective_out(objective)


@router.delete("/companies/{company_id}/growth-objectives/{objective_id}", status_code=204)
def delete_growth_objective(
    company_id: str,
    objective_id: str,
    db: Session = Depends(get_db),
    workspace: Workspace = Depends(get_workspace),
) -> None:
    company_repository.require_company(db, company_id, workspace.id)
    growth_objective_repository.delete_growth_objective(db, objective_id, company_id)
