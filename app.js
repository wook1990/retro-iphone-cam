/* 그때 아이폰 — physically based old-iPhone camera simulation. */
"use strict";

/*
  Sensor figures (public specs vs estimates):
  - Pixel pitch, resolution, f-number, focal length: Apple / GSMArena /
    AnandTech (Klug) / camera-wiki.org. 5s 8MP 1.5µm 1/3" f/2.2 4.12mm;
    SE/6s 12MP 1.22µm 1/3" f/2.2 (SE shares the 6s-class IMX315);
    7/8 12MP 1.22µm f/1.8 3.99mm + OIS; XS 12MP 1.4µm 1/2.55" f/1.8.
  - ISO still ranges: EXIF / review surveys (Frame & Focal: 5s max 1600,
    6s max 3200; Apple camera compatibility lists 8-series around ISO 22).
    7 and XS still max ISO are estimates in the same family (20–3200, 16–3200).
  - Full-well and read noise are not published by Apple. Estimated from
    typical BSI CMOS scaling (~2.5–3.5 ke−/µm² well, read noise falling
    across 2013–2018 processes). 5s ~6500 e− / 3.8 e−; 6s/SE ~4200 / 2.4;
    7 ~4800 / 2.0; 8 ~5000 / 1.7; XS ~8000 / 1.5.
  - Max handheld shutter: ~1/17s without OIS (5s, SE, 6s), ~1/4s with OIS
    (7, 8, XS).
*/

const LOOKS = [
  {
    id: "5s", name: "5s", year: "2013",
    width: 3264, height: 2448, jpeg: 0.9,
    aperture: 2.2, focalMm: 4.12, sensorDiagMm: 6.0, pitchUm: 1.5,
    fwc: 6500, read: 3.8, fpn: 0.6,
    isoMin: 32, isoMax: 1600, tMax: 1 / 17,
    aberrPx: 3.6, flare: 0.22, vig: 0.42, ca: 4.0, caView: 1.1,
    nrLuma: 0.28, nrChroma: 0.9, nrRadius: 1.55,
    sharpen: 0.28, halo: 0.12,
    wb: [1, 1, 1],
    ccm: [1, 0, 0, 0, 1, 0, 0, 0, 1],
    sat: 1, contrast: 1, mid: 0,
    shoulder: 0, shoulderStart: 0.82,
    localTone: 0, hdr: 0, lutRow: 0,
  },
  {
    id: "se", name: "SE", year: "2016",
    width: 4032, height: 3024, jpeg: 0.9,
    aperture: 2.2, focalMm: 4.15, sensorDiagMm: 6.0, pitchUm: 1.22,
    fwc: 4200, read: 2.3, fpn: 0.4,
    isoMin: 25, isoMax: 3200, tMax: 1 / 17,
    aberrPx: 2.3, flare: 0.10, vig: 0.30, ca: 2.5, caView: 0.6,
    nrLuma: 0.3, nrChroma: 0.82, nrRadius: 1.25,
    sharpen: 0.325, halo: 0.1398,
    wb: [1, 1, 1],
    ccm: [1, 0, 0, 0, 1, 0, 0, 0, 1],
    sat: 1, contrast: 1, mid: 0,
    shoulder: 0, shoulderStart: 0.82,
    localTone: 0, hdr: 0, lutRow: 17,
  },
  {
    id: "6s", name: "6s", year: "2015",
    width: 4032, height: 3024, jpeg: 0.9,
    aperture: 2.2, focalMm: 4.15, sensorDiagMm: 6.0, pitchUm: 1.22,
    fwc: 4200, read: 3.12, fpn: 0.45,
    isoMin: 25, isoMax: 3200, tMax: 1 / 17,
    aberrPx: 2.5, flare: 0.14, vig: 0.36, ca: 2.8, caView: 0.7,
    nrLuma: 0.34, nrChroma: 0.98, nrRadius: 1.45,
    sharpen: 0.3575, halo: 0.1518,
    wb: [1, 1, 1],
    ccm: [1, 0, 0, 0, 1, 0, 0, 0, 1],
    sat: 1, contrast: 1, mid: 0,
    shoulder: 0, shoulderStart: 0.82,
    localTone: 0, hdr: 0, lutRow: 34,
  },
  {
    id: "7", name: "7", year: "2016",
    width: 4032, height: 3024, jpeg: 0.92,
    aperture: 1.8, focalMm: 3.99, sensorDiagMm: 6.0, pitchUm: 1.22,
    fwc: 4800, read: 1.5, fpn: 0.3,
    isoMin: 20, isoMax: 3200, tMax: 1 / 4,
    aberrPx: 1.5, flare: 0.07, vig: 0.20, ca: 1.6, caView: 0.35,
    nrLuma: 0.25, nrChroma: 0.66, nrRadius: 1.1,
    sharpen: 0.325, halo: 0.1463,
    wb: [1, 1, 1],
    ccm: [1, 0, 0, 0, 1, 0, 0, 0, 1],
    sat: 1, contrast: 1, mid: 0,
    shoulder: 0, shoulderStart: 0.82,
    localTone: 0.08, hdr: 0, lutRow: 51,
  },
  {
    id: "8", name: "8", year: "2017",
    width: 4032, height: 3024, jpeg: 0.93,
    aperture: 1.8, focalMm: 3.99, sensorDiagMm: 6.0, pitchUm: 1.22,
    fwc: 5000, read: 1.275, fpn: 0.25,
    isoMin: 22, isoMax: 2500, tMax: 1 / 4,
    aberrPx: 1.2, flare: 0.05, vig: 0.16, ca: 1.2, caView: 0.25,
    nrLuma: 0.12, nrChroma: 0.4, nrRadius: 1,
    sharpen: 0.50, halo: 0.22,
    wb: [1, 1, 1],
    ccm: [1, 0, 0, 0, 1, 0, 0, 0, 1],
    sat: 1, contrast: 1, mid: 0,
    shoulder: 0, shoulderStart: 0.82,
    localTone: 0.08, hdr: 0, lutRow: 68,
  },
  {
    id: "xs", name: "XS", year: "2018",
    width: 4032, height: 3024, jpeg: 0.94,
    aperture: 1.8, focalMm: 4.25, sensorDiagMm: 7.06, pitchUm: 1.4,
    fwc: 8000, read: 1.125, fpn: 0.18,
    isoMin: 16, isoMax: 3200, tMax: 1 / 4,
    aberrPx: 0.7, flare: 0.03, vig: 0.08, ca: 0.8, caView: 0.12,
    nrLuma: 0.1, nrChroma: 0.28, nrRadius: 0.85,
    sharpen: 0.29, halo: 0.08,
    wb: [1, 1, 1],
    ccm: [1, 0, 0, 0, 1, 0, 0, 0, 1],
    sat: 1, contrast: 1, mid: 0,
    shoulder: 0, shoulderStart: 0.82,
    localTone: 0.06, hdr: 0.22, lutRow: 85,
  }
];

