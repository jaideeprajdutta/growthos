"""Deterministic opportunity scoring and normalized duplicate handling (app/opportunities/*)."""

from unittest.mock import patch

from sqlalchemy import select

from app.ai.client import StructuredResult, Usage
from app.models import Opportunity, OpportunityEvidence
from app.opportunities import generate_opportunities, scoring
from app.opportunities.engine import OpportunitiesPayload, OpportunityGenPayload
from tests.helpers import make_company


def test_score_is_deterministic_and_explainable():
    opp = Opportunity(company_id="x", title="T", confidence=80, effort=3, status="discovered")
    expected = round(80 * scoring.DEFAULT_WEIGHTS["confidence"] / 100) + round(
        (10 - 3) * scoring.DEFAULT_WEIGHTS["effort"] / 10
    )
    assert scoring.score_opportunity(opp) == expected
    assert scoring.score_opportunity(Opportunity(company_id="x", title="T")) == scoring.score_opportunity(
        Opportunity(company_id="x", title="T")
    )


def test_score_clamps_to_valid_range():
    assert scoring.score_opportunity(Opportunity(company_id="x", title="T", confidence=150)) <= 100
    assert scoring.score_opportunity(Opportunity(company_id="x", title="T", effort=0)) >= 0


def _gen(title, **kwargs):
    defaults = dict(
        description="d", growth_category="g", target_outcome="t", intervention="i",
        expected_impact="e", confidence=0.5, effort=5,
    )
    defaults.update(kwargs)
    return OpportunityGenPayload(title=title, **defaults)


def test_generate_opportunities_ignores_ai_supplied_priority_score(db):
    company = make_company(db)
    payload = OpportunitiesPayload(opportunities=[_gen("Launch campaign", priority_score=99)])
    result = StructuredResult(payload, Usage(5, 4, "test-model"), "test-model")
    with patch("app.opportunities.engine.generate_structured", return_value=result):
        created = generate_opportunities(db, company.id)
    assert len(created) == 1
    assert created[0].priority_score == scoring.score_opportunity(created[0])


def test_generate_opportunities_skips_normalized_duplicate_titles(db):
    company = make_company(db)
    payload = OpportunitiesPayload(
        opportunities=[
            _gen("Launch Campaign!", confidence=0.5, effort=5),
            _gen("  launch campaign", confidence=0.4, effort=5),
            _gen("Other thing", confidence=0.6, effort=5),
        ]
    )
    result = StructuredResult(payload, Usage(5, 4, "test-model"), "test-model")
    with patch("app.opportunities.engine.generate_structured", return_value=result):
        created = generate_opportunities(db, company.id)
    assert [opportunity.title for opportunity in created] == ["Launch Campaign!", "Other thing"]


def test_generate_opportunities_filters_invalid_evidence_ids(db):
    company = make_company(db)
    payload = OpportunitiesPayload(
        opportunities=[_gen("Bogus links", evidence_ids=["nope", "also-nope"])]
    )
    result = StructuredResult(payload, Usage(5, 4, "test-model"), "test-model")
    with patch("app.opportunities.engine.generate_structured", return_value=result):
        created = generate_opportunities(db, company.id)
    links = db.execute(select(OpportunityEvidence).where(OpportunityEvidence.opportunity_id == created[0].id)).scalars().all()
    assert links == []
    assert created[0].supporting_evidence == ""
