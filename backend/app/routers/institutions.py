"""Institution / branch / subject management.

Public read endpoints for the student site; admin-only mutations.
"""
from __future__ import annotations

import re
import uuid
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, Header

from app.audit import log_activity
from app.auth import require_admin
from app.database import (
    delete_row,
    insert_row,
    select_one,
    select_rows,
    update_row,
)
from app.rate_limit import BadRequestError, ForbiddenError, NotFoundError

router = APIRouter(tags=["institutions"])


async def admin_ctx(authorization: Optional[str] = Header(default=None)):
    return await require_admin(authorization)


# ------------------------------------------------------------- public read
@router.get("/api/institutions")
async def list_institutions(type: Optional[str] = None):
    params: Dict[str, str] = {}
    if type in ("university", "college", "institute"):
        params["type"] = f"eq.{type}"
    rows, _ = await select_rows(
        "institutions", select="*", params=params, order="name.asc"
    )
    return {"data": rows}


@router.get("/api/branches")
async def list_branches():
    rows, _ = await select_rows("branches", select="*", order="name.asc")
    return {"data": rows}


@router.get("/api/subjects")
async def list_subjects(
    branch_id: Optional[str] = None, semester: Optional[int] = None
):
    params: Dict[str, str] = {}
    if branch_id:
        params["branch_id"] = f"eq.{branch_id}"
    if semester:
        params["semester"] = f"eq.{semester}"
    rows, _ = await select_rows(
        "subjects", select="*,branches(name,code)", params=params, order="name.asc"
    )
    return {"data": rows}


# -------------------------------------------------------- institutions CRUD
@router.post("/api/admin/institutions")
async def create_institution(
    payload: Dict[str, Any], ctx: Dict[str, Any] = Depends(admin_ctx)
):
    name = str(payload.get("name", "")).strip()
    short_name = str(payload.get("short_name", "")).strip()
    inst_type = payload.get("type")
    if not (2 <= len(name) <= 120):
        raise BadRequestError("Institution name must be 2-120 characters")
    if not (2 <= len(short_name) <= 40):
        raise BadRequestError("Short name must be 2-40 characters")
    if inst_type not in ("university", "college", "institute"):
        raise BadRequestError("Type must be university, college, or institute")

    affiliated_to = payload.get("affiliated_to") or None
    if affiliated_to:
        try:
            uuid.UUID(affiliated_to)
        except (ValueError, TypeError):
            raise BadRequestError("Invalid affiliation reference")
        parent = await select_one(
            "institutions", params={"id": f"eq.{affiliated_to}"}
        )
        if not parent:
            raise BadRequestError("Affiliated institution does not exist")
        if parent["type"] != "university":
            raise BadRequestError(
                "Only a university can be selected as an affiliation"
            )
    if inst_type == "university" and affiliated_to:
        raise BadRequestError("A university cannot be affiliated to another institution")

    row = {
        "name": name,
        "short_name": short_name,
        "type": inst_type,
        "city": str(payload.get("city", "Kanpur") or "Kanpur").strip()[:60],
        "state": str(payload.get("state", "Uttar Pradesh") or "Uttar Pradesh").strip()[:60],
        "website": str(payload.get("website", "") or "").strip()[:300] or None,
        "established_year": payload.get("established_year") or None,
        "affiliated_to": affiliated_to,
        "verified": bool(payload.get("verified", False)),
    }
    try:
        created = await insert_row("institutions", row)
    except Exception as exc:
        raise BadRequestError(f"Could not save institution: {exc}")

    await log_activity(
        actor_id=ctx["user"].get("sub"),
        actor_email=ctx["user"].get("email"),
        action="institution.create",
        entity_type="institution",
        entity_id=created["id"],
        details={"name": name, "type": inst_type},
    )
    return {"message": "Institution added", "institution": created}


