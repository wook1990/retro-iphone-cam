#!/usr/bin/env python3
"""Build per-model luma curves + chroma grades from same-scene JPEGs.

Histogram-match 13 → era luma on aligned central regions (robust to
residual misalignment). Lean the measured curve slightly toward the
remembered signature. Keep y(0)=0 and y(1)=1 so blacks stay true.
Apply the curve to the 3D LUT while keeping fitted chroma, then a
modest chroma/WB grade so sat and warmth match the real JPEGs.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent))
from fit import (  # noqa: E402
    MODELS, N, OUT, APP_LUT, ROOT,
    identity_lut, luma, load_rgb, load_scenes, path_g, align_to,
    apply_lut, atlas_from_luts, repair_lut_tone,
)

# Memory leans added to the histogram-matched curve at these knots,
# then interpolated and re-monotonized. Values are output deltas in sRGB Y.
# Endpoints stay 0 and 1 (no milky black, no washed white).
KNOTS = np.array([0.0, 0.05, 0.10, 0.25, 0.50, 0.75, 0.90, 0.95, 1.0])
LEANS = {
    # 5s: hard-clip highlights, keep dark shadows (chart-only hist match
    # had a false shadow lift from white paper).
    "5s":  np.array([0, 0.00, 0.00, -0.02, 0.00, 0.03, 0.05, 0.04, 0]),
    # SE: a touch brighter/cleaner than 6s, less punch.
    "se":  np.array([0, 0.005, 0.01, 0.01, 0.01, 0.00, 0.00, 0.00, 0]),
    # 6s: deeper shadows, punchy mids (measured mid-slope was already ~0.97).
    "6s":  np.array([0, -0.01, -0.02, -0.03, 0.01, 0.03, 0.02, 0.01, 0]),
    # 7: cooler/brighter memory; measured mids were slightly dark.
    "7":   np.array([0, 0.01, 0.02, 0.02, 0.03, 0.01, 0.00, 0.00, 0]),
    # 8: punchy, deep blacks (real p1 was 0.016, widest mid-span).
    "8":   np.array([0, -0.015, -0.02, -0.03, 0.00, 0.03, 0.03, 0.02, 0]),
    # XS: Smart HDR — slightly lifted upper-shadows, compressed highlights
    # (measured 0.90→0.86, 0.95→0.92). True black stays 0.
    "xs":  np.array([0, 0.02, 0.03, 0.02, 0.00, -0.03, -0.04, -0.03, 0]),
}

# Chroma/WB grade after the luma curve. sat is a multiplier on (rgb-luma).
# da/db are OpenCV Lab offsets vs the ungraded LUT, aimed at the real
# JPEG's Lab and then leaned slightly toward memory (5s yellow, SE cooler
# than 6s, 6s very warm, 7 neutral, 8 yellow, XS orange skin).
GRADE = {
    "5s":  dict(sat=1.10, da=-0.4, db=3.5),
    "se":  dict(sat=1.08, da=-0.8, db=2.2),
    "6s":  dict(sat=1.18, da=0.2,  db=4.2),
    "7":   dict(sat=1.06, da=0.2,  db=0.4),
    "8":   dict(sat=1.14, da=0.7,  db=3.0),
    "xs":  dict(sat=1.10, da=1.1,  db=2.4),
}


def hist_match_curve(src_y, dst_y, mask, n=256):
    s = np.clip(src_y[mask], 0, 1)
    d = np.clip(dst_y[mask], 0, 1)
    bins = np.linspace(0, 1, n + 1)
    hs, _ = np.histogram(s, bins=bins, density=True)
    hd, _ = np.histogram(d, bins=bins, density=True)
    cs = np.cumsum(hs); cs = cs / max(cs[-1], 1e-12)
    cd = np.cumsum(hd); cd = cd / max(cd[-1], 1e-12)
    x = (bins[:-1] + bins[1:]) * 0.5
    return x, np.interp(cs, cd, x)


def finish_curve(x, y):
    # Light smooth, monotonic, endpoints pinned to 0 and 1.
    k = np.array([1, 2, 3, 2, 1], dtype=np.float64)
    k /= k.sum()
    y = np.convolve(np.pad(y, 2, mode="edge"), k, mode="valid")
    for i in range(1, len(y)):
        y[i] = max(y[i], y[i - 1] + 1e-4)
    y = y - y[0]
    if y[-1] > 1e-6:
        y = y / y[-1]
    y[0] = 0.0
    y[-1] = 1.0
    return np.clip(y, 0, 1)


def measured_curves():
    """Histogram-match 13→model on aligned central overlap."""
    scenes = load_scenes()
    out = {}
    for m in MODELS:
        acc = None
        wsum = 0.0
        for scene, w in (("still_day", 1.0), ("chart", 0.25), ("still_low", 0.20)):
            if m not in scenes[scene] or "13" not in scenes[scene]:
                continue
            # 5s has no still_day/low vs 13; chart-only hist match is
            # dominated by white paper, so skip and use 6s as the base.
            if m == "5s" and scene != "chart":
                continue
            if m == "5s":
                continue
            real = load_rgb(path_g(scenes[scene][m]))
            src = load_rgb(path_g(scenes[scene]["13"]))
            sw, mask, _ = align_to(src, real)
            H, W = mask.shape
            yy, xx = np.mgrid[0:H, 0:W]
            mid = (np.abs(yy - H / 2) < 0.4 * H) & (np.abs(xx - W / 2) < 0.4 * W)
            mask = mask & mid
            if mask.sum() < 20000:
                continue
            x, curve = hist_match_curve(luma(sw), luma(real), mask)
            if acc is None:
                acc = np.zeros_like(curve)
            acc += w * curve
            wsum += w
        if m == "5s":
            # 5s gets the 6s measured curve as a same-era starting point
            # (no paired 13 still-life). Color/clip leans are applied later.
            out["5s"] = None
            continue
        out[m] = finish_curve(x, acc / wsum)
        out["_x"] = x
    # fill 5s from 6s
    out["5s"] = out["6s"].copy()
    return out


def apply_lean(x, base, lean):
    delta = np.interp(x, KNOTS, lean)
    return finish_curve(x, base + delta)


def grade_lut(lut, ident, sat, da, db):
    import cv2
    work = lut.reshape(-1, 3).astype(np.float32)
    y = luma(work)[:, None]
    work = np.clip(y + (work - y) * sat, 0, 1)
    if da or db:
        u8 = np.clip(work.reshape(-1, 1, 3) * 255 + 0.5, 0, 255).astype(np.uint8)
        lab = cv2.cvtColor(u8, cv2.COLOR_RGB2LAB).astype(np.float32)
        lab[..., 1] = np.clip(lab[..., 1] + da, 0, 255)
        lab[..., 2] = np.clip(lab[..., 2] + db, 0, 255)
        rgb = cv2.cvtColor(lab.astype(np.uint8), cv2.COLOR_LAB2RGB).astype(np.float32) / 255.0
        rgb = rgb.reshape(-1, 3)
        # restore luma so the 1D curve is not undone by the Lab round-trip
        yy = luma(rgb)[:, None]
        work = np.clip(rgb * (y / np.maximum(yy, 1e-4)), 0, 1)
    out = work.reshape(lut.shape)
    out[0, 0, 0] = 0
    out[N - 1, N - 1, N - 1] = 1
    return np.clip(out, 0, 1)


def main():
    ident = identity_lut()
    src = np.load(OUT / "luts.npz")
    print("measuring histogram-matched tone curves…")
    measured = measured_curves()
    x = measured["_x"]
    curves = {}
    for m in MODELS:
        curves[m] = apply_lean(x, measured[m], LEANS[m])
        pts = [0, 0.05, 0.1, 0.25, 0.5, 0.75, 0.9, 0.95, 1]
        vals = np.interp(pts, x, curves[m])
        print(f"  {m:3} " + " ".join(f"{p:.2f}->{v:.3f}" for p, v in zip(pts, vals)),
              f"  mid={(vals[5]-vals[3])/0.5:.3f}")

    luts = {}
    for m in MODELS:
        base = src[m].astype(np.float64)
        toned = repair_lut_tone(base, ident, curve=curves[m])
        g = GRADE[m]
        luts[m] = grade_lut(toned, ident, g["sat"], g["da"], g["db"]).astype(np.float32)
        # gray ramp check
        diag = np.array([luts[m][i, i, i] for i in range(N)])
        print(f"    LUT gray", " ".join(f"{luma(diag)[i]:.3f}" for i in range(0, N, 2)))

    np.savez_compressed(OUT / "luts.npz", **luts)
    atlas = atlas_from_luts(luts)
    Image.fromarray(atlas, "RGB").save(OUT / "lut.png", optimize=True)
    Image.fromarray(atlas, "RGB").save(APP_LUT, optimize=True)
    payload = {
        "x": x.tolist(),
        "measured": {m: measured[m].tolist() for m in MODELS},
        "final": {m: curves[m].tolist() for m in MODELS},
        "leans": {m: LEANS[m].tolist() for m in MODELS},
        "grade": GRADE,
    }
    (OUT / "tone-curves.json").write_text(json.dumps(payload, indent=2))
    print("wrote", OUT / "lut.png", APP_LUT, OUT / "tone-curves.json")


if __name__ == "__main__":
    main()
