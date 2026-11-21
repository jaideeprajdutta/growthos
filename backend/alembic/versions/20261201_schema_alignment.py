"""Align the migrated schema with the ORM models.

The Phase 2 migration added two foreign-key columns without their foreign-key
constraints, omitted the ``intelligence_reports.run_id`` index, and the initial
migration omitted ``activity_log.updated_at`` even though the model inherits
``TimestampMixin``. This revision brings migration-built databases in line with
``Base.metadata`` without rewriting published migrations.

Every step is guarded by schema inspection so the revision is safe to run
against databases that were repaired by hand (such as the original local
development database) as well as fresh databases.

Revision ID: 20261201_schema_alignment
Revises: 20261130_phase2_models
"""

import sqlalchemy as sa
from alembic import op

revision = "20261201_schema_alignment"
down_revision = "20261130_phase2_models"
branch_labels = None
depends_on = None


def _inspector() -> sa.Inspector:
    return sa.inspect(op.get_bind())


def _has_column(table: str, column: str) -> bool:
    return any(item["name"] == column for item in _inspector().get_columns(table))


def _has_index(table: str, name: str) -> bool:
    return any(item["name"] == name for item in _inspector().get_indexes(table))


def _has_foreign_key(table: str, column: str, referred_table: str) -> bool:
    return any(
        fk.get("constrained_columns") == [column] and fk.get("referred_table") == referred_table
        for fk in _inspector().get_foreign_keys(table)
    )


def upgrade() -> None:
    # The model inherits TimestampMixin, but the initial migration created
    # activity_log without updated_at. Add it, backfill from created_at, then
    # enforce NOT NULL (SQLite needs a table rebuild for that).
    if not _has_column("activity_log", "updated_at"):
        op.add_column("activity_log", sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True))
        op.execute("UPDATE activity_log SET updated_at = created_at WHERE updated_at IS NULL")
        with op.batch_alter_table("activity_log") as batch:
            batch.alter_column("updated_at", existing_type=sa.DateTime(timezone=True), nullable=False)

    if not _has_index("intelligence_reports", "ix_intelligence_reports_run_id"):
        op.create_index("ix_intelligence_reports_run_id", "intelligence_reports", ["run_id"], unique=False)

    # These indexes belong to the Phase 2 revision. They are re-checked here so
    # a database that was baselined with ``alembic stamp 20261130_phase2_models``
    # (and therefore skipped that revision's DDL) is repaired as well.
    if not _has_index("experiments", "ix_experiments_opportunity_id"):
        op.create_index("ix_experiments_opportunity_id", "experiments", ["opportunity_id"], unique=False)

    if not _has_index("opportunities", "ix_opportunities_diagnostic_finding_id"):
        op.create_index(
            "ix_opportunities_diagnostic_finding_id", "opportunities", ["diagnostic_finding_id"], unique=False
        )

    # SQLite cannot add a foreign key to an existing table, so rebuild via batch.
    if not _has_foreign_key("experiments", "opportunity_id", "opportunities"):
        with op.batch_alter_table("experiments") as batch:
            batch.create_foreign_key(
                "fk_experiments_opportunity_id",
                "opportunities",
                ["opportunity_id"],
                ["id"],
            )

    if not _has_foreign_key("opportunities", "diagnostic_finding_id", "diagnostic_findings"):
        with op.batch_alter_table("opportunities") as batch:
            batch.create_foreign_key(
                "fk_opportunities_diagnostic_finding_id",
                "diagnostic_findings",
                ["diagnostic_finding_id"],
                ["id"],
            )


def downgrade() -> None:
    if _has_foreign_key("opportunities", "diagnostic_finding_id", "diagnostic_findings"):
        with op.batch_alter_table("opportunities") as batch:
            batch.drop_constraint("fk_opportunities_diagnostic_finding_id", type_="foreignkey")

    if _has_foreign_key("experiments", "opportunity_id", "opportunities"):
        with op.batch_alter_table("experiments") as batch:
            batch.drop_constraint("fk_experiments_opportunity_id", type_="foreignkey")

    if _has_index("intelligence_reports", "ix_intelligence_reports_run_id"):
        op.drop_index("ix_intelligence_reports_run_id", table_name="intelligence_reports")

    if _has_column("activity_log", "updated_at"):
        with op.batch_alter_table("activity_log") as batch:
            batch.drop_column("updated_at")
