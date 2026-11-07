import {
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  CatmullRomCurve3,
  Color,
  CylinderGeometry,
  DirectionalLight,
  DoubleSide,
  ExtrudeGeometry,
  Float32BufferAttribute,
  Group,
  HemisphereLight,
  LatheGeometry,
  LineSegments,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  Shape,
  ShaderMaterial,
  TubeGeometry,
  Vector2,
  Vector3,
  type WebGLRenderer
} from "three";

import { loadModel } from "../loaders";
import { createContactShadowMaterial, createRoomEnvironment, HeroStage } from "./HeroStage";

/** Scene units ≈ metres. The whole diorama is ~6.3 wide × 4.6 tall before ROOT.scale. */
const ROOT = { scale: 0.1, pitch: 0.2, yaw: -0.42, centreY: 2.2 } as const;
const UMBRELLA = { x: 0.35, z: 0.25, radius: 3.0, rimY: 3.5, height: 0.95, tilt: 0.05 } as const;
const COLORS = {
  lime: "#d2ff00",
  limeAlt: "#b9e400",
  darkGreen: "#282c20",
  wall: "#f4f4ed",
  ground: "#e3e5d8",
  window: "#3f4437",
  car: "#35392d"
} as const;

const std = (color: string, extra: Partial<MeshStandardMaterial> = {}) =>
  Object.assign(new MeshStandardMaterial({ color: new Color(color), roughness: 0.7, metalness: 0 }), extra);

/** Canopy surface height at distance r from the shaft (matches the lathe profile). */
const canopyProfile = (r: number) => UMBRELLA.height * (1 - Math.min(r / UMBRELLA.radius, 1) ** 1.7);

/** Faceted 8-panel canopy: scalloped between the ribs, panels alternate lime tones. Origin at the apex. */
function createCanopy() {
  const { radius: R, height: H } = UMBRELLA;
  const profile: Vector2[] = [];
  for (let i = 0; i <= 24; i++) {
    const r = (R * i) / 24;
    profile.push(new Vector2(r, canopyProfile(r) - H));
  }
  const geo = new LatheGeometry(profile, 64).toNonIndexed();
  const pos = geo.getAttribute("position") as BufferAttribute;
  const v = new Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const r = Math.hypot(v.x, v.z);
    const k = Math.sin(4 * Math.atan2(v.z, v.x)) ** 2; // 0 on a rib, 1 mid-panel
    const q = r / R;
    const shrink = 1 - 0.07 * k * q * q;
    pos.setXYZ(i, v.x * shrink, v.y - 0.12 * k * q ** 3, v.z * shrink);
  }
  geo.computeVertexNormals();

  const colors = new Float32Array(pos.count * 3);
  const a = new Color(COLORS.lime);
  const b = new Color(COLORS.limeAlt);
  for (let f = 0; f < pos.count; f += 3) {
    let cx = 0;
    let cz = 0;
    for (let k = 0; k < 3; k++) {
      cx += pos.getX(f + k);
      cz += pos.getZ(f + k);
    }
    const angle = (Math.atan2(cz, cx) + Math.PI * 2) % (Math.PI * 2);
    const c = Math.floor(angle / (Math.PI / 4)) % 2 === 0 ? a : b;
    for (let k = 0; k < 3; k++) c.toArray(colors, (f + k) * 3);
  }
  geo.setAttribute("color", new BufferAttribute(colors, 3));
  // Faces the lights head-on, so keep reflections low or the lime washes out to pale yellow.
  return new Mesh(geo, std("#ffffff", { vertexColors: true, roughness: 0.8, envMapIntensity: 0.25, side: DoubleSide }));
}

/** Eight dark-green seams along the ribs, sitting just on top of the canopy. */
function createRibs() {
  const group = new Group();
  const mat = std(COLORS.darkGreen, { roughness: 0.5 });
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4;
    const pts: Vector3[] = [];
    for (let s = 0; s <= 16; s++) {
      const r = (UMBRELLA.radius * s) / 16;
      pts.push(new Vector3(Math.cos(a) * r, canopyProfile(r) - UMBRELLA.height + 0.02, Math.sin(a) * r));
    }
    group.add(new Mesh(new TubeGeometry(new CatmullRomCurve3(pts), 24, 0.028, 6), mat));
  }
  return group;
}