@router.patch("/api/admin/institutions/{institution_id}")
async def update_institution(
    institution_id: str,
    payload: Dict[str, Any],
    ctx: Dict[str, Any] = Depends(admin_ctx),
):
    existing = await select_one(
        "institutions", params={"id": f"eq.{institution_id}"}
    )
    if not existing:
        raise NotFoundError("Institution not found")

    allowed = {
        "name",
        "short_name",
        "type",
        "city",
        "state",
        "website",
        "established_year",
        "affiliated_to",
        "verified",
    }
    patch: Dict[str, Any] = {k: v for k, v in payload.items() if k in allowed}

    if "type" in patch and patch["type"] not in ("university", "college", "institute"):
        raise BadRequestError("Type must be university, college, or institute")
    if patch.get("name") and not (2 <= len(str(patch["name"]).strip()) <= 120):
        raise BadRequestError("Institution name must be 2-120 characters")
    if patch.get("short_name") and not (
        2 <= len(str(patch["short_name"]).strip()) <= 40
    ):
        raise BadRequestError("Short name must be 2-40 characters")

    if patch.get("affiliated_to"):
        parent = await select_one(
            "institutions", params={"id": f"eq.{patch['affiliated_to']}"}
        )
        if not parent or parent["type"] != "university":
            raise BadRequestError("Only a university can be selected as an affiliation")
    if patch.get("type") == "university":
        patch["affiliated_to"] = None

    updated = await update_row(
        "institutions", params={"id": f"eq.{institution_id}"}, patch=patch
    )
    await log_activity(
        actor_id=ctx["user"].get("sub"),
        actor_email=ctx["user"].get("email"),
        action="institution.update",
        entity_type="institution",
        entity_id=institution_id,
        details={"fields": list(patch.keys())},
    )
    return {"message": "Institution updated", "institution": updated}


@router.delete("/api/admin/institutions/{institution_id}")
async def delete_institution(
    institution_id: str, ctx: Dict[str, Any] = Depends(admin_ctx)
):
    existing = await select_one(
        "institutions", params={"id": f"eq.{institution_id}"}
    )
    if not existing:
        raise NotFoundError("Institution not found")

    papers, _ = await select_rows(
        "papers", select="id", params={"institution_id": f"eq.{institution_id}"}
    )
    if papers:
        raise BadRequestError(
            f"Cannot delete: {len(papers)} question paper(s) belong to this institution"
        )

    # Re-parent affiliated colleges to null.
    children, _ = await select_rows(
        "institutions", select="id", params={"affiliated_to": f"eq.{institution_id}"}
    )
    for child in children:
        await update_row(
            "institutions", params={"id": f"eq.{child['id']}"}, patch={"affiliated_to": None}
        )

    await delete_row("institutions", params={"id": f"eq.{institution_id}"})
    await log_activity(
        actor_id=ctx["user"].get("sub"),
        actor_email=ctx["user"].get("email"),
        action="institution.delete",
        entity_type="institution",
        entity_id=institution_id,
        details={"name": existing["name"]},
    )
    return {"message": "Institution deleted"}


# ------------------------------------------------------------ branches CRUD
@router.post("/api/admin/branches")
async def create_branch(
    payload: Dict[str, Any], ctx: Dict[str, Any] = Depends(admin_ctx)
):
    name = str(payload.get("name", "")).strip()
    code = str(payload.get("code", "")).strip().upper() or None
    if not (2 <= len(name) <= 90):
        raise BadRequestError("Branch name must be 2-90 characters")
    row = {"name": name, "code": code}
    try:
        created = await insert_row("branches", row)
    except Exception as exc:
        raise BadRequestError(f"Could not save branch: {exc}")
    await log_activity(
        actor_id=ctx["user"].get("sub"),
        actor_email=ctx["user"].get("email"),
        action="branch.create",
        entity_type="branch",
        entity_id=created["id"],
        details={"name": name},
    )
    return {"message": "Branch added", "branch": created}


@router.patch("/api/admin/branches/{branch_id}")
async def update_branch(
    branch_id: str, payload: Dict[str, Any], ctx: Dict[str, Any] = Depends(admin_ctx)
):
    existing = await select_one("branches", params={"id": f"eq.{branch_id}"})
    if not existing:
        raise NotFoundError("Branch not found")
    patch: Dict[str, Any] = {}
    if "name" in payload:
        name = str(payload["name"]).strip()
        if not (2 <= len(name) <= 90):
            raise BadRequestError("Branch name must be 2-90 characters")
        patch["name"] = name
    if "code" in payload:
        patch["code"] = str(payload["code"]).strip().upper() or None
    updated = await update_row("branches", params={"id": f"eq.{branch_id}"}, patch=patch)
    await log_activity(
        actor_id=ctx["user"].get("sub"),
        actor_email=ctx["user"].get("email"),
        action="branch.update",
        entity_type="branch",
        entity_id=branch_id,
    )
    return {"message": "Branch updated", "branch": updated}


