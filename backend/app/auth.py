"""Server-side Supabase JWT verification + admin role checks.

Verification order:
1. RS256 tokens — verified against the project JWKS endpoint (cached).
2. ES256 tokens (Supabase default for newer projects) — same JWKS, EC keys.
3. HS256 tokens (older projects) — verified with SUPABASE_JWT_SECRET.
"""
from __future__ import annotations

import time
from functools import lru_cache
from typing import Any, Dict, Optional

import httpx
import jwt

from app.config import settings
from app.database import select_one
from app.rate_limit import PasswordChangeRequiredError

_jwks_cache: Dict[str, Any] = {"fetched_at": 0.0, "keys": []}


def _fetch_jwks() -> list:
    now = time.time()
    if _jwks_cache["keys"] and now - _jwks_cache["fetched_at"] < 3600:
        return _jwks_cache["keys"]
    url = f"{settings.supabase_url.rstrip('/')}/auth/v1/.well-known/jwks.json"
    resp = httpx.get(url, timeout=10.0)
    resp.raise_for_status()
    keys = resp.json().get("keys", [])
    _jwks_cache["fetched_at"] = now
    _jwks_cache["keys"] = keys
    return keys


def _public_key(kid: Optional[str], algorithm_class: Any) -> Any:
    for key in _fetch_jwks():
        if key.get("kid") == kid:
            return algorithm_class.from_jwk(key)
    raise jwt.InvalidKeyError(f"No JWKS key matching kid={kid}")


def verify_supabase_token(token: str) -> Dict[str, Any]:
    """Verify and decode a Supabase access token."""
    header = jwt.get_unverified_header(token)
    alg = header.get("alg", "")

    if alg == "RS256":
        from jwt.algorithms import RSAAlgorithm

        key = _public_key(header.get("kid"), RSAAlgorithm)
    elif alg == "ES256":
        from jwt.algorithms import ECAlgorithm

        key = _public_key(header.get("kid"), ECAlgorithm)
    elif alg == "HS256":
        if not settings.supabase_jwt_secret:
            raise jwt.InvalidKeyError(
                "HS256 token received but SUPABASE_JWT_SECRET is not configured"
            )
        key = settings.supabase_jwt_secret
    else:
        raise jwt.InvalidAlgorithmError(f"Unsupported algorithm: {alg}")

    options = {"verify_aud": True, "verify_exp": True, "verify_iss": False}
    payload = jwt.decode(
        token,
        key,
        algorithms=[alg],
        audience="authenticated",
        options=options,
        leeway=10,
    )
    return payload


def parse_bearer(auth_header: Optional[str]) -> str:
    if not auth_header or not auth_header.startswith("Bearer "):
        raise PermissionError("Missing or invalid Authorization header")
    return auth_header[len("Bearer "):].strip()


async def get_current_user(authorization: Optional[str]) -> Dict[str, Any]:
    """Verify the request token and return the Supabase user payload."""
    token = parse_bearer(authorization)
    try:
        payload = verify_supabase_token(token)
    except jwt.ExpiredSignatureError:
        raise PermissionError("Token expired — please sign in again")
    except jwt.InvalidTokenError as exc:
        raise PermissionError(f"Invalid token: {exc}")
    return payload


async def get_admin_record(user_id: str) -> Optional[Dict[str, Any]]:
    return await select_one("admins", params={"user_id": f"eq.{user_id}"})


async def require_admin(
    authorization: Optional[str], *, enforce_password_change: bool = True
) -> Dict[str, Any]:
    """FastAPI dependency: authenticated admin (any role, not revoked).

    When ``enforce_password_change`` is true (the default) an admin who still
    has ``must_change_password`` set — i.e. signed in with a temporary password —
    is blocked from every admin operation except the ones required to complete
    the change (``/me`` and the change-password endpoint, which opt out).
    """
    user = await get_current_user(authorization)
    admin = await get_admin_record(user.get("sub", ""))
    if not admin or admin.get("revoked_at"):
        raise PermissionError("Admin access required")
    if enforce_password_change and admin.get("must_change_password"):
        raise PasswordChangeRequiredError()
    return {"user": user, "admin": admin}


async def require_super_admin(
    authorization: Optional[str], *, enforce_password_change: bool = True
) -> Dict[str, Any]:
    """FastAPI dependency: authenticated super admin."""
    ctx = await require_admin(
        authorization, enforce_password_change=enforce_password_change
    )
    if ctx["admin"].get("role") != "super_admin":
        raise PermissionError("Super admin access required")
    return ctx
