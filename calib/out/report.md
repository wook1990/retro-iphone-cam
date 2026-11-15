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
