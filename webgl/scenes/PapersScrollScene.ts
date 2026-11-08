import {
  DirectionalLight,
  DoubleSide,
  Group,
  HemisphereLight,
  type Mesh,
  type MeshStandardMaterial,
  PerspectiveCamera,
  Scene,
  ShaderMaterial,
  type WebGLRenderer,
  WebGLRenderTarget
} from "three";

import { loadModel } from "../loaders";
import { FullscreenPass } from "../passes/FullscreenPass";
import { fullRect, rectVert } from "../passes/rect";
import type { HelmetScrollState } from "./HelmetScrollScene";

const quadInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
const quadIn = (t: number) => t * t;
const quadOut = (t: number) => 1 - (1 - t) * (1 - t);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Pile scale: its half-diagonal (0.59 of a unit-long pile) fits the square view at every spin angle. */
const PILE_SCALE = 0.58;

/**
 * On Track "tax" variant of the flying helmet: the paper & envelope pile (tools/blender/convert_papers.py)
 * seen from the top. Same contract as HelmetScrollScene — useHelmetFlip feeds the plane centre / side /
 * progress along the pos1 → pos2 → pos3 path, the scene renders into a screen-sized target and draws a
 * square plane with faded edges. The helmet's turntable spin becomes a spin around the view axis
 * (PI/2.2 → 4PI, power1.inOut) with the same small tilt (PI/12 → −PI/10 → PI/20) for depth.
 */
export class PapersScrollScene {
  readonly scene = new Scene();
  readonly camera = new PerspectiveCamera(20, 1, 0.1, 1000);
  readonly #spin = new Group();
  readonly #tilt = new Group();
  #pile: Group | null = null;
  readonly #target = new WebGLRenderTarget(1, 1, { samples: 4 });
  readonly #plane = new FullscreenPass(
    new ShaderMaterial({
      uniforms: { tDiffuse: { value: this.#target.texture }, uRect: { value: fullRect() } },
      vertexShader: rectVert,
      fragmentShader: /* glsl */ `
        uniform sampler2D tDiffuse;
        varying vec2 vUv;
        void main() {
          gl_FragColor = texture2D(tDiffuse, vUv);
          gl_FragColor.a *= smoothstep(0.5, 0.4, abs(vUv.x - 0.5));
          gl_FragColor.a *= smoothstep(0.5, 0.4, abs(vUv.y - 0.5));
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }
      `,
      transparent: true,
      depthTest: false,
      depthWrite: false
    })
  );
  readonly #state: HelmetScrollState = { x: 0, y: 0, size: 0, progress: 0, rendering: false };
  readonly #size = { w: 1, h: 1 };

  constructor() {
    this.camera.position.z = 2;
    this.#tilt.add(this.#spin);
    this.scene.add(this.#tilt);
    // Neutral, soft light (the paper should read white-grey like the photo, not studio-warm):
    // a white sky / grey ground fill plus a key from the top-left.
    this.scene.add(new HemisphereLight(0xffffff, 0x8a8f8c, 2.2));
    const key = new DirectionalLight(0xffffff, 1.4);
    key.position.set(-1, 1.5, 2);
    this.scene.add(key);
  }

  async load() {
    const model = await loadModel("/gl/models/papers/papers.glb");

    const pile = model.clone();
    pile.traverse((obj) => {
      const mesh = obj as Mesh;
      if (!mesh.isMesh) return;
      const mat = (mesh.material as MeshStandardMaterial).clone();
      mat.side = DoubleSide; // single sheets: their backs show while tilting
      mesh.material = mat;
    });
    // glTF pile lies on the XZ plane (+Y up); stand it up so its top faces the camera (+Z).
    pile.rotation.x = Math.PI / 2;
    // Centre the pile's thickness on the spin axis.
    pile.position.z = 0;
    pile.scale.setScalar(PILE_SCALE);
    this.#pile = pile;
    this.#spin.add(pile);
    this.#applyProgress();
  }

  resize(width: number, height: number, pixelRatio: number) {
    this.#size.w = width;
    this.#size.h = height;
    this.#target.setSize(Math.round(width * pixelRatio), Math.round(height * pixelRatio));
  }

  set(state: HelmetScrollState) {
    Object.assign(this.#state, state);
  }

  #applyProgress() {
    if (!this.#pile) return;
    const p = Math.min(this.#state.progress + 0.001, 1);
    this.#spin.rotation.z = lerp(Math.PI / 2.2, Math.PI * 4, quadInOut(p));
    this.#tilt.rotation.x =
      p < 0.5 ? lerp(Math.PI / 12, -Math.PI / 10, quadIn(p / 0.5)) : lerp(-Math.PI / 10, Math.PI / 20, quadOut((p - 0.5) / 0.5));
  }

  /** Pile → offscreen target, then the faded square plane onto the current target. */
  render(renderer: WebGLRenderer) {
    if (!this.#pile || !this.#state.rendering) return;
    this.#applyProgress();
    const target = renderer.getRenderTarget();
    renderer.setRenderTarget(this.#target);
    renderer.clear();
    renderer.render(this.scene, this.camera);

    const { w, h } = this.#size;
    const { x, y, size } = this.#state;
    const screenY = y - window.scrollY;
    this.#plane.material.uniforms.uRect.value.set(size / w, size / h, (x / w) * 2 - 1, 1 - (screenY / h) * 2);
    this.#plane.render(renderer, target);
  }

  dispose() {
    this.#pile?.traverse((obj) => {
      const m = obj as Mesh;
      if (!m.isMesh) return;
      const mat = m.material as MeshStandardMaterial;
      mat.map?.dispose();
      mat.normalMap?.dispose();
      mat.roughnessMap?.dispose();
      mat.metalnessMap?.dispose();
      mat.dispose();
    });
    this.#target.dispose();
    this.#plane.dispose();
  }
}
