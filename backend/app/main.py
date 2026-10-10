"""BTech Buddy backend — FastAPI application entry point."""
from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from app.config import settings
from app.database import (
    SupabaseError,
    insert_row,
    select_rows,
    auth_admin_create_user,
)
from app.rate_limit import BadRequestError, ForbiddenError, NotFoundError, limiter
from app.routers import (
    admins,
    admin_papers,
    contact,
    institutions,
    papers,
    public_stats,
    setup,
    stats,
)

logger = logging.getLogger("btechbuddy")


@asynccontextmanager
async def lifespan(app: FastAPI):
    await bootstrap_super_admin()
    yield


async def bootstrap_super_admin() -> None:
    """Create the initial super admin from env vars, once."""
    if not (
        settings.initial_super_admin_email and settings.initial_super_admin_password
    ):
        return
    try:
        rows, _ = await select_rows(
            "admins", select="user_id", params={"role": "eq.super_admin"}
        )
        if rows:
            return
        email = settings.initial_super_admin_email.strip().lower()
        user = await auth_admin_create_user(
            email, settings.initial_super_admin_password
        )
        await insert_row(
            "admins",
            {
                "user_id": user["id"],
                "email": email,
                "role": "super_admin",
                "created_by": user["id"],
            },
        )
        logger.info("Initial super admin created: %s", email)
    except Exception as exc:  # noqa: BLE001
        logger.error("Could not bootstrap super admin: %s", exc)


app = FastAPI(
    title="BTech Buddy API",
    description="Previous-year question papers for engineering students",
    version="1.0.0",
    lifespan=lifespan,
)

app.state.limiter = limiter
app.add_middleware(SlowAPIMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------- errors
@app.exception_handler(NotFoundError)
async def not_found_handler(request: Request, exc: NotFoundError):
    return JSONResponse({"detail": exc.message}, status_code=404)


@app.exception_handler(ForbiddenError)
async def forbidden_handler(request: Request, exc: ForbiddenError):
    return JSONResponse({"detail": exc.message}, status_code=403)


@app.exception_handler(BadRequestError)
async def bad_request_handler(request: Request, exc: BadRequestError):
    return JSONResponse({"detail": exc.message}, status_code=400)


@app.exception_handler(PermissionError)
async def permission_handler(request: Request, exc: PermissionError):
    return JSONResponse({"detail": str(exc)}, status_code=403)


@app.exception_handler(SupabaseError)
async def supabase_handler(request: Request, exc: SupabaseError):
    return JSONResponse({"detail": exc.args[0]}, status_code=exc.status_code)


@app.exception_handler(RateLimitExceeded)
async def rate_limit_handler(request: Request, exc: RateLimitExceeded):
    return JSONResponse(
        {"detail": "Too many requests. Please slow down and try again."},
        status_code=429,
    )


@app.exception_handler(Exception)
async def generic_handler(request: Request, exc: Exception):
    logger.exception("Unhandled error")
    return JSONResponse({"detail": "Internal server error"}, status_code=500)


# ---------------------------------------------------------------- routes
@app.get("/api/health")
async def health():
    healthy = bool(settings.supabase_url and settings.supabase_service_role_key)
    return {
        "status": "ok" if healthy else "misconfigured",
        "service": "btech-buddy-backend",
        "supabase_configured": healthy,
    }


app.include_router(papers.router)
app.include_router(public_stats.router)
app.include_router(admin_papers.router)
app.include_router(institutions.router)
app.include_router(admins.router)
app.include_router(stats.router)
app.include_router(contact.router)
app.include_router(setup.router)
