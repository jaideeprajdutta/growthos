"""Opportunity repository — CRUD scoped by company."""

from collections.abc import Sequence

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundError
from app.models import Opportunity
from app.schemas.opportunities import OpportunityCreate, OpportunityUpdate


def create_opportunity(db: Session, company_id: str, data: OpportunityCreate) -> Opportunity:
    opportunity = Opportunity(
        company_id=company_id,
        title=data.title,
        description=data.description or "",
        supporting_evidence=data.supportingEvidence or "",
        expected_impact=data.expectedImpact or "",
        confidence=data.confidence,
        effort=data.effort,
        risk=data.risk or "",
        priority_score=data.priorityScore,
        status=data.status,
        recommended_next_action=data.recommendedNextAction or "",
    )
    db.add(opportunity)
    db.commit()
    db.refresh(opportunity)
    return opportunity


def list_opportunities(db: Session, company_id: str) -> Sequence[Opportunity]:
    return db.execute(
        select(Opportunity)
        .where(Opportunity.company_id == company_id)
        .order_by(Opportunity.created_at.desc(), Opportunity.id.desc())
    ).scalars().all()


def _get_scoped(db: Session, opportunity_id: str, company_id: str) -> Opportunity:
    opportunity = db.execute(
        select(Opportunity).where(Opportunity.id == opportunity_id, Opportunity.company_id == company_id)
    ).scalar_one_or_none()
    if opportunity is None:
        raise NotFoundError(f"Opportunity {opportunity_id} not found.")
    return opportunity


def update_opportunity(db: Session, opportunity_id: str, company_id: str, data: OpportunityUpdate) -> Opportunity:
    opportunity = _get_scoped(db, opportunity_id, company_id)
    if data.title is not None:
        opportunity.title = data.title
    if data.description is not None:
        opportunity.description = data.description
    if data.supportingEvidence is not None:
        opportunity.supporting_evidence = data.supportingEvidence
    if data.expectedImpact is not None:
        opportunity.expected_impact = data.expectedImpact
    if data.confidence is not None:
        opportunity.confidence = data.confidence
    if data.effort is not None:
        opportunity.effort = data.effort
    if data.risk is not None:
        opportunity.risk = data.risk
    if data.priorityScore is not None:
        opportunity.priority_score = data.priorityScore
    if data.status is not None:
        opportunity.status = data.status
    if data.recommendedNextAction is not None:
        opportunity.recommended_next_action = data.recommendedNextAction
    db.commit()
    db.refresh(opportunity)
    return opportunity


def delete_opportunity(db: Session, opportunity_id: str, company_id: str) -> None:
    opportunity = _get_scoped(db, opportunity_id, company_id)
    db.delete(opportunity)
    db.commit()
