#!/usr/bin/env python3
"""Check that noise is fine/organic and low-light ordering holds."""
from pathlib import Path
import json
import sys
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SAMPLES = ROOT / "samples"
SKY = (1890, 0, 420, 410)
SHADOW = (690, 1790, 420, 420)
LOOKS = ["5s", "se", "6s", "7", "8", "xs"]

def load(name):
    return np.asarray(Image.open(SAMPLES / name).convert("RGB"), dtype=np.float32)

def region(im, box):
    x, y, w, h = box
    sx, sy = im.shape[1] / 4032, im.shape[0] / 3024
    x, y, w, h = int(round(x * sx)), int(round(y * sy)), int(round(w * sx)), int(round(h * sy))
    return im[y:y+h, x:x+w]

def luma(a):
    return 0.2126 * a[:,:,0] + 0.7152 * a[:,:,1] + 0.0722 * a[:,:,2]

def residual(a):
    y = luma(a)
    p = np.pad(y, 1, mode="edge")
    k = np.array([[1, 2, 1], [2, 4, 2], [1, 2, 1]], dtype=np.float32)
    k /= k.sum()
    blur = (
        k[0,0]*p[0:-2,0:-2] + k[0,1]*p[0:-2,1:-1] + k[0,2]*p[0:-2,2:] +
        k[1,0]*p[1:-1,0:-2] + k[1,1]*p[1:-1,1:-1] + k[1,2]*p[1:-1,2:] +
        k[2,0]*p[2:,0:-2] + k[2,1]*p[2:,1:-1] + k[2,2]*p[2:,2:]
    )
    return y - blur, float(y.mean())

def residual_std(a):
    r, m = residual(a)
    return float(r.std()), m, float(r.std() / (m + 1e-3))

