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

        self.log_level = (os.getenv("LOG_LEVEL", "INFO").strip() or "INFO").upper()

        ai_provider = os.getenv("AI_PROVIDER", "").strip().lower()
        if ai_provider not in ("", "openai", "anthropic"):
            raise ValueError("AI_PROVIDER must be 'openai' or 'anthropic'.")
        self.ai_provider = ai_provider
        self.ai_api_key = (
            os.getenv("AI_API_KEY") or os.getenv("OPENAI_API_KEY") or os.getenv("ANTHROPIC_API_KEY") or ""
        ).strip()
        self.ai_model = os.getenv("AI_MODEL", "").strip()


settings = Settings()
