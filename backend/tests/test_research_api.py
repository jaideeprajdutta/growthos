"""Research routes tests: start, list, inspect, retry (app/api/v1/research.py)."""

from unittest.mock import patch

from app.models import ResearchPage, ResearchRun
from app.research import jobs
from tests.conftest import TestSessionLocal
from tests.helpers import make_company


def test_start_research_rejects_unsafe_urls(client):
    company = client.post("/api/v1/companies", json={"name": "Alpha"}).json()
    for bad in ("http://127.0.0.1:8000/admin", "http://localhost/", "ftp://example.com/x"):
        response = client.post(f"/api/v1/companies/{company['id']}/research", json={"source_url": bad})
        assert response.status_code == 400, bad


def test_start_research_creates_run(client, monkeypatch):
    monkeypatch.setattr(jobs, "SessionLocal", TestSessionLocal)
    monkeypatch.setattr(jobs, "_execute_run", lambda run_id: None)
    company = client.post("/api/v1/companies", json={"name": "Alpha"}).json()
    response = client.post(f"/api/v1/companies/{company['id']}/research", json={"source_url": "https://8.8.8.8/"})
    assert response.status_code == 201
    body = response.json()
    assert body["status"] in ("pending", "running", "completed", "partially_completed", "failed")
    assert body["pagesScanned"] == 0

    listed = client.get(f"/api/v1/companies/{company['id']}/research/runs").json()
    assert [r["id"] for r in listed] == [body["id"]]
    detail = client.get(f"/api/v1/companies/{company['id']}/research/runs/{body['id']}")
    assert detail.status_code == 200
    assert detail.json()["sourceUrl"] == "https://8.8.8.8/"


def test_list_research_pages_endpoint(client, db):
    company = client.post("/api/v1/companies", json={"name": "Alpha"}).json()
    run = ResearchRun(company_id=company["id"], source_url="https://8.8.8.8/")
    db.add(run)
    db.commit()
    db.refresh(run)
    page = ResearchPage(run_id=run.id, url="https://8.8.8.8/about")
    db.add(page)
    db.commit()
    db.refresh(page)
    response = client.get(f"/api/v1/companies/{company['id']}/research/runs/{run.id}/pages").json()
    assert [p["url"] for p in response] == ["https://8.8.8.8/about"]
    detail = client.get(f"/api/v1/companies/{company['id']}/research/pages/{page.id}")
    assert detail.status_code == 200
    assert detail.json()["status"] == "pending"


def test_retry_research_page_endpoint(client, db, monkeypatch):
    monkeypatch.setattr(jobs, "SessionLocal", TestSessionLocal)
    monkeypatch.setattr(jobs, "fetch_text", lambda url, **kwargs: ("<html><title>R</title></html>", url))
    company = client.post("/api/v1/companies", json={"name": "Alpha"}).json()
    run = ResearchRun(company_id=company["id"], source_url="https://8.8.8.8/")
    db.add(run)
    db.commit()
    db.refresh(run)
    page = ResearchPage(run_id=run.id, url="https://8.8.8.8/bad", status="failed", status_detail="earlier")
    db.add(page)
    db.commit()
    db.refresh(page)
    response = client.post(f"/api/v1/companies/{company['id']}/research/pages/{page.id}/retry")
    assert response.status_code == 202
    assert response.json()["status"] in ("pending", "scanned")
