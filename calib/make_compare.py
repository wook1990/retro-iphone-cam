#!/usr/bin/env python3
"""Build samples/compare-real.jpg: real GSMArena photo | our render of the iPhone 13 take."""
from __future__ import annotations
import json, sys
from pathlib import Path
import cv2
import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))
from fit import (load_rgb, load_scenes, path_g, align_to, luma, deltaE76, MODELS, resize_wh)

OUT = Path("/workspace/shipyard/retro-iphone-cam/samples/compare-real.jpg")
REND = Path("/tmp/compare-real")
scenes = load_scenes()

def u8(im):
    return (np.clip(im, 0, 1) * 255).astype(np.uint8)

def sc(im, H=320):
    if im.dtype != np.uint8:
        im = u8(im)
    h, w = im.shape[:2]
    return cv2.resize(im, (int(w * H / h), H), interpolation=cv2.INTER_AREA)

rows = []
metrics = []
# For each model: chart (all) + still_day (not 5s)
for m in MODELS:
    scene_list = ["chart"] if m == "5s" else ["chart", "still_day"]
    for scene in scene_list:
        mapping = scenes[scene]
        real = load_rgb(path_g(mapping[m]))
        rend_p = REND / f"{m}-{scene}.jpg"
        if not rend_p.exists():
            print("missing render", rend_p)
            continue
        rend = load_rgb(rend_p)
        # 13 input, for context
        src = load_rgb(path_g(mapping["13"]))
        warped, mask, _ = align_to(rend, real)  # warp our render onto the real photo
        # also show 13 aligned
        src_w, src_m, _ = align_to(src, real)
        # dE on blurred overlap
        d = deltaE76(cv2.GaussianBlur(warped, (0, 0), 5), cv2.GaussianBlur(real, (0, 0), 5))
        # noise sigma on flats of real vs render (center table / gray)
        def sig(im, mask):
            y = luma(im)
            # mid gray-ish
            sel = mask & (y > 0.2) & (y < 0.7)
            if sel.sum() < 500:
                sel = mask
            # highpass
            res = y - cv2.GaussianBlur(y, (0, 0), 2.5)
            return float(res[sel].std()) if sel.any() else None
        sy_r, sy_o = sig(real, mask), sig(warped, mask)
        mean_e, med_e = float(d[mask].mean()), float(np.median(d[mask]))
        rec = {"model": m, "scene": scene, "deltaE_mean": mean_e, "deltaE_median": med_e,
               "sigma_real": sy_r, "sigma_render": sy_o,
               "sigma_ratio": (sy_o / sy_r) if sy_r else None, "coverage": float(mask.mean())}
        metrics.append(rec)
        print(rec, flush=True)
        label = np.zeros((32, 1, 3), np.uint8)  # placeholder, resized later
        trio = np.concatenate([sc(src_w), sc(warped), sc(real)], 1)
        lab = np.zeros((28, trio.shape[1], 3), np.uint8) + 18
        img = Image.fromarray(lab)
        ImageDraw.Draw(img).text(
            (8, 7),
            f"{m}  {scene}    13 input | our render | real {m}    dE med {med_e:.1f}  noise σ {sy_o:.4f}/{sy_r:.4f}",
            fill=(240, 240, 240),
        )
        rows += [np.asarray(img), trio]

W = max(r.shape[1] for r in rows)
def pad(im):
    if im.shape[1] < W:
        z = np.zeros((im.shape[0], W - im.shape[1], 3), np.uint8)
        im = np.concatenate([im, z], 1)
    return im
sheet = np.concatenate([pad(r) for r in rows], 0)
# title
title = np.zeros((48, W, 3), np.uint8) + 14
tim = Image.fromarray(title)
ImageDraw.Draw(tim).text((12, 14), "그때 아이폰  —  iPhone 13 scene through our pipeline  |  real EXIF-confirmed JPEG", fill=(230, 230, 230))
sheet = np.concatenate([np.asarray(tim), sheet], 0)
Image.fromarray(sheet).save(OUT, quality=88)
Image.fromarray(sheet).save("/tmp/compare-real.jpg", quality=88)
Path("/tmp/compare-real/metrics.json").write_text(json.dumps(metrics, indent=2))
print("wrote", OUT, sheet.shape)
