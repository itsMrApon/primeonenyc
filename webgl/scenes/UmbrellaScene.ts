import {
  BufferAttribute,
  BufferGeometry,
  Color,
  DirectionalLight,
  Float32BufferAttribute,
  Group,
  HemisphereLight,
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  LineBasicMaterial,
  LineSegments,
  type Material,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  type Object3D,
  PlaneGeometry,
  ShaderMaterial,
  Vector2,
  Vector3,
  type WebGLRenderer
} from "three";

import { loadModel } from "../loaders";
import { applyNeutralToneMapping, createStudioEnvironment, HeroStage } from "./HeroStage";

/**
 * Architectural-miniature diorama built by tools/blender/build_hero_miniature.py
 * (board + house baked into one atlas, die-cast sedan, printed umbrella).
 * Scene units ≈ metres: board 7.4 × 5.8, canopy apex 4.45 high.
 */
const MODEL_URL = "/gl/models/hero/miniature.glb";
const ROOT = { scale: 0.1, pitch: 0.2, yaw: -0.42, centreY: 2.2 } as const;
/** Must match UMBRELLA in the Blender script (the rain lands on this canopy profile). */
const UMBRELLA = { x: 0.35, z: 0.25, radius: 3.0, rimY: 3.5, height: 0.95, tilt: 0.05 } as const;

/** GLSL shared by the rain and the splash rings: where a drop lands (canopy or board). */
const DROP_GLSL = /* glsl */ `
  uniform float uTime, uRadius, uRimY, uHeight, uTop;
  uniform vec2 uCentre;
  attribute vec4 aDrop; // x, z, phase, speed
  float dropFloor() {
    float r = length(aDrop.xy - uCentre);
    return r < uRadius ? uRimY + uHeight * (1.0 - pow(r / uRadius, 1.7)) : 0.0;
  }
  // 0 at the top of the fall, 1 on impact; wraps after each impact.
  float dropFall(float floorY) {
    return fract(uTime * aDrop.w / (uTop - floorY) + aDrop.z);
  }
`;

/**
 * Storm under the cursor trail, in the art direction's "model photography" style:
 * sharp rain lines, a tiny expanding ring wherever a drop lands (board or canopy),
 * and drops over the canopy stop on it — the house and car stay dry.
 */
function createStorm(count = 1600) {
  const drops = new Float32Array(count * 4);
  for (let i = 0; i < count; i++) {
    drops.set([-4.6 + Math.random() * 9.2, -3 + Math.random() * 6.5, Math.random(), 5 + Math.random() * 3], i * 4);
  }
  const uniforms = {
    uTime: { value: 0 },
    // Canopy centre after the tilt about the umbrella's foot.
    uCentre: { value: new Vector2(UMBRELLA.x - Math.sin(UMBRELLA.tilt) * (UMBRELLA.rimY + UMBRELLA.height / 2), UMBRELLA.z) },
    uRadius: { value: UMBRELLA.radius },
    uRimY: { value: UMBRELLA.rimY },
    uHeight: { value: UMBRELLA.height },
    uTop: { value: 7.5 },
    uColor: { value: new Color("#dbe7f2") }
  };

  // Rain: two vertices per drop (streak bottom / top).
  const lineDrops = new Float32Array(count * 2 * 4);
  const ends = new Float32Array(count * 2);
  for (let i = 0; i < count; i++) {
    for (let e = 0; e < 2; e++) {
      lineDrops.set(drops.subarray(i * 4, i * 4 + 4), (i * 2 + e) * 4);
      ends[i * 2 + e] = e;
    }
  }
  const rainGeo = new BufferGeometry();
  rainGeo.setAttribute("position", new Float32BufferAttribute(new Float32Array(count * 2 * 3), 3));
  rainGeo.setAttribute("aDrop", new BufferAttribute(lineDrops, 4));
  rainGeo.setAttribute("aEnd", new BufferAttribute(ends, 1));
  const rain = new LineSegments(
    rainGeo,
    new ShaderMaterial({
      transparent: true,
      depthWrite: false,
      // The renderer defaults every program to lowp; positions here need more.
      precision: "highp",
      uniforms,
      vertexShader: /* glsl */ `
        ${DROP_GLSL}
        attribute float aEnd; // 0 = streak bottom, 1 = top
        varying float vEnd;
        void main() {
          float floorY = dropFloor();
          float y = uTop - dropFall(floorY) * (uTop - floorY);
          float yy = min(y + aEnd * 0.4, uTop);
          vec3 p = vec3(aDrop.x + (yy - floorY) * 0.09, yy, aDrop.y);
          vEnd = aEnd;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 uColor;
        varying float vEnd;
        void main() {
          gl_FragColor = vec4(uColor, 0.75 * (1.0 - vEnd * 0.85));
        }
      `
    })
  );
  rain.frustumCulled = false;

  // Splash rings: one flat quad per drop, alive for 0.32 s after each impact.
  const ringGeo = new InstancedBufferGeometry();
  ringGeo.index = new PlaneGeometry(1, 1).index;
  ringGeo.setAttribute("position", new PlaneGeometry(1, 1).getAttribute("position"));
  ringGeo.setAttribute("uv", new PlaneGeometry(1, 1).getAttribute("uv"));
  ringGeo.setAttribute("aDrop", new InstancedBufferAttribute(drops, 4));
  ringGeo.instanceCount = count;
  const splashes = new Mesh(
    ringGeo,
    new ShaderMaterial({
      transparent: true,
      depthWrite: false,
      precision: "highp",
      uniforms,
      vertexShader: /* glsl */ `
        ${DROP_GLSL}
        varying vec2 vUv;
        varying float vAge;
        void main() {
          float floorY = dropFloor();
          float cycle = (uTop - floorY) / aDrop.w;
          vAge = dropFall(floorY) * cycle / 0.32;
          vUv = uv;
          if (vAge > 1.0) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; }
          float size = mix(0.04, 0.26, vAge);
          vec3 p = vec3(aDrop.x + position.x * size, floorY + 0.015, aDrop.y + position.y * size);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 uColor;
        varying vec2 vUv;
        varying float vAge;
        void main() {
          float d = length(vUv - 0.5) * 2.0;
          float ring = smoothstep(0.62, 0.8, d) * (1.0 - smoothstep(0.86, 1.0, d));
          gl_FragColor = vec4(uColor, ring * (1.0 - vAge) * 0.85);
        }
      `
    })
  );
  splashes.frustumCulled = false;

  return { rain, splashes, uniforms, count };
}

