import { createServer } from "node:http";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { extname, join } from "node:path";
import { spawn } from "node:child_process";
import puppeteer from "puppeteer-core";

const project = "/workspace/shipyard/retro-iphone-cam";
const out = "/tmp/grid-out";
mkdirSync(out, { recursive: true });

function run(cmd, args) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: "inherit" });
    p.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} exited ${code}`))));
  });
}
if (!existsSync(join(project, "test/grid-4032.jpg"))) {
  await run("python3", [join(project, "test/make-grid.py")]);
}

const MIME = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8", ".jpg": "image/jpeg", ".png": "image/png",
  ".json": "application/json",
};
const server = await new Promise((r) => {
  const s = createServer((req, res) => {
    let path = decodeURIComponent((req.url || "/").split("?")[0]);
    if (path === "/") path = "/index.html";
    try {
      const body = readFileSync(join(project, path));
      res.writeHead(200, { "content-type": MIME[extname(path)] || "application/octet-stream" });
      res.end(body);
    } catch { res.writeHead(404); res.end(""); }
  });
  s.listen(0, "127.0.0.1", () => r(s));
});
const url = `http://127.0.0.1:${server.address().port}/`;

async function boot(viewport) {
  const browser = await puppeteer.launch({
    executablePath: "/usr/bin/google-chrome",
    headless: "new",
    args: [
      "--no-sandbox", "--disable-dev-shm-usage",
      "--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream",
      "--use-file-for-fake-video-capture=/tmp/grid-cam.y4m",
      "--autoplay-policy=no-user-gesture-required", "--hide-scrollbars",
    ],
    defaultViewport: viewport,
  });
  const page = await browser.newPage();
  page.setDefaultTimeout(120000);
  page.on("pageerror", (e) => console.error("PAGEERROR", e));
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.__TEST__ && document.getElementById("video")?.videoWidth > 0, { timeout: 15000 });
  await new Promise((r) => setTimeout(r, 300));
  return { browser, page };
}

function saveDataUrl(path, dataUrl) {
  writeFileSync(path, Buffer.from(dataUrl.split(",")[1], "base64"));
}

const looks = ["5s", "se", "6s", "7", "8", "xs"];
const expectStill = { "5s": [3264, 2448], se: [4032, 3024], "6s": [4032, 3024], "7": [4032, 3024], "8": [4032, 3024], xs: [4032, 3024] };

// Portrait preview of live camera, all ratios, 5s + xs
{
  const { browser, page } = await boot({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await page.evaluate(() => window.__TEST__.setEv(0, { hud: false }));
  for (const look of ["5s", "xs"]) {
    for (const ratio of ["4:3", "1:1", "16:9"]) {
      await page.evaluate((L, R) => {
        window.__TEST__.setLook(L);
        window.__TEST__.setRatio(R);
        window.__TEST__.setEv(0, { hud: false });
      }, look, ratio);
      await new Promise((r) => setTimeout(r, 200));
      const shot = await page.evaluate(async () => {
        const c = document.getElementById("view");
        return { w: c.width, h: c.height, dataUrl: c.toDataURL("image/jpeg", 0.92) };
      });
      const name = `preview-portrait-${look}-${ratio.replace(":", "x")}.jpg`;
      saveDataUrl(join(out, name), shot.dataUrl);
      console.log(name, shot.w, shot.h);
    }
  }
  // also a finder screenshot including letterbox
  await page.evaluate(() => window.__TEST__.setLook("5s") || window.__TEST__.setRatio("4:3"));
  await page.screenshot({ path: join(out, "ui-portrait-5s-4x3.jpg"), type: "jpeg", quality: 70 });
  await browser.close();
}

// Landscape preview
{
  const { browser, page } = await boot({ width: 844, height: 390, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await page.evaluate(() => window.__TEST__.setEv(0, { hud: false }));
  for (const look of ["5s", "xs"]) {
    for (const ratio of ["4:3", "1:1", "16:9"]) {
      await page.evaluate((L, R) => {
        window.__TEST__.setLook(L);
        window.__TEST__.setRatio(R);
        window.__TEST__.setEv(0, { hud: false });
      }, look, ratio);
      await new Promise((r) => setTimeout(r, 200));
      const shot = await page.evaluate(async () => {
        const c = document.getElementById("view");
        return { w: c.width, h: c.height, dataUrl: c.toDataURL("image/jpeg", 0.92) };
      });
      const name = `preview-landscape-${look}-${ratio.replace(":", "x")}.jpg`;
      saveDataUrl(join(out, name), shot.dataUrl);
      console.log(name, shot.w, shot.h);
    }
  }
  await browser.close();
}

// High-res stills from the 4032 grid, all looks, 4:3 landscape + 1:1 + 16:9 + portrait 4:3 for 5s and xs
{
  const { browser, page } = await boot({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await page.evaluate(async () => {
    await window.__TEST__.useImage("./test/grid-4032.jpg");
    window.__TEST__.setEv(0, { hud: false });
    window.__TEST__.setRatio("4:3");
  });
  await new Promise((r) => setTimeout(r, 200));
  for (const [id, [w, h]] of Object.entries(expectStill)) {
    await page.evaluate((lookId) => window.__TEST__.setLook(lookId), id);
    const shot = await page.evaluate(async (width, height) => {
      const c = await window.__TEST__.captureExact(width, height, 1);
      const dataUrl = await window.__TEST__.blobToDataURL(c.blob);
      return { width: c.width, height: c.height, dataUrl };
    }, w, h);
    const name = `still-land-4x3-${id}.jpg`;
    saveDataUrl(join(out, name), shot.dataUrl);
    console.log(name, shot.width, shot.height);
  }
  // 5s + xs other ratios, landscape sizes
  const extras = {
    "5s": { "1:1": [2448, 2448], "16:9": [3264, 1836], "port-4:3": [2448, 3264] },
    xs: { "1:1": [3024, 3024], "16:9": [4032, 2268], "port-4:3": [3024, 4032] },
  };
  for (const [id, ratios] of Object.entries(extras)) {
    await page.evaluate((lookId) => window.__TEST__.setLook(lookId), id);
    for (const [rid, [w, h]] of Object.entries(ratios)) {
      const shot = await page.evaluate(async (width, height) => {
        const c = await window.__TEST__.captureExact(width, height, 1);
        const dataUrl = await window.__TEST__.blobToDataURL(c.blob);
        return { width: c.width, height: c.height, dataUrl };
      }, w, h);
      const name = `still-${rid}-${id}.jpg`;
      saveDataUrl(join(out, name), shot.dataUrl);
      console.log(name, shot.width, shot.height);
    }
  }
  await browser.close();
}

server.close();
console.log("done, wrote", out);
await run("python3", [join(project, "test/check-grid.py"), out]);
