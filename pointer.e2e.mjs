/**
 * Browser e2e for the virtual teaching pointer.
 *
 * Drives the real PdfViewer (rendered via Next dev at /dev/pointer) in a headless
 * Chrome, fires pointer targets, and verifies the overlay appears at the correct
 * on-screen location relative to the rendered PDF page.
 *
 * Usage: BASE=http://localhost:3210 node pointer.e2e.mjs
 */
import puppeteer from "puppeteer";

const BASE = process.env.BASE || "http://localhost:3210";
const URL = `${BASE}/dev/pointer`;
const PAGE1_WIDTH_PT = 612; // theme-showcase.pdf page width at scale 1

const results = [];
function check(name, cond, detail = "") {
  results.push({ name, ok: !!cond, detail });
  console.log(`${cond ? "PASS" : "FAIL"} ${name}${detail ? "  — " + detail : ""}`);
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Wait until an element's bounding rect stops changing (springs/scroll settled). */
async function waitStable(page, selector, { stableFor = 350, timeout = 5000 } = {}) {
  const start = Date.now();
  let last = null;
  let stableSince = Date.now();
  while (Date.now() - start < timeout) {
    const r = await page.evaluate((s) => {
      const e = document.querySelector(s);
      if (!e) return null;
      const b = e.getBoundingClientRect();
      return { l: Math.round(b.left), t: Math.round(b.top), w: Math.round(b.width), h: Math.round(b.height) };
    }, selector);
    const same = r && last && r.l === last.l && r.t === last.t && r.w === last.w && r.h === last.h;
    if (!same) stableSince = Date.now();
    last = r;
    if (r && Date.now() - stableSince >= stableFor) return r;
    await sleep(80);
  }
  return last;
}

const browser = await puppeteer.launch({
  headless: true,
  args: ["--no-sandbox", "--disable-setuid-sandbox"],
});

try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });
  page.on("console", (m) => {
    const t = m.text();
    if (/error|warn/i.test(m.type())) console.log("  [browser]", m.type(), t);
  });

  await page.goto(URL, { waitUntil: "networkidle0", timeout: 60000 });

  // Wait for the PDF to render and the dev hook to be installed.
  await page.waitForSelector("canvas", { timeout: 30000 });
  await page.waitForFunction(() => typeof window.__genedPointer?.set === "function", { timeout: 15000 });
  await sleep(800); // let fit-width scale + first render settle
  check("PDF page rendered (canvas present)", await page.$("canvas"));

  // ── Test 1: text target ──────────────────────────────────────────────────
  await page.evaluate(() =>
    window.__genedPointer.set({ page: 1, target: { kind: "text", text: "Ocean Depths" }, label: "The title" })
  );
  await page.waitForSelector('[data-testid="pointer-highlight"]', { timeout: 8000 });
  await waitStable(page, '[data-testid="pointer-hand"]'); // settle spring + smooth auto-scroll

  const hasHand = await page.$('[data-testid="pointer-hand"]');
  const hasLabel = await page.$('[data-testid="pointer-label"]');
  check("text: highlight box shown", await page.$('[data-testid="pointer-highlight"]'));
  check("text: pointing hand shown", hasHand);
  check("text: label chip shown", hasLabel);

  const labelText = hasLabel ? await page.$eval('[data-testid="pointer-label"]', (el) => el.textContent) : "";
  check("text: label reads 'The title'", labelText === "The title", `got "${labelText}"`);

  // Geometry: highlight position relative to page-1 canvas should match the
  // known text rect (x≈50pt, y≈44pt at scale 1) times the render scale.
  const geom = await page.evaluate(() => {
    const canvas = document.querySelector("canvas");
    const box = document.querySelector('[data-testid="pointer-highlight"]');
    const c = canvas.getBoundingClientRect();
    const b = box.getBoundingClientRect();
    return { cLeft: c.left, cTop: c.top, cWidth: c.width, bLeft: b.left, bTop: b.top, bWidth: b.width, bHeight: b.height };
  });
  const scale = geom.cWidth / PAGE1_WIDTH_PT;
  const expectedDx = 50 * scale - 4; // box left = rect.x - 4
  const expectedDy = 44 * scale - 3; // box top = rect.y - 3
  const actualDx = geom.bLeft - geom.cLeft;
  const actualDy = geom.bTop - geom.cTop;
  check(
    "text: highlight X matches rendered text",
    Math.abs(actualDx - expectedDx) < 6,
    `dx actual=${actualDx.toFixed(1)} expected=${expectedDx.toFixed(1)} (scale=${scale.toFixed(3)})`
  );
  check(
    "text: highlight Y matches rendered text",
    Math.abs(actualDy - expectedDy) < 6,
    `dy actual=${actualDy.toFixed(1)} expected=${expectedDy.toFixed(1)}`
  );
  check(
    "text: highlight width ~ heading width",
    Math.abs(geom.bWidth - (283 * scale + 8)) < 10,
    `w=${geom.bWidth.toFixed(1)} expected~${(283 * scale + 8).toFixed(1)}`
  );

  // Hand fingertip should sit near the highlight's top-left.
  const handNear = await page.evaluate(() => {
    const box = document.querySelector('[data-testid="pointer-highlight"]').getBoundingClientRect();
    const hand = document.querySelector('[data-testid="pointer-hand"]').getBoundingClientRect();
    return Math.hypot(hand.left - box.left, hand.top - box.top);
  });
  check("text: hand anchored near target", handNear < 25, `dist=${handNear.toFixed(1)}px`);

  await page.screenshot({ path: "/tmp/pointer_text.png" });

  // ── Test 2: figure / region target ───────────────────────────────────────
  await page.evaluate(() =>
    window.__genedPointer.set({ page: 1, target: { kind: "figure", bbox: [0.2, 0.5, 0.8, 0.7] }, label: "A figure" })
  );
  await waitStable(page, '[data-testid="pointer-highlight"]');
  const figGeom = await page.evaluate(() => {
    const c = document.querySelector("canvas").getBoundingClientRect();
    const b = document.querySelector('[data-testid="pointer-highlight"]').getBoundingClientRect();
    return { cTop: c.top, cHeight: c.height, bTop: b.top, bHeight: b.height, cLeft: c.left, cWidth: c.width, bLeft: b.left, bWidth: b.width };
  });
  const figDyTop = (figGeom.bTop - figGeom.cTop) / figGeom.cHeight; // fraction of page height
  check("figure: top at ~0.5 of page height", Math.abs(figDyTop - 0.5) < 0.05, `fracTop=${figDyTop.toFixed(3)}`);
  const figFracH = figGeom.bHeight / figGeom.cHeight;
  check("figure: height ~0.2 of page", Math.abs(figFracH - 0.2) < 0.05, `fracH=${figFracH.toFixed(3)}`);
  const figFracW = figGeom.bWidth / figGeom.cWidth;
  check("figure: width ~0.6 of page", Math.abs(figFracW - 0.6) < 0.06, `fracW=${figFracW.toFixed(3)}`);
  await page.screenshot({ path: "/tmp/pointer_figure.png" });

  // ── Test 3: missing text resolves to no overlay ──────────────────────────
  await page.evaluate(() =>
    window.__genedPointer.set({ page: 1, target: { kind: "text", text: "zzqq not present anywhere" } })
  );
  await sleep(700);
  check("missing text: no highlight shown", !(await page.$('[data-testid="pointer-highlight"]')));

  // ── Test 4: clear removes the pointer ────────────────────────────────────
  await page.evaluate(() =>
    window.__genedPointer.set({ page: 1, target: { kind: "text", text: "Ocean Depths" }, label: "again" })
  );
  await page.waitForSelector('[data-testid="pointer-highlight"]', { timeout: 8000 });
  await page.evaluate(() => window.__genedPointer.clear());
  await sleep(600);
  check("clear: highlight removed", !(await page.$('[data-testid="pointer-highlight"]')));
  check("clear: hand removed", !(await page.$('[data-testid="pointer-hand"]')));

  console.log("\nScreenshots: /tmp/pointer_text.png, /tmp/pointer_figure.png");
} finally {
  await browser.close();
}

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed.`);
process.exit(failed.length ? 1 : 0);
