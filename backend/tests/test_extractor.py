"""HTML extraction tests (app/research/extractor.py)."""

from app.research.extractor import extract_page_content

HTML = """
<html><head>
  <title>  My Page  </title>
  <meta name="description" content="Desc text">
  <link rel="canonical" href="https://example.com/a/">
</head><body>
  <p>Hello <b>world</b>  there</p>
  <script>var x = 1;</script>
  <style>.y{color:red}</style>
  <a href="/next">next</a>
  <a href="https://other.example.com/x">external</a>
</body></html>
"""


def test_extract_page_content():
    page = extract_page_content(HTML, "https://example.com/")
    assert page.title == "My Page"
    assert page.meta_description == "Desc text"
    assert page.canonical_url == "https://example.com/a/"
    assert "Hello world there" in page.text
    assert "var x = 1" not in page.text
    assert ".y{color:red}" not in page.text
    assert "https://example.com/next" in page.links
    assert "https://other.example.com/x" in page.links


def test_extract_minimal_page():
    page = extract_page_content("<html><body><p>  spaced  out text </p></body></html>", "https://example.com/")
    assert page.title == ""
    assert "spaced out text" in page.text
    assert page.links == []
