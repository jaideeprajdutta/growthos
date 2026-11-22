"""Authentication request and response schemas."""

import re

from pydantic import BaseModel, Field, field_validator

_EMAIL_PATTERN = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def _normalise_email(value: str) -> str:
    email = value.strip().lower()
    if not _EMAIL_PATTERN.fullmatch(email):
        raise ValueError("Enter a valid email address.")
    return email


class RegisterRequest(BaseModel):
    email: str = Field(max_length=255)
    password: str = Field(min_length=8, max_length=128)
    displayName: str = Field(min_length=2, max_length=100)

    @field_validator("email")
    @classmethod
    def valid_email(cls, value: str) -> str:
        return _normalise_email(value)

    @field_validator("password")
    @classmethod
    def meaningful_password(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("Password cannot be blank.")
        return value

    @field_validator("displayName")
    @classmethod
    def trim_display_name(cls, value: str) -> str:
        cleaned = value.strip()
        if len(cleaned) < 2:
            raise ValueError("Display name must contain at least 2 characters.")
        return cleaned


class LoginRequest(BaseModel):
    email: str = Field(max_length=255)
    password: str = Field(min_length=1, max_length=128)

    @field_validator("email")
    @classmethod
    def valid_email(cls, value: str) -> str:
        return _normalise_email(value)


class AuthUserOut(BaseModel):
    id: str
    email: str
    displayName: str
    workspaceId: str


class AuthResponse(BaseModel):
    token: str
    user: AuthUserOut


def auth_user_out(user_id: str, email: str, display_name: str, workspace_id: str) -> AuthUserOut:
    return AuthUserOut(
        id=user_id,
        email=email,
        displayName=display_name,
        workspaceId=workspace_id,
    )
