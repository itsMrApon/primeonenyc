# Prime One agency homepage (`primeone_agency`)

Nuxt 3 + GSAP + Three.js + Rive homepage built on the finished Lando Norris clone in `~/Dev/web/crawl/boilerplate_agency`, rebranded for Prime One.

## Stack

- **Nuxt 3.14** (`ssr: false`)
- **Three.js** — hero helmet/head WebGL (`webgl/`)
- **GSAP ScrollTrigger** — horizontal photo track pin/scrub, reveals, nav theme
- **Lenis** — smooth scroll
- **pnpm** package manager

## Run

```bash
cd /Users/itsmrapon/Dev/threejs/primeone_agency
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
| `webgl/scenes/` | `HeroStage`, `UmbrellaScene` (hero diorama), `MarqueeTextScene`, `TaxiScene` (backup) |
| `tools/blender/build_hero_miniature.py` | Builds the hero diorama GLB |
| `components/RiveCanvas.vue` / `public/rive/` | Rive player + `.riv` files |
| `composables/useHomeScroll.ts` | ScrollTrigger + Lenis |
| `components/home/*` | Homepage sections |
| `assets/css/` | Brand tokens + base styles (+ vendored Webflow CSS in `original/`) |

## Reference

The behaviour reference is the boilerplate clone. Run it from this repo with the `boilerplate` config in `.claude/launch.json` (port 3002). `docs/EXACT-CLONE-PLAYBOOK.md` documents how that clone was built (gotchas, building blocks, probes in `tools/probes/`).