const lutImage = new Image();
lutImage.src = "./lut.png";
const lutReady = new Promise((resolve) => {
  if (lutImage.complete && lutImage.naturalWidth) resolve(true);
  lutImage.onload = () => resolve(true);
  lutImage.onerror = () => resolve(false);
});

const VS = `
attribute vec2 aPos;
varying vec2 vUv;
void main() {
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}
`;

const COMMON = `
precision highp float;
uniform sampler2D uTex;
uniform vec2 uRes;
uniform float uLinEnc;
varying vec2 vUv;

vec3 encLin(vec3 c) {
  return uLinEnc > 0.5 ? sqrt(max(c, 0.0)) : c;
}
vec3 decLin(vec3 c) {
  return uLinEnc > 0.5 ? c * c : max(c, 0.0);
}
float lum(vec3 c) {
  return dot(c, vec3(0.2126, 0.7152, 0.0722));
}
vec3 toLinear(vec3 s) {
  return pow(max(s, 0.0), vec3(2.2));
}
vec3 toGamma(vec3 l) {
  return pow(max(l, 0.0), vec3(1.0 / 2.2));
}
vec3 hash33(vec3 p3) {
  p3 = fract(p3 * vec3(0.1031, 0.1030, 0.0973));
  p3 += dot(p3, p3.yxz + 33.33);
  return fract((p3.xxy + p3.yxx) * p3.zyx);
}
float hash13(vec3 p3) {
  p3 = fract(p3 * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
vec3 gauss3(vec3 p) {
  vec3 u = max(hash33(p), vec3(1.0e-4));
  vec3 v = hash33(p + vec3(19.17, 7.31, 13.83));
  return clamp(sqrt(-2.0 * log(u)) * cos(6.28318530718 * v), -4.0, 4.0);
}
`;

const FS_LENS = COMMON + `
uniform vec2 uCropOrigin;
uniform vec2 uCropSize;
uniform float uMirror;
uniform float uCAPx;
uniform vec2 uHalfMm;
uniform float uFocalMm;
uniform float uHalfDiagMm;
uniform float uFlare;
uniform float uVigAmt;

vec3 srcLin(vec2 uv) {
  vec2 t = uCropOrigin + uv * uCropSize;
  t.x = mix(t.x, uCropOrigin.x + uCropSize.x - (t.x - uCropOrigin.x), uMirror);
  return toLinear(texture2D(uTex, t).rgb);
}

void main() {
  vec2 uv = vUv;
  // Physical radius on the cropped sensor, in mm. UV radius is not used:
  // on a non-square frame it would treat every mid-edge as the corner and
  // squash the optics into a circular "loupe" in UV space.
  vec2 mm = (uv * 2.0 - 1.0) * uHalfMm;
  float rMm = length(mm);
  float rNorm = rMm / max(uHalfDiagMm, 0.0001);
  // Lateral CA is a tiny per-channel pixel offset along the true radial
  // direction. Green is the geometry reference and is never shifted, so
  // there is no magnification or barrel term.
  vec2 pix = (uv - 0.5) * uRes;
  float rPx = length(pix);
  vec2 dirPx = rPx > 0.0001 ? pix / rPx : vec2(0.0);
  vec2 uvOff = dirPx * (uCAPx * rNorm * rNorm) / uRes;
  vec3 c;
  c.r = srcLin(uv + uvOff).r;
  c.g = srcLin(uv).g;
  c.b = srcLin(uv - uvOff).b;
  float theta = atan(rMm / max(uFocalMm, 0.01));
  // Input is already a vignette-corrected sRGB frame, so only the
  // residual uncorrected falloff of that era's JPEG is applied.
  float vigNat = pow(max(cos(theta), 0.0), 4.0);
  float vig = mix(1.0, vigNat, clamp(uVigAmt, 0.0, 1.0));
  c *= vig;
  if (uFlare > 0.001) {
    // Veiling flare around bright sources (sun, lamps, backlight), not
    // a wash on already-bright flats — that was the v7 global haze.
    vec2 o1 = vec2(0.04 * uRes.y, 0.04 * uRes.y) / uRes;
    vec2 o2 = vec2(0.09 * uRes.y, 0.09 * uRes.y) / uRes;
    vec3 h = vec3(0.0);
    h += srcLin(uv + vec2(o1.x, 0.0));
    h += srcLin(uv - vec2(o1.x, 0.0));
    h += srcLin(uv + vec2(0.0, o1.y));
    h += srcLin(uv - vec2(0.0, o1.y));
    h += srcLin(uv + vec2(o2.x, 0.0)) * 0.5;
    h += srcLin(uv - vec2(o2.x, 0.0)) * 0.5;
    h += srcLin(uv + vec2(0.0, o2.y)) * 0.5;
    h += srcLin(uv - vec2(0.0, o2.y)) * 0.5;
    h *= 1.0 / 6.0;
    float hY = lum(h);
    float cY = lum(c);
    float gate = smoothstep(0.55, 0.85, hY) * smoothstep(0.0, 0.25, hY - cY);
    c += max(h - c, 0.0) * uFlare * gate;
  }
  gl_FragColor = vec4(encLin(max(c, 0.0)), 1.0);
}
`;

const FS_BLUR = COMMON + `
uniform vec2 uDir;
uniform float uDiffPx;
uniform float uAberrPx;
uniform vec2 uHalfMm;
uniform float uHalfDiagMm;

void main() {
  vec2 uv = vUv;
  vec2 mm = (uv * 2.0 - 1.0) * uHalfMm;
  float rNorm = length(mm) / max(uHalfDiagMm, 0.0001);
  // 0.21 × Airy diameter is the Gaussian σ of the diffraction core.
  // 0.45 was ~2× too wide and pinned native MTF50 around 0.18 cy/px.
  float sigma = uDiffPx * 0.21 + uAberrPx * rNorm * rNorm;
  vec2 step = uDir / uRes;
  vec3 acc = decLin(texture2D(uTex, uv).rgb);
  float wsum = 1.0;
  // 9-tap Gaussian, constant loop
  for (int i = 1; i <= 4; i++) {
    float x = float(i);
    float w = exp(-0.5 * x * x / (sigma * sigma + 0.02));
    acc += decLin(texture2D(uTex, uv + step * x).rgb) * w;
    acc += decLin(texture2D(uTex, uv - step * x).rgb) * w;
    wsum += 2.0 * w;
  }
  gl_FragColor = vec4(encLin(acc / wsum), 1.0);
}
`;

