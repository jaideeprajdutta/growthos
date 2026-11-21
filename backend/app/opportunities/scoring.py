"""Transparent, configurable priority scoring for opportunities.

Deterministic heuristics (not fabricated metrics): the score is computed from
recorded fields so users can see why one opportunity ranks above another:

```
score = round(confidence * confidence_weight)
      + round((10 - effort) * effort_weight)
      + status_bonus(status)
```

Both weights and status bonuses are configurable constants — see
``DEFAULT_WEIGHTS`` and ``STATUS_BONUS``.
"""

DEFAULT_WEIGHTS = {
    "confidence": 40,  # percent of the score, from confidence (0–100)
    "effort": 30,  # percent of the score, inversely from effort (1–10)
}

STATUS_BONUS = {
    "approved": 10,
    "experimenting": 10,
    "implemented": 10,
    "completed": 5,
}


def score_opportunity(opportunity, weights=None, status_bonus=None) -> int:
    """Compute a 0–100 priority score from recorded opportunity fields.

    Higher scores indicate higher priority. Values are deterministic and
    explainable from the stored fields.
    """
    weights = weights or DEFAULT_WEIGHTS
    bonus = status_bonus if status_bonus is not None else STATUS_BONUS

    confidence = max(0, min(100, opportunity.confidence or 0))
    effort = max(1, min(10, opportunity.effort or 5))

    score = (
        round(confidence * weights["confidence"] / 100)
        + round((10 - effort) * weights["effort"] / 10)
        + bonus.get(opportunity.status, 0)
    )
    return max(0, min(100, score))
