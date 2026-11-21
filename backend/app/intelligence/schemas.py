"""AI payload schemas for the intelligence engine — mirror frontend types."""

from typing import Literal

from pydantic import BaseModel, Field

FindingsCategory = Literal["strength", "weakness", "gap"]
Dimensions = Literal[
    "positioning", "product", "audience", "acquisition", "conversion", "retention", "monetisation", "competitive"
]


class CompanyIntelligenceUpdatePayload(BaseModel):
    """Structured company-understanding fields produced by the AI."""

    value_proposition: str = Field(default="", max_length=3000)
    target_audience: str = Field(default="", max_length=3000)
    customer_pain_points: str = Field(default="", max_length=3000)
    geographic_markets: str = Field(default="", max_length=2000)
    key_differentiators: str = Field(default="", max_length=2000)
    pricing_model: str = Field(default="", max_length=2000)
    main_products: str = Field(default="", max_length=3000)
    customer_acquisition_channels: str = Field(default="", max_length=2000)
    sales_conversion_journey: str = Field(default="", max_length=2000)
    retention_approach: str = Field(default="", max_length=2000)
    competitors: str = Field(default="", max_length=2000)
    strategic_priorities: str = Field(default="", max_length=2000)


class IntelligenceFindingPayload(BaseModel):
    """A single evidence-backed finding."""

    title: str = Field(min_length=1, max_length=500)
    dimension: Dimensions
    problem_statement: str = Field(default="", max_length=4000)
    description: str = Field(min_length=1, max_length=4000)
    category: FindingsCategory
    severity: Literal["critical", "high", "medium", "low"] = "medium"
    confidence: float = Field(ge=0, le=1, default=0.5)
    root_cause_hypothesis: str = Field(default="", max_length=4000)
    validation_method: str = Field(default="", max_length=4000)
    suggested_next_step: str = Field(default="", max_length=2000)
    evidence_ids: list[str] = Field(default_factory=list)


class IntelligenceReportPayload(BaseModel):
    """Full intelligence report payload."""

    executive_summary: str = Field(default="", max_length=8000)
    sections: dict[str, str] = Field(default_factory=dict)
    profile_update: CompanyIntelligenceUpdatePayload = Field(default_factory=CompanyIntelligenceUpdatePayload)
    findings: list[IntelligenceFindingPayload] = Field(default_factory=list)