const FS_SENSOR = COMMON + `
uniform float uFwc;
uniform float uRead;
uniform float uFpn;
uniform float uIso;
uniform float uIsoMin;
uniform float uElectrons;
uniform float uSeed;

void main() {
  vec2 pix = floor(vUv * uRes);
  vec3 lin = decLin(texture2D(uTex, vUv).rgb);
  float mx = mod(pix.x, 2.0);
  float my = mod(pix.y, 2.0);
  float eMean;
  if (mx < 0.5 && my < 0.5) eMean = lin.r;
  else if (mx > 0.5 && my > 0.5) eMean = lin.b;
  else eMean = lin.g;
  eMean *= uElectrons;
  vec3 pid = vec3(pix, uSeed);
  float gShot = gauss3(pid).x;
  float sigma = sqrt(max(eMean, 0.0));
  float e = eMean + gShot * sigma;
  e += gauss3(pid + vec3(3.1, 8.7, 1.4)).y * uRead;
  e += (hash13(vec3(pix, 11.0)) - 0.5) * uFpn * 2.0;
  e = clamp(e, 0.0, uFwc);
  float gain = uIso / max(uIsoMin, 1.0);
  float dn = floor(clamp(e * gain * (1023.0 / uFwc), 0.0, 1023.0) + 0.5);
  float v = dn / 1023.0;
  gl_FragColor = vec4(v, v, v, 1.0);
}
`;

const FS_DEMO = COMMON + `
uniform vec3 uWB;
uniform mat3 uCCM;
uniform float uSat;

float rawAt(vec2 uv) {
  return texture2D(uTex, uv).r;
}

vec3 demosaic(vec2 uv) {
  vec2 px = 1.0 / uRes;
  vec2 pix = floor(uv * uRes);
  float mx = mod(pix.x, 2.0);
  float my = mod(pix.y, 2.0);
  float c = rawAt(uv);
  float l = rawAt(uv + vec2(-px.x, 0.0));
  float r = rawAt(uv + vec2(px.x, 0.0));
  float d = rawAt(uv + vec2(0.0, -px.y));
  float u = rawAt(uv + vec2(0.0, px.y));
  float ul = rawAt(uv + vec2(-px.x, px.y));
  float ur = rawAt(uv + vec2(px.x, px.y));
  float dl = rawAt(uv + vec2(-px.x, -px.y));
  float dr = rawAt(uv + vec2(px.x, -px.y));
  float gh = 0.5 * (l + r);
  float gv = 0.5 * (u + d);
  float dh = abs(l - r);
  float dv = abs(u - d);
  float gEdge = dh < dv ? gh : gv;
  vec3 rgb;
  if (mx < 0.5 && my < 0.5) {
    rgb = vec3(c, gEdge, 0.25 * (ul + ur + dl + dr));
  } else if (mx > 0.5 && my > 0.5) {
    rgb = vec3(0.25 * (ul + ur + dl + dr), gEdge, c);
  } else if (mx > 0.5 && my < 0.5) {
    rgb = vec3(0.5 * (l + r), c, 0.5 * (u + d));
  } else {
    rgb = vec3(0.5 * (u + d), c, 0.5 * (l + r));
  }
  return rgb;
}

void main() {
  vec3 c = demosaic(vUv);
  c *= uWB;
  c = uCCM * c;
  float y = lum(max(c, 0.0));
  c = mix(vec3(y), c, uSat);
  gl_FragColor = vec4(encLin(max(c, 0.0)), 1.0);
}
`;

const FS_ISP = COMMON + `
uniform float uNrLuma;
uniform float uNrChroma;
uniform float uNrRadius;
uniform float uSharpen;
uniform float uHalo;
uniform float uContrast;
uniform float uMid;
uniform float uShoulder;
uniform float uShoulderStart;
uniform float uHdr;
uniform float uLocalTone;
uniform float uIsoNorm;
uniform sampler2D uLUT;
uniform float uLutRow;
uniform vec2 uLutSize;
uniform float uUseLut;

vec3 applyLut(vec3 c) {
  c = clamp(c, 0.0, 1.0);
  float b = c.b * 16.0;
  float b0 = min(floor(b), 15.0);
  float f = b - b0;
  float y = (uLutRow + c.g * 16.0 + 0.5) / uLutSize.y;
  float x0 = (b0 * 17.0 + c.r * 16.0 + 0.5) / uLutSize.x;
  float x1 = (min(b0 + 1.0, 16.0) * 17.0 + c.r * 16.0 + 0.5) / uLutSize.x;
  return mix(texture2D(uLUT, vec2(x0, y)).rgb, texture2D(uLUT, vec2(x1, y)).rgb, f);
}

void main() {
  vec2 px = 1.0 / uRes;
  vec3 c0 = decLin(texture2D(uTex, vUv).rgb);
  vec3 n1 = decLin(texture2D(uTex, vUv + vec2(px.x, 0.0)).rgb);
  vec3 n2 = decLin(texture2D(uTex, vUv - vec2(px.x, 0.0)).rgb);
  vec3 n3 = decLin(texture2D(uTex, vUv + vec2(0.0, px.y)).rgb);
  vec3 n4 = decLin(texture2D(uTex, vUv - vec2(0.0, px.y)).rgb);
  vec3 n5 = decLin(texture2D(uTex, vUv + vec2(2.0 * px.x, 0.0)).rgb);
  vec3 n6 = decLin(texture2D(uTex, vUv - vec2(2.0 * px.x, 0.0)).rgb);
  vec3 n7 = decLin(texture2D(uTex, vUv + vec2(0.0, 2.0 * px.y)).rgb);
  vec3 n8 = decLin(texture2D(uTex, vUv - vec2(0.0, 2.0 * px.y)).rgb);
  vec3 blur = (c0 * 0.2 + (n1 + n2 + n3 + n4) * 0.125 + (n5 + n6 + n7 + n8) * 0.075);
  vec3 wide = (c0 + n1 + n2 + n3 + n4 + n5 + n6 + n7 + n8) / 9.0;
  float y0 = lum(c0);
  float isoK = 0.45 + 0.55 * clamp(uIsoNorm, 0.0, 1.0);
  float shadowK = 1.0 + 0.4 * (1.0 - smoothstep(0.03, 0.28, y0));
  float rMix = clamp((uNrRadius - 0.7) / 1.2, 0.0, 1.0);
  vec3 nrBlur = mix(blur, wide, rMix);
  float yb = lum(nrBlur);
  float hdrShadow = 1.0 + 0.8 * uHdr * (1.0 - smoothstep(0.0, 0.2, y0));
  float y = mix(y0, yb, clamp(uNrLuma * isoK * hdrShadow, 0.0, 0.75));
  vec3 ch = mix(c0 - vec3(y0), nrBlur - vec3(yb), clamp(uNrChroma * isoK * shadowK, 0.0, 0.95));
  vec3 c = max(vec3(y) + ch, 0.0);

  if (uLocalTone > 0.0) {
    float yNow = lum(c);
    float midW = smoothstep(0.05, 0.18, yNow) * (1.0 - smoothstep(0.65, 0.95, yNow));
    c = max(c + (c - wide) * (uLocalTone * midW), 0.0);
  }

  if (uHdr > 0.0) {
    // Highlight roll-off + a little local contrast. Do not lift the
    // black point: real XS JPEGs keep true blacks.
    float localK = 0.10 * uHdr;
    c = max(c + (c - wide) * localK, 0.0);
    float y2 = lum(c);
    c *= (y2 / (1.0 + max(y2 - 0.85, 0.0) * uHdr * 0.45)) / max(y2, 1.0e-4);
  }

  if (uShoulder > 0.0) {
    float y4 = lum(c);
    c *= 1.0 / (1.0 + max(y4 - uShoulderStart, 0.0) * uShoulder);
  }

  c = toGamma(max(c, 0.0));
  float yg = lum(c);
  float t = clamp(yg, 0.0, 1.0);
  float k = clamp((uContrast - 1.0) * 1.8, -1.0, 1.0);
  float s = t * t * (3.0 - 2.0 * t);
  float yk = mix(t, s, k) + uMid * 0.15 * t;
  c *= (clamp(yk, 0.0, 1.4) / max(yg, 1.0e-4));

  if (uUseLut > 0.5) {
    c = applyLut(clamp(c, 0.0, 1.0));
  }

  float ybG = pow(max(yb, 0.0), 1.0 / 2.2);
  float ywG = pow(max(lum(wide), 0.0), 1.0 / 2.2);
  float yNow = lum(c);
  c *= (yNow + (yNow - ybG) * uSharpen) / max(yNow, 1.0e-4);
  float edge = max(ybG - ywG, 0.0);
  c += vec3(1.0, 0.98, 0.92) * edge * uHalo * 2.4;

  gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0);
}
`;

