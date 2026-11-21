"""ResearchRun/ResearchPage repository tests (app/repositories/research_repository.py)."""

import pytest

from app.core.exceptions import NotFoundError
from app.models import ResearchPage, ResearchRun
from app.repositories import research_repository
from tests.helpers import make_company


def _make_run_and_page(db, company):
    run = ResearchRun(company_id=company.id, source_url="https://8.8.8.8/")
    db.add(run)
    db.commit()
    db.refresh(run)
    page = ResearchPage(run_id=run.id, url="https://8.8.8.8/x")
    db.add(page)
    db.commit()
    db.refresh(page)
    return run, page


def test_research_repository_scoping_and_notfound(db):
    company = make_company(db)
    other = make_company(db, name="Other")
    run, page = _make_run_and_page(db, company)

    assert research_repository.get_research_run(db, company.id, run.id).id == run.id
    with pytest.raises(NotFoundError):
        research_repository.get_research_run(db, other.id, run.id)
    assert research_repository.get_research_page(db, company.id, page.id).id == page.id
    with pytest.raises(NotFoundError):
        research_repository.get_research_page(db, other.id, page.id)
    assert [r.id for r in research_repository.list_research_runs(db, company.id)] == [run.id]
    assert [p.id for p in research_repository.list_research_pages(db, company.id, run.id)] == [page.id]
