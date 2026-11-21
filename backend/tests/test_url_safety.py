"""SSRF protection and URL-fetch validation tests (app/research/url_safety.py)."""

import socket
from unittest.mock import MagicMock

import pytest

from app.research import url_safety
from app.research.url_safety import UnsafeUrlError, fetch_text, is_safe_url


def test_rejects_non_http_schemes():
    for bad in ("file:///etc/passwd", "ftp://example.com/x", "gopher://example.com/", "javascript:alert(1)", "data:text/html,x"):
        with pytest.raises(UnsafeUrlError):
            is_safe_url(bad)


def test_rejects_private_and_special_hosts():
    for url in (
        "http://127.0.0.1/admin",
        "http://localhost/admin",
        "http://10.0.0.5/",
        "http://192.168.1.10/",
        "http://172.16.0.9/",
        "http://169.254.169.254/latest/meta-data/",
        "http://0.0.0.0/",
        "http://[::1]/",
        "http://[::ffff:127.0.0.1]/",
    ):
        with pytest.raises(UnsafeUrlError):
            is_safe_url(url)


def test_rejects_unresolvable_hosts(monkeypatch):
    def boom(*args, **kwargs):
        raise socket.gaierror("no dns")

    monkeypatch.setattr(socket, "getaddrinfo", boom)
    with pytest.raises(UnsafeUrlError):
        is_safe_url("https://example.com/")


def test_allows_public_ip_literal():
    is_safe_url("http://8.8.8.8/some/page")


def _fake_response(status_code=200, content=b"", headers=None):
    resp = MagicMock()
    resp.status_code = status_code
    resp.content = content
    resp.headers = headers or {}
    return resp


def _patch_http_client(monkeypatch, response):
    class FakeClient:
        def __init__(self, *args, **kwargs):
            pass

        def __enter__(self):
            return self

        def __exit__(self, *args):
            return False

        def get(self, url, headers=None):
            return response

    monkeypatch.setattr(url_safety.httpx, "Client", FakeClient)


def test_fetch_text_returns_body_and_final_url(monkeypatch):
    response = _fake_response(content=b"<html><title>Hi</title></html>", headers={"content-type": "text/html"})
    _patch_http_client(monkeypatch, response)
    text, final_url = fetch_text("http://8.8.8.8/")
    assert text == "<html><title>Hi</title></html>"
    assert final_url == "http://8.8.8.8/"


def test_fetch_text_rejects_unsupported_content_type(monkeypatch):
    response = _fake_response(content=b"x", headers={"content-type": "application/octet-stream"})
    _patch_http_client(monkeypatch, response)
    with pytest.raises(UnsafeUrlError):
        fetch_text("http://8.8.8.8/")


def test_fetch_text_blocks_redirect_to_private_address(monkeypatch):
    response = _fake_response(status_code=302, headers={"location": "http://169.254.169.254/latest/meta-data/"})
    _patch_http_client(monkeypatch, response)
    with pytest.raises(UnsafeUrlError):
        fetch_text("http://8.8.8.8/")
