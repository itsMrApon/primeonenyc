# Exact-clone playbook (v2) — WebGL / GSAP / Rive sites

How the landonorris.com rebuild in this repo was made section by section to ≤ 2 % pixel mismatch, written so the next clone is faster and cheaper. It extends `../noomo/CLONE-PLAYBOOK.md` (v1, the Noomo clone); where they disagree, this one wins.

**Core idea:** never guess a number. Every size, colour, timing and easing comes from one of four sources, in this order of preference:

1. **The live page's runtime**: computed styles and rects (Playwright probes), WebGL trace (reanimate `--gl`).
2. **The JS bundle**: GSAP timelines, durations, eases, staggers, data-attribute semantics. Read it with needles, never whole.
3. **Sampling at several scroll positions or times, then fitting a curve**: linear, power1/2/3, elastic.
4. Frame inspection (last resort).

---

## 1. Toolchain: what we used and what we skipped

| Need | Used | Why |
|---|---|---|
| See / verify the page | Claude desktop **built-in browser pane** + headless Playwright (from the reanimate install) | No IDE or extra agent needed; the pane shows the dev server, and headless runs are scriptable and deterministic |
| Animation / WebGL truth | **reanimate** skill (`~/.claude/skills/reanimate`) | `capture.ts --clock virtual --gl --assets` gives shader sources, every uniform, scene graph, render passes and per-frame channels; `compare.ts` / `sheet.ts` give frame proof |
| Crawl / mirror | Your own `../noomo/scrape-lando.mjs` (Node fetch + asset harvest from bundles) | Fast and offline-able; finds assets HTML never lists |
| Shader extraction (study only) | `../noomo/tools/extract-shaders.mjs` | Pulls GLSL string literals out of the bundle |
| Fluid / text libs | `three-msdf-text-utils` (MIT), own stable-fluids implementation, public Ashima simplex noise (MIT) | Match the reference's algorithms without copying its code |
| Rive | `@rive-app/canvas` (same version as the site: 2.26.6) with the site's own `.riv` files | The `.riv` file *is* the spec |
| Coding behaviour | `CLAUDE.md` (Karpathy rules + project rules) | Surgical changes, verify before "done" |

