#!/usr/bin/env python3
"""Straight-line and scale checks for the lens/crop pipeline."""
from pathlib import Path
import json
import sys
import numpy as np
from PIL import Image

OUT = Path(sys.argv[1] if len(sys.argv) > 1 else "/tmp/grid-out")

def luma(a):
    return 0.2126 * a[:, :, 0] + 0.7152 * a[:, :, 1] + 0.0722 * a[:, :, 2]

def crop_params(src_w, src_h, out_w, out_h):
    sa, oa = src_w / src_h, out_w / out_h
    if sa > oa:
        cw, ch = oa / sa, 1.0
    else:
        cw, ch = 1.0, sa / oa
    return (1 - cw) / 2 * src_w, (1 - ch) / 2 * src_h, cw * src_w, ch * src_h

def map_x(x, cp, out_w):
    x0, _, cw, _ = cp
    return (x - x0) / cw * out_w

def map_y(y, cp, out_h):
    _, y0, _, ch = cp
    return (y - y0) / ch * out_h

def subpixel_peak(row):
    i = int(np.argmax(row))
    if 0 < i < len(row) - 1:
        a, b, c = float(row[i - 1]), float(row[i]), float(row[i + 1])
        den = a - 2 * b + c
        if abs(den) > 1e-3:
            return i + 0.5 * (a - c) / den
    return float(i)

def residuals_vert(inv, x_exp, half=8):
    H, W = inv.shape
    if x_exp < 20 or x_exp > W - 20:
        return None
    xs, ys = [], []
    for yi in range(20, H - 20):
        x0 = int(round(x_exp)) - half
        x1 = x0 + 2 * half + 1
        if x0 < 0 or x1 > W:
            continue
        row = inv[yi, x0:x1]
        if row.max() < 30:
            continue
        xs.append(x0 + subpixel_peak(row))
        ys.append(yi)
    if len(xs) < H * 0.5:
        return None
    xs, ys = np.array(xs), np.array(ys)
    resid = xs - np.polyval(np.polyfit(ys, xs, 1), ys)
    return float(np.percentile(np.abs(resid), 95))

def residuals_horiz(inv, y_exp, half=8):
    H, W = inv.shape
    if y_exp < 20 or y_exp > H - 20:
        return None
    xs, ys = [], []
    for xi in range(20, W - 20):
        y0 = int(round(y_exp)) - half
        y1 = y0 + 2 * half + 1
        if y0 < 0 or y1 > H:
            continue
        col = inv[y0:y1, xi]
        if col.max() < 30:
            continue
        ys.append(y0 + subpixel_peak(col))
        xs.append(xi)
    if len(ys) < W * 0.5:
        return None
    xs, ys = np.array(xs), np.array(ys)
    resid = ys - np.polyval(np.polyfit(xs, ys, 1), xs)
    return float(np.percentile(np.abs(resid), 95))

def bar_frac(im, y_frac):
    y = luma(im)
    H, W = y.shape
    yi = int(round(y_frac * H))
    band = y[max(0, yi - 4):yi + 5].mean(axis=0)
    paper = np.percentile(band, 70)
    xs = np.where(band < paper * 0.55)[0]
    if len(xs) < 10:
        return None
    segs, start, prev = [], xs[0], xs[0]
    for x in xs[1:]:
        if x == prev + 1:
            prev = x
        else:
            segs.append((start, prev))
            start = prev = x
    segs.append((start, prev))
    a, b = max(segs, key=lambda t: t[1] - t[0])
    return (b - a + 1) / W

def evaluate(path, src_w, src_h, step, bar_w, bar_y_frac):
    im = np.asarray(Image.open(path).convert("RGB"), dtype=np.float32)
    H, W = im.shape[:2]
    inv = 255 - luma(im)
    cp = crop_params(src_w, src_h, W, H)
    cx, cy = src_w / 2, src_h / 2
    xs, x = [], cx
    while x < src_w:
        xs.append(x); x += step
    x = cx - step
    while x >= 0:
        xs.append(x); x -= step
    ys, y = [], cy
    while y < src_h:
        ys.append(y); y += step
    y = cy - step
    while y >= 0:
        ys.append(y); y -= step
    vp = [r for x in xs if (r := residuals_vert(inv, map_x(x, cp, W))) is not None]
    hp = [r for y in ys if (r := residuals_horiz(inv, map_y(y, cp, H))) is not None]
    x0, y0, cw, ch = cp
    exp_frac = bar_w / cw
    meas = bar_frac(im, map_y(bar_y_frac * src_h, cp, H) / H)
    v_p95 = float(np.median(vp)) if vp else None
    h_p95 = float(np.median(hp)) if hp else None
    lim = max(1.25, 0.0008 * max(W, H))
    scale = meas / exp_frac if meas else None
    straight = v_p95 is not None and h_p95 is not None and v_p95 <= lim and h_p95 <= lim
    scale_ok = scale is not None and abs(scale - 1) <= 0.025
    return {
        "file": path.name, "w": W, "h": H,
        "v_p95": v_p95, "h_p95": h_p95, "lim": lim,
        "scale": scale,
        "straight": bool(straight),
        "scale_ok": bool(scale_ok),
        "ok": bool(straight and scale_ok),
    }

fail = []
report = []
print(f"{'file':40} {'Vp95':>7} {'Hp95':>7} {'lim':>6} {'scale':>7} result")
for name, src in (
    *[(p.name, (4032, 3024, 160, 800, 0.18)) for p in sorted(OUT.glob("still-*.jpg"))],
    *[(p.name, (1280, 960, 80 * 1280 / 1920, 400 * 1280 / 1920, 0.18)) for p in sorted(OUT.glob("preview-*.jpg"))],
):
    rec = evaluate(OUT / name, *src)
    report.append(rec)
    if not rec["ok"]:
        fail.append(name)
    print(f"{name:40} {rec['v_p95']:7.3f} {rec['h_p95']:7.3f} {rec['lim']:6.2f} {rec['scale']:7.4f} {'OK' if rec['ok'] else 'FAIL'}")

def _json(o):
    if isinstance(o, dict):
        return {k: _json(v) for k, v in o.items()}
    if isinstance(o, (list, tuple)):
        return [_json(v) for v in o]
    if isinstance(o, (bool, int, float, str)) or o is None:
        return bool(o) if isinstance(o, bool) else (o.item() if hasattr(o, "item") else o)
    if hasattr(o, "item"):
        return o.item()
    return o
(OUT / "grid-check.json").write_text(json.dumps(_json(report), indent=2))
if fail:
    for m in fail:
        print("FAIL", m)
    sys.exit(1)
print("grid straightness and scale passed")
