import io

import fitz
import pytest

from app.watermark import add_watermark


def make_pdf(pages: int = 3, title: str = "Sample Paper") -> bytes:
    doc = fitz.open()
    for i in range(pages):
        page = doc.new_page(width=595, height=842)
        page.insert_text(
            fitz.Point(72, 100), f"{title} - Page {i + 1}", fontsize=16
        )
    buf = io.BytesIO()
    doc.save(buf)
    doc.close()
    return buf.getvalue()


def test_watermark_preserves_pages_and_text():
    pdf = make_pdf(pages=3)
    out = add_watermark(pdf)
    assert out
    doc = fitz.open(stream=out, filetype="pdf")
    assert doc.page_count == 3
    # Original content preserved.
    assert "Sample Paper - Page 1" in doc[0].get_text()
    doc.close()


def test_watermark_text_present_on_every_page():
    pdf = make_pdf(pages=4)
    out = add_watermark(pdf, text="BTech Buddy")
    doc = fitz.open(stream=out, filetype="pdf")
    for page in doc:
        assert "BTech Buddy" in page.get_text()
    doc.close()


def test_watermark_single_page_pdf():
    pdf = make_pdf(pages=1)
    out = add_watermark(pdf)
    doc = fitz.open(stream=out, filetype="pdf")
    assert doc.page_count == 1
    assert "BTech Buddy" in doc[0].get_text()
    doc.close()


def test_watermark_rejects_empty_text():
    with pytest.raises(ValueError):
        add_watermark(make_pdf(), text="  ")


def test_watermark_rejects_encrypted_pdf():
    doc = fitz.open()
    doc.new_page(width=300, height=300)
    buf = io.BytesIO()
    doc.save(buf, encryption=fitz.PDF_ENCRYPT_AES_256, owner_pw="o", user_pw="u")
    doc.close()
    with pytest.raises(ValueError, match="encrypted"):
        add_watermark(buf.getvalue())


def test_watermark_output_is_valid_pdf_with_content():
    out = add_watermark(make_pdf())
    # Re-open and render page 0 to ensure the file is drawable.
    doc = fitz.open(stream=out, filetype="pdf")
    pix = doc[0].get_pixmap(dpi=20)
    assert pix.width > 0
    doc.close()
