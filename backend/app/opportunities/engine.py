"""Opportunity generation engine — creates specific, evidence-backed opportunities."""

import logging

from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.ai.structured import generate_structured
from app.models import Company, CompanyIntelligenceProfile, DiagnosticFinding, Evidence, IntelligenceFinding, Opportunity, OpportunityEvidence
from app.opportunities import scoring

logger = logging.getLogger("growthos.opportunities")


class OpportunityGenPayload(BaseModel):
    """One generated opportunity."""

    title: str = Field(min_length=1, max_length=200)
    description: str = Field(min_length=1, max_length=3000)
    growth_category: str = Field(min_length=1, max_length=200)
    target_outcome: str = Field(min_length=1, max_length=3000)
    intervention: str = Field(min_length=1, max_length=3000)
    evidence_ids: list[str] = Field(default_factory=list)
    expected_impact: str = Field(min_length=1, max_length=3000)
    confidence: float = Field(ge=0, le=1, default=0.5)
    effort: int = Field(ge=1, le=10, default=5)
    risk: str = Field(default="", max_length=2000)
    dependencies: list[str] = Field(default_factory=list)
    validation_requirements: str = Field(default="", max_length=2000)
    suggested_measurement: str = Field(default="", max_length=2000)
    priority_score: int | None = Field(ge=0, le=100, default=None)
    related_diagnostic_finding_id: str | None = None


class OpportunitiesPayload(BaseModel):
    """Full generated opportunity set."""

    opportunities: list[OpportunityGenPayload] = Field(default_factory=list)


def build_opportunities_prompt(company: Company, findings: list, diagnostic_findings: list, evidence_rows: list, profile=None) -> str:
    lines = [
        "You are a growth coach generating concrete growth opportunities for a digital business.",
        "Each opportunity must be specific to this company: explain why it exists, why it matters, what evidence supports it, and how it will be validated.",
        "Avoid generic suggestions, duplicates of existing opportunities, and opportunities that are already implemented or rejected.",
        "",
        "## Company",
        f"- Name: {company.name}",
        f"- Industry: {company.industry or 'unknown'}",
        f"- Business model: {company.business_model}",
        f"- Stage: {company.business_stage}",
        f"- Target audience: {company.target_audience or 'unknown'}",
        f"- Main product: {company.main_product_or_service or 'unknown'}",
        f"- Acquisition channels: {(profile.customer_acquisition_channels if profile else '') or 'unknown'}",
        f"- Strategic priorities: {(profile.strategic_priorities if profile else '') or 'none recorded'}",
        "",
        "## Intelligence findings",
        *(f"- [{finding.category}] {finding.title} — {finding.description or ''}" for finding in findings),
        "## Diagnostics",
        *(f"- [{df.category}] {df.problem_statement or df.suggested_next_step or ''} — {df.description or ''}" for df in diagnostic_findings),
        "## Evidence",
        *(f"- {evidence.id} | {evidence.source_url} | {evidence.dimension} | {evidence.extracted_statement or ''}" for evidence in evidence_rows[:30]),
        "",
        "For each opportunity cite evidence IDs exactly as they appear in the evidence list.",
    ]
    return "\n".join(lines)


def generate_opportunities(db: Session, company_id: str) -> list[Opportunity]:
    """Generate and persist opportunities from intelligence findings and diagnostics."""
    company = db.get(Company, company_id)
    findings = db.execute(select(IntelligenceFinding).where(IntelligenceFinding.company_id == company_id)).scalars().all()
    diagnostic_findings = db.execute(select(DiagnosticFinding).where(DiagnosticFinding.company_id == company_id)).scalars().all()
    evidence_rows = db.execute(select(Evidence).where(Evidence.company_id == company_id).limit(50)).scalars().all()
    profile = db.execute(
        select(CompanyIntelligenceProfile).where(CompanyIntelligenceProfile.company_id == company_id)
    ).scalars().first()
    existing = db.execute(select(Opportunity).where(Opportunity.company_id == company_id)).scalars().all()
    existing_titles = {opportunity.title.lower() for opportunity in existing}

    prompt = build_opportunities_prompt(company, findings, diagnostic_findings, evidence_rows, profile)
    result = generate_structured(
        OpportunitiesPayload,
        prompt,
        system_prompt=(
            "You are a senior growth coach. Generate concrete, specific growth opportunities. "
            "Cite evidence IDs that exist in the provided evidence list; do not invent IDs or metrics."
        ),
    )
    payload = result.result

    valid_ids = {evidence.id for evidence in evidence_rows}
    diagnostic_by_id = {df.id: df for df in diagnostic_findings}

    created: list[Opportunity] = []
    for gen in payload.opportunities:
        title = gen.title.strip()
        if title.lower() in existing_titles:
            logger.info("Skipping duplicate opportunity: %s", title)
            continue
        diagnostic_finding_id = (
            gen.related_diagnostic_finding_id if gen.related_diagnostic_finding_id in diagnostic_by_id else None
        )
        evidence_ids = [evidence_id for evidence_id in gen.evidence_ids if evidence_id in valid_ids]
        evidence_summary = "\n".join(
            f"- {evidence.source_url}: {evidence.extracted_statement or ''}"
            for evidence in evidence_rows
            if evidence.id in set(evidence_ids)
        )
        opportunity = Opportunity(
            company_id=company_id,
            title=title,
            description=gen.description,
            expected_impact=gen.expected_impact,
            confidence=int(round(max(0, min(1, gen.confidence)) * 100)),
            effort=gen.effort,
            risk=gen.risk,
            priority_score=gen.priority_score,
            status="discovered",
            supporting_evidence=evidence_summary or "",
            recommended_next_action=(gen.intervention or gen.suggested_measurement or "").strip() or "",
            diagnostic_finding_id=diagnostic_finding_id,
        )
        db.add(opportunity)
        db.flush()
        for evidence_id in evidence_ids:
            db.add(OpportunityEvidence(opportunity_id=opportunity.id, evidence_id=evidence_id))
        if opportunity.priority_score is None:
            opportunity.priority_score = scoring.score_opportunity(opportunity)
        db.commit()
        db.refresh(opportunity)
        existing_titles.add(title.lower())
        created.append(opportunity)
    return created
