"""Integration repository — CRUD scoped by company."""

from collections.abc import Sequence

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundError
from app.models import Integration
from app.schemas.integrations import IntegrationCreate, IntegrationUpdate


def create_integration(db: Session, company_id: str, data: IntegrationCreate) -> Integration:
    integration = Integration(
        company_id=company_id,
        provider=data.provider,
        status=data.status,
        settings_json=data.settings,
        connected_at=data.connectedAt,
    )
    db.add(integration)
    db.commit()
    db.refresh(integration)
    return integration


def list_integrations(db: Session, company_id: str) -> Sequence[Integration]:
    return db.execute(
        select(Integration)
        .where(Integration.company_id == company_id)
        .order_by(Integration.created_at.desc(), Integration.id.desc())
    ).scalars().all()


def _get_scoped(db: Session, integration_id: str, company_id: str) -> Integration:
    integration = db.execute(
        select(Integration).where(Integration.id == integration_id, Integration.company_id == company_id)
    ).scalar_one_or_none()
    if integration is None:
        raise NotFoundError(f"Integration {integration_id} not found.")
    return integration


def update_integration(db: Session, integration_id: str, company_id: str, data: IntegrationUpdate) -> Integration:
    integration = _get_scoped(db, integration_id, company_id)
    if data.provider is not None:
        integration.provider = data.provider
    if data.status is not None:
        integration.status = data.status
    if data.settings is not None:
        integration.settings_json = data.settings
    if data.connectedAt is not None:
        integration.connected_at = data.connectedAt
    db.commit()
    db.refresh(integration)
    return integration


def delete_integration(db: Session, integration_id: str, company_id: str) -> None:
    integration = _get_scoped(db, integration_id, company_id)
    db.delete(integration)
    db.commit()
