"""Robots.txt compliance tests (app/research/robots.py)."""

from unittest.mock import patch

from app.research import robots
from app.research.robots import RobotsPolicy, fetch_robots_policy


def _policy(text: str, status: int = 200) -> RobotsPolicy:
    with patch.object(robots, "_fetch_robots_response", return_value=(status, text)):
        return fetch_robots_policy("http://example.com/")


def test_robots_allows_when_disallow_missing():
    policy = _policy("User-agent: GrowthOSBot\n")
    assert policy.allows("http://example.com/any") is True


def test_robots_blocks_disallowed_path():
    policy = _policy("User-agent: GrowthOSBot\nDisallow: /private\n")
    assert policy.allows("http://example.com/private") is False
    assert policy.allows("http://example.com/public") is True


def test_robots_404_allows_all():
    policy = _policy("", status=404)
    assert policy.allows("http://example.com/anything") is True


def test_robots_403_disallows_all():
    policy = _policy("", status=403)
    assert policy.allows("http://example.com/anything") is False


def test_robots_server_error_disallows_all():
    policy = _policy("", status=500)
    assert policy.allows("http://example.com/anything") is False


def test_robots_returns_disallow_when_fetch_fails():
    with patch.object(robots, "_fetch_robots_response", side_effect=OSError("network down")):
        policy = fetch_robots_policy("http://example.com/")
    assert policy.allows("http://example.com/") is False


def test_robots_allows_wrapper_uses_policy():
    with patch.object(robots, "fetch_robots_policy", return_value=RobotsPolicy(parser=None, allow_all=True)):
        assert robots.robots_allows("http://example.com/") is True
