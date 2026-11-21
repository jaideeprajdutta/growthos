"""Activity log routes."""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.v1.dependencies import get_workspace
from app.db.session import get_db
from app.models.workspaces import Workspace
from app.repositories import activity_log_repository, company_repository
from app.schemas.activity_log import ActivityLogOut, activity_log_out

router = APIRouter(tags=["activity"])


@router.get("/companies/{company_id}/activity", response_model=list[ActivityLogOut])
def list_activity(
    company_id: str,
    db: Session = Depends(get_db),
    workspace: Workspace = Depends(get_workspace),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
) -> list[ActivityLogOut]:
    """Recent activity entries for a company, newest first."""
    company_repository.require_company(db, company_id, workspace.id)
    return [
        activity_log_out(entry) for entry in activity_log_repository.list_activity(db, company_id, limit, offset)
    ]
