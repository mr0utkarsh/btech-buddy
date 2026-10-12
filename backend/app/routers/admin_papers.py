"""Admin paper management: upload, watermark pipeline, publish, delete."""
from __future__ import annotations

import re
import uuid
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, Header, UploadFile, File, Form, Request

from app.audit import log_activity, new_uuid
from app.auth import require_admin
from app.catalog import (
    ALLOWED_BRANCH_CODE,
    ALLOWED_SPECIALIZATIONS,
    ALLOWED_UNIVERSITY_SHORT_NAME,
)
from app.config import settings
from app.database import (
    SupabaseError,
    delete_row,
    hash_ip,
    insert_row,
    select_one,
    select_rows,
    storage_delete,
    storage_upload,
    update_row,
)
from app.pdf_utils import validate_pdf
from app.rate_limit import BadRequestError, ForbiddenError, NotFoundError, limiter
from app.watermark import add_watermark

router = APIRouter(prefix="/api/admin/papers", tags=["admin-papers"])

PAPER_SELECT = (
    "*,institutions(name,short_name,type),"
    "branches(name,code),subjects(name,code)"
)

EXAM_TYPES = ["regular", "supply", "improvement", "preparatory", "mid_sem", "end_sem", "other"]
STATUSES = ["draft", "published", "archived"]


async def admin_ctx(authorization: Optional[str] = Header(default=None)):
    return await require_admin(authorization)