/** Water running off the 8 rib tips: 3 staggered drips per tip, positions updated on the CPU. */
const DRIPS_PER_TIP = 3;
function createDrips() {
  const geo = new BufferGeometry();
  geo.setAttribute("position", new Float32BufferAttribute(new Float32Array(8 * DRIPS_PER_TIP * 2 * 3), 3));
  const drips = new LineSegments(
    geo,
    new LineBasicMaterial({ color: new Color("#eef4fa"), transparent: true, opacity: 0.9, depthWrite: false })
  );
  drips.frustumCulled = false;
  return drips;
}

const easeOutBack = (t: number) => 1 + 2.2 * (t - 1) ** 3 + 1.2 * (t - 1) ** 2;

/**
 * Hard "model photography" sun, parented to the stage so it turns with it.
 * The shadow camera is placed from world positions only (it ignores the
 * stage's scale), so its bounds are given in world units: stage units × scale.
 */
function createSun(scale: number) {
  const sun = new DirectionalLight(new Color("#f3f6ff"), 2.7);
  sun.position.set(-4, 8.5, 5.5);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  const r = 5.2 * scale;
  Object.assign(sun.shadow.camera, { left: -r, right: r, top: r, bottom: -r, near: 0.2 * scale, far: 22 * scale });
  sun.shadow.bias = -0.0005;
  sun.shadow.normalBias = 0.03 * scale;
  return sun;
}

/**
 * Hero subject: an architectural miniature — a Woodside two-family house and a
 * die-cast sedan sheltered by a lime umbrella that springs open after load,
 * then sways and slowly spins. Under the cursor trail (reveal scene) a storm
 * darkens the sky and rain falls — except beneath the canopy.
 */
export class UmbrellaScene extends HeroStage {
  readonly #stage = new Group();
  readonly #stormStage = new Group();
  #umbrella: Object3D | null = null;
  #canopy: Object3D | null = null;
  #storm: ReturnType<typeof createStorm> | null = null;
  #drips: LineSegments<BufferGeometry, LineBasicMaterial> | null = null;
  readonly #tip = new Vector3();
  /** Calm version for prefers-reduced-motion: no spin / sway / bounce, half the rain, slower. */
  readonly #reduced = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
  #openAt = -1;
  #ready = false;

  constructor() {
    super();
    this.scene.add(new HemisphereLight(0xffffff, 0x4a4a40, 0.35));
  }

