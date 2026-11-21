"""Shared test fixtures: an isolated in-memory SQLite database for API tests."""

import os

os.environ["DATABASE_URL"] = "sqlite://"  # must be set before importing the app

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import StaticPool, create_engine
from sqlalchemy.orm import sessionmaker

from app.db import session as session_module
from app.main import app
from app.models.base import Base

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
def client(db):
    app.dependency_overrides[session_module.get_db] = lambda: db
    test_client = TestClient(app)
    yield test_client
    app.dependency_overrides.pop(session_module.get_db, None)
