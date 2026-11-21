"""Evidence routes: list and inspect traceable evidence."""

from typing import Optional

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.v1.dependencies import get_workspace
from app.core.exceptions import NotFoundError
from app.db.session import get_db
from app.models.workspaces import Workspace
from app.repositories import company_repository, evidence_repository
from app.schemas.evidence import EvidenceOut, evidence_out

router = APIRouter(tags=["evidence"])


@router.get("/companies/{company_id}/evidence", response_model=list[EvidenceOut])
def list_evidence(
    company_id: str,
    db: Session = Depends(get_db),
    workspace: Workspace = Depends(get_workspace),
    run_id: Optional[str] = None,
    dimension: Optional[str] = None,
    limit: int = 200,
) -> list[EvidenceOut]:
    """List evidence for a company, optionally filtered by run or dimension."""
    company_repository.require_company(db, company_id, workspace.id)
    return [
        evidence_out(evidence)
        for evidence in evidence_repository.list_evidence(db, company_id, run_id=run_id, dimension=dimension, limit=limit)
    ]


@router.get("/companies/{company_id}/evidence/{evidence_id}", response_model=EvidenceOut)
def get_evidence(
    company_id: str,
    evidence_id: str,
    db: Session = Depends(get_db),
    workspace: Workspace = Depends(get_workspace),
) -> EvidenceOut:
    company_repository.require_company(db, company_id, workspace.id)
    evidence = evidence_repository.get_evidence(db, evidence_id, company_id)
    if evidence is None:
        raise NotFoundError(f"Evidence {evidence_id} not found.")
    return evidence_out(evidence)
