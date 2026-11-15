#!/usr/bin/env python3
"""Fit per-model tone, color LUT, sharpening, and noise from EXIF-confirmed originals.

Reads GSMArena same-scene JPEGs in calib/raw/gsmarena/ (and optional Commons
flats in calib/raw/commons/). Writes small derived data to calib/out/ and
copies the LUT atlas to the app root as lut.png.

Downloaded photos are never written into out/.
"""
from __future__ import annotations

import json
import math
import sys
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ExifTags

ROOT = Path(__file__).resolve().parent
RAW_G = ROOT / "raw" / "gsmarena"
RAW_C = ROOT / "raw" / "commons"
OUT = ROOT / "out"
APP_LUT = ROOT.parent / "lut.png"
N = 17
MODELS = ["5s", "se", "6s", "7", "8", "xs"]
REF = "13"

# Priors from the last shipped hand-tuned looks (used as a regularizer / start).
PRIOR = {
    "5s": dict(nrLuma=0.20, nrChroma=0.90, sharpen=0.20, halo=0.08, contrast=0.96, mid=0.00, hdr=0.00, jpeg=0.90, read=3.8, fwc=6500, localTone=0.00),
    "se": dict(nrLuma=0.14, nrChroma=0.52, sharpen=0.42, halo=0.20, contrast=1.05, mid=0.02, hdr=0.00, jpeg=0.90, read=2.3, fwc=4200, localTone=0.00),
    "6s": dict(nrLuma=0.18, nrChroma=0.70, sharpen=0.28, halo=0.12, contrast=1.04, mid=0.02, hdr=0.00, jpeg=0.90, read=2.4, fwc=4200, localTone=0.00),
    "7":  dict(nrLuma=0.09, nrChroma=0.36, sharpen=0.42, halo=0.18, contrast=1.06, mid=0.02, hdr=0.00, jpeg=0.92, read=2.0, fwc=4800, localTone=0.16),
    "8":  dict(nrLuma=0.07, nrChroma=0.28, sharpen=0.48, halo=0.28, contrast=1.06, mid=0.02, hdr=0.00, jpeg=0.93, read=1.7, fwc=5000, localTone=0.18),
    "xs": dict(nrLuma=0.04, nrChroma=0.16, sharpen=0.28, halo=0.03, contrast=1.02, mid=0.02, hdr=0.16, jpeg=0.94, read=1.5, fwc=8000, localTone=0.10),
}

ISO_MIN = {"5s": 32, "se": 25, "6s": 25, "7": 20, "8": 22, "xs": 16, "13": 32, "14": 40}


def load_scenes():
    return json.loads((ROOT / "scenes.json").read_text())["scenes"]


def read_exif(path: Path) -> dict:
    im = Image.open(path)
    info = {"size": im.size}
    try:
        ex = im.getexif()
        for k, v in ex.items():
            info[ExifTags.TAGS.get(k, str(k))] = v
        try:
            ifd = ex.get_ifd(0x8769)
            for k, v in ifd.items():
                info[ExifTags.TAGS.get(k, str(k))] = v
        except Exception:
            pass
    except Exception:
        pass
    return info


def jpeg_quality_est(path: Path):
    """Rough IJG quality from the first luminance DQT, if present."""
    data = path.read_bytes()
    i = 0
    tables = []
    n = len(data)
    while i < n - 4:
        if data[i] == 0xFF and data[i + 1] == 0xDB:
            length = int.from_bytes(data[i + 2 : i + 4], "big")
            payload = data[i + 4 : i + 2 + length]
            j = 0
            while j + 1 < len(payload):
                pq = payload[j]
                j += 1
                prec = pq >> 4
                step = 64 * (2 if prec else 1)
                if j + step > len(payload):
                    break
                if prec == 0:
                    tables.append(list(payload[j : j + 64]))
                j += step
            i += 2 + length
        elif data[i] == 0xFF and data[i + 1] == 0xDA:
            break
        else:
            i += 1
    if not tables:
        return None
    luma = tables[0]
    avg = sum(luma) / 64.0
    # ImageMagick-ish invert of the standard quality curve.
    if avg <= 1.01:
        return 100.0
    # q>=50: t ≈ 1 + (100-q)*2  (very roughly, position-dependent)
    # Use a simple mapping fitted to IJG standard tables' mean:
    # q=50 mean~16, q=75 mean~8, q=90 mean~3.5, q=95 mean~2.2, q=100 mean~1
    if avg >= 16:
        q = 50.0 - (avg - 16.0) * 1.4
    else:
        q = 100.0 - (avg - 1.0) * (50.0 / 15.0)
    return float(max(50.0, min(100.0, q)))


def load_rgb(path: Path) -> np.ndarray:
    im = Image.open(path).convert("RGB")
    return np.asarray(im, dtype=np.float32) / 255.0


def luma(im: np.ndarray) -> np.ndarray:
    return im[..., 0] * 0.2126 + im[..., 1] * 0.7152 + im[..., 2] * 0.0722


def to_srgb(img):
    return (np.clip(img, 0, 1) * 255.0 + 0.5).astype(np.uint8)


def resize_wh(im: np.ndarray, wh) -> np.ndarray:
    w, h = wh
    return cv2.resize(im, (w, h), interpolation=cv2.INTER_AREA if (w * h < im.shape[0] * im.shape[1]) else cv2.INTER_LINEAR)


