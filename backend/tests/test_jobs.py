"""Research job lifecycle and retry tests (app/research/jobs.py)."""

import time
from unittest.mock import patch

import pytest
from sqlalchemy import select

from app.core.exceptions import DuplicateError
from app.models import Evidence, ResearchPage, ResearchRun
from app.research import jobs
from app.research.crawler import CrawledPage
from app.research.robots import RobotsPolicy
from tests.conftest import TestSessionLocal
from tests.helpers import make_company

TERMINAL_STATUSES = ("completed", "partially_completed", "failed")
LONG_TEXT = (
    "Acme is a workflow platform for product teams. It helps teams plan work, "
    "track delivery and keep customers informed throughout the product lifecycle. "
    "The platform is used by engineering, design and product organisations."
)


def _crawled(url, status="scanned", text=LONG_TEXT, summary="Acme is a workflow platform for product teams."):
    return CrawledPage(
        url=url,
        status=status,
        status_detail=None if status == "scanned" else "boom",
        title="Acme" if status == "scanned" else None,
        text=text if status == "scanned" else None,
        summary=summary if status == "scanned" else None,
        word_count=len((text or "").split()),
        duration_ms=12,
    )


def _make_run(db):
    company = make_company(db)
    db.close()
    session = TestSessionLocal()
    run = ResearchRun(company_id=company.id, source_url="https://8.8.8.8/")
    session.add(run)
    session.commit()
    session.refresh(run)
    run_id = run.id
    session.close()
    return company, run_id


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


def test_start_research_job_rejects_duplicate_active_run(db, monkeypatch):
    monkeypatch.setattr(jobs, "SessionLocal", TestSessionLocal)
    company = make_company(db)
    session = TestSessionLocal()
    session.add(ResearchRun(company_id=company.id, source_url="https://8.8.8.8/", status="running"))
    session.commit()
    session.close()
    db.close()
    with pytest.raises(DuplicateError):
        jobs.start_research_job(company.id, "https://8.8.8.8/")


def test_execute_run_completed(db, monkeypatch):
    monkeypatch.setattr(jobs, "SessionLocal", TestSessionLocal)
    company, run_id = _make_run(db)

    pages = [_crawled("https://8.8.8.8/")]
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
        assert rows[0].word_count > 20
        evidence = session.execute(select(Evidence).where(Evidence.company_id == company.id)).scalars().all()
        assert len(evidence) == 1
        assert evidence[0].dimension == "website"
        assert evidence[0].classification == "observed"
        assert evidence[0].extracted_statement == "Acme is a workflow platform for product teams."
    finally:
        session.close()


def test_execute_run_skips_evidence_for_thin_pages(db, monkeypatch):
    monkeypatch.setattr(jobs, "SessionLocal", TestSessionLocal)
    company, run_id = _make_run(db)

    monkeypatch.setattr(jobs, "crawl_site", lambda url: [_crawled("https://8.8.8.8/login", text="Log in", summary="")])
    jobs._execute_run(run_id)

    session = TestSessionLocal()
    try:
        assert session.get(ResearchRun, run_id).status == "completed"
        evidence = session.execute(select(Evidence).where(Evidence.company_id == company.id)).scalars().all()
        assert evidence == []
    finally:
        session.close()


def test_execute_run_failed_when_no_pages(db, monkeypatch):
    monkeypatch.setattr(jobs, "SessionLocal", TestSessionLocal)
    _, run_id = _make_run(db)

    monkeypatch.setattr(jobs, "crawl_site", lambda url: [])
    jobs._execute_run(run_id)

    session = TestSessionLocal()
    try:
        run = session.get(ResearchRun, run_id)
        assert run.status == "failed"
        assert "No pages" in run.error_message
    finally:
        session.close()


def test_execute_run_failed_when_every_page_fails(db, monkeypatch):
    monkeypatch.setattr(jobs, "SessionLocal", TestSessionLocal)
    _, run_id = _make_run(db)

    monkeypatch.setattr(jobs, "crawl_site", lambda url: [_crawled("https://8.8.8.8/", status="failed")])
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
    _, run_id = _make_run(db)

    pages = [
        _crawled("https://8.8.8.8/"),
        _crawled("https://8.8.8.8/bad", status="failed"),
    ]
    monkeypatch.setattr(jobs, "crawl_site", lambda url: pages)
    jobs._execute_run(run_id)

    session = TestSessionLocal()
    try:
        run = session.get(ResearchRun, run_id)
        assert run.status == "partially_completed"
        assert "1 of 2" in run.error_message
    finally:
        session.close()


def test_recover_interrupted_runs_marks_active_jobs_failed(db, monkeypatch):
    monkeypatch.setattr(jobs, "SessionLocal", TestSessionLocal)
    company = make_company(db)
    session = TestSessionLocal()
    pending = ResearchRun(company_id=company.id, source_url="https://8.8.8.8/", status="pending")
    running = ResearchRun(company_id=company.id, source_url="https://8.8.8.8/", status="running")
    completed = ResearchRun(company_id=company.id, source_url="https://8.8.8.8/", status="completed")
    session.add_all([pending, running, completed])
    session.commit()
    ids = (pending.id, running.id, completed.id)
    session.close()
    db.close()

    assert jobs.recover_interrupted_runs() == 2
    session = TestSessionLocal()
    try:
        assert session.get(ResearchRun, ids[0]).status == "failed"
        assert session.get(ResearchRun, ids[1]).status == "failed"
        assert session.get(ResearchRun, ids[2]).status == "completed"
        assert "interrupted" in session.get(ResearchRun, ids[0]).error_message.lower()
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
    company, run_id = _make_run(db)
    session = TestSessionLocal()
    page = ResearchPage(run_id=run_id, url="https://8.8.8.8/retry", status="failed", status_detail="earlier failure")
    session.add(page)
    session.commit()
    session.refresh(page)
    page_id = page.id
    session.close()

    def fetch_text(url, **kwargs):
        html = (
            "<html><head><title>Retry Page</title>"
            "<meta name='description' content='Acme helps product teams plan and ship software with less overhead.'>"
            "</head><body><main><p>" + LONG_TEXT + "</p></main></body></html>"
        )
        return html, url

    monkeypatch.setattr(jobs, "fetch_text", fetch_text)
    monkeypatch.setattr(jobs, "fetch_robots_policy", lambda url: RobotsPolicy(parser=None, allow_all=True))
    with patch.object(jobs, "crawl_site", return_value=[]):
        retried = jobs.retry_failed_page(db, run_id, page_id, company.id)
    # The background thread may race the readback; both states are valid.
    assert retried.status in ("pending", "scanned")

    page = _wait_page_status(page_id, "scanned")
    assert page is not None
    assert page.status == "scanned"
    assert page.title == "Retry Page"
    assert page.extracted_text

    session = TestSessionLocal()
    try:
        run = session.get(ResearchRun, run_id)
        assert run.status == "completed"
        evidence = session.execute(
            select(Evidence).where(Evidence.source_url == "https://8.8.8.8/retry", Evidence.company_id == company.id)
        ).scalars().all()
        assert len(evidence) == 1
        assert "product teams" in evidence[0].extracted_statement
    finally:
        session.close()
