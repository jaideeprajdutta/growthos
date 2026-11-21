"""Workspace repository: the single local workspace and its local user."""

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import User, Workspace


def get_or_create_workspace(db: Session) -> Workspace:
    """Return the single local GrowthOS workspace, creating it on first use."""
    workspace = db.execute(
        select(Workspace).where(Workspace.name == "GrowthOS", Workspace.slug == "growthos")
    ).scalar_one_or_none()
    if workspace is None:
        workspace = Workspace(name="GrowthOS", slug="growthos")
        db.add(workspace)
        db.commit()
        db.refresh(workspace)
    if db.execute(select(User).where(User.workspace_id == workspace.id)).scalar_one_or_none() is None:
        db.add(User(workspace_id=workspace.id, display_name="Local User", auth_provider="local"))
        db.commit()
    return workspace
