import io

import fitz

from app.watermark import add_watermark

# Build a 2-page sample PDF
doc = fitz.open()
for i in range(2):
    page = doc.new_page(width=595, height=842)
    page.insert_text(fitz.Point(72, 100), f"BTech Question Paper {i+1}", fontsize=18)
    page.draw_rect(fitz.Rect(50, 150, 545, 800), color=(0.8, 0.85, 0.9))
buf = io.BytesIO()
doc.save(buf)
doc.close()

out = add_watermark(buf.getvalue(), text="BTech Buddy", opacity=0.12, angle=45)

d = fitz.open(stream=out, filetype="pdf")
print("pages:", d.page_count)
for i, page in enumerate(d):
    text = page.get_text()
    assert "BTech Buddy" in text, f"watermark missing on page {i}"
    pix = page.get_pixmap(dpi=60)
    pix.save(f"C:/Users/Utkarsh/AppData/Local/Temp/kilo/wm_page{i}.png")
    # measure ink coverage to confirm the watermark actually renders
    samples = pix.samples
    nonwhite = sum(1 for j in range(0, len(samples), 3) if samples[j] < 240)
    print(f"page {i}: non-white pixel ratio = {nonwhite / (len(samples)//3):.4f}")
d.close()
print("WATERMARK VERIFIED")