def chroma_std(a):
    small = np.array(Image.fromarray(np.clip(a, 0, 255).astype(np.uint8)).resize(
        (max(8, a.shape[1]//4), max(8, a.shape[0]//4)), Image.Resampling.BOX
    ), dtype=np.float32)
    cr = small[:,:,0] - small[:,:,1]
    cb = small[:,:,2] - small[:,:,1]
    return float(np.sqrt(cr.std()**2 + cb.std()**2))

def blockiness(a):
    y = luma(a)
    d = np.abs(np.diff(y, axis=1))
    return float(d[:, 7::8].mean() / (d[:, 3::8].mean() + 1e-6))

def residual_period(a):
    r, _ = residual(a)
    row = r[r.shape[0]//2]
    row = row - row.mean()
    denom = float(np.dot(row, row) + 1e-6)
    def lag(k):
        return abs(float(np.dot(row[:-k], row[k:]) / denom))
    return max(lag(8), lag(16), lag(24))

def sky_flat(im):
    c = region(im, SKY)
    return c[:min(140, c.shape[0]), 40:min(c.shape[1], 360)]

def jacket(im):
    c = region(im, SHADOW)
    return c[20:140, 80:280]

fail = []
report = {}
for kind, prefix, getter in (
    ("day-sky", "", sky_flat),
    ("dim-jacket", "lowlight-", jacket),
    ("dim-sky", "lowlight-", sky_flat),
):
    report[kind] = {}
    for lid in LOOKS:
        name = f"{prefix}{lid}.jpg" if prefix else f"{lid}.jpg"
        crop = getter(load(name))
        hf, mean, rel = residual_std(crop)
        rec = {"hf": hf, "mean": mean, "rel": rel, "chroma": chroma_std(crop), "block": blockiness(crop), "period": residual_period(crop)}
        report[kind][lid] = rec
        print(f"{kind} {lid}: hf={hf:.3f} mean={mean:.1f} rel={rel:.4f} chroma={rec['chroma']:.2f} block={rec['block']:.3f} period={rec['period']:.3f}")
        if rec["block"] > 1.35:
            fail.append(f"{kind} {lid} JPEG-blocky ({rec['block']:.3f})")
        if rec["period"] > 0.4:
            fail.append(f"{kind} {lid} repeating residual ({rec['period']:.3f})")

def sign_bar(im):
    c = region(im, SKY)
    y0 = int(round(240 * c.shape[0] / 410))
    y1 = int(round(310 * c.shape[0] / 410))
    return c[y0:y1]

def edge_width(im):
    """10–90% luma rise of the sign bar, in 4032-space pixels."""
    a = sign_bar(im)
    y = luma(a)
    prof = y.mean(axis=1)
    k = np.array([1, 2, 3, 2, 1], dtype=np.float32)
    k /= k.sum()
    p = np.convolve(prof, k, mode="same")
    i = int(np.argmin(np.diff(p)))
    span = slice(max(0, i - 20), min(len(p), i + 25))
    lo, hi = float(p[span].min()), float(p[span].max())
    t10, t90 = lo + 0.1 * (hi - lo), lo + 0.9 * (hi - lo)
    xs = []
    for j in range(max(0, i - 20), min(len(p) - 1, i + 24)):
        a0, a1 = p[j], p[j + 1]
        for t in (t10, t90):
            if (a0 - t) * (a1 - t) <= 0 and a1 != a0:
                xs.append(j + (t - a0) / (a1 - a0))
    raw = abs(xs[-1] - xs[0]) if len(xs) >= 2 else float("nan")
    return raw * (4032 / im.shape[1])

report["day-sign"] = {}
for lid in LOOKS:
    im = load(f"{lid}.jpg")
    w = edge_width(im)
    report["day-sign"][lid] = {"width": float(w)}
    print(f"day-sign {lid}: edge-width={w:.2f}px")
if report["day-sign"]["5s"]["width"] < report["day-sign"]["8"]["width"] * 1.05:
    fail.append("5s should be softer than 8 on a high-contrast edge")

if report["day-sky"]["xs"]["hf"] > 1.2:
    fail.append("XS daylight sky should be nearly clean")

# Low light: early no-OIS phones grainier than 7/8; XS cleanest. Use dim sky
# (similar mean across models) so a crushed-black patch cannot invert the score.
hf = [report["dim-sky"][k]["hf"] for k in LOOKS]
print("dim-sky hf", list(zip(LOOKS, [round(v, 3) for v in hf])))
early = min(hf[0], hf[1], hf[2])
late = max(hf[3], hf[4])
if not (early > late * 0.9):
    fail.append(f"5s/SE/6s should be noisier than 7/8 in the dark (hf={list(zip(LOOKS, [round(v,3) for v in hf]))})")
if not (hf[5] < hf[3] and hf[5] < hf[4] and hf[5] < hf[0]):
    fail.append("XS should be the cleanest in the dark")

mean6 = report["dim-jacket"]["6s"]["mean"]
mean_se = report["dim-jacket"]["se"]["mean"]
if mean6 < 12:
    fail.append(f"6s dim jacket is crushed (mean={mean6:.1f})")
if mean6 < mean_se * 0.55:
    fail.append(f"6s dim jacket is much darker than SE ({mean6:.1f} vs {mean_se:.1f})")

# Chroma confetti on the jacket, but ignore a little CA on high-contrast edges
# by looking at a tighter interior after a 4x box (existing chroma_std).
for lid in LOOKS:
    ch = report["dim-jacket"][lid]["chroma"]
    if ch > 15:
        fail.append(f"{lid} dim chroma looks like confetti ({ch:.2f})")

def _f(o):
    if isinstance(o, dict): return {k: _f(v) for k,v in o.items()}
    if isinstance(o, (list, tuple)): return [_f(v) for v in o]
    if hasattr(o, 'item'): return o.item()
    return o
(SAMPLES / "analyze.json").write_text(json.dumps(_f(report), indent=2))
if fail:
    for m in fail:
        print("FAIL", m)
    sys.exit(1)
print("noise analysis passed")
