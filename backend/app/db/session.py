"""Database session management."""

from collections.abc import Iterator

from sqlalchemy import create_engine, make_url
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import settings

_engine_options: dict[str, object] = {"pool_pre_ping": True}
if make_url(settings.database_url).get_backend_name() == "postgresql":
    # Small pools keep Supabase's free-plan connection limit comfortable.
    _engine_options.update(pool_size=5, max_overflow=5, pool_timeout=30, pool_recycle=1800)

engine = create_engine(settings.database_url, **_engine_options)
SessionLocal = sessionmaker(autoflush=False, autocommit=False, bind=engine)


def get_db() -> Iterator[Session]:
    """FastAPI dependency that yields a database session per request."""
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()
