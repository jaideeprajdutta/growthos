"""Intelligence engine tests (app/intelligence/report.py)."""

from unittest.mock import patch

from sqlalchemy import select

from app.ai.client import StructuredResult, Usage
from app.intelligence import generate_intelligence_report
from app.intelligence.schemas import CompanyIntelligenceUpdatePayload, IntelligenceFindingPayload, IntelligenceReportPayload
from app.models import CompanyIntelligenceProfile, Evidence, IntelligenceFinding, ResearchRun
from app.models.base import utc_now
from tests.helpers import make_company


def _mock_result(payload):
    return StructuredResult(payload, Usage(10, 5, "test-model"), "test-model")


def test_generate_intelligence_report_creates_profile_and_findings(db):
    company = make_company(db)
    run = ResearchRun(company_id=company.id, source_url="https://8.8.8.8/")
    db.add(run)
    db.commit()
    db.refresh(run)
    evidence = Evidence(
        run_id=run.id,
        company_id=company.id,
        source_url="https://8.8.8.8/page",
        source_type="website",
        dimension="website",
        extracted_statement="Real statement from the source.",
        classification="observed",
        verification_status="unverified",
        collected_at=utc_now(),
    )
    db.add(evidence)
    db.commit()
    db.refresh(evidence)

    payload = IntelligenceReportPayload(
        executive_summary="Summary text.",
        sections={"business_model": "SaaS"},
        profile_update=CompanyIntelligenceUpdatePayload(value_proposition="VP text"),
        findings=[
            IntelligenceFindingPayload(
                title="Clear positioning",
                dimension="positioning",
                category="strength",
                description="The value proposition is clear to visitors.",
                evidence_ids=[evidence.id, "bogus-id"],
            )
        ],
    )
    with patch("app.intelligence.report.generate_structured", return_value=_mock_result(payload)):
        report = generate_intelligence_report(db, company.id)

    assert report.executive_summary == "Summary text."
    assert report.findings_count == 1
    findings = db.execute(select(IntelligenceFinding).where(IntelligenceFinding.company_id == company.id)).scalars().all()
    assert len(findings) == 1
    assert findings[0].title == "Clear positioning"
    assert findings[0].status == "active"
    assert findings[0].evidence_ids == [evidence.id]

    profile = (
        db.execute(select(CompanyIntelligenceProfile).where(CompanyIntelligenceProfile.company_id == company.id))
        .scalars().one()
    )
    assert profile.version == 1
    assert profile.value_proposition == "VP text"
    assert profile.source == "ai:test-model"


def test_generate_intelligence_report_force_refresh_bumps_version(db):
    company = make_company(db)
    payload = IntelligenceReportPayload(executive_summary="V2 summary")
    with patch("app.intelligence.report.generate_structured", return_value=_mock_result(payload)):
        first = generate_intelligence_report(db, company.id)
        second = generate_intelligence_report(db, company.id, force_refresh=True)
    assert first.id != second.id
    assert second.version == 2
    profile = (
        db.execute(select(CompanyIntelligenceProfile).where(CompanyIntelligenceProfile.company_id == company.id))
        .scalars().one()
    )
    assert profile.version == 2
