"""Public authentication routes and the current-user endpoint."""

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy.orm import Session

from app.api.v1.dependencies import get_current_session, get_current_user
from app.core.config import settings
from app.core.security import InMemoryRateLimiter
from app.db.session import get_db
from app.models import AuthSession, User
from app.schemas.auth import AuthResponse, AuthUserOut, LoginRequest, RegisterRequest, auth_user_out
from app.services import auth_service

router = APIRouter(tags=["auth"])
_rate_limiter = InMemoryRateLimiter()


def _rate_key(request: Request, action: str, email: str) -> str:
    client = request.client.host if request.client else "unknown"
    return f"{action}:{email.strip().lower()}:{client}"


@router.post("/auth/register", status_code=status.HTTP_201_CREATED, response_model=AuthResponse)
def register(data: RegisterRequest, request: Request, db: Session = Depends(get_db)) -> AuthResponse:
    if not settings.allow_registration:
        raise HTTPException(status_code=403, detail="Registration is closed for this workspace.")
    key = _rate_key(request, "register", data.email)
    if not _rate_limiter.allow(key):
        raise HTTPException(status_code=429, detail="Too many attempts. Please try again later.")
    response = auth_service.register(db, data)
    _rate_limiter.clear(key)
    return response


@router.post("/auth/login", response_model=AuthResponse)
def login(data: LoginRequest, request: Request, db: Session = Depends(get_db)) -> AuthResponse:
    key = _rate_key(request, "login", data.email)
    if not _rate_limiter.allow(key):
        raise HTTPException(status_code=429, detail="Too many attempts. Please try again later.")
    try:
        response = auth_service.login(db, data)
    except Exception:
        # Failed attempts count against the window; successes are cleared below.
        raise
    _rate_limiter.clear(key)
    return response


@router.get("/auth/me", response_model=AuthUserOut)
def me(current_user: User = Depends(get_current_user)) -> AuthUserOut:
    assert current_user.email is not None
    return auth_user_out(current_user.id, current_user.email, current_user.display_name, current_user.workspace_id)


@router.post("/auth/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(
    session: AuthSession = Depends(get_current_session),
    db: Session = Depends(get_db),
) -> Response:
    auth_service.logout(db, session)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
