# Lando Norris homepage rebuild (`boilerplate_agency`)

Nuxt 3 + GSAP + Three.js rebuild of [landonorris.com](https://landonorris.com/) following the Clone playbook patterns from `boilerplatestorytelling/` and `CLONE-PLAYBOOK.md`.

## Stack

- **Nuxt 3.14** (`ssr: false`)
- **Three.js** — hero helmet/head WebGL (`webgl/`)
- **GSAP ScrollTrigger** — horizontal photo track pin/scrub, reveals, nav theme
- **Lenis** — smooth scroll
- **pnpm** package manager

## Run

```bash
cd /Users/itsmrapon/Dev/web/crawl/boilerplate_agency
pnpm install
pnpm dev
```

Open the URL Nuxt prints (usually `http://localhost:3000`).

Node **20+** recommended (see `.nvmrc`). Scripts use `NODE_OPTIONS=--experimental-require-module` for Nuxt 3.14 on Node 20.

## Project map

| Path | Role |
| --- | --- |
| `CONTENT.md` / `content/home.json` | Editable homepage copy & links |
| `public/gl/` | Models, textures, HDRI, Draco, Basis |
| `public/images/` | Horiz photos, helmets, partners, store, misc |
| `public/fonts/` | Mona Sans Variable, Brier Bold |
| `webgl/Experience.ts` | Renderer + RAF loop |
| `webgl/scenes/HeadScene.ts` | Helmet GLB + parallax |
| `composables/useHomeScroll.ts` | ScrollTrigger + Lenis |
| `components/home/*` | Homepage sections |
| `assets/css/` | Brand tokens + base styles (+ vendored Webflow CSS in `original/`) |

## Assets source

Copied from `../output-lando/`:

- GL: `assets/lando.itsoffbrand.io/gl/`
- Images/fonts: `assets/website-files/`
- CSS reference: `assets/webflow/lando-offbrand.shared.*.css`

## Fidelity notes

**Close / intentional match:** lime hero, dark-green body, Mona/Brier typography, Next Race card, impact quote, horizontal scrub track, on/off track split, helmets grid, store/champion, partners marquee, socials, footer tagline.

**Approximated:** custom OFF+BRAND WebGL shaders, head skinning pipeline, fluid cursor, track carousel GL, MSDF titles.

**Not ported:** Rive circuits / morphs / page transitions (files sit in `public/rive/` for later wiring).
