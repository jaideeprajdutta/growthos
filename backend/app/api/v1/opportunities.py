"""Opportunity routes: create, list, update, delete, detail, status, experiments, evidence."""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.v1.dependencies import get_workspace
from app.core.exceptions import NotFoundError
from app.db.session import get_db
from app.models import Experiment, Evidence, Opportunity, OpportunityEvidence
from app.models.workspaces import Workspace
from app.opportunities import scoring
from app.repositories import activity_log_repository, company_repository, experiment_repository, opportunity_repository
from app.schemas.experiments import ExperimentOut, experiment_out
from app.schemas.opportunities import (
    LinkEvidenceOut,
    LinkEvidenceRequest,
    OpportunityCreate,
    OpportunityDetailOut,
    OpportunityOut,
    OpportunityStatusUpdate,
    OpportunityUpdate,
    opportunity_detail_out,
    opportunity_out,
)

router = APIRouter(tags=["opportunities"])


@router.post("/companies/{company_id}/opportunities", response_model=OpportunityOut, status_code=201)
def create_opportunity(
    company_id: str,
    data: OpportunityCreate,
    db: Session = Depends(get_db),
    workspace: Workspace = Depends(get_workspace),
) -> OpportunityOut:
    company_repository.require_company(db, company_id, workspace.id)
    opportunity = opportunity_repository.create_opportunity(db, company_id, data)
    return opportunity_out(opportunity)


@router.get("/companies/{company_id}/opportunities", response_model=list[OpportunityOut])
def list_opportunities(
    company_id: str,
    db: Session = Depends(get_db),
    workspace: Workspace = Depends(get_workspace),
) -> list[OpportunityOut]:
    company_repository.require_company(db, company_id, workspace.id)
    return [opportunity_out(opportunity) for opportunity in opportunity_repository.list_opportunities(db, company_id)]


@router.put("/companies/{company_id}/opportunities/{opportunity_id}", response_model=OpportunityOut)
def update_opportunity(
    company_id: str,
    opportunity_id: str,
    data: OpportunityUpdate,
    db: Session = Depends(get_db),
    workspace: Workspace = Depends(get_workspace),
) -> OpportunityOut:
    company_repository.require_company(db, company_id, workspace.id)
    opportunity = opportunity_repository.update_opportunity(db, opportunity_id, company_id, data)
    return opportunity_out(opportunity)


@router.delete("/companies/{company_id}/opportunities/{opportunity_id}", status_code=204)
def delete_opportunity(
    company_id: str,
    opportunity_id: str,
    db: Session = Depends(get_db),
    workspace: Workspace = Depends(get_workspace),
) -> None:
    company_repository.require_company(db, company_id, workspace.id)
    opportunity_repository.delete_opportunity(db, opportunity_id, company_id)


@router.get("/companies/{company_id}/opportunities/{opportunity_id}", response_model=OpportunityDetailOut)
def get_opportunity_detail(
    company_id: str,
    opportunity_id: str,
    db: Session = Depends(get_db),
    workspace: Workspace = Depends(get_workspace),
) -> OpportunityDetailOut:
    """Full opportunity detail: the record, linked evidence and linked experiments."""
    company_repository.require_company(db, company_id, workspace.id)
    opportunity = opportunity_repository.get_opportunity(db, opportunity_id, company_id)
    if opportunity is None:
        raise NotFoundError(f"Opportunity {opportunity_id} not found.")
    evidence_ids = list(
        db.execute(
            select(OpportunityEvidence.evidence_id)
            .where(OpportunityEvidence.opportunity_id == opportunity.id)
            .order_by(OpportunityEvidence.created_at, OpportunityEvidence.id)
        ).scalars().all()
    )
    experiments = experiment_repository.list_experiments_by_opportunity(db, opportunity.id)
    return opportunity_detail_out(
        opportunity,
        evidence_ids,
        opportunity.diagnostic_finding_id,
        [experiment_out(experiment) for experiment in experiments],
    )


@router.put("/companies/{company_id}/opportunities/{opportunity_id}/status", response_model=OpportunityOut)
def update_opportunity_status(
    company_id: str,
    opportunity_id: str,
    data: OpportunityStatusUpdate,
    db: Session = Depends(get_db),
    workspace: Workspace = Depends(get_workspace),
) -> OpportunityOut:
    """Approve or reject an opportunity by setting its status. Status changes are logged."""
    company_repository.require_company(db, company_id, workspace.id)
    opportunity = opportunity_repository.get_opportunity(db, opportunity_id, company_id)
    if opportunity is None:
        raise NotFoundError(f"Opportunity {opportunity_id} not found.")
    opportunity.status = data.status
    if opportunity.priority_score is None:
        opportunity.priority_score = scoring.score_opportunity(opportunity)
    db.commit()
    db.refresh(opportunity)
    activity_log_repository.log_activity(
        db,
        company_id,
        "opportunity_status_changed",
        f"Opportunity status changed: {opportunity.title}",
        f"Status set to {opportunity.status}.",
    )
    db.commit()
    return opportunity_out(opportunity)


@router.post("/companies/{company_id}/opportunities/{opportunity_id}/experiments", response_model=ExperimentOut, status_code=201)
def create_experiment_for_opportunity(
    company_id: str,
    opportunity_id: str,
    db: Session = Depends(get_db),
    workspace: Workspace = Depends(get_workspace),
) -> ExperimentOut:
    """Create a proposed experiment linked to the opportunity (experiment creation handoff)."""
    company_repository.require_company(db, company_id, workspace.id)
    opportunity = opportunity_repository.get_opportunity(db, opportunity_id, company_id)
    if opportunity is None:
        raise NotFoundError(f"Opportunity {opportunity_id} not found.")
    experiment = Experiment(
        company_id=company_id,
        opportunity_id=opportunity.id,
        hypothesis=(opportunity.description or opportunity.title).strip() or "Experiment for opportunity.",
        status="proposed",
    )
    db.add(experiment)
    db.commit()
    db.refresh(experiment)
    activity_log_repository.log_activity(
        db,
        company_id,
        "experiment_created",
        f"Experiment created for opportunity: {opportunity.title}",
    )
    db.commit()
    return experiment_out(experiment)


@router.post("/companies/{company_id}/opportunities/{opportunity_id}/evidence", response_model=LinkEvidenceOut)
def link_evidence_to_opportunity(
    company_id: str,
    opportunity_id: str,
    data: LinkEvidenceRequest,
    db: Session = Depends(get_db),
    workspace: Workspace = Depends(get_workspace),
) -> LinkEvidenceOut:
    """Link existing evidence records to an opportunity."""
    company_repository.require_company(db, company_id, workspace.id)
    opportunity = opportunity_repository.get_opportunity(db, opportunity_id, company_id)
    if opportunity is None:
        raise NotFoundError(f"Opportunity {opportunity_id} not found.")
    valid_ids = set(db.execute(select(Evidence.id).where(Evidence.company_id == company_id)).scalars().all())
    existing_ids = set(
        db.execute(
            select(OpportunityEvidence.evidence_id).where(OpportunityEvidence.opportunity_id == opportunity.id)
        ).scalars().all()
    )
    for evidence_id in data.evidenceIds:
        if evidence_id not in valid_ids:
            raise HTTPException(status_code=422, detail=f"Evidence {evidence_id} does not exist for this company.")
        if evidence_id not in existing_ids:
            db.add(OpportunityEvidence(opportunity_id=opportunity.id, evidence_id=evidence_id))
            existing_ids.add(evidence_id)
    db.commit()
    return LinkEvidenceOut(opportunityId=opportunity.id, linkedEvidenceIds=data.evidenceIds)
