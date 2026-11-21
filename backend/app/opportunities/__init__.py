"""GrowthOS opportunities package: opportunity generation + transparent scoring."""

from app.opportunities.engine import generate_opportunities
from app.opportunities.scoring import DEFAULT_WEIGHTS, STATUS_BONUS, score_opportunity

__all__ = ["DEFAULT_WEIGHTS", "STATUS_BONUS", "generate_opportunities", "score_opportunity"]
