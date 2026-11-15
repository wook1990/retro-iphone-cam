#!/usr/bin/env python3
from pathlib import Path
from PIL import Image, ImageDraw

def chart(w, h):
    img = Image.new("RGB", (w, h), (235, 235, 230))
    d = ImageDraw.Draw(img)
    step = 160 if w >= 2000 else 80
    cx, cy = w / 2, h / 2
    x = cx
    while x <= w - 1:
        d.line([(x, 0), (x, h - 1)], fill=(20, 20, 20), width=3)
        x += step
    x = cx - step
    while x >= 0:
        d.line([(x, 0), (x, h - 1)], fill=(20, 20, 20), width=3)
        x -= step
    y = cy
    while y <= h - 1:
        d.line([(0, y), (w - 1, y)], fill=(20, 20, 20), width=3)
        y += step
    y = cy - step
    while y >= 0:
        d.line([(0, y), (w - 1, y)], fill=(20, 20, 20), width=3)
        y -= step
    d.line([(0, 0), (w - 1, h - 1)], fill=(180, 40, 40), width=3)
    d.line([(0, h - 1), (w - 1, 0)], fill=(180, 40, 40), width=3)
    s = int(0.4 * min(w, h))
    d.rectangle([cx - s / 2, cy - s / 2, cx + s / 2, cy - s / 2 + s], outline=(20, 80, 180), width=5)
    for r in (0.15, 0.3, 0.45):
        rr = r * min(w, h)
        d.ellipse([cx - rr, cy - rr, cx + rr, cy + rr], outline=(20, 120, 70), width=3)
    m = 40
    for x0, y0, dx, dy in [(0, 0, 1, 1), (w - 1, 0, -1, 1), (0, h - 1, 1, -1), (w - 1, h - 1, -1, -1)]:
        d.line([(x0, y0), (x0 + dx * 180, y0)], fill=(200, 80, 0), width=6)
        d.line([(x0, y0), (x0, y0 + dy * 180)], fill=(200, 80, 0), width=6)
    bar_w, bar_h = (800, 40) if w >= 2000 else (400, 24)
    d.rectangle([cx - bar_w / 2, h * 0.18 - bar_h / 2, cx + bar_w / 2, h * 0.18 + bar_h / 2], fill=(10, 10, 10))
    d.text((cx - 40, h * 0.18 - bar_h / 2 - 22), f"{bar_w}px bar", fill=(10, 10, 10))
    d.text((20, 20), f"{w}x{h} grid  step={step}px", fill=(80, 0, 0))
    return img

here = Path(__file__).resolve().parent
chart(4032, 3024).save(here / "grid-4032.jpg", quality=98, subsampling=0)
chart(1920, 1440).save(here / "grid-1920.jpg", quality=98, subsampling=0)
print("wrote", here / "grid-4032.jpg", here / "grid-1920.jpg")
