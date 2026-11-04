# CLAUDE.md

## Project

Lando Norris homepage rebuild — Nuxt 3 (`ssr: false`) + GSAP ScrollTrigger + Lenis + Three.js. See `README.md` for the project map and `CONTENT.md` / `content/home.json` for copy.

- Package manager: **pnpm** (never npm/yarn). Node 20 (`.nvmrc`).
- Run: `pnpm dev` → http://localhost:3000. Type check: `pnpm typecheck`.
- 3D assets live in `public/gl/` (GLB models, Draco + Basis decoders, HDRI, textures). Decoders are vendored but not wired yet — when adding DRACOLoader/KTX2Loader, point them at `/gl/draco/` and `/gl/basis/`.
- WebGL entry: `webgl/Experience.ts` (renderer + RAF loop), scenes in `webgl/scenes/`, mounted by `components/webgl/ExperienceCanvas.vue`.
- Scroll: `composables/useHomeScroll.ts` owns Lenis + ScrollTrigger. Keep one Lenis instance and one GSAP ticker; don't add a second RAF loop.
- Rive files in `public/rive/` are not wired yet.

## Verifying visual work

Typecheck passing is not "done" for animation/3D changes. After a change:
1. Run the dev server and open it in the browser pane.
2. Check the console for WebGL/shader/loader errors and the network tab for 404s on `/gl/**`.
3. Screenshot the affected section (scroll to it) and compare to the live reference (https://landonorris.com/) or the mirror in `../output-lando/`.
4. For motion that must match the reference exactly, use the `/reanimate` skill.

Clean up on unmount: dispose Three.js geometries/materials/textures, kill ScrollTriggers and GSAP timelines, destroy Lenis.

## Model use

- Mechanical work (running crawl scripts, moving/renaming assets, extracting copy into `content/home.json`) → delegate to a cheaper subagent (Sonnet/Haiku).
- Shaders, WebGL scene code, GSAP timing, animation matching → keep on Opus.
- Tell the user when a task looks like it needs a different model than the current one.

## Assets & licensing

Assets, fonts, and branding here are copied from landonorris.com. This repo is a learning/template project — don't present it as shippable for a client without replacing third-party assets and branding.

---

# Behavioral guidelines

Behavioral guidelines to reduce common LLM coding mistakes (from [andrej-karpathy-skills](https://github.com/forrestchang/andrej-karpathy-skills)). Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.
