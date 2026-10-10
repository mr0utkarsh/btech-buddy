"""PDF validation helpers."""
from __future__ import annotations

import fitz  # PyMuPDF

from app.config import settings

PDF_MAGIC = b"%PDF-"


class PdfValidationError(ValueError):
    pass


def validate_pdf(content: bytes) -> dict:
    """Validate an uploaded PDF. Returns metadata (pages, size).

    Raises PdfValidationError with a user-friendly message.
    """
    max_bytes = settings.max_upload_bytes

    if not content:
        raise PdfValidationError("No file was provided")

    if len(content) < 5 or not content.startswith(PDF_MAGIC):
        raise PdfValidationError("The file is not a valid PDF")

    if len(content) > max_bytes:
        raise PdfValidationError(
            f"File is too large. Maximum allowed size is {settings.max_upload_mb} MB"
        )

    try:
        doc = fitz.open(stream=content, filetype="pdf")
    except Exception:
        raise PdfValidationError("The file is corrupted and could not be opened")

    try:
        if doc.is_encrypted:
            raise PdfValidationError(
                "The PDF is password-protected. Please upload an unprotected file"
            )
        pages = doc.page_count
        if pages < 1:
            raise PdfValidationError("The PDF contains no pages")
        if pages > settings.max_pdf_pages:
            raise PdfValidationError(
                f"The PDF has too many pages ({pages}). Maximum is {settings.max_pdf_pages}"
            )
        # Extract text from the first page as a sanity check that the
        # file parses correctly.
        try:
            doc[0].get_text()
        except Exception:
            raise PdfValidationError("The PDF could not be parsed")
    finally:
        doc.close()

    return {"pages": pages, "size_bytes": len(content)}
