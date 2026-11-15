/* 그때 아이폰 — old iPhone camera looks on a live web camera. */
"use strict";

const LOOKS = [
  {
    id: "5s",
    name: "5s",
    year: "2013",
    width: 3264,
    height: 2448,
    jpeg: 0.9,
    jpegWork: 0.55,
    resolve: 0.36,
    wb: [1.08, 1, 0.9],
    saturation: 1.1,
    contrast: 0.94,
    brightness: 1.02,
    shadow: -0.08,
    highlight: 0.1,
    mid: 0,
    vignette: 0.34,
    soft: 1.2,
    softMix: 0.18,
    sharpen: 0.2,
    halo: 0.06,
    grain: 0.16,
    chromaNoise: 0.055,
    grainCell: 2.6,
    chromaCell: 8,
    smear: 0.28,
    flatSmear: 0.22,
    hdr: 0,
    clarity: 0,
    warmSplit: 0.04,
    cornerSoft: 0.55,
    ca: 0.004,
    clip: 0.68,
    crush: 0.32,
  },
  {
    id: "se",
    name: "SE",
    year: "2016",
    width: 4032,
    height: 3024,
    jpeg: 0.9,
    jpegWork: 0.62,
    resolve: 0.42,
    wb: [0.98, 1, 1.05],
    saturation: 1.06,
    contrast: 1.05,
    brightness: 1,
    shadow: -0.05,
    highlight: 0.04,
    mid: 0.02,
    vignette: 0.2,
    soft: 0.7,
    softMix: 0.1,
    sharpen: 0.42,
    halo: 0.22,
    grain: 0.12,
    chromaNoise: 0.04,
    grainCell: 2.2,
    chromaCell: 6,
    smear: 0.2,
    flatSmear: 0.16,
    hdr: 0.06,
    clarity: 0.04,
    warmSplit: 0,
    cornerSoft: 0.38,
    ca: 0.0025,
    clip: 0.4,
    crush: 0.24,
  },
  {
    id: "6s",
    name: "6s",
    year: "2015",
    width: 4032,
    height: 3024,
    jpeg: 0.9,
    jpegWork: 0.58,
    resolve: 0.4,
    wb: [1.12, 1, 0.86],
    saturation: 1.2,
    contrast: 1.08,
    brightness: 0.9,
    shadow: -0.14,
    highlight: 0.08,
    mid: -0.02,
    vignette: 0.26,
    soft: 0.9,
    softMix: 0.14,
    sharpen: 0.28,
    halo: 0.12,
    grain: 0.15,
    chromaNoise: 0.045,
    grainCell: 2.4,
    chromaCell: 7,
    smear: 0.38,
    flatSmear: 0.28,
    hdr: 0,
    clarity: 0,
    warmSplit: 0.07,
    cornerSoft: 0.42,
    ca: 0.003,
    clip: 0.52,
    crush: 0.42,
  },
  {
    id: "7",
    name: "7",
    year: "2016",
    width: 4032,
    height: 3024,
    jpeg: 0.92,
    jpegWork: 0.68,
    resolve: 0.55,
    wb: [0.97, 1, 1.05],
    saturation: 1.05,
    contrast: 1.14,
    brightness: 1.08,
    shadow: -0.03,
    highlight: 0.05,
    mid: 0.03,
    vignette: 0.14,
    soft: 0.4,
    softMix: 0.06,
    sharpen: 0.46,
    halo: 0.24,
    grain: 0.08,
    chromaNoise: 0.018,
    grainCell: 1.7,
    chromaCell: 4,
    smear: 0.12,
    flatSmear: 0.08,
    hdr: 0.1,
    clarity: 0.08,
    warmSplit: 0,
    cornerSoft: 0.22,
    ca: 0.0015,
    clip: 0.34,
    crush: 0.2,
  },
  {
    id: "8",
    name: "8",
    year: "2017",
    width: 4032,
    height: 3024,
    jpeg: 0.93,
    jpegWork: 0.76,
    resolve: 0.64,
    wb: [1.07, 1.02, 0.9],
    saturation: 1.08,
    contrast: 1.12,
    brightness: 1.04,
    shadow: -0.02,
    highlight: -0.05,
    mid: 0.02,
    vignette: 0.1,
    soft: 0.28,
    softMix: 0.05,
    sharpen: 0.5,
    halo: 0.34,
    grain: 0.05,
    chromaNoise: 0.01,
    grainCell: 1.4,
    chromaCell: 3,
    smear: 0.08,
    flatSmear: 0.06,
    hdr: 0.16,
    clarity: 0.08,
    warmSplit: 0.07,
    cornerSoft: 0.16,
    ca: 0.001,
    clip: 0.18,
    crush: 0.12,
  },
  {
    id: "xs",
    name: "XS",
    year: "2018",
    width: 4032,
    height: 3024,
    jpeg: 0.94,
    jpegWork: 0.9,
    resolve: 0.84,
    wb: [1.05, 1.01, 0.94],
    saturation: 1.06,
    contrast: 1.03,
    brightness: 1.02,
    shadow: 0.1,
    highlight: -0.12,
    mid: 0.03,
    vignette: 0.05,
    soft: 0.1,
    softMix: 0.03,
    sharpen: 0.3,
    halo: 0,
    grain: 0.028,
    chromaNoise: 0.004,
    grainCell: 1.2,
    chromaCell: 2.4,
    smear: 0.04,
    flatSmear: 0.03,
    hdr: 0.28,
    clarity: 0.14,
    warmSplit: 0.04,
    cornerSoft: 0.08,
    ca: 0.0008,
    clip: 0,
    crush: 0,
  },
];

