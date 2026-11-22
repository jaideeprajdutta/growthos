"""Small, dependency-free password and session-token helpers.

Passwords use PBKDF2-HMAC-SHA256 with a random salt. Session tokens are random
URL-safe strings; only their SHA-256 digest is stored, so a database dump does
not reveal usable credentials.
"""

from __future__ import annotations

import hashlib
import hmac
import secrets
import threading
import time
from collections import defaultdict, deque

_PBKDF2_ALGORITHM = "pbkdf2_sha256"
_PBKDF2_ITERATIONS = 210_000
_SALT_BYTES = 16
_DIGEST_BYTES = 32


def hash_password(password: str) -> str:
    """Return an encoded salted password hash."""
    salt = secrets.token_bytes(_SALT_BYTES)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, _PBKDF2_ITERATIONS, dklen=_DIGEST_BYTES)
    return f"{_PBKDF2_ALGORITHM}${_PBKDF2_ITERATIONS}${salt.hex()}${digest.hex()}"


def verify_password(password: str, encoded: str | None) -> bool:
    """Verify a password against an encoded hash, or return False for legacy users."""
    if not encoded:
        return False
    try:
        algorithm, iterations_text, salt_hex, digest_hex = encoded.split("$", 3)
        if algorithm != _PBKDF2_ALGORITHM:
            return False
        iterations = int(iterations_text)
        salt = bytes.fromhex(salt_hex)
        expected = bytes.fromhex(digest_hex)
    except (ValueError, TypeError):
        return False
    actual = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, iterations, dklen=len(expected))
    return hmac.compare_digest(actual, expected)


def generate_session_token() -> str:
    """Generate a high-entropy bearer token."""
    return secrets.token_urlsafe(32)


def hash_session_token(token: str) -> str:
    """Return the only representation of a session token stored in the database."""
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


class InMemoryRateLimiter:
    """Tiny process-local rate limiter for authentication attempts.

    This is a pilot-grade guard against casual brute force. It is intentionally
    dependency-free; a multi-worker deployment would need a shared store.
    """

    def __init__(self, limit: int = 8, window_seconds: int = 900) -> None:
        self.limit = limit
        self.window_seconds = window_seconds
        self._events: dict[str, deque[float]] = defaultdict(deque)
        self._lock = threading.Lock()

    def allow(self, key: str) -> bool:
        now = time.monotonic()
        with self._lock:
            events = self._events[key]
            cutoff = now - self.window_seconds
            while events and events[0] <= cutoff:
                events.popleft()
            if len(events) >= self.limit:
                return False
            events.append(now)
            return True

    def clear(self, key: str) -> None:
        with self._lock:
            self._events.pop(key, None)
