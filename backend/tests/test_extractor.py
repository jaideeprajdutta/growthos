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


def test_extract_prefers_main_content_and_drops_chrome():
    html = """
    <html><head><title>Acme</title></head><body>
      <nav>Product Pricing Customers Log in Sign up</nav>
      <header>Acme logo</header>
      <main>
        <h1>Acme helps teams ship faster</h1>
        <p>Acme is a workflow platform for product teams. It reduces planning overhead and keeps work visible.</p>
      </main>
      <footer>Copyright Acme. All rights reserved.</footer>
    </body></html>
    """
    page = extract_page_content(html, "https://acme.example/")
    assert page.text.startswith("Acme helps teams ship faster")
    assert "Product Pricing" not in page.text
    assert "Copyright Acme" not in page.text
    assert "workflow platform" in page.text
    assert page.summary.startswith("Acme helps teams ship faster")


def test_extract_uses_meta_description_as_summary():
    html = """
    <html><head>
      <title>Acme</title>
      <meta name="description" content="Acme is the workflow platform that helps product teams plan, build and ship software.">
    </head><body><main><p>Acme is the workflow platform that helps product teams plan, build and ship software.</p></main></body></html>
    """
    page = extract_page_content(html, "https://acme.example/")
    assert page.summary == "Acme is the workflow platform that helps product teams plan, build and ship software."
