"""Shared route dependencies."""

from fastapi import Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.workspaces import Workspace
from app.repositories import workspace_repository


def get_workspace(db: Session = Depends(get_db)) -> Workspace:
    """Resolve the single local GrowthOS workspace."""
    return workspace_repository.get_or_create_workspace(db)
