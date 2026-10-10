import io

import fitz
import pytest

from app.pdf_utils import PdfValidationError, validate_pdf


def make_pdf(pages: int = 2) -> bytes:
    doc = fitz.open()
    for _ in range(pages):
        doc.new_page(width=595, height=842)
    buf = io.BytesIO()
    doc.save(buf)
    doc.close()
    return buf.getvalue()


def test_valid_pdf():
    meta = validate_pdf(make_pdf())
    assert meta["pages"] == 2
    assert meta["size_bytes"] > 0


def test_rejects_non_pdf():
    with pytest.raises(PdfValidationError, match="not a valid PDF"):
        validate_pdf(b"this is not a pdf file at all")


def test_rejects_empty():
    with pytest.raises(PdfValidationError):
        validate_pdf(b"")


def test_rejects_too_large(monkeypatch):
    import app.pdf_utils as pu

    monkeypatch.setattr(pu.settings, "max_upload_mb", 0)
    with pytest.raises(PdfValidationError, match="too large"):
        validate_pdf(make_pdf())


def test_rejects_encrypted():
    doc = fitz.open()
    doc.new_page(width=300, height=300)
    buf = io.BytesIO()
    doc.save(buf, encryption=fitz.PDF_ENCRYPT_AES_256, owner_pw="o", user_pw="u")
    doc.close()
    with pytest.raises(PdfValidationError, match="password-protected"):
        validate_pdf(buf.getvalue())
