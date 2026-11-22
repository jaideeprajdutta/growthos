"""Health-check routes."""

from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.db.session import get_db

router = APIRouter(tags=["health"])


@router.get("/health")
def health() -> dict[str, str]:
    """Liveness probe — always returns OK."""
    return {"status": "ok"}


@router.get("/health/ready")
def readiness(db: Session = Depends(get_db)) -> dict[str, str]:
    """Readiness probe — confirms the database connection and schema are usable."""
    db.execute(text("SELECT 1"))
    db.execute(text("SELECT id FROM users LIMIT 1"))
    return {"status": "ready"}
