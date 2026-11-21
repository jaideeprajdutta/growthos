"""Research edge cases: duplicate-run 409 and cross-company page isolation."""

from app.models import ResearchPage, ResearchRun
from app.research import jobs
from tests.conftest import TestSessionLocal
from tests.helpers import make_company


def test_duplicate_active_research_run_returns_409(client, monkeypatch):
    monkeypatch.setattr(jobs, "SessionLocal", TestSessionLocal)
    monkeypatch.setattr(jobs, "_execute_run", lambda run_id: None)
    company = client.post("/api/v1/companies", json={"name": "Alpha"}).json()
    url = "https://8.8.8.8/"
    first = client.post(f"/api/v1/companies/{company['id']}/research", json={"source_url": url})
    assert first.status_code == 201
    second = client.post(f"/api/v1/companies/{company['id']}/research", json={"source_url": url})
    assert second.status_code == 409


def test_research_run_detail_is_company_scoped(client, db):
    company = client.post("/api/v1/companies", json={"name": "Alpha"}).json()
    other = client.post("/api/v1/companies", json={"name": "Beta"}).json()
    run = ResearchRun(company_id=company["id"], source_url="https://8.8.8.8/")
    db.add(run)
    db.commit()
    db.refresh(run)
    db.add(ResearchPage(run_id=run.id, url="https://8.8.8.8/about"))
    db.commit()

    assert [item["id"] for item in client.get(f"/api/v1/companies/{other['id']}/research/runs").json()] == []
    response = client.get(f"/api/v1/companies/{other['id']}/research/runs/{run.id}")
    assert response.status_code in (404, 409, 500)
