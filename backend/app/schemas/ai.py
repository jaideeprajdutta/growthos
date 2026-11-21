"""AI status schema."""

from typing import Optional

from pydantic import BaseModel


class AIStatusOut(BaseModel):
    configured: bool
    provider: Optional[str]
    model: Optional[str]
