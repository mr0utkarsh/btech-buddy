"""Public paper discovery, preview, and download endpoints."""
from __future__ import annotations

import re
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Query, Request

from app.config import settings
from app.database import (
    hash_ip,
    insert_row,
    rpc,
    select_one,
    select_rows,
    storage_signed_url,
    storage_stream,
)
from app.rate_limit import NotFoundError, limiter

router = APIRouter(prefix="/api/papers", tags=["papers"])

ALLOWED_SORT = {
    "newest": "created_at.desc",
    "downloads": "download_count.desc",
    "year": "exam_year.desc",
    "year_asc": "exam_year.asc",
    "subject": "subject_name.asc",
}

EXAM_TYPES = ["regular", "supply", "improvement", "preparatory", "mid_sem", "end_sem", "other"]

PAPER_SELECT = (
    "*,institutions(name,short_name,type,city,verified),"
    "branches(name,code),subjects(name,code)"
)

NIL_UUID = "00000000-0000-0000-0000-000000000000"


def _sanitize_query(q: str) -> str:
    # Strip characters that break PostgREST filter syntax.
    return re.sub(r"[*%()'\",\\]", "", q or "").strip()[:80]


def _build_params(args: Dict[str, Any]) -> Dict[str, str]:
    params: Dict[str, str] = {}
    q = _sanitize_query(args.get("q", ""))
    if q:
        params["or"] = (
            f"(subject_name.ilike.*{q}*,"
            f"subject_code.ilike.*{q}*,"
            f"paper_code.ilike.*{q}*,"
            f"institutions.name.ilike.*{q}*)"
        )
    if args.get("institution_id"):
        params["institution_id"] = f"eq.{args['institution_id']}"
    if args.get("branch_id"):
        params["branch_id"] = f"eq.{args['branch_id']}"
    if args.get("semester"):
        params["semester"] = f"eq.{args['semester']}"
    if args.get("exam_type") and args["exam_type"] in EXAM_TYPES:
        params["exam_type"] = f"eq.{args['exam_type']}"
    if args.get("year"):
        params["exam_year"] = f"eq.{args['year']}"
    # Public API: published papers only.
    params["status"] = "eq.published"
    return params


@router.get("")
@limiter.limit(settings.api_rate_limit)
async def list_papers(
    request: Request,
    q: str = Query("", description="Search query"),
    institution_id: Optional[str] = None,
    branch_id: Optional[str] = None,
    semester: Optional[int] = None,
    exam_type: Optional[str] = None,
    year: Optional[int] = None,
    sort: str = Query("newest"),
    page: int = Query(1, ge=1),
    limit: int = Query(12, ge=1, le=100),
):
    params = _build_params(
        {
            "q": q,
            "institution_id": institution_id,
            "branch_id": branch_id,
            "semester": semester,
            "exam_type": exam_type,
            "year": year,
        }
    )
    order = ALLOWED_SORT.get(sort, "created_at.desc")
    offset = (page - 1) * limit

    rows, total = await select_rows(
        "papers",
        select=PAPER_SELECT,
        params=params,
        order=order,
        limit=limit,
        offset=offset,
        count=True,
    )
    return {"data": rows, "total": total or 0, "page": page, "limit": limit}


@router.get("/filters")
@limiter.limit(settings.api_rate_limit)
async def filter_options(request: Request):
    """Distinct filter values for the browse page."""
    institutions, _ = await select_rows(
        "institutions",
        select="id,name,short_name,type,city,verified",
        order="name.asc",
    )
    branches, _ = await select_rows("branches", select="id,name,code", order="name.asc")

    years: List[int] = []
    rows, _ = await select_rows(
        "papers", select="exam_year", params={"status": "eq.published"}, count=True
    )
    years = sorted({r["exam_year"] for r in rows}, reverse=True)

    return {
        "institutions": institutions,
        "branches": branches,
        "semesters": [1, 2, 3, 4, 5, 6, 7, 8],
        "exam_types": [
            {"value": "regular", "label": "Regular"},
            {"value": "supply", "label": "Supply"},
            {"value": "improvement", "label": "Improvement"},
            {"value": "mid_sem", "label": "Mid-Sem"},
            {"value": "end_sem", "label": "End-Sem"},
            {"value": "preparatory", "label": "Preparatory"},
            {"value": "other", "label": "Other"},
        ],
        "years": years,
    }