  async load(renderer: WebGLRenderer) {
    const [env, model] = await Promise.all([createStudioEnvironment(renderer), loadModel(MODEL_URL)]);
    this.env = env;
    this.scene.environment = env;
    // The studio HDRI is warm; keep it for reflections, not for the paper's colour.
    this.scene.environmentIntensity = 0.4;

    const diorama = model.clone(true);
    diorama.traverse((obj) => {
      const mesh = obj as Mesh;
      if (!mesh.isMesh) return;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      for (const mat of (Array.isArray(mesh.material) ? mesh.material : [mesh.material]) as Material[]) {
        if (mat.name === "Car_Glass") {
          Object.assign(mat, { transparent: true, opacity: 0.55, depthWrite: false });
          mesh.castShadow = false;
        }
        // Brand lime: no sheen/specular wash and no tone curve (its green channel is
        // already at 1.0, which any tone curve compresses), so lit panels stay #d2ff00.
        if (mat.name.startsWith("Canopy_") && mat instanceof MeshPhysicalMaterial) {
          Object.assign(mat, { sheen: 0, specularIntensity: 0, envMapIntensity: 0.15, roughness: 1 });
          mat.userData.heroToneMapped = true;
        }
      }
    });
    applyNeutralToneMapping(diorama);
    this.#umbrella = diorama.getObjectByName("Umbrella") ?? null;
    this.#canopy = diorama.getObjectByName("Canopy") ?? null;

    const sun = createSun(ROOT.scale);
    this.#stage.add(diorama, sun, sun.target);
    this.#stage.position.y = -ROOT.centreY;
    this.root.add(this.#stage);
    this.root.scale.setScalar(ROOT.scale);
    this.root.rotation.x = ROOT.pitch;

    // Storm: a dark sky wash over the whole trail, plus rain in the diorama's space.
    const sky = new Mesh(
      new PlaneGeometry(60, 60),
      new MeshBasicMaterial({ color: new Color("#1d2733"), transparent: true, opacity: 0.42, depthWrite: false })
    );
    sky.position.z = -1;
    this.revealScene.add(sky);

    this.#storm = createStorm();
    this.#drips = createDrips();
    if (this.#reduced) {
      this.#storm.rain.geometry.setDrawRange(0, this.#storm.count); // half the drops (2 verts each)
      (this.#storm.splashes.geometry as InstancedBufferGeometry).instanceCount = this.#storm.count / 2;
    }
    this.#stormStage.add(this.#storm.rain, this.#storm.splashes, this.#drips);
    this.#stormStage.position.y = -ROOT.centreY;
    this.revealRoot.add(this.#stormStage);
    this.revealRoot.scale.setScalar(ROOT.scale);
    this.revealRoot.rotation.x = ROOT.pitch;

    this.#setOpen(0);
    this.#ready = true;
  }

  /** 0 = closed (narrow, hanging along the shaft), 1 = open. */
  #setOpen(p: number) {
    if (!this.#canopy) return;
    const s = 0.18 + 0.82 * p;
    this.#canopy.scale.set(s, 1 + (1 - p) * 1.4, s);
  }

  update(elapsed: number) {
    if (!this.#ready) return;
    if (this.#openAt < 0) this.#openAt = elapsed + 0.9; // after the loader's reveal
    const p = Math.min(Math.max((elapsed - this.#openAt) / 1.1, 0), 1);
    this.#setOpen(this.#reduced ? (p > 0 ? 1 : 0) : p === 0 ? 0 : easeOutBack(p));

    const motion = this.#reduced ? 0 : 1;
    const yaw = ROOT.yaw + Math.sin(elapsed * 0.25) * 0.06 * motion;
    this.#stage.rotation.y = this.#stormStage.rotation.y = yaw;
    if (this.#umbrella) this.#umbrella.rotation.z = UMBRELLA.tilt + Math.sin(elapsed * 0.6) * 0.025 * motion;
    if (this.#canopy) this.#canopy.rotation.y = elapsed * 0.15 * motion;
    if (this.#storm) this.#storm.uniforms.uTime.value = elapsed * (this.#reduced ? 0.5 : 1);
    this.#updateDrips(elapsed * (this.#reduced ? 0.5 : 1), p);
  }

  /** Drips fall from the (spinning, swaying) rib tips once the umbrella is open. */
  #updateDrips(time: number, open: number) {
    if (!this.#drips || !this.#canopy) return;
    const pos = this.#drips.geometry.getAttribute("position") as BufferAttribute;
    this.#canopy.updateWorldMatrix(true, false);
    for (let j = 0; j < 8; j++) {
      const a = (j * Math.PI) / 4;
      // Rib tip in canopy space (glTF: x, up, −Blender y), then into stage space.
      this.#tip.set(Math.cos(a) * UMBRELLA.radius, -UMBRELLA.height, -Math.sin(a) * UMBRELLA.radius);
      this.#stage.worldToLocal(this.#canopy.localToWorld(this.#tip));
      for (let k = 0; k < DRIPS_PER_TIP; k++) {
        const i = (j * DRIPS_PER_TIP + k) * 2;
        const t = (time / 1.3 + k / DRIPS_PER_TIP + j * 0.17) % 1;
        const fall = t / 0.6;
        if (open < 1 || fall > 1) {
          pos.setXYZ(i, 0, -50, 0);
          pos.setXYZ(i + 1, 0, -50, 0);
          continue;
        }
        const y = this.#tip.y * (1 - fall * fall);
        pos.setXYZ(i, this.#tip.x, Math.max(y - 0.16, 0), this.#tip.z);
        pos.setXYZ(i + 1, this.#tip.x, y, this.#tip.z);
      }
    }
    pos.needsUpdate = true;
  }
}
