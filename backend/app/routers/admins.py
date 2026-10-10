"""Admin account management: invite, list, role changes, revoke, delete.

Permission model:
- Any active admin can invite new admins (role=admin only).
- Only the super admin can assign/change the super_admin role.
- Admins can revoke/restore/delete other admins (role=admin).
- Only the super admin can touch super_admin accounts.
- Nobody can modify their own account (prevents lockout).
"""
from __future__ import annotations

import secrets
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, Header, Request

from app.audit import log_activity
from app.auth import require_admin, require_super_admin
from app.database import (
    auth_admin_create_user,
    auth_admin_delete_user,
    insert_row,
    select_rows,
    select_one,
    update_row,
)
from app.rate_limit import BadRequestError, ForbiddenError, NotFoundError, limiter

router = APIRouter(prefix="/api/admin/admins", tags=["admins"])


async def admin_ctx(authorization: Optional[str] = Header(default=None)):
    return await require_admin(authorization)


async def super_ctx(authorization: Optional[str] = Header(default=None)):
    return await require_super_admin(authorization)


@router.get("/me")
async def get_my_admin(ctx: Dict[str, Any] = Depends(admin_ctx)):
    """Current admin's identity and role (used by the frontend guard)."""
    admin = ctx["admin"]
    return {
      "role": admin["role"],
      "email": admin["email"],
      "user_id": admin["user_id"],
      "active": not admin.get("revoked_at"),
    }


@router.get("")
async def list_admins(ctx: Dict[str, Any] = Depends(admin_ctx)):
    rows, _ = await select_rows(
        "admins", select="*", order="created_at.asc"
    )
    for row in rows:
        row["active"] = not row.get("revoked_at")
    return {"data": rows}


@router.post("/invite")
@limiter.limit("5/minute")
async def invite_admin(
    request: Request,
    payload: Dict[str, Any],
    ctx: Dict[str, Any] = Depends(admin_ctx),
):
    inviter = ctx["admin"]
    email = str(payload.get("email", "")).strip().lower()
    role = payload.get("role", "admin")

    import re

    if not re.match(r"^[^@]+@[^@]+\.[^@]+$", email):
        raise BadRequestError("Enter a valid email address")

    # Role gating: only a super admin may create other super admins.
    if role not in ("admin", "super_admin"):
        raise BadRequestError("Role must be admin or super_admin")
    if role == "super_admin" and inviter.get("role") != "super_admin":
        raise ForbiddenError("Only the super admin can invite super admins")

    # Re-activating a previously revoked account is allowed.
    existing = await select_one("admins", params={"email": f"eq.{email}"})
    if existing and not existing.get("revoked_at"):
        raise BadRequestError("This admin account already exists and is active")

    temp_password = secrets.token_urlsafe(18)
    try:
        if existing:
            user = {"id": existing["user_id"]}
        else:
            user = await auth_admin_create_user(email, temp_password)
    except Exception as exc:
        raise BadRequestError(f"Could not create the account: {exc}")

    row = {
        "user_id": user["id"],
        "email": email,
        "role": role,
        "created_by": ctx["user"].get("sub"),
    }
    if existing:
        await update_row(
            "admins",
            params={"user_id": f"eq.{user['id']}"},
            patch={"revoked_at": None, "role": role},
        )
        admin_row = {**existing, "revoked_at": None, "role": role}
    else:
        admin_row = await insert_row("admins", row)

    await log_activity(
        actor_id=ctx["user"].get("sub"),
        actor_email=ctx["user"].get("email"),
        action="admin.invite",
        entity_type="admin",
        entity_id=user["id"],
        details={"invited_email": email, "role": role},
    )
    return {
        "message": "Admin invited",
        "admin": admin_row,
        # Returned once. The inviter must relay it through a secure channel.
        "temporary_password": temp_password,
    }


