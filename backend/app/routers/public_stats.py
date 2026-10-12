"""Public (non-sensitive) summary statistics for the student site."""
from __future__ import annotations

from fastapi import APIRouter, Request

from app.catalog import ALLOWED_BRANCH_CODE, ALLOWED_UNIVERSITY_SHORT_NAME
from app.database import select_rows
from app.rate_limit import limiter
from app.config import settings

router = APIRouter(prefix="/api/stats", tags=["public-stats"])


@router.get("/summary")
@limiter.limit(settings.api_rate_limit)
async def summary(request: Request):
    # Customer catalog: count only SMVDU + CSE published papers.
    papers, papers_total = await select_rows(
        "papers",
        select="id,download_count",
        params={"status": "eq.published"},
        count=True,
    )
    institutions, inst_total = await select_rows(
        "institutions",
        select="id,type",
        params={"short_name": f"eq.{ALLOWED_UNIVERSITY_SHORT_NAME}"},
        count=True,
    )
    branches, branch_total = await select_rows(
        "branches",
        select="id",
        params={"code": f"eq.{ALLOWED_BRANCH_CODE}"},
        count=True,
    )

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
