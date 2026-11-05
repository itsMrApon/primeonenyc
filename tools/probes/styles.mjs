// Computed geometry + typography for selectors inside a section (positions relative to the section top).
//   bun tools/probes/styles.mjs <url> "<section selector>" "<sel1>|<sel2>|..." [scrollDy=0]
import { open, walkTo, topOf } from "./_browser.mjs";
const [url, sec, sels, dy = "0"] = process.argv.slice(2);
const { browser, page } = await open(url);
await walkTo(page, (await topOf(page, sec)) + Number(dy));
await page.waitForTimeout(2500);
const rows = await page.evaluate(([sec, sels]) => {
  const root = document.querySelector(sec); const top = root.getBoundingClientRect().top + scrollY;
  const K = ["fontFamily", "fontSize", "fontWeight", "fontVariationSettings", "lineHeight", "letterSpacing", "textTransform", "color", "textAlign"];
  const X = ["backgroundColor", "borderRadius", "gap", "padding", "display", "position", "opacity", "transform", "clipPath", "objectFit", "zIndex", "maskImage", "transition"];
  return sels.split("|").map((s) => { const e = root.querySelector(s); if (!e) return [s, "MISSING"]; const r = e.getBoundingClientRect(); const c = getComputedStyle(e);
    return [s, [r.x, r.y + scrollY - top, r.width, r.height].map((v) => Math.round(v * 10) / 10), Object.fromEntries([...K, ...X].map((k) => [k, c[k]]).filter(([, v]) => v && !["none", "normal", "0px", "auto", "static", "1", "rgba(0, 0, 0, 0)", "fill", "block", "all"].includes(v)))]; });
}, [sec, sels]);
for (const r of rows) console.log(JSON.stringify(r));
await browser.close();