const VS = `
attribute vec2 aPos;
varying vec2 vUv;
void main() {
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}
`;

const FS = `
precision highp float;
uniform sampler2D uTex;
uniform vec2 uRes;
uniform vec2 uCropOrigin;
uniform vec2 uCropSize;
uniform float uMirror;
uniform vec3 uWB;
uniform float uSat;
uniform float uContrast;
uniform float uBrightness;
uniform float uShadow;
uniform float uHighlight;
uniform float uMid;
uniform float uVignette;
uniform float uSoft;
uniform float uSoftMix;
uniform float uSharpen;
uniform float uHalo;
uniform float uGrain;
uniform float uChromaNoise;
uniform float uGrainCell;
uniform float uChromaCell;
uniform float uSmear;
uniform float uFlatSmear;
uniform float uHdr;
uniform float uClarity;
uniform float uWarmSplit;
uniform float uCornerSoft;
uniform float uCA;
uniform float uLowLight;
uniform float uClip;
uniform float uCrush;
uniform float uSeed;
varying vec2 vUv;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7)) + uSeed) * 43758.5453123);
}

float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

vec3 toSat(vec3 c, float s) {
  float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
  return mix(vec3(l), c, s);
}

vec3 texAt(vec2 uv) {
  vec2 src = uCropOrigin + uv * uCropSize;
  src.x = mix(src.x, uCropOrigin.x + uCropSize.x - (src.x - uCropOrigin.x), uMirror);
  return texture2D(uTex, src).rgb;
}

vec3 blurAt(vec2 uv, float px) {
  vec2 d = vec2(px) / uRes;
  vec3 a = texAt(uv) * 0.25;
  a += texAt(uv + vec2(d.x, 0.0)) * 0.125;
  a += texAt(uv - vec2(d.x, 0.0)) * 0.125;
  a += texAt(uv + vec2(0.0, d.y)) * 0.125;
  a += texAt(uv - vec2(0.0, d.y)) * 0.125;
  a += texAt(uv + d) * 0.0625;
  a += texAt(uv - d) * 0.0625;
  a += texAt(uv + vec2(d.x, -d.y)) * 0.0625;
  a += texAt(uv + vec2(-d.x, d.y)) * 0.0625;
  return a;
}

float lum(vec3 c) {
  return dot(c, vec3(0.2126, 0.7152, 0.0722));
}

vec3 scaleLuma(vec3 c, float y2) {
  float y = max(lum(max(c, 0.0)), 0.0001);
  y2 = clamp(y2, 0.0, 1.5);
  float r = clamp(y2 / y, 0.0, 3.0);
  return max(c, 0.0) * r;
}

void main() {
  vec2 uv = vUv;
  vec2 vc = uv * 2.0 - 1.0;
  float rad = length(vc);
  vec2 dir = rad > 0.0001 ? vc / rad : vec2(0.0);
  float ca = uCA * rad * rad;

  vec3 src;
  src.r = texAt(uv + dir * ca).r;
  src.g = texAt(uv).g;
  src.b = texAt(uv - dir * ca).b;

  float softPx = max(uSoft, 1.0);
  vec3 blur = blurAt(uv, softPx);
  vec3 wide = blurAt(uv, softPx * 3.5 + 2.5);
  float corner = smoothstep(0.4, 1.35, dot(vc, vc));
  vec3 c = mix(src, blur, clamp(uSoftMix, 0.0, 0.7));
  c = mix(c, wide, corner * uCornerSoft);

  c *= 1.0 - uVignette * smoothstep(0.35, 1.55, dot(vc, vc));

  c *= uWB;
  c = max(c, 0.0);
  c = scaleLuma(c, lum(c) * uBrightness);
  c = scaleLuma(c, (lum(c) - 0.5) * uContrast + 0.5 + uMid * 0.15);

  float sh = 1.0 - smoothstep(0.0, 0.42, lum(c));
  if (uShadow > 0.0) {
    c += vec3(uShadow * sh * 0.14);
  } else {
    c = scaleLuma(c, lum(c) + uShadow * sh * 0.11);
  }
  if (uCrush > 0.0) {
    float y = lum(c);
    float y2 = pow(max(y, 0.0), 1.0 + uCrush * 0.7) * (1.0 - uCrush * 0.08);
    c = scaleLuma(c, y2);
  }

  float yHi = lum(c);
  if (uClip > 0.0) {
    float cap = mix(1.05, 0.86, clamp(uClip, 0.0, 1.0));
    float y2 = mix(yHi, cap, smoothstep(cap - 0.07, cap, yHi));
    c = scaleLuma(c, min(y2, cap));
  } else if (uHighlight > 0.0) {
    float hi = smoothstep(0.62, 1.0, yHi);
    float y2 = mix(yHi, 1.0, hi * uHighlight * 0.7);
    y2 = min(y2, mix(1.2, 0.97, clamp(uHighlight, 0.0, 1.0)));
    c = scaleLuma(c, y2);
  } else {
    float hi = smoothstep(0.62, 1.0, yHi);
    float y2 = mix(yHi, yHi / (1.0 + max(yHi - 0.7, 0.0) * (-uHighlight * 3.0)), hi);
    c = scaleLuma(c, y2);
  }

  if (uHdr > 0.0) {
    float y = lum(c);
    float add = (0.22 * uHdr) * (1.0 - smoothstep(0.0, 0.35, y));
    c += vec3(add);
    float y3h = lum(c);
    float y4 = y3h / (1.0 + max(y3h - 0.75, 0.0) * uHdr);
    c = scaleLuma(c, y4);
  }

  c = toSat(c, uSat);
  float y3 = lum(max(c, 0.0));
  c.r += uWarmSplit * smoothstep(0.45, 1.0, y3);
  c.b -= uWarmSplit * 0.6 * smoothstep(0.45, 1.0, y3);

  float flatness = 1.0 - smoothstep(0.0, 0.06, abs(lum(src) - lum(blur)) + 0.5 * abs(lum(blur) - lum(wide)));
  float shadowN = 1.0 - smoothstep(0.05, 0.42, y3);
  float skyFlat = flatness * smoothstep(0.4, 0.85, y3);
  float nAmp = (1.0 + uLowLight * 1.6) * (0.12 + 1.25 * shadowN + 0.5 * skyFlat);
  vec2 gp = uv * uRes / max(uGrainCell, 1.0) + uSeed;
  float gn = vnoise(gp) - 0.5;
  float gn2 = vnoise(gp + 17.3) - 0.5;
  c += (gn * 0.8 + gn2 * 0.2) * uGrain * nAmp * 1.7;

  vec2 cp = uv * uRes / max(uChromaCell, 1.0) + uSeed;
  float cr = hash(floor(cp) + 3.1) - 0.5;
  float cb = hash(floor(cp) + 11.7) - 0.5;
  float cAmp = (1.0 + uLowLight * 0.7) * (0.1 + 1.5 * shadowN);
  c.r += cr * uChromaNoise * cAmp * 1.3;
  c.b += cb * uChromaNoise * cAmp * 1.3;
  c.g += (cr + cb) * 0.12 * uChromaNoise * cAmp;
  c = max(c, 0.0);

  float smearAmt = (sh * uSmear + flatness * uFlatSmear) * (1.0 + uLowLight * 1.1);
  c = mix(c, blur, clamp(smearAmt, 0.0, 0.85));
  c = mix(c, wide, clamp((1.0 - smoothstep(0.0, 0.22, lum(c))) * uSmear * 0.45 * (0.4 + uLowLight), 0.0, 0.6));

  c = scaleLuma(c, lum(c) + (lum(c) - lum(blur)) * uSharpen);
  float edge = max(lum(blur) - lum(wide), 0.0);
  c += vec3(1.0, 0.98, 0.92) * edge * uHalo * 2.6;
  c = scaleLuma(c, lum(c) + (lum(c) - lum(wide)) * uClarity);

  gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0);
}
`;

