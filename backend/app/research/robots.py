"""Robots.txt compliance for research crawls.

The crawler fetches one policy per site and evaluates every URL against it.
Per RFC 9309, a missing robots.txt (404/410) allows all crawling; an
authentication wall or server error is treated conservatively as disallow.
Every redirect hop is validated with the same SSRF rules as page fetches.
"""

import urllib.robotparser
from dataclasses import dataclass
from urllib.parse import urljoin, urlsplit

import httpx

from app.research.url_safety import UnsafeUrlError, is_safe_url

USER_AGENT = "GrowthOSBot"


@dataclass(frozen=True)
class RobotsPolicy:
    """The rules that apply to one site."""

    parser: urllib.robotparser.RobotFileParser | None
    allow_all: bool = False
    disallow_all: bool = False

    def allows(self, url: str, user_agent: str = USER_AGENT) -> bool:
        if self.disallow_all:
            return False
        if self.allow_all or self.parser is None:
            return True
        try:
            return self.parser.can_fetch(user_agent, url)
        except Exception:
            return False


def _robots_url(url: str) -> str:
    parsed = urlsplit(url)
    return f"{parsed.scheme}://{parsed.netloc}/robots.txt"


def _fetch_robots_response(url: str, timeout: float = 15.0, max_redirects: int = 3) -> tuple[int, str]:
    """Fetch robots.txt, validating every redirect hop. Returns (status, text)."""
    current_url = _robots_url(url)
    for _ in range(max_redirects + 1):
        is_safe_url(current_url)
        with httpx.Client(timeout=timeout, follow_redirects=False) as client:
            response = client.get(current_url, headers={"User-Agent": USER_AGENT})
        if response.status_code in (301, 302, 303, 307, 308):
            location = response.headers.get("location")
            if not location:
                return response.status_code, ""
            current_url = urljoin(current_url, location)
            continue
        return response.status_code, response.text
    raise UnsafeUrlError("Too many redirects while fetching robots.txt.")


def fetch_robots_policy(url: str, timeout: float = 15.0) -> RobotsPolicy:
    """Fetch and parse the robots.txt policy for the site containing ``url``."""
    try:
        status, text = _fetch_robots_response(url, timeout=timeout)
    except Exception:
        # Network failure, blocked address, or malformed response: be conservative.
        return RobotsPolicy(parser=None, disallow_all=True)

    if status in (401, 403, 429) or status >= 500:
        return RobotsPolicy(parser=None, disallow_all=True)
    if status in (404, 410) or 400 <= status < 500:
        # No robots.txt (or another client error): crawling is permitted.
        return RobotsPolicy(parser=None, allow_all=True)
    if status != 200:
        return RobotsPolicy(parser=None, disallow_all=True)

    parser = urllib.robotparser.RobotFileParser()
    try:
        parser.parse(text.splitlines())
    except Exception:
        return RobotsPolicy(parser=None, disallow_all=True)
    return RobotsPolicy(parser=parser)


def robots_allows(url: str, user_agent: str = USER_AGENT, timeout: float = 15.0) -> bool:
    """Return True when the site's robots.txt allows fetching ``url``.

    This convenience wrapper fetches the policy every time; the crawler uses
    :func:`fetch_robots_policy` once per site instead.
    """
    return fetch_robots_policy(url, timeout=timeout).allows(url, user_agent)