function createUmbrella() {
  const umbrella = new Group();
  const dark = std(COLORS.darkGreen, { roughness: 0.45 });
  const apexY = UMBRELLA.rimY + UMBRELLA.height;

  // Canopy group pivots at the apex so it can open downward-out from closed.
  const canopy = new Group();
  canopy.position.y = apexY;
  canopy.add(createCanopy(), createRibs());
  const finial = new Mesh(new CylinderGeometry(0.05, 0.05, 0.35, 10), dark);
  finial.position.y = 0.17;
  canopy.add(finial);
  umbrella.add(canopy);

  const shaftBottom = 0.6;
  const shaft = new Mesh(new CylinderGeometry(0.045, 0.045, apexY - shaftBottom, 10), dark);
  shaft.position.y = (apexY + shaftBottom) / 2;
  umbrella.add(shaft);

  const handle = new CatmullRomCurve3([
    new Vector3(0, shaftBottom, 0),
    new Vector3(0, 0.34, 0),
    new Vector3(0.07, 0.17, 0),
    new Vector3(0.24, 0.12, 0),
    new Vector3(0.4, 0.2, 0),
    new Vector3(0.44, 0.36, 0)
  ]);
  umbrella.add(new Mesh(new TubeGeometry(handle, 32, 0.05, 8), dark));

  umbrella.position.set(UMBRELLA.x, 0, UMBRELLA.z);
  umbrella.rotation.z = UMBRELLA.tilt;
  return { umbrella, canopy };
}

function createHouse() {
  const house = new Group();
  const w = 2.1;
  const h = 1.5;
  const d = 1.8;
  const walls = new Mesh(new BoxGeometry(w, h, d), std(COLORS.wall));
  walls.position.y = h / 2;
  house.add(walls);

  const roofShape = new Shape();
  roofShape.moveTo(-w / 2 - 0.18, 0);
  roofShape.lineTo(0, 0.95);
  roofShape.lineTo(w / 2 + 0.18, 0);
  roofShape.closePath();
  const roof = new Mesh(
    new ExtrudeGeometry(roofShape, { depth: d + 0.3, bevelEnabled: false }),
    std(COLORS.darkGreen, { roughness: 0.6 })
  );
  roof.position.set(0, h, -(d + 0.3) / 2);
  house.add(roof);

  const chimney = new Mesh(new BoxGeometry(0.28, 0.6, 0.28), std(COLORS.darkGreen, { roughness: 0.6 }));
  chimney.position.set(-0.55, h + 0.6, -0.4);
  house.add(chimney);

  const trim = std(COLORS.window, { roughness: 0.3, metalness: 0.2 });
  const door = new Mesh(new BoxGeometry(0.42, 0.75, 0.04), trim);
  door.position.set(0.4, 0.375, d / 2 + 0.01);
  const front = new Mesh(new BoxGeometry(0.4, 0.4, 0.04), trim);
  front.position.set(-0.45, 0.95, d / 2 + 0.01);
  const side = new Mesh(new BoxGeometry(0.04, 0.4, 0.5), trim);
  side.position.set(w / 2 + 0.01, 0.95, 0);
  house.add(door, front, side);

  house.position.set(-1.2, 0, -0.2);
  return house;
}

/**
 * The taxi model as a plain family car: dark-green body, and the roof sign
 * (every body / black triangle centred above the roof, y > 1.145) dropped.
 */
async function createCar() {
  const model = (await loadModel("/gl/models/taxi.glb")).clone(true);
  model.traverse((obj) => {
    const mesh = obj as Mesh;
    if (!mesh.isMesh) return;
    const geo = mesh.geometry.clone();
    const pos = geo.getAttribute("position");
    const index = geo.getIndex();
    // GLTFLoader gives one mesh per primitive (no groups), so scan the whole index.
    if (index) {
      for (let i = 0; i < index.count; i += 3) {
        const y = (pos.getY(index.getX(i)) + pos.getY(index.getX(i + 1)) + pos.getY(index.getX(i + 2))) / 3;
        if (y > 1.145) {
          index.setX(i + 1, index.getX(i));
          index.setX(i + 2, index.getX(i)); // degenerate: drops the triangle
        }
      }
      index.needsUpdate = true;
    }
    mesh.geometry = geo;

    const tune = (m: MeshStandardMaterial) => {
      const mat = m.clone();
      if (mat.name === "Yellow") Object.assign(mat, { color: new Color(COLORS.car), roughness: 0.3, metalness: 0.35 });
      if (mat.name === "Windows") Object.assign(mat, { roughness: 0.05, metalness: 0.6 });
      mat.envMapIntensity = 0.6;
      return mat;
    };
    mesh.material = Array.isArray(mesh.material)
      ? (mesh.material as MeshStandardMaterial[]).map(tune)
      : tune(mesh.material as MeshStandardMaterial);
  });
  const car = new Group();
  car.add(model);
  car.scale.setScalar(0.48);
  car.position.set(1.4, 0, 0.45);
  car.rotation.y = -0.55;
  return car;
}

