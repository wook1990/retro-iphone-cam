# Calibration report

Fitted against EXIF-confirmed original JPEGs. GSMArena same-scene files were used only for fitting and an internal side-by-side (not redistributed). Wikimedia Commons CC photos added ISO/noise variety. See `SOURCES.md`.

The 17³ LUT maps a modern sRGB still (iPhone 13 of the same scene) to each era JPEG in display-referred RGB. Highlight bins that would have mapped white to mid-gray (a few clipped/misaligned samples) were repaired so the gray ramp is monotonic and ends at 0 and 1. Color is the LUT; residual CCM/sat in the shader stay at identity so the grade is not stacked.

## Fitted ISP values (shipped)

| Model | NR luma / chroma / radius | read e− | sharpen / halo | localTone | HDR | JPEG |
|---|---|---|---|---|---|---|
| 5s | 0.28 / 0.90 / 1.55 | 3.80 | 0.28 / 0.12 | 0 | 0 | 0.90 |
| SE | 0.30 / 0.82 / 1.25 | 2.30 | 0.325 / 0.14 | 0 | 0 | 0.90 |
| 6s | 0.34 / 0.98 / 1.45 | 3.12 | 0.36 / 0.15 | 0 | 0 | 0.90 |
| 7 | 0.25 / 0.66 / 1.10 | 1.50 | 0.325 / 0.15 | 0.08 | 0 | 0.92 |
| 8 | 0.12 / 0.40 / 1.00 | 1.27 | 0.47 / 0.18 | 0.08 | 0 | 0.93 |
| XS | 0.10 / 0.28 / 0.85 | 1.12 | 0.29 / 0.08 | 0.06 | 0.22 | 0.94 |

Edge 10–90% widths on the ISO 12233 chart were 1.5–1.75 px (sub-pixel profiles). Overshoot: 5s 0.040, SE 0.044, 6s 0.047, 7 0.046, 8 0.056, XS 0.051. Sharpen/halo follow that order (8 punchiest, 5s and XS milder halo). Apple’s JPEG quant tables do not invert to a unique IJG quality number (every post-5s sample landed on the same estimate), so era-typical encode quality was kept.

8 and XS noise-fit residuals were high because resolved table texture was counted as noise; those two NR strengths were blended back toward the previous prior. NPS often collapsed to 1 px on these JPEGs, so NR radius uses an era prior (stronger/blotchier on 5s/6s).

## Color error (deltaE76, blurred)

LUT-only, mid-gray table (most reliable color/tone score), iPhone 13 → LUT vs real:

| Model | Scene | Table median ΔE | Full-frame median ΔE |
|---|---|---|---|
| 5s | chart only | ~8 | ~6.4 after repair, chart paper still a bit less cream than the real 5s |
| SE | still_day | 3.7 | 6.2 |
| 6s | still_day | 6.3 | 10.7 before tone repair; repaired LUT is visually much closer (see compare sheet) |
| 7 | still_day | 3.3 | 6.5 |
| 8 | still_day | 3.6 | 6.9 |
| XS | still_day | 2.7 | 4.7 |

Full pipeline (lens + sensor + NR + LUT + sharpen) vs the same real JPEG, still_day median ΔE: SE 9.3, 6s 12.5, 7 9.3, 8 12.2, XS 11.3. 5s chart 13.9. Residual is local tone (13 Smart HDR vs a global LUT), vignette, and slightly lower saturation than the punchiest 6s JPEGs. Side-by-side: `samples/compare-real.jpg` (gitignored, GSMArena, not published).

## Noise sigma (high-pass residual on mid-gray)

Day still life, render / real: about 0.34–0.45× — the real “sigma” still includes table texture the older, softer lenses do not fully resolve. Low-light still life with ISO forced to the real EXIF: SE 0.55, 6s 0.68, 7 0.50, 8 0.38, XS 0.52. 6s is the noisiest of our renders at the matched ISO; 8’s real residual is inflated (texture). 5s has no GSMArena low-light still of this set; Commons ISO 80–320 frames were used in the fit.

