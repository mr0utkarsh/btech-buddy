from __future__ import annotations

import os
from functools import lru_cache
from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    supabase_url: str = ""
    supabase_service_role_key: str = ""
    supabase_jwt_secret: str = ""

    setup_token: str = ""
    initial_super_admin_email: str = ""
    initial_super_admin_password: str = ""

    cors_origins: str = "http://localhost:5173"
    # Regex matched against the Origin header in addition to the exact
    # list above. Covers Vercel preview deployments (any *.vercel.app
    # subdomain) and local dev servers, so admin uploads keep working
    # from preview URLs without enumerating them.
    cors_origin_regex: str = (
        r"^https://.*\.vercel\.app$"
        r"|^https?://localhost(:\d+)?$"
        r"|^https?://127\.0\.0\.1(:\d+)?$"
    )
    api_rate_limit: str = "60/minute"
    download_rate_limit: str = "20/minute"
    preview_rate_limit: str = "60/minute"
    setup_rate_limit: str = "5/minute"
    contact_rate_limit: str = "3/hour"

    max_upload_mb: int = 50
    max_pdf_pages: int = 300

    watermark_text: str = "Evee bhaiya"
    watermark_opacity: float = 0.12
    watermark_angle: float = 45.0

    signed_url_ttl: int = 60
    storage_bucket: str = "pdfs"

    @property
    def cors_origins_list(self) -> List[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def max_upload_bytes(self) -> int:
        return self.max_upload_mb * 1024 * 1024


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
