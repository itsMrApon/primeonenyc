import {
  Clock,
  LinearFilter,
  NoToneMapping,
  SRGBColorSpace,
  Vector2,
  WebGLRenderTarget,
  WebGLRenderer
} from "three";

import { FluidSim } from "./fluid/FluidSim";
import { IdleCursor } from "./fluid/IdleCursor";
import { ContourNoisePass } from "./passes/ContourNoisePass";
import { HeroCompositePass } from "./passes/HeroCompositePass";
import { HeadScene } from "./scenes/HeadScene";
import { HelmetScene } from "./scenes/HelmetScene";

export interface ExperienceOptions {
  canvas: HTMLCanvasElement;
  onProgress?: (progress: number, label: string) => void;
}

/**
 * Hero pipeline, in the reference's per-frame order (see .reanimate/hero/spec.md):
 *   1. head scene (+ wireframe)      → headTarget (MSAA)
 *   2. composite → screen            (reads last frame's contours / fluid / helmet)
 *   3. contour noise                 → contourTarget
 *   4. fluid sim (idle sweep or mouse) → fluid.output
 *   5. helmet scene                  → helmetTarget (MSAA)
 */
export class Experience {
  readonly #canvas: HTMLCanvasElement;
  readonly #renderer: WebGLRenderer;
  readonly #clock = new Clock();
  readonly #onProgress?: ExperienceOptions["onProgress"];

  readonly head = new HeadScene();
  readonly helmet = new HelmetScene();
  readonly #fluid = new FluidSim();
  readonly #idle = new IdleCursor();
  readonly #pointer = new Vector2();

  readonly #headTarget = new WebGLRenderTarget(1, 1, { samples: 4 });
  readonly #helmetTarget = new WebGLRenderTarget(1, 1, { samples: 4 });
  readonly #contourTarget = new WebGLRenderTarget(1, 1, {
    minFilter: LinearFilter,
    magFilter: LinearFilter,
    depthBuffer: false
  });
  readonly #contours = new ContourNoisePass();
  readonly #composite = new HeroCompositePass({
    contours: this.#contourTarget.texture,
    head: this.#headTarget.texture,
    helmet: this.#helmetTarget.texture,
    cursorEffect: this.#fluid.output.texture
  });

  #running = false;
  #frame = 0;
  #disposed = false;
  #heroVisible = true;

  constructor(options: ExperienceOptions) {
    this.#canvas = options.canvas;
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
    this.#renderer.setClearColor(0x000000, 0);
    this.#renderer.autoClear = false;
    this.head.cursorEffect.value = this.#fluid.output.texture;
    // Clock starts at construction, like the reference's uTime (≈ seconds since load).
    this.#clock.start();
  }

  async load() {
    this.#onProgress?.(0.15, "Loading head");
    await Promise.all([this.head.load(this.#renderer), this.helmet.load()]);
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
    for (const t of [this.#headTarget, this.#helmetTarget, this.#contourTarget]) t.setSize(w, h);
    this.#fluid.resize(w, h);
    this.#contours.material.uniforms.uAspect.value = w / h;
    this.head.resize(w, h);
  }

  /** Real pointer in NDC (−1..1, y up). */
  setPointer(nx: number, ny: number) {
    this.#pointer.set(nx, ny);
  }

  setHeroVisible(visible: boolean) {
    if (this.#heroVisible === visible) return;
    this.#heroVisible = visible;
    this.#canvas.style.opacity = visible ? "1" : "0";
  }

  dispose() {
    this.#disposed = true;
    this.stop();
    this.head.dispose();
    this.helmet.dispose();
    this.#fluid.dispose();
    this.#idle.dispose();
    this.#contours.dispose();
    this.#composite.dispose();
    for (const t of [this.#headTarget, this.#helmetTarget, this.#contourTarget]) t.dispose();
    this.#renderer.dispose();
  }

  readonly #tick = () => {
    if (!this.#running || this.#disposed) return;
    this.#clock.getDelta();
    const elapsed = this.#clock.elapsedTime;
    const r = this.#renderer;

    if (this.#heroVisible) {
      this.head.update(elapsed);
      r.setRenderTarget(this.#headTarget);
      r.clear();
      r.render(this.head.scene, this.head.camera);

      r.setRenderTarget(null);
      r.clear();
      this.#composite.render(r, null);

      this.#contours.material.uniforms.uTime.value = elapsed;
      this.#contours.render(r, this.#contourTarget);

      this.#idle.update();
      const p = this.#idle.isMoving ? this.#pointer : this.#idle.cursor;
      this.#fluid.setPointer(p.x, p.y, this.#idle.isMoving);
      this.#fluid.update(r);

      r.setRenderTarget(this.#helmetTarget);
      r.clear();
      r.render(this.helmet.scene, this.head.camera);
    }

    this.#frame = requestAnimationFrame(this.#tick);
  };
}
