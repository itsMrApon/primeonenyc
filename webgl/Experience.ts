import {
  Clock,
  LinearFilter,
  NoToneMapping,
  PCFShadowMap,
  SRGBColorSpace,
  Vector2,
  WebGLRenderTarget,
  WebGLRenderer
} from "three";

import { FluidSim } from "./fluid/FluidSim";
import { IdleCursor } from "./fluid/IdleCursor";
import { ContourNoisePass } from "./passes/ContourNoisePass";
import { DarkContourPass } from "./passes/DarkContourPass";
import { HeroCompositePass } from "./passes/HeroCompositePass";
import { setRect } from "./passes/rect";
import { TexturePlanePass } from "./passes/TexturePlanePass";
import type { HeroStage } from "./scenes/HeroStage";
import { TaxiScene } from "./scenes/TaxiScene";
import { UmbrellaScene } from "./scenes/UmbrellaScene";
import { MarqueeTextScene } from "./scenes/MarqueeTextScene";

const easeInOutQuad = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
/** Hero card size at the end of the shrink, in reference units (1u = 13.33 px at 1440). */
const CARD_U = { w: 472 / (1440 / 108), h: 305 / (1440 / 108) };
const CURSOR_FADE_S = 0.233;
/** Hero subject: "umbrella" (home + car under cover) or the backup "taxi". */
const HERO: "umbrella" | "taxi" = "umbrella";

export interface ExperienceOptions {
  canvas: HTMLCanvasElement;
  onProgress?: (progress: number, label: string) => void;
}

/**
 * Hero pipeline, in the reference's per-frame order (see .reanimate/hero/spec.md):
 *   1. hero scene (HERO)             → headTarget (MSAA)
 *   2. marquee text                  → textTarget (MSAA)
 *   3. screen: dark contour page, text plane, hero card
 *      (reads last frame's contours / fluid / reveal)
 *   4. contour noise                 → contourTarget
 *   5. fluid sim (idle sweep or mouse) → fluid.output
 *   6. hero reveal scene             → revealTarget (MSAA), shown under the fluid mask
 *
 * Scroll-out (setHeroScroll): over the first 100vh of the 200vh hero track the
 * card shrinks 1440×900 → 472×305 (eased power1.inOut), filters to grey and
 * the camera dollies in 1 unit; past that, card + text move up with the page.
 */
export class Experience {
  readonly #renderer: WebGLRenderer;
  readonly #clock = new Clock();
  readonly #onProgress?: ExperienceOptions["onProgress"];

  readonly hero: HeroStage = HERO === "taxi" ? new TaxiScene() : new UmbrellaScene();
  readonly #fluid = new FluidSim();
  readonly #idle = new IdleCursor();
  readonly #pointer = new Vector2();

