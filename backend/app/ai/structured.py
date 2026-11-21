"""Structured AI generation with validation, retries and usage tracking."""

import logging
import time
from typing import TypeVar

from pydantic import BaseModel

from app.ai.client import AIClient, AIError, StructuredResult
from app.ai.service import get_ai_client

logger = logging.getLogger("growthos.ai")
T = TypeVar("T", bound=BaseModel)


def generate_structured(
    schema: type[T],
    prompt: str,
    system_prompt: str | None = None,
    client: AIClient | None = None,
    timeout: float = 60.0,
    retries: int = 3,
) -> StructuredResult[T]:
    """Generate a validated ``schema`` instance via the configured AI client.

    Retries with exponential backoff; raises ``AIError`` when no client is
    configured or generation fails after all attempts.
    """
    if client is None:
        client = get_ai_client()
        if client is None:
            raise AIError("No AI provider is configured. Set AI_PROVIDER and an API key.")

    last_error: Exception | None = None
    for attempt in range(1, retries + 1):
        try:
            raw, usage = client.generate_json(schema, prompt, system_prompt=system_prompt, timeout=timeout)
            result = schema.model_validate(raw)
            total_tokens = usage.input_tokens + usage.output_tokens
            logger.info(
                "AI structured generation succeeded: schema=%s model=%s tokens=%s",
                schema.__name__,
                usage.model,
                total_tokens,
            )
            return StructuredResult(result=result, usage=usage, model=usage.model)
        except Exception as exc:  # retry on any provider/validation failure
            last_error = exc
            logger.warning("AI structured generation attempt %s/%s failed: %s", attempt, retries, exc)
            if attempt < retries:
                time.sleep(min(2 ** (attempt - 1), 8))
    raise AIError(f"AI structured generation failed after {retries} attempts: {last_error}")