const $ = (id) => document.getElementById(id);
const video = $("video");
const view = $("view");
const glCanvas = $("gl");
const stage = $("stage");
const finder = $("finder");
const ratioBtn = $("ratio");
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
  if (srcAspect > outAspect) {
    cw = outAspect / srcAspect;
  } else {
    ch = srcAspect / outAspect;
  }
  return { origin: [(1 - cw) / 2, (1 - ch) / 2], size: [cw, ch] };
}

function compile(gl, type, src) {
  const sh = gl.createShader(type);
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    throw new Error(gl.getShaderInfoLog(sh) || "shader compile failed");
  }
  return sh;
}

const UNI_NAMES = [
  "uTex", "uRes", "uCropOrigin", "uCropSize", "uMirror", "uWB", "uSat", "uContrast",
  "uBrightness", "uShadow", "uHighlight", "uMid", "uVignette", "uSoft", "uSoftMix", "uSharpen",
  "uHalo", "uGrain", "uChromaNoise", "uGrainCell", "uChromaCell", "uSmear", "uFlatSmear",
  "uHdr", "uClarity", "uWarmSplit", "uCornerSoft", "uCA", "uLowLight", "uClip", "uCrush", "uSeed",
];

function makeGL(canvas) {
  const gl = canvas.getContext("webgl", {
    preserveDrawingBuffer: true,
    alpha: false,
    antialias: false,
    premultipliedAlpha: false,
  });
  if (!gl) throw new Error("WebGL을 쓸 수 없어요.");
  const prog = gl.createProgram();
  gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VS));
  gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, FS));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    throw new Error(gl.getProgramInfoLog(prog) || "shader link failed");
  }
  gl.useProgram(prog);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, "aPos");
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  const uni = {};
  for (const name of UNI_NAMES) uni[name] = gl.getUniformLocation(prog, name);
  gl.uniform1i(uni.uTex, 0);
  return { gl, uni, tex };
}

