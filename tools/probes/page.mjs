// Whole-page probe, one browser session: every top-level .s → cleaned markup + walk-in shots (dy −450, 0, +450 … < h) + index.json.
//   bun tools/probes/page.mjs <url> <outDir>
import fs from "node:fs";
import { open, walkTo, jump } from "./_browser.mjs";
const [URL_, OUT] = process.argv.slice(2);
const label = new URL(URL_).hostname.replace(/\W+/g, "-");
const { browser, page } = await open(URL_);
const H = await page.evaluate(() => document.documentElement.scrollHeight);
await walkTo(page, H, 0, 400); await page.waitForTimeout(1500); await jump(page, 0); await page.waitForTimeout(1500);
const secs = await page.evaluate(() => [...document.querySelectorAll(".s")].filter(e => !e.parentElement.closest(".s")).map((e, i) => {
  e.setAttribute("data-probe-i", i);
  const inner = e.querySelector(".c")?.className || e.firstElementChild?.className || "";
  const name = (e.className.replace(/^s\s*/, "").split(" ")[0] || inner.replace(/^c\s*/, "").split(" ")[0] || "section").replace(/^is-/, "");
  return { i, name, cls: e.className, inner };
}));
const index = [];
for (const s of secs) {
  const sel = `[data-probe-i="${s.i}"]`;
  const dir = `${OUT}/${String(s.i).padStart(2, "0")}-${s.name}`;
  fs.mkdirSync(dir, { recursive: true });
  const html = await page.evaluate((q) => document.querySelector(q).outerHTML
    .replace(/<svg[\s\S]*?<\/svg>/g, "<svg/>")
    .replace(/\s(srcset|sizes|style|aria-hidden|loading|data-probe-i)="[^"]*"/g, "")
    .replace(/<(div|p|h2) screen-reader="">[\s\S]*?<\/(div|p|h2)>/g, "")
    .replace(/https:\/\/cdn\.prod\.website-files\.com\/[^/]+\//g, "")
    .replace(/<span class="line">([\s\S]*?)<div class="high-line-reveal"><\/div><\/span>/g, "[$1]")
    .replace(/<span class="char"[^>]*>(.)<\/span>/g, "$1"), sel);
  fs.writeFileSync(`${dir}/section.html`, html);
  const m = await page.evaluate((q) => { const b = document.querySelector(q).getBoundingClientRect(); return { top: Math.round(b.top + scrollY), h: Math.round(b.height) }; }, sel);
  const dys = [-450]; for (let d = 0; d < Math.max(m.h, 1); d += 450) dys.push(d);
  for (const dy of dys) {
    const y = Math.max(0, m.top + dy);
    await walkTo(page, y, y - 1800); await page.waitForTimeout(2200);
    await page.screenshot({ path: `${dir}/${label}-${dy}.png` });
  }
  index.push({ ...s, ...m, dys, markupChars: html.length });
  console.log(s.i, s.name, m.top, m.h, dys.length, "shots");
}
fs.writeFileSync(`${OUT}/index.json`, JSON.stringify({ url: URL_, viewport: "1440x900", H, capturedAt: new Date().toISOString(), sections: index }, null, 1));
await browser.close();
