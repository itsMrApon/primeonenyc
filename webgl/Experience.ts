import {
  ACESFilmicToneMapping,
  Clock,
  Color,
  Vector2,
  WebGLRenderer
} from "three";

import { BackgroundScene } from "./scenes/BackgroundScene";
import { HeadScene } from "./scenes/HeadScene";

export interface ExperienceOptions {
  canvas: HTMLCanvasElement;
  onProgress?: (progress: number, label: string) => void;
}

/**
 * Fixed fullscreen WebGL experience sitting behind the DOM overlays.
 * Hero uses the displaced head plane (OFF+BRAND AX port).
 */
export class Experience {
  readonly #canvas: HTMLCanvasElement;
  readonly #renderer: WebGLRenderer;
  readonly #clock = new Clock();
  readonly #onProgress?: ExperienceOptions["onProgress"];

  readonly head = new HeadScene();
  readonly background = new BackgroundScene("#d2ff00");

  #running = false;
  #frame = 0;
  #disposed = false;
  #heroVisible = true;

  constructor(options: ExperienceOptions) {
    this.#canvas = options.canvas;
    this.#onProgress = options.onProgress;

    this.#renderer = new WebGLRenderer({
      canvas: options.canvas,
      antialias: true,
      alpha: true,
      powerPreference: "high-performance"
    });
    this.#renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.#renderer.toneMapping = ACESFilmicToneMapping;
    this.#renderer.toneMappingExposure = 1.2;
    this.#renderer.setClearColor(new Color("#d2ff00"), 1);
  }

  async load() {
    this.#onProgress?.(0.15, "Loading head");
    await this.head.load(this.#renderer);
    this.#onProgress?.(1, "Ready");
  }

  start() {
    if (this.#running || this.#disposed) return;
    this.#running = true;
    this.#clock.start();
    this.#frame = requestAnimationFrame(this.#tick);
  }

  stop() {
    this.#running = false;
    cancelAnimationFrame(this.#frame);
  }

  resize(width: number, height: number) {
    this.#renderer.setSize(Math.max(1, width), Math.max(1, height), false);
    this.head.resize(width, height);
  }

  setPointer(nx: number, ny: number) {
    this.head.setPointer(nx, ny);
  }

  /** Fade canvas when leaving the sticky lime hero. */
  setHeroVisible(visible: boolean) {
    if (this.#heroVisible === visible) return;
    this.#heroVisible = visible;
    if (visible) {
      this.background.setColor("#d2ff00", 0.6);
      this.#renderer.setClearColor(new Color("#d2ff00"), 1);
      this.#canvas.style.opacity = "1";
    } else {
      this.background.setColor("#282c20", 0.8);
      this.#renderer.setClearColor(new Color("#282c20"), 0);
      this.#canvas.style.opacity = "0";
    }
  }

  dispose() {
    this.#disposed = true;
    this.stop();
    this.head.dispose();
    this.background.dispose();
    this.#renderer.dispose();
  }

  readonly #tick = () => {
    if (!this.#running || this.#disposed) return;
    const dt = Math.min(this.#clock.getDelta(), 0.05);
    this.head.update(dt);

    this.#renderer.autoClear = true;
    if (this.#heroVisible) {
      this.#renderer.render(this.head.scene, this.head.camera);
    }

    this.#frame = requestAnimationFrame(this.#tick);
  };
}
