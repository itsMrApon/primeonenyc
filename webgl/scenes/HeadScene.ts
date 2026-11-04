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
  Vector2,
  type WebGLRenderer
} from "three";

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
    const [diffuse, depth, alpha, normal] = await Promise.all([
      loader.loadAsync("/gl/textures/head/webp/diffuse.webp"),
      loader.loadAsync("/gl/textures/head/webp/depth.webp"),
      loader.loadAsync("/gl/textures/head/webp/alpha.webp"),
      loader.loadAsync("/gl/textures/head/webp/normal.webp")
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

  update(dt: number) {
    if (!this.#ready || !this.#head) return;

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
      const mat = mesh.material as MeshStandardMaterial;
      mat.map?.dispose();
      mat.alphaMap?.dispose();
      mat.normalMap?.dispose();
      mat.displacementMap?.dispose();
      mat.dispose();
    });
  }
}
