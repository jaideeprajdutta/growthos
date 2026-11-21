"""AI status route."""

from fastapi import APIRouter

from app.ai import get_ai_client
from app.core.config import settings
from app.schemas.ai import AIStatusOut

router = APIRouter(tags=["ai"])


@router.get("/ai/status", response_model=AIStatusOut)
def ai_status() -> AIStatusOut:
    """Report whether an AI provider is configured and the active model."""
    client = get_ai_client()
    return AIStatusOut(
        configured=client is not None,
        provider=settings.ai_provider or None,
        model=client.model if client is not None else None,
    )
