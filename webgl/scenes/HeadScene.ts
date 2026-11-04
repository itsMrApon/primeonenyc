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
  Vector2,
  type WebGLRenderer
} from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

import { loadModel } from "../loaders";

/** Helmet placement shared by the wireframe here and the helmet pass (step 3). */
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

  readonly #pointer = new Vector2();
  readonly #pointerSmooth = new Vector2();
  #head: Mesh | null = null;
  #wireframe: Mesh<BufferGeometry, ShaderMaterial> | null = null;
  #ready = false;

  readonly #intensity = 0.075;

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
    const [diffuse, depth, alpha, normal, helmet] = await Promise.all([
      loader.loadAsync("/gl/textures/head/webp/diffuse.webp"),
      loader.loadAsync("/gl/textures/head/webp/depth.webp"),
      loader.loadAsync("/gl/textures/head/webp/alpha.webp"),
      loader.loadAsync("/gl/textures/head/webp/normal.webp"),
      loadModel("/gl/models/helmet-21.glb")
    ]);

    diffuse.colorSpace = SRGBColorSpace;
    for (const tex of [alpha, normal]) tex.colorSpace = NoColorSpace;
    // Reference tags the depth map sRGB; displacement reads the decoded value.
    depth.colorSpace = SRGBColorSpace;

    const material = new MeshStandardMaterial({
      color: 0xffffff,
      map: diffuse,
      roughness: 1,
      metalness: 0,
      alphaMap: alpha,
      normalMap: normal,
      displacementMap: depth,
      displacementScale: 0.25,
      displacementBias: 0,
      transparent: true
    });

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

  setPointer(nx: number, ny: number) {
    this.#pointer.set(nx, ny);
  }

  resize(width: number, height: number) {
    this.camera.aspect = width / Math.max(height, 1);
    this.camera.updateProjectionMatrix();
    if (width > 768) {
      this.camera.position.z = 3;
      if (this.#head) this.#head.position.y = 0;
    } else {
      this.camera.position.z = 3.75;
      if (this.#head) this.#head.position.y = -0.05;
    }
  }

  update(dt: number, elapsed: number) {
    if (!this.#ready || !this.#head) return;
    if (this.#wireframe) this.#wireframe.material.uniforms.uTime.value = elapsed;

    const lerp = 1 - Math.exp(-8 * dt);
    this.#pointerSmooth.lerp(this.#pointer, lerp);

    this.#head.rotation.y = this.#pointerSmooth.x * this.#intensity;
    this.#head.rotation.x = this.#pointerSmooth.y * -1 * this.#intensity;
  }

  dispose() {
    this.scene.traverse((obj) => {
      const mesh = obj as Mesh;
      if (!mesh.isMesh) return;
      mesh.geometry?.dispose();
      const mat = mesh.material as MeshStandardMaterial | ShaderMaterial;
      if (mat instanceof MeshStandardMaterial) {
        mat.map?.dispose();
        mat.alphaMap?.dispose();
        mat.normalMap?.dispose();
        mat.displacementMap?.dispose();
      }
      mat.dispose();
    });
  }
}