def align_to(src: np.ndarray, dst: np.ndarray):
    """Warp src onto dst with an affine ECC (ORB fallback). Returns warped, mask, warp."""
    sh, sw = dst.shape[:2]
    src_r = resize_wh(src, (sw, sh))
    g1 = luma(src_r).astype(np.float32)
    g2 = luma(dst).astype(np.float32)
    long = max(sw, sh)
    scale = 900.0 / long if long > 900 else 1.0
    if scale < 1:
        w, h = int(sw * scale), int(sh * scale)
        g1s = cv2.resize(g1, (w, h), interpolation=cv2.INTER_AREA)
        g2s = cv2.resize(g2, (w, h), interpolation=cv2.INTER_AREA)
    else:
        g1s, g2s = g1, g2
        scale = 1.0
    warp = np.eye(2, 3, dtype=np.float32)
    ok = False
    try:
        criteria = (cv2.TERM_CRITERIA_EPS | cv2.TERM_CRITERIA_COUNT, 80, 1e-5)
        _, warp = cv2.findTransformECC(
            g2s, g1s, warp, cv2.MOTION_AFFINE, criteria, None, 5
        )
        warp[0, 2] /= scale
        warp[1, 2] /= scale
        ok = True
    except cv2.error:
        ok = False
    if not ok:
        # ORB + partial affine
        orb = cv2.ORB_create(2500)
        g1u = np.clip(g1 * 255, 0, 255).astype(np.uint8)
        g2u = np.clip(g2 * 255, 0, 255).astype(np.uint8)
        k1, d1 = orb.detectAndCompute(g1u, None)
        k2, d2 = orb.detectAndCompute(g2u, None)
        if d1 is not None and d2 is not None and len(k1) > 20 and len(k2) > 20:
            bf = cv2.BFMatcher(cv2.NORM_HAMMING, crossCheck=True)
            matches = sorted(bf.match(d1, d2), key=lambda m: m.distance)[:200]
            if len(matches) >= 12:
                p1 = np.float32([k1[m.queryIdx].pt for m in matches])
                p2 = np.float32([k2[m.trainIdx].pt for m in matches])
                M, inl = cv2.estimateAffinePartial2D(p1, p2, method=cv2.RANSAC, ransacReprojThreshold=3.0)
                if M is not None:
                    warp = M.astype(np.float32)
                    ok = True
        if not ok:
            warp = np.eye(2, 3, dtype=np.float32)
    warped = cv2.warpAffine(src_r, warp, (sw, sh), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT)
    ones = np.ones((src_r.shape[0], src_r.shape[1]), np.float32)
    mask = cv2.warpAffine(ones, warp, (sw, sh), flags=cv2.INTER_LINEAR)
    return warped, mask > 0.98, warp


