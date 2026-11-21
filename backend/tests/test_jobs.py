"""Research job lifecycle and retry tests (app/research/jobs.py)."""

import time
from unittest.mock import patch

from sqlalchemy import select

from app.models import Evidence, ResearchPage, ResearchRun
from app.research import jobs
from app.research.crawler import CrawledPage
from tests.conftest import TestSessionLocal
from tests.helpers import make_company

TERMINAL_STATUSES = ("completed", "partially_completed", "failed")


def test_start_research_job_creates_pending_run(db, monkeypatch):
    monkeypatch.setattr(jobs, "SessionLocal", TestSessionLocal)
    monkeypatch.setattr(jobs, "_execute_run", lambda run_id: None)
    company = make_company(db)
    db.close()
    run_id = jobs.start_research_job(company.id, "https://8.8.8.8/")
    session = TestSessionLocal()
    try:
        run = session.get(ResearchRun, run_id)
        assert run is not None
        assert run.company_id == company.id
        assert run.source_url == "https://8.8.8.8/"
        assert run.status == "pending"
    finally:
        session.close()


def test_execute_run_completed(db, monkeypatch):
    monkeypatch.setattr(jobs, "SessionLocal", TestSessionLocal)
    company = make_company(db)
    db.close()
    session = TestSessionLocal()
    run = ResearchRun(company_id=company.id, source_url="https://8.8.8.8/")
    session.add(run)
    session.commit()
    session.refresh(run)
    run_id = run.id
    session.close()

    pages = [
        CrawledPage(
            url="https://8.8.8.8/",
            status="scanned",
            status_detail=None,
            title="Home",
            text="some extracted words about the company",
            word_count=6,
            duration_ms=12,
        )
    ]
    monkeypatch.setattr(jobs, "crawl_site", lambda url: pages)
    jobs._execute_run(run_id)

    session = TestSessionLocal()
    try:
        run = session.get(ResearchRun, run_id)
        assert run.status == "completed"
        assert run.pages_scanned == 1
        assert run.started_at is not None and run.finished_at is not None
        rows = session.execute(select(ResearchPage).where(ResearchPage.run_id == run_id)).scalars().all()
        assert [r.url for r in rows] == ["https://8.8.8.8/"]
        assert rows[0].status == "scanned"
        assert rows[0].word_count == 6
        evidence = session.execute(select(Evidence).where(Evidence.company_id == company.id)).scalars().all()
        assert len(evidence) == 1
        assert evidence[0].dimension == "website"
        assert evidence[0].classification == "observed"
    finally:
        session.close()


def test_execute_run_failed_when_no_pages(db, monkeypatch):
    monkeypatch.setattr(jobs, "SessionLocal", TestSessionLocal)
    company = make_company(db)
    db.close()
    session = TestSessionLocal()
    run = ResearchRun(company_id=company.id, source_url="https://8.8.8.8/")
    session.add(run)
    session.commit()
    session.refresh(run)
    run_id = run.id
    session.close()

    monkeypatch.setattr(jobs, "crawl_site", lambda url: [])
    jobs._execute_run(run_id)

    session = TestSessionLocal()
    try:
        run = session.get(ResearchRun, run_id)
        assert run.status == "failed"
        assert "No pages" in run.error_message
    finally:
        session.close()


def test_execute_run_marks_partially_completed(db, monkeypatch):
    monkeypatch.setattr(jobs, "SessionLocal", TestSessionLocal)
    company = make_company(db)
    db.close()
    session = TestSessionLocal()
    run = ResearchRun(company_id=company.id, source_url="https://8.8.8.8/")
    session.add(run)
    session.commit()
    session.refresh(run)
    run_id = run.id
    session.close()

    pages = [
        CrawledPage(url="https://8.8.8.8/", status="scanned", status_detail=None, title="T", text="t", word_count=1, duration_ms=1),
        CrawledPage(url="https://8.8.8.8/bad", status="failed", status_detail="boom", title=None, text=None, word_count=0, duration_ms=None),
    ]
    monkeypatch.setattr(jobs, "crawl_site", lambda url: pages)
    jobs._execute_run(run_id)

    session = TestSessionLocal()
    try:
        run = session.get(ResearchRun, run_id)
        assert run.status == "partially_completed"
    finally:
        session.close()


def _wait_page_status(page_id, status, timeout=5.0):
    session = TestSessionLocal()
    try:
        deadline = time.monotonic() + timeout
        while time.monotonic() < deadline:
            session.rollback()
            page = session.get(ResearchPage, page_id)
            current = page.status if page is not None else None
            session.rollback()
            if current == status:
                return session.get(ResearchPage, page_id)
            time.sleep(0.02)
        return None
    finally:
        session.close()


def test_retry_failed_page_rescans(db, monkeypatch):
    monkeypatch.setattr(jobs, "SessionLocal", TestSessionLocal)
    company = make_company(db)
    db.close()
    session = TestSessionLocal()
    run = ResearchRun(company_id=company.id, source_url="https://8.8.8.8/")
    session.add(run)
    session.commit()
    session.refresh(run)
    page = ResearchPage(run_id=run.id, url="https://8.8.8.8/retry", status="failed", status_detail="earlier failure")
    session.add(page)
    session.commit()
    session.refresh(page)
    run_id, page_id, company_id = run.id, page.id, run.company_id
    session.close()

    def fetch_text(url, **kwargs):
        html = "<html><head><title>Retry Page</title></head><body>retried</body></html>"
        return html, url

    monkeypatch.setattr(jobs, "fetch_text", fetch_text)
    with patch.object(jobs, "crawl_site", return_value=[]):
        retried = jobs.retry_failed_page(db, run_id, page_id, company_id)
    assert retried.status == "pending"

    page = _wait_page_status(page_id, "scanned")
    assert page is not None
    assert page.status == "scanned"
    assert page.title == "Retry Page"
    assert page.extracted_text

    session = TestSessionLocal()
    try:
        evidence = session.execute(
            select(Evidence).where(Evidence.source_url == "https://8.8.8.8/retry", Evidence.company_id == company_id)
        ).scalars().all()
        assert len(evidence) == 1
    finally:
        session.close()
