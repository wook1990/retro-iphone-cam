import { createServer } from "node:http";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { extname, join } from "node:path";
import puppeteer from "puppeteer-core";

const project = "/workspace/shipyard/retro-iphone-cam";
const outDir = join(project, "samples");
mkdirSync(outDir, { recursive: true });
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
};
const server = await new Promise((r) => {
  const s = createServer((req, res) => {
    let path = decodeURIComponent((req.url || "/").split("?")[0]);
    if (path === "/") path = "/index.html";
    try {
      const body = readFileSync(join(project, path));
      res.writeHead(200, { "content-type": MIME[extname(path)] || "application/octet-stream" });
      res.end(body);
    } catch { res.writeHead(404); res.end("not found"); }
  });
  s.listen(0, "127.0.0.1", () => r(s));
});
const url = `http://127.0.0.1:${server.address().port}/`;

const scenes = [
  { id: "backlit", src: "./calib/raw/scenes/backlit.jpg" },
  { id: "indoor", src: "./calib/raw/scenes/indoor.jpg" },
  { id: "dusk", src: "./calib/raw/scenes/dusk.jpg" },
];
const models = [
  { id: "5s", w: 3264, h: 2448 },
  { id: "se", w: 4032, h: 3024 },
  { id: "6s", w: 4032, h: 3024 },
  { id: "7", w: 4032, h: 3024 },
  { id: "8", w: 4032, h: 3024 },
  { id: "xs", w: 4032, h: 3024 },
];

const browser = await puppeteer.launch({
  executablePath: "/usr/bin/google-chrome",
  headless: "new",
  args: ["--no-sandbox", "--disable-dev-shm-usage", "--hide-scrollbars"],
  defaultViewport: { width: 390, height: 844 },
});
const page = await browser.newPage();
page.setDefaultTimeout(180000);
page.on("pageerror", (e) => console.error("PAGEERROR", e));
await page.goto(url, { waitUntil: "domcontentloaded" });
await page.waitForFunction(() => window.__TEST__, { timeout: 20000 });
await page.evaluate(() => window.__TEST__.lutReady);

for (const scene of scenes) {
  await page.evaluate(async (src) => {
    const T = window.__TEST__;
    T.setRatio("4:3");
    T.setEv(0, { hud: false });
    T.state.forceIso = 0;
    await T.useImage(src);
  }, scene.src);
  for (const m of models) {
    const t0 = Date.now();
    const data = await page.evaluate(async (id, w, h) => {
      const T = window.__TEST__;
      T.setLook(id);
      T.state.forceIso = 0;
      T.updateAE();
      const cap = await T.captureExact(w, h, 7);
      const url = await T.blobToDataURL(cap.blob);
      return url;
    }, m.id, m.w, m.h);
    const buf = Buffer.from(data.split(",")[1], "base64");
    const dest = join(outDir, `scene-${scene.id}-${m.id}.jpg`);
    writeFileSync(dest, buf);
    console.log("wrote", dest, buf.length, "ms", Date.now() - t0);
  }
}
await browser.close();
server.close();