@router.post("")
@limiter.limit("10/minute")
async def upload_paper(
    request: Request,
    institution_id: str = Form(...),
    branch_id: str = Form(...),
    semester: int = Form(...),
    exam_type: str = Form(...),
    exam_year: int = Form(...),
    subject_id: Optional[str] = Form(None),
    subject_name: Optional[str] = Form(None),
    subject_code: Optional[str] = Form(""),
    paper_code: Optional[str] = Form(""),
    specialization_id: Optional[str] = Form(None),
    publish: str = Form("false"),
    file: UploadFile = File(...),
    ctx: Dict[str, Any] = Depends(admin_ctx),
):
    admin = ctx["admin"]
    user = ctx["user"]
    ip_hash = hash_ip(request.client.host if request.client else None)

    # ---------------- metadata validation
    errors: List[str] = []
    for label, value in (
        ("institution", institution_id),
        ("branch", branch_id),
    ):
        try:
            uuid.UUID(value)
        except (ValueError, TypeError):
            errors.append(f"Invalid {label} selection")
    if not (1 <= semester <= 8):
        errors.append("Semester must be between 1 and 8")
    if exam_type not in EXAM_TYPES:
        errors.append("Invalid exam type")
    if not (1990 <= exam_year <= 2100):
        errors.append("Exam year must be between 1990 and 2100")
    if errors:
        raise BadRequestError("; ".join(errors))

    institution = await select_one(
        "institutions", params={"id": f"eq.{institution_id}"}
    )
    if not institution:
        raise BadRequestError("Selected institution does not exist")
    # Customer catalog: only SMVDU is allowed.
    if institution.get("short_name") != ALLOWED_UNIVERSITY_SHORT_NAME:
        raise BadRequestError(
            "Only Shri Mata Vaishno Devi University (SMVDU) is supported"
        )
    branch = await select_one("branches", params={"id": f"eq.{branch_id}"})
    if not branch:
        raise BadRequestError("Selected branch does not exist")
    # Customer catalog: only the CSE branch is allowed.
    if branch.get("code") != ALLOWED_BRANCH_CODE:
        raise BadRequestError("Only the CSE branch is supported")

    # Optional specialization — must resolve to "AI and Robotics".
    resolved_specialization_id = None
    try:
        if specialization_id:
            spec = await select_one(
                "specializations", params={"id": f"eq.{specialization_id}"}
            )
            if not spec or spec.get("name") not in ALLOWED_SPECIALIZATIONS:
                raise BadRequestError("Invalid specialization selection")
            resolved_specialization_id = specialization_id
        else:
            # Default to the single allowed specialization.
            spec = await select_one(
                "specializations",
                params={"name": f"eq.{ALLOWED_SPECIALIZATIONS[0]}"},
            )
            if spec:
                resolved_specialization_id = spec["id"]
    except BadRequestError:
        raise
    except Exception:
        # specializations table/column may not exist yet (migration 0006 not
        # applied). Skip specialization rather than failing the upload.
        resolved_specialization_id = None

    # Resolve subject: either pick from catalog or free-text entry.
    resolved_subject_name = None
    resolved_subject_code = subject_code or None
    resolved_subject_id = None
    if subject_id:
        subject = await select_one("subjects", params={"id": f"eq.{subject_id}"})
        if not subject or subject.get("branch_id") != branch_id:
            raise BadRequestError("Selected subject does not belong to this branch")
        resolved_subject_name = subject["name"]
        resolved_subject_code = subject.get("code")
        resolved_subject_id = subject_id
    elif subject_name and subject_name.strip():
        resolved_subject_name = subject_name.strip()[:150]
    else:
        raise BadRequestError("Subject name is required (pick from the list or type it)")

    # ---------------- file validation
    content = await file.read()
    if (file.content_type or "").lower() not in ("application/pdf", ""):
        raise BadRequestError("Only PDF files are allowed")
    meta = validate_pdf(content)

    paper_id = new_uuid()
    original_path = f"originals/{paper_id}.pdf"
    processed_path = f"processed/{paper_id}.pdf"

    # ---------------- watermark + storage
    try:
        await storage_upload(settings.storage_bucket, original_path, content)
    except SupabaseError as exc:
        raise BadRequestError(f"Could not store the original file: {exc}")

    try:
        processed = add_watermark(
            content,
            text=settings.watermark_text,
            opacity=settings.watermark_opacity,
            angle=settings.watermark_angle,
        )
        validate_pdf(processed)  # ensure the watermarked output is valid
        await storage_upload(
            settings.storage_bucket, processed_path, processed
        )
    except Exception as exc:
        # Compensation: remove the stored original.
        try:
            await storage_delete(settings.storage_bucket, original_path)
        except Exception:
            pass
        raise BadRequestError(f"PDF processing failed: {exc}")

    is_published = publish.strip().lower() in ("true", "1", "yes")
    row = {
        "id": paper_id,
        "institution_id": institution_id,
        "branch_id": branch_id,
        "semester": semester,
        "subject_id": resolved_subject_id,
        "subject_name": resolved_subject_name,
        "subject_code": resolved_subject_code,
        "paper_code": paper_code or None,
        "exam_type": exam_type,
        "exam_year": exam_year,
        "original_path": original_path,
        "processed_path": processed_path,
        "file_size_bytes": meta["size_bytes"],
        "page_count": meta["pages"],
        "status": "published" if is_published else "draft",
        "uploaded_by": user.get("sub"),
        "uploaded_by_email": user.get("email"),
        "published_at": None,
    }
    if is_published:
        from datetime import datetime, timezone

        row["published_at"] = datetime.now(timezone.utc).isoformat()

    # Only include specialization_id when we resolved one AND the column
    # exists (migration 0006). If the column is absent, omit it so uploads
    # keep working until the migration is applied.
    if resolved_specialization_id:
        row["specialization_id"] = resolved_specialization_id

    paper = await insert_row("papers", row)
    await log_activity(
        actor_id=user.get("sub"),
        actor_email=user.get("email"),
        action="paper.upload",
        entity_type="paper",
        entity_id=paper_id,
        details={
            "institution": institution.get("short_name"),
            "branch": branch.get("name"),
            "semester": semester,
            "subject": resolved_subject_name,
            "exam": f"{exam_type} {exam_year}",
            "pages": meta["pages"],
            "published": is_published,
        },
        ip_hash=ip_hash,
    )
    return {"message": "Paper uploaded successfully", "paper": paper}


