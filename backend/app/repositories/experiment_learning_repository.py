"""Outcome-review repository — records learning and feeds prioritisation."""

from datetime import datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.constants import LOCAL_ACTOR
from app.core.exceptions import DomainValidationError, NotFoundError
from app.models import CompanyIntelligenceProfile, ExperimentLearning, Opportunity
from app.models.base import utc_now
from app.opportunities import scoring
from app.repositories import evidence_repository, experiment_repository
from app.schemas.experiment_learnings import LearningCreate, LearningUpdate

OUTCOME_ADJUSTMENTS = {"successful": 5, "unsuccessful": -10, "inconclusive": 0}


def get_learning(db: Session, experiment_id: str, company_id: str) -> ExperimentLearning | None:
    return db.execute(
        select(ExperimentLearning).where(
            ExperimentLearning.experiment_id == experiment_id, ExperimentLearning.company_id == company_id
        )
    ).scalar_one_or_none()


def _summary(outcome: str, what_changed: str, next_steps: str) -> str:
    text = (what_changed or "").strip() or (next_steps or "").strip() or outcome
    return text[:2000]


def _write_back(
    db: Session,
    experiment,
    outcome: str,
    summary: str,
    recorded_at: datetime,
) -> None:
    experiment.outcome = outcome
    experiment.actual_outcome = summary

    if experiment.opportunity_id:
        opportunity = db.execute(
            select(Opportunity).where(
                Opportunity.id == experiment.opportunity_id, Opportunity.company_id == experiment.company_id
            )
        ).scalar_one_or_none()
        if opportunity is not None:
            adjustment = OUTCOME_ADJUSTMENTS.get(outcome, 0)
            base_score = scoring.score_opportunity(opportunity)
            opportunity.priority_score = max(0, min(100, base_score + adjustment))
            opportunity.outcome_adjustment = adjustment
            opportunity.last_learning_outcome = outcome
            opportunity.last_learning_summary = summary

    profile = db.execute(
        select(CompanyIntelligenceProfile)
        .where(CompanyIntelligenceProfile.company_id == experiment.company_id)
        .order_by(CompanyIntelligenceProfile.created_at.desc(), CompanyIntelligenceProfile.id.desc())
        .limit(1)
    ).scalar_one_or_none()
    if profile is not None:
        record = {
            "experimentId": experiment.id,
            "experimentName": experiment.name or experiment.hypothesis[:200],
            "outcome": outcome,
            "summary": summary,
            "recordedBy": LOCAL_ACTOR,
            "recordedAt": recorded_at.isoformat(),
        }
        outcomes = [item for item in (profile.experiment_outcomes or []) if item.get("experimentId") != experiment.id]
        outcomes.insert(0, record)
        profile.experiment_outcomes = outcomes[:50]


def save_learning(
    db: Session,
    experiment_id: str,
    company_id: str,
    data: LearningCreate | LearningUpdate,
) -> ExperimentLearning:
    experiment = experiment_repository.require_experiment(db, experiment_id, company_id)
    if experiment.status != "completed":
        raise DomainValidationError("Complete the experiment before recording an outcome review.")

    learning = get_learning(db, experiment_id, company_id)
    values = {
        "outcome": data.outcome,
        "metTarget": data.metTarget,
        "whatChanged": data.whatChanged,
        "evidenceIds": data.evidenceIds,
        "whatWorked": data.whatWorked,
        "whatFailed": data.whatFailed,
        "nextSteps": data.nextSteps,
    }
    if learning is not None:
        merged = {}
        for key, value in values.items():
            merged[key] = value if value is not None else getattr(learning, _learning_field(key))
    else:
        if isinstance(data, LearningUpdate):
            raise NotFoundError("No outcome review exists for this experiment yet.")
        merged = values

    outcome = merged["outcome"]
    if outcome not in OUTCOME_ADJUSTMENTS:
        raise DomainValidationError("Outcome must be successful, unsuccessful or inconclusive.")
    evidence_repository.validate_evidence_ids(db, company_id, merged["evidenceIds"])
    summary = _summary(outcome, merged["whatChanged"] or "", merged["nextSteps"] or "")
    now = utc_now()

    if learning is None:
        learning = ExperimentLearning(
            company_id=company_id,
            experiment_id=experiment_id,
            outcome=outcome,
            met_target=merged["metTarget"],
            what_changed=merged["whatChanged"] or "",
            evidence_ids=merged["evidenceIds"] or [],
            what_worked=merged["whatWorked"] or "",
            what_failed=merged["whatFailed"] or "",
            next_steps=merged["nextSteps"] or "",
            recorded_by=LOCAL_ACTOR,
        )
        db.add(learning)
    else:
        learning.outcome = outcome
        learning.met_target = merged["metTarget"]
        learning.what_changed = merged["whatChanged"] or ""
        learning.evidence_ids = merged["evidenceIds"] or []
        learning.what_worked = merged["whatWorked"] or ""
        learning.what_failed = merged["whatFailed"] or ""
        learning.next_steps = merged["nextSteps"] or ""

    _write_back(db, experiment, outcome, summary, now)
    db.commit()
    db.refresh(learning)
    return learning


def _learning_field(key: str) -> str:
    return {
        "outcome": "outcome",
        "metTarget": "met_target",
        "whatChanged": "what_changed",
        "evidenceIds": "evidence_ids",
        "whatWorked": "what_worked",
        "whatFailed": "what_failed",
        "nextSteps": "next_steps",
    }[key]