function compile(gl, type, src) {
  const sh = gl.createShader(type);
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    throw new Error(gl.getShaderInfoLog(sh) || "shader compile failed");
  }
  return sh;
}

function makeProgram(gl, fs) {
  const prog = gl.createProgram();
  gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VS));
  gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    throw new Error(gl.getProgramInfoLog(prog) || "shader link failed");
  }
  const uni = {};
  const n = gl.getProgramParameter(prog, gl.ACTIVE_UNIFORMS);
  for (let i = 0; i < n; i++) {
    const info = gl.getActiveUniform(prog, i);
    uni[info.name.replace("[0]", "")] = gl.getUniformLocation(prog, info.name);
  }
  return { prog, uni };
}

function bindQuad(gl, prog) {
  const loc = gl.getAttribLocation(prog, "aPos");
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
}

function makePipeline(canvas) {
  const gl = canvas.getContext("webgl", {
    preserveDrawingBuffer: true,
    alpha: false,
    antialias: false,
    premultipliedAlpha: false,
  });
  if (!gl) throw new Error("WebGL을 쓸 수 없어요.");
  const extHalf = gl.getExtension("OES_texture_half_float");
  const extBuf = gl.getExtension("EXT_color_buffer_half_float") ||
    gl.getExtension("WEBGL_color_buffer_float");
  gl.getExtension("OES_texture_half_float_linear");
  let useHalf = false;
  let halfType = null;
  if (extHalf && extBuf) {
    halfType = extHalf.HALF_FLOAT_OES;
    const test = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, test);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 2, 2, 0, gl.RGBA, halfType, null);
    const fb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, test, 0);
    useHalf = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.deleteFramebuffer(fb);
    gl.deleteTexture(test);
  }

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);

  const lens = makeProgram(gl, FS_LENS);
  const blur = makeProgram(gl, FS_BLUR);
  const sensor = makeProgram(gl, FS_SENSOR);
  const demo = makeProgram(gl, FS_DEMO);
  const isp = makeProgram(gl, FS_ISP);

  const srcTex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, srcTex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  function makeTarget() {
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    const fbo = gl.createFramebuffer();
    return { tex, fbo, w: 0, h: 0 };
  }

  const targets = [makeTarget(), makeTarget()];

  function resizeTarget(t, w, h) {
    if (t.w === w && t.h === h) return;
    gl.bindTexture(gl.TEXTURE_2D, t.tex);
    if (useHalf) {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, halfType, null);
    } else {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, t.fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t.tex, 0);
    t.w = w;
    t.h = h;
  }

  const lutTex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, lutTex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, 1, 1, 0, gl.RGB, gl.UNSIGNED_BYTE, new Uint8Array([128, 128, 128]));
  let lutUploaded = false;
  let lutSize = [1, 1];
  function uploadLut() {
    if (lutUploaded) return true;
    if (!lutImage.complete || !lutImage.naturalWidth) return false;
    const w = lutImage.naturalWidth;
    const h = lutImage.naturalHeight;
    const cnv = document.createElement("canvas");
    cnv.width = w;
    cnv.height = h;
    const ctx = cnv.getContext("2d");
    ctx.drawImage(lutImage, 0, 0);
    const data = ctx.getImageData(0, 0, w, h);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, lutTex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    const pixels = new Uint8Array(data.data.buffer, data.data.byteOffset, data.data.byteLength);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    const err = gl.getError();
    gl.activeTexture(gl.TEXTURE0);
    lutSize = [w, h];
    lutUploaded = err === 0;
    return lutUploaded;
  }

  return { gl, lens, blur, sensor, demo, isp, srcTex, targets, useHalf, buf, resizeTarget, lutTex, uploadLut, get lutUploaded() { return lutUploaded; }, get lutSize() { return lutSize; } };
}

const $ = (id) => document.getElementById(id);
const video = $("video");
const view = $("view");
const glCanvas = $("gl");
const stage = $("stage");
const finder = $("finder");
const ratioBtn = $("ratio");
const evHud = $("ev-hud");
const looksEl = $("looks");
const lookMeta = $("look-meta");
const thumbBtn = $("thumb");
const shutterBtn = $("shutter");
const flipBtn = $("flip");
const gate = $("gate");
const gateTitle = $("gate-title");
const gateMsg = $("gate-msg");
const gateBtn = $("gate-btn");
const review = $("review");
const reviewImg = $("review-img");
const reviewClose = $("review-close");
const reviewSave = $("review-save");
const flashEl = $("flash");
const captureCanvas = document.createElement("canvas");
const meter = document.createElement("canvas");
meter.width = 32;
meter.height = 32;

