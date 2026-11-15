import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { extname, join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer-core";

const testDir = dirname(fileURLToPath(import.meta.url));
const project = dirname(testDir);
const samples = join(project, "samples");
const y4m = "/tmp/retro-iphone-cam.y4m";
mkdirSync(samples, { recursive: true });

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".webmanifest": "application/manifest+json",
};

function serve(dir) {
  return new Promise((resolve) => {
    const server = createServer((req, res) => {
      let path = decodeURIComponent((req.url || "/").split("?")[0]);
      if (path === "/") path = "/index.html";
      try {
        const file = join(dir, path);
        if (!file.startsWith(dir)) throw new Error("bad path");
        const body = readFileSync(file);
        res.writeHead(200, { "content-type": MIME[extname(file)] || "application/octet-stream" });
        res.end(body);
      } catch {
        res.writeHead(404);
        res.end("not found");
      }
    });
    server.listen(0, "127.0.0.1", () => resolve({ server, port: server.address().port }));
  });
}

function run(cmd, args) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: "inherit" });
    p.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} exited ${code}`))));
  });
}

if (!existsSync(y4m)) {
  console.log("encoding fake camera y4m…");
  await run("ffmpeg", [
    "-y", "-loop", "1", "-i", join(testDir, "source.jpg"),
    "-t", "2", "-r", "10",
    "-vf", "scale=1280:960:force_original_aspect_ratio=increase,crop=1280:960",
    "-pix_fmt", "yuv420p",
    y4m,
  ]);
}

const { server, port } = await serve(project);
const url = `http://127.0.0.1:${port}/`;
console.log("serving", url);

const browser = await puppeteer.launch({
  executablePath: "/usr/bin/google-chrome",
  headless: "new",
  args: [
    "--no-sandbox",
    "--disable-dev-shm-usage",
    "--use-fake-ui-for-media-stream",
    "--use-fake-device-for-media-stream",
    `--use-file-for-fake-video-capture=${y4m}`,
    "--autoplay-policy=no-user-gesture-required",
    "--window-size=390,844",
    "--hide-scrollbars",
  ],
  defaultViewport: { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
});

const page = await browser.newPage();
page.setDefaultTimeout(20000);
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (msg) => {
  if (msg.type() === "error") errors.push(`console: ${msg.text()}`);
});

await page.goto(url, { waitUntil: "domcontentloaded" });
await page.waitForFunction(() => {
  const v = document.getElementById("video");
  return v && v.videoWidth > 0 && v.readyState >= 2;
});
await new Promise((r) => setTimeout(r, 400));

function expectedAspect(ratioId, portrait) {
  if (ratioId === "1:1") return 1;
  if (ratioId === "16:9") return portrait ? 9 / 16 : 16 / 9;
  return portrait ? 3 / 4 : 4 / 3;
}

function checkMask(metrics, ratioId, portrait, label) {
  const expect = expectedAspect(ratioId, portrait);
  const { stage, finder, aspect, ratioId: gotId } = metrics;
  const issues = [];
  if (gotId !== ratioId) issues.push(`ratioId ${gotId}`);
  if (Math.abs(aspect - expect) > 0.03) issues.push(`aspect ${aspect.toFixed(4)} != ${expect.toFixed(4)}`);
  if (finder.x < stage.x - 1.5) issues.push("finder left of stage");
  if (finder.y < stage.y - 1.5) issues.push("finder above stage");
  if (finder.x + finder.w > stage.x + stage.w + 1.5) issues.push("finder right of stage");
  if (finder.y + finder.h > stage.y + stage.h + 1.5) issues.push("finder below stage");
  const fillsW = Math.abs(finder.w - stage.w) <= 2.5;
  const fillsH = Math.abs(finder.h - stage.h) <= 2.5;
  if (!fillsW && !fillsH) issues.push("finder does not touch a stage edge");
  const stageAspect = stage.w / Math.max(stage.h, 0.001);
  if (Math.abs(stageAspect - expect) > 0.03) {
    if (expect > stageAspect) {
      if (!fillsW || stage.h - finder.h < 4) issues.push("expected letterbox mask");
    } else if (!fillsH || stage.w - finder.w < 4) {
      issues.push("expected pillarbox mask");
    }
  }
  if (issues.length) {
    console.error(`FAIL mask ${label}:`, issues.join("; "), JSON.stringify(metrics));
    return false;
  }
  console.log(
    `mask ${label}: finder ${Math.round(finder.w)}x${Math.round(finder.h)} in stage ${Math.round(stage.w)}x${Math.round(stage.h)} aspect ${aspect.toFixed(3)}`,
  );
  return true;
}

