"""Deterministic seeding and job-control helpers for the GrowthOS Playwright E2E suite.

Runs against the isolated E2E database (``backend/e2e.db``) while the E2E
backend serves it on port 8301. Only rows created for this run's companies are
touched — the development and production databases are never modified.

Usage:
    python frontend/tests/e2e/seed.py run --company-id <id> [--status completed] [--pages 2] [--url https://e2e.example/]
    python frontend/tests/e2e/seed.py complete-run <run_id>
    python frontend/tests/e2e/seed.py finding --company-id <id> --dimension conversion [--severity 4] [--problem "Checkout drops off"]
    python frontend/tests/e2e/seed.py evidence --company-id <id> --url https://e2e.example/proof --statement "Acme ships fast."

The ``run`` command prints the created run id (or existing one).
"""

from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path

BACKEND = Path(__file__).resolve().parents[3] / "backend"
os.environ["DATABASE_URL"] = f"sqlite:///{BACKEND / 'e2e.db'}"
sys.path.insert(0, str(BACKEND))

from sqlalchemy import func, select  # noqa: E402

from app.db.session import SessionLocal  # noqa: E402
from app.models import DiagnosticFinding, Evidence, ResearchPage, ResearchRun  # noqa: E402
from app.models.base import utc_now  # noqa: E402

RUN_STATUSES = ("pending", "running", "completed", "partially_completed", "failed")


def _get_run(db, company_id: str) -> ResearchRun:
    run = db.execute(select(ResearchRun).where(ResearchRun.company_id == company_id)).scalars().first()
    if run is None:
        run = ResearchRun(company_id=company_id, source_url="https://e2e.example/", status="pending", pages_scanned=0)
        db.add(run)
        db.flush()
    return run


def cmd_run(args) -> None:
    db = SessionLocal()
    try:
        run = _get_run(db, args.company_id)
        run.status = args.status
        run.pages_scanned = args.pages
        run.error_message = args.error
        for index in range(args.pages):
            page_url = f"{run.source_url.rstrip('/')}/page-{index + 1}"
            exists = db.execute(
                select(ResearchPage).where(ResearchPage.run_id == run.id, ResearchPage.url == page_url)
            ).scalar_one_or_none()
            if exists is None:
                db.add(
                    ResearchPage(
                        run_id=run.id,
                        url=page_url,
                        status="scanned",
                        title=f"E2E page {index + 1}",
                        extracted_text=f"E2E page {index + 1} — a deterministic stub page.",
                        word_count=120,
                    )
                )
        db.commit()
        print(run.id)
    finally:
        db.close()


def cmd_complete_run(args) -> None:
    db = SessionLocal()
    try:
        run = db.get(ResearchRun, args.run_id)
        if run is None:
            raise SystemExit(f"no research run with id {args.run_id}")
        run.status = "completed"
        run.error_message = None
        run.pages_scanned = db.execute(
            select(func.count()).select_from(ResearchPage).where(ResearchPage.run_id == run.id)
        ).scalar_one()
        db.commit()
    finally:
        db.close()


def cmd_finding(args) -> None:
    db = SessionLocal()
    try:
        run = _get_run(db, args.company_id)
        db.add(
            DiagnosticFinding(
                run_id=run.id,
                company_id=args.company_id,
                dimension=args.dimension,
                problem_statement=args.problem,
                description=args.problem,
                category=args.category,
                severity=args.severity,
            )
        )
        db.commit()
    finally:
        db.close()


def cmd_evidence(args) -> None:
    db = SessionLocal()
    try:
        run = _get_run(db, args.company_id)
        evidence = Evidence(
            run_id=run.id,
            company_id=args.company_id,
            source_url=args.url,
            source_type="website",
            source_title=args.title or None,
            dimension="website",
            extracted_statement=args.statement,
            supporting_excerpt=args.excerpt or args.statement,
            observation_date=utc_now().strftime("%Y-%m-%d"),
            classification="observed",
            verification_status="unverified",
            collected_at=utc_now(),
            reliability_json={"source": "website", "directness": "high", "relevance": "medium"},
        )
        db.add(evidence)
        db.commit()
        db.refresh(evidence)
        print(evidence.id)
    finally:
        db.close()


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest="command", required=True)

    run_parser = sub.add_parser("run", help="Upsert a research run and its pages")
    run_parser.add_argument("--company-id", required=True)
    run_parser.add_argument("--status", default="completed", choices=RUN_STATUSES)
    run_parser.add_argument("--pages", type=int, default=2)
    run_parser.add_argument("--error", default=None)

    complete_parser = sub.add_parser("complete-run", help="Mark a research run completed")
    complete_parser.add_argument("run_id")

    finding_parser = sub.add_parser("finding", help="Seed a diagnostic finding")
    finding_parser.add_argument("--company-id", required=True)
    finding_parser.add_argument("--dimension", required=True)
    finding_parser.add_argument("--problem", required=True)
    finding_parser.add_argument("--severity", type=int, default=4)
    finding_parser.add_argument("--category", default="confirmed_issue")

    evidence_parser = sub.add_parser("evidence", help="Seed a research evidence row")
    evidence_parser.add_argument("--company-id", required=True)
    evidence_parser.add_argument("--url", required=True)
    evidence_parser.add_argument("--statement", required=True)
    evidence_parser.add_argument("--title", default=None)
    evidence_parser.add_argument("--excerpt", default=None)

    args = parser.parse_args()
    {"run": cmd_run, "complete-run": cmd_complete_run, "finding": cmd_finding, "evidence": cmd_evidence}[args.command](args)


if __name__ == "__main__":
    main()
