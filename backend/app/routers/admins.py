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
    auth_admin_update_user_password,
    insert_row,
    select_rows,
    select_one,
    update_row,
)
from app.rate_limit import (
    BadRequestError,
    ForbiddenError,
    NotFoundError,
    limiter,
)

router = APIRouter(prefix="/api/admin/admins", tags=["admins"])

PASSWORD_RULES = (
    "Password must be at least 12 characters and include uppercase, "
    "lowercase, a number, and a symbol"
)


async def admin_ctx(authorization: Optional[str] = Header(default=None)):
    return await require_admin(authorization)


async def admin_ctx_relaxed(authorization: Optional[str] = Header(default=None)):
    """Admin context that still works while ``must_change_password`` is set.

    Used only by ``/me`` and the change-password endpoint so a newly invited
    admin can complete the mandatory first password change.
    """
    return await require_admin(authorization, enforce_password_change=False)


async def super_ctx(authorization: Optional[str] = Header(default=None)):
    return await require_super_admin(authorization)


@router.get("/me")
async def get_my_admin(ctx: Dict[str, Any] = Depends(admin_ctx_relaxed)):
    """Current admin's identity, role and password-change state."""
    admin = ctx["admin"]
    return {
      "role": admin["role"],
      "email": admin["email"],
      "user_id": admin["user_id"],
      "active": not admin.get("revoked_at"),
      "must_change_password": bool(admin.get("must_change_password")),
    }


@router.post("/change-password")
@limiter.limit("10/minute")
async def change_my_password(
    request: Request,
    payload: Dict[str, Any],
    ctx: Dict[str, Any] = Depends(admin_ctx_relaxed),
):
    """Set a new password for the signed-in admin.

    Used both for the mandatory first-login change (temporary password) and for
    later changes from the profile/settings area. The password is forwarded to
    Supabase Auth (which owns hashing); it is never stored in app tables or logs.
    """
    user = ctx["user"]
    admin = ctx["admin"]
    new_password = str(payload.get("new_password", ""))
    confirm_password = str(payload.get("confirm_password", ""))

    if new_password != confirm_password:
        raise BadRequestError("New password and confirmation do not match")
    if len(new_password) < 12 or len(new_password) > 128:
        raise BadRequestError("Password must be 12-128 characters long")
    import re

    if not (
        re.search(r"[A-Z]", new_password)
        and re.search(r"[a-z]", new_password)
        and re.search(r"[0-9]", new_password)
        and re.search(r"[^A-Za-z0-9]", new_password)
    ):
        raise BadRequestError(PASSWORD_RULES)

    try:
        await auth_admin_update_user_password(user.get("sub"), new_password)
    except Exception as exc:  # noqa: BLE001
        raise BadRequestError(f"Could not update the password: {exc}")

    await update_row(
        "admins",
        params={"user_id": f"eq.{user.get('sub')}"},
        patch={"must_change_password": False},
    )
    await log_activity(
        actor_id=user.get("sub"),
        actor_email=user.get("email") or admin.get("email"),
        action="admin.password.change",
        entity_type="admin",
        entity_id=user.get("sub"),
    )
    return {"message": "Password updated successfully"}


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
        # Newly created admins must change their temporary password at first
        # sign-in before they can use the dashboard.
        row["must_change_password"] = True
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
