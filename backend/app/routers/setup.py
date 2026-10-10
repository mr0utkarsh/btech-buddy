"""One-time super admin setup flow.

Protected by SETUP_TOKEN (server env var). Creates the first
super admin account when none exists yet.
"""
from __future__ import annotations

import re
import secrets
from typing import Optional

from fastapi import APIRouter, Header, Request
from pydantic import BaseModel, EmailStr, Field

from app.audit import log_activity
from app.auth import get_admin_record
from app.config import settings
from app.database import (
    auth_admin_create_user,
    insert_row,
    select_rows,
)
from app.rate_limit import BadRequestError, ForbiddenError, limiter

router = APIRouter(prefix="/api", tags=["setup"])


class SetupPayload(BaseModel):
    email: EmailStr
    password: str = Field(min_length=12, max_length=128)
    setup_token: str = Field(min_length=1)


@router.get("/setup-status")
async def setup_status():
    rows, _ = await select_rows(
        "admins", select="user_id", params={"role": "eq.super_admin"}
    )
    return {
        "super_admin_exists": bool(rows),
        "setup_enabled": bool(settings.setup_token),
        "initial_admin_configured": bool(
            settings.initial_super_admin_email and settings.initial_super_admin_password
        ),
    }


@router.post("/setup")
@limiter.limit(settings.setup_rate_limit)
async def setup_super_admin(payload: SetupPayload, request: Request):
    if not settings.setup_token:
        raise ForbiddenError("Setup flow is not enabled on this server")
    if payload.setup_token != settings.setup_token:
        raise ForbiddenError("Invalid setup token")

    rows, _ = await select_rows(
        "admins", select="user_id", params={"role": "eq.super_admin"}
    )
    if rows:
        raise BadRequestError(
            "Setup already completed. A super admin already exists."
        )

    email = payload.email.strip().lower()
    password_strength = (
        len(payload.password) >= 12
        and re.search(r"[A-Z]", payload.password) is not None
        and re.search(r"[0-9]", payload.password) is not None
        and re.search(r"[^A-Za-z0-9]", payload.password) is not None
    )
    if not password_strength:
        raise BadRequestError(
            "Password must be at least 12 characters and include uppercase, "
            "numbers, and a symbol"
        )

    try:
        user = await auth_admin_create_user(email, payload.password)
    except Exception as exc:
        raise BadRequestError(f"Could not create the account: {exc}")

    admin = await insert_row(
        "admins",
        {
            "user_id": user["id"],
            "email": email,
            "role": "super_admin",
            "created_by": user["id"],
        },
    )
    await log_activity(
        actor_id=user["id"],
        actor_email=email,
        action="setup.initial_super_admin",
        entity_type="admin",
        entity_id=user["id"],
        ip_hash=request.client.host if request.client else None,
    )
    return {
        "message": "Super admin created. You can now sign in at /login.",
        "admin": admin,
    }
