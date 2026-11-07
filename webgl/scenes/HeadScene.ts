import {
  Group,
  HemisphereLight,
  Mesh,
  MeshStandardMaterial,
  NoColorSpace,
  PerspectiveCamera,
  PlaneGeometry,
  PointLight,
  Scene,
  SRGBColorSpace,
  TextureLoader,
  type Texture,
  type WebGLRenderer
} from "three";

/** Head maps (Delowar). Colour/alpha/normal 2048², shadow variant 2549², depth 512² — same framing. */
const MAPS = "/gl/textures/head/webp";
const TEXTURES = {
  diffuse: `${MAPS}/hero-03-color.webp`,
  shadow: `${MAPS}/hero-08-lit-deep-shadow.webp`,
  depth: `${MAPS}/hero-07-depth.webp`,
  alpha: `${MAPS}/hero-02-alpha-matte.webp`,
  normal: `${MAPS}/hero-04-normal.webp`
} as const;

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
    const [diffuse, shadow, depth, alpha, normal] = await Promise.all([
      loader.loadAsync(TEXTURES.diffuse),
      loader.loadAsync(TEXTURES.shadow),
      loader.loadAsync(TEXTURES.depth),
      loader.loadAsync(TEXTURES.alpha),
      loader.loadAsync(TEXTURES.normal)
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

  dispose() {
    this.scene.traverse((obj) => {
      const mesh = obj as Mesh;
      if (!mesh.isMesh) return;
      mesh.geometry?.dispose();
      const mat = mesh.material as MeshStandardMaterial;
      (mat.userData.textures as Texture[] | undefined)?.forEach((t) => t.dispose());
      mat.alphaMap?.dispose();
      mat.normalMap?.dispose();
      mat.displacementMap?.dispose();
      mat.dispose();
    });
  }
}
