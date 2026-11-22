"""Authentication and per-account isolation tests."""

from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import AuthSession, User


def auth_header(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def register(client: TestClient, email: str, name: str = "Pilot User") -> dict:
    response = client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": "PilotPassword123!", "displayName": name},
    )
    assert response.status_code == 201, response.text
    return response.json()


def test_protected_routes_require_a_token(auth_client: TestClient):
    assert auth_client.get("/api/v1/health").json() == {"status": "ok"}
    response = auth_client.get("/api/v1/companies")
    assert response.status_code == 401
    assert response.headers["www-authenticate"] == "Bearer"

    bearer = auth_client.get("/api/v1/companies", headers={"Authorization": "Bearer not-a-real-token"})
    assert bearer.status_code == 401


def test_register_me_login_and_logout(auth_client: TestClient, db: Session):
    registered = register(auth_client, "pilot@example.com", "Pilot User")
    token = registered["token"]
    assert registered["user"]["email"] == "pilot@example.com"
    assert registered["user"]["displayName"] == "Pilot User"
    assert registered["user"]["workspaceId"]

    me = auth_client.get("/api/v1/auth/me", headers=auth_header(token))
    assert me.status_code == 200
    assert me.json()["email"] == "pilot@example.com"

    stored = db.execute(select(AuthSession)).scalar_one()
    assert stored.token_hash != token
    assert len(stored.token_hash) == 64

    wrong = auth_client.post(
        "/api/v1/auth/login",
        json={"email": "pilot@example.com", "password": "WrongPassword123!"},
    )
    assert wrong.status_code == 401

    login = auth_client.post(
        "/api/v1/auth/login",
        json={"email": "pilot@example.com", "password": "PilotPassword123!"},
    )
    assert login.status_code == 200
    assert login.json()["user"]["id"] == registered["user"]["id"]

    logout = auth_client.post("/api/v1/auth/logout", headers=auth_header(token))
    assert logout.status_code == 204
    assert auth_client.get("/api/v1/auth/me", headers=auth_header(token)).status_code == 401
    assert auth_client.get("/api/v1/auth/me", headers=auth_header(login.json()["token"])).status_code == 200


def test_duplicate_email_is_rejected(auth_client: TestClient):
    register(auth_client, "duplicate@example.com")
    response = auth_client.post(
        "/api/v1/auth/register",
        json={"email": "DUPLICATE@example.com", "password": "PilotPassword123!", "displayName": "Other"},
    )
    assert response.status_code == 409
    assert "already exists" in response.json()["detail"]


def test_legacy_user_without_password_cannot_log_in(auth_client: TestClient, db: Session):
    user = db.execute(select(User)).scalar_one_or_none()
    assert user is None  # the auth_client fixture starts from an empty database
    db.add(User(email="legacy@example.com", display_name="Legacy", workspace_id="missing"))
    db.commit()
    response = auth_client.post(
        "/api/v1/auth/login",
        json={"email": "legacy@example.com", "password": "PilotPassword123!"},
    )
    assert response.status_code == 401


def test_accounts_cannot_access_each_others_companies(auth_client: TestClient):
    first = register(auth_client, "tenant-a@example.com", "Tenant A")
    second = register(auth_client, "tenant-b@example.com", "Tenant B")

    created = auth_client.post(
        "/api/v1/companies",
        headers=auth_header(first["token"]),
        json={"name": "Private Company", "isActive": True},
    )
    assert created.status_code == 201, created.text
    company_id = created.json()["id"]

    assert auth_client.get("/api/v1/companies", headers=auth_header(first["token"])).json()[0]["id"] == company_id
    assert auth_client.get("/api/v1/companies", headers=auth_header(second["token"])).json() == []
    assert (
        auth_client.get(
            f"/api/v1/companies/{company_id}",
            headers=auth_header(second["token"]),
        ).status_code
        == 404
    )
