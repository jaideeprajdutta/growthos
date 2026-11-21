"""Opportunity scoring tests (app/opportunities/scoring.py)."""

from types import SimpleNamespace

from app.opportunities.scoring import DEFAULT_WEIGHTS, STATUS_BONUS, score_opportunity


def _opp(confidence=50, effort=5, status="discovered"):
    return SimpleNamespace(confidence=confidence, effort=effort, status=status)


def test_score_formula_uses_configured_weights():
    expected = (
        round(50 * DEFAULT_WEIGHTS["confidence"] / 100)
        + round((10 - 5) * DEFAULT_WEIGHTS["effort"] / 10)
        + STATUS_BONUS.get("discovered", 0)
    )
    assert score_opportunity(_opp()) == expected
    assert score_opportunity(_opp()) == 35


def test_score_clamps_inputs():
    assert 0 <= score_opportunity(_opp(confidence=500, effort=99)) <= 100
    assert 0 <= score_opportunity(_opp(confidence=0, effort=0)) <= 100


def test_status_bonus_is_transparent():
    assert score_opportunity(_opp(status="approved")) == score_opportunity(_opp(status="discovered")) + STATUS_BONUS["approved"]
