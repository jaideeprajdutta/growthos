"""Company statistics service — all numbers come from persisted records."""

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundError
from app.models import (
    Company,
    Experiment,
    ExperimentLearning,
    ExperimentResult,
    ExperimentTask,
    GrowthObjective,
    Opportunity,
)
from app.schemas.experiment_results import experiment_result_out
from app.schemas.stats import CompanyStatsOut, ExperimentAnalyticsSummary


def _grouped_counts(db: Session, company_id: str, model, column) -> dict[str, int]:
    rows = db.execute(
        select(column, func.count()).where(model.company_id == company_id).group_by(column)
    ).all()
    return {str(value): int(count) for value, count in rows if value is not None}


def get_company_stats(db: Session, company_id: str) -> CompanyStatsOut:
    """Count real records for a company and summarise the growth loop."""
    if db.execute(select(Company).where(Company.id == company_id)).scalar_one_or_none() is None:
        raise NotFoundError(f"Company {company_id} not found.")

    opportunities = db.execute(
        select(func.count()).select_from(Opportunity).where(Opportunity.company_id == company_id)
    ).scalar_one()
    running_experiments = db.execute(
        select(func.count()).select_from(Experiment).where(
            Experiment.company_id == company_id, Experiment.status == "running"
        )
    ).scalar_one()
    objectives = db.execute(
        select(func.count()).select_from(GrowthObjective).where(GrowthObjective.company_id == company_id)
    ).scalar_one()

    experiments = db.execute(
        select(Experiment).where(Experiment.company_id == company_id).order_by(Experiment.created_at.desc())
    ).scalars().all()
    tasks = db.execute(select(ExperimentTask).where(ExperimentTask.company_id == company_id)).scalars().all()
    results = db.execute(
        select(ExperimentResult)
        .where(ExperimentResult.company_id == company_id)
        .order_by(ExperimentResult.recorded_at.desc(), ExperimentResult.id.desc())
    ).scalars().all()
    learnings = db.execute(
        select(ExperimentLearning).where(ExperimentLearning.company_id == company_id)
    ).scalars().all()
    learning_by_experiment = {item.experiment_id: item.outcome for item in learnings}

    latest_by_experiment: dict[str, ExperimentResult] = {}
    for result in results:
        latest_by_experiment.setdefault(result.experiment_id, result)

    task_counts: dict[str, dict[str, int]] = {}
    for task in tasks:
        counts = task_counts.setdefault(task.experiment_id, {"total": 0, "completed": 0, "approval": 0})
        counts["total"] += 1
        if task.status == "completed":
            counts["completed"] += 1
        if task.requires_approval and task.approval_status != "approved":
            counts["approval"] += 1

    opportunity_titles = dict(
        db.execute(
            select(Opportunity.id, Opportunity.title).where(Opportunity.company_id == company_id)
        ).all()
    )
    summaries = [
        ExperimentAnalyticsSummary(
            id=experiment.id,
            name=experiment.name or experiment.hypothesis[:200],
            status=experiment.status,
            opportunityId=experiment.opportunity_id,
            opportunityTitle=opportunity_titles.get(experiment.opportunity_id)
            if experiment.opportunity_id
            else None,
            learningOutcome=(
                learning_by_experiment.get(experiment.id)
                if learning_by_experiment.get(experiment.id) in {"successful", "unsuccessful", "inconclusive"}
                else None
            ),
            latestMeasurement=(
                experiment_result_out(latest_by_experiment[experiment.id])
                if experiment.id in latest_by_experiment
                else None
            ),
            tasksTotal=task_counts.get(experiment.id, {}).get("total", 0),
            tasksCompleted=task_counts.get(experiment.id, {}).get("completed", 0),
            tasksAwaitingApproval=task_counts.get(experiment.id, {}).get("approval", 0),
        )
        for experiment in experiments
    ]

    outcome_counts = {outcome: 0 for outcome in ("successful", "unsuccessful", "inconclusive")}
    for outcome in learning_by_experiment.values():
        if outcome in outcome_counts:
            outcome_counts[outcome] += 1

    return CompanyStatsOut(
        companyId=company_id,
        opportunities=opportunities,
        runningExperiments=running_experiments,
        objectives=objectives,
        totalExperiments=len(experiments),
        completedExperiments=sum(1 for item in experiments if item.status == "completed"),
        experimentsByStatus=_grouped_counts(db, company_id, Experiment, Experiment.status),
        opportunitiesByStatus=_grouped_counts(db, company_id, Opportunity, Opportunity.status),
        outcomesBySource=_grouped_counts(db, company_id, ExperimentResult, ExperimentResult.data_source),
        tasksTotal=len(tasks),
        tasksCompleted=sum(1 for task in tasks if task.status == "completed"),
        tasksInProgress=sum(1 for task in tasks if task.status == "in_progress"),
        tasksBlocked=sum(1 for task in tasks if task.status == "blocked"),
        tasksAwaitingApproval=sum(
            1 for task in tasks if task.requires_approval and task.approval_status != "approved"
        ),
        measurementsRecorded=len(results),
        successfulExperiments=outcome_counts["successful"],
        unsuccessfulExperiments=outcome_counts["unsuccessful"],
        inconclusiveExperiments=outcome_counts["inconclusive"],
        experimentSummaries=summaries,
    )
