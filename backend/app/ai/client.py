"""Provider-independent AI clients.

Implemented over ``httpx`` so there are no hard dependencies on AI vendor SDKs:

- ``OpenAIClient`` — chat completions with JSON-schema structured outputs.
- ``AnthropicClient`` — messages API with forced tool-use for structured output.

Both return ``dict`` payloads plus token usage for transparency and logging.
"""

import json
from dataclasses import dataclass
from typing import Any, Generic, Protocol, TypeVar

import httpx
from pydantic import BaseModel

T = TypeVar("T", bound=BaseModel)


class AIError(Exception):
    """Raised when AI generation fails."""


@dataclass
class Usage:
    """Token usage reported by the provider."""

    input_tokens: int = 0
    output_tokens: int = 0
    model: str = ""


@dataclass
class StructuredResult(Generic[T]):
    """Result of a structured generation: parsed model + usage + provider model."""

    result: T
    usage: Usage
    model: str


class AIClient(Protocol):
    """Provider-independent interface for structured AI generation."""

    provider: str

    def generate_json(
        self,
        schema: type[T],
        prompt: str,
        system_prompt: str | None = None,
        timeout: float = 60.0,
    ) -> tuple[dict[str, Any], Usage]:
        """Generate a JSON object matching ``schema``; raises ``AIError`` on failure."""
        ...


class OpenAIClient:
    """OpenAI client using the Chat Completions API with JSON-schema outputs."""

    provider = "openai"

    def __init__(self, api_key: str, model: str, httpx_client: httpx.Client | None = None):
        self.api_key = api_key
        self.model = model
        self._httpx = httpx_client or httpx.Client(timeout=60.0)

    def generate_json(
        self,
        schema: type[T],
        prompt: str,
        system_prompt: str | None = None,
        timeout: float = 60.0,
    ) -> tuple[dict[str, Any], Usage]:
        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": system_prompt or ""},
                {"role": "user", "content": prompt},
            ],
            "response_format": {
                "type": "json_schema",
                "json_schema": {"name": schema.__name__, "schema": schema.model_json_schema(), "strict": True},
            },
        }
        response = self._httpx.post(
            "https://api.openai.com/v1/chat/completions",
            headers={"Authorization": f"Bearer {self.api_key}", "Content-Type": "application/json"},
            json=payload,
            timeout=timeout,
        )
        if response.status_code != 200:
            raise AIError(f"OpenAI API error {response.status_code}: {response.text[:500]}")
        data = response.json()
        content = data["choices"][0]["message"].get("content") or ""
        usage = data.get("usage") or {}
        return json.loads(content), Usage(
            input_tokens=usage.get("prompt_tokens", 0),
            output_tokens=usage.get("completion_tokens", 0),
            model=data.get("model", self.model),
        )


class AnthropicClient:
    """Anthropic client using the Messages API with forced tool-use structured output."""

    provider = "anthropic"

    def __init__(self, api_key: str, model: str, httpx_client: httpx.Client | None = None):
        self.api_key = api_key
        self.model = model
        self._httpx = httpx_client or httpx.Client(timeout=60.0)

    def generate_json(
        self,
        schema: type[T],
        prompt: str,
        system_prompt: str | None = None,
        timeout: float = 60.0,
    ) -> tuple[dict[str, Any], Usage]:
        payload = {
            "model": self.model,
            "max_tokens": 8192,
            "system": system_prompt or "",
            "messages": [{"role": "user", "content": prompt}],
            "tools": [
                {
                    "name": schema.__name__,
                    "description": schema.__doc__ or "Structured output.",
                    "input_schema": schema.model_json_schema(),
                }
            ],
            "tool_choice": {"type": "tool", "name": schema.__name__},
        }
        response = self._httpx.post(
            "https://api.anthropic.com/v1/messages",
            headers={
                "x-api-key": self.api_key,
                "anthropic-version": "2023-06-01",
                "Content-Type": "application/json",
            },
            json=payload,
            timeout=timeout,
        )
        if response.status_code != 200:
            raise AIError(f"Anthropic API error {response.status_code}: {response.text[:500]}")
        data = response.json()
        for block in data.get("content", []):
            if block.get("type") == "tool_use":
                usage = data.get("usage") or {}
                return block.get("input") or {}, Usage(
                    input_tokens=usage.get("input_tokens", 0),
                    output_tokens=usage.get("output_tokens", 0),
                    model=data.get("model", self.model),
                )
        raise AIError("Anthropic API returned no tool_use block.")
