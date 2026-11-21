"""Evidence repository — traceable, company-scoped evidence records."""

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Evidence, ResearchPage
from app.models.base import utc_now


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


def create_page_evidence(db: Session, run, page: ResearchPage, excerpt_chars: int = 4000) -> Evidence:
    """Create evidence records for a scanned research page."""
    text = page.extracted_text or ""
    statement = (page.title or "").strip()
    if not statement and text:
        statement = (text.split(".")[0] + ".").strip()
    evidence = Evidence(
        run_id=run.id,
        company_id=run.company_id,
        source_url=page.url,
        source_title=page.title or None,
        source_type="website",
        extracted_statement=(statement[:500] or None) if statement else None,
        supporting_excerpt=text[:excerpt_chars] or None,
        observation_date=page.extracted_at.strftime("%Y-%m-%d") if page.extracted_at else None,
        collected_at=utc_now(),
        dimension="website",
        classification="observed",
        reliability_json={
            "source": "website",
            "directness": "high",
            "relevance": "medium",
            "recency": page.extracted_at.isoformat() if page.extracted_at else None,
        },
        verification_status="unverified",
    )
    db.add(evidence)
    return evidence
