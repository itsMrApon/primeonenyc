// Section probe: cleaned markup + walk-in screenshots at scroll offsets relative to the section top.
//   bun tools/probes/section.mjs <url> "<css selector>" <outDir> [dy,dy,...]  (default -450,0,450,900)
// Writes <outDir>/section.html and <outDir>/<label>-<dy>.png (label = host).
import fs from "node:fs";
import { open, walkTo, topOf } from "./_browser.mjs";
const [url, sel, out, dys = "-450,0,450,900"] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const label = new URL(url).hostname.replace(/\W+/g, "-");
const { browser, page } = await open(url);
const html = await page.evaluate((s) => document.querySelector(s).outerHTML
  .replace(/<svg[\s\S]*?<\/svg>/g, "<svg/>")
  .replace(/\s(srcset|sizes|style|aria-hidden|loading)="[^"]*"/g, "")
  .replace(/<(div|p|h2) screen-reader="">[\s\S]*?<\/(div|p|h2)>/g, "")
  .replace(/https:\/\/cdn\.prod\.website-files\.com\/[^/]+\//g, "")
  .replace(/<span class="line">([\s\S]*?)<div class="high-line-reveal"><\/div><\/span>/g, "[$1]")
  .replace(/<span class="char"[^>]*>(.)<\/span>/g, "$1"), sel);
fs.writeFileSync(`${out}/section.html`, html);
for (const dy of dys.split(",").map(Number)) {
  let top = await topOf(page, sel);
  await walkTo(page, top + dy);
  await page.waitForTimeout(600);
  top = await topOf(page, sel); // lazy images above may have shifted it
  await walkTo(page, top + dy, top + dy - 200);
  await page.waitForTimeout(2500);
  console.log(label, "dy", dy, "top", top, "theme", await page.evaluate(() => document.querySelector("[data-nav-theme]")?.dataset.navTheme));
  await page.screenshot({ path: `${out}/${label}-${dy}.png` });
}
console.log("markup chars", html.length, "→", `${out}/section.html`);
await browser.close();
