"""Cross-company data isolation for Phase 2 API surfaces."""

from unittest.mock import patch

from app.ai.client import StructuredResult, Usage
from app.intelligence.schemas import CompanyIntelligenceUpdatePayload, IntelligenceReportPayload
from app.models import DiagnosticFinding, DiagnosticRun


def _ai_result():
    payload = IntelligenceReportPayload(
        executive_summary="Summary.",
        sections={},
        profile_update=CompanyIntelligenceUpdatePayload(value_proposition="VP"),
        findings=[],
    )
    return StructuredResult(payload, Usage(1, 1, "test-model"), "test-model")


def test_opportunity_lists_are_isolated_by_company(client):
    a = client.post("/api/v1/companies", json={"name": "A"}).json()
    b = client.post("/api/v1/companies", json={"name": "B"}).json()
    client.post(f"/api/v1/companies/{a['id']}/opportunities", json={"title": "Only A", "confidence": 50})
    assert [item["title"] for item in client.get(f"/api/v1/companies/{a['id']}/opportunities").json()] == ["Only A"]
    assert client.get(f"/api/v1/companies/{b['id']}/opportunities").json() == []


def test_intelligence_reports_are_isolated_by_company(client):
    a = client.post("/api/v1/companies", json={"name": "A"}).json()
    b = client.post("/api/v1/companies", json={"name": "B"}).json()
    with patch("app.intelligence.report.generate_structured", return_value=_ai_result()):
        assert client.post(f"/api/v1/companies/{a['id']}/intelligence/generate").status_code == 200
    assert len(client.get(f"/api/v1/companies/{a['id']}/reports").json()) == 1
    assert client.get(f"/api/v1/companies/{b['id']}/reports").json() == []


def test_diagnostics_are_isolated_by_company(client, db):
    a = client.post("/api/v1/companies", json={"name": "A"}).json()
    b = client.post("/api/v1/companies", json={"name": "B"}).json()
    run = DiagnosticRun(company_id=a["id"])
    db.add(run)
    db.commit()
    db.refresh(run)
    db.add(DiagnosticFinding(run_id=run.id, company_id=a["id"], dimension="acquisition", category="confirmed_issue"))
    db.commit()

    a_findings = client.get(f"/api/v1/companies/{a['id']}/diagnostic-findings").json()
    b_findings = client.get(f"/api/v1/companies/{b['id']}/diagnostic-findings").json()
    assert [item["companyId"] for item in a_findings] == [a["id"]]
    assert b_findings == []


def test_research_runs_are_isolated_by_company(client, monkeypatch):
    from app.research import jobs
    from tests.conftest import TestSessionLocal

    monkeypatch.setattr(jobs, "SessionLocal", TestSessionLocal)
    monkeypatch.setattr(jobs, "_execute_run", lambda run_id: None)
    a = client.post("/api/v1/companies", json={"name": "A"}).json()
    b = client.post("/api/v1/companies", json={"name": "B"}).json()
    assert client.post(f"/api/v1/companies/{a['id']}/research", json={"source_url": "https://8.8.8.8/"}).status_code == 201
    assert len(client.get(f"/api/v1/companies/{a['id']}/research/runs").json()) >= 1
    assert client.get(f"/api/v1/companies/{b['id']}/research/runs").json() == []