  readonly marquee = new MarqueeTextScene();
  readonly #headTarget = new WebGLRenderTarget(1, 1, { samples: 4 });
  readonly #revealTarget = new WebGLRenderTarget(1, 1, { samples: 4 });
  readonly #textTarget = new WebGLRenderTarget(1, 1, { samples: 4 });
  readonly #contourTarget = new WebGLRenderTarget(1, 1, {
    minFilter: LinearFilter,
    magFilter: LinearFilter,
    depthBuffer: false
  });
  readonly #contours = new ContourNoisePass();
  readonly #darkPage = new DarkContourPass(this.#contourTarget.texture);
  readonly #textPlane = new TexturePlanePass(this.#textTarget.texture);
  readonly #composite = new HeroCompositePass({
    contours: this.#contourTarget.texture,
    head: this.#headTarget.texture,
    reveal: this.#revealTarget.texture,
    cursorEffect: this.#fluid.output.texture
  });

  readonly #size = { w: 1, h: 1 };
  readonly #scroll = { progress: 0, offset: 0 };
  #cursorIntensity = 1;

  #running = false;
  #frame = 0;
  #disposed = false;

  constructor(options: ExperienceOptions) {
    this.#onProgress = options.onProgress;

    this.#renderer = new WebGLRenderer({
      canvas: options.canvas,
      antialias: false,
      alpha: true,
      premultipliedAlpha: true,
      // Reference compiles every three.js program at lowp; match it.
      precision: "lowp",
      powerPreference: "high-performance"
    });
    this.#renderer.setPixelRatio(1);
    this.#renderer.outputColorSpace = SRGBColorSpace;
    this.#renderer.toneMapping = NoToneMapping;
    // Hero sun shadows (only the hero scene has shadow-casting lights).
    this.#renderer.shadowMap.enabled = true;
    this.#renderer.shadowMap.type = PCFShadowMap;
    // The miniature look gets a slight tilt-shift; the taxi backup stays sharp.
    this.#composite.material.uniforms.uTiltShift.value = HERO === "umbrella" ? 1 : 0;
    this.#renderer.setClearColor(0x000000, 0);
    this.#renderer.autoClear = false;
    // Clock starts at construction, like the reference's uTime (≈ seconds since load).
    this.#clock.start();
  }

  async load() {
    this.#onProgress?.(0.15, "Loading hero");
    await Promise.all([this.hero.load(this.#renderer), this.marquee.load()]);
    this.#onProgress?.(1, "Ready");
  }

  start() {
    if (this.#running || this.#disposed) return;
    this.#running = true;
    this.#frame = requestAnimationFrame(this.#tick);
  }

  stop() {
    this.#running = false;
    cancelAnimationFrame(this.#frame);
  }

  resize(width: number, height: number) {
    const w = Math.max(1, Math.round(width));
    const h = Math.max(1, Math.round(height));
    this.#renderer.setSize(w, h, false);
    this.#size.w = w;
    this.#size.h = h;
    for (const t of [this.#headTarget, this.#textTarget, this.#revealTarget, this.#contourTarget]) t.setSize(w, h);
    this.#fluid.resize(w, h);
    this.#contours.material.uniforms.uAspect.value = w / h;
    this.hero.resize(w, h);
    this.marquee.resize(w, h);
  }

  /**
   * progress: 0 → 1 over the hero track's sticky part (first 100vh);
   * offset: px the track has scrolled past that (card moves up by this much).
   */
  setHeroScroll(progress: number, offset: number) {
    this.#scroll.progress = Math.min(Math.max(progress, 0), 1);
    this.#scroll.offset = Math.max(offset, 0);
  }

  /** Page colour under transparent sections: 0 dark green → 1 off-white. */
  setPageTint(t: number) {
    this.#darkPage.setTint(Math.min(Math.max(t, 0), 1));
  }

  /** Fade the contour lines into the page colour (0 visible → 1 gone). */
  setPageLineFade(t: number) {
    this.#darkPage.setLineFade(Math.min(Math.max(t, 0), 1));
  }

  #applyScroll(dt: number) {
    const { w, h } = this.#size;
    const e = easeInOutQuad(this.#scroll.progress);
    const unit = Math.min(Math.max(w, 992), 1920) / 108;
    const cardW = lerp(w, CARD_U.w * unit, e);
    const cardH = lerp(h, CARD_U.h * unit, e);
    const offset = this.#scroll.offset;

    setRect(this.#composite.material.uniforms.uRect.value, cardW, cardH, offset, w, h);
    setRect(this.#textPlane.material.uniforms.uRect.value, w, h, offset, w, h);

    const u = this.#composite.material.uniforms;
    u.uFilter.value = e;
    const target = this.#scroll.progress < 0.5 ? 1 : 0;
    const step = dt / CURSOR_FADE_S;
    this.#cursorIntensity += Math.max(-step, Math.min(step, target - this.#cursorIntensity));
    u.uCursorIntensity.value = this.#cursorIntensity;

    this.hero.setCameraOffset(-e, (offset / h) * 0.1);
  }

  /** Real pointer in NDC (−1..1, y up). */
  setPointer(nx: number, ny: number) {
    this.#pointer.set(nx, ny);
  }


  dispose() {
    this.#disposed = true;
    this.stop();
    this.hero.dispose();
    this.#fluid.dispose();
    this.marquee.dispose();
    this.#darkPage.dispose();
    this.#textPlane.dispose();
    this.#idle.dispose();
    this.#contours.dispose();
    this.#composite.dispose();
    for (const t of [this.#headTarget, this.#textTarget, this.#revealTarget, this.#contourTarget]) t.dispose();
    this.#renderer.dispose();
  }

  readonly #tick = () => {
    if (!this.#running || this.#disposed) return;
    const dt = Math.min(this.#clock.getDelta(), 0.1);
    const elapsed = this.#clock.elapsedTime;
    const r = this.#renderer;

    this.#applyScroll(dt);
    // The dark contour page stays on behind the transparent sections below the
    // hero (reference); the hero layers only render while they are on screen.
    const heroOnScreen = this.#scroll.offset < this.#size.h;

    if (heroOnScreen) {
      this.hero.update(elapsed);
      r.setRenderTarget(this.#headTarget);
      r.clear();
      r.render(this.hero.scene, this.hero.camera);

      this.marquee.update(dt);
      r.setRenderTarget(this.#textTarget);
      r.clear();
      r.render(this.marquee.scene, this.marquee.camera);
    }

    r.setRenderTarget(null);
    r.clear();
    this.#darkPage.render(r, null);
    if (heroOnScreen) {
      this.#textPlane.render(r, null);
      this.#composite.render(r, null);
    }

    this.#contours.material.uniforms.uTime.value = elapsed;
    this.#contours.render(r, this.#contourTarget);

    if (heroOnScreen) {
      this.#idle.update();
      const p = this.#idle.isMoving ? this.#pointer : this.#idle.cursor;
      this.#fluid.setPointer(p.x, p.y, this.#idle.isMoving);
      this.#fluid.update(r);

      r.setRenderTarget(this.#revealTarget);
      r.clear();
      r.render(this.hero.revealScene, this.hero.camera);
    }

    this.#frame = requestAnimationFrame(this.#tick);
  };
}
