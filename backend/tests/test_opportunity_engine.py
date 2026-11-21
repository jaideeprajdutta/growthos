"""Opportunity generation engine tests (app/opportunities/engine.py)."""

from unittest.mock import patch

from sqlalchemy import select

from app.ai.client import StructuredResult, Usage
from app.models import Evidence, OpportunityEvidence, ResearchRun
from app.opportunities import generate_opportunities
from app.opportunities.engine import OpportunitiesPayload, OpportunityGenPayload
from app.models.base import utc_now
from tests.helpers import make_company


def _evidence(db, company, run, source_url, statement):
    evidence = Evidence(
        run_id=run.id,
        company_id=company.id,
        source_url=source_url,
        source_type="website",
        dimension="website",
        extracted_statement=statement,
        classification="observed",
        verification_status="unverified",
        collected_at=utc_now(),
    )
    db.add(evidence)
    db.commit()
    db.refresh(evidence)
    return evidence


def test_generate_opportunities_creates_evidence_linked_records(db):
    company = make_company(db)
    run = ResearchRun(company_id=company.id, source_url="https://8.8.8.8/")
    db.add(run)
    db.commit()
    db.refresh(run)
    evidence = _evidence(db, company, run, "https://8.8.8.8/page", "Blog drives traffic")

    payload = OpportunitiesPayload(
        opportunities=[
            OpportunityGenPayload(
                title="Publish weekly blog",
                description="Content marketing drives signups.",
                growth_category="Acquisition",
                target_outcome="More qualified leads",
                intervention="Launch a weekly blog with SEO titles.",
                evidence_ids=[evidence.id],
                expected_impact="Higher organic signup volume.",
                confidence=0.65,
                effort=6,
            ),
            OpportunityGenPayload(
                title="Publish weekly blog",
                description="duplicate of the first opportunity",
                growth_category="Acquisition",
                target_outcome="x",
                intervention="y",
                expected_impact="z",
                confidence=0.4,
                effort=5,
            ),
        ]
    )
    result = StructuredResult(payload, Usage(5, 4, "test-model"), "test-model")
    with patch("app.opportunities.engine.generate_structured", return_value=result):
        created = generate_opportunities(db, company.id)

    assert len(created) == 1
    opp = created[0]
    assert opp.status == "discovered"
    assert opp.priority_score is not None
    assert opp.supporting_evidence
    links = db.execute(select(OpportunityEvidence).where(OpportunityEvidence.opportunity_id == opp.id)).scalars().all()
    assert [link.evidence_id for link in links] == [evidence.id]


def test_generate_opportunities_isolated_by_company(db):
    company = make_company(db)
    other = make_company(db, name="Other")
    run = ResearchRun(company_id=company.id, source_url="https://8.8.8.8/")
    db.add(run)
    db.commit()
    db.refresh(run)
    evidence = _evidence(db, company, run, "https://8.8.8.8/page", "A")

    payload = OpportunitiesPayload(
        opportunities=[
            OpportunityGenPayload(
                title="For Other",
                description="d",
                growth_category="g",
                target_outcome="t",
                intervention="i",
                expected_impact="e",
                evidence_ids=[evidence.id],
                confidence=0.5,
                effort=5,
            )
        ]
    )
    result = StructuredResult(payload, Usage(), "test-model")
    with patch("app.opportunities.engine.generate_structured", return_value=result):
        created = generate_opportunities(db, other.id)

    assert len(created) == 1
    links = db.execute(select(OpportunityEvidence).where(OpportunityEvidence.opportunity_id == created[0].id)).scalars().all()
    assert links == []
