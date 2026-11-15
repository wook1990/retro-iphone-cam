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

sky_hf = [report["day-sky"][k]["hf"] for k in LOOKS]
print("day-sky hf", list(zip(LOOKS, [round(v, 3) for v in sky_hf])))
if not (sky_hf[0] > sky_hf[3] and sky_hf[3] >= sky_hf[5] * 0.9):
    fail.append("good-light sky should get cleaner toward later models")
if report["day-sky"]["xs"]["hf"] > 1.2:
    fail.append("XS daylight sky should be nearly clean")

rel = [report["dim-jacket"][k]["rel"] for k in LOOKS]
print("dim-jacket rel", list(zip(LOOKS, [round(v, 4) for v in rel])))
if not (rel[0] > rel[3] and rel[0] > rel[4] and rel[0] > rel[5]):
    fail.append(f"5s should out-grain 7/8/XS in the dark (rel={list(zip(LOOKS, [round(v,3) for v in rel]))})")
if not (rel[1] > rel[4] and rel[1] > rel[5]):
    fail.append("SE should be noisier than 8/XS in the dark")
if not (rel[3] > rel[4] * 0.9):
    fail.append(f"7 should be at least as noisy as 8 in the dark ({rel[3]:.3f} vs {rel[4]:.3f})")
for lid in LOOKS:
    ch = report["dim-jacket"][lid]["chroma"]
    if ch > 8:
        fail.append(f"{lid} dim chroma looks like confetti ({ch:.2f})")

(SAMPLES / "analyze.json").write_text(json.dumps(report, indent=2))
if fail:
    for m in fail:
        print("FAIL", m)
    sys.exit(1)
print("noise analysis passed")
