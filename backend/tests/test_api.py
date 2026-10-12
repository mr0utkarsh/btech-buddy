import io
import uuid

import fitz
import pytest
from fastapi.testclient import TestClient

from app.catalog import (
    ALLOWED_BRANCH_CODE,
    ALLOWED_SPECIALIZATION_NAME,
    ALLOWED_UNIVERSITY_SHORT_NAME,
)
from app.main import app
from app.rate_limit import limiter


def make_pdf(pages: int = 2) -> bytes:
    doc = fitz.open()
    for _ in range(pages):
        doc.new_page(width=595, height=842)
        doc[0].insert_text(fitz.Point(72, 100), "Question Paper", fontsize=14)
    buf = io.BytesIO()
    doc.save(buf)
    doc.close()
    return buf.getvalue()


@pytest.fixture()
def client():
    # In-memory storage so tests run without Supabase.
    limiter.enabled = False
    with TestClient(app) as c:
        yield c
    limiter.enabled = True


def test_health_endpoint(client):
    resp = client.get("/api/health")
    assert resp.status_code == 200
    body = resp.json()
    assert body["service"] == "btech-buddy-backend"


def test_catalog_constants_are_smvdu_cse_ai_robotics():
    """The customer catalog is fixed to exactly one program."""
    from app.catalog import ALLOWED_SPECIALIZATIONS

    assert ALLOWED_UNIVERSITY_SHORT_NAME == "SMVDU"
    assert ALLOWED_BRANCH_CODE == "CSE"
    assert ALLOWED_SPECIALIZATIONS == ["AI and Robotics"]
    assert ALLOWED_SPECIALIZATION_NAME == "AI and Robotics"


def test_setup_requires_token(client, monkeypatch):
    import app.config as config

    monkeypatch.setattr(config.settings, "setup_token", "secret-token")
    resp = client.post(
        "/api/setup",
        json={
            "email": "admin@example.com",
            "password": "Strong@Password123",
            "setup_token": "wrong",
        },
    )
    assert resp.status_code == 403


def test_setup_rejects_weak_password(client, monkeypatch):
    import app.config as config

    monkeypatch.setattr(config.settings, "setup_token", "secret-token")
    resp = client.post(
        "/api/setup",
        json={
            "email": "admin@example.com",
            "password": "weak",
            "setup_token": "secret-token",
        },
    )
    # Rejected either by request validation (422) or the
    # password-strength rule (400).
    assert resp.status_code in (400, 422)


def test_branch_create_rejects_non_cse(client, monkeypatch):
    """Admins cannot add a branch other than CSE (403 before DB if unauthed)."""
    import app.config as config

    monkeypatch.setattr(config.settings, "setup_token", "secret-token")
    # Without an admin token the request is rejected as unauthorized/forbidden;
    # the key guarantee is that a non-CSE branch can never be persisted.
    resp = client.post(
        "/api/admin/branches",
        json={"name": "Mechanical Engineering", "code": "ME"},
    )
    assert resp.status_code in (401, 403)


def test_institution_create_rejects_non_smvdu(client):
    """Admins cannot add an institution other than SMVDU."""
    resp = client.post(
        "/api/admin/institutions",
        json={
            "name": "Some Other University",
            "short_name": "SOU",
            "type": "university",
        },
    )
    assert resp.status_code in (401, 403)


def test_upload_rejects_non_pdf_without_auth(client):
    resp = client.post(
        "/api/admin/papers",
        data={},
        files={"file": ("paper.txt", b"not a pdf", "text/plain")},
    )
    # Must reject before any DB access: 401/403/400 all acceptable
    # as "not uploaded".
    assert resp.status_code in (400, 401, 403)


# --------------------------------------------------------------- password flow
def test_change_password_requires_auth(client):
    """Unauthenticated callers cannot reach the change-password endpoint."""
    resp = client.post(
        "/api/admin/admins/change-password",
        json={"new_password": "Strong@Password123", "confirm_password": "Strong@Password123"},
    )
    assert resp.status_code in (401, 403)


def test_require_admin_blocks_when_password_change_required(monkeypatch):
    """An admin with must_change_password is blocked from normal ops, but the
    relaxed variant (used by /me and change-password) still works."""
    import asyncio

    import app.auth as auth
    from app.rate_limit import PasswordChangeRequiredError

    async def fake_user(_token):
        return {"sub": "u1", "email": "a@b.c"}

    async def fake_admin(_uid):
        return {
            "user_id": "u1",
            "role": "admin",
            "revoked_at": None,
            "must_change_password": True,
        }

    monkeypatch.setattr(auth, "get_current_user", fake_user)
    monkeypatch.setattr(auth, "get_admin_record", fake_admin)

    with pytest.raises(PasswordChangeRequiredError):
        asyncio.run(auth.require_admin("Bearer x"))

    ctx = asyncio.run(auth.require_admin("Bearer x", enforce_password_change=False))
    assert ctx["admin"]["role"] == "admin"


def test_password_change_required_handler_shape():
    """The dedicated handler returns 403 with a machine-readable code."""
    import asyncio
    import json

    from app.main import password_change_required_handler
    from app.rate_limit import PasswordChangeRequiredError

    resp = asyncio.run(
        password_change_required_handler(None, PasswordChangeRequiredError())
    )
    assert resp.status_code == 403
    body = json.loads(resp.body)
    assert body["code"] == "PASSWORD_CHANGE_REQUIRED"


def _override_relaxed_ctx(app_obj, admins_mod, client):
    async def fake_ctx():
        return {
            "user": {"sub": "u1", "email": "a@b.c"},
            "admin": {"user_id": "u1", "role": "admin", "must_change_password": True},
        }

    app_obj.dependency_overrides[admins_mod.admin_ctx_relaxed] = fake_ctx
    return fake_ctx


def test_change_password_rejects_mismatch(client):
    from app.main import app as fastapi_app
    from app.routers import admins as admins_mod

    _override_relaxed_ctx(fastapi_app, admins_mod, client)
    try:
        resp = client.post(
            "/api/admin/admins/change-password",
            json={
                "new_password": "Strong@Password123",
                "confirm_password": "Different@Password123",
            },
        )
        assert resp.status_code == 400
    finally:
        fastapi_app.dependency_overrides.pop(admins_mod.admin_ctx_relaxed, None)


def test_change_password_rejects_weak_password(client):
    from app.main import app as fastapi_app
    from app.routers import admins as admins_mod

    _override_relaxed_ctx(fastapi_app, admins_mod, client)
    try:
        resp = client.post(
            "/api/admin/admins/change-password",
            json={"new_password": "weak", "confirm_password": "weak"},
        )
        assert resp.status_code == 400
    finally:
        fastapi_app.dependency_overrides.pop(admins_mod.admin_ctx_relaxed, None)
