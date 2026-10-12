"""Supabase access layer.

All database / storage / auth-admin access goes through the Supabase
REST API using the service role key (server-side only, bypasses RLS).
"""
from __future__ import annotations

import hashlib
import json
from typing import Any, Dict, List, Optional

import httpx

from app.config import settings

_default_headers = {
    "apikey": settings.supabase_service_role_key,
    "Authorization": f"Bearer {settings.supabase_service_role_key}",
}

_client = httpx.AsyncClient(base_url=settings.supabase_url.rstrip("/"), timeout=30.0)
_auth_client = httpx.AsyncClient(timeout=30.0)


class SupabaseError(Exception):
    def __init__(self, message: str, status_code: int = 502):
        super().__init__(message)
        self.status_code = status_code


def _check_response(resp: httpx.Response) -> None:
    if resp.status_code >= 400:
        detail = ""
        try:
            body = resp.json()
            detail = body.get("message") or body.get("error") or json.dumps(body)
        except Exception:
            detail = resp.text[:300]
        raise SupabaseError(f"Supabase error {resp.status_code}: {detail}", resp.status_code)


# ------------------------------------------------------------------ database
async def select_rows(
    table: str,
    *,
    select: str = "*",
    params: Optional[Dict[str, Any]] = None,
    order: Optional[str] = None,
    limit: Optional[int] = None,
    offset: int = 0,
    count: bool = False,
) -> tuple[List[Dict[str, Any]], Optional[int]]:
    """Query a table. When `limit` is set, pagination happens
    server-side via the PostgREST Range header."""
    query: Dict[str, Any] = {"select": select}
    if params:
        query.update(params)
    if order:
        query["order"] = order
    headers = dict(_default_headers)
    total: Optional[int] = None
    if count:
        headers["Prefer"] = "count=exact"
    if limit is not None:
        headers["Range"] = f"{offset}-{offset + limit - 1}"
    resp = await _client.get(f"/rest/v1/{table}", headers=headers, params=query)
    _check_response(resp)
    if count:
        content_range = resp.headers.get("content-range", "")
        if "/" in content_range:
            total = int(content_range.split("/")[-1])
    return resp.json(), total


async def select_one(
    table: str, *, params: Dict[str, Any], select: str = "*"
) -> Optional[Dict[str, Any]]:
    headers = dict(_default_headers)
    headers["Prefer"] = "count=exact"
    headers["Range"] = "0-0"
    resp = await _client.get(
        f"/rest/v1/{table}", headers=headers, params={"select": select, **params}
    )
    _check_response(resp)
    data = resp.json()
    return data[0] if data else None


async def insert_row(
    table: str, row: Dict[str, Any], *, returning: bool = True
) -> Optional[Dict[str, Any]]:
    headers = dict(_default_headers)
    if returning:
        headers["Prefer"] = "return=representation"
    resp = await _client.post(f"/rest/v1/{table}", headers=headers, json=row)
    _check_response(resp)
    if returning:
        data = resp.json()
        return data[0] if data else None
    return None


async def update_row(
    table: str, *, params: Dict[str, Any], patch: Dict[str, Any]
) -> Optional[Dict[str, Any]]:
    headers = dict(_default_headers)
    headers["Prefer"] = "return=representation"
    resp = await _client.patch(f"/rest/v1/{table}", headers=headers, params=params, json=patch)
    _check_response(resp)
    data = resp.json()
    return data[0] if data else None


async def delete_row(table: str, *, params: Dict[str, Any]) -> None:
    resp = await _client.delete(f"/rest/v1/{table}", headers=dict(_default_headers), params=params)
    _check_response(resp)


async def rpc(function_name: str, args: Dict[str, Any]) -> Any:
    resp = await _client.post(
        f"/rest/v1/rpc/{function_name}", headers=dict(_default_headers), json=args
    )
    _check_response(resp)
    if not resp.content:
        return None
    return resp.json()


# ------------------------------------------------------------------- storage
async def storage_upload(bucket: str, path: str, content: bytes, content_type: str = "application/pdf") -> None:
    resp = await _client.post(
        f"/storage/v1/object/{bucket}/{path}",
        headers={
            **_default_headers,
            "Content-Type": content_type,
            "x-upsert": "false",
        },
        content=content,
    )
    _check_response(resp)


async def storage_delete(bucket: str, path: str) -> None:
    resp = await _client.delete(
        f"/storage/v1/object/{bucket}/{path}", headers=dict(_default_headers)
    )
    _check_response(resp)


async def storage_signed_url(bucket: str, path: str, expires_in: int = 60) -> str:
    """Create a short-lived signed URL. Tries current and legacy body keys,
    falls back to a direct service-key GET URL if signing is unavailable."""
    for body in ({"expiry": expires_in}, {"expiryIn": expires_in}):
        try:
            resp = await _client.post(
                f"/storage/v1/object/sign/{bucket}/{path}",
                headers={**_default_headers, "Content-Type": "application/json"},
                json=body,
            )
            if resp.status_code >= 400:
                continue
            data = resp.json()
            url = data.get("signedURL") or data.get("signed_url")
            if url:
                return url if url.startswith("http") else f"{settings.supabase_url}{url}"
        except (httpx.HTTPError, ValueError):
            continue
    # Fallback: direct object GET with the service role key (short-lived by
    # virtue of being generated per request and never exposed to browsers).
    return f"{settings.supabase_url}/storage/v1/object/{bucket}/{path}"


async def storage_stream(url: str) -> httpx.Response:
    headers: Dict[str, str] = {}
    # Only attach the service key when hitting our own Supabase directly.
    if url.startswith(settings.supabase_url.rstrip("/")):
        headers = dict(_default_headers)
    req = _client.build_request("GET", url, headers=headers)
    return await _client.send(req, stream=True)


# ------------------------------------------------------------ auth admin API
async def auth_admin_create_user(email: str, password: str) -> Dict[str, Any]:
    resp = await _auth_client.post(
        f"{settings.supabase_url.rstrip('/')}/auth/v1/admin/users",
        headers=dict(_default_headers),
        json={
            "email": email,
            "password": password,
            "email_confirm": True,
        },
    )
    _check_response(resp)
    return resp.json()


async def auth_admin_delete_user(user_id: str) -> None:
    resp = await _auth_client.delete(
        f"{settings.supabase_url.rstrip('/')}/auth/v1/admin/users/{user_id}",
        headers=dict(_default_headers),
    )
    _check_response(resp)


async def auth_admin_update_user_password(user_id: str, password: str) -> Dict[str, Any]:
    """Set a user's password via the Supabase Auth Admin API.

    Server-side only (service role key). The plaintext password is forwarded to
    Supabase over HTTPS and is never stored in any application table or log.
    """
    resp = await _auth_client.put(
        f"{settings.supabase_url.rstrip('/')}/auth/v1/admin/users/{user_id}",
        headers={**_default_headers, "Content-Type": "application/json"},
        json={"password": password},
    )
    _check_response(resp)
    return resp.json()


async def auth_admin_list_users(page: int = 1, per_page: int = 200) -> List[Dict[str, Any]]:
    resp = await _auth_client.get(
        f"{settings.supabase_url.rstrip('/')}/auth/v1/admin/users",
        headers=dict(_default_headers),
        params={"page": page, "per_page": per_page},
    )
    _check_response(resp)
    return resp.json().get("users", [])


# ------------------------------------------------------------------ helpers
def hash_ip(ip: Optional[str]) -> str:
    if not ip:
        return "unknown"
    return hashlib.sha256(ip.encode()).hexdigest()[:16]
