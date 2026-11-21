"""Add the Phase 3 growth-loop records.

Extends experiments with naming, ownership, approval/decision history and a
diagnostic link; adds execution tasks, structured measurements and structured
learning reviews; records historical outcomes on opportunities and the company
intelligence profile so future prioritisation can use real results.

Every addition is nullable or has a Python-side default, so existing data stays
intact. Forward-only, like the rest of the Alembic history.

Revision ID: 20261122_phase3_growth_loop
Revises: 20261201_schema_alignment
"""

import sqlalchemy as sa
from alembic import op

revision = "20261122_phase3_growth_loop"
down_revision = "20261201_schema_alignment"
branch_labels = None
depends_on = None


def _inspector() -> sa.Inspector:
    return sa.inspect(op.get_bind())


def _has_column(table: str, column: str) -> bool:
    return any(item["name"] == column for item in _inspector().get_columns(table))


def _has_index(table: str, index: str) -> bool:
    return any(item["name"] == index for item in _inspector().get_indexes(table))


def _has_table(table: str) -> bool:
    return table in _inspector().get_table_names()


def _add_columns(table: str, columns: list[sa.Column]) -> None:
    existing = {item["name"] for item in _inspector().get_columns(table)}
    for column in columns:
        if column.name not in existing:
            op.add_column(table, column)


def upgrade() -> None:
    _add_columns(
        "experiments",
        [
            sa.Column("name", sa.String(200), nullable=True),
            sa.Column("description", sa.Text(), nullable=True),
            sa.Column("guardrail_metrics", sa.JSON(), nullable=True),
            sa.Column("owner", sa.String(200), nullable=True),
            sa.Column("diagnostic_finding_id", sa.String(36), nullable=True),
            sa.Column("decision_history", sa.JSON(), nullable=True),
            sa.Column("approved_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("approved_by", sa.String(200), nullable=True),
            sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("outcome", sa.String(50), nullable=True),
        ],
    )
    # Existing experiments have no name column value; make them readable.
    op.execute("UPDATE experiments SET name = substr(hypothesis, 1, 200) WHERE name IS NULL")

    if not _has_index("experiments", "ix_experiments_diagnostic_finding_id"):
        op.create_index(
            "ix_experiments_diagnostic_finding_id", "experiments", ["diagnostic_finding_id"], unique=False
        )
    fks = _inspector().get_foreign_keys("experiments")
    if not any(fk.get("constrained_columns") == ["diagnostic_finding_id"] for fk in fks):
        with op.batch_alter_table("experiments") as batch:
            batch.create_foreign_key(
                "fk_experiments_diagnostic_finding_id",
                "diagnostic_findings",
                ["diagnostic_finding_id"],
                ["id"],
            )

    _add_columns(
        "experiment_results",
        [
            sa.Column("baseline_value", sa.Float(), nullable=True),
            sa.Column("observed_value", sa.Float(), nullable=True),
            sa.Column("target_value", sa.Float(), nullable=True),
            sa.Column("direction", sa.String(20), nullable=True),
            sa.Column("measurement_start", sa.DateTime(timezone=True), nullable=True),
            sa.Column("measurement_end", sa.DateTime(timezone=True), nullable=True),
            sa.Column("data_source", sa.String(50), nullable=True),
            sa.Column("source_name", sa.String(200), nullable=True),
            sa.Column("evidence_ids", sa.JSON(), nullable=True),
            sa.Column("notes", sa.Text(), nullable=True),
            sa.Column("interpretation", sa.Text(), nullable=True),
            sa.Column("recorded_by", sa.String(200), nullable=True),
        ],
    )

    _add_columns(
        "opportunities",
        [
            sa.Column("last_learning_outcome", sa.String(50), nullable=True),
            sa.Column("last_learning_summary", sa.Text(), nullable=True),
            sa.Column("outcome_adjustment", sa.Integer(), nullable=True),
        ],
    )

    _add_columns(
        "company_intelligence_profiles",
        [sa.Column("experiment_outcomes", sa.JSON(), nullable=True)],
    )

    if not _has_table("experiment_tasks"):
        op.create_table(
            "experiment_tasks",
            sa.Column("id", sa.String(36), primary_key=True),
            sa.Column("company_id", sa.String(36), sa.ForeignKey("companies.id"), nullable=False),
            sa.Column("experiment_id", sa.String(36), sa.ForeignKey("experiments.id"), nullable=False),
            sa.Column("title", sa.String(200), nullable=False),
            sa.Column("description", sa.Text(), nullable=False),
            sa.Column("owner", sa.String(200), nullable=False),
            sa.Column("due_date", sa.DateTime(timezone=True), nullable=True),
            sa.Column("status", sa.String(50), nullable=False),
            sa.Column("requires_approval", sa.Boolean(), nullable=False),
            sa.Column("approval_status", sa.String(50), nullable=False),
            sa.Column("approved_by", sa.String(200), nullable=True),
            sa.Column("approved_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("executed_by", sa.String(200), nullable=True),
            sa.Column("executed_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("notes", sa.JSON(), nullable=False),
            sa.Column("evidence_ids", sa.JSON(), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        )
        op.create_index("ix_experiment_tasks_company_id", "experiment_tasks", ["company_id"], unique=False)
        op.create_index("ix_experiment_tasks_experiment_id", "experiment_tasks", ["experiment_id"], unique=False)

    if not _has_table("experiment_learnings"):
        op.create_table(
            "experiment_learnings",
            sa.Column("id", sa.String(36), primary_key=True),
            sa.Column("company_id", sa.String(36), sa.ForeignKey("companies.id"), nullable=False),
            sa.Column("experiment_id", sa.String(36), sa.ForeignKey("experiments.id"), nullable=False),
            sa.Column("outcome", sa.String(50), nullable=False),
            sa.Column("met_target", sa.Boolean(), nullable=True),
            sa.Column("what_changed", sa.Text(), nullable=False),
            sa.Column("evidence_ids", sa.JSON(), nullable=False),
            sa.Column("what_worked", sa.Text(), nullable=False),
            sa.Column("what_failed", sa.Text(), nullable=False),
            sa.Column("next_steps", sa.Text(), nullable=False),
            sa.Column("recorded_by", sa.String(200), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        )
        op.create_index("ix_experiment_learnings_company_id", "experiment_learnings", ["company_id"], unique=False)
        op.create_index(
            "ix_experiment_learnings_experiment_id", "experiment_learnings", ["experiment_id"], unique=True
        )


def downgrade() -> None:
    # Data-preserving downgrade is not required; drop only what this revision added.
    for table in ("experiment_learnings", "experiment_tasks"):
        if _has_table(table):
            op.drop_table(table)
    for table, columns in (
        ("company_intelligence_profiles", ["experiment_outcomes"]),
        ("opportunities", ["last_learning_outcome", "last_learning_summary", "outcome_adjustment"]),
        (
            "experiment_results",
            [
                "baseline_value", "observed_value", "target_value", "direction", "measurement_start",
                "measurement_end", "data_source", "source_name", "evidence_ids", "notes",
                "interpretation", "recorded_by",
            ],
        ),
        (
            "experiments",
            [
                "name", "description", "guardrail_metrics", "owner", "diagnostic_finding_id",
                "decision_history", "approved_at", "approved_by", "completed_at", "outcome",
            ],
        ),
    ):
        existing = {item["name"] for item in _inspector().get_columns(table)}
        for column in columns:
            if column in existing:
                op.drop_column(table, column)
