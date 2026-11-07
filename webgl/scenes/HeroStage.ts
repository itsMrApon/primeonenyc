import {
  Group,
  type Material,
  type Mesh,
  MeshStandardMaterial,
  type Object3D,
  PerspectiveCamera,
  PMREMGenerator,
  Scene,
  ShaderMaterial,
  type Texture,
  type WebGLRenderer
} from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader.js";

/** Studio HDRI that ships in /gl/hdri, prefiltered for PBR reflections. */
export async function createStudioEnvironment(renderer: WebGLRenderer, file = "studio_small_08_1k--light.hdr") {
  const hdr = await new RGBELoader().loadAsync(`/gl/hdri/${file}`);
  const pmrem = new PMREMGenerator(renderer);
  const env = pmrem.fromEquirectangular(hdr).texture;
  hdr.dispose();
  pmrem.dispose();
  return env;
}

/**
 * three.js skips tone mapping when rendering into a render target (the hero
 * draws into headTarget), so bright faces clip and saturated colours wash out.
 * This appends Khronos PBR Neutral to every standard/physical material under
 * `root`; it is built to keep product base colours (the brand lime) accurate.
 */
export function applyNeutralToneMapping(root: Object3D, exposure = 1) {
  const fn = /* glsl */ `
    vec3 heroNeutral(vec3 color) {
      const float start = 0.8 - 0.04;
      const float desat = 0.15;
      color *= ${exposure.toFixed(3)};
      float x = min(color.r, min(color.g, color.b));
      color -= x < 0.08 ? x - 6.25 * x * x : 0.04;
      float peak = max(color.r, max(color.g, color.b));
      if (peak < start) return color;
      float d = 1.0 - start;
      float newPeak = 1.0 - d * d / (peak + d - start);
      color *= newPeak / peak;
      float g = 1.0 - 1.0 / (desat * (peak - newPeak) + 1.0);
      return mix(color, vec3(newPeak), g);
    }`;
  root.traverse((obj) => {
    const mesh = obj as Mesh;
    if (!mesh.isMesh) return;
    for (const mat of (Array.isArray(mesh.material) ? mesh.material : [mesh.material]) as Material[]) {
      if (!(mat instanceof MeshStandardMaterial) || mat.userData.heroToneMapped) continue;
      mat.userData.heroToneMapped = true;
      const previous = mat.onBeforeCompile;
      mat.onBeforeCompile = (shader, renderer) => {
        previous.call(mat, shader, renderer);
        shader.fragmentShader = shader.fragmentShader
          .replace("#include <common>", `#include <common>\n${fn}`)
          .replace("#include <tonemapping_fragment>", "gl_FragColor.rgb = heroNeutral(gl_FragColor.rgb);");
      };
      mat.customProgramCacheKey = () => `heroNeutral${exposure}`;
      mat.needsUpdate = true;
    }
  });
}

/** Soft studio reflections without an HDR download. */
export function createRoomEnvironment(renderer: WebGLRenderer): Texture {
  const pmrem = new PMREMGenerator(renderer);
  const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pmrem.dispose();
  return env;
}

/** Soft elliptical contact shadow for a ground plane (fades out from the centre). */
export function createContactShadowMaterial(opacity = 0.32) {
  return new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: { uOpacity: { value: opacity } },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uOpacity;
      varying vec2 vUv;
      void main() {
        float d = length((vUv - 0.5) * 2.0);
        gl_FragColor = vec4(0.0, 0.0, 0.0, uOpacity * smoothstep(1.0, 0.15, d));
      }
    `
  });
}

/**
 * Shared hero setup: the subject scene (→ headTarget), a reveal scene the
 * compositor shows only under the fluid (cursor) mask (→ revealTarget), and
 * the camera both render with, including the reference scroll-out dolly.
 */
export abstract class HeroStage {
  readonly scene = new Scene();
  readonly revealScene = new Scene();
  readonly camera = new PerspectiveCamera(15, 1, 0.1, 1000);
  /** Subject root and its mirror in the reveal scene; keep their transforms in step. */
  protected readonly root = new Group();
  protected readonly revealRoot = new Group();

  #baseZ = 3;
  readonly #offset = { z: 0, y: 0 };

  constructor() {
    this.scene.add(this.root);
    this.revealScene.add(this.revealRoot);
    this.camera.position.set(0, 0, 3);
  }

  abstract load(renderer: WebGLRenderer): Promise<void>;
  abstract update(elapsed: number): void;

  resize(width: number, height: number) {
    this.camera.aspect = width / Math.max(height, 1);
    this.camera.updateProjectionMatrix();
    this.#baseZ = width > 768 ? 3 : 3.75;
    this.root.position.y = this.revealRoot.position.y = width > 768 ? 0 : -0.05;
    this.#applyCamera();
  }

  /** Scroll-out camera move (reference: camera group z 0 → −1, then y 0 → 0.1). */
  setCameraOffset(z: number, y: number) {
    this.#offset.z = z;
    this.#offset.y = y;
    this.#applyCamera();
  }

  #applyCamera() {
    this.camera.position.set(0, this.#offset.y, this.#baseZ + this.#offset.z);
  }

  /** Environment map set by a subclass; disposed with the scene. */
  protected env: Texture | null = null;

  dispose() {
    this.env?.dispose();
    for (const scene of [this.scene, this.revealScene]) {
      scene.traverse((obj) => {
        const mesh = obj as Mesh;
        if (!mesh.geometry) return;
        mesh.geometry.dispose();
        const mats = (Array.isArray(mesh.material) ? mesh.material : [mesh.material]) as Material[];
        mats.forEach((m) => m?.dispose());
      });
    }
  }
}
