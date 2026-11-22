"""Environment-based configuration for the GrowthOS backend.

Configuration comes from environment variables; see ``backend/.env.example``
for the documented variables. No secrets are read from code or committed files.
"""

import os


class Settings:
    """Validated settings loaded from the environment."""

    def __init__(self) -> None:
        database_url = os.getenv("DATABASE_URL", "").strip()
        if not database_url:
            raise ValueError("DATABASE_URL is required (see backend/.env.example).")
        self.database_url = database_url

        raw_origins = os.getenv("CORS_ORIGINS", "http://localhost:3000").strip()
        self.cors_origins = [origin.strip() for origin in raw_origins.split(",") if origin.strip()]

        self.environment = (os.getenv("ENVIRONMENT", "development").strip().lower() or "development")
        if self.environment not in ("development", "test", "staging", "production"):
            raise ValueError("ENVIRONMENT must be development, test, staging or production.")
        if self.environment in ("staging", "production"):
            if not self.cors_origins or any(origin == "*" for origin in self.cors_origins):
                raise ValueError("CORS_ORIGINS must be an explicit list of frontend origins in production.")
            if any(not origin.startswith("https://") for origin in self.cors_origins):
                raise ValueError("CORS_ORIGINS must use https:// in production.")

        self.log_level = (os.getenv("LOG_LEVEL", "INFO").strip() or "INFO").upper()
        self.docs_enabled = self.environment != "production" or (
            os.getenv("ENABLE_API_DOCS", "").strip().lower() == "true"
        )

        try:
            self.session_ttl_hours = int(os.getenv("SESSION_TTL_HOURS", "168").strip() or "168")
        except ValueError as exc:
            raise ValueError("SESSION_TTL_HOURS must be a whole number of hours.") from exc
        if self.session_ttl_hours < 1 or self.session_ttl_hours > 720:
            raise ValueError("SESSION_TTL_HOURS must be between 1 and 720.")

        self.allow_registration = os.getenv("ALLOW_REGISTRATION", "true").strip().lower() != "false"

        ai_provider = os.getenv("AI_PROVIDER", "").strip().lower()
        if ai_provider not in ("", "openai", "anthropic"):
            raise ValueError("AI_PROVIDER must be 'openai' or 'anthropic'.")
        self.ai_provider = ai_provider
        self.ai_api_key = (
            os.getenv("AI_API_KEY") or os.getenv("OPENAI_API_KEY") or os.getenv("ANTHROPIC_API_KEY") or ""
        ).strip()
        self.ai_model = os.getenv("AI_MODEL", "").strip()


settings = Settings()
