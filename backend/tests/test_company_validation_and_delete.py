"""Company URL validation and Phase 2 delete-cascade tests."""

from sqlalchemy import func, select

from app.models import (
    CompanyIntelligenceProfile,
    DiagnosticFinding,
    DiagnosticRun,
    Evidence,
    Experiment,
    IntelligenceFinding,
    IntelligenceReport,
    Opportunity,
    OpportunityEvidence,
    ResearchPage,
    ResearchRun,
)
from app.models.base import utc_now


def test_invalid_company_websites_are_rejected(client):
    for website in ("not-a-url", "ftp://example.com", "https://user:pass@example.com", "javascript:alert(1)"):
        response = client.post("/api/v1/companies", json={"name": f"Bad {website}", "website": website})
        assert response.status_code == 422, website


def test_empty_company_website_is_allowed(client):
    response = client.post("/api/v1/companies", json={"name": "No Site", "website": ""})
    assert response.status_code == 201
    assert response.json()["website"] == ""


def test_invalid_website_update_is_rejected(client):
    company = client.post("/api/v1/companies", json={"name": "Valid Co", "website": "https://valid.example"}).json()
    response = client.put(f"/api/v1/companies/{company['id']}", json={"website": "not-a-url"})
    assert response.status_code == 422


def test_delete_company_removes_phase2_records(client, db):
    company = client.post("/api/v1/companies", json={"name": "Cascade Co", "website": "https://cascade.example"}).json()
    company_id = company["id"]

    run = ResearchRun(company_id=company_id, source_url="https://cascade.example", status="completed")
    db.add(run)
    db.flush()
    page = ResearchPage(run_id=run.id, url="https://cascade.example/", status="scanned", word_count=10)
    db.add(page)
    db.flush()
    evidence = Evidence(
        run_id=run.id,
        company_id=company_id,
        source_url="https://cascade.example/",
        source_type="website",
        dimension="website",
        classification="observed",
        verification_status="unverified",
        collected_at=utc_now(),
    )
    db.add(evidence)
    db.flush()
    opportunity = Opportunity(company_id=company_id, title="Cascade opp", status="discovered")
    db.add(opportunity)
    db.flush()
    db.add(OpportunityEvidence(opportunity_id=opportunity.id, evidence_id=evidence.id))
    db.add(Experiment(company_id=company_id, hypothesis="Cascade experiment", opportunity_id=opportunity.id))
    profile = CompanyIntelligenceProfile(company_id=company_id, version=1, provenance={})
    db.add(profile)
    db.flush()
    db.add(
        IntelligenceReport(
            company_id=company_id,
            run_id=run.id,
            version=1,
            executive_summary="Summary",
            sections={},
            findings_count=1,
        )
    )
    db.add(
        IntelligenceFinding(
            company_id=company_id,
            run_id=run.id,
            dimension="positioning",
            title="Finding",
            category="strength",
            status="active",
        )
    )
    diagnostic_run = DiagnosticRun(company_id=company_id)
    db.add(diagnostic_run)
    db.flush()
    db.add(
        DiagnosticFinding(
            run_id=diagnostic_run.id,
            company_id=company_id,
            dimension="acquisition",
            category="confirmed_issue",
        )
    )
    db.commit()

    response = client.delete(f"/api/v1/companies/{company_id}")
    assert response.status_code == 204
    db.expire_all()

    for model in (
        CompanyIntelligenceProfile,
        DiagnosticFinding,
        DiagnosticRun,
        Evidence,
        Experiment,
        IntelligenceFinding,
        IntelligenceReport,
        Opportunity,
        OpportunityEvidence,
        ResearchPage,
        ResearchRun,
    ):
        column = model.company_id if hasattr(model, "company_id") else None
        query = select(func.count()).select_from(model)
        if column is not None:
            query = query.where(column == company_id)
        assert db.execute(query).scalar_one() == 0, model.__name__
