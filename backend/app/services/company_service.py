"""Company domain service — CRUD orchestration with activity logging."""

from sqlalchemy.orm import Session

from app.models import Company
from app.repositories import activity_log_repository, company_repository
from app.schemas.companies import CompanyCreate, CompanyUpdate


def create_company(db: Session, workspace_id: str, data: CompanyCreate) -> Company:
    company = company_repository.create_company(db, workspace_id, data)
    activity_log_repository.log_activity(db, company.id, "company_created", f"Company created: {company.name}")
    db.commit()
    return company


def update_company(db: Session, company_id: str, workspace_id: str, data: CompanyUpdate) -> Company:
    company = company_repository.update_company(db, company_id, workspace_id, data)
    activity_log_repository.log_activity(db, company.id, "company_updated", f"Company updated: {company.name}")
    db.commit()
    return company


def delete_company(db: Session, company_id: str, workspace_id: str) -> None:
    company_repository.delete_company(db, company_id, workspace_id)
