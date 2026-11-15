#!/usr/bin/env python3
"""Download EXIF-confirmed, native-resolution, CC-licensed Commons originals.
Photos land in calib/raw/commons/ (gitignored). Metadata goes to calib/out/commons-index.json.
"""
from __future__ import annotations

import json
import time
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent
RAW = ROOT / "raw" / "commons"
OUT = ROOT / "out"
API = "https://commons.wikimedia.org/w/api.php"
UA = "retro-iphone-cam-calib/1.0 (open-source camera simulator calibration; https://github.com/wook1990/retro-iphone-cam)"

# Native still sizes (landscape or portrait).
NATIVE = {
    "5s": {(3264, 2448), (2448, 3264)},
    "se": {(4032, 3024), (3024, 4032)},
    "6s": {(4032, 3024), (3024, 4032)},
    "7": {(4032, 3024), (3024, 4032)},
    "8": {(4032, 3024), (3024, 4032)},
    "xs": {(4032, 3024), (3024, 4032)},
}

CATEGORIES = {
    "5s": "Category:Taken with iPhone 5S",
    "se": "Category:Taken with iPhone SE (1st generation)",
    "6s": "Category:Taken with iPhone 6S",
    "7": "Category:Taken with iPhone 7",
    "8": "Category:Taken with iPhone 8",
    "xs": "Category:Taken with iPhone XS",
}

MODEL_OK = {
    "5s": {"iphone 5s", "iphone5s"},
    "se": {"iphone se", "iphone se 1st generation"},
    "6s": {"iphone 6s", "iphone6s"},
    "7": {"iphone 7", "iphone7"},
    "8": {"iphone 8", "iphone8"},
    "xs": {"iphone xs", "iphonexs"},
}

# Main camera: 5s/SE/6s f/2.2 ~4.12-4.15mm; 7/8 f/1.8 3.99mm; XS f/1.8 4.25mm.
OPTICS = {
    "5s": {"f": (2.1, 2.3), "fl": (4.0, 4.3)},
    "se": {"f": (2.1, 2.3), "fl": (4.0, 4.3)},
    "6s": {"f": (2.1, 2.3), "fl": (4.0, 4.3)},
    "7": {"f": (1.7, 1.9), "fl": (3.85, 4.15)},
    "8": {"f": (1.7, 1.9), "fl": (3.85, 4.15)},
    "xs": {"f": (1.7, 1.9), "fl": (4.10, 4.40)},
}

SOFT_BAD = (
    "snapseed", "vsco", "instagram", "photoshop", "lightroom", "affinity",
    "gimp", "afterlight", "facetune", "prisma", "picsart", "pixelmator",
    "darkroom", "foodie", "vsco cam", "edited with", "rni films", "hypocam",
    "camera+", "procamera", "halide", "obermoment", "lightroom mobile",
)

LICENSES_OK = {
    "cc0", "cc by", "cc-by", "cc by-sa", "cc-by-sa", "cc by-sa 2.0",
    "cc by-sa 3.0", "cc by-sa 4.0", "cc by 2.0", "cc by 3.0", "cc by 4.0",
    "cc by-sa 2.0 generic", "cc by-sa 3.0 unported", "cc by-sa 4.0 international",
    "cc by 2.0 generic", "cc by 3.0 unported", "cc by 4.0 international",
    "public domain", "pd", "pd-self", "cc0 1.0", "cc0 1.0 universal",
    "creative commons attribution", "creative commons attribution-share alike",
}

MAX_PER_MODEL = 14
SCAN_LIMIT = 2500
SLEEP = 0.12


def api(params: dict) -> dict:
    params = dict(params)
    params.setdefault("format", "json")
    params.setdefault("formatversion", "2")
    req = urllib.request.Request(
        API + "?" + urllib.parse.urlencode(params),
        headers={"User-Agent": UA},
    )
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.loads(r.read().decode("utf-8"))


def get_exif_map(metadata) -> dict:
    out = {}
    if not metadata:
        return out
    for item in metadata:
        name = str(item.get("name") or "")
        val = item.get("value")
        if isinstance(val, dict) and "value" in val:
            val = val["value"]
        out[name] = val
        # nested
        if isinstance(item.get("value"), dict):
            inner = item["value"]
            if isinstance(inner, list):
                for sub in inner:
                    if isinstance(sub, dict) and "name" in sub:
                        sv = sub.get("value")
                        if isinstance(sv, dict) and "value" in sv:
                            sv = sv["value"]
                        out[sub["name"]] = sv
    return out


