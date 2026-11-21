"""Diagnostic API schemas — mirror frontend types."""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel

from app.models import DiagnosticFinding, DiagnosticRun


class DiagnosticRunOut(BaseModel):
    id: str
    companyId: str
    runAt: datetime
    model: Optional[str]
    aiUsage: Optional[dict]
    inputSummary: Optional[str]
    createdAt: datetime
    updatedAt: datetime


def diagnostic_run_out(run: DiagnosticRun) -> DiagnosticRunOut:
    return DiagnosticRunOut(
        id=run.id,
        companyId=run.company_id,
        runAt=run.run_at,
        model=run.model,
        aiUsage=run.ai_usage_json,
        inputSummary=run.input_summary,
        createdAt=run.created_at,
        updatedAt=run.updated_at,
    )


class DiagnosticFindingOut(BaseModel):
    id: str
    runId: str
    companyId: str
    dimension: str
    problemStatement: Optional[str]
    description: Optional[str]
    category: str
    severity: Optional[int]
    confidence: Optional[float]
    evidenceIds: list[str]
    rootCauseHypothesis: Optional[str]
    validationMethod: Optional[str]
    suggestedNextStep: Optional[str]
    createdAt: datetime
    updatedAt: datetime


def diagnostic_finding_out(finding: DiagnosticFinding) -> DiagnosticFindingOut:
    return DiagnosticFindingOut(
        id=finding.id,
        runId=finding.run_id,
        companyId=finding.company_id,
        dimension=finding.dimension,
        problemStatement=finding.problem_statement,
        description=finding.description,
        category=finding.category,
        severity=finding.severity,
        confidence=finding.confidence,
        evidenceIds=finding.evidence_ids or [],
        rootCauseHypothesis=finding.root_cause_hypothesis,
        validationMethod=finding.validation_method,
        suggestedNextStep=finding.suggested_next_step,
        createdAt=finding.created_at,
        updatedAt=finding.updated_at,
    )