const portraitExpect = {
  "5s": { "4:3": [2448, 3264], "1:1": [2448, 2448], "16:9": [1836, 3264] },
  se: { "4:3": [3024, 4032], "1:1": [3024, 3024], "16:9": [2268, 4032] },
  "6s": { "4:3": [3024, 4032], "1:1": [3024, 3024], "16:9": [2268, 4032] },
  "7": { "4:3": [3024, 4032], "1:1": [3024, 3024], "16:9": [2268, 4032] },
  "8": { "4:3": [3024, 4032], "1:1": [3024, 3024], "16:9": [2268, 4032] },
  xs: { "4:3": [3024, 4032], "1:1": [3024, 3024], "16:9": [2268, 4032] },
};
const landscapeExpect = {
  "5s": { "4:3": [3264, 2448], "1:1": [2448, 2448], "16:9": [3264, 1836] },
  xs: { "4:3": [4032, 3024], "1:1": [3024, 3024], "16:9": [4032, 2268] },
};

let failed = false;
const dimResults = [];

async function settle() {
  await page.evaluate(() => window.dispatchEvent(new Event("resize")));
  await new Promise((r) => setTimeout(r, 160));
}

async function captureSize(lookId, ratioId) {
  return page.evaluate(async (look, ratio) => {
    window.__TEST__.setLook(look);
    window.__TEST__.setRatio(ratio);
    const c = await window.__TEST__.capture();
    return { width: c.width, height: c.height, name: c.name };
  }, lookId, ratioId);
}

async function measureMask(ratioId) {
  return page.evaluate((ratio) => {
    window.__TEST__.setRatio(ratio);
    return window.__TEST__.finderMetrics();
  }, ratioId);
}

const defaultRatio = await page.evaluate(() => window.__TEST__.state.ratioId);
if (defaultRatio !== "4:3") {
  console.error(`FAIL default ratio is ${defaultRatio}, expected 4:3`);
  failed = true;
}

await settle();
const uiPath = join(samples, "ui-mobile.jpg");
await page.screenshot({ path: uiPath, type: "jpeg", quality: 68 });
console.log("ui screenshot saved", uiPath);

// Portrait: all looks at 4:3, plus 5s/xs on 1:1 and 16:9. Masks for each ratio.
for (const lookId of ["5s", "se", "6s", "7", "8", "xs"]) {
  const ratios = lookId === "5s" || lookId === "xs" ? ["4:3", "1:1", "16:9"] : ["4:3"];
  for (const ratioId of ratios) {
    const shot = await captureSize(lookId, ratioId);
    const [w, h] = portraitExpect[lookId][ratioId];
    dimResults.push({ orientation: "portrait", lookId, ratioId, ...shot });
    console.log(`portrait ${lookId} ${ratioId}: ${shot.width}x${shot.height}`);
    if (shot.width !== w || shot.height !== h) {
      console.error(`FAIL portrait ${lookId} ${ratioId}: expected ${w}x${h}`);
      failed = true;
    }
  }
}

for (const ratioId of ["4:3", "1:1", "16:9"]) {
  await settle();
  const metrics = await measureMask(ratioId);
  if (!checkMask(metrics, ratioId, true, `portrait ${ratioId}`)) failed = true;
}


await page.setViewport({ width: 844, height: 390, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await settle();
const portraitFlag = await page.evaluate(() => window.__TEST__.isPortrait());
if (portraitFlag) {
  console.error("FAIL isPortrait still true after landscape viewport");
  failed = true;
}

for (const lookId of ["5s", "xs"]) {
  for (const ratioId of ["4:3", "1:1", "16:9"]) {
    const shot = await captureSize(lookId, ratioId);
    const [w, h] = landscapeExpect[lookId][ratioId];
    dimResults.push({ orientation: "landscape", lookId, ratioId, ...shot });
    console.log(`landscape ${lookId} ${ratioId}: ${shot.width}x${shot.height}`);
    if (shot.width !== w || shot.height !== h) {
      console.error(`FAIL landscape ${lookId} ${ratioId}: expected ${w}x${h}`);
      failed = true;
    }
  }
}

for (const ratioId of ["4:3", "1:1", "16:9"]) {
  await settle();
  const metrics = await measureMask(ratioId,);
  if (!checkMask(metrics, ratioId, false, `landscape ${ratioId}`)) failed = true;
}

await browser.close();
server.close();

if (errors.length) {
  console.error("page errors:", errors);
  failed = true;
}
writeFileSync(join(samples, "test-summary.json"), JSON.stringify({ dimResults, errors }, null, 2));
if (failed) process.exit(1);
console.log("all ratio dimension and mask checks passed");
