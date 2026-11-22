"""Add DB-backed authentication and private workspaces.

Adds password hashes and active flags to users, plus revocable bearer sessions.
Each new account receives its own workspace; legacy local rows have no password
and cannot authenticate. Forward-only, like the rest of the Alembic history.

Revision ID: 20261123_authentication
Revises: 20261122_phase3_growth_loop
"""

import sqlalchemy as sa
from alembic import op

revision = "20261123_authentication"
down_revision = "20261122_phase3_growth_loop"
branch_labels = None
depends_on = None


def _inspector() -> sa.Inspector:
    return sa.inspect(op.get_bind())


def _has_column(table: str, column: str) -> bool:
    return any(item["name"] == column for item in _inspector().get_columns(table))


def _has_table(table: str) -> bool:
    return table in _inspector().get_table_names()


def _has_index(table: str, index: str) -> bool:
    return any(item["name"] == index for item in _inspector().get_indexes(table))


def upgrade() -> None:
    if not _has_column("users", "password_hash"):
        op.add_column("users", sa.Column("password_hash", sa.String(255), nullable=True))
    if not _has_column("users", "is_active"):
        op.add_column(
            "users",
            sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        )
    op.execute("UPDATE users SET is_active = 1 WHERE is_active IS NULL")

    if not _has_table("auth_sessions"):
        op.create_table(
            "auth_sessions",
            sa.Column("id", sa.String(36), primary_key=True),
            sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id"), nullable=False),
            sa.Column("token_hash", sa.String(64), nullable=False),
            sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        )
    if not _has_index("auth_sessions", "ix_auth_sessions_user_id"):
        op.create_index("ix_auth_sessions_user_id", "auth_sessions", ["user_id"], unique=False)
    if not _has_index("auth_sessions", "ix_auth_sessions_token_hash"):
        op.create_index("ix_auth_sessions_token_hash", "auth_sessions", ["token_hash"], unique=True)


def downgrade() -> None:
    if _has_table("auth_sessions"):
        op.drop_table("auth_sessions")
    existing = {item["name"] for item in _inspector().get_columns("users")}
    if "is_active" in existing:
        op.drop_column("users", "is_active")
    if "password_hash" in existing:
        op.drop_column("users", "password_hash")
