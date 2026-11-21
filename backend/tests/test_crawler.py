"""BFS crawler tests with mocked HTTP (app/research/crawler.py)."""

from unittest.mock import patch

from app.research import crawler
from app.research.crawler import crawl_site, normalize_url
from app.research.robots import RobotsPolicy

ALLOW_ALL = RobotsPolicy(parser=None, allow_all=True)


def _html(title, links=None, body=""):
    anchors = "".join(f'<a href="{link}">l</a>' for link in (links or []))
    return f"<html><head><title>{title}</title></head><body>{body}{anchors}</body></html>"


def test_normalize_url_lowercases_and_strips_fragment():
    assert normalize_url("https://EXAMPLE.com/a/?x=1#frag") == "https://example.com/a/?x=1"


def test_crawl_visits_root_page():
    def fetch(url, **kwargs):
        return (_html("Home"), url)

    with patch.object(crawler, "fetch_robots_policy", return_value=ALLOW_ALL), patch.object(crawler, "fetch_text", side_effect=fetch):
        pages = crawl_site("http://example.com/", max_pages=5, max_depth=1)
    assert [p.url for p in pages] == ["http://example.com/"]
    assert all(p.status == "scanned" for p in pages)
    assert pages[0].title == "Home"


def test_crawl_recurses_with_depth_and_page_limits():
    responses = {
        "http://example.com/": _html("Home", ["/about", "/blog"]),
        "http://example.com/about": _html("About"),
        "http://example.com/blog": _html("Blog", ["/blog/post-1"]),
        "http://example.com/blog/post-1": _html("Post"),
    }

    def fetch(url, **kwargs):
        return (responses[url], url)

    with patch.object(crawler, "fetch_robots_policy", return_value=ALLOW_ALL), patch.object(crawler, "fetch_text", side_effect=fetch):
        pages = crawl_site("http://example.com/", max_pages=10, max_depth=2)
    assert {p.url for p in pages} == set(responses)


def test_crawl_continues_after_page_failure():
    def fetch(url, **kwargs):
        if url == "http://example.com/bad":
            raise OSError("boom")
        return (_html("Home", ["/bad"]), url)

    with patch.object(crawler, "fetch_robots_policy", return_value=ALLOW_ALL), patch.object(crawler, "fetch_text", side_effect=fetch):
        pages = crawl_site("http://example.com/", max_pages=5, max_depth=1)
    by_url = {p.url: p for p in pages}
    assert by_url["http://example.com/bad"].status == "failed"
    assert by_url["http://example.com/"].status == "scanned"


def test_crawl_skips_robots_disallowed_pages():
    policy = RobotsPolicy(parser=None, disallow_all=True)
    with patch.object(crawler, "fetch_robots_policy", return_value=policy), patch.object(crawler, "fetch_text", side_effect=lambda url, **k: (_html("x"), url)):
        pages = crawl_site("http://example.com/", max_pages=5, max_depth=1)
    assert pages[0].status == "failed"
    assert "robots" in (pages[0].status_detail or "").lower()


def test_crawl_fetches_robots_once_per_site():
    policy = RobotsPolicy(parser=None, allow_all=True)
    with patch.object(crawler, "fetch_robots_policy", return_value=policy) as robots_mock, patch.object(
        crawler, "fetch_text", side_effect=lambda url, **k: (_html("x"), url)
    ):
        crawl_site("http://example.com/", max_pages=3, max_depth=1)
    assert robots_mock.call_count == 1


def test_crawl_skips_auth_and_asset_links():
    html = _html("Home", ["/login", "/signup", "/brochure.pdf", "/about"])

    def fetch(url, **kwargs):
        if url == "http://example.com/about":
            return (_html("About"), url)
        return (html, url)

    with patch.object(crawler, "fetch_robots_policy", return_value=ALLOW_ALL), patch.object(crawler, "fetch_text", side_effect=fetch):
        pages = crawl_site("http://example.com/", max_pages=10, max_depth=1)
    assert {p.url for p in pages} == {"http://example.com/", "http://example.com/about"}
