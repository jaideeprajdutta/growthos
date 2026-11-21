"""Sitemap discovery and parsing tests (app/research/sitemap.py)."""

from app.research.sitemap import parse_sitemap

URLSET = """<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://example.com/a</loc></url>
  <url><loc>https://example.com/b</loc></url>
  <url><loc>https://example.com/a</loc></url>
</urlset>"""

SITEMAP_INDEX = """<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap><loc>https://example.com/sitemap-1.xml</loc></sitemap>
  <sitemap><loc>https://example.com/sitemap-2.xml</loc></sitemap>
</sitemapindex>"""


def test_parse_urlset_returns_locs():
    urls = parse_sitemap(URLSET, "https://example.com/")
    assert urls[0] == "https://example.com/a"
    assert "https://example.com/b" in urls


def test_parse_sitemapindex_returns_child_locs():
    urls = parse_sitemap(SITEMAP_INDEX, "https://example.com/")
    assert urls == ["https://example.com/sitemap-1.xml", "https://example.com/sitemap-2.xml"]


def test_parse_invalid_xml_returns_empty():
    assert parse_sitemap("not xml at all", "https://example.com/") == []


def test_parse_empty_returns_empty():
    assert parse_sitemap("", "https://example.com/") == []
