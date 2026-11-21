"""Evidence repository tests (app/repositories/evidence_repository.py)."""

from app.models import Evidence, ResearchPage, ResearchRun
from app.models.base import utc_now
from app.repositories import evidence_repository
from tests.helpers import make_company


def _make_run_and_page(db, company):
    run = ResearchRun(company_id=company.id, source_url="https://8.8.8.8/")
    db.add(run)
    db.commit()
    db.refresh(run)
    page = ResearchPage(
        run_id=run.id,
        url="https://8.8.8.8/about",
        status="scanned",
        title="About Us",
        extracted_text="company news and products",
        word_count=4,
        extracted_at=utc_now(),
    )
    db.add(page)
    db.commit()
    db.refresh(page)
    return run, page


def test_create_page_evidence_sets_fields(db):
    company = make_company(db)
    run, page = _make_run_and_page(db, company)
    evidence = evidence_repository.create_page_evidence(db, run=run, page=page)
    db.commit()
    assert evidence.id
    assert evidence.run_id == run.id
    assert evidence.company_id == company.id
    assert evidence.source_url == "https://8.8.8.8/about"
    assert evidence.source_title == "About Us"
    assert evidence.source_type == "website"
    assert evidence.dimension == "website"
    assert evidence.classification == "observed"
    assert evidence.verification_status == "unverified"
    assert evidence.collected_at is not None
    assert evidence.extracted_statement
    assert evidence.supporting_excerpt


def test_list_evidence_scoped_by_company(db):
    company = make_company(db)
    other = make_company(db, name="Other")
    run, page = _make_run_and_page(db, company)
    evidence_repository.create_page_evidence(db, run=run, page=page)
    db.commit()
    listed = evidence_repository.list_evidence(db, company.id)
    assert [e.company_id for e in listed] == [company.id]
    assert evidence_repository.list_evidence(db, other.id) == []


def test_get_evidence_scoped(db):
    company = make_company(db)
    other = make_company(db, name="Other")
    run, page = _make_run_and_page(db, company)
    evidence = evidence_repository.create_page_evidence(db, run=run, page=page)
    db.commit()
    assert evidence_repository.get_evidence(db, evidence.id, company.id).id == evidence.id
    assert evidence_repository.get_evidence(db, evidence.id, other.id) is None