const renderer = makeGL(glCanvas);

function applyLook(gl, uni, look, width, height, crop, mirror, seed) {
  gl.uniform2f(uni.uRes, width, height);
  gl.uniform2f(uni.uCropOrigin, crop.origin[0], crop.origin[1]);
  gl.uniform2f(uni.uCropSize, crop.size[0], crop.size[1]);
  gl.uniform1f(uni.uMirror, mirror ? 1 : 0);
  gl.uniform3f(uni.uWB, look.wb[0], look.wb[1], look.wb[2]);
  gl.uniform1f(uni.uSat, look.saturation);
  gl.uniform1f(uni.uContrast, look.contrast);
  gl.uniform1f(uni.uBrightness, look.brightness);
  gl.uniform1f(uni.uShadow, look.shadow);
  gl.uniform1f(uni.uHighlight, look.highlight);
  gl.uniform1f(uni.uMid, look.mid);
  gl.uniform1f(uni.uVignette, look.vignette);
  gl.uniform1f(uni.uSoft, look.soft);
  gl.uniform1f(uni.uSoftMix, look.softMix);
  gl.uniform1f(uni.uSharpen, look.sharpen);
  gl.uniform1f(uni.uHalo, look.halo);
  gl.uniform1f(uni.uGrain, look.grain);
  gl.uniform1f(uni.uChromaNoise, look.chromaNoise);
  gl.uniform1f(uni.uGrainCell, look.grainCell);
  gl.uniform1f(uni.uChromaCell, look.chromaCell);
  gl.uniform1f(uni.uSmear, look.smear);
  gl.uniform1f(uni.uFlatSmear, look.flatSmear);
  gl.uniform1f(uni.uHdr, look.hdr);
  gl.uniform1f(uni.uClarity, look.clarity);
  gl.uniform1f(uni.uWarmSplit, look.warmSplit);
  gl.uniform1f(uni.uCornerSoft, look.cornerSoft);
  gl.uniform1f(uni.uCA, look.ca);
  gl.uniform1f(uni.uLowLight, state.lowLight);
  gl.uniform1f(uni.uClip, look.clip);
  gl.uniform1f(uni.uCrush, look.crush);
  gl.uniform1f(uni.uSeed, seed);
}

