"""Evidence repository — traceable, company-scoped evidence records."""

import re

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.models import Evidence, ResearchPage
from app.models.base import utc_now

MIN_STATEMENT_CHARS = 40
MAX_STATEMENT_CHARS = 500


def list_evidence(
    db: Session,
    company_id: str,
    run_id: str | None = None,
    dimension: str | None = None,
    limit: int = 200,
) -> list[Evidence]:
    query = select(Evidence).where(Evidence.company_id == company_id)
    if run_id:
        query = query.where(Evidence.run_id == run_id)
    if dimension:
        query = query.where(Evidence.dimension == dimension)
    return db.execute(query.order_by(Evidence.collected_at.desc(), Evidence.id.desc()).limit(limit)).scalars().all()


def get_evidence(db: Session, evidence_id: str, company_id: str) -> Evidence | None:
    return db.execute(
        select(Evidence).where(Evidence.id == evidence_id, Evidence.company_id == company_id)
    ).scalar_one_or_none()


def _statement_from_text(text: str) -> str:
    for sentence in re.split(r"(?<=[.!?])\s+", text):
        cleaned = sentence.strip()
        if len(cleaned) >= MIN_STATEMENT_CHARS:
            return cleaned[:MAX_STATEMENT_CHARS]
    return text[:MAX_STATEMENT_CHARS].strip()


def delete_page_evidence(db: Session, run_id: str, source_url: str) -> None:
    """Remove evidence for a page before re-creating it after a retry."""
    db.execute(delete(Evidence).where(Evidence.run_id == run_id, Evidence.source_url == source_url))


def create_page_evidence(
    db: Session,
    run,
    page: ResearchPage,
    excerpt_chars: int = 4000,
    statement: str | None = None,
) -> Evidence:
    """Create or refresh the evidence record for a scanned research page.

    The statement prefers the page summary (meta description or first
    meaningful sentence), then the title, then the extracted text. The excerpt
    is the cleaned page content, so it supports the statement rather than
    starting with navigation chrome.
    """
    text = page.extracted_text or ""
    resolved_statement = (statement or "").strip()
    if len(resolved_statement) < MIN_STATEMENT_CHARS:
        resolved_statement = _statement_from_text(text) if text else (page.title or "").strip()

    values = {
        "source_title": page.title or None,
        "source_type": "website",
        "extracted_statement": resolved_statement[:MAX_STATEMENT_CHARS] or None,
        "supporting_excerpt": text[:excerpt_chars] or None,
        "observation_date": page.extracted_at.strftime("%Y-%m-%d") if page.extracted_at else None,
        "collected_at": utc_now(),
        "dimension": "website",
        "classification": "observed",
        "reliability_json": {
            "source": "website",
            "directness": "high",
            "relevance": "medium",
            "recency": page.extracted_at.isoformat() if page.extracted_at else None,
        },
        "verification_status": "unverified",
    }

    existing = db.execute(
        select(Evidence).where(Evidence.run_id == run.id, Evidence.source_url == page.url)
    ).scalar_one_or_none()
    if existing is not None:
        for field, value in values.items():
            setattr(existing, field, value)
        return existing

    evidence = Evidence(
        run_id=run.id,
        company_id=run.company_id,
        source_url=page.url,
        **values,
    )
    db.add(evidence)
    return evidence
