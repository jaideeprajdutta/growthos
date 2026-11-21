"""Growth objective repository."""

from collections.abc import Sequence

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundError
from app.models import GrowthObjective
from app.schemas.growth_objectives import GrowthObjectiveCreate, GrowthObjectiveUpdate


def create_growth_objective(db: Session, company_id: str, data: GrowthObjectiveCreate) -> GrowthObjective:
    objective = GrowthObjective(
        company_id=company_id,
        objective_type=data.objectiveType,
        custom_objective=data.customObjective or "",
        is_primary=data.isPrimary,
    )
    db.add(objective)
    db.commit()
    db.refresh(objective)
    return objective


def list_growth_objectives(db: Session, company_id: str) -> Sequence[GrowthObjective]:
    return db.execute(
        select(GrowthObjective).where(GrowthObjective.company_id == company_id).order_by(GrowthObjective.created_at, GrowthObjective.id)
    ).scalars().all()


def _get_scoped(db: Session, objective_id: str, company_id: str) -> GrowthObjective:
    objective = db.execute(
        select(GrowthObjective).where(GrowthObjective.id == objective_id, GrowthObjective.company_id == company_id)
    ).scalar_one_or_none()
    if objective is None:
        raise NotFoundError(f"Growth objective {objective_id} not found.")
    return objective


def update_growth_objective(db: Session, objective_id: str, company_id: str, data: GrowthObjectiveUpdate) -> GrowthObjective:
    objective = _get_scoped(db, objective_id, company_id)
    if data.objectiveType is not None:
        objective.objective_type = data.objectiveType
    if data.customObjective is not None:
        objective.custom_objective = data.customObjective
    if data.isPrimary is not None:
        objective.is_primary = data.isPrimary
    db.commit()
    db.refresh(objective)
    return objective


def delete_growth_objective(db: Session, objective_id: str, company_id: str) -> None:
    objective = _get_scoped(db, objective_id, company_id)
    db.delete(objective)
    db.commit()
