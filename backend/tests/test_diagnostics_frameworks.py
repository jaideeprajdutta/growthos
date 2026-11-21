"""Diagnostic frameworks per business model and evidence filtering (app/diagnostics/run.py)."""

from unittest.mock import patch

from sqlalchemy import select

from app.ai.client import StructuredResult, Usage
from app.diagnostics.run import BUSINESS_MODEL_FRAMEWORKS, build_diagnostics_prompt, framework_for_business_model
from app.diagnostics import generate_diagnostics
from app.diagnostics.schemas import DiagnosticFindingPayload, DiagnosticsPayload
from app.models import DiagnosticFinding
from tests.helpers import make_company


def test_framework_for_every_business_model():
    for business_model, framework in BUSINESS_MODEL_FRAMEWORKS.items():
        assert framework_for_business_model(business_model) == framework
        assert framework_for_business_model(business_model).strip()


def test_framework_defaults_to_general_for_unknown_models():
    assert framework_for_business_model("not-a-real-model") == BUSINESS_MODEL_FRAMEWORKS["other"]
    assert framework_for_business_model(None) == BUSINESS_MODEL_FRAMEWORKS["other"]


def test_build_diagnostics_prompt_includes_business_model_framework(db):
    company = make_company(db)
    company.business_model = "ecommerce"
    prompt = build_diagnostics_prompt(company, None, [], [])
    assert "E-commerce lens" in prompt
    assert "checkout abandonment" in prompt
    assert "## Company" in prompt


def test_generate_diagnostics_filters_invalid_evidence_references(db):
    company = make_company(db)
    payload = DiagnosticsPayload(
        summary="Acquisition is weak.",
        findings=[
            DiagnosticFindingPayload(
                dimension="conversion",
                problem_statement="Checkout drops off before payment.",
                description="Retry emails are never sent.",
                category="confirmed_issue",
                severity=4,
                confidence=0.8,
                evidence_ids=["missing-id"],
            )
        ],
    )
    result = StructuredResult(payload, Usage(1, 2, "test-model"), "test-model")
    with patch("app.diagnostics.run.generate_structured", return_value=result):
        run = generate_diagnostics(db, company.id)
    assert run.ai_usage_json["invalid_evidence_references"] == ["missing-id"]
    findings = db.execute(select(DiagnosticFinding)).scalars().all()
    assert findings[0].evidence_ids is None
