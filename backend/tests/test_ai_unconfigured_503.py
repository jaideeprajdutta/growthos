"""AI 503 behaviour when no provider is configured (app/ai + route handlers)."""

from unittest.mock import patch


def _unconfigured(monkeypatch):
    monkeypatch.setattr("app.ai.structured.get_ai_client", lambda: None)


def test_intelligence_generate_returns_503_when_ai_unconfigured(client, monkeypatch):
    _unconfigured(monkeypatch)
    company = client.post("/api/v1/companies", json={"name": "Alpha"}).json()
    response = client.post(f"/api/v1/companies/{company['id']}/intelligence/generate")
    assert response.status_code == 503
    assert "AI provider" in response.json()["detail"]


def test_diagnostics_generate_returns_503_when_ai_unconfigured(client, monkeypatch):
    _unconfigured(monkeypatch)
    company = client.post("/api/v1/companies", json={"name": "Alpha"}).json()
    response = client.post(f"/api/v1/companies/{company['id']}/diagnostics/generate")
    assert response.status_code == 503
    assert "AI provider" in response.json()["detail"]


def test_opportunities_generate_returns_503_when_ai_unconfigured(client, monkeypatch):
    _unconfigured(monkeypatch)
    company = client.post("/api/v1/companies", json={"name": "Alpha"}).json()
    response = client.post(f"/api/v1/companies/{company['id']}/opportunities/generate")
    assert response.status_code == 503
    assert "AI provider" in response.json()["detail"]
