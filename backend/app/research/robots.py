"""Robots.txt compliance for research crawls."""

import urllib.robotparser
from urllib.parse import urlsplit

from app.research.url_safety import fetch_text


def fetch_robots_text(url: str, timeout: float = 15.0) -> str:
    """Fetch ``robots.txt`` for the site containing ``url``."""
    parsed = urlsplit(url)
    robots_url = f"{parsed.scheme}://{parsed.netloc}/robots.txt"
    text, _ = fetch_text(robots_url, timeout=timeout)
    return text


def robots_allows(url: str, user_agent: str = "GrowthOSBot", timeout: float = 15.0) -> bool:
    """Return True when the site's robots.txt allows fetching ``url`` for ``user_agent``.

    Conservative default: returns False when robots.txt cannot be fetched or parsed.
    """
    try:
        text = fetch_robots_text(url, timeout=timeout)
    except Exception:
        return False
    parser = urllib.robotparser.RobotFileParser()
    try:
        parser.parse(text.splitlines())
    except Exception:
        return False
    return parser.can_fetch(user_agent, url)
