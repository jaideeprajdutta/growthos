"""Integration request and response schemas."""

from datetime import datetime
from typing import Any

from pydantic import BaseModel

from app.models.integrations import Integration
from app.schemas.common import IntegrationProvider, IntegrationStatus


class IntegrationCreate(BaseModel):
    provider: IntegrationProvider
    status: IntegrationStatus = "configured"
    settings: dict[str, Any] | None = None
    connectedAt: datetime | None = None


class IntegrationUpdate(BaseModel):
    provider: IntegrationProvider | None = None
    status: IntegrationStatus | None = None
    settings: dict[str, Any] | None = None
    connectedAt: datetime | None = None


class IntegrationOut(BaseModel):
    id: str
    companyId: str
    provider: IntegrationProvider
    status: IntegrationStatus
    settings: dict[str, Any] | None
    connectedAt: datetime | None
    createdAt: datetime
    updatedAt: datetime


def integration_out(integration: Integration) -> IntegrationOut:
    return IntegrationOut(
        id=integration.id,
        companyId=integration.company_id,
        provider=integration.provider,
        status=integration.status,
        settings=integration.settings_json,
        connectedAt=integration.connected_at,
        createdAt=integration.created_at,
        updatedAt=integration.updated_at,
    )
