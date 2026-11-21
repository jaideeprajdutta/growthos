"""HTML content extraction using BeautifulSoup4."""

import re
from dataclasses import dataclass, field

from bs4 import BeautifulSoup
from urllib.parse import urljoin


@dataclass
class ExtractedPage:
    title: str = ""
    text: str = ""
    canonical_url: str | None = None
    meta_description: str | None = None
    links: list[str] = field(default_factory=list)


def extract_page_content(html: str, url: str) -> ExtractedPage:
    """Extract title, text, canonical URL, meta description and internal links from a page."""
    soup = BeautifulSoup(html, "html.parser")

    title_tag = soup.find("title")
    title = title_tag.get_text(" ", strip=True) if title_tag else ""

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
            meta_description = tag.get("content") or None
            break

    links: list[str] = []
    seen: set[str] = set()
    for anchor in soup.find_all("a", href=True):
        absolute = urljoin(url, anchor.get("href", ""))
        if absolute and absolute not in seen:
            seen.add(absolute)
            links.append(absolute)

    for element in soup([
        "script", "style", "noscript", "iframe", "template", "svg", "img",
        "audio", "video", "object", "embed",
    ]):
        element.decompose()

    text = re.sub(r"\s+", " ", soup.get_text(" ", strip=True))
    return ExtractedPage(title=title, text=text, canonical_url=canonical_url, meta_description=meta_description, links=links)
