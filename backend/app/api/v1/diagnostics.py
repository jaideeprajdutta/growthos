"""Diagnostic routes: run diagnostics and list diagnostic findings."""

from typing import Optional

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.v1.dependencies import get_workspace
from app.db.session import get_db
from app.diagnostics import generate_diagnostics
from app.models import DiagnosticFinding, DiagnosticRun
from app.models.workspaces import Workspace
from app.repositories import company_repository
from app.schemas.diagnostics import DiagnosticFindingOut, DiagnosticRunOut, diagnostic_finding_out, diagnostic_run_out

router = APIRouter(tags=["diagnostics"])


@router.post("/companies/{company_id}/diagnostics/generate", response_model=DiagnosticRunOut)
def generate_diagnostic(
    company_id: str,
    db: Session = Depends(get_db),
    workspace: Workspace = Depends(get_workspace),
) -> DiagnosticRunOut:
    """Run the diagnostic engine for a company."""
    company_repository.require_company(db, company_id, workspace.id)
    return diagnostic_run_out(generate_diagnostics(db, company_id))


@router.get("/companies/{company_id}/diagnostic-runs", response_model=list[DiagnosticRunOut])
def list_diagnostic_runs(
    company_id: str,
    db: Session = Depends(get_db),
    workspace: Workspace = Depends(get_workspace),
) -> list[DiagnosticRunOut]:
    company_repository.require_company(db, company_id, workspace.id)
    runs = db.execute(
        select(DiagnosticRun).where(DiagnosticRun.company_id == company_id).order_by(DiagnosticRun.created_at.desc())
    ).scalars().all()
    return [diagnostic_run_out(run) for run in runs]


@router.get("/companies/{company_id}/diagnostic-runs/{run_id}/findings", response_model=list[DiagnosticFindingOut])
def list_diagnostic_run_findings(
    company_id: str,
    run_id: str,
    db: Session = Depends(get_db),
    workspace: Workspace = Depends(get_workspace),
) -> list[DiagnosticFindingOut]:
    company_repository.require_company(db, company_id, workspace.id)
    findings = db.execute(
        select(DiagnosticFinding)
        .where(DiagnosticFinding.company_id == company_id, DiagnosticFinding.run_id == run_id)
        .order_by(DiagnosticFinding.created_at, DiagnosticFinding.id)
    ).scalars().all()
    return [diagnostic_finding_out(finding) for finding in findings]


@router.get("/companies/{company_id}/diagnostic-findings", response_model=list[DiagnosticFindingOut])
def list_diagnostic_findings(
    company_id: str,
    db: Session = Depends(get_db),
    workspace: Workspace = Depends(get_workspace),
) -> list[DiagnosticFindingOut]:
    company_repository.require_company(db, company_id, workspace.id)
    findings = db.execute(
        select(DiagnosticFinding).where(DiagnosticFinding.company_id == company_id).order_by(DiagnosticFinding.created_at, DiagnosticFinding.id)
    ).scalars().all()
    return [diagnostic_finding_out(finding) for finding in findings]
