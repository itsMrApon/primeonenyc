import {
  AmbientLight,
  DirectionalLight,
  DoubleSide,
  Group,
  Mesh,
  MeshStandardMaterial,
  NoColorSpace,
  PerspectiveCamera,
  PlaneGeometry,
  Scene,
  SRGBColorSpace,
  TextureLoader,
  Vector2,
  type WebGLRenderer
} from "three";

/**
 * Hero head scene — port of OFF+BRAND `AX` head plane:
 * displaced PlaneGeometry(1,1,128,128) with head diffuse/depth/alpha maps.
 * Helmet stays off by default (`SHOW_HELMET_PERMANENTLY: false`).
 */
export class HeadScene {
  readonly scene = new Scene();
  /** Original head scene: `new PerspectiveCamera(15, …)` */
  readonly camera = new PerspectiveCamera(15, 1, 0.1, 1000);
  readonly root = new Group();

  readonly #pointer = new Vector2();
  readonly #pointerSmooth = new Vector2();
  #head: Mesh | null = null;
  #ready = false;

  /** Original: movement.intensity = 0.075 */
  readonly #intensity = 0.075;

  constructor() {
    this.scene.add(this.root);

    // Soft studio lighting — lime bounce so skin reads like the live hero.
    const ambient = new AmbientLight(0xe8f5a0, 1.05);
    const key = new DirectionalLight(0xffffff, 1.35);
    key.position.set(1.2, 2.4, 4);
    const fill = new DirectionalLight(0xd2ff00, 0.55);
    fill.position.set(-2.8, 1.0, 2.2);
    const rim = new DirectionalLight(0xf4f4ed, 0.4);
    rim.position.set(0.2, 1.4, -3);
    this.scene.add(ambient, key, fill, rim);
    // Clear color provides the lime field; keep scene.background null so
    // transparent alpha edges composite cleanly against the renderer clear.
    this.scene.background = null;

    // Match original head camera framing (z=3 desktop / z=3.75 mobile).
    this.camera.position.set(0, 0, 3);
    this.camera.lookAt(0, 0, 0);
  }

  async load(_renderer: WebGLRenderer) {
    const loader = new TextureLoader();
    const [diffuse, depth, alpha, normal, roughness] = await Promise.all([
      loader.loadAsync("/gl/textures/head/webp/diffuse.webp"),
      loader.loadAsync("/gl/textures/head/webp/depth.webp"),
      loader.loadAsync("/gl/textures/head/webp/alpha.webp"),
      loader.loadAsync("/gl/textures/head/webp/normal.webp"),
      loader.loadAsync("/gl/textures/head/webp/roughness.webp")
    ]);

    diffuse.colorSpace = SRGBColorSpace;
    for (const tex of [depth, alpha, normal, roughness]) {
      tex.colorSpace = NoColorSpace;
    }
    for (const tex of [diffuse, depth, alpha, normal, roughness]) {
      tex.flipY = true;
      tex.needsUpdate = true;
    }

    const geometry = new PlaneGeometry(1, 1, 128, 128);
    const material = new MeshStandardMaterial({
      map: diffuse,
      displacementMap: depth,
      displacementScale: 0.25,
      alphaMap: alpha,
      transparent: true,
      alphaTest: 0.05,
      normalMap: normal,
      roughnessMap: roughness,
      metalness: 0.02,
      roughness: 0.55,
      side: DoubleSide,
      // Soft lime lift so skin matches the live studio grade
      emissive: 0x3a4a00,
      emissiveIntensity: 0.12
    });

    this.#head = new Mesh(geometry, material);
    this.#head.position.y = 0;
    this.root.add(this.#head);

    this.#ready = true;
  }

  setPointer(nx: number, ny: number) {
    this.#pointer.set(nx, ny);
  }

  resize(width: number, height: number) {
    this.camera.aspect = width / Math.max(height, 1);
    this.camera.updateProjectionMatrix();
    // Mirror original responsive()
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

    // Original: rotation.y = mouse.x * intensity, rotation.x = mouse.y * -1 * intensity
    this.#head.rotation.y = this.#pointerSmooth.x * this.#intensity;
    this.#head.rotation.x = this.#pointerSmooth.y * -1 * this.#intensity;
  }

  dispose() {
    this.scene.traverse((obj) => {
      const mesh = obj as Mesh;
      if (!mesh.isMesh) return;
      mesh.geometry?.dispose();
      const mat = mesh.material;
      if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
      else mat?.dispose();
    });
  }

}
