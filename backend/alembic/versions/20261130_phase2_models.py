"""Phase 2: intelligence models — company profiles, research, evidence, reports, diagnostics.

Adds:
- company_intelligence_profiles
- research_runs, research_pages
- evidence
- intelligence_findings, intelligence_reports
- diagnostic_runs, diagnostic_findings
- opportunity_evidence
And adds experiments.opportunity_id + opportunities.diagnostic_finding_id.
"""

import sqlalchemy as sa
from alembic import op

revision = "20261130_phase2_models"
down_revision = "20261121_initial"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "company_intelligence_profiles",
        sa.Column("id", sa.String(36), nullable=False),
        sa.Column("company_id", sa.String(36), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("source", sa.String(100), nullable=True),
        sa.Column("generated_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("refreshed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("provenance", sa.JSON(), nullable=True),
        sa.Column("value_proposition", sa.Text(), nullable=True),
        sa.Column("target_audience", sa.Text(), nullable=True),
        sa.Column("customer_pain_points", sa.Text(), nullable=True),
        sa.Column("geographic_markets", sa.Text(), nullable=True),
        sa.Column("company_size", sa.Text(), nullable=True),
        sa.Column("key_differentiators", sa.Text(), nullable=True),
        sa.Column("pricing_model", sa.Text(), nullable=True),
        sa.Column("main_products", sa.Text(), nullable=True),
        sa.Column("customer_acquisition_channels", sa.Text(), nullable=True),
        sa.Column("sales_conversion_journey", sa.Text(), nullable=True),
        sa.Column("retention_approach", sa.Text(), nullable=True),
        sa.Column("competitors", sa.Text(), nullable=True),
        sa.Column("strategic_priorities", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["company_id"], ["companies.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("company_id"),
    )
    op.create_index("ix_company_intelligence_profiles_company_id", "company_intelligence_profiles", ["company_id"], unique=False)

    op.create_table(
        "research_runs",
        sa.Column("id", sa.String(36), nullable=False),
        sa.Column("company_id", sa.String(36), nullable=False),
        sa.Column("source_url", sa.String(512), nullable=False),
        sa.Column("status", sa.String(50), nullable=False),
        sa.Column("pages_scanned", sa.Integer(), nullable=False),
        sa.Column("error_message", sa.String(2000), nullable=True),
        sa.Column("config_json", sa.JSON(), nullable=True),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("finished_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["company_id"], ["companies.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_research_runs_company_id", "research_runs", ["company_id"], unique=False)

    op.create_table(
        "research_pages",
        sa.Column("id", sa.String(36), nullable=False),
        sa.Column("run_id", sa.String(36), nullable=False),
        sa.Column("url", sa.String(2048), nullable=False),
        sa.Column("status", sa.String(50), nullable=False),
        sa.Column("status_detail", sa.Text(), nullable=True),
        sa.Column("title", sa.String(500), nullable=True),
        sa.Column("extracted_text", sa.Text(), nullable=True),
        sa.Column("word_count", sa.Integer(), nullable=False),
        sa.Column("extracted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("duration_ms", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["run_id"], ["research_runs.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_research_pages_run_id", "research_pages", ["run_id"], unique=False)

    op.create_table(
        "evidence",
        sa.Column("id", sa.String(36), nullable=False),
        sa.Column("run_id", sa.String(36), nullable=False),
        sa.Column("company_id", sa.String(36), nullable=False),
        sa.Column("source_url", sa.String(2048), nullable=False),
        sa.Column("source_title", sa.String(500), nullable=True),
        sa.Column("source_type", sa.String(100), nullable=False),
        sa.Column("extracted_statement", sa.Text(), nullable=True),
        sa.Column("supporting_excerpt", sa.Text(), nullable=True),
        sa.Column("observation_date", sa.String(50), nullable=True),
        sa.Column("collected_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("dimension", sa.String(100), nullable=False),
        sa.Column("classification", sa.String(50), nullable=False),
        sa.Column("reliability_json", sa.JSON(), nullable=True),
        sa.Column("verification_status", sa.String(50), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["run_id"], ["research_runs.id"]),
        sa.ForeignKeyConstraint(["company_id"], ["companies.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_evidence_company_id", "evidence", ["company_id"], unique=False)
    op.create_index("ix_evidence_run_id", "evidence", ["run_id"], unique=False)

    op.create_table(
        "intelligence_findings",
        sa.Column("id", sa.String(36), nullable=False),
        sa.Column("company_id", sa.String(36), nullable=False),
        sa.Column("run_id", sa.String(36), nullable=True),
        sa.Column("dimension", sa.String(100), nullable=False),
        sa.Column("title", sa.String(500), nullable=False),
        sa.Column("category", sa.String(50), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("confidence", sa.Float(), nullable=True),
        sa.Column("severity", sa.String(50), nullable=True),
        sa.Column("evidence_ids", sa.JSON(), nullable=True),
        sa.Column("root_cause_hypothesis", sa.Text(), nullable=True),
        sa.Column("validation_method", sa.Text(), nullable=True),
                sa.Column("suggested_next_step", sa.Text(), nullable=True),
sa.Column("status", sa.String(50), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["company_id"], ["companies.id"]),
        sa.ForeignKeyConstraint(["run_id"], ["research_runs.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_intelligence_findings_company_id", "intelligence_findings", ["company_id"], unique=False)
    op.create_index("ix_intelligence_findings_run_id", "intelligence_findings", ["run_id"], unique=False)

    op.create_table(
        "intelligence_reports",
        sa.Column("id", sa.String(36), nullable=False),
        sa.Column("company_id", sa.String(36), nullable=False),
        sa.Column("run_id", sa.String(36), nullable=True),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("generated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("executive_summary", sa.Text(), nullable=True),
        sa.Column("sections", sa.JSON(), nullable=False),
        sa.Column("findings_count", sa.Integer(), nullable=False),
        sa.Column("ai_usage_json", sa.JSON(), nullable=True),
        sa.Column("model", sa.String(100), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["company_id"], ["companies.id"]),
        sa.ForeignKeyConstraint(["run_id"], ["research_runs.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_intelligence_reports_company_id", "intelligence_reports", ["company_id"], unique=False)

    op.create_table(
        "diagnostic_runs",
        sa.Column("id", sa.String(36), nullable=False),
        sa.Column("company_id", sa.String(36), nullable=False),
        sa.Column("run_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("model", sa.String(100), nullable=True),
        sa.Column("ai_usage_json", sa.JSON(), nullable=True),
        sa.Column("input_summary", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["company_id"], ["companies.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_diagnostic_runs_company_id", "diagnostic_runs", ["company_id"], unique=False)

    op.create_table(
        "diagnostic_findings",
        sa.Column("id", sa.String(36), nullable=False),
        sa.Column("run_id", sa.String(36), nullable=False),
        sa.Column("company_id", sa.String(36), nullable=False),
        sa.Column("dimension", sa.String(100), nullable=False),
        sa.Column("problem_statement", sa.Text(), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("category", sa.String(50), nullable=False),
        sa.Column("severity", sa.Integer(), nullable=True),
        sa.Column("confidence", sa.Float(), nullable=True),
        sa.Column("evidence_ids", sa.JSON(), nullable=True),
        sa.Column("root_cause_hypothesis", sa.Text(), nullable=True),
        sa.Column("validation_method", sa.Text(), nullable=True),
        sa.Column("suggested_next_step", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["company_id"], ["companies.id"]),
        sa.ForeignKeyConstraint(["run_id"], ["diagnostic_runs.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_diagnostic_findings_run_id", "diagnostic_findings", ["run_id"], unique=False)
    op.create_index("ix_diagnostic_findings_company_id", "diagnostic_findings", ["company_id"], unique=False)

    op.create_table(
        "opportunity_evidence",
        sa.Column("id", sa.String(36), nullable=False),
        sa.Column("opportunity_id", sa.String(36), nullable=False),
        sa.Column("evidence_id", sa.String(36), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["opportunity_id"], ["opportunities.id"]),
        sa.ForeignKeyConstraint(["evidence_id"], ["evidence.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_opportunity_evidence_opportunity_id", "opportunity_evidence", ["opportunity_id"], unique=False)
    op.create_index("ix_opportunity_evidence_evidence_id", "opportunity_evidence", ["evidence_id"], unique=False)

    op.add_column("opportunities", sa.Column("diagnostic_finding_id", sa.String(36), nullable=True))
    op.create_index("ix_opportunities_diagnostic_finding_id", "opportunities", ["diagnostic_finding_id"], unique=False)
    op.add_column("experiments", sa.Column("opportunity_id", sa.String(36), nullable=True))
    op.create_index("ix_experiments_opportunity_id", "experiments", ["opportunity_id"], unique=False)


def downgrade() -> None:
    for table in [
        "company_intelligence_profiles",
        "research_pages",
        "research_runs",
        "evidence",
        "intelligence_reports",
        "intelligence_findings",
        "diagnostic_findings",
        "diagnostic_runs",
        "opportunity_evidence",
    ]:
        op.drop_table(table)
    op.drop_index("ix_experiments_opportunity_id", "experiments")
    op.drop_column("experiments", "opportunity_id")
    op.drop_index("ix_opportunities_diagnostic_finding_id", "opportunities")
    op.drop_column("opportunities", "diagnostic_finding_id")