def num(v):
    if v is None:
        return None
    if isinstance(v, (int, float)):
        return float(v)
    s = str(v).strip()
    if "/" in s:
        a, b = s.split("/", 1)
        try:
            return float(a) / float(b)
        except Exception:
            return None
    try:
        return float(s)
    except Exception:
        return None


def license_ok(short: str, rights: str) -> bool:
    blob = f"{short} {rights}".lower()
    if "creative commons attribution" in blob or "public domain" in blob or "cc0" in blob:
        # reject NC/ND
        if "noncommercial" in blob or "no deriv" in blob or "nd " in blob or "-nd" in blob or "nc " in blob or "-nc" in blob:
            if "share alike" not in blob and "attribution-share" not in blob:
                # still reject NC/ND even if somehow mixed
                return False
        if "noncommercial" in blob or "-nc" in blob or "nc-" in blob:
            return False
        if "no deriv" in blob or "-nd" in blob or "nd-" in blob:
            return False
        return True
    key = short.lower().strip()
    for ok in LICENSES_OK:
        if ok == key or key.startswith(ok + " "):
            return True
    return False


def software_ok(sw: str) -> bool:
    if not sw:
        return True
    s = str(sw).lower()
    if any(b in s for b in SOFT_BAD):
        return False
    return True


def model_ok(key: str, model: str) -> bool:
    if not model:
        return False
    m = str(model).lower().replace("apple", "").strip()
    m = " ".join(m.split())
    if key == "se":
        # reject 2nd/3rd gen if the string says so; category already filters
        if "2nd" in m or "3rd" in m or "(2" in m or "2020" in m or "2022" in m:
            return False
    if key == "7" and ("plus" in m or "7p" in m):
        return False
    if key == "8" and ("plus" in m or "8p" in m):
        return False
    if key == "xs" and "max" in m:
        return False
    if key == "6s" and "plus" in m:
        return False
    return m in MODEL_OK[key] or m.replace(" ", "") in {x.replace(" ", "") for x in MODEL_OK[key]}


def pick_spread(cands: list[dict], n: int) -> list[dict]:
    """Prefer a spread of ISO and a mix of orientations, then fill."""
    if len(cands) <= n:
        return cands
    cands = sorted(cands, key=lambda c: (c.get("iso") is None, c.get("iso") or 0, c["title"]))
    buckets = { "low": [], "mid": [], "high": [], "unk": [] }
    for c in cands:
        iso = c.get("iso")
        if iso is None:
            buckets["unk"].append(c)
        elif iso <= 64:
            buckets["low"].append(c)
        elif iso <= 200:
            buckets["mid"].append(c)
        else:
            buckets["high"].append(c)
    picked = []
    # take from high first (noise), then mid, low
    order = ["high", "mid", "low", "unk"]
    i = 0
    while len(picked) < n and i < 200:
        for k in order:
            if buckets[k]:
                picked.append(buckets[k].pop(0))
                if len(picked) >= n:
                    break
        i += 1
        if all(not buckets[k] for k in order):
            break
    return picked[:n]


