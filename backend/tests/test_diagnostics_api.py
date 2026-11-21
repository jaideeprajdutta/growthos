"""Diagnostic route tests (app/api/v1/diagnostics.py)."""

from unittest.mock import patch

from app.ai.client import StructuredResult, Usage
from app.diagnostics.schemas import DiagnosticFindingPayload, DiagnosticsPayload


def test_generate_diagnostics_endpoint(client):
    company = client.post("/api/v1/companies", json={"name": "Alpha"}).json()
    payload = DiagnosticsPayload(
        summary="Acquisition is weak.",
        findings=[
            DiagnosticFindingPayload(
                dimension="acquisition",
                problem_statement="Leads are sparse.",
                description="Low-quality traffic.",
                category="confirmed_issue",
                severity=3,
                confidence=0.7,
            )
        ],
    )
    result = StructuredResult(payload, Usage(1, 2, "test-model"), "test-model")
    with patch("app.diagnostics.run.generate_structured", return_value=result):
        response = client.post(f"/api/v1/companies/{company['id']}/diagnostics/generate")
    assert response.status_code == 200
    assert response.json()["companyId"] == company["id"]

    findings = client.get(f"/api/v1/companies/{company['id']}/diagnostic-findings").json()
    assert len(findings) == 1
    assert findings[0]["dimension"] == "acquisition"
    assert findings[0]["severity"] == 3
