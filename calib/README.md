# Calibration

Scripts and small fitted outputs for 그때 아이폰. Downloaded originals stay in `raw/` (gitignored) and are not published.

- `collect_commons.py` — Wikimedia Commons crawl (native res, EXIF model, main camera, CC license).
- `fit.py` — align GSMArena same-scene JPEGs, fit a 17³ LUT, tone, sharpening, and noise; write `out/looks.json` and `out/lut.png`.
- `make_compare.py` — side-by-side of a real JPEG vs. our render (used by `test/compare-real.mjs`).
- `scenes.json` — GSMArena filename map.
- `SOURCES.md` — URLs and licenses.
- `out/` — fitted LUT, looks, and a short report.

Run (after `python3 -m venv calib/.venv` and installing `numpy pillow opencv-python-headless scipy`):

```bash
calib/.venv/bin/python calib/collect_commons.py
calib/.venv/bin/python calib/fit.py
```

Copy `out/lut.png` to the app root as `lut.png` (the fitter does this).