@router.get("/{paper_id}")
@limiter.limit(settings.api_rate_limit)
async def get_paper(paper_id: str, request: Request):
    paper = await select_one(
        "papers",
        params={"id": f"eq.{paper_id}", "status": "eq.published"},
        select=PAPER_SELECT,
    )
    if not paper:
        raise NotFoundError("Paper not found")

    related, _ = await select_rows(
        "papers",
        select=PAPER_SELECT,
        params={
            "branch_id": f"eq.{paper['branch_id']}",
            "status": "eq.published",
            "id": f"neq.{paper_id}",
            "or": (
                f"(semester.eq.{paper['semester']},"
                f"subject_id.eq.{paper.get('subject_id') or NIL_UUID})"
            ),
        },
        order="download_count.desc",
        limit=6,
    )
    paper["related"] = related
    return paper


@router.get("/{paper_id}/preview")
@limiter.limit(settings.preview_rate_limit)
async def preview_paper(paper_id: str, request: Request):
    """Stream the processed (watermarked) PDF for in-browser preview."""
    paper = await _authorized_paper(paper_id, request)
    url = await storage_signed_url(
        settings.storage_bucket, paper["processed_path"], expires_in=settings.signed_url_ttl
    )
    resp = await storage_stream(url)
    from fastapi.responses import StreamingResponse

    return StreamingResponse(
        resp.aiter_bytes(),
        media_type="application/pdf",
        headers={"Cache-Control": "private, max-age=60"},
    )


@router.get("/{paper_id}/download")
@limiter.limit(settings.download_rate_limit)
async def download_paper(paper_id: str, request: Request):
    """Record the download and stream the processed (watermarked) PDF."""
    paper = await _authorized_paper(paper_id, request)

    # Atomic counter increment + per-download stats row.
    await rpc("increment_download", {"p_paper_id": paper["id"]})
    ip = request.client.host if request.client else None
    await insert_row(
        "download_stats",
        {
            "paper_id": paper["id"],
            "ip_hash": hash_ip(ip),
            "user_agent": (request.headers.get("user-agent") or "")[:300],
        },
    )

    url = await storage_signed_url(
        settings.storage_bucket, paper["processed_path"], expires_in=settings.signed_url_ttl
    )
    resp = await storage_stream(url)
    from fastapi.responses import StreamingResponse

    return StreamingResponse(
        resp.aiter_bytes(),
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename*=UTF-8''{_download_filename(paper)}",
            "Cache-Control": "private, no-store",
        },
    )


def _download_filename(paper: Dict[str, Any]) -> str:
    from urllib.parse import quote

    inst = (paper.get("institutions") or {}).get("short_name", "paper")
    branch = (paper.get("branches") or {}).get("code", "branch")
    subject = re.sub(r"[^\w\- ]", "", paper.get("subject_name", "paper"))[:60].strip()
    raw = f"BTechBuddy_{inst}_{branch}_Sem{paper.get('semester')}_{subject}_{paper.get('exam_year')}.pdf"
    return quote(raw.replace(" ", "_"))


async def _authorized_paper(paper_id: str, request: Request) -> Dict[str, Any]:
    """Published papers for everyone; draft/archived for admins only."""
    paper = await select_one("papers", params={"id": f"eq.{paper_id}"}, select=PAPER_SELECT)
    if not paper:
        raise NotFoundError("Paper not found")
    if paper["status"] == "published":
        return paper

    auth = request.headers.get("authorization")
    if auth:
        from app.auth import get_admin_record, get_current_user

        try:
            user = await get_current_user(auth)
            admin = await get_admin_record(user.get("sub", ""))
            if admin and not admin.get("revoked_at"):
                return paper
        except Exception:
            pass
    raise NotFoundError("Paper not found")
