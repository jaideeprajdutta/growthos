"""AI payload schemas for the diagnostics engine — mirror frontend types."""

from typing import Literal

from pydantic import BaseModel, Field

DiagnosticDimension = Literal["discovery", "acquisition", "activation", "conversion", "retention", "expansion", "referral"]


class DiagnosticFindingPayload(BaseModel):
    """One evidence-backed diagnostic finding."""

    dimension: DiagnosticDimension
    problem_statement: str = Field(min_length=1, max_length=4000)
    description: str = Field(min_length=1, max_length=4000)
    category: Literal["confirmed_issue", "potential_bottleneck", "recommendation", "unknown_area"]
    severity: int = Field(ge=1, le=5)
    confidence: float = Field(ge=0, le=1, default=0.5)
    root_cause_hypothesis: str = Field(default="", max_length=4000)
    validation_method: str = Field(default="", max_length=4000)
    suggested_next_step: str = Field(default="", max_length=2000)
    evidence_ids: list[str] = Field(default_factory=list)


class DiagnosticsPayload(BaseModel):
    """Full diagnostic output for a company."""

    summary: str = Field(default="", max_length=4000)
    findings: list[DiagnosticFindingPayload] = Field(default_factory=list)