**Skipped on purpose (don't install next time):** graphify (small codebase, no gain), caveman (adds ~1.1k tokens/request and compresses logs you need), agent-desktop (native apps, not web), iris (the built-in browser already screenshots), Firecrawl / Crawl4AI / Scrapling (markdown scrapers; a clone needs runtime network assets and computed styles instead).

### Reusable probes (`tools/probes/`, all tested)

| Script | Use |
|---|---|
| `bun tools/probes/section.mjs <url> "<selector>" <outDir> [dy,…]` | Cleaned section markup + walk-in screenshots at offsets from the section top (works on reference **and** clone) |
| `bun tools/probes/styles.mjs <url> "<section>" "<sel1>\|<sel2>" [dy]` | Rects (section-relative) + typography + non-default styles |
| `bun tools/probes/rive.mjs <projectRoot> name1 name2` | Artboards, state machines and inputs of `.riv` files (59 bool, 56 number, 58 trigger) |
| `bun tools/probes/fontwidth.mjs <font> "TEXT" <px> [weight]` | Which `wdth` value reproduces a measured label width |
| `python3 tools/probes/score.py ref.png clone.png [--mask x0,y0,x1,y1] [--grid]` | Mean mismatch + heat map of where it is |
| `python3 -I tools/probes/bundle.py <bundle> "<needle>" [before] [after] [max]` | Slice the minified bundle around a needle |

---

## 2. Pipeline (per site, then per section)

### A. Crawl once, then re-crawl when the live site changes

```bash
cd ../noomo && LANDO_OUT=output-<site>-<date> node scrape-<site>.mjs
```

- **Check freshness first:** compare live `<script src>` and CSS hashes with the mirror. Ours had gone stale (new bundle `lando-by-OFF+BRAND.05.js`, new CSS) and the hero looked "wrong" for that reason alone.
- **Audit assets:** every `"/…​.glb|webp|ktx2|hdr|riv"` string in the bundle must exist on disk. Rive `.wasm` comes from npm (`npm pack @rive-app/canvas@<ver>`).
- **CMS images live in a second folder** (`website-files/<cms-site-id>/`), and full-size files are the ones without `-p-500` / `-p-800`.

### B. Per section: capture → spec → build → verify

1. **Markup and screenshots:** `section.mjs` on the reference at dy −450 / 0 / 450 / 900. Look at the strip.
2. **Geometry:** `styles.mjs` for every visible part. Convert px to fluid units: `1u = clamp(992px, 100vw, 1920px) / 1728 × 16` (= 13.333 px at 1440, = the site's rem). Store values as `calc(var(--u) * N)`.
3. **Motion:** sample transforms at 5–10 scroll positions (jump + settle). Then sample the same position at 80 ms and 1.6 s to tell scroll-scrubbed motion from time-based motion. Fit the curve. For GL values, run short captures after a jump:
   ```bash
   bun ~/.claude/skills/reanimate/scripts/capture.ts --url <url> --out <dir> --trigger none \
     --wait-before 3000 --pre-js "window.lenis.scrollTo(<y>,{immediate:true,force:true})" \
     --duration 600 --fps 10 --clock virtual --gl --gpu hardware
   ```
   Several of these can run in parallel (`&` … `wait`).
4. **Exact timings:** find them in the bundle with `bundle.py` and a needle: the data attribute (`data-anim-high`, `data-social-callout`), the uniform name, or the dataset camelCase (`marqueeScrollSpeed`).
5. **Spec:** write `.reanimate/<section>/spec.md` with facts, a table of numbers, then rounds (scores + residuals).
6. **Build** in the existing stack (Nuxt 3 + three + GSAP + Lenis). Reuse the shared pieces (§4).
7. **Verify:** take the same shots of the clone and score both with `score.py --grid`. The target is ≤ 2 % per frame. Iterate on the hottest grid cell. Commit with the numbers in the message.

### C. Model routing (tokens)

| Work | Model |
|---|---|
| Crawl runs, asset copying, content JSON edits, re-running probes | cheap subagent (Sonnet / Haiku) |
| Shaders, WebGL pipelines, motion fitting, debugging mismatches | Opus |

---

## 3. Gotchas that cost the most time (check these first)

| Symptom | Cause / fix |
|---|---|
| Colours slightly too bright (#F8F8F3 shows #FCFCFA) | The reference passes hex bytes as **linear** uniforms and converts on output. Use `new Color().setRGB(r/255, g/255, b/255)`, not `new Color("#hex")`. Some passes write raw with **no** output conversion (dark page, text plane): match per pass by sampling pixels |
| Dark page renders olive (#6E7363) | A double linear→sRGB conversion. Remove `colorspace_fragment` from that pass |
| Rive transition skipped (no "4" mask) | `transition-in` was set before the `initial` state was drawn. Load the transition Rive **first**, wait 2 rAF, then load the rest (the reference's order) |
| Reveals fire early / wrong positions | Lazy images shift layout after ScrollTrigger measured. Call `ScrollTrigger.refresh()` on image `load` (capture phase, debounced) |
| Nav colours wrong far down the page | Section `update()` functions ran on refresh outside their range. Guard every nav write with the section's own scroll range; use `[data-nav-theme-target]` markers with "latest active wins" for nesting |
| Parallax image narrower than its frame | The global `img { max-width: 100% }` capped the overscan. Add `max-width: none` |
| Component renders nothing | Nuxt prefixes by folder: `components/home/HelmetFrame.vue` is `<HomeHelmetFrame>` |
| Effects hit the wrong card | `ref` arrays inside `v-for` aren't order-guaranteed. Use index-keyed function refs |
| Condensed caps labels too wide or narrow | Labels declared `font-variation-settings: "wdth" 86` render as true 86 **except** the nav Store label (≈ 96.5). Measure with `fontwidth.mjs` before applying a workaround |
| Mixed-font lines split wrongly | Group words into lines by vertical overlap (centre > current line bottom), not by `offsetTop` |
| Frame-by-frame mismatch in scan bands, contours, marquees | Clock / phase offset from load timing, not code. Compare period averages, or mask time-based bands |
| Reference "pointer" captures do nothing | The site ignored synthetic moves and ran its idle cursor loop. Read the idle logic in the bundle |
| A section's head `h2` measures 32 px | It's the screen-reader copy. Probe the visible `.line` / span instead |
| Columns or gaps measured wrong | Measured mid-animation. Re-measure when the transforms read `none` |
| `json.dump` rewrote all of `home.json` | Edit content JSON with targeted string replacement, then `json.loads` to validate |
| First match of `"socials"` in JSON was the wrong block | Anchor edits on a unique nearby string |

---

## 4. Reusable building blocks in this repo

| File | What it is |
|---|---|
| `components/HighLines.vue` | The site-wide highlighter line reveal (`[data-anim-high]`): browser-line split, clip + bar, 0.15 s stagger, 0.6 s power2. Props: `color`, `direction`, `delay`, `manual` + `play()` (horizontal tracks) |
| `components/RiveCanvas.vue` | Any artboard from the preloaded `.riv` files. Reactive bool/number inputs, `playOnView` (10 % in view, −10 % bottom margin, +100 ms), `autoplay` + `play()` |
| `components/Marquee.vue` | `marquee-adv`: vw/speed px/s drift, reverses on upward scroll, ±shift vw scroll offset |
| `composables/useRiveFiles.ts` | Preloads every Rive file once (the boot screen waits for it, like the reference) |
| `composables/useHomeScroll.ts` | Lenis (`lerp 0.1`, reference options) + hero scroll-out, nav theme markers, line fade, refresh-on-image-load |
| `webgl/Experience.ts` | Pass order matching the reference (composite reads last frame's buffers); `setHeroScroll`, `setPageTint`, `setPageLineFade` |
| `webgl/fluid/*` | Stable fluids + idle cursor sweep (2.5 s boot, 9.5 s loop) |
| `webgl/passes/*` | Contour noise (Ashima simplex), dark page, hero composite (rect + grey filter), texture plane |
| `webgl/scenes/*` | Head (2.5D displaced plane + wireframe), helmet (livery shader), MSDF marquee text |
| `tools/probes/*` | The measurement scripts in §1 |
| `.reanimate/<section>/spec.md` | Per-section facts + scores (hero, impact, track, otot, helmets, socials, footer) |

**Recurring reference patterns** (likely on other OFF+BRAND / Webflow builds):

- **Fluid unit:** 1rem = `clamp(992px, 100vw, 1920px) / 1728 × 16`.
- **Highlighter:** `[data-anim-high="dir, colour, delayMs"]`, triggered at "top 90%" once. In horizontal tracks it triggers when the left edge passes 90 % of vw.
- **Oval title:** `[data-oval-scroll]`, clip `ellipse(20% 0% at 50% 0)` → `(100% 120%)`, 1.5 s power2.inOut.
- **Scroll Rives:** input `scroll` = progress × 1000, scrub 0.5.
- **GL page tint:** `[data-gl-change-from/to]` on sections.
- **Nav ink:** `[data-nav-theme-target]` markers.
- **Easing:** `cubic-bezier(0.65, 0.05, 0, 1)` 0.75 s for hovers and clips; `elastic.out(1, 0.75)` for springy UI.

---

## 5. Token-saving rules

1. **Never paste or read a bundle whole.** Use `bundle.py` with a needle, about 1.5 kB per hit.
2. **Screenshots:** compose ref/clone side-by-sides at half size, crop to the hot grid cell, and view 1–2 images per round. Read numbers (score, grid) before images.
3. **One probe per question, many values per probe:** sample all positions in a single browser session; run independent captures in parallel.
4. **Don't re-derive:** put every fact in the section `spec.md` the moment it's measured; later rounds read the spec, not the site.
5. **Fit, don't eyeball:** 4–6 samples plus a quick ratio test identify linear / power / elastic curves.
6. **Short replies.** Tables of scores, no recaps. Saved in memory.
7. **Cheap models for mechanical steps** (§2C).

---

## 6. Status of this clone (2026-11-05)

| Section | Status | Mismatch |
|---|---|---|
| Preloader + "4" reveal | ✅ | 0–0.65 % (aligned frames) |
| Hero (head, contours, wireframe, fluid helmet reveal) | ✅ | 0.5–1.2 % |
| Hero overlays + scroll-out / marquee text / signature | ✅ | 0.2–0.7 % (text phase masked) |
| Impact | ✅ | 0.16–0.41 % |
| Horizontal track | ✅ | 0.33–0.83 % |
| On / Off track | ✅ | 0.20–0.73 % |
| Helmets Hall of Fame | ✅ | 0.49–1.84 % |
| Store ("World Drivers' Champion") | ⏳ old rebuild | — |
| Partners marquee (`is-home-collabs`) | ⏳ old rebuild (line-fade + nav marker wired) | — |
| Socials | ✅ | 0.20–0.39 % |
| Footer | ✅ | 0.41–0.97 % |

**Known residuals:**
- Text, contour and marquee phase is load-time dependent.
- The boot screen is shorter than the reference because less loads.
- Helmet images use full-size files where the reference serves `srcset` sizes.
- The hover video stream isn't replicated (it never showed on the reference).

**Next clone, in one line:** re-crawl → `section.mjs` / `styles.mjs` per section → bundle needles for timings → build with the §4 pieces → `score.py` until ≤ 2 % → commit with numbers.
