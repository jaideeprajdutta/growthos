"""Research job execution — persistent state machine with background threads.

States: pending → running → completed / partially_completed / failed.
Failed pages can be retried via ``retry_failed_page``.
"""

import logging
import threading
import time

from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundError
from app.db.session import SessionLocal
from app.models import ResearchPage, ResearchRun, utc_now
from app.repositories import evidence_repository
from app.research.crawler import crawl_site
from app.research.extractor import extract_page_content
from app.research.url_safety import fetch_text

logger = logging.getLogger("growthos.research")


def start_research_job(company_id: str, source_url: str) -> str:
    """Create a ``pending`` ResearchRun and start background execution; returns the run id."""
    db = SessionLocal()
    try:
        run = ResearchRun(company_id=company_id, source_url=source_url, status="pending", pages_scanned=0)
        db.add(run)
        db.commit()
        db.refresh(run)
        thread = threading.Thread(target=_execute_run, args=(run.id,), daemon=True, name=f"research-{run.id[:8]}")
        thread.start()
        logger.info("Research run %s started for company %s at %s", run.id[:8], company_id[:8], source_url)
        return run.id
    finally:
        db.close()


def _execute_run(run_id: str) -> None:
    db = SessionLocal()
    try:
        run = db.get(ResearchRun, run_id)
        if run is None or run.status in ("completed", "partially_completed", "failed"):
            return
        run.status = "running"
        run.started_at = utc_now()
        db.commit()
        pages = []
        try:
            pages = crawl_site(run.source_url)
            run.pages_scanned = len(pages)
            failed = 0
            for crawled in pages:
                page_row = ResearchPage(
                    run_id=run.id,
                    url=crawled.url,
                    status=crawled.status,
                    status_detail=crawled.status_detail,
                    title=crawled.title,
                    extracted_text=crawled.text,
                    word_count=crawled.word_count,
                    extracted_at=utc_now() if crawled.status == "scanned" else None,
                    duration_ms=crawled.duration_ms,
                )
                db.add(page_row)
                db.flush()
                if crawled.status == "scanned":
                    evidence_repository.create_page_evidence(db, run=run, page=page_row)
                else:
                    failed += 1
                db.commit()
            if not pages:
                run.status = "failed"
                run.error_message = "No pages could be fetched."
            elif failed > 0:
                run.status = "partially_completed"
                run.error_message = None
            else:
                run.status = "completed"
                run.error_message = None
        except Exception as exc:
            logger.exception("Research run %s failed", run_id[:8])
            run.status = "failed"
            run.error_message = str(exc)[:2000]
        run.finished_at = utc_now()
        db.commit()
    finally:
        db.close()


def retry_failed_page(db: Session, run_id: str, page_id: str, company_id: str) -> ResearchPage:
    """Reset a failed page to pending and re-fetch it in a background thread."""
    run = db.get(ResearchRun, run_id)
    if run is None or run.company_id != company_id:
        raise NotFoundError(f"Research run {run_id} not found.")
    page = db.get(ResearchPage, page_id)
    if page is None or page.run_id != run_id:
        raise NotFoundError(f"Research page {page_id} not found.")
    page.status = "pending"
    page.status_detail = None
    page.extracted_text = None
    page.word_count = 0
    page.extracted_at = None
    page.duration_ms = None
    db.commit()

    def _retry() -> None:
        db2 = SessionLocal()
        try:
            page2 = db2.get(ResearchPage, page_id)
            run2 = db2.get(ResearchRun, run_id)
            if page2 is None or run2 is None:
                return
            started = time.perf_counter()
            try:
                raw_text, final_url = fetch_text(page2.url)
                extracted = extract_page_content(raw_text, final_url)
                page2.status = "scanned"
                page2.status_detail = None
                page2.title = extracted.title or None
                page2.extracted_text = extracted.text or None
                page2.word_count = len(extracted.text.split())
                page2.extracted_at = utc_now()
                page2.duration_ms = int((time.perf_counter() - started) * 1000)
                db2.commit()
                evidence_repository.create_page_evidence(db2, run=run2, page=page2)
                db2.commit()
            except Exception as exc:
                page2.status = "failed"
                page2.status_detail = str(exc)[:500] or "Fetch failed."
                db2.commit()
        finally:
            db2.close()

    threading.Thread(target=_retry, daemon=True, name=f"retry-{page_id[:8]}").start()
    return page
