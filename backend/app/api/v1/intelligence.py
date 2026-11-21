"""Intelligence routes: company understanding and intelligence reports."""

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.v1.dependencies import get_workspace
from app.db.session import get_db
from app.intelligence import generate_intelligence_report, get_company_understanding
from app.models import IntelligenceFinding, IntelligenceReport
from app.models.workspaces import Workspace
from app.repositories import company_repository
from app.schemas.intelligence import (
    CompanyIntelligenceProfileOut,
    IntelligenceReportOut,
    company_intelligence_profile_out,
    intelligence_finding_out,
    intelligence_report_out,
)

router = APIRouter(tags=["intelligence"])


@router.get("/companies/{company_id}/intelligence", response_model=CompanyIntelligenceProfileOut | None)
def get_intelligence_profile(
    company_id: str,
    db: Session = Depends(get_db),
    workspace: Workspace = Depends(get_workspace),
) -> CompanyIntelligenceProfileOut | None:
    """Return the company's intelligence profile (or null before generation)."""
    company_repository.require_company(db, company_id, workspace.id)
    profile = get_company_understanding(db, company_id)
    return company_intelligence_profile_out(profile) if profile is not None else None


@router.post("/companies/{company_id}/intelligence/generate", response_model=IntelligenceReportOut)
def generate_intelligence(
    company_id: str,
    db: Session = Depends(get_db),
    workspace: Workspace = Depends(get_workspace),
    force_refresh: bool = False,
) -> IntelligenceReportOut:
    """Generate (or reuse) the company's intelligence report."""
    company_repository.require_company(db, company_id, workspace.id)
    report = generate_intelligence_report(db, company_id, force_refresh=force_refresh)
    findings = db.execute(
        select(IntelligenceFinding)
        .where(IntelligenceFinding.company_id == company_id)
        .order_by(IntelligenceFinding.created_at, IntelligenceFinding.id)
    ).scalars().all()
    return intelligence_report_out(report, findings)


@router.get("/companies/{company_id}/reports", response_model=list[IntelligenceReportOut])
def list_reports(
    company_id: str,
    db: Session = Depends(get_db),
    workspace: Workspace = Depends(get_workspace),
) -> list[IntelligenceReportOut]:
    company_repository.require_company(db, company_id, workspace.id)
    reports = db.execute(
        select(IntelligenceReport)
        .where(IntelligenceReport.company_id == company_id)
        .order_by(IntelligenceReport.generated_at.desc(), IntelligenceReport.id.desc())
    ).scalars().all()
    results = []
    for report in reports:
        findings = (
            db.execute(
                select(IntelligenceFinding)
                .where(
                    IntelligenceFinding.company_id == company_id,
                    IntelligenceFinding.run_id == report.run_id,
                )
                .order_by(IntelligenceFinding.created_at, IntelligenceFinding.id)
            ).scalars().all()
            if report.run_id
            else []
        )
        results.append(intelligence_report_out(report, findings))
    return results
