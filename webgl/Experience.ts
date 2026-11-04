import {
  Clock,
  LinearFilter,
  NoToneMapping,
  SRGBColorSpace,
  WebGLRenderTarget,
  WebGLRenderer
} from "three";

import { ContourNoisePass } from "./passes/ContourNoisePass";
import { HeroCompositePass } from "./passes/HeroCompositePass";
import { HeadScene } from "./scenes/HeadScene";

export interface ExperienceOptions {
  canvas: HTMLCanvasElement;
  onProgress?: (progress: number, label: string) => void;
}

/**
 * Hero pipeline (matches the reference's pass order, see .reanimate/hero/spec.md):
 *   head scene → headTarget (MSAA)
 *   contour noise → contourTarget
 *   composite(contours, head) → screen
 */
export class Experience {
  readonly #canvas: HTMLCanvasElement;
  readonly #renderer: WebGLRenderer;
  readonly #clock = new Clock();
  readonly #onProgress?: ExperienceOptions["onProgress"];

  readonly head = new HeadScene();
  readonly #headTarget = new WebGLRenderTarget(1, 1, { samples: 4 });
  readonly #contourTarget = new WebGLRenderTarget(1, 1, {
    minFilter: LinearFilter,
    magFilter: LinearFilter,
    depthBuffer: false
  });
  readonly #contours = new ContourNoisePass();
  readonly #composite = new HeroCompositePass(this.#contourTarget.texture, this.#headTarget.texture);

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
      // Reference compiles every three.js program at lowp; on Apple/ANGLE this
      // changes lighting and blending results visibly, so match it.
      precision: "lowp",
      powerPreference: "high-performance"
    });
    this.#renderer.setPixelRatio(1);
    this.#renderer.outputColorSpace = SRGBColorSpace;
    this.#renderer.toneMapping = NoToneMapping;
    this.#renderer.setClearColor(0x000000, 0);
    this.#renderer.autoClear = false;
    // Clock starts at construction, like the reference's uTime (≈ seconds since load).
    this.#clock.start();
  }

  async load() {
    this.#onProgress?.(0.15, "Loading head");
    await this.head.load(this.#renderer);
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
    this.#headTarget.setSize(w, h);
    this.#contourTarget.setSize(w, h);
    this.#contours.material.uniforms.uAspect.value = w / h;
    this.head.resize(w, h);
  }

  setPointer(nx: number, ny: number) {
    this.head.setPointer(nx, ny);
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
    this.#contours.dispose();
    this.#composite.dispose();
    this.#headTarget.dispose();
    this.#contourTarget.dispose();
    this.#renderer.dispose();
  }

  readonly #tick = () => {
    if (!this.#running || this.#disposed) return;
    const dt = Math.min(this.#clock.getDelta(), 0.05);
    const r = this.#renderer;

    if (this.#heroVisible) {
      this.head.update(dt, this.#clock.elapsedTime);

      r.setRenderTarget(this.#headTarget);
      r.clear();
      r.render(this.head.scene, this.head.camera);

      this.#contours.material.uniforms.uTime.value = this.#clock.elapsedTime;
      this.#contours.render(r, this.#contourTarget);

      r.setRenderTarget(null);
      r.clear();
      this.#composite.render(r, null);
    }

    this.#frame = requestAnimationFrame(this.#tick);
  };
}
