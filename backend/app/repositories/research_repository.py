"""ResearchRun/ResearchPage repository."""

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundError
from app.models import ResearchPage, ResearchRun


def list_research_runs(db: Session, company_id: str) -> list[ResearchRun]:
    return db.execute(
        select(ResearchRun)
        .where(ResearchRun.company_id == company_id)
        .order_by(ResearchRun.started_at.desc(), ResearchRun.id.desc())
    ).scalars().all()


def get_research_run(db: Session, company_id: str, run_id: str) -> ResearchRun:
    run = db.execute(
        select(ResearchRun).where(ResearchRun.id == run_id, ResearchRun.company_id == company_id)
    ).scalar_one_or_none()
    if run is None:
        raise NotFoundError(f"Research run {run_id} not found.")
    return run


def list_research_pages(
    db: Session,
    company_id: str,
    run_id: str,
    status: str | None = None,
) -> list[ResearchPage]:
    query = (
        select(ResearchPage)
        .join(ResearchRun, ResearchRun.id == ResearchPage.run_id)
        .where(ResearchPage.run_id == run_id, ResearchRun.company_id == company_id)
    )
    if status:
        query = query.where(ResearchPage.status == status)
    return db.execute(query.order_by(ResearchPage.created_at.desc(), ResearchPage.id.desc())).scalars().all()


def get_research_page(db: Session, company_id: str, page_id: str) -> ResearchPage:
    page = db.execute(
        select(ResearchPage)
        .join(ResearchRun, ResearchRun.id == ResearchPage.run_id)
        .where(ResearchPage.id == page_id, ResearchRun.company_id == company_id)
    ).scalar_one_or_none()
    if page is None:
        raise NotFoundError(f"Research page {page_id} not found.")
    return page
