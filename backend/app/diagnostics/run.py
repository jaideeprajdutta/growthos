"""Diagnostic run generation — turns intelligence findings and evidence into diagnostics."""

import logging

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.ai.structured import generate_structured
from app.diagnostics.schemas import DiagnosticsPayload
from app.models import Company, CompanyIntelligenceProfile, DiagnosticFinding, DiagnosticRun, Evidence, IntelligenceFinding

logger = logging.getLogger("growthos.diagnostics")

# Deterministic, business-model-specific lenses. These shape the prompt; they
# do not assert any metric or finding on their own.
BUSINESS_MODEL_FRAMEWORKS = {
    "saas": (
        "SaaS lens: trial/signup activation, time-to-first-value, trial-to-paid conversion, "
        "MRR/ARR growth, seat and usage expansion, logo and revenue churn, expansion revenue, "
        "onboarding friction, pricing/packaging clarity."
    ),
    "ecommerce": (
        "E-commerce lens: product-page and collection conversion, cart and checkout abandonment, "
        "average order value, repeat-purchase rate, merchandising, shipping/returns friction, "
        "paid and organic acquisition efficiency, email/SMS retention."
    ),
    "agency": (
        "Digital-agency lens: qualified lead generation, proposal and pitch conversion, "
        "sales-cycle length, client utilization and delivery capacity, retainer renewals, "
        "case-study and referral engine, scope creep and margin."
    ),
    "services": (
        "Online-services lens: inquiry-to-booking conversion, package and pricing clarity, "
        "booking/show-up rates, delivery capacity and waitlists, client retention and repeat bookings, "
        "referral and review generation, local/SEO discoverability."
    ),
    "other": (
        "General digital-business lens: discoverability, lead capture, conversion path clarity, "
        "retention and repeat usage, referral loops, and measurement coverage."
    ),
}


def framework_for_business_model(business_model: str | None) -> str:
    """Return the deterministic diagnostic lens for a business model."""
    return BUSINESS_MODEL_FRAMEWORKS.get((business_model or "other").lower(), BUSINESS_MODEL_FRAMEWORKS["other"])


def build_diagnostics_prompt(company: Company, profile, findings: list, evidence_rows: list) -> str:
    lines = [
        "You are a growth diagnostician analyzing a digital business.",
        "Analyze the company across its growth lifecycle — discovery, acquisition, activation, conversion, retention, expansion and referral.",
        "For each phase identify: confirmed issues, potential bottlenecks, recommendations that require more evidence, and unknown areas that require research.",
        "Assign severity (1-5), confidence (0-1), root-cause hypotheses and validation methods. Be specific and evidence-based; cite evidence IDs from the evidence list.",
        "",
        "## Diagnostic framework",
        framework_for_business_model(company.business_model),
        "",
        "## Company",
        f"- Name: {company.name}",
        f"- Industry: {company.industry or 'unknown'}",
        f"- Business model: {company.business_model}",
        f"- Stage: {company.business_stage}",
        f"- Target audience: {company.target_audience or 'unknown'}",
        f"- Strategic priorities: {profile.strategic_priorities if profile else 'none recorded'}",
        "",
        "## Intelligence findings",
        *(f"- [{finding.severity or 'medium'}] {finding.title} — {finding.description or ''}" for finding in findings),
        "",
        "## Evidence",
        *(
            f"- {evidence.id} | {evidence.source_url} | {evidence.dimension} | {evidence.extracted_statement or ''}"
            for evidence in evidence_rows[:50]
        ),
    ]
    return "\n".join(lines)


def generate_diagnostics(db: Session, company_id: str) -> DiagnosticRun:
    """Run the diagnostic engine and persist a ``DiagnosticRun`` with its findings.

    Raises ``AIError`` when no AI provider is configured.
    """
    company = db.get(Company, company_id)
    profile = db.execute(
        select(CompanyIntelligenceProfile).where(CompanyIntelligenceProfile.company_id == company_id)
    ).scalar_one_or_none()
    findings = db.execute(
        select(IntelligenceFinding).where(IntelligenceFinding.company_id == company_id).order_by(IntelligenceFinding.created_at)
    ).scalars().all()
    evidence_rows = db.execute(
        select(Evidence)
        .where(Evidence.company_id == company_id)
        .order_by(Evidence.collected_at, Evidence.id)
        .limit(50)
    ).scalars().all()

    prompt = build_diagnostics_prompt(company, profile, findings, evidence_rows)
    result = generate_structured(
        DiagnosticsPayload,
        prompt,
        system_prompt=(
            "You are a senior growth diagnostician. Produce structured, evidence-backed findings. "
            "Cite evidence IDs only when present in the provided evidence list. Distinguish confirmed issues from hypotheses."
        ),
    )
    payload = result.result
    usage = result.usage

    run = DiagnosticRun(
        company_id=company_id,
        model=usage.model or None,
        ai_usage_json={"input_tokens": usage.input_tokens, "output_tokens": usage.output_tokens, "model": usage.model},
        input_summary=prompt[:4000] or None,
    )
    db.add(run)
    db.commit()
    db.refresh(run)

    valid_ids = {evidence.id for evidence in evidence_rows}
    invalid_references = [
        evidence_id
        for finding in payload.findings
        for evidence_id in finding.evidence_ids
        if evidence_id not in valid_ids
    ]
    if invalid_references:
        logger.warning("Flagged invalid diagnostic evidence references: %s", invalid_references)
        run.ai_usage_json = {**(run.ai_usage_json or {}), "invalid_evidence_references": invalid_references}
        db.commit()

    for finding in payload.findings:
        db.add(
            DiagnosticFinding(
                run_id=run.id,
                company_id=company_id,
                dimension=finding.dimension,
                problem_statement=finding.problem_statement or None,
                description=finding.description or None,
                category=finding.category,
                severity=finding.severity,
                confidence=finding.confidence,
                evidence_ids=[evidence_id for evidence_id in finding.evidence_ids if evidence_id in valid_ids] or None,
                root_cause_hypothesis=finding.root_cause_hypothesis or None,
                validation_method=finding.validation_method or None,
                suggested_next_step=finding.suggested_next_step or None,
            )
        )
    db.commit()
    return run
