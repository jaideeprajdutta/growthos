"""Site crawler: BFS over a website's public pages, resilient to failures."""

import time
from collections import deque
from dataclasses import dataclass
from urllib.parse import urljoin, urlparse, urlunsplit

from app.research.extractor import extract_page_content
from app.research.robots import robots_allows
from app.research.sitemap import parse_sitemap
from app.research.url_safety import fetch_text

DEFAULT_MAX_PAGES = 30
DEFAULT_MAX_DEPTH = 3
MAX_TEXT_CHARS = 20_000


@dataclass
class CrawledPage:
    url: str
    status: str
    status_detail: str | None
    title: str | None
    text: str | None
    word_count: int
    duration_ms: int | None


def normalize_url(url: str) -> str:
    parsed = urlparse(url.strip())
    return urlunsplit((parsed.scheme.lower(), parsed.netloc.lower(), parsed.path or "/", parsed.query, ""))


def _same_host(url_a: str, url_b: str) -> bool:
    return urlparse(url_a).netloc.lower() == urlparse(url_b).netloc.lower()


def crawl_site(
    source_url: str,
    max_pages: int = DEFAULT_MAX_PAGES,
    max_depth: int = DEFAULT_MAX_DEPTH,
    time_budget_seconds: float = 60.0,
) -> list[CrawledPage]:
    """Crawl the site rooted at ``source_url``.

    Respects robots.txt, dedupes URLs, limits depth/pages/time, and records
    per-page outcomes so individual failures don't abort the run.
    """
    pages: list[CrawledPage] = []
    visited: set[str] = set()
    queue: deque[tuple[str, int]] = deque()
    start = normalize_url(source_url)
    queue.append((start, 0))

    base = urlunsplit((urlparse(start).scheme, urlparse(start).netloc, "", "", ""))
    for sitemap_path in ("/sitemap.xml", "/sitemap_index.xml"):
        try:
            sitemap_text, _ = fetch_text(base + sitemap_path, timeout=15.0)
            for loc in parse_sitemap(sitemap_text, base):
                normalized_loc = normalize_url(loc)
                if normalized_loc not in visited:
                    queue.append((normalized_loc, 1))
            break
        except Exception:
            continue

    deadline = time.monotonic() + time_budget_seconds
    while queue and len(pages) < max_pages and time.monotonic() < deadline:
        url, depth = queue.popleft()
        normalized = normalize_url(url)
        if normalized in visited:
            continue
        visited.add(normalized)

        status = "failed"
        status_detail: str | None = None
        title: str | None = None
        text: str | None = None
        word_count = 0
        duration_ms: int | None = None
        internal_links: list[str] = []

        if not robots_allows(normalized):
            status_detail = "Disallowed by robots.txt."
        else:
            started = time.perf_counter()
            try:
                raw_text, final_url = fetch_text(normalized)
                extracted = extract_page_content(raw_text, final_url)
                duration_ms = int((time.perf_counter() - started) * 1000)
                status = "scanned"
                title = extracted.title or None
                text = extracted.text[:MAX_TEXT_CHARS] or None
                word_count = len(extracted.text.split())
                if depth < max_depth:
                    queued = {item[0] for item in queue}
                    for link in extracted.links:
                        absolute = urljoin(final_url, link)
                        if not _same_host(normalized, absolute):
                            continue
                        normalized_link = normalize_url(absolute)
                        if normalized_link not in visited and normalized_link not in queued:
                            internal_links.append(normalized_link)
            except Exception as exc:
                duration_ms = int((time.perf_counter() - started) * 1000)
                status_detail = str(exc)[:500] or "Fetch failed."

        pages.append(CrawledPage(url=normalized, status=status, status_detail=status_detail, title=title, text=text, word_count=word_count, duration_ms=duration_ms))
        for link in internal_links:
            if len(queue) < max_pages * 2:
                queue.append((link, depth + 1))

    return pages