@router.get("")
async def list_papers_admin(
    request: Request,
    ctx: Dict[str, Any] = Depends(admin_ctx),
    q: str = "",
    status: str = "",
    institution_id: str = "",
    branch_id: str = "",
    page: int = 1,
    limit: int = 20,
):
    params: Dict[str, str] = {}
    q = re.sub(r"[*%()'\",\\]", "", q or "").strip()[:80]
    if q:
        params["or"] = (
            f"(subject_name.ilike.*{q}*,subject_code.ilike.*{q}*,"
            f"paper_code.ilike.*{q}*,institutions.name.ilike.*{q}*)"
        )
    if status in STATUSES:
        params["status"] = f"eq.{status}"
    if institution_id:
        params["institution_id"] = f"eq.{institution_id}"
    if branch_id:
        params["branch_id"] = f"eq.{branch_id}"
    rows, total = await select_rows(
        "papers",
        select=PAPER_SELECT,
        params=params,
        order="created_at.desc",
        limit=limit,
        offset=(page - 1) * limit,
        count=True,
    )
    return {"data": rows, "total": total or 0, "page": page, "limit": limit}


@router.get("/{paper_id}")
async def get_paper_admin(
    paper_id: str, ctx: Dict[str, Any] = Depends(admin_ctx)
):
    paper = await select_one(
        "papers", params={"id": f"eq.{paper_id}"}, select=PAPER_SELECT
    )
    if not paper:
        raise NotFoundError("Paper not found")
    return paper


@router.patch("/{paper_id}")
async def update_paper(
    paper_id: str,
    payload: Dict[str, Any],
    ctx: Dict[str, Any] = Depends(admin_ctx),
):
    admin = ctx["admin"]
    existing = await select_one("papers", params={"id": f"eq.{paper_id}"})
    if not existing:
        raise NotFoundError("Paper not found")

    allowed = {
        "institution_id",
        "branch_id",
        "semester",
        "subject_id",
        "subject_name",
        "subject_code",
        "paper_code",
        "exam_type",
        "exam_year",
    }
    patch: Dict[str, Any] = {k: v for k, v in payload.items() if k in allowed}

    if "institution_id" in patch or "branch_id" in patch:
        institution_id = patch.get("institution_id", existing["institution_id"])
        branch_id = patch.get("branch_id", existing["branch_id"])
        inst = await select_one("institutions", params={"id": f"eq.{institution_id}"})
        br = await select_one("branches", params={"id": f"eq.{branch_id}"})
        if not inst or not br:
            raise BadRequestError("Invalid institution or branch")
    if "semester" in patch and not (1 <= patch["semester"] <= 8):
        raise BadRequestError("Semester must be between 1 and 8")
    if "exam_type" in patch and patch["exam_type"] not in EXAM_TYPES:
        raise BadRequestError("Invalid exam type")
    if "exam_year" in patch and not (1990 <= patch["exam_year"] <= 2100):
        raise BadRequestError("Invalid exam year")
    if patch.get("subject_id"):
        subject = await select_one("subjects", params={"id": f"eq.{patch['subject_id']}"})
        if not subject or subject.get("branch_id") != patch.get("branch_id", existing["branch_id"]):
            raise BadRequestError("Selected subject does not belong to this branch")
        patch["subject_name"] = subject["name"]
        patch["subject_code"] = subject.get("code")
    if not patch.get("subject_name") and not existing.get("subject_name"):
        raise BadRequestError("Subject name is required")

    updated = await update_row(
        "papers", params={"id": f"eq.{paper_id}"}, patch=patch
    )
    await log_activity(
        actor_id=ctx["user"].get("sub"),
        actor_email=ctx["user"].get("email"),
        action="paper.update",
        entity_type="paper",
        entity_id=paper_id,
        details={"fields": list(patch.keys())},
    )
    return {"message": "Paper updated", "paper": updated}


@router.post("/{paper_id}/publish")
async def publish_paper(
    paper_id: str, ctx: Dict[str, Any] = Depends(admin_ctx)
):
    existing = await select_one("papers", params={"id": f"eq.{paper_id}"})
    if not existing:
        raise NotFoundError("Paper not found")
    from datetime import datetime, timezone

    updated = await update_row(
        "papers",
        params={"id": f"eq.{paper_id}"},
        patch={"status": "published", "published_at": datetime.now(timezone.utc).isoformat()},
    )
    await log_activity(
        actor_id=ctx["user"].get("sub"),
        actor_email=ctx["user"].get("email"),
        action="paper.publish",
        entity_type="paper",
        entity_id=paper_id,
        details={"subject": existing.get("subject_name")},
    )
    return {"message": "Paper published", "paper": updated}


