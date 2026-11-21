"""AI client factory from environment configuration."""

from functools import lru_cache

from app.ai.client import AIClient, AnthropicClient, OpenAIClient
from app.core.config import settings

_DEFAULT_MODELS = {
    "openai": "gpt-4o-mini",
    "anthropic": "claude-3-5-haiku-20241022",
}


@lru_cache(maxsize=1)
def get_ai_client() -> AIClient | None:
    """Return the configured AI client, or ``None`` when no provider is configured."""
    provider = settings.ai_provider
    if not provider:
        return None
    api_key = settings.ai_api_key
    if not api_key:
        return None
    model = settings.ai_model or _DEFAULT_MODELS[provider]
    if provider == "openai":
        return OpenAIClient(api_key=api_key, model=model)
    if provider == "anthropic":
        return AnthropicClient(api_key=api_key, model=model)
    return None
