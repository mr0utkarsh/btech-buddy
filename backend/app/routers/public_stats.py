"""Public (non-sensitive) summary statistics for the student site."""
from __future__ import annotations

from fastapi import APIRouter, Request

from app.database import select_rows
from app.rate_limit import limiter
from app.config import settings

router = APIRouter(prefix="/api/stats", tags=["public-stats"])


@router.get("/summary")
@limiter.limit(settings.api_rate_limit)
async def summary(request: Request):
    papers, papers_total = await select_rows(
        "papers", select="id,download_count", params={"status": "eq.published"}
    )
    institutions, inst_total = await select_rows(
        "institutions", select="id"
    )
    branches, branch_total = await select_rows("branches", select="id")

    total_downloads = sum(p.get("download_count") or 0 for p in papers)
    universities = sum(
        1 for i in institutions if i.get("type") == "university"
    )

    return {
        "published_papers": papers_total or 0,
        "total_downloads": total_downloads,
        "institutions": inst_total or 0,
        "universities": universities,
        "colleges_and_institutes": (inst_total or 0) - universities,
        "branches": branch_total or 0,
    }
