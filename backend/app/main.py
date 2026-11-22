"""FastAPI application entry point."""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.ai.client import AIError
from app.api.v1 import router as api_router
from app.core.config import settings
from app.core.exceptions import AuthenticationError, DomainValidationError, DuplicateError, NotFoundError
from app.db.session import engine
from app.models.base import Base
from app.research.jobs import recover_interrupted_runs

logging.basicConfig(level=settings.log_level, format="%(asctime)s %(levelname)s %(name)s - %(message)s")
logger = logging.getLogger("growthos")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Run safe startup work; Alembic owns the production schema."""
    if settings.environment == "production":
        logger.info("Production startup: schema is managed by Alembic migrations")
    else:
        Base.metadata.create_all(engine)
    try:
        recover_interrupted_runs()
    except Exception:
        logger.exception("Could not recover interrupted research runs at startup")
    logger.info("GrowthOS backend started on /api/v1")
    yield
    logger.info("GrowthOS backend stopped")


def create_app() -> FastAPI:
    docs_url = "/docs" if settings.docs_enabled else None
    app = FastAPI(
        title="GrowthOS API",
        version="1.0.0",
        lifespan=lifespan,
        docs_url=docs_url,
        redoc_url=docs_url and "/redoc",
        openapi_url=docs_url and "/openapi.json",
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=False,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type"],
    )

    @app.middleware("http")
    async def security_headers(request: Request, call_next):
        response = await call_next(request)
        response.headers.setdefault("X-Content-Type-Options", "nosniff")
        response.headers.setdefault("X-Frame-Options", "DENY")
        response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
        response.headers.setdefault("Permissions-Policy", "geolocation=(), microphone=(), camera=()")
        if settings.environment == "production":
            response.headers.setdefault("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
        return response

    app.include_router(api_router, prefix="/api/v1")

    @app.exception_handler(AuthenticationError)
    async def authentication_handler(request: Request, exc: AuthenticationError) -> JSONResponse:
        return JSONResponse(
            status_code=401,
            content={"detail": str(exc)},
            headers={"WWW-Authenticate": "Bearer"},
        )

    @app.exception_handler(NotFoundError)
    async def not_found_handler(request: Request, exc: NotFoundError) -> JSONResponse:
        return JSONResponse(status_code=404, content={"detail": str(exc)})

    @app.exception_handler(DuplicateError)
    async def duplicate_handler(request: Request, exc: DuplicateError) -> JSONResponse:
        return JSONResponse(status_code=409, content={"detail": str(exc)})

    @app.exception_handler(RequestValidationError)
    async def validation_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
        errors = [{"field": list(error["loc"])[-1:], "message": error["msg"]} for error in exc.errors()]
        return JSONResponse(status_code=422, content={"detail": errors})

    @app.exception_handler(DomainValidationError)
    async def domain_validation_handler(request: Request, exc: DomainValidationError) -> JSONResponse:
        return JSONResponse(status_code=422, content={"detail": str(exc)})

    @app.exception_handler(AIError)
    async def ai_error_handler(request: Request, exc: AIError) -> JSONResponse:
        """Surface AI configuration/provider failures instead of a generic 500."""
        logger.warning("AI request failed: %s", exc)
        return JSONResponse(status_code=503, content={"detail": str(exc)})

    @app.exception_handler(Exception)
    async def unhandled_handler(request: Request, exc: Exception) -> JSONResponse:
        logger.exception("Unhandled error")
        return JSONResponse(status_code=500, content={"detail": "Internal server error"})

    return app


app = create_app()
