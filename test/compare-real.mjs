import { createServer } from "node:http";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { extname, join } from "node:path";
import { spawn } from "node:child_process";
import puppeteer from "puppeteer-core";

const project = "/workspace/shipyard/retro-iphone-cam";
const outDir = join(project, "samples");
mkdirSync(outDir, { recursive: true });
mkdirSync("/tmp/compare-real", { recursive: true });

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
    } catch {
      res.writeHead(404);
      res.end("not found");
    }
  });
  s.listen(0, "127.0.0.1", () => r(s));
});
const url = `http://127.0.0.1:${server.address().port}/`;

const inputs = {
  chart: "./calib/raw/gsmarena/apple-iphone-13-1.jpg",
  still_day: "./calib/raw/gsmarena/apple-iphone-13-2.jpg",
  still_low: "./calib/raw/gsmarena/apple-iphone-13-3.jpg",
};

const models = [
  { id: "5s", w: 3264, h: 2448, isoLow: 400 },
  { id: "se", w: 4032, h: 3024, isoLow: 400 },
  { id: "6s", w: 4032, h: 3024, isoLow: 320 },
  { id: "7", w: 4032, h: 3024, isoLow: 100 },
  { id: "8", w: 4032, h: 3024, isoLow: 100 },
  { id: "xs", w: 4032, h: 3024, isoLow: 640 },
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

for (const scene of ["chart", "still_day", "still_low"]) {
  await page.evaluate(async (src) => {
    const T = window.__TEST__;
    T.setRatio("4:3");
    T.setEv(0, { hud: false });
    T.state.forceIso = 0;
    await T.useImage(src);
  }, inputs[scene]);
  for (const m of models) {
    if (scene !== "chart" && m.id === "5s") continue;
    await page.evaluate((id, iso, scene) => {
      const T = window.__TEST__;
      T.setLook(id);
      T.state.forceIso = scene === "still_low" ? iso : 0;
      T.updateAE();
    }, m.id, m.isoLow, scene);
    const dataUrl = await page.evaluate(async (w, h) => {
      const T = window.__TEST__;
      const c = await T.captureExact(w, h, 42);
      return T.blobToDataURL(c.blob);
    }, m.w, m.h);
    const buf = Buffer.from(dataUrl.split(",")[1], "base64");
    const dest = `/tmp/compare-real/${m.id}-${scene}.jpg`;
    writeFileSync(dest, buf);
    console.log("wrote", dest, buf.length);
  }
}

await browser.close();
server.close();

const py = await new Promise((resolve, reject) => {
  const p = spawn("/workspace/shipyard/retro-iphone-cam/calib/.venv/bin/python", [
    join(project, "calib/make_compare.py"),
  ], { stdio: "inherit" });
  p.on("exit", (code) => (code === 0 ? resolve() : reject(new Error("make_compare failed"))));
});