@router.delete("/api/admin/branches/{branch_id}")
async def delete_branch(
    branch_id: str, ctx: Dict[str, Any] = Depends(admin_ctx)
):
    existing = await select_one("branches", params={"id": f"eq.{branch_id}"})
    if not existing:
        raise NotFoundError("Branch not found")
    papers, _ = await select_rows(
        "papers", select="id", params={"branch_id": f"eq.{branch_id}"}
    )
    if papers:
        raise BadRequestError(
            f"Cannot delete: {len(papers)} question paper(s) belong to this branch"
        )
    await delete_row("branches", params={"id": f"eq.{branch_id}"})
    await log_activity(
        actor_id=ctx["user"].get("sub"),
        actor_email=ctx["user"].get("email"),
        action="branch.delete",
        entity_type="branch",
        entity_id=branch_id,
        details={"name": existing["name"]},
    )
    return {"message": "Branch deleted (its subjects were removed too)"}


# ----------------------------------------------------------- subjects CRUD
@router.post("/api/admin/subjects")
async def create_subject(
    payload: Dict[str, Any], ctx: Dict[str, Any] = Depends(admin_ctx)
):
    name = str(payload.get("name", "")).strip()
    branch_id = payload.get("branch_id")
    semester = payload.get("semester")
    if not (2 <= len(name) <= 120):
        raise BadRequestError("Subject name must be 2-120 characters")
    if not branch_id:
        raise BadRequestError("Branch is required")
    if not (isinstance(semester, int) and 1 <= semester <= 8):
        raise BadRequestError("Semester must be between 1 and 8")
    branch = await select_one("branches", params={"id": f"eq.{branch_id}"})
    if not branch:
        raise BadRequestError("Branch does not exist")
    row = {
        "branch_id": branch_id,
        "semester": semester,
        "name": name,
        "code": str(payload.get("code", "")).strip().upper() or None,
    }
    try:
        created = await insert_row("subjects", row)
    except Exception as exc:
        raise BadRequestError(f"Could not save subject (may already exist): {exc}")
    await log_activity(
        actor_id=ctx["user"].get("sub"),
        actor_email=ctx["user"].get("email"),
        action="subject.create",
        entity_type="subject",
        entity_id=created["id"],
        details={"name": name, "semester": semester},
    )
    return {"message": "Subject added", "subject": created}


@router.patch("/api/admin/subjects/{subject_id}")
async def update_subject(
    subject_id: str, payload: Dict[str, Any], ctx: Dict[str, Any] = Depends(admin_ctx)
):
    existing = await select_one("subjects", params={"id": f"eq.{subject_id}"})
    if not existing:
        raise NotFoundError("Subject not found")
    patch: Dict[str, Any] = {}
    if "name" in payload:
        name = str(payload["name"]).strip()
        if not (2 <= len(name) <= 120):
            raise BadRequestError("Subject name must be 2-120 characters")
        patch["name"] = name
    if "code" in payload:
        patch["code"] = str(payload["code"]).strip().upper() or None
    updated = await update_row("subjects", params={"id": f"eq.{subject_id}"}, patch=patch)
    await log_activity(
        actor_id=ctx["user"].get("sub"),
        actor_email=ctx["user"].get("email"),
        action="subject.update",
        entity_type="subject",
        entity_id=subject_id,
    )
    return {"message": "Subject updated", "subject": updated}


@router.delete("/api/admin/subjects/{subject_id}")
async def delete_subject(
    subject_id: str, ctx: Dict[str, Any] = Depends(admin_ctx)
):
    existing = await select_one("subjects", params={"id": f"eq.{subject_id}"})
    if not existing:
        raise NotFoundError("Subject not found")
    papers, _ = await select_rows(
        "papers", select="id", params={"subject_id": f"eq.{subject_id}"}
    )
    if papers:
        raise BadRequestError(
            f"Cannot delete: {len(papers)} question paper(s) use this subject"
        )
    await delete_row("subjects", params={"id": f"eq.{subject_id}"})
    await log_activity(
        actor_id=ctx["user"].get("sub"),
        actor_email=ctx["user"].get("email"),
        action="subject.delete",
        entity_type="subject",
        entity_id=subject_id,
        details={"name": existing["name"]},
    )
    return {"message": "Subject deleted"}
