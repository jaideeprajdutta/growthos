"""Provider-independent AI orchestration.

Exports the client factory, structured-output generation and error types.
Providers are selected from the environment (see ``backend/.env.example``).
"""

from app.ai.client import AIClient, AIError, AnthropicClient, OpenAIClient, StructuredResult, Usage
from app.ai.service import get_ai_client
from app.ai.structured import generate_structured

__all__ = [
    "AIClient",
    "AIError",
    "AnthropicClient",
    "OpenAIClient",
    "StructuredResult",
    "Usage",
    "generate_structured",
    "get_ai_client",
]
