"""SSRF protection helpers for website research.

Blocks non-HTTP(S) schemes, localhost, private/loopback/link-local/reserved
address ranges and cloud metadata endpoints. Every redirect hop is validated
against the same rules, including the DNS-resolved addresses.
"""

import ipaddress
import socket
from urllib.parse import urljoin, urlsplit

import httpx


class UnsafeUrlError(ValueError):
    """Raised when a URL is unsafe to fetch."""


_BLOCKED_HOSTS = {
    "localhost",
    "localhost.localdomain",
    "ip6-localhost",
    "ip6-loopback",
    "0.0.0.0",
    "::1",
    "127.0.0.1",
}


def _is_blocked_ip(ip: ipaddress._BaseAddress) -> bool:
    return (
        ip.is_loopback
        or ip.is_private
        or ip.is_link_local
        or ip.is_multicast
        or ip.is_reserved
        or ip.is_unspecified
    )


def _validate_ip_str(ip_str: str) -> bool:
    try:
        ip = ipaddress.ip_address(ip_str)
    except ValueError:
        return False
    return not _is_blocked_ip(ip)


def is_safe_url(url: str) -> None:
    """Raise ``UnsafeUrlError`` when ``url`` is unsafe to fetch."""
    try:
        parsed = urlsplit(url.strip())
    except ValueError as exc:
        raise UnsafeUrlError(f"Invalid URL: {url}") from exc
    if parsed.scheme not in ("http", "https"):
        raise UnsafeUrlError("Only http and https URLs are supported.")
    hostname = parsed.hostname
    if not hostname:
        raise UnsafeUrlError("URL has no hostname.")
    if hostname.lower() in _BLOCKED_HOSTS:
        raise UnsafeUrlError(f"Host {hostname} is blocked.")
    port = parsed.port or (443 if parsed.scheme == "https" else 80)
    try:
        infos = socket.getaddrinfo(hostname, port)
    except socket.gaierror as exc:
        raise UnsafeUrlError(f"Could not resolve host {hostname}.") from exc
    for info in infos:
        ip_str = info[4][0]
        if not _validate_ip_str(ip_str):
            raise UnsafeUrlError(f"Host {hostname} resolves to blocked address {ip_str}.")


def fetch_text(url: str, timeout: float = 30.0, max_bytes: int = 2_000_000, max_redirects: int = 5) -> tuple[str, str]:
    """Fetch a URL, validating every redirect hop. Returns ``(text, final_url)``.

    Only ``text/html`` and ``text/plain`` responses are accepted; responses are
    truncated to ``max_bytes``.
    """
    current_url = url
    for _ in range(max_redirects + 1):
        is_safe_url(current_url)
        with httpx.Client(timeout=timeout, follow_redirects=False) as client:
            response = client.get(current_url, headers={"User-Agent": "GrowthOSBot/1.0"})
        if response.status_code in (301, 302, 303, 307, 308):
            location = response.headers.get("location")
            if not location:
                return "", current_url
            current_url = urljoin(current_url, location)
            continue
        if response.status_code != 200:
            raise UnsafeUrlError(f"HTTP {response.status_code} for {current_url}")
        content_type = (response.headers.get("content-type") or "").lower()
        if not (content_type.startswith("text/html") or content_type.startswith("text/plain") or content_type.startswith("application/xhtml")):
            raise UnsafeUrlError(f"Unsupported content type: {content_type}")
        body = response.content[:max_bytes]
        return body.decode("utf-8", errors="replace"), current_url
    raise UnsafeUrlError(f"Too many redirects starting at {url}")
