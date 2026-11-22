"""Authentication service: registration, login and revocable sessions."""

from datetime import timedelta
from uuid import uuid4

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.exceptions import AuthenticationError, DuplicateError
from app.core.security import generate_session_token, hash_password, hash_session_token, verify_password
from app.models import AuthSession, User, Workspace, utc_now
from app.schemas.auth import AuthResponse, LoginRequest, RegisterRequest, auth_user_out


def _create_session(db: Session, user_id: str) -> str:
    token = generate_session_token()
    db.add(
        AuthSession(
            user_id=user_id,
            token_hash=hash_session_token(token),
            expires_at=utc_now() + timedelta(hours=settings.session_ttl_hours),
        )
    )
    return token


def _response(user: User, token: str) -> AuthResponse:
    assert user.email is not None, "An authenticated user must have an email."
    return AuthResponse(
        token=token,
        user=auth_user_out(user.id, user.email, user.display_name, user.workspace_id),
    )


def register(db: Session, data: RegisterRequest) -> AuthResponse:
    """Create a user, their private workspace and a login session."""
    duplicate = db.execute(select(User).where(User.email == data.email)).scalar_one_or_none()
    if duplicate is not None:
        raise DuplicateError("An account with this email already exists.")

    workspace = Workspace(name=f"{data.displayName}'s Workspace", slug=f"user-{uuid4().hex[:12]}")
    db.add(workspace)
    db.flush()

    user = User(
        workspace_id=workspace.id,
        email=data.email,
        display_name=data.displayName,
        auth_provider="local",
        password_hash=hash_password(data.password),
        is_active=True,
    )
    db.add(user)
    db.flush()
    token = _create_session(db, user.id)

    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise DuplicateError("An account with this email already exists.") from exc
    db.refresh(user)
    return _response(user, token)


def login(db: Session, data: LoginRequest) -> AuthResponse:
    """Verify credentials and issue a new session."""
    user = db.execute(select(User).where(User.email == data.email)).scalar_one_or_none()
    if user is None or not user.is_active or not verify_password(data.password, user.password_hash):
        raise AuthenticationError("Invalid email or password.")

    token = _create_session(db, user.id)
    db.commit()
    return _response(user, token)


def logout(db: Session, session: AuthSession) -> None:
    """Revoke the session used for the current request."""
    session.revoked_at = utc_now()
    db.commit()