const state = {
  lookId: "5s",
  facing: "environment",
  stream: null,
  still: null,
  lastBlob: null,
  lastUrl: null,
  lastName: "",
  running: false,
  capturing: false,
  seed: 1,
  lowLight: 0,
  lumaTick: 0,
  ratioId: "4:3",
  ev: 0,
  ae: null,
  forceIso: 0,
  skipLut: false,
};

const RATIOS = [
  { id: "4:3", label: "4:3", w: 4, h: 3 },
  { id: "1:1", label: "1:1", w: 1, h: 1 },
  { id: "16:9", label: "16:9", w: 16, h: 9 },
];

function lookById(id) {
  return LOOKS.find((l) => l.id === id) || LOOKS[0];
}

function isPortrait() {
  return window.innerHeight >= window.innerWidth;
}

function currentRatio() {
  return RATIOS.find((r) => r.id === state.ratioId) || RATIOS[0];
}

function displayWH() {
  const r = currentRatio();
  if (r.id === "1:1") return { rw: 1, rh: 1 };
  if (isPortrait()) return { rw: r.h, rh: r.w };
  return { rw: r.w, rh: r.h };
}

function outputSize(look) {
  const portrait = isPortrait();
  const frameW = portrait ? look.height : look.width;
  const frameH = portrait ? look.width : look.height;
  const { rw, rh } = displayWH();
  const target = rw / rh;
  const frameAspect = frameW / frameH;
  let outW;
  let outH;
  if (target > frameAspect) {
    outW = frameW;
    outH = Math.round(frameW / target);
  } else {
    outH = frameH;
    outW = Math.round(frameH * target);
  }
  outW -= outW % 2;
  outH -= outH % 2;
  return { width: outW, height: outH };
}

function sourceSize() {
  if (state.still) return { w: state.still.width, h: state.still.height };
  return { w: video.videoWidth || 0, h: video.videoHeight || 0 };
}

function cropUv(outW, outH) {
  const { w, h } = sourceSize();
  if (!w || !h) return { origin: [0, 0], size: [1, 1] };
  const srcAspect = w / h;
  const outAspect = outW / outH;
  let cw = 1;
  let ch = 1;
  if (srcAspect > outAspect) cw = outAspect / srcAspect;
  else ch = srcAspect / outAspect;
  return { origin: [(1 - cw) / 2, (1 - ch) / 2], size: [cw, ch] };
}

function lensFrame(look, outW, outH) {
  const pitchMm = look.pitchUm / 1000;
  const landscape = outW >= outH;
  const natW = landscape ? look.width : look.height;
  const natH = landscape ? look.height : look.width;
  const natAspect = natW / natH;
  const outAspect = outW / Math.max(outH, 1);
  let cropPxW;
  let cropPxH;
  if (outAspect > natAspect) {
    cropPxW = natW;
    cropPxH = natW / outAspect;
  } else {
    cropPxH = natH;
    cropPxW = natH * outAspect;
  }
  return {
    halfWmm: cropPxW * pitchMm * 0.5,
    halfHmm: cropPxH * pitchMm * 0.5,
    halfDiagMm: look.sensorDiagMm * 0.5,
    scale: outW / Math.max(cropPxW, 1),
  };
}

function evLimits(look) {
  const isoHead = Math.log2(look.isoMax / 640);
  const apLoss = 2 * Math.log2(look.aperture / 1.8);
  const evMax = Math.round(Math.max(0.6, Math.min(2, isoHead - apLoss)) * 10) / 10;
  return { min: -2, max: evMax, aperture: look.aperture };
}

function sceneLuma() {
  const src = state.still || video;
  const w = state.still ? src.width : video.videoWidth;
  if (!w) return 0.5;
  const ctx = meter.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(src, 0, 0, 32, 32);
  const d = ctx.getImageData(0, 0, 32, 32).data;
  let s = 0;
  for (let i = 0; i < d.length; i += 4) {
    const r = Math.pow(d[i] / 255, 2.2);
    const g = Math.pow(d[i + 1] / 255, 2.2);
    const b = Math.pow(d[i + 2] / 255, 2.2);
    s += r * 0.2126 + g * 0.7152 + b * 0.0722;
  }
  return s / (32 * 32);
}

function autoExposure(look) {
  const yLin = Math.max(sceneLuma(), 0.0008);
  const evBias = Math.pow(2, state.ev);
  const need = (0.18 / yLin) * evBias;
  const tRef = 1 / 60;
  const tMin = 1 / 2000;
  const apGain = (1.8 / look.aperture) ** 2;
  let t = tRef * need / Math.max(apGain, 0.05);
  let iso = look.isoMin;
  if (t > look.tMax) {
    iso = look.isoMin * (t / look.tMax);
    t = look.tMax;
  }
  if (t < tMin) t = tMin;
  iso = Math.min(look.isoMax, Math.max(look.isoMin, iso));
  if (state.forceIso) {
    iso = Math.min(look.isoMax, Math.max(look.isoMin, state.forceIso));
  }
  // Already-exposed sRGB (the preview, or a still) keeps mid-gray at ev=0
  // so the fitted LUT sees the same tones it was trained on. ISO only
  // sets noise; ev is a direct exposure bias.
  const electrons = look.fwc * (look.isoMin / iso) * evBias;
  return { t, iso, yLin, electrons };
}

function updateAE() {
  const look = lookById(state.lookId);
  state.ae = autoExposure(look);
  const mid = 0.18 * Math.pow(2, state.ev);
  state.lowLight = Math.max(0, Math.min(1, (0.08 - state.ae.yLin) / 0.08));
}

function workingSize(outW, outH, preview) {
  let w = Math.max(2, Math.round(outW));
  let h = Math.max(2, Math.round(outH));
  if (preview) {
    const maxPx = 1.15e6;
    const px = w * h;
    if (px > maxPx) {
      const s = Math.sqrt(maxPx / px);
      w = Math.max(2, Math.round(w * s));
      h = Math.max(2, Math.round(h * s));
    }
  }
  w -= w % 2;
  h -= h % 2;
  return { w, h };
}

function setUniform(gl, uni, name, fn, ...args) {
  if (uni[name]) gl[fn](uni[name], ...args);
}

