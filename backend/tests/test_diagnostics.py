"""Diagnostic engine tests (app/diagnostics/run.py)."""

from unittest.mock import patch

import pytest
from sqlalchemy import select

from app.ai.client import StructuredResult, Usage
from app.diagnostics import generate_diagnostics
from app.diagnostics.schemas import DiagnosticFindingPayload, DiagnosticsPayload
from app.models import DiagnosticFinding
from tests.helpers import make_company


def test_generate_diagnostics_persists_run_and_findings(db):
    company = make_company(db)
    other = make_company(db, name="Other")
    payload = DiagnosticsPayload(
        summary="Acquisition is weak.",
        findings=[
            DiagnosticFindingPayload(
                dimension="acquisition",
                problem_statement="Leads are sparse.",
                description="Content marketing drives little traffic.",
                category="confirmed_issue",
                severity=4,
                confidence=0.7,
            )
        ],
    )
    result = StructuredResult(payload, Usage(2, 3, "test-model"), "test-model")
    with patch("app.diagnostics.run.generate_structured", return_value=result):
        run = generate_diagnostics(db, company.id)

    assert run.company_id == company.id
    assert run.model == "test-model"
    findings = db.execute(select(DiagnosticFinding).where(DiagnosticFinding.company_id == company.id)).scalars().all()
    assert len(findings) == 1
    assert findings[0].dimension == "acquisition"
    assert findings[0].category == "confirmed_issue"
    assert findings[0].severity == 4
    assert findings[0].confidence == pytest.approx(0.7)
    other_findings = db.execute(select(DiagnosticFinding).where(DiagnosticFinding.company_id == other.id)).scalars().all()
    assert other_findings == []
