"""AI status route tests (app/api/v1/ai.py)."""


def test_ai_status_reports_configuration(client):
    response = client.get("/api/v1/ai/status")
    assert response.status_code == 200
    body = response.json()
    assert isinstance(body["configured"], bool)
    assert "provider" in body
    assert "model" in body
