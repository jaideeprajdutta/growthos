"""AI client and structured-output tests (app/ai/*)."""

from types import SimpleNamespace
from unittest.mock import MagicMock

import pytest
from pydantic import BaseModel

from app.ai.client import AIError, AnthropicClient, OpenAIClient, Usage
from app.ai.service import get_ai_client
from app.ai.structured import generate_structured


class Strict(BaseModel):
    answer: int


def _fake_response(payload, status_code=200):
    response = MagicMock()
    response.status_code = status_code
    response.json.return_value = payload
    return response


def test_openai_client_generates_json():
    http = MagicMock()
    http.post.return_value = _fake_response(
        {"choices": [{"message": {"content": '{"answer": 42}'}}], "usage": {"prompt_tokens": 3, "completion_tokens": 4}}
    )
    client = OpenAIClient(api_key="k", model="m", httpx_client=http)
    raw, usage = client.generate_json(Strict, "prompt")
    assert raw == {"answer": 42}
    assert usage.input_tokens == 3
    assert usage.output_tokens == 4


def test_openai_client_raises_on_error():
    http = MagicMock()
    http.post.return_value = _fake_response({"error": "nope"}, status_code=500)
    client = OpenAIClient(api_key="k", model="m", httpx_client=http)
    with pytest.raises(AIError):
        client.generate_json(Strict, "prompt")


def test_anthropic_client_generates_json_via_tool_use():
    http = MagicMock()
    http.post.return_value = _fake_response(
        {"content": [{"type": "tool_use", "input": {"answer": 7}}], "usage": {"input_tokens": 1, "output_tokens": 2}}
    )
    client = AnthropicClient(api_key="k", model="m", httpx_client=http)
    raw, usage = client.generate_json(Strict, "prompt")
    assert raw == {"answer": 7}
    assert usage.output_tokens == 2


def test_generate_structured_validates_and_retries(monkeypatch):
    monkeypatch.setattr("app.ai.structured.time.sleep", lambda seconds: None)
    client = MagicMock()
    client.generate_json.side_effect = [({}, Usage(1, 1, "m")), ({"answer": 5}, Usage(2, 3, "test-model"))]
    result = generate_structured(Strict, "prompt", client=client)
    assert result.result.answer == 5
    assert result.model == "test-model"
    assert client.generate_json.call_count == 2


def test_generate_structured_raises_without_client(monkeypatch):
    monkeypatch.setattr("app.ai.structured.get_ai_client", lambda: None)
    with pytest.raises(AIError):
        generate_structured(Strict, "prompt")


def test_generate_structured_raises_after_retries(monkeypatch):
    monkeypatch.setattr("app.ai.structured.time.sleep", lambda seconds: None)
    client = MagicMock()
    client.generate_json.side_effect = AIError("boom")
    with pytest.raises(AIError):
        generate_structured(Strict, "prompt", client=client, retries=2)


def test_get_ai_client_none_when_not_configured(monkeypatch):
    monkeypatch.setattr("app.ai.service.settings.ai_provider", "")
    monkeypatch.setattr("app.ai.service.settings.ai_api_key", "")
    get_ai_client.cache_clear()
    try:
        assert get_ai_client() is None
    finally:
        get_ai_client.cache_clear()


def test_usage_dataclass_defaults():
    assert Usage().input_tokens == 0
    assert isinstance(SimpleNamespace(), SimpleNamespace)
