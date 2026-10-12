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
    select_one,
    select_rows,
    auth_admin_create_user,
)
from app.catalog import (
    ALLOWED_BRANCH_CODE,
    ALLOWED_BRANCH_NAME,
    ALLOWED_SPECIALIZATION_NAME,
    ALLOWED_UNIVERSITY_NAME,
    ALLOWED_UNIVERSITY_SHORT_NAME,
)
from app.rate_limit import (
    BadRequestError,
    ForbiddenError,
    NotFoundError,
    PasswordChangeRequiredError,
    limiter,
)
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
    await ensure_catalog()
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


async def ensure_catalog() -> None:
    """Idempotently ensure the allowed catalog exists (SMVDU / CSE / AI & Robotics).

    The application restricts every public read and admin write to this single
    catalog (see ``app.catalog``). If the deployment database does not yet have
    these rows (for example a fresh environment, or a database where the legacy
    Kanpur catalog was removed but the SMVDU row was never re-created), public
    endpoints such as ``/api/institutions`` and ``/api/specializations`` would
    return empty and Browse/upload would break.

    This runs at startup and only ever *adds* the three allowed catalog rows if
    they are missing. It never deletes or modifies unrelated data — destructive
    catalog cleanup is handled by ``supabase/migrations/0006_smvdu_catalog.sql``.

    Failure is non-fatal: logged and swallowed so a transient Supabase error at
    boot does not prevent the service from starting.
    """
    try:
        # 1. University (SMVDU, Katra)
        institution = await select_one(
            "institutions", params={"short_name": f"eq.{ALLOWED_UNIVERSITY_SHORT_NAME}"}
        )
        if not institution:
            institution = await insert_row(
                "institutions",
                {
                    "name": ALLOWED_UNIVERSITY_NAME,
                    "short_name": ALLOWED_UNIVERSITY_SHORT_NAME,
                    "type": "university",
                    "city": "Katra",
                    "state": "Jammu and Kashmir",
                    "website": "https://www.smvdu.ac.in",
                    "established_year": 1999,
                    "verified": True,
                },
            )
            logger.info("Ensured SMVDU institution row exists")

        # 2. Branch (CSE)
        branch = await select_one(
            "branches", params={"code": f"eq.{ALLOWED_BRANCH_CODE}"}
        )
        if not branch:
            branch = await insert_row(
                "branches",
                {"name": ALLOWED_BRANCH_NAME, "code": ALLOWED_BRANCH_CODE},
            )
            logger.info("Ensured CSE branch row exists")

        # 3. Specialization (AI and Robotics) — requires the specializations
        #    table created by migration 0006. Tolerate its absence so startup
        #    still succeeds if that migration has not been applied yet.
        try:
            spec = await select_one(
                "specializations",
                params={"name": f"eq.{ALLOWED_SPECIALIZATION_NAME}"},
            )
            if not spec:
                await insert_row(
                    "specializations",
                    {
                        "name": ALLOWED_SPECIALIZATION_NAME,
                        "code": "AI&ROB",
                        "branch_id": branch.get("id") if branch else None,
                    },
                )
                logger.info("Ensured 'AI and Robotics' specialization row exists")
        except Exception as exc:  # noqa: BLE001
            logger.warning(
                "Could not ensure specialization (migration 0006 may not be applied): %s",
                exc,
            )
    except Exception as exc:  # noqa: BLE001
        logger.error("Could not ensure catalog: %s", exc)


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


@app.exception_handler(PasswordChangeRequiredError)
async def password_change_required_handler(
    request: Request, exc: PasswordChangeRequiredError
):
    # Distinct code so the frontend can route the admin to the change-password
    # screen instead of showing a generic "forbidden" message.
    return JSONResponse(
        {"detail": exc.message, "code": "PASSWORD_CHANGE_REQUIRED"},
        status_code=403,
    )


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
