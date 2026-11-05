// Shared helpers for the probes. Playwright comes from the reanimate skill install.
export const { chromium } = await import(process.env.HOME + "/.claude/skills/reanimate/scripts/node_modules/playwright/index.mjs");

/** Open a page at 1440x900, wait for Lenis (reference + rebuild both expose window.lenis). */
export async function open(url, { w = 1440, h = 900, settle = 3500 } = {}) {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  await page.goto(url, { waitUntil: "load" });
  await page.waitForFunction(() => window.lenis && window.lenis.scrollTo, null, { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(settle);
  return { browser, page };
}

/** Jump-scroll with Lenis (instant, no smoothing). */
export const jump = (page, y) => page.evaluate((y) => (window.lenis ? window.lenis.scrollTo(y, { immediate: true, force: true }) : window.scrollTo(0, y)), y);

/** Walk down in steps so every one-time ScrollTrigger on the way fires, then land on y. */
export async function walkTo(page, y, from = y - 1800, step = 200) {
  for (let s = Math.max(0, from); s <= y; s += step) { await jump(page, s); await page.waitForTimeout(30); }
  await jump(page, y);
}

/** Document top of the first element matching selector (re-measure after lazy content loads!). */
export const topOf = (page, sel) => page.evaluate((s) => Math.round(document.querySelector(s).getBoundingClientRect().top + scrollY), sel);