function useProg(p) {
  const { gl } = renderer;
  gl.useProgram(p.prog);
  gl.bindBuffer(gl.ARRAY_BUFFER, renderer.buf);
  bindQuad(gl, p.prog);
  if (p.uni.uLinEnc) gl.uniform1f(p.uni.uLinEnc, renderer.useHalf ? 0 : 1);
  return p.uni;
}

function drawTo(target, w, h) {
  const { gl } = renderer;
  if (target) {
    renderer.resizeTarget(target, w, h);
    gl.bindFramebuffer(gl.FRAMEBUFFER, target.fbo);
  } else {
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    if (glCanvas.width !== w || glCanvas.height !== h) {
      glCanvas.width = w;
      glCanvas.height = h;
    }
  }
  gl.viewport(0, 0, w, h);
}

function bindTex(tex) {
  const { gl } = renderer;
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, tex);
}

function drawFrame(targetW, targetH, seed) {
  const { gl, lens, blur, sensor, demo, isp, srcTex, targets } = renderer;
  const look = lookById(state.lookId);
  const src = state.still || video;
  if (!state.still && (!video.videoWidth || video.readyState < 2)) return false;
  const crop = cropUv(targetW, targetH);
  const mirror = state.facing === "user" && !state.still;
  if (!state.ae) updateAE();
  const ae = state.ae;

  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  bindTex(srcTex);
  try {
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, src);
  } catch (err) {
    return false;
  }
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);

  const frame = lensFrame(look, targetW, targetH);
  const diffPx = ((2.44 * 0.55 * look.aperture) / look.pitchUm) * frame.scale;
  const aberrPx = look.aberrPx * frame.scale;
  const caView = (targetW < look.width * 0.5) ? (look.caView || 0) : 0;
  const caPx = look.ca * frame.scale + caView;

  drawTo(targets[0], targetW, targetH);
  let uni = useProg(lens);
  bindTex(srcTex);
  gl.uniform1i(uni.uTex, 0);
  gl.uniform2f(uni.uRes, targetW, targetH);
  gl.uniform2f(uni.uCropOrigin, crop.origin[0], crop.origin[1]);
  gl.uniform2f(uni.uCropSize, crop.size[0], crop.size[1]);
  gl.uniform1f(uni.uMirror, mirror ? 1 : 0);
  gl.uniform1f(uni.uCAPx, caPx);
  gl.uniform2f(uni.uHalfMm, frame.halfWmm, frame.halfHmm);
  gl.uniform1f(uni.uFocalMm, look.focalMm);
  gl.uniform1f(uni.uHalfDiagMm, frame.halfDiagMm);
  gl.uniform1f(uni.uFlare, look.flare);
  gl.uniform1f(uni.uVigAmt, look.vig == null ? 0.15 : look.vig);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

  drawTo(targets[1], targetW, targetH);
  uni = useProg(blur);
  bindTex(targets[0].tex);
  gl.uniform1i(uni.uTex, 0);
  gl.uniform2f(uni.uRes, targetW, targetH);
  gl.uniform2f(uni.uDir, 1, 0);
  gl.uniform1f(uni.uDiffPx, diffPx);
  gl.uniform1f(uni.uAberrPx, aberrPx);
  gl.uniform2f(uni.uHalfMm, frame.halfWmm, frame.halfHmm);
  gl.uniform1f(uni.uHalfDiagMm, frame.halfDiagMm);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

  drawTo(targets[0], targetW, targetH);
  uni = useProg(blur);
  bindTex(targets[1].tex);
  gl.uniform1i(uni.uTex, 0);
  gl.uniform2f(uni.uRes, targetW, targetH);
  gl.uniform2f(uni.uDir, 0, 1);
  gl.uniform1f(uni.uDiffPx, diffPx);
  gl.uniform1f(uni.uAberrPx, aberrPx);
  gl.uniform2f(uni.uHalfMm, frame.halfWmm, frame.halfHmm);
  gl.uniform1f(uni.uHalfDiagMm, frame.halfDiagMm);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

  drawTo(targets[1], targetW, targetH);
  uni = useProg(sensor);
  bindTex(targets[0].tex);
  gl.uniform1i(uni.uTex, 0);
  gl.uniform2f(uni.uRes, targetW, targetH);
  gl.uniform1f(uni.uFwc, look.fwc);
  gl.uniform1f(uni.uRead, look.read);
  gl.uniform1f(uni.uFpn, look.fpn);
  gl.uniform1f(uni.uIso, ae.iso);
  gl.uniform1f(uni.uIsoMin, look.isoMin);
  gl.uniform1f(uni.uElectrons, ae.electrons);
  gl.uniform1f(uni.uSeed, seed);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

  drawTo(targets[0], targetW, targetH);
  uni = useProg(demo);
  bindTex(targets[1].tex);
  gl.uniform1i(uni.uTex, 0);
  gl.uniform2f(uni.uRes, targetW, targetH);
  gl.uniform3f(uni.uWB, look.wb[0], look.wb[1], look.wb[2]);
  const m = look.ccm;
  gl.uniformMatrix3fv(uni.uCCM, false, [m[0], m[3], m[6], m[1], m[4], m[7], m[2], m[5], m[8]]);
  gl.uniform1f(uni.uSat, look.sat);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

  drawTo(null, targetW, targetH);
  uni = useProg(isp);
  bindTex(targets[0].tex);
  gl.uniform1i(uni.uTex, 0);
  const lutOk = renderer.uploadLut();
  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_2D, renderer.lutTex);
  gl.uniform1i(uni.uLUT, 1);
  gl.activeTexture(gl.TEXTURE0);
  gl.uniform2f(uni.uRes, targetW, targetH);
  gl.uniform1f(uni.uNrLuma, look.nrLuma);
  gl.uniform1f(uni.uNrChroma, look.nrChroma);
  gl.uniform1f(uni.uNrRadius, look.nrRadius == null ? 1 : look.nrRadius);
  gl.uniform1f(uni.uSharpen, look.sharpen);
  gl.uniform1f(uni.uHalo, look.halo);
  gl.uniform1f(uni.uContrast, look.contrast);
  gl.uniform1f(uni.uMid, look.mid);
  gl.uniform1f(uni.uShoulder, look.shoulder || 0);
  gl.uniform1f(uni.uShoulderStart, look.shoulderStart || 0.82);
  gl.uniform1f(uni.uHdr, look.hdr);
  gl.uniform1f(uni.uLocalTone, look.localTone || 0);
  gl.uniform1f(uni.uIsoNorm, (ae.iso - look.isoMin) / Math.max(look.isoMax - look.isoMin, 1));
  gl.uniform1f(uni.uLutRow, look.lutRow || 0);
  const lutSize = renderer.lutSize;
  gl.uniform2f(uni.uLutSize, lutSize[0], lutSize[1]);
  gl.uniform1f(uni.uUseLut, (lutOk && !state.skipLut) ? 1 : 0);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  return true;
}

