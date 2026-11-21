"""Business-intelligence report generation.

Combines onboarding data, research evidence and business context; generates
structured reports via the AI client; and validates that every evidence
reference exists for the company (invalid references are flagged/filtered).
"""

import logging

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.ai.structured import generate_structured
from app.intelligence.schemas import CompanyIntelligenceUpdatePayload, IntelligenceReportPayload
from app.models import Company, CompanyIntelligenceProfile, Evidence, IntelligenceFinding, IntelligenceReport, ResearchRun
from app.models.base import utc_now

logger = logging.getLogger("growthos.intelligence")


def _valid_evidence_ids(db: Session, company_id: str) -> set[str]:
    return set(db.execute(select(Evidence.id).where(Evidence.company_id == company_id)).scalars().all())


def _flagged_invalid_references(payload: IntelligenceReportPayload, valid_ids: set[str]) -> list[str]:
    invalid: list[str] = []
    for finding in payload.findings:
        for evidence_id in finding.evidence_ids:
            if evidence_id not in valid_ids:
                invalid.append(f"{finding.title}: {evidence_id}")
    return invalid


def _update_profile_fields(profile: CompanyIntelligenceProfile, update: CompanyIntelligenceUpdatePayload) -> None:
    for field_name, value in update.model_dump().items():
        if value:
            setattr(profile, field_name, value)


def build_intelligence_prompt(company: Company, profile: CompanyIntelligenceProfile | None, evidence_rows: list, run: ResearchRun | None) -> str:
    lines = [
        "You are an expert business-intelligence analyst producing a structured report for a digital business.",
        "Analyze the company data and evidence below; base findings strictly on the evidence.",
        "In findings, cite evidence IDs exactly as they appear; mark inferred causal relationships as hypotheses.",
        "Be specific to this company rather than generic.",
        "",
        "## Company identity",
        f"- Name: {company.name}",
        f"- Website: {company.website or 'unknown'}",
        f"- Industry: {company.industry or 'unknown'}",
        f"- Business model: {company.business_model}",
        f"- Stage: {company.business_stage}",
        f"- Revenue model: {company.revenue_model}",
        f"- Primary market: {company.primary_market or 'unknown'}",
        f"- Description: {company.company_description or 'unknown'}",
        f"- Target audience: {company.target_audience or 'unknown'}",
        f"- Main product: {company.main_product_or_service or 'unknown'}",
        "",
        "## Known growth objectives",
        (profile.strategic_priorities if profile else "") or "None recorded.",
        "",
        "## Evidence",
        *(
            [
                f"- {evidence.id} | {evidence.source_url} | {evidence.dimension} | {evidence.extracted_statement or ''} | {(evidence.supporting_excerpt or '')[:600]}"
                for evidence in evidence_rows
            ]
            if evidence_rows
            else ["- No evidence collected yet."]
        ),
    ]
    if run:
        lines.append("")
        lines.append(f"## Research context: {run.source_url} — status {run.status}, {len(evidence_rows)} evidence records")
    return "\n".join(lines)


def generate_intelligence_report(db: Session, company_id: str, force_refresh: bool = False) -> IntelligenceReport:
    """Generate (or reuse) the company's intelligence report.

    Reuses the latest report unless ``force_refresh`` is set. Evidence
    references that do not exist for the company are flagged and filtered.
    """
    latest = (
        db.execute(
            select(IntelligenceReport)
            .where(IntelligenceReport.company_id == company_id)
            .order_by(IntelligenceReport.generated_at.desc(), IntelligenceReport.id.desc())
        ).scalars().first()
    )
    if latest is not None and not force_refresh:
        return latest

    company = db.get(Company, company_id)
    evidence_rows = db.execute(select(Evidence).where(Evidence.company_id == company_id).limit(50)).scalars().all()
    run = db.get(ResearchRun, latest.run_id) if latest is not None and latest.run_id else None

    prompt = build_intelligence_prompt(company, None, evidence_rows, run)
    result = generate_structured(
        IntelligenceReportPayload,
        prompt,
        system_prompt=(
            "You are a senior business-intelligence analyst. Produce structured, evidence-backed findings. "
            "Cite evidence IDs only when present in the provided evidence list. Distinguish facts from hypotheses."
        ),
    )
    payload = result.result
    usage = result.usage

    valid_ids = _valid_evidence_ids(db, company_id)
    invalid = _flagged_invalid_references(payload, valid_ids)
    if invalid:
        logger.warning("Flagged invalid evidence references: %s", invalid)
    for finding in payload.findings:
        finding.evidence_ids = [evidence_id for evidence_id in finding.evidence_ids if evidence_id in valid_ids]

    profile = db.execute(
        select(CompanyIntelligenceProfile).where(CompanyIntelligenceProfile.company_id == company_id)
    ).scalar_one_or_none()
    if profile is None:
        profile = CompanyIntelligenceProfile(
            company_id=company_id,
            version=1,
            source=f"ai:{usage.model}",
            generated_at=utc_now(),
            refreshed_at=utc_now(),
            provenance={},
        )
        db.add(profile)
    else:
        profile.version += 1
        profile.source = f"ai:{usage.model}"
        profile.refreshed_at = utc_now()
    _update_profile_fields(profile, payload.profile_update)
    db.commit()
    db.refresh(profile)

    report = IntelligenceReport(
        company_id=company_id,
        run_id=run.id if run else None,
        version=(latest.version + 1) if latest is not None else 1,
        executive_summary=payload.executive_summary or None,
        sections=payload.sections,
        findings_count=len(payload.findings),
        ai_usage_json={"input_tokens": usage.input_tokens, "output_tokens": usage.output_tokens, "model": usage.model},
        model=usage.model or None,
    )
    db.add(report)
    for finding in payload.findings:
        db.add(
            IntelligenceFinding(
                company_id=company_id,
                run_id=report.run_id,
                dimension=finding.dimension,
                title=finding.title,
                category=finding.category,
                description=finding.description or None,
                confidence=finding.confidence,
                severity=finding.severity,
                evidence_ids=finding.evidence_ids or None,
                root_cause_hypothesis=finding.root_cause_hypothesis or None,
                validation_method=finding.validation_method or None,
                suggested_next_step=finding.suggested_next_step or None,
                status="active",
            )
        )
    db.commit()
    db.refresh(report)
    logger.info("Intelligence report %s generated for company %s (version %s)", report.id[:8], company_id[:8], report.version)
    return report