## What’s rough

- 5s has no same-scene later still-life or low-light frame on GSMArena. Color is the chart vs iPhone 13 plus a 5s←6s LUT from the older studio and portrait scenes. The 5s cream paper and high-ISO smear are only partly matched.
- The 6s still-life is the hardest color match (warm, very saturated). The LUT is in the right direction but still a little flatter and less vivid than the real JPEG.
- A global 17³ LUT cannot copy 13’s / XS’s local tone mapping; leftover ΔE on colorful small objects is also inflated by residual misalignment.
- 8 and 7 Commons sets had little very-high-ISO material (8 tops out around ISO 100 in the CC set; GSMArena low-light for those two is ISO 100).
- Live preview is already auto-exposed sRGB; AE at ev=0 now keeps mid-gray so the LUT sees the tones it was fitted on. Low-light *noise* on an already-brightened phone preview will still be conservative unless the user raises ISO via a dark frame or EV.

## v8 punch repair (fog / haze)

v7 renders were milky: lifted blacks, crushed whites, flat midtones, soft edges. Measured against the same-scene GSMArena JPEGs (1st/99th percentile, midtone span, RMS local contrast, MTF50):

Root causes, in order:

1. **LUT mid-slope flattening.** Residual misalignment in 13→era splat regresses bins toward mid-gray. `repair_lut_tone` had forced endpoints to 0 and 1 but kept the flattened midtones (6s mid-slope 0.56). The repair now keeps fitted chroma and restores **identity luma**, so the gray ramp slope is 1.
2. **ISP shadow toe** of +0.007 linear before gamma, about +0.10 sRGB on blacks. Removed.
3. **Full cos⁴ vignette** applied on already-corrected sRGB frames, which crushed corners and pulled the full-frame white point down. The lens still uses physical radius and cos⁴, but only a residual amount (0.10–0.22, older glass more).
4. **PSF too wide.** Gaussian σ used 0.45 × Airy diameter (~2× the Airy core) plus a 0.15 floor in σ², which pinned native MTF50 around 0.18 cy/px. Now 0.21 × diameter, 0.5 × corner aberration, and a 0.02 floor.
5. **Flare** reduced to ~40% of the v7 amounts (same isotropic 4-tap model, older glass still stronger). XS HDR no longer lifts the black point.

AE at ev=0, the lens-radius/crop fix, per-model NR/sharpen/local-tone, and Bayer geometry are unchanged. A global contrast slider was not added.

Still-life midtone span and RMS local contrast now match the real JPEGs closely; black/white points are within about 0.02–0.05. Chart MTF50 is higher than v7 but still short of the punchiest real chart edges on 5s/SE/6s (era smear remains). See the v8 before/after table in the ship log.

## v9 per-model signatures

v8's identity-luma LUT, plus across-the-board cuts to vignette, flare, and PSF, made the six looks almost identical at phone size (Camden mean pairwise ΔE 4.3, min 2.3). v9 keeps v8's true blacks (curve endpoints at 0 and 1; flare only veils darker pixels next to hot sources, not a global wash).

Each model now has a 1D luma curve from histogram matching 13→era on aligned central regions, leaned slightly toward the remembered signature, plus a chroma/WB grade grounded in the real JPEGs' Lab/sat. Residual vignette and flare amounts are spread further by era; corner aberration uses the full LOOKS value again; a small view-size CA floor keeps the physical fringe readable after downsample. 8's sharpening halo is slightly stronger.

Phone-size same-source pairwise ΔE on the Camden still: mean 11.5, min 6.0. Backlit / indoor / dusk scenes: mean 11.3 / 12.7 / 14.1, min 6.5 / 6.9 / 7.3. Models do not converge. See `signatures.py` and `out/tone-curves.json`.