@router.patch("/{user_id}")
async def change_admin_role(
    user_id: str,
    payload: Dict[str, Any],
    ctx: Dict[str, Any] = Depends(super_ctx),
):
    """Super admin only: change another admin's role."""
    if user_id == ctx["user"].get("sub"):
        raise BadRequestError("You cannot change your own role")
    target = await select_one("admins", params={"user_id": f"eq.{user_id}"})
    if not target:
        raise NotFoundError("Admin not found")
    new_role = payload.get("role")
    if new_role not in ("admin", "super_admin"):
        raise BadRequestError("Role must be admin or super_admin")
    if new_role == target["role"]:
        return {"message": "No change needed", "admin": target}
    updated = await update_row(
        "admins", params={"user_id": f"eq.{user_id}"}, patch={"role": new_role}
    )
    await log_activity(
        actor_id=ctx["user"].get("sub"),
        actor_email=ctx["user"].get("email"),
        action="admin.role.change",
        entity_type="admin",
        entity_id=user_id,
        details={"from": target["role"], "to": new_role},
    )
    return {"message": "Role updated", "admin": updated}


@router.post("/{user_id}/revoke")
async def revoke_admin(
    user_id: str, payload: Dict[str, Any], ctx: Dict[str, Any] = Depends(admin_ctx)
):
    if user_id == ctx["user"].get("sub"):
        raise BadRequestError("You cannot revoke your own account")
    target = await select_one("admins", params={"user_id": f"eq.{user_id}"})
    if not target:
        raise NotFoundError("Admin not found")
    if target["role"] == "super_admin" and ctx["admin"].get("role") != "super_admin":
        raise ForbiddenError("Only the super admin can revoke super admins")
    if target.get("revoked_at"):
        return {"message": "Admin is already revoked", "admin": target}
    reason = str(payload.get("reason", "")).strip()[:300] or None
    updated = await update_row(
        "admins",
        params={"user_id": f"eq.{user_id}"},
        patch={"revoked_at": datetime.now(timezone.utc).isoformat()},
    )
    await log_activity(
        actor_id=ctx["user"].get("sub"),
        actor_email=ctx["user"].get("email"),
        action="admin.revoke",
        entity_type="admin",
        entity_id=user_id,
        details={"email": target["email"], "reason": reason},
    )
    return {"message": "Admin access revoked", "admin": updated}


@router.post("/{user_id}/restore")
async def restore_admin(
    user_id: str, ctx: Dict[str, Any] = Depends(admin_ctx)
):
    if user_id == ctx["user"].get("sub"):
        raise BadRequestError("You cannot modify your own account")
    target = await select_one("admins", params={"user_id": f"eq.{user_id}"})
    if not target:
        raise NotFoundError("Admin not found")
    if target["role"] == "super_admin" and ctx["admin"].get("role") != "super_admin":
        raise ForbiddenError("Only the super admin can restore super admins")
    if not target.get("revoked_at"):
        return {"message": "Admin is already active", "admin": target}
    updated = await update_row(
        "admins", params={"user_id": f"eq.{user_id}"}, patch={"revoked_at": None}
    )
    await log_activity(
        actor_id=ctx["user"].get("sub"),
        actor_email=ctx["user"].get("email"),
        action="admin.restore",
        entity_type="admin",
        entity_id=user_id,
        details={"email": target["email"]},
    )
    return {"message": "Admin access restored", "admin": updated}


@router.delete("/{user_id}")
async def delete_admin(
    user_id: str, ctx: Dict[str, Any] = Depends(admin_ctx)
):
    if user_id == ctx["user"].get("sub"):
        raise BadRequestError("You cannot delete your own account")
    target = await select_one("admins", params={"user_id": f"eq.{user_id}"})
    if not target:
        raise NotFoundError("Admin not found")
    if target["role"] == "super_admin" and ctx["admin"].get("role") != "super_admin":
        raise ForbiddenError("Only the super admin can delete super admins")

    await delete_admin_records(target)
    await log_activity(
        actor_id=ctx["user"].get("sub"),
        actor_email=ctx["user"].get("email"),
        action="admin.delete",
        entity_type="admin",
        entity_id=user_id,
        details={"email": target["email"]},
    )
    return {"message": "Admin removed"}


async def delete_admin_records(target: Dict[str, Any]) -> None:
    from app.database import delete_row

    await delete_row("admins", params={"user_id": f"eq.{target['user_id']}"})
    try:
        await auth_admin_delete_user(target["user_id"])
    except Exception:
        # Auth user deletion may fail in some project configs; the
        # admin row removal already blocks access.
        pass
