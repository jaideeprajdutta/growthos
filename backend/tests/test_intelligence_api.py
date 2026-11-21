"""Intelligence route tests (app/api/v1/intelligence.py)."""

from unittest.mock import patch

from app.ai.client import StructuredResult, Usage
from app.intelligence import generate_intelligence_report
from app.intelligence.schemas import CompanyIntelligenceUpdatePayload, IntelligenceReportPayload


def test_generate_intelligence_endpoint(client):
    company = client.post("/api/v1/companies", json={"name": "Alpha"}).json()
    payload = IntelligenceReportPayload(
        executive_summary="Executive summary.",
        sections={"business_model": "SaaS"},
        profile_update=CompanyIntelligenceUpdatePayload(value_proposition="VP text"),
        findings=[],
    )
    result = StructuredResult(payload, Usage(1, 2, "test-model"), "test-model")
    with patch("app.intelligence.report.generate_structured", return_value=result):
        response = client.post(f"/api/v1/companies/{company['id']}/intelligence/generate")
    assert response.status_code == 200
    assert response.json()["executiveSummary"] == "Executive summary."
    assert response.json()["version"] == 1

    profile = client.get(f"/api/v1/companies/{company['id']}/intelligence").json()
    assert profile is not None
    assert profile["valueProposition"] == "VP text"

    listed = client.get(f"/api/v1/companies/{company['id']}/reports").json()
    assert len(listed) == 1
