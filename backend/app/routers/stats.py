"""Dashboard statistics and activity logs (admin only)."""
from __future__ import annotations

import re
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, Header, Query, Request

from app.auth import require_admin
from app.database import select_one, select_rows
from app.rate_limit import limiter

router = APIRouter(prefix="/api/admin", tags=["stats"])


async def admin_ctx(authorization: Optional[str] = Header(default=None)):
    return await require_admin(authorization)


@router.get("/stats")
@limiter.limit("30/minute")
async def get_stats(
    request: Request, ctx: Dict[str, Any] = Depends(admin_ctx)
):
    papers, papers_total = await select_rows(
        "papers", select="*", count=True
    )
    published = [p for p in papers if p["status"] == "published"]
    total_downloads = sum(p.get("download_count") or 0 for p in papers)

    institutions, inst_total = await select_rows(
        "institutions", select="*", count=True
    )
    universities = [i for i in institutions if i["type"] == "university"]

    branches, branch_total = await select_rows(
        "branches", select="*", count=True
    )
    subjects, subject_total = await select_rows(
        "subjects", select="*", count=True
    )
    admins, admin_total = await select_rows(
        "admins", select="*", count=True
    )
    active_admins = [a for a in admins if not a.get("revoked_at")]

    # Downloads over the last 7 days (server-side aggregation on small data).
    since = datetime.now(timezone.utc) - timedelta(days=7)
    stats_rows, _ = await select_rows(
        "download_stats",
        select="downloaded_at",
        params={"downloaded_at": f"gte.{since.isoformat()}"},
    )
    days: List[Dict[str, Any]] = []
    for i in range(6, -1, -1):
        day = (datetime.now(timezone.utc) - timedelta(days=i)).date()
        count = sum(
            1
            for r in stats_rows
            if str(r["downloaded_at"])[:10] == day.isoformat()
        )
        days.append({"date": day.isoformat(), "downloads": count})
    downloads_last_7_days = sum(d["downloads"] for d in days)

    recent_uploads = sorted(
        papers, key=lambda p: p.get("created_at") or "", reverse=True
    )[:5]
    top_papers = sorted(
        papers, key=lambda p: p.get("download_count") or 0, reverse=True
    )[:5]

    return {
        "overview": {
            "total_papers": papers_total or 0,
            "published_papers": len(published),
            "draft_papers": sum(1 for p in papers if p["status"] == "draft"),
            "total_downloads": total_downloads,
            "downloads_last_7_days": downloads_last_7_days,
        },
        "catalog": {
            "institutions": inst_total or 0,
            "universities": len(universities),
            "colleges_and_institutes": (inst_total or 0) - len(universities),
            "branches": branch_total or 0,
            "subjects": subject_total or 0,
            "admins": admin_total or 0,
            "active_admins": len(active_admins),
        },
        "downloads_by_day": days,
        "recent_uploads": recent_uploads,
        "top_papers": top_papers,
    }


@router.get("/activity-logs")
@limiter.limit("30/minute")
async def get_activity_logs(
    request: Request,
    ctx: Dict[str, Any] = Depends(admin_ctx),
    action: str = Query(""),
    actor: str = Query(""),
    page: int = Query(1, ge=1),
    limit: int = Query(25, ge=1, le=100),
):
    params: Dict[str, str] = {}
    if action:
        params["action"] = f"eq.{re.sub(r"[*%'\\,()]+", '', action)[:40]}"
    if actor:
        safe = re.sub(r"[*%'\\,()]+", "", actor)[:60]
        params["actor_email"] = f"ilike.*{safe}*"
    rows, total = await select_rows(
        "activity_logs",
        select="*",
        params=params,
        order="created_at.desc",
        limit=limit,
        offset=(page - 1) * limit,
        count=True,
    )
    return {"data": rows, "total": total or 0, "page": page, "limit": limit}


@router.get("/contact-messages")
async def get_contact_messages(
    ctx: Dict[str, Any] = Depends(admin_ctx),
    unread_only: bool = Query(False),
    page: int = Query(1, ge=1),
    limit: int = Query(25, ge=1, le=100),
):
    params: Dict[str, str] = {}
    if unread_only:
        params["read"] = "eq.false"
    rows, total = await select_rows(
        "contact_messages",
        select="*",
        params=params,
        order="created_at.desc",
        limit=limit,
        offset=(page - 1) * limit,
        count=True,
    )
    return {"data": rows, "total": total or 0, "page": page, "limit": limit}


@router.post("/contact-messages/{message_id}/read")
async def mark_contact_message_read(
    message_id: str, ctx: Dict[str, Any] = Depends(admin_ctx)
):
    from app.database import update_row

    updated = await update_row(
        "contact_messages", params={"id": f"eq.{message_id}"}, patch={"read": True}
    )
    return {"message": "Marked as read", "record": updated}