def scan_model(key: str) -> list[dict]:
    cat = CATEGORIES[key]
    print(f"== scanning {key}: {cat}", flush=True)
    cont = None
    seen = 0
    sized = []
    while seen < SCAN_LIMIT:
        params = {
            "action": "query",
            "generator": "categorymembers",
            "gcmtitle": cat,
            "gcmtype": "file",
            "gcmlimit": "50",
            "gcmsort": "timestamp",
            "gcmdir": "desc",
            "prop": "imageinfo",
            "iiprop": "url|size|mime|extmetadata",
        }
        if cont:
            params["gcmcontinue"] = cont
        try:
            data = api(params)
        except Exception as e:
            print("  api error", e, flush=True)
            time.sleep(1.5)
            try:
                data = api(params)
            except Exception as e2:
                print("  api fail", e2, flush=True)
                break
        pages = (data.get("query") or {}).get("pages") or []
        for p in pages:
            seen += 1
            infos = p.get("imageinfo") or []
            if not infos:
                continue
            info = infos[0]
            if info.get("mime") != "image/jpeg":
                continue
            w, h = info.get("width") or 0, info.get("height") or 0
            if (w, h) not in NATIVE[key]:
                continue
            ext = info.get("extmetadata") or {}
            lic = (ext.get("LicenseShortName") or {}).get("value") or ""
            rights = (ext.get("UsageTerms") or {}).get("value") or (ext.get("License") or {}).get("value") or ""
            if not license_ok(lic, rights):
                continue
            artist = (ext.get("Artist") or {}).get("value") or ""
            # strip html lightly
            if "<" in artist:
                import re
                artist = re.sub(r"<[^>]+>", " ", artist)
                artist = " ".join(artist.split())
            sized.append({
                "title": p.get("title") or "",
                "pageid": p.get("pageid"),
                "width": w,
                "height": h,
                "url": info.get("url"),
                "descriptionurl": info.get("descriptionurl"),
                "license": lic,
                "rights": rights,
                "artist": artist,
            })
        cont = (data.get("continue") or {}).get("gcmcontinue")
        if not cont:
            break
        time.sleep(SLEEP)
        if seen % 500 == 0:
            print(f"  scanned {seen}, size+license hits {len(sized)}", flush=True)
        # enough dimensional hits to get a spread after EXIF filter
        if len(sized) >= 80:
            break
    print(f"  scanned {seen} files, {len(sized)} native CC jpegs", flush=True)

    # EXIF in batches of 20
    good = []
    for i in range(0, len(sized), 20):
        chunk = sized[i:i+20]
        titles = "|".join(c["title"] for c in chunk)
        try:
            data = api({
                "action": "query",
                "titles": titles,
                "prop": "imageinfo",
                "iiprop": "metadata",
            })
        except Exception as e:
            print("  metadata error", e, flush=True)
            time.sleep(1)
            continue
        by_title = {}
        for p in (data.get("query") or {}).get("pages") or []:
            infos = p.get("imageinfo") or []
            meta = infos[0].get("metadata") if infos else None
            by_title[p.get("title")] = get_exif_map(meta)
        time.sleep(SLEEP)
        for c in chunk:
            ex = by_title.get(c["title"]) or {}
            model = ex.get("Model") or ex.get("CameraModelName") or ""
            software = ex.get("Software") or ""
            fnum = num(ex.get("FNumber") or ex.get("ApertureValue"))
            fl = num(ex.get("FocalLength"))
            iso = num(ex.get("ISOSpeedRatings") or ex.get("PhotographicSensitivity") or ex.get("ISO"))
            # 35mm zoom check
            fl35 = num(ex.get("FocalLengthIn35mmFilm"))
            if not model_ok(key, model):
                continue
            if not software_ok(software):
                continue
            opt = OPTICS[key]
            if fnum is not None and not (opt["f"][0] <= fnum <= opt["f"][1]):
                continue
            if fl is not None and not (opt["fl"][0] <= fl <= opt["fl"][1]):
                continue
            if fl35 is not None and fl35 > 40:  # main is ~26-29mm
                continue
            c = dict(c)
            c.update({
                "model": model,
                "software": software,
                "fnumber": fnum,
                "focal": fl,
                "iso": int(iso) if iso else None,
                "fl35": fl35,
            })
            good.append(c)
    print(f"  exif-ok {len(good)}", flush=True)
    return pick_spread(good, MAX_PER_MODEL)


def download(item: dict, key: str) -> Path | None:
    RAW.mkdir(parents=True, exist_ok=True)
    # safe filename
    title = item["title"].replace("File:", "").replace(" ", "_")
    safe = "".join(ch if ch.isalnum() or ch in "._-" else "_" for ch in title)
    if len(safe) > 120:
        safe = safe[:120]
    dest = RAW / f"{key}__{safe}"
    if not dest.suffix.lower() in (".jpg", ".jpeg"):
        dest = dest.with_suffix(".jpg")
    if dest.exists() and dest.stat().st_size > 100_000:
        return dest
    req = urllib.request.Request(item["url"], headers={"User-Agent": UA})
    try:
        with urllib.request.urlopen(req, timeout=90) as r:
            data = r.read()
        dest.write_bytes(data)
        return dest
    except Exception as e:
        print("  download fail", item["title"], e, flush=True)
        return None


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    index = {}
    for key in ("5s", "se", "6s", "7", "8", "xs"):
        picked = scan_model(key)
        rows = []
        for item in picked:
            path = download(item, key)
            time.sleep(SLEEP)
            rec = dict(item)
            rec["local"] = str(path) if path else None
            if path:
                rec["bytes"] = path.stat().st_size
            rows.append(rec)
            iso = rec.get("iso")
            print(f"  saved {key} ISO{iso} {rec.get('local')}", flush=True)
        index[key] = rows
        (OUT / "commons-index.json").write_text(json.dumps(index, indent=2, ensure_ascii=False))
    print("done", {k: len(v) for k, v in index.items()})


if __name__ == "__main__":
    main()