function drawFrame(targetW, targetH, seed) {
  const { gl, uni } = renderer;
  const look = lookById(state.lookId);
  const src = state.still || video;
  if (!state.still && (!video.videoWidth || video.readyState < 2)) return false;
  if (glCanvas.width !== targetW || glCanvas.height !== targetH) {
    glCanvas.width = targetW;
    glCanvas.height = targetH;
  }
  gl.viewport(0, 0, targetW, targetH);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, renderer.tex);
  try {
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, src);
  } catch (err) {
    return false;
  }
  const crop = cropUv(targetW, targetH);
  const mirror = state.facing === "user" && !state.still;
  applyLook(gl, uni, look, targetW, targetH, crop, mirror, seed);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  return true;
}

function workingSize(outW, outH, look) {
  const r = look.resolve;
  return {
    w: Math.max(2, Math.round(outW * r)),
    h: Math.max(2, Math.round(outH * r)),
  };
}

function sceneLuma() {
  const src = state.still || video;
  const w = state.still ? src.width : video.videoWidth;
  if (!w) return 0.5;
  const ctx = meter.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(src, 0, 0, 32, 32);
  const d = ctx.getImageData(0, 0, 32, 32).data;
  let s = 0;
  for (let i = 0; i < d.length; i += 4) s += d[i] * 0.2126 + d[i + 1] * 0.7152 + d[i + 2] * 0.0722;
  return s / (32 * 32 * 255);
}

function lowLightFromLuma(y) {
  return Math.max(0, Math.min(1, (0.34 - y) / 0.34));
}

function updateLowLight() {
  state.lowLight = lowLightFromLuma(sceneLuma());
}

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
  if (state.lumaTick % 12 === 1) updateLowLight();
  const look = lookById(state.lookId);
  const work = workingSize(view.width, view.height, look);
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

function setLook(id) {
  state.lookId = id;
  const look = lookById(id);
  lookMeta.textContent = `${look.name} · ${look.year}`;
  for (const btn of looksEl.querySelectorAll(".look")) {
    btn.setAttribute("aria-selected", btn.dataset.id === id ? "true" : "false");
  }
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

async function blobToImage(blob) {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(blob);
    } catch (err) {
      /* fall through */
    }
  }
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    await new Promise((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("사진을 읽지 못했어요."));
      img.src = url;
    });
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function renderCapture(width, height, seed) {
  const look = lookById(state.lookId);
  updateLowLight();
  const work = workingSize(width, height, look);
  const ok = drawFrame(work.w, work.h, seed);
  if (!ok) throw new Error("사진을 그리지 못했어요.");
  captureCanvas.width = width;
  captureCanvas.height = height;
  const ctx = captureCanvas.getContext("2d");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  if (look.jpegWork < 0.98) {
    const workBlob = await canvasToBlob(glCanvas, "image/jpeg", look.jpegWork);
    const img = await blobToImage(workBlob);
    ctx.drawImage(img, 0, 0, width, height);
    if (img.close) img.close();
  } else {
    ctx.drawImage(glCanvas, 0, 0, width, height);
  }
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
  updateLowLight();
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
  setLook,
  setRatio,
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
};

wire();
state.running = true;
requestAnimationFrame(loop);
startCamera(state.facing);
