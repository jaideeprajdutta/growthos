"""HTML content extraction using BeautifulSoup4.

The extractor keeps navigation links for crawling but removes page chrome
(navigation, headers, footers, forms, scripts) from the text that becomes
evidence. When a page exposes a ``<main>`` or ``<article>`` region, that
region is preferred over the whole body so evidence excerpts start with the
page's actual content rather than its menu.
"""

import re
from dataclasses import dataclass, field
from urllib.parse import urljoin

from bs4 import BeautifulSoup

CHROME_TAGS = (
    "script",
    "style",
    "noscript",
    "iframe",
    "template",
    "svg",
    "img",
    "audio",
    "video",
    "object",
    "embed",
    "nav",
    "footer",
    "aside",
    "form",
    "dialog",
)
MIN_MAIN_TEXT_CHARS = 120
MIN_SUMMARY_CHARS = 40


@dataclass
class ExtractedPage:
    title: str = ""
    text: str = ""
    canonical_url: str | None = None
    meta_description: str | None = None
    summary: str = ""
    links: list[str] = field(default_factory=list)


def _normalize(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip()


def _first_meaningful_sentence(text: str) -> str:
    for sentence in re.split(r"(?<=[.!?])\s+", text):
        cleaned = sentence.strip()
        if len(cleaned) >= MIN_SUMMARY_CHARS:
            return cleaned
    return ""


def _content_root(soup: BeautifulSoup):
    """Pick the page's main content region, falling back to the body."""
    candidates = [tag for tag in soup.find_all(["main", "article"]) if tag.get_text(" ", strip=True)]
    if candidates:
        best = max(candidates, key=lambda tag: len(tag.get_text(" ", strip=True)))
        if len(best.get_text(" ", strip=True)) >= MIN_MAIN_TEXT_CHARS:
            return best
    return soup.body or soup


def extract_page_content(html: str, url: str) -> ExtractedPage:
    """Extract title, content text, metadata, summary and links from a page."""
    soup = BeautifulSoup(html, "html.parser")

    title_tag = soup.find("title")
    title = _normalize(title_tag.get_text(" ", strip=True)) if title_tag else ""

    canonical_url: str | None = None
    for link in soup.find_all("link"):
        rels = [rel.lower() for rel in (link.get("rel") or [])]
        if "canonical" in rels:
            href = link.get("href")
            if href:
                canonical_url = href
                break

    meta_description: str | None = None
    for tag in soup.find_all("meta"):
        if (tag.get("name") or "").lower() == "description":
            meta_description = _normalize(tag.get("content") or "") or None
            break

    # Collect links before removing page chrome.
    links: list[str] = []
    seen: set[str] = set()
    for anchor in soup.find_all("a", href=True):
        absolute = urljoin(url, anchor.get("href", ""))
        if absolute and absolute not in seen:
            seen.add(absolute)
            links.append(absolute)

    for element in soup.find_all(list(CHROME_TAGS)):
        element.decompose()

    # Headers often contain only a logo; keep them when they hold a heading.
    for header in soup.find_all("header"):
        if not header.find(["h1", "h2"]):
            header.decompose()

    root = _content_root(soup)
    text = _normalize(root.get_text(" ", strip=True))
    summary = meta_description if meta_description and len(meta_description) >= MIN_SUMMARY_CHARS else ""
    if not summary:
        summary = _first_meaningful_sentence(text)

    return ExtractedPage(
        title=title,
        text=text,
        canonical_url=canonical_url,
        meta_description=meta_description,
        summary=summary,
        links=links,
    )
