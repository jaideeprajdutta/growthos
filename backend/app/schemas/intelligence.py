"""Intelligence API schemas — mirror frontend types."""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel

from app.models import CompanyIntelligenceProfile, IntelligenceFinding, IntelligenceReport


class CompanyIntelligenceProfileOut(BaseModel):
    id: str
    companyId: str
    version: int
    source: Optional[str]
    generatedAt: Optional[datetime]
    refreshedAt: Optional[datetime]
    valueProposition: Optional[str]
    targetAudience: Optional[str]
    customerPainPoints: Optional[str]
    geographicMarkets: Optional[str]
    companySize: Optional[str]
    keyDifferentiators: Optional[str]
    pricingModel: Optional[str]
    mainProducts: Optional[str]
    customerAcquisitionChannels: Optional[str]
    salesConversionJourney: Optional[str]
    retentionApproach: Optional[str]
    competitors: Optional[str]
    strategicPriorities: Optional[str]


def company_intelligence_profile_out(profile: CompanyIntelligenceProfile) -> CompanyIntelligenceProfileOut:
    return CompanyIntelligenceProfileOut(
        id=profile.id,
        companyId=profile.company_id,
        version=profile.version,
        source=profile.source,
        generatedAt=profile.generated_at,
        refreshedAt=profile.refreshed_at,
        valueProposition=profile.value_proposition,
        targetAudience=profile.target_audience,
        customerPainPoints=profile.customer_pain_points,
        geographicMarkets=profile.geographic_markets,
        companySize=profile.company_size,
        keyDifferentiators=profile.key_differentiators,
        pricingModel=profile.pricing_model,
        mainProducts=profile.main_products,
        customerAcquisitionChannels=profile.customer_acquisition_channels,
        salesConversionJourney=profile.sales_conversion_journey,
        retentionApproach=profile.retention_approach,
        competitors=profile.competitors,
        strategicPriorities=profile.strategic_priorities,
    )


class IntelligenceFindingOut(BaseModel):
    id: str
    companyId: str
    runId: Optional[str]
    dimension: str
    title: str
    category: str
    description: Optional[str]
    confidence: Optional[float]
    severity: Optional[str]
    evidenceIds: list[str]
    rootCauseHypothesis: Optional[str]
    validationMethod: Optional[str]
    suggestedNextStep: Optional[str]
    status: str


def intelligence_finding_out(finding: IntelligenceFinding) -> IntelligenceFindingOut:
    return IntelligenceFindingOut(
        id=finding.id,
        companyId=finding.company_id,
        runId=finding.run_id,
        dimension=finding.dimension,
        title=finding.title,
        category=finding.category,
        description=finding.description,
        confidence=finding.confidence,
        severity=finding.severity,
        evidenceIds=finding.evidence_ids or [],
        rootCauseHypothesis=finding.root_cause_hypothesis,
        validationMethod=finding.validation_method,
        suggestedNextStep=finding.suggested_next_step,
        status=finding.status,
    )


class IntelligenceReportOut(BaseModel):
    id: str
    companyId: str
    version: int
    generatedAt: datetime
    executiveSummary: Optional[str]
    sections: dict
    findings: list[IntelligenceFindingOut]
    findingsCount: int


def intelligence_report_out(report: IntelligenceReport, findings: list[IntelligenceFinding]) -> IntelligenceReportOut:
    return IntelligenceReportOut(
        id=report.id,
        companyId=report.company_id,
        version=report.version,
        generatedAt=report.generated_at,
        executiveSummary=report.executive_summary,
        sections=report.sections,
        findings=[intelligence_finding_out(finding) for finding in findings],
        findingsCount=report.findings_count,
    )
