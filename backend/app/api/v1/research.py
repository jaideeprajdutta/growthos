"""Research routes: start, inspect and retry website-research jobs."""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.v1.dependencies import get_workspace
from app.db.session import get_db
from app.models import ResearchPage, ResearchRun
from app.models.workspaces import Workspace
from app.research import jobs
from app.research.url_safety import UnsafeUrlError, is_safe_url
from app.repositories import company_repository, research_repository
from app.schemas.research import ResearchRunOut, ResearchRunStart, ResearchPageOut, research_page_out, research_run_out

router = APIRouter(tags=["research"])


@router.post("/companies/{company_id}/research", response_model=ResearchRunOut, status_code=201)
def start_research(
    company_id: str,
    data: ResearchRunStart,
    db: Session = Depends(get_db),
    workspace: Workspace = Depends(get_workspace),
) -> ResearchRunOut:
    """Start a website-research job for a company. Job state is persisted."""
    company_repository.require_company(db, company_id, workspace.id)
    url = data.source_url.strip()
    try:
        is_safe_url(url)
    except UnsafeUrlError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    run_id = jobs.start_research_job(company_id, url)
    run = research_repository.get_research_run(db, company_id, run_id)
    return research_run_out(run)


@router.get("/companies/{company_id}/research/runs", response_model=list[ResearchRunOut])
def list_research_runs(
    company_id: str,
    db: Session = Depends(get_db),
    workspace: Workspace = Depends(get_workspace),
) -> list[ResearchRunOut]:
    company_repository.require_company(db, company_id, workspace.id)
    return [research_run_out(run) for run in research_repository.list_research_runs(db, company_id)]


@router.get("/companies/{company_id}/research/runs/{run_id}", response_model=ResearchRunOut)
def get_research_run(
    company_id: str,
    run_id: str,
    db: Session = Depends(get_db),
    workspace: Workspace = Depends(get_workspace),
) -> ResearchRunOut:
    company_repository.require_company(db, company_id, workspace.id)
    return research_run_out(research_repository.get_research_run(db, company_id, run_id))


@router.get("/companies/{company_id}/research/runs/{run_id}/pages", response_model=list[ResearchPageOut])
def list_research_pages(
    company_id: str,
    run_id: str,
    db: Session = Depends(get_db),
    workspace: Workspace = Depends(get_workspace),
    status: Optional[str] = None,
) -> list[ResearchPageOut]:
    company_repository.require_company(db, company_id, workspace.id)
    return [research_page_out(page) for page in research_repository.list_research_pages(db, company_id, run_id, status)]


@router.get("/companies/{company_id}/research/pages/{page_id}", response_model=ResearchPageOut)
def get_research_page(
    company_id: str,
    page_id: str,
    db: Session = Depends(get_db),
    workspace: Workspace = Depends(get_workspace),
) -> ResearchPageOut:
    company_repository.require_company(db, company_id, workspace.id)
    return research_page_out(research_repository.get_research_page(db, company_id, page_id))


@router.post("/companies/{company_id}/research/pages/{page_id}/retry", response_model=ResearchPageOut, status_code=202)
def retry_research_page(
    company_id: str,
    page_id: str,
    db: Session = Depends(get_db),
    workspace: Workspace = Depends(get_workspace),
) -> ResearchPageOut:
    """Reset a failed page to pending and re-fetch it in the background."""
    company_repository.require_company(db, company_id, workspace.id)
    page = research_repository.get_research_page(db, company_id, page_id)
    page = jobs.retry_failed_page(db, page.run_id, page.id, company_id)
    return research_page_out(page)
