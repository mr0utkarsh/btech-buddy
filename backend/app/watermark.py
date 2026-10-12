"""PDF watermarking with PyMuPDF.

Adds a light, diagonal, repeating "Evee bhaiya" watermark to every
page of a question-paper PDF. Works entirely in memory. The text comes from
``settings.watermark_text`` at the call sites (upload/replace), so this module
only handles rendering; the default below matches the configured value.
"""
from __future__ import annotations

import io
import math

import fitz  # PyMuPDF

# Navy-ish tone for the watermark text (RGB 0-1 floats).
_WATERMARK_COLOR = (0.10, 0.16, 0.28)


def add_watermark(
    pdf_bytes: bytes,
    text: str = "Evee bhaiya",
    *,
    opacity: float = 0.12,
    angle: float = 45.0,
    font_size: float = 56.0,
    copies: int = 5,
) -> bytes:
    """Return a new PDF with a light diagonal watermark on every page."""
    if not text.strip():
        raise ValueError("Watermark text must not be empty")

    source = fitz.open(stream=pdf_bytes, filetype="pdf")
    if source.is_encrypted:
        source.close()
        raise ValueError("Cannot watermark an encrypted PDF")

    font = fitz.Font("helv")
    text_width = font.text_length(text, font_size)

    out = fitz.open()
    out.insert_pdf(source)

    for page in out:
        rect = page.rect
        center_x, center_y = rect.width / 2.0, rect.height / 2.0

        # Direction of the diagonal band (page coords: y grows downward).
        theta = math.radians(angle)
        dx, dy = math.cos(theta), math.sin(theta)

        # Spread copies along the diagonal so large pages are covered.
        diagonal = math.hypot(rect.width, rect.height)
        spacing = diagonal / max(copies, 1)

        writer = fitz.TextWriter(page.rect)
        for k in range(copies):
            t = (k - (copies - 1) / 2.0) * spacing
            cx = center_x + dx * t
            cy = center_y + dy * t
            # Baseline start so the text is centred on (cx, cy).
            writer.append(
                fitz.Point(cx - text_width / 2.0, cy + font_size * 0.35),
                text,
                font=font,
                fontsize=font_size,
            )
        # Rotate the whole band around the page centre.
        writer.write_text(
            page,
            opacity=opacity,
            color=_WATERMARK_COLOR,
            morph=(fitz.Point(center_x, center_y), fitz.Matrix(angle)),
        )

    source.close()

    buffer = io.BytesIO()
    out.save(buffer, garbage=3, deflate=True)
    out.close()
    return buffer.getvalue()