function measurePreview(frames) {
  const look = lookById(state.lookId);
  resizeView();
  const work = workingSize(view.width, view.height, true);
  updateAE();
  const gl = renderer.gl;
  drawFrame(work.w, work.h, 1);
  if (gl.finish) gl.finish();
  const n = frames || 45;
  const t0 = performance.now();
  for (let i = 0; i < n; i++) drawFrame(work.w, work.h, i + 2);
  if (gl.finish) gl.finish();
  const ms = (performance.now() - t0) / n;
  return { ms, fps: 1000 / ms, width: work.w, height: work.h, frames: n, halfFloat: renderer.useHalf };
}


const renderer = makePipeline(glCanvas);

function layoutFinder() {
  if (!stage) return;
  const box = stage.getBoundingClientRect();
  const sw = box.width;
  const sh = box.height;
  if (sw < 2 || sh < 2) return;
  const { rw, rh } = displayWH();
  const target = rw / rh;
  let w = sw;
  let h = w / target;
  if (h > sh) {
    h = sh;
    w = h * target;
  }
  finder.style.width = `${Math.max(2, Math.round(w))}px`;
  finder.style.height = `${Math.max(2, Math.round(h))}px`;
}

function finderMetrics() {
  const s = stage.getBoundingClientRect();
  const f = finder.getBoundingClientRect();
  return {
    ratioId: state.ratioId,
    aspect: f.width / Math.max(f.height, 0.001),
    stage: { x: s.x, y: s.y, w: s.width, h: s.height },
    finder: { x: f.x, y: f.y, w: f.width, h: f.height },
  };
}

function setRatio(id) {
  const r = RATIOS.find((x) => x.id === id) || RATIOS[0];
  state.ratioId = r.id;
  if (ratioBtn) {
    ratioBtn.textContent = r.label;
    ratioBtn.setAttribute("aria-label", `화면 비율 ${r.label}`);
  }
  layoutFinder();
  resizeView();
}

function cycleRatio() {
  const i = RATIOS.findIndex((x) => x.id === state.ratioId);
  setRatio(RATIOS[(i + 1) % RATIOS.length].id);
}

function resizeView() {
  layoutFinder();
  const box = finder.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = Math.max(2, Math.round(box.width * dpr));
  const h = Math.max(2, Math.round(box.height * dpr));
  if (view.width !== w || view.height !== h) {
    view.width = w;
    view.height = h;
  }
}

function loop() {
  if (!state.running) return;
  requestAnimationFrame(loop);
  if (state.capturing) return;
  resizeView();
  state.lumaTick += 1;
  if (state.lumaTick % 12 === 1) updateAE();
  const work = workingSize(view.width, view.height, true);
  state.seed += 1.0;
  const ok = drawFrame(work.w, work.h, state.seed);
  if (ok) {
    const ctx = view.getContext("2d");
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "medium";
    ctx.drawImage(glCanvas, 0, 0, view.width, view.height);
  }
}

function showGate(title, msg, btnLabel) {
  gateTitle.textContent = title;
  gateMsg.textContent = msg;
  gateBtn.textContent = btnLabel || "카메라 켜기";
  gate.hidden = false;
}

function hideGate() {
  gate.hidden = true;
}

function insecureContext() {
  return !window.isSecureContext;
}

async function startCamera(facing) {
  if (state.still) return;
  if (insecureContext()) {
    showGate(
      "보안 연결이 필요해요",
      "카메라 권한은 HTTPS에서만 열립니다. 휴대폰에서는 보안 주소로 열어 주세요.",
      "다시 시도"
    );
    return;
  }
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    showGate("카메라를 쓸 수 없어요", "이 브라우저에서는 카메라가 열리지 않아요.", "다시 시도");
    return;
  }
  if (state.stream) {
    for (const t of state.stream.getTracks()) t.stop();
    state.stream = null;
  }
  const tried = [
    { video: { facingMode: { ideal: facing }, width: { ideal: 1920 }, height: { ideal: 1440 } }, audio: false },
    { video: { facingMode: facing }, audio: false },
    { video: true, audio: false },
  ];
  let lastErr;
  for (const constraints of tried) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      state.stream = stream;
      state.facing = facing;
      video.srcObject = stream;
      await video.play();
      hideGate();
      return;
    } catch (err) {
      lastErr = err;
    }
  }
  const name = lastErr && lastErr.name;
  if (name === "NotAllowedError" || name === "PermissionDeniedError") {
    showGate("카메라가 필요해요", "사진을 찍으려면 카메라 권한을 허용해 주세요.");
  } else if (name === "NotFoundError" || name === "DevicesNotFoundError") {
    showGate("카메라를 찾지 못했어요", "이 기기에 카메라가 없거나 다른 앱이 쓰고 있어요.");
  } else {
    showGate("카메라를 켜지 못했어요", (lastErr && lastErr.message) || "잠시 후 다시 시도해 주세요.");
  }
}

function renderLooks() {
  looksEl.innerHTML = "";
  for (const look of LOOKS) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "look";
    btn.dataset.id = look.id;
    btn.setAttribute("role", "option");
    btn.setAttribute("aria-selected", look.id === state.lookId ? "true" : "false");
    btn.innerHTML = `${look.name}<small>${look.year}</small>`;
    btn.addEventListener("click", () => setLook(look.id));
    looksEl.appendChild(btn);
  }
}

function formatEv(ev) {
  const v = Math.round(ev * 10) / 10;
  if (Math.abs(v) < 0.05) return "0.0";
  return `${v > 0 ? "+" : ""}${v.toFixed(1)}`;
}

function clampEv(value, look) {
  const lim = evLimits(look);
  const v = Math.round(value * 10) / 10;
  return Math.min(lim.max, Math.max(lim.min, v));
}

function showEvHud() {
  const look = lookById(state.lookId);
  evHud.innerHTML = `<strong>${formatEv(state.ev)}</strong><span>f/${look.aperture}</span>`;
  evHud.hidden = false;
  clearTimeout(showEvHud.timer);
  showEvHud.timer = setTimeout(() => {
    evHud.hidden = true;
  }, 1200);
}

function setEv(value, opts) {
  const look = lookById(state.lookId);
  state.ev = clampEv(value, look);
  updateAE();
  if (!opts || opts.hud !== false) showEvHud();
  return state.ev;
}

