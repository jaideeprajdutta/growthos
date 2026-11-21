"""Robots.txt compliance tests (app/research/robots.py)."""

from unittest.mock import patch

from app.research import robots


def test_robots_allows_when_empty_or_disallow_missing():
    text = "User-agent: GrowthOSBot\n"
    with patch.object(robots, "fetch_text", return_value=(text, "http://example.com/robots.txt")):
        assert robots.robots_allows("http://example.com/any") is True


def test_robots_blocks_disallowed_path():
    text = "User-agent: GrowthOSBot\nDisallow: /private\n"
    with patch.object(robots, "fetch_text", return_value=(text, "http://example.com/robots.txt")):
        assert robots.robots_allows("http://example.com/private") is False
        assert robots.robots_allows("http://example.com/public") is True


def test_robots_returns_false_when_fetch_fails():
    with patch.object(robots, "fetch_text", side_effect=OSError("network down")):
        assert robots.robots_allows("http://example.com/") is False
