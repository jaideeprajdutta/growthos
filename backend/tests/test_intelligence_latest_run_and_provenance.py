"""Intelligence latest-run reuse, force refresh and provenance (app/intelligence/report.py)."""

from unittest.mock import patch

from sqlalchemy import select

from app.ai.client import StructuredResult, Usage
from app.intelligence.schemas import CompanyIntelligenceUpdatePayload, IntelligenceReportPayload
from app.intelligence.report import generate_intelligence_report
from app.models import Evidence, ResearchRun
from app.models.base import utc_now
from tests.helpers import make_company


def _report_payload(summary="Executive summary text."):
    return IntelligenceReportPayload(
        executive_summary=summary,
        sections={"business_model": "SaaS"},
        profile_update=CompanyIntelligenceUpdatePayload(value_proposition="VP text"),
        findings=[],
    )


def _report_result(summary="Executive summary text."):
    return StructuredResult(_report_payload(summary), Usage(10, 5, "test-model"), "test-model")


def _research_run(db, company):
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
        extracted_statement="A blog drives signups.",
        classification="observed",
        verification_status="unverified",
        collected_at=utc_now(),
    )
    db.add(evidence)
    db.commit()
    return run, evidence


def test_generate_intelligence_report_reuses_latest_version(db):
    company = make_company(db)
    run, _ = _research_run(db, company)
    with patch("app.intelligence.report.generate_structured", return_value=_report_result()):
        first = generate_intelligence_report(db, company.id)
        second = generate_intelligence_report(db, company.id)
    assert first.version == second.version == 1
    assert first.id == second.id


def test_generate_intelligence_report_force_refresh_creates_new_version(db):
    company = make_company(db)
    run, evidence = _research_run(db, company)
    with patch("app.intelligence.report.generate_structured", return_value=_report_result()):
        first = generate_intelligence_report(db, company.id)
        second = generate_intelligence_report(db, company.id, force_refresh=True)
    assert first.version == 1
    assert second.version == 2
    assert second.id != first.id


def test_intelligence_report_records_provenance_and_model(db):
    company = make_company(db)
    run, evidence = _research_run(db, company)
    result = StructuredResult(_report_payload(), Usage(7, 3, "my-model"), "my-model")
    with patch("app.intelligence.report.generate_structured", return_value=result):
        generate_intelligence_report(db, company.id)

    from app.models import CompanyIntelligenceProfile

    profile = db.execute(
        select(CompanyIntelligenceProfile).where(CompanyIntelligenceProfile.company_id == company.id)
    ).scalar_one()
    assert profile.source == "ai:my-model"
    provenance = profile.provenance
    assert provenance["research_run_id"] == run.id
    assert provenance["evidence_count"] >= 1
    assert provenance["model"] == "my-model"
    assert provenance["generated_at"]