function wireEv() {
  let drag = null;
  let lastTap = 0;
  finder.addEventListener("pointerdown", (e) => {
    if (e.button) return;
    drag = { id: e.pointerId, y: e.clientY, ev: state.ev, moved: false };
    try { finder.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
  });
  finder.addEventListener("pointermove", (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const dy = drag.y - e.clientY;
    if (!drag.moved && Math.abs(dy) < 8) return;
    drag.moved = true;
    setEv(drag.ev + dy / 72);
  });
  const endDrag = (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    if (!drag.moved) {
      const now = Date.now();
      if (now - lastTap < 320) {
        setEv(0);
        lastTap = 0;
      } else {
        lastTap = now;
      }
    }
    drag = null;
  };
  finder.addEventListener("pointerup", endDrag);
  finder.addEventListener("pointercancel", endDrag);
}

function setLook(id) {
  const prev = state.ev;
  state.lookId = id;
  const look = lookById(id);
  lookMeta.textContent = `${look.name} · ${look.year} · f/${look.aperture}`;
  for (const btn of looksEl.querySelectorAll(".look")) {
    btn.setAttribute("aria-selected", btn.dataset.id === id ? "true" : "false");
  }
  const next = clampEv(state.ev, look);
  const changed = Math.abs(prev - next) > 0.01;
  setEv(next, { hud: changed });
}

function fileName(look) {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  const stamp = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
  return `iphone-${look.id}-${currentRatio().label.replace(":", "x")}-${stamp}.jpg`;
}

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("사진을 만들지 못했어요."));
    }, type, quality);
  });
}

async function renderCapture(width, height, seed) {
  const look = lookById(state.lookId);
  updateAE();
  const work = workingSize(width, height, false);
  const ok = drawFrame(work.w, work.h, seed);
  if (!ok) throw new Error("사진을 그리지 못했어요.");
  captureCanvas.width = width;
  captureCanvas.height = height;
  const ctx = captureCanvas.getContext("2d");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(glCanvas, 0, 0, width, height);
  return captureCanvas;
}

async function capture() {
  const look = lookById(state.lookId);
  const size = outputSize(look);
  const { w, h } = sourceSize();
  if (!w || !h) throw new Error("아직 화면이 준비되지 않았어요.");
  state.capturing = true;
  try {
    const seed = Math.random() * 1000;
    const canvas = await renderCapture(size.width, size.height, seed);
    const blob = await canvasToBlob(canvas, "image/jpeg", look.jpeg);
    return { blob, width: size.width, height: size.height, name: fileName(look), look };
  } finally {
    state.capturing = false;
  }
}

function rememberShot(blob, name) {
  if (state.lastUrl) URL.revokeObjectURL(state.lastUrl);
  state.lastBlob = blob;
  state.lastName = name;
  state.lastUrl = URL.createObjectURL(blob);
  thumbBtn.style.backgroundImage = `url("${state.lastUrl}")`;
  thumbBtn.disabled = false;
  reviewImg.src = state.lastUrl;
}

function openReview() {
  if (!state.lastUrl) return;
  reviewImg.src = state.lastUrl;
  review.hidden = false;
}

function closeReview() {
  review.hidden = true;
}

async function saveCurrent() {
  if (!state.lastBlob) return;
  const file = new File([state.lastBlob], state.lastName || "iphone.jpg", { type: "image/jpeg" });
  try {
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: "그때 아이폰" });
      return;
    }
  } catch (err) {
    if (err && err.name === "AbortError") return;
  }
  const a = document.createElement("a");
  a.href = state.lastUrl;
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

async function onShutter() {
  if (shutterBtn.disabled) return;
  shutterBtn.disabled = true;
  flashEl.hidden = false;
  flashEl.classList.remove("on");
  void flashEl.offsetWidth;
  flashEl.classList.add("on");
  try {
    const shot = await capture();
    rememberShot(shot.blob, shot.name);
    openReview();
  } catch (err) {
    showGate("사진을 찍지 못했어요", (err && err.message) || "다시 눌러 주세요.", "닫기");
  } finally {
    setTimeout(() => {
      flashEl.classList.remove("on");
      flashEl.hidden = true;
      shutterBtn.disabled = false;
    }, 180);
  }
}

async function onFlip() {
  if (state.still) return;
  const next = state.facing === "environment" ? "user" : "environment";
  await startCamera(next);
}

function wire() {
  renderLooks();
  setLook(state.lookId);
  setRatio(state.ratioId);
  wireEv();
  ratioBtn.addEventListener("click", cycleRatio);
  shutterBtn.addEventListener("click", onShutter);
  flipBtn.addEventListener("click", onFlip);
  thumbBtn.addEventListener("click", openReview);
  reviewClose.addEventListener("click", closeReview);
  reviewSave.addEventListener("click", saveCurrent);
  gateBtn.addEventListener("click", () => {
    if (gateBtn.textContent === "닫기") hideGate();
    else startCamera(state.facing);
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      state.running = false;
    } else if (!state.running) {
      state.running = true;
      requestAnimationFrame(loop);
    }
  });
  window.addEventListener("resize", resizeView);
  window.addEventListener("orientationchange", () => setTimeout(resizeView, 80));

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  }
}

async function useImage(src) {
  const img = new Image();
  img.crossOrigin = "anonymous";
  const loaded = new Promise((resolve, reject) => {
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("테스트 사진을 열지 못했어요."));
  });
  img.src = src;
  state.still = await loaded;
  if (state.stream) {
    for (const t of state.stream.getTracks()) t.stop();
    state.stream = null;
    video.srcObject = null;
  }
  updateAE();
  hideGate();
  return { width: img.width, height: img.height };
}

async function captureExact(width, height, seed) {
  const look = lookById(state.lookId);
  state.capturing = true;
  try {
    const canvas = await renderCapture(width, height, seed == null ? 42 : seed);
    const blob = await canvasToBlob(canvas, "image/jpeg", look.jpeg);
    return { blob, width, height, name: fileName(look), look };
  } finally {
    state.capturing = false;
  }
}

function blobToDataURL(blob) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
}

window.__TEST__ = {
  LOOKS,
  RATIOS,
  state,
  lutReady,
  setLook,
  setRatio,
  setEv,
  evLimits,
  formatEv,
  clampEv,
  cycleRatio,
  useImage,
  capture,
  captureExact,
  blobToDataURL,
  startCamera,
  outputSize,
  isPortrait,
  sceneLuma,
  finderMetrics,
  autoExposure,
  updateAE,
  measurePreview,
};

wire();
state.running = true;
requestAnimationFrame(loop);
startCamera(state.facing);
