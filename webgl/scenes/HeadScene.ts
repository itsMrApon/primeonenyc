import {
  BufferGeometry,
  Group,
  HemisphereLight,
  Mesh,
  MeshStandardMaterial,
  NoColorSpace,
  PerspectiveCamera,
  PlaneGeometry,
  PointLight,
  Scene,
  ShaderMaterial,
  SRGBColorSpace,
  TextureLoader,
  type Texture,
  type WebGLRenderer
} from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

import { loadModel } from "../loaders";

/** Helmet placement shared by the wireframe here and HelmetScene. */
export const HELMET_TRANSFORM = { scale: 6.9, rotationX: 0.188496, positionY: 0.05 } as const;

/**
 * Helmet outline around the head: black lines whose alpha is a band that
 * scans upward through the model (object-space y × 10, one band per second).
 */
function createWireframeMaterial() {
  return new ShaderMaterial({
    wireframe: true,
    transparent: true,
    uniforms: {
      uTime: { value: 0 },
      uOpacity: { value: 1 },
      uScanning: { value: true }
    },
    vertexShader: /* glsl */ `
      varying float vHeight;
      void main() {
        vHeight = position.y;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime, uOpacity;
      uniform bool uScanning;
      varying float vHeight;
      void main() {
        float band = uScanning ? pow(fract(-vHeight * 10.0 - uTime), 4.0) : 1.0;
        gl_FragColor = vec4(0.0, 0.0, 0.0, 0.1 * band * uOpacity);
      }
    `
  });
}

/**
 * 2.5D head: a 128×128 plane displaced by a depth map, lit like the reference
 * (hemisphere 2.5 sky white / ground black + point 2.5 at (-0.75, 0.2, 0.4)).
 * Rendered into an offscreen target that the hero compositor samples.
 */
export class HeadScene {
  readonly scene = new Scene();
  readonly camera = new PerspectiveCamera(15, 1, 0.1, 1000);
  readonly root = new Group();

  #head: Mesh | null = null;
  #wireframe: Mesh<BufferGeometry, ShaderMaterial> | null = null;
  #ready = false;

  /** Fluid mask (screen space); where it's active the head shows its shadowed variant. */
  readonly cursorEffect: { value: Texture | null } = { value: null };

  constructor() {
    this.scene.add(this.root);

    const lights = new Group();
    const hemi = new HemisphereLight(0xffffff, 0x000000, 2.5);
    hemi.position.set(0, 1, 0);
    const point = new PointLight(0xffffff, 2.5, 0, 2);
    point.position.set(-0.75, 0.2, 0.4);
    lights.add(hemi, point);
    this.scene.add(lights);

    this.camera.position.set(0, 0, 3);
  }

  async load(_renderer: WebGLRenderer) {
    const loader = new TextureLoader();
    const [diffuse, shadow, depth, alpha, normal, helmet] = await Promise.all([
      loader.loadAsync("/gl/textures/head/webp/diffuse.webp"),
      loader.loadAsync("/gl/textures/head/webp/shadow-softer-edit.webp"),
      loader.loadAsync("/gl/textures/head/webp/depth.webp"),
      loader.loadAsync("/gl/textures/head/webp/alpha.webp"),
      loader.loadAsync("/gl/textures/head/webp/normal.webp"),
      loadModel("/gl/models/helmet-21.glb")
    ]);

    diffuse.colorSpace = SRGBColorSpace;
    shadow.colorSpace = SRGBColorSpace;
    for (const tex of [alpha, normal]) tex.colorSpace = NoColorSpace;
    // Reference tags the depth map sRGB; displacement reads the decoded value.
    depth.colorSpace = SRGBColorSpace;

    const material = new MeshStandardMaterial({
      color: 0xffffff,
      roughness: 1,
      metalness: 0,
      alphaMap: alpha,
      normalMap: normal,
      displacementMap: depth,
      displacementScale: 0.25,
      displacementBias: 0,
      transparent: true
    });
    // Base colour: default diffuse, swapped for the shadowed variant wherever
    // the fluid mask is active (sampled in screen space, top/bottom gap fix).
    material.defines = { USE_UV: "" };
    material.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, {
        tHeadDiffuse: { value: diffuse },
        tHeadShadow: { value: shadow },
        tCursorEffect: this.cursorEffect
      });
      shader.vertexShader = shader.vertexShader
        .replace("#include <common>", "#include <common>\nvarying vec4 vClip;")
        .replace("#include <project_vertex>", "#include <project_vertex>\nvClip = gl_Position;");
      shader.fragmentShader = shader.fragmentShader
        .replace(
          "#include <common>",
          "#include <common>\nvarying vec4 vClip;\nuniform sampler2D tHeadDiffuse, tHeadShadow, tCursorEffect;"
        )
        .replace(
          "vec4 diffuseColor = vec4( diffuse, opacity );",
          `vec2 screenUv = vClip.xy / vClip.w * 0.5 + 0.5;
          float mask = step(0.1, 1.0 - texture2D(tCursorEffect, vec2(screenUv.x, 0.025 + screenUv.y * 0.95)).r);
          vec3 base = mix(texture2D(tHeadDiffuse, vUv).rgb, texture2D(tHeadShadow, vUv).rgb, mask);
          vec4 diffuseColor = vec4(base, opacity);`
        );
    };
    material.userData.textures = [diffuse, shadow];

    this.#head = new Mesh(new PlaneGeometry(1, 1, 128, 128), material);
    this.root.add(this.#head);

    // helmet + glass + plastic merged (28 120 verts, as traced), position only.
    const parts = ["helmet", "glass", "plastic"].map((name) => {
      const mesh = helmet.getObjectByName(name) as Mesh;
      const g = new BufferGeometry();
      g.setAttribute("position", mesh.geometry.getAttribute("position"));
      if (mesh.geometry.index) g.setIndex(mesh.geometry.index);
      return g;
    });
    const merged = mergeGeometries(parts);
    parts.forEach((g) => g.dispose());
    if (merged) {
      this.#wireframe = new Mesh(merged, createWireframeMaterial());
      this.#wireframe.scale.setScalar(HELMET_TRANSFORM.scale);
      this.#wireframe.rotation.x = HELMET_TRANSFORM.rotationX;
      this.#wireframe.position.y = HELMET_TRANSFORM.positionY;
      this.#wireframe.renderOrder = 1; // after the head, depth-tested against it (reference order)
      this.root.add(this.#wireframe);
    }

    this.#ready = true;
  }

  #baseZ = 3;
  readonly #offset = { z: 0, y: 0 };

  resize(width: number, height: number) {
    this.camera.aspect = width / Math.max(height, 1);
    this.camera.updateProjectionMatrix();
    this.#baseZ = width > 768 ? 3 : 3.75;
    if (this.#head) this.#head.position.y = width > 768 ? 0 : -0.05;
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

  /** The reference head does not follow the pointer; only the wireframe scan animates. */
  update(elapsed: number) {
    if (!this.#ready) return;
    if (this.#wireframe) this.#wireframe.material.uniforms.uTime.value = elapsed;
  }

  dispose() {
    this.scene.traverse((obj) => {
      const mesh = obj as Mesh;
      if (!mesh.isMesh) return;
      mesh.geometry?.dispose();
      const mat = mesh.material as MeshStandardMaterial | ShaderMaterial;
      if (mat instanceof MeshStandardMaterial) {
        (mat.userData.textures as Texture[] | undefined)?.forEach((t) => t.dispose());
        mat.alphaMap?.dispose();
        mat.normalMap?.dispose();
        mat.displacementMap?.dispose();
      }
      mat.dispose();
    });
  }
}
