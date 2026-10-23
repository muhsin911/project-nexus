"""Short-lived signed tokens for the single-owner portfolio CMS."""

import base64
import hashlib
import hmac
import json
import secrets
import time
from typing import Any

from fastapi import HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials

from app.core.config import Settings

TOKEN_ISSUER = "project-nexus-portfolio"


def _encode_segment(value: dict[str, Any]) -> str:
    data = json.dumps(value, separators=(",", ":"), sort_keys=True).encode()
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()


def issue_admin_token(username: str, settings: Settings) -> str:
    now = int(time.time())
    header = _encode_segment({"alg": "HS256", "typ": "JWT"})
    payload = _encode_segment(
        {
            "iss": TOKEN_ISSUER,
            "sub": username,
            "iat": now,
            "exp": now + settings.PORTFOLIO_ACCESS_TOKEN_MINUTES * 60,
        }
    )
    signing_input = f"{header}.{payload}".encode()
    signature = hmac.new(settings.SECRET_KEY.encode(), signing_input, hashlib.sha256).digest()
    encoded_signature = base64.urlsafe_b64encode(signature).rstrip(b"=").decode()
    return f"{header}.{payload}.{encoded_signature}"


def require_admin_token(
    credentials: HTTPAuthorizationCredentials | None,
    settings: Settings,
) -> str:
    """Verify an unexpired owner token, returning its username."""
    if not settings.PORTFOLIO_ADMIN_USERNAME or not settings.PORTFOLIO_ADMIN_PASSWORD:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Portfolio owner login is not configured.",
        )
    if credentials is None:
        raise _unauthorized()

    try:
        header_segment, payload_segment, signature_segment = credentials.credentials.split(".")
        signing_input = f"{header_segment}.{payload_segment}".encode()
        signature = base64.urlsafe_b64decode(
            signature_segment + "=" * (-len(signature_segment) % 4)
        )
        expected_signature = hmac.new(
            settings.SECRET_KEY.encode(), signing_input, hashlib.sha256
        ).digest()
        if not hmac.compare_digest(signature, expected_signature):
            raise _unauthorized()
        header = json.loads(
            base64.urlsafe_b64decode(header_segment + "=" * (-len(header_segment) % 4))
        )
        payload = json.loads(
            base64.urlsafe_b64decode(payload_segment + "=" * (-len(payload_segment) % 4))
        )
        if header.get("alg") != "HS256" or header.get("typ") != "JWT":
            raise _unauthorized()
        subject = payload.get("sub")
        if (
            payload.get("iss") != TOKEN_ISSUER
            or subject != settings.PORTFOLIO_ADMIN_USERNAME
            or not isinstance(subject, str)
            or not isinstance(payload.get("exp"), int)
            or payload["exp"] <= int(time.time())
        ):
            raise _unauthorized()
        return subject
    except (ValueError, TypeError, KeyError, json.JSONDecodeError):
        raise _unauthorized() from None


def verify_admin_password(username: str, password: str, settings: Settings) -> bool:
    """Compare owner credentials without early-exit string comparisons."""
    if not settings.PORTFOLIO_ADMIN_USERNAME or not settings.PORTFOLIO_ADMIN_PASSWORD:
        return False
    valid_username = secrets.compare_digest(username, settings.PORTFOLIO_ADMIN_USERNAME)
    valid_password = secrets.compare_digest(password, settings.PORTFOLIO_ADMIN_PASSWORD)
    return valid_username & valid_password


def _unauthorized() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="A valid portfolio owner session is required.",
        headers={"WWW-Authenticate": "Bearer"},
    )