@router.post("/{paper_id}/unpublish")
async def unpublish_paper(
    paper_id: str, ctx: Dict[str, Any] = Depends(admin_ctx)
):
    existing = await select_one("papers", params={"id": f"eq.{paper_id}"})
    if not existing:
        raise NotFoundError("Paper not found")
    updated = await update_row(
        "papers",
        params={"id": f"eq.{paper_id}"},
        patch={"status": "draft", "published_at": None},
    )
    await log_activity(
        actor_id=ctx["user"].get("sub"),
        actor_email=ctx["user"].get("email"),
        action="paper.unpublish",
        entity_type="paper",
        entity_id=paper_id,
        details={"subject": existing.get("subject_name")},
    )
    return {"message": "Paper unpublished", "paper": updated}


@router.post("/{paper_id}/replace")
@limiter.limit("10/minute")
async def replace_paper_file(
    paper_id: str,
    request: Request,
    file: UploadFile = File(...),
    ctx: Dict[str, Any] = Depends(admin_ctx),
):
    existing = await select_one("papers", params={"id": f"eq.{paper_id}"})
    if not existing:
        raise NotFoundError("Paper not found")

    content = await file.read()
    if (file.content_type or "").lower() not in ("application/pdf", ""):
        raise BadRequestError("Only PDF files are allowed")
    meta = validate_pdf(content)

    new_original = f"originals/{paper_id}.pdf"
    new_processed = f"processed/{paper_id}.pdf"
    old_original = existing["original_path"]
    old_processed = existing["processed_path"]

    try:
        await storage_upload(settings.storage_bucket, new_original, content)
    except SupabaseError as exc:
        raise BadRequestError(f"Could not store the original file: {exc}")

    try:
        processed = add_watermark(
            content,
            text=settings.watermark_text,
            opacity=settings.watermark_opacity,
            angle=settings.watermark_angle,
        )
        validate_pdf(processed)
        await storage_upload(settings.storage_bucket, new_processed, processed)
    except Exception as exc:
        try:
            await storage_delete(settings.storage_bucket, new_original)
        except Exception:
            pass
        raise BadRequestError(f"PDF processing failed: {exc}")

    # Remove the previous versions.
    for path in (old_original, old_processed):
        try:
            await storage_delete(settings.storage_bucket, path)
        except Exception:
            pass

    updated = await update_row(
        "papers",
        params={"id": f"eq.{paper_id}"},
        patch={
            "file_size_bytes": meta["size_bytes"],
            "page_count": meta["pages"],
        },
    )
    await log_activity(
        actor_id=ctx["user"].get("sub"),
        actor_email=ctx["user"].get("email"),
        action="paper.replace",
        entity_type="paper",
        entity_id=paper_id,
        details={"pages": meta["pages"]},
    )
    return {"message": "PDF replaced and re-watermarked", "paper": updated}


@router.delete("/{paper_id}")
async def delete_paper(
    paper_id: str, ctx: Dict[str, Any] = Depends(admin_ctx)
):
    existing = await select_one("papers", params={"id": f"eq.{paper_id}"})
    if not existing:
        raise NotFoundError("Paper not found")

    await delete_row("papers", params={"id": f"eq.{paper_id}"})
    for path in (existing["original_path"], existing["processed_path"]):
        try:
            await storage_delete(settings.storage_bucket, path)
        except Exception:
            pass

    await log_activity(
        actor_id=ctx["user"].get("sub"),
        actor_email=ctx["user"].get("email"),
        action="paper.delete",
        entity_type="paper",
        entity_id=paper_id,
        details={"subject": existing.get("subject_name")},
    )
    return {"message": "Paper deleted"}
