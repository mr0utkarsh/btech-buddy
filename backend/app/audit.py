"""Admin activity audit logging."""
from __future__ import annotations

import uuid
from typing import Any, Dict, Optional

from app.database import insert_row


async def log_activity(
    *,
    actor_id: Optional[str],
    actor_email: Optional[str],
    action: str,
    entity_type: Optional[str] = None,
    entity_id: Optional[str] = None,
    details: Optional[Dict[str, Any]] = None,
    ip_hash: Optional[str] = None,
) -> None:
    """Best-effort audit log. Never raises into the request path."""
    try:
        await insert_row(
            "activity_logs",
            {
                "actor_id": actor_id,
                "actor_email": actor_email,
                "action": action,
                "entity_type": entity_type,
                "entity_id": entity_id,
                "details": details or {},
                "ip_hash": ip_hash,
            },
        )
    except Exception:
        pass


def new_uuid() -> str:
    return str(uuid.uuid4())
