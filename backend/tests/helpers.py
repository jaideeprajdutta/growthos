"""Shared test helpers: create workspace/company rows in the test database."""

from uuid import uuid4

from sqlalchemy import select

from app.models import Company, Workspace
from app.models.base import new_id


def make_workspace(db):
    ws = db.execute(select(Workspace).limit(1)).scalars().first()
    if ws is None:
        ws = Workspace(id=new_id(), name="Test Workspace", slug=f"ws-{uuid4().hex[:8]}")
        db.add(ws)
        db.commit()
        db.refresh(ws)
    return ws


def make_company(db, name="Test Co", website="https://example.com"):
    ws = make_workspace(db)
    company = Company(id=new_id(), workspace_id=ws.id, name=name, website=website, is_active=True, business_model="saas")
    db.add(company)
    db.commit()
    db.refresh(company)
    return company
