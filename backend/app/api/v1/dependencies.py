"""Shared route dependencies for authentication and workspace scoping."""

from datetime import datetime, timezone

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import hash_session_token
from app.db.session import get_db
from app.models import AuthSession, User, Workspace, utc_now

bearer_scheme = HTTPBearer(auto_error=False, description="Bearer token returned by /auth/login or /auth/register")


def _as_utc(value: datetime) -> datetime:
    """SQLite can return naive datetimes; compare everything as UTC."""
    return value if value.tzinfo is not None else value.replace(tzinfo=timezone.utc)


def _unauthorized(detail: str = "Authentication required") -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail=detail,
        headers={"WWW-Authenticate": "Bearer"},
    )


def get_current_session(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> AuthSession:
    """Resolve the bearer token to a live, unrevoked session."""
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise _unauthorized()
    session = db.execute(
        select(AuthSession).where(AuthSession.token_hash == hash_session_token(credentials.credentials))
    ).scalar_one_or_none()
    if session is None or session.revoked_at is not None or _as_utc(session.expires_at) <= utc_now():
        raise _unauthorized("Session is invalid or has expired")
    return session


def get_current_user(
    session: AuthSession = Depends(get_current_session),
    db: Session = Depends(get_db),
) -> User:
    """Return the authenticated user for the current request."""
    user = db.get(User, session.user_id)
    if user is None or not user.is_active:
        raise _unauthorized("Session is invalid or has expired")
    return user


def get_workspace(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Workspace:
    """Resolve the authenticated user's private workspace."""
    workspace = db.get(Workspace, current_user.workspace_id)
    if workspace is None:
        raise _unauthorized("Workspace is unavailable")
    return workspace
