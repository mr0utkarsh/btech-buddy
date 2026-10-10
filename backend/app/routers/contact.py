"""Public contact form endpoint."""
from __future__ import annotations

import re
from typing import Optional

from fastapi import APIRouter, Request
from pydantic import BaseModel, EmailStr, Field

from app.config import settings
from app.audit import log_activity
from app.database import hash_ip, insert_row
from app.rate_limit import limiter

router = APIRouter(prefix="/api", tags=["contact"])


class ContactPayload(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    email: EmailStr
    subject: Optional[str] = Field(default=None, max_length=150)
    message: str = Field(min_length=10, max_length=5000)
    honeypot: Optional[str] = ""


@router.post("/contact")
@limiter.limit(settings.contact_rate_limit)
async def contact(request: Request, payload: ContactPayload):
    # Honeypot: bots fill hidden fields; real users don't.
    if payload.honeypot:
        return {"message": "Thank you! We will get back to you soon."}

    if payload.subject and not (3 <= len(payload.subject.strip()) <= 150):
        payload = payload.model_copy(
            update={"subject": payload.subject.strip()[:150]}
        )

    await insert_row(
        "contact_messages",
        {
            "name": payload.name.strip(),
            "email": payload.email.strip().lower(),
            "subject": payload.subject.strip() if payload.subject else None,
            "message": payload.message.strip(),
        },
    )
    return {"message": "Thank you! We will get back to you soon."}