/** Rain streaks: drops over the canopy stop on its surface, the rest reach the ground. */
function createRain(count = 1600) {
  const drops = new Float32Array(count * 2 * 4);
  const ends = new Float32Array(count * 2);
  for (let i = 0; i < count; i++) {
    const x = -4.6 + Math.random() * 9.2;
    const z = -3 + Math.random() * 6.5;
    const phase = Math.random();
    const speed = 5 + Math.random() * 3;
    for (let e = 0; e < 2; e++) {
      drops.set([x, z, phase, speed], (i * 2 + e) * 4);
      ends[i * 2 + e] = e;
    }
  }
  const geo = new BufferGeometry();
  geo.setAttribute("position", new Float32BufferAttribute(new Float32Array(count * 2 * 3), 3));
  geo.setAttribute("aDrop", new BufferAttribute(drops, 4));
  geo.setAttribute("aEnd", new BufferAttribute(ends, 1));

  const mat = new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    // The renderer defaults every program to lowp; positions here need more.
    precision: "highp",
    uniforms: {
      uTime: { value: 0 },
      // Canopy centre after the tilt about the umbrella's foot.
      uCentre: { value: new Vector2(UMBRELLA.x - Math.sin(UMBRELLA.tilt) * (UMBRELLA.rimY + UMBRELLA.height / 2), UMBRELLA.z) },
      uRadius: { value: UMBRELLA.radius },
      uRimY: { value: UMBRELLA.rimY },
      uHeight: { value: UMBRELLA.height },
      uTop: { value: 7.5 },
      uColor: { value: new Color("#dbe7f2") }
    },
    vertexShader: /* glsl */ `
      uniform float uTime, uRadius, uRimY, uHeight, uTop;
      uniform vec2 uCentre;
      attribute vec4 aDrop; // x, z, phase, speed
      attribute float aEnd; // 0 = streak bottom, 1 = top
      varying float vEnd;
      void main() {
        float r = length(aDrop.xy - uCentre);
        float floorY = r < uRadius ? uRimY + uHeight * (1.0 - pow(r / uRadius, 1.7)) : 0.0;
        float span = uTop - floorY;
        float y = uTop - fract(uTime * aDrop.w / span + aDrop.z) * span;
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
  });
  const rain = new LineSegments(geo, mat);
  rain.frustumCulled = false;
  return rain;
}

const easeOutBack = (t: number) => 1 + 2.2 * (t - 1) ** 3 + 1.2 * (t - 1) ** 2;

/**
 * Hero subject: a lime umbrella sheltering a house and a car on a round
 * platform; it springs open after load, then sways and slowly spins. Under the
 * cursor trail (reveal scene) a storm darkens the sky and rain falls — except
 * beneath the canopy.
 */
export class UmbrellaScene extends HeroStage {
  readonly #stage = new Group();
  readonly #stormStage = new Group();
  #umbrella: Group | null = null;
  #canopy: Group | null = null;
  #rain: LineSegments<BufferGeometry, ShaderMaterial> | null = null;
  #openAt = -1;
  #ready = false;

  constructor() {
    super();
    const hemi = new HemisphereLight(0xffffff, 0x3a3a30, 0.45);
    const key = new DirectionalLight(0xffffff, 1.3);
    key.position.set(-2, 3, 2.5);
    this.scene.add(hemi, key);
  }

  async load(renderer: WebGLRenderer) {
    this.env = createRoomEnvironment(renderer);
    this.scene.environment = this.env;

    const ground = new Mesh(new CylinderGeometry(3.3, 3.3, 0.12, 64), std(COLORS.ground, { roughness: 0.9 }));
    ground.position.y = -0.06;

    const shelter = new Mesh(new PlaneGeometry(6.2, 6.2), createContactShadowMaterial(0.14));
    shelter.rotation.x = -Math.PI / 2;
    shelter.position.set(UMBRELLA.x, 0.004, UMBRELLA.z);
    const houseShadow = new Mesh(new PlaneGeometry(2.9, 2.6), createContactShadowMaterial(0.3));
    houseShadow.rotation.x = -Math.PI / 2;
    houseShadow.position.set(-1.2, 0.006, -0.2);

    const car = await createCar();
    const carShadow = new Mesh(new PlaneGeometry(1.2, 2.4), createContactShadowMaterial(0.32));
    carShadow.rotation.set(-Math.PI / 2, 0, car.rotation.y);
    carShadow.position.set(car.position.x, 0.006, car.position.z);

    const { umbrella, canopy } = createUmbrella();
    this.#umbrella = umbrella;
    this.#canopy = canopy;

    this.#stage.add(ground, shelter, houseShadow, carShadow, createHouse(), car, umbrella);
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

    this.#rain = createRain();
    this.#stormStage.add(this.#rain);
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
    this.#setOpen(p === 0 ? 0 : easeOutBack(p));

    const yaw = ROOT.yaw + Math.sin(elapsed * 0.25) * 0.06;
    this.#stage.rotation.y = this.#stormStage.rotation.y = yaw;
    if (this.#umbrella) this.#umbrella.rotation.z = UMBRELLA.tilt + Math.sin(elapsed * 0.6) * 0.025;
    if (this.#canopy) this.#canopy.rotation.y = elapsed * 0.15;
    if (this.#rain) this.#rain.material.uniforms.uTime.value = elapsed;
  }
}
