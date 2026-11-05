// List artboards / state machines / inputs (type 59 = bool, 56 = number, 58 = trigger) of .riv files.
//   bun tools/probes/rive.mjs <projectRoot> name1 name2 ...   (reads <projectRoot>/public/rive/<name>.riv)
import fs from "node:fs";
import { chromium } from "./_browser.mjs";
const [P, ...names] = process.argv.slice(2);
const b = await chromium.launch(); const page = await b.newPage();
await page.route("http://probe.local/**", (route) => {
  const u = new URL(route.request().url()).pathname;
  if (u === "/") return route.fulfill({ contentType: "text/html", body: '<canvas id=c width=200 height=200></canvas><script src="/rive.js"></script>' });
  if (u === "/rive.js") return route.fulfill({ body: fs.readFileSync(P + "/node_modules/@rive-app/canvas/rive.js"), contentType: "text/javascript" });
  if (u === "/rive.wasm") return route.fulfill({ body: fs.readFileSync(P + "/public/rive/rive.wasm"), contentType: "application/wasm" });
  return route.fulfill({ body: fs.readFileSync(P + "/public/rive" + u) });
});
await page.goto("http://probe.local/");
for (const f of names) console.log(f, JSON.stringify(await page.evaluate((f) => new Promise((res) => {
  rive.RuntimeLoader.setWasmUrl("/rive.wasm");
  const r = new rive.Rive({ src: "/" + f + ".riv", canvas: document.getElementById("c"), autoplay: false,
    onLoad: () => res(r.contents.artboards.map((a) => ({ a: a.name, sm: a.stateMachines.map((s) => s.name + "[" + s.inputs.map((i) => i.name + ":" + i.type).join(",") + "]") }))),
    onLoadError: (e) => res(String(e)) });
}), f), null, 1));
await b.close();