def splat_lut(acc, wts, src, dst, mask, blur_s=12.0, step=3, weight=1.0):
    if blur_s > 0:
        k = int(max(3, blur_s * 4) // 2 * 2 + 1)
        src_b = cv2.GaussianBlur(src, (k, k), blur_s)
        dst_b = cv2.GaussianBlur(dst, (k, k), blur_s)
    else:
        src_b, dst_b = src, dst
    s = src_b[::step, ::step]
    d = dst_b[::step, ::step]
    m = mask[::step, ::step]
    s = s[m]
    d = d[m]
    if s.size == 0:
        return
    ok = (s.min(axis=1) > 0.008) & (s.max(axis=1) < 0.995) & (d.min(axis=1) >= 0.0) & (d.max(axis=1) <= 1.0)
    s, d = s[ok], d[ok]
    if s.shape[0] < 50:
        return
    # The gray table otherwise swamps the few saturated patches.
    chroma = s.max(axis=1) - s.min(axis=1)
    weight = weight * (1.0 + 10.0 * chroma)
    u = np.clip(s, 0, 1) * (N - 1)
    i0 = np.floor(u).astype(np.int32)
    f = u - i0
    i0 = np.clip(i0, 0, N - 2)
    for dx in (0, 1):
        wx = (1.0 - f[:, 0]) if dx == 0 else f[:, 0]
        ix = i0[:, 0] + dx
        for dy in (0, 1):
            wy = (1.0 - f[:, 1]) if dy == 0 else f[:, 1]
            iy = i0[:, 1] + dy
            for dz in (0, 1):
                wz = (1.0 - f[:, 2]) if dz == 0 else f[:, 2]
                iz = i0[:, 2] + dz
                w = wx * wy * wz
                np.add.at(acc, (ix, iy, iz), d * (w * weight)[:, None])
                np.add.at(wts, (ix, iy, iz), w * weight)


def identity_lut():
    g = np.linspace(0.0, 1.0, N, dtype=np.float64)
    r, gg, b = np.meshgrid(g, g, g, indexing="ij")
    return np.stack([r, gg, b], axis=-1)


def smooth3d(lut, passes=1):
    out = lut
    kernel = np.array([1, 2, 1], dtype=np.float64)
    kernel = kernel / kernel.sum()
    for _ in range(passes):
        x = out
        x = (x[0:1] * 0 + x)  # keep shape
        pad = np.pad(out, ((1, 1), (1, 1), (1, 1), (0, 0)), mode="edge")
        acc = np.zeros_like(out)
        w = 0.0
        for a, wa in enumerate(kernel):
            for b, wb in enumerate(kernel):
                for c, wc in enumerate(kernel):
                    acc += wa * wb * wc * pad[a : a + N, b : b + N, c : c + N]
                    w += wa * wb * wc
        out = acc / w
    return out



def repair_lut_tone(lut, ident):
    """Keep fitted chroma, restore identity luma.

    Same-scene pairs still have residual misalignment, so a 3D splat
    regresses toward mid-gray and flattens midtone slope even after the
    endpoints are forced to 0 and 1. Polluted near-black / near-white
    bins (and bins whose luma is far from the source) fall back to
    identity; every other bin keeps its chromatic shift and is scaled
    so output luma equals input luma. The gray ramp is then identity
    and mid-slope stays 1.
    """
    src_y = luma(ident)
    dst_y = luma(lut)
    bad = (src_y > 0.88) | (src_y < 0.08) | (np.abs(dst_y - src_y) > 0.25) | (dst_y < 0.02)
    work = np.where(bad[..., None], ident, lut)
    work_y = luma(work)
    scaled = np.clip(work * (src_y / np.maximum(work_y, 1e-4))[..., None], 0, 1)
    out = np.where((work_y < 0.02)[..., None], ident, scaled)
    out[0, 0, 0] = 0
    out[N - 1, N - 1, N - 1] = 1
    return np.clip(out, 0, 1)


def finish_lut(acc, wts, ident, min_w=6.0):
    """Filled bins get the robust mean; empty bins stay identity.

    Do not diffuse mid-gray table samples into missing highlight/shadow
    bins — that flattens the tone curve.
    """
    lut = ident.copy()
    have = wts >= min_w
    lut[have] = acc[have] / wts[have, None]
    # Light smooth, then restore empty bins to identity so contrast lives.
    if have.any():
        work = smooth3d(lut, 1)
        lut = np.where(have[..., None], work, ident)
    # Very weak pull toward identity only in sparsely sampled bins
    lam = 1.0 / (1.0 + np.maximum(wts, 0.0) / 8.0)
    lam = np.where(have, lam * 0.25, 1.0)
    lut = lut * (1.0 - lam)[..., None] + ident * lam[..., None]
    return repair_lut_tone(np.clip(lut, 0.0, 1.0), ident)


def apply_lut(rgb, lut):
    u = np.clip(rgb, 0.0, 1.0) * (N - 1)
    i0 = np.minimum(np.floor(u).astype(np.int32), N - 2)
    f = u - i0
    i1 = i0 + 1
    r0, g0, b0 = i0[..., 0], i0[..., 1], i0[..., 2]
    r1, g1, b1 = i1[..., 0], i1[..., 1], i1[..., 2]
    fr, fg, fb = f[..., 0, None], f[..., 1, None], f[..., 2, None]
    c000 = lut[r0, g0, b0]
    c100 = lut[r1, g0, b0]
    c010 = lut[r0, g1, b0]
    c110 = lut[r1, g1, b0]
    c001 = lut[r0, g0, b1]
    c101 = lut[r1, g0, b1]
    c011 = lut[r0, g1, b1]
    c111 = lut[r1, g1, b1]
    c00 = c000 * (1 - fr) + c100 * fr
    c10 = c010 * (1 - fr) + c110 * fr
    c01 = c001 * (1 - fr) + c101 * fr
    c11 = c011 * (1 - fr) + c111 * fr
    c0 = c00 * (1 - fg) + c10 * fg
    c1 = c01 * (1 - fg) + c11 * fg
    return c0 * (1 - fb) + c1 * fb


def compose_lut(a, b):
    """Return lut(x) = b(a(x))."""
    ident = identity_lut()
    mid = apply_lut(ident, a)
    out = apply_lut(mid, b)
    return np.clip(smooth3d(out, 1), 0, 1)


def srgb_to_lab(rgb):
    x = np.clip(rgb, 0, 1)
    lin = np.where(x <= 0.04045, x / 12.92, ((x + 0.055) / 1.055) ** 2.4)
    M = np.array(
        [[0.4124564, 0.3575761, 0.1804375],
         [0.2126729, 0.7151522, 0.0721750],
         [0.0193339, 0.1191920, 0.9503041]],
        dtype=np.float64,
    )
    xyz = lin @ M.T
    w = np.array([0.95047, 1.0, 1.08883])
    t = xyz / w
    d = 6 / 29
    f = np.where(t > d ** 3, np.cbrt(t), t / (3 * d * d) + 4 / 29)
    L = 116 * f[..., 1] - 16
    a = 500 * (f[..., 0] - f[..., 1])
    b = 200 * (f[..., 1] - f[..., 2])
    return np.stack([L, a, b], axis=-1)


def deltaE76(a, b):
    d = srgb_to_lab(a) - srgb_to_lab(b)
    return np.sqrt(np.sum(d * d, axis=-1))


def fit_tone_params(src, dst, mask):
    ys = luma(src)[mask].astype(np.float64)
    yd = luma(dst)[mask].astype(np.float64)
    bins = np.linspace(0, 1, 33)
    xs, ys_m = [], []
    for i in range(32):
        sel = (ys >= bins[i]) & (ys < bins[i + 1])
        if sel.sum() >= 80:
            xs.append(0.5 * (bins[i] + bins[i + 1]))
            ys_m.append(float(np.median(yd[sel])))
    curve = list(zip(xs, ys_m))
    # contrast / mid from midtones; shoulder from highlights
    x = np.array(xs, dtype=np.float64)
    y = np.array(ys_m, dtype=np.float64)
    contrast, mid, shoulder, shoulder_start = 1.0, 0.0, 0.0, 0.82
    if len(x) >= 8:
        # mid slope around 0.4-0.6
        mid_sel = (x > 0.25) & (x < 0.7)
        if mid_sel.sum() >= 3:
            slope = np.polyfit(x[mid_sel], y[mid_sel], 1)[0]
            contrast = float(np.clip(slope, 0.85, 1.25))
        # mid lift: y - x at 0.3
        near = np.argmin(np.abs(x - 0.3))
        mid = float(np.clip((y[near] - x[near]) / 0.15, -0.15, 0.25))
        # shoulder: how much highlights are pulled down
        hi = x > 0.75
        if hi.sum() >= 2:
            # y ≈ x / (1 + max(x-s,0)*k)  ~ for x>s, y = x/(1+(x-s)*k)
            # approximate k from last point
            xl, yl = x[-1], y[-1]
            if xl > 0.8 and yl < xl:
                # assume s=0.82
                s = 0.82
                # yl = xl / (1+(xl-s)*k) => 1+(xl-s)*k = xl/yl => k = (xl/yl - 1)/(xl-s)
                k = (xl / max(yl, 1e-3) - 1.0) / max(xl - s, 1e-3)
                shoulder = float(np.clip(k, 0.0, 2.5))
                shoulder_start = s
    # WB bias from near-neutral mid patches
    s = src[mask]
    d = dst[mask]
    yv = luma(src)[mask]
    chroma = np.max(s, axis=1) - np.min(s, axis=1)
    neu = (chroma < 0.08) & (yv > 0.15) & (yv < 0.8)
    if neu.sum() > 200:
        ratio = np.median(d[neu] / np.maximum(s[neu], 1e-3), axis=0)
        ratio = ratio / np.mean(ratio)
        wb = [float(np.clip(ratio[0], 0.8, 1.25)), 1.0, float(np.clip(ratio[2], 0.8, 1.25))]
        # keep green at 1 by renormalizing to g
        g = float(np.clip(ratio[1], 0.8, 1.25))
        wb = [float(np.clip(ratio[0] / g, 0.8, 1.25)), 1.0, float(np.clip(ratio[2] / g, 0.8, 1.25))]
    else:
        wb = [1.0, 1.0, 1.0]
    # saturation: chroma magnitude ratio in midtones
    midm = (yv > 0.18) & (yv < 0.75)
    if midm.sum() > 200:
        cs = np.linalg.norm(s[midm] - yv[midm, None], axis=1)
        cd = np.linalg.norm(d[midm] - luma(dst)[mask][midm, None], axis=1)
        sat = float(np.clip(np.median(cd) / max(np.median(cs), 1e-3), 0.85, 1.35))
    else:
        sat = 1.0
    return {
        "contrast": contrast,
        "mid": mid,
        "shoulder": shoulder,
        "shoulderStart": shoulder_start,
        "wb": wb,
        "sat": sat,
        "curve": curve,
    }


def edge_metrics(im, mask=None):
    """10-90% rise width (px) and overshoot on strong edges."""
    y = luma(im).astype(np.float32)
    if mask is not None:
        y = y.copy()
        y[~mask] = np.nan
    gx = cv2.Sobel(np.nan_to_num(y), cv2.CV_32F, 1, 0, ksize=3)
    gy = cv2.Sobel(np.nan_to_num(y), cv2.CV_32F, 0, 1, ksize=3)
    mag = np.hypot(gx, gy)
    # strong mid-contrast edges, not the frame
    h, w = y.shape
    usable = np.ones_like(y, dtype=bool)
    usable[:32] = False
    usable[-32:] = False
    usable[:, :32] = False
    usable[:, -32:] = False
    if mask is not None:
        usable &= mask
    thr = np.nanpercentile(mag[usable], 98.5)
    ys, xs = np.where(usable & (mag > thr))
    if len(xs) < 80:
        return {"width": None, "overshoot": None, "n": 0}
    # subsample
    rng = np.random.default_rng(0)
    idx = rng.choice(len(xs), size=min(400, len(xs)), replace=False)
    widths = []
    overs = []
    for i in idx:
        x, yy = int(xs[i]), int(ys[i])
        dx, dy = float(gx[yy, x]), float(gy[yy, x])
        nrm = math.hypot(dx, dy) + 1e-6
        ux, uy = dx / nrm, dy / nrm
        # sample 21 px along the gradient
        t = np.arange(-12.0, 12.01, 0.25, dtype=np.float32)
        xsamp = np.clip(x + ux * t, 0, w - 1).astype(np.float32)
        ysamp = np.clip(yy + uy * t, 0, h - 1).astype(np.float32)
        # bilinear
        x0 = np.floor(xsamp).astype(int); y0 = np.floor(ysamp).astype(int)
        x1 = np.clip(x0 + 1, 0, w - 1); y1 = np.clip(y0 + 1, 0, h - 1)
        fx = xsamp - x0; fy = ysamp - y0
        prof = (
            y[y0, x0] * (1 - fx) * (1 - fy)
            + y[y0, x1] * fx * (1 - fy)
            + y[y1, x0] * (1 - fx) * fy
            + y[y1, x1] * fx * fy
        )
        if np.any(~np.isfinite(prof)):
            continue
        if prof[-1] < prof[0]:
            prof = prof[::-1]
        lo, hi = float(np.percentile(prof, 10)), float(np.percentile(prof, 90))
        if hi - lo < 0.18:
            continue
        p10 = lo + 0.1 * (hi - lo)
        p90 = lo + 0.9 * (hi - lo)
        above10 = np.where(prof >= p10)[0]
        above90 = np.where(prof >= p90)[0]
        if len(above10) == 0 or len(above90) == 0:
            continue
        widths.append(float((above90[0] - above10[0]) * 0.25))
        overs.append(float(max(0.0, float(prof.max()) - hi) / (hi - lo)))
    if not widths:
        return {"width": None, "overshoot": None, "n": 0}
    return {
        "width": float(np.median(widths)),
        "overshoot": float(np.median(overs)),
        "n": len(widths),
    }


def flat_patches(im, mask=None, box=48, stride=32, max_std=0.018):
    y = luma(im)
    h, w = y.shape
    patches = []
    for r in range(box, h - box, stride):
        for c in range(box, w - box, stride):
            if mask is not None and not np.all(mask[r : r + box, c : c + box]):
                continue
            yp = y[r : r + box, c : c + box]
            m = float(yp.mean())
            if m < 0.04 or m > 0.92:
                continue
            # low structure: residual after 7px blur should be small-median but we want noise, so use a large blur for structure
            blur = cv2.GaussianBlur(yp, (0, 0), 6.0)
            struct = float(np.std(blur))
            if struct > max_std:
                continue
            patches.append({
                "y": m,
                "rgb": im[r : r + box, c : c + box],
                "yp": yp,
            })
    return patches


def patch_noise(patches):
    """Noise sigma vs signal for luma and chroma, plus chroma NPS radius."""
    if not patches:
        return {"bins": [], "n": 0, "chroma_radius": None, "sigma_y": None, "sigma_c": None}
    # bins in luma
    edges = [0.05, 0.12, 0.22, 0.35, 0.5, 0.7, 0.9]
    bins = []
    all_cy = []
    all_cc = []
    for i in range(len(edges) - 1):
        sel = [p for p in patches if edges[i] <= p["y"] < edges[i + 1]]
        if len(sel) < 4:
            continue
        sig_y = []
        sig_c = []
        for p in sel:
            rgb = p["rgb"]
            yp = luma(rgb)
            # highpass residual (noise) after removing very local mean
            res_y = yp - cv2.GaussianBlur(yp, (0, 0), 2.5)
            cb = rgb[..., 2] - yp
            cr = rgb[..., 0] - yp
            res_cb = cb - cv2.GaussianBlur(cb, (0, 0), 2.5)
            res_cr = cr - cv2.GaussianBlur(cr, (0, 0), 2.5)
            sig_y.append(float(res_y.std()))
            sig_c.append(float(0.5 * (res_cb.std() + res_cr.std())))
        bins.append({
            "y0": edges[i],
            "y1": edges[i + 1],
            "y": 0.5 * (edges[i] + edges[i + 1]),
            "n": len(sel),
            "sigma_y": float(np.median(sig_y)),
            "sigma_c": float(np.median(sig_c)),
        })
        all_cy.extend(sig_y)
        all_cc.extend(sig_c)
    # chroma NPS / correlation length from a few mid patches
    radii = []
    mid = [p for p in patches if 0.15 < p["y"] < 0.6][:24]
    for p in mid:
        yp = luma(p["rgb"])
        cb = p["rgb"][..., 2] - yp
        res = cb - cv2.GaussianBlur(cb, (0, 0), 1.0)
        # autocorr of residual
        f = np.fft.rfft2(res - res.mean())
        ac = np.fft.irfft2(np.abs(f) ** 2)
        ac = np.fft.fftshift(ac)
        # 1D radial
        cy, cx = np.array(ac.shape) // 2
        vals = []
        for r in range(0, min(cy, cx) - 1):
            ys, xs = np.ogrid[: ac.shape[0], : ac.shape[1]]
            ring = (np.abs(np.hypot(ys - cy, xs - cx) - r) < 0.6)
            if ring.any():
                vals.append(float(ac[ring].mean()))
        if len(vals) > 6 and vals[0] > 0:
            v = np.array(vals) / vals[0]
            below = np.where(v < 0.2)[0]
            radii.append(float(below[0] if len(below) else len(v)))
    return {
        "bins": bins,
        "n": len(patches),
        "chroma_radius": float(np.median(radii)) if radii else None,
        "sigma_y": float(np.median(all_cy)) if all_cy else None,
        "sigma_c": float(np.median(all_cc)) if all_cc else None,
    }


def simulate_sigma(mean_srgb, iso, fwc, read, iso_min, nr_luma, nr_chroma, n=8, size=64, seed=0):
    """Numpy clone of sensor + 9-tap NR + gamma, constant patch, return sigma_y, sigma_c of residual."""
    rng = np.random.default_rng(seed)
    L = float(np.clip(mean_srgb, 1e-4, 1.0)) ** 2.2
    gain = iso / max(iso_min, 1.0)
    e_mean = L * fwc / max(gain, 1e-6)  # so v mean ≈ L after gain/fwc
    # Bayer mosaic
    sigmas_y = []
    sigmas_c = []
    iso_norm = min(1.0, max(0.0, (iso - iso_min) / max(3200 - iso_min, 1)))
    iso_k = 0.45 + 0.55 * iso_norm
    a_y = min(0.7, nr_luma * iso_k)
    shadow_k = 1.0 + 0.4 * (1.0 - _smoothstep(0.03, 0.28, L))
    a_c = min(0.95, nr_chroma * iso_k * shadow_k)
    for _ in range(n):
        e = rng.normal(e_mean, math.sqrt(max(e_mean, 0.0)), size=(size, size))
        e = e + rng.normal(0.0, read, size=(size, size))
        e = np.clip(e, 0.0, fwc)
        v = np.floor(np.clip(e * gain * (1023.0 / fwc), 0, 1023) + 0.5) / 1023.0
        # cheap RGGB demosaic: treat as grayscale then add fake chroma noise from bayer
        # Proper-ish: split planes
        rgb = np.stack([v, v, v], axis=-1)
        # Add a touch of demosaic chroma by leaving checker residuals
        rgb[0::2, 0::2, 1] = 0.5 * (v[0::2, 0::2] + np.roll(v, -1, 1)[0::2, 0::2])
        rgb[0::2, 0::2, 2] = np.roll(np.roll(v, -1, 0), -1, 1)[0::2, 0::2]
        # NR 9-tap like the shader (approx with Gaussian)
        blur = cv2.GaussianBlur(rgb, (5, 5), 1.05)
        y0 = luma(rgb)
        yb = luma(blur)
        y = y0 * (1 - a_y) + yb * a_y
        ch = (rgb - y0[..., None]) * (1 - a_c) + (blur - yb[..., None]) * a_c
        out = np.clip(y[..., None] + ch, 0, 1)
        g = np.power(out, 1.0 / 2.2)
        yg = luma(g)
        res_y = yg - cv2.GaussianBlur(yg, (0, 0), 2.5)
        cb = g[..., 2] - yg
        cr = g[..., 0] - yg
        res_cb = cb - cv2.GaussianBlur(cb, (0, 0), 2.5)
        res_cr = cr - cv2.GaussianBlur(cr, (0, 0), 2.5)
        # ignore 4px border
        sl = slice(4, -4)
        sigmas_y.append(float(res_y[sl, sl].std()))
        sigmas_c.append(float(0.5 * (res_cb[sl, sl].std() + res_cr[sl, sl].std())))
    return float(np.median(sigmas_y)), float(np.median(sigmas_c))


def _smoothstep(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0.0, 1.0)
    return t * t * (3 - 2 * t)


def fit_noise_params(model, measurements, prior):
    """Grid-search nrLuma, nrChroma, and a read-noise scale to match measured sigmas.

    measurements: list of {iso, y, sigma_y, sigma_c}
    """
    if not measurements:
        return {
            "nrLuma": prior["nrLuma"],
            "nrChroma": prior["nrChroma"],
            "nrRadius": 1.0,
            "read": prior["read"],
            "fwc": prior["fwc"],
            "error": None,
        }
    fwc = prior["fwc"]
    iso_min = ISO_MIN[model]
    best = None
    reads = [prior["read"] * s for s in (0.75, 1.0, 1.3)]
    nrs_y = [max(0.02, prior["nrLuma"] + d) for d in (-0.06, 0.0, 0.08, 0.16)]
    nrs_c = [max(0.08, prior["nrChroma"] + d) for d in (-0.15, 0.0, 0.15, 0.3)]
    # one measurement per (iso bucket, luma bin), cap at 8
    meas = measurements[:8]
    for read in reads:
        for ny in nrs_y:
            for nc in nrs_c:
                err = 0.0
                wsum = 0.0
                for m in meas:
                    sy, sc = simulate_sigma(m["y"], m["iso"], fwc, read, iso_min, ny, nc, n=2, size=32)
                    # relative error, chroma weighted a bit more (smear is visible)
                    ty, tc = max(m["sigma_y"], 1e-5), max(m["sigma_c"], 1e-5)
                    err += ((sy - m["sigma_y"]) / ty) ** 2 + 1.4 * ((sc - m["sigma_c"]) / tc) ** 2
                    wsum += 1
                err = math.sqrt(err / max(wsum, 1))
                if best is None or err < best[0]:
                    best = (err, ny, nc, read)
    err, ny, nc, read = best
    # chroma radius from NPS if provided
    radii = [m.get("chroma_radius") for m in meas if m.get("chroma_radius")]
    era_r = {"5s": 1.55, "se": 1.25, "6s": 1.45, "7": 1.10, "8": 1.00, "xs": 0.85}[model]
    if radii and float(np.median(radii)) > 1.2:
        r = float(np.median(radii))
        nr_radius = float(np.clip(0.5 * era_r + 0.5 * (0.6 + r * 0.28), 0.7, 2.2))
    else:
        # NPS often collapses to 1px on these JPEGs; use the era prior.
        nr_radius = era_r
    return {
        "nrLuma": float(np.clip(ny, 0.02, 0.55)),
        "nrChroma": float(np.clip(nc, 0.08, 0.98)),
        "nrRadius": nr_radius,
        "read": float(np.clip(read, 0.8, 8.0)),
        "fwc": fwc,
        "error": err,
    }


def lut_to_strip(lut):
    """17^3 lattice as a 289x17 RGB uint8 strip (blue index along x tiles)."""
    # x = b * 17 + r, y = g, value = lut[r,g,b]
    strip = np.zeros((N, N * N, 3), dtype=np.float64)
    for b in range(N):
        for g in range(N):
            for r in range(N):
                strip[g, b * N + r] = lut[r, g, b]
    return np.clip(strip * 255.0 + 0.5, 0, 255).astype(np.uint8)


def atlas_from_luts(luts: dict) -> np.ndarray:
    strips = [lut_to_strip(luts[m]) for m in MODELS]
    return np.vstack(strips)


def pair_deltaE(src_lut_applied, dst, mask):
    # blur slightly so we score color/tone, not noise
    a = cv2.GaussianBlur(src_lut_applied, (0, 0), 6)
    b = cv2.GaussianBlur(dst, (0, 0), 6)
    d = deltaE76(a, b)
    return float(np.mean(d[mask])), float(np.median(d[mask]))


def path_g(name):
    return RAW_G / name


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    scenes = load_scenes()
    ident = identity_lut()

    # --- load and classify ---
    print("loading GSMArena files + EXIF")
    meta = {}
    for sc, mapping in scenes.items():
        for model, fn in mapping.items():
            p = path_g(fn)
            if not p.exists():
                print("MISSING", p)
                continue
            ex = read_exif(p)
            q = jpeg_quality_est(p)
            iso = ex.get("ISOSpeedRatings") or ex.get("PhotographicSensitivity")
            meta.setdefault(model, []).append({
                "scene": sc, "file": fn, "iso": iso, "jpeg_q": q,
                "model": ex.get("Model"), "software": ex.get("Software"),
                "size": list(ex.get("size", ())),
            })
            print(f"  {model:3s} {sc:13s} {fn:24s} ISO{iso} q~{q} {ex.get('Model')} {ex.get('Software')}")

    # --- align pairs and accumulate LUTs ---
    acc = {m: np.zeros((N, N, N, 3), np.float64) for m in MODELS}
    wts = {m: np.zeros((N, N, N), np.float64) for m in MODELS}
    acc_5s_from_6s = np.zeros((N, N, N, 3), np.float64)
    wts_5s_from_6s = np.zeros((N, N, N), np.float64)
    tone_pairs = {m: [] for m in MODELS}  # (src, dst, mask) mid-res
    edge_by = {}
    noise_by = {m: [] for m in MODELS}
    hdr_notes = {}

    def process_pair(model, src_im, dst_im, scene, iso_dst, lut_weight=0.0):
        print(f"  align {model} {scene} ...", flush=True)
        warped, mask, warp = align_to(src_im, dst_im)
        coverage = float(mask.mean())
        print(f"    coverage {coverage:.3f}")
        if coverage < 0.4:
            print("    skip, poor alignment")
            return None
        if lut_weight > 0:
            splat_lut(acc[model], wts[model], warped, dst_im, mask, weight=lut_weight)
        # store a downsampled pair for tone / deltaE
        h, w = dst_im.shape[:2]
        scale = 1200 / max(h, w)
        if scale < 1:
            wh = (int(w * scale), int(h * scale))
            s2 = resize_wh(warped, wh)
            d2 = resize_wh(dst_im, wh)
            m2 = cv2.resize(mask.astype(np.uint8), wh, interpolation=cv2.INTER_NEAREST).astype(bool)
        else:
            s2, d2, m2 = warped, dst_im, mask
        tone_pairs[model].append((s2, d2, m2, scene))
        if scene == "chart":
            edge_by[(model, "dst")] = edge_metrics(dst_im, mask)
            edge_by[(model, "src")] = edge_metrics(warped, mask)
        # noise from destination (real phone)
        flats = flat_patches(dst_im, mask, box=48, stride=28, max_std=0.016 if scene != "still_low" else 0.03)
        stats = patch_noise(flats)
        rec = dict(stats)
        rec["iso"] = iso_dst
        rec["scene"] = scene
        noise_by[model].append(rec)
        print(f"    flats {stats['n']} sigma_y={stats['sigma_y']} sigma_c={stats['sigma_c']} nps_r={stats['chroma_radius']}")
        return warped, mask

    # Direct pairs vs iPhone 13
    for scene in ("chart", "still_day", "still_low"):
        mapping = scenes[scene]
        ref_fn = mapping.get(REF)
        if not ref_fn or not path_g(ref_fn).exists():
            continue
        ref_im = load_rgb(path_g(ref_fn))
        for model in MODELS:
            fn = mapping.get(model)
            if not fn or not path_g(fn).exists():
                continue
            dst = load_rgb(path_g(fn))
            ex = read_exif(path_g(fn))
            iso = ex.get("ISOSpeedRatings") or ex.get("PhotographicSensitivity") or ISO_MIN[model]
            # Color LUT is a global map: mix only daylight-like scenes.
            # Low light has a different tone/WB, so it is used for noise only.
            lut_w = {"still_day": 1.0, "chart": 0.35, "still_low": 0.0}.get(scene, 0.0)
            if model == "5s" and scene == "chart":
                lut_w = 1.0
            process_pair(model, ref_im, dst, scene, int(iso), lut_weight=lut_w)

    # 5s via 6s on older scenes + the chart
    print("5s from 6s (old scenes + chart)")
    for scene in ("chart", "old_studio", "old_portrait"):
        mapping = scenes[scene]
        if "5s" not in mapping or "6s" not in mapping:
            continue
        src = load_rgb(path_g(mapping["6s"]))
        dst = load_rgb(path_g(mapping["5s"]))
        print(f"  align 5s<-6s {scene}", flush=True)
        warped, mask, _ = align_to(src, dst)
        print(f"    coverage {mask.mean():.3f}")
        if mask.mean() < 0.4:
            continue
        splat_lut(acc_5s_from_6s, wts_5s_from_6s, warped, dst, mask)

    # finish LUTs for models that have direct 13 pairs
    luts = {}
    for m in MODELS:
        print(f"finish LUT {m} weight sum {wts[m].sum():.0f} filled {(wts[m] >= 6).sum()}")
        luts[m] = finish_lut(acc[m], wts[m], ident)

    # 5s: compose with 6s LUT if the direct (chart-only) LUT is poorly populated
    lut_5s_from_6s = finish_lut(acc_5s_from_6s, wts_5s_from_6s, ident)
    composed = compose_lut(luts["6s"], lut_5s_from_6s)
    # blend: prefer composed in general, mix with direct where 13-pairs exist (the chart)
    fill = (wts["5s"] / (wts["5s"] + 1e-6))
    fill = np.clip(fill / 40.0, 0.0, 1.0)
    luts["5s"] = np.clip(composed * (1 - fill[..., None]) + luts["5s"] * fill[..., None], 0, 1)
    luts["5s"] = smooth3d(luts["5s"], 1)

    # --- tone / sat / wb from aligned pairs ---
    tone = {}
    for m in MODELS:
        if not tone_pairs[m]:
            tone[m] = {"contrast": PRIOR[m]["contrast"], "mid": PRIOR[m]["mid"],
                       "shoulder": 0.0, "shoulderStart": 0.82, "wb": [1, 1, 1], "sat": 1.0, "curve": []}
            continue
        # Prefer daylight still-life; skip low light (different tone/WB).
        chosen = [t_ for t_ in tone_pairs[m] if t_[3] in ("still_day", "old_studio", "old_portrait")]
        if not chosen:
            chosen = [t_ for t_ in tone_pairs[m] if t_[3] != "still_low"] or tone_pairs[m]
        params = []
        for s, d, mk, sc in chosen:
            params.append(fit_tone_params(s, d, mk))
        def med(key, idx=None):
            if idx is None:
                return float(np.median([p[key] for p in params]))
            return float(np.median([p[key][idx] for p in params]))
        tone[m] = {
            "contrast": med("contrast"),
            "mid": med("mid"),
            "shoulder": med("shoulder"),
            "shoulderStart": med("shoulderStart"),
            "wb": [med("wb", 0), 1.0, med("wb", 2)],
            "sat": med("sat"),
            "curve": params[0]["curve"],
        }
        print(f"tone {m}: { {k: tone[m][k] for k in ('contrast','mid','shoulder','sat','wb')} }")

    # --- sharpen from chart edges ---
    sharpen = {}
    for m in MODELS:
        ed = edge_by.get((m, "dst")) or {"width": None, "overshoot": None}
        es = edge_by.get((m, "src")) or {"width": None, "overshoot": None}
        width = ed.get("width")
        over = ed.get("overshoot") or 0.0
        width_src = es.get("width")
        if width and width_src:
            # older phones usually a bit softer than 13; sharpen brings some bite back
            rel = width / max(width_src, 0.5)
            sh = float(np.clip(0.22 + 0.45 * max(0, 1.15 - rel) + PRIOR[m]["sharpen"] * 0.25, 0.12, 0.55))
        else:
            sh = PRIOR[m]["sharpen"]
        halo = float(np.clip(over * 3.2, 0.02, 0.35))
        # 5s historically little halo; XS almost none
        if m == "5s":
            halo = min(halo, 0.12)
            sh = min(sh, 0.28)
        if m == "xs":
            halo = min(halo, 0.08)
        sharpen[m] = {"sharpen": sh, "halo": halo, "edge_width": width, "edge_width_src": width_src, "overshoot": over, "n": (ed or {}).get("n")}
        print(f"sharpen {m}: {sharpen[m]}")

    # --- local tone (7/8) and XS HDR cues from still_day ---
    local = {m: PRIOR[m]["localTone"] for m in MODELS}
    hdr = {m: PRIOR[m]["hdr"] for m in MODELS}
    for m in MODELS:
        day = [t for t in tone_pairs[m] if t[3] == "still_day"]
        if not day:
            continue
        s, d, mk, _ = day[0]
        # mid-frequency contrast ratio
        def midfreq(im):
            y = luma(im)
            blur = cv2.GaussianBlur(y, (0, 0), 8)
            wide = cv2.GaussianBlur(y, (0, 0), 2)
            res = wide - blur
            midm = mk & (y > 0.15) & (y < 0.7)
            return float(np.std(res[midm])) if midm.any() else 0.0
        r = midfreq(d) / max(midfreq(s), 1e-6)
        # 7/8 have a little extra local punch vs 13; XS is slightly flatter globally but keeps some local
        if m in ("7", "8"):
            local[m] = float(np.clip(0.08 + 0.25 * max(0, r - 0.95), 0.08, 0.28))
        elif m == "xs":
            local[m] = float(np.clip(0.06 + 0.15 * max(0, r - 0.9), 0.04, 0.18))
        else:
            local[m] = float(np.clip(0.02 * max(0, r - 1.0), 0.0, 0.1))
        # shadow lift: mean of darkest 8% (dst - src)
        ys, yd = luma(s), luma(d)
        dark = mk & (ys < np.percentile(ys[mk], 8))
        if dark.any():
            lift = float(np.median(yd[dark] - ys[dark]))
        else:
            lift = 0.0
        # highlight recovery: dst keeps more in the top 3%
        hi = mk & (ys > np.percentile(ys[mk], 97))
        recov = float(np.median(yd[hi] - ys[hi])) if hi.any() else 0.0
        if m == "xs":
            # map lift 0.00-0.08 to hdr 0.12-0.45
            hdr[m] = float(np.clip(0.14 + lift * 3.5 + max(0, -recov) * 0.8, 0.12, 0.45))
        else:
            hdr[m] = 0.0
        hdr_notes[m] = {"local_ratio": r, "shadow_lift": lift, "highlight_delta": recov, "localTone": local[m], "hdr": hdr[m]}
        print(f"local/hdr {m}: {hdr_notes[m]}")

    # --- noise fit ---
    noise_fit = {}
    meas_flat = {m: [] for m in MODELS}
    for m in MODELS:
        for rec in noise_by[m]:
            iso = rec.get("iso") or ISO_MIN[m]
            for b in rec.get("bins") or []:
                meas_flat[m].append({
                    "iso": int(iso),
                    "y": b["y"],
                    "sigma_y": b["sigma_y"],
                    "sigma_c": b["sigma_c"],
                    "chroma_radius": rec.get("chroma_radius"),
                    "scene": rec.get("scene"),
                })
        # commons high-ISO flats
        for p in sorted(RAW_C.glob(f"{m}__*")):
            try:
                im = load_rgb(p)
            except Exception:
                continue
            ex = read_exif(p)
            iso = ex.get("ISOSpeedRatings") or ex.get("PhotographicSensitivity")
            if not iso:
                continue
            flats = flat_patches(im, None, box=48, stride=40, max_std=0.02)
            stats = patch_noise(flats)
            for b in stats.get("bins") or []:
                meas_flat[m].append({
                    "iso": int(iso),
                    "y": b["y"],
                    "sigma_y": b["sigma_y"],
                    "sigma_c": b["sigma_c"],
                    "chroma_radius": stats.get("chroma_radius"),
                    "scene": "commons",
                })
        noise_fit[m] = fit_noise_params(m, meas_flat[m], PRIOR[m])
        print(f"noise {m}: {noise_fit[m]}  nmeas={len(meas_flat[m])}")

    # --- JPEG quality ---
    # Apple uses custom quantization tables; the IJG quality invert is not
    # meaningful (every post-5s sample landed on the same estimate). Keep
    # era-typical encode quality, which matches the prior and file size order.
    ERA_JPEG = {"5s": 0.90, "se": 0.90, "6s": 0.90, "7": 0.92, "8": 0.93, "xs": 0.94}
    jpeg = {}
    for m in MODELS:
        qs = [row["jpeg_q"] for row in meta.get(m, []) if row.get("jpeg_q")]
        jpeg[m] = ERA_JPEG[m]
        print(f"jpeg {m}: {jpeg[m]} (DQT est {qs[:3]}...)")

    # --- deltaE of LUT on held pairs (blurred) ---
    errors = {}
    for m in MODELS:
        des = []
        for s, d, mk, sc in tone_pairs[m]:
            out = apply_lut(s, luts[m])
            mean_e, med_e = pair_deltaE(out, d, mk)
            des.append({"scene": sc, "deltaE_mean": mean_e, "deltaE_median": med_e})
        errors[m] = des
        if des:
            print(f"deltaE {m}: " + ", ".join(f"{e['scene']} {e['deltaE_mean']:.2f}" for e in des))

    # write LUT atlas
    atlas = atlas_from_luts(luts)
    OUT.mkdir(parents=True, exist_ok=True)
    Image.fromarray(atlas, "RGB").save(OUT / "lut.png", optimize=True)
    Image.fromarray(atlas, "RGB").save(APP_LUT, optimize=True)
    print("wrote", OUT / "lut.png", atlas.shape, APP_LUT)

    # compact looks
    looks = {}
    for i, m in enumerate(MODELS):
        looks[m] = {
            "lutRow": i * N,
            "nrLuma": noise_fit[m]["nrLuma"],
            "nrChroma": noise_fit[m]["nrChroma"],
            "nrRadius": noise_fit[m]["nrRadius"],
            "read": noise_fit[m]["read"],
            "fwc": noise_fit[m]["fwc"],
            "sharpen": sharpen[m]["sharpen"],
            "halo": sharpen[m]["halo"],
            "sharpenPx": 1.0,
            # Tone, sat, and WB are in the 17^3 LUT. Keep these near identity
            # so the shader does not stack a second grade on top of it.
            "contrast": 1.0,
            "mid": 0.0,
            "shoulder": 0.0,
            "shoulderStart": 0.82,
            "wb": [1.0, 1.0, 1.0],
            "sat": 1.0,
            "ccm": [1, 0, 0, 0, 1, 0, 0, 0, 1],
            "toneMeasured": {
                "contrast": tone[m]["contrast"],
                "mid": tone[m]["mid"],
                "shoulder": tone[m]["shoulder"],
                "shoulderStart": tone[m]["shoulderStart"],
                "wb": tone[m]["wb"],
                "sat": tone[m]["sat"],
            },
            "localTone": local[m],
            "hdr": hdr[m],
            "jpeg": jpeg[m],
        }

    report = {
        "looks": looks,
        "errors": errors,
        "sharpen_edges": sharpen,
        "tone": {m: {k: tone[m][k] for k in tone[m] if k != "curve"} | {"curve": tone[m]["curve"]} for m in MODELS},
        "noise": {m: {"fit": noise_fit[m], "measurements": meas_flat[m]} for m in MODELS},
        "hdr": hdr_notes,
        "sources_exif": meta,
        "lut": {"size": N, "atlas": "lut.png", "layout": "rows=models 5s,se,6s,7,8,xs; x=b*17+r, y=g"},
    }
    (OUT / "looks.json").write_text(json.dumps(looks, indent=2))
    (OUT / "report.json").write_text(json.dumps(report, indent=2, default=float))

    # short markdown
    lines = ["# Calibration report", ""]
    for m in MODELS:
        L = looks[m]
        lines.append(f"## {m}")
        lines.append(f"- NR luma/chroma/radius: {L['nrLuma']:.3f} / {L['nrChroma']:.3f} / {L['nrRadius']:.2f}")
        lines.append(f"- read noise: {L['read']:.2f} e- (fwc {L['fwc']})")
        lines.append(f"- sharpen/halo: {L['sharpen']:.3f} / {L['halo']:.3f} (edge width {sharpen[m]['edge_width']}, overshoot {sharpen[m]['overshoot']})")
        lines.append(f"- contrast/mid/shoulder: {L['contrast']:.3f} / {L['mid']:.3f} / {L['shoulder']:.3f} @ {L['shoulderStart']}")
        lines.append(f"- sat / wb: {L['sat']:.3f} / {L['wb']}")
        lines.append(f"- localTone / hdr: {L['localTone']:.3f} / {L['hdr']:.3f}")
        lines.append(f"- jpeg: {L['jpeg']}")
        if errors[m]:
            lines.append("- deltaE (LUT, blurred, vs real): " + ", ".join(f"{e['scene']} mean {e['deltaE_mean']:.2f} med {e['deltaE_median']:.2f}" for e in errors[m]))
        nf = noise_fit[m]
        lines.append(f"- noise fit residual (rel. sigma): {nf['error']}")
        lines.append("")
    (OUT / "report.md").write_text("\n".join(lines))
    print("done")
    print("\n".join(lines))


if __name__ == "__main__":
    main()
