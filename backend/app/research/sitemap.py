"""Sitemap discovery and parsing (sitemapindex and urlset)."""

import xml.etree.ElementTree as ET
from urllib.parse import urljoin

SITEMAP_URLS = ["/sitemap.xml", "/sitemap_index.xml"]


def _local_name(tag: str) -> str:
    return tag.split("}")[-1] if tag else ""


def parse_sitemap(text: str, base_url: str) -> list[str]:
    """Parse sitemap text and return absolute URLs (``<loc>`` entries of both ``sitemap`` and ``url`` elements)."""
    urls: list[str] = []
    try:
        root = ET.fromstring(text)
    except ET.ParseError:
        return urls
    root_name = _local_name(root.tag)
    if root_name not in ("sitemapindex", "urlset"):
        return urls
    for child in root:
        name = _local_name(child.tag)
        if name not in ("sitemap", "url"):
            continue
        loc = ""
        for element in child:
            if _local_name(element.tag) == "loc":
                loc = (element.text or "").strip()
                break
        if loc:
            urls.append(urljoin(base_url, loc))
    return urls
