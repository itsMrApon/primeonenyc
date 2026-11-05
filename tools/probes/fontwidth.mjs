// Width of a label at several "wdth" axis values — find which value reproduces the reference's measured width.
//   bun tools/probes/fontwidth.mjs <font.woff2> "<TEXT>" <px> [weight=800]
import fs from "node:fs";
import { chromium } from "./_browser.mjs";
const [font, text, px, weight = "800"] = process.argv.slice(2);
const ws = [75, 80, 86, 90, 93, 96.5, 100, 110];
const b = await chromium.launch(); const p = await b.newPage();
await p.route("http://t.local/**", (r) => new URL(r.request().url()).pathname === "/f.woff2"
  ? r.fulfill({ body: fs.readFileSync(font), contentType: "font/woff2" })
  : r.fulfill({ contentType: "text/html", body: `<style>@font-face{font-family:B;src:url(/f.woff2) format("woff2");font-weight:200 900}.t{font-family:B;font-weight:${weight};font-size:${px}px;text-transform:uppercase;display:inline-block}</style>` + ws.map((w) => `<div><span id="w${String(w).replace(".", "_")}" class=t style="font-variation-settings:'wdth' ${w}">${text}</span></div>`).join("") }));
await p.goto("http://t.local/"); await p.evaluate(() => document.fonts.ready);
console.log(await p.evaluate((ws) => ws.map((w) => `wdth ${w}: ${document.getElementById("w" + String(w).replace(".", "_")).getBoundingClientRect().width.toFixed(1)}px`).join("\n"), ws));
await b.close();
