"""Shared test fixtures: an isolated in-memory SQLite database for API tests."""

import os

os.environ["DATABASE_URL"] = "sqlite://"  # must be set before importing the app

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import StaticPool, create_engine
from sqlalchemy.orm import sessionmaker

from app.api.v1 import dependencies as route_dependencies
from app.core.security import hash_password
from app.db import session as session_module
from app.main import app
from app.models import Base, User, Workspace

TEST_ENGINE = create_engine(
    "sqlite://",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestSessionLocal = sessionmaker(autoflush=False, autocommit=False, bind=TEST_ENGINE)
session_module.SessionLocal = TestSessionLocal

Base.metadata.create_all(TEST_ENGINE)


@pytest.fixture()
def db():
    session = TestSessionLocal()
    for table in reversed(Base.metadata.sorted_tables):
        session.execute(table.delete())
    session.commit()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture()
def auth_user(db):
    """A signed-in local user whose workspace all default tests operate in."""
    workspace = Workspace(name="GrowthOS", slug="growthos")
    db.add(workspace)
    db.flush()
    user = User(
        workspace_id=workspace.id,
        email="test@example.com",
        display_name="Test User",
        auth_provider="local",
        password_hash=hash_password("TestPassword123!"),
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture()
def client(db, auth_user):
    app.dependency_overrides[session_module.get_db] = lambda: db
    app.dependency_overrides[route_dependencies.get_current_user] = lambda: auth_user
    test_client = TestClient(app)
    yield test_client
    app.dependency_overrides.pop(session_module.get_db, None)
    app.dependency_overrides.pop(route_dependencies.get_current_user, None)


@pytest.fixture()
def auth_client(db):
    """A client with no auth override, for exercising real tokens and sessions."""
    app.dependency_overrides[session_module.get_db] = lambda: db
    test_client = TestClient(app)
    yield test_client
    app.dependency_overrides.pop(session_module.get_db, None)
