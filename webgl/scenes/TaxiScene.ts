import {
  Color,
  DirectionalLight,
  FrontSide,
  Group,
  HemisphereLight,
  Mesh,
  MeshStandardMaterial,
  PlaneGeometry,
  ShaderMaterial,
  SphereGeometry,
  type WebGLRenderer
} from "three";

import { loadModel } from "../loaders";
import { createContactShadowMaterial, createRoomEnvironment, HeroStage } from "./HeroStage";

/** Taxi (Quaternius, CC0): ~1.8 wide × 1.3 tall × 4.2 long, wheels on y = 0, nose at +z. */
const TAXI_URL = "/gl/models/taxi.glb";
const TAXI = { scale: 0.125, pitch: 0.22, yaw: -0.62, centreY: 0.65 } as const;

/**
 * Protective bubble: lime fresnel rim, faint hex grid and a band that scans up
 * the shell. Front faces only, so it never needs the taxi's depth.
 */
function createShieldMaterial() {
  return new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: FrontSide,
    // The renderer defaults every program to lowp; the hex grid needs more.
    precision: "highp",
    uniforms: {
      uTime: { value: 0 },
      uRim: { value: new Color("#d2ff00") },
      uLine: { value: new Color("#7a9400") }
    },
    vertexShader: /* glsl */ `
      varying vec3 vNormal;
      varying vec3 vView;
      varying vec3 vLocal;
      varying vec2 vUv;
      void main() {
        vUv = uv;
        vLocal = position;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vView = -mv.xyz;
        vNormal = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform vec3 uRim, uLine;
      varying vec3 vNormal;
      varying vec3 vView;
      varying vec3 vLocal;
      varying vec2 vUv;

      // Distance to the nearest hexagon edge (0 at centre, 0.5 on the edge).
      float hexEdge(vec2 p) {
        const vec2 s = vec2(1.0, 1.7320508);
        vec4 c = floor(vec4(p, p - vec2(0.5, 1.0)) / s.xyxy) + 0.5;
        vec4 h = vec4(p - c.xy * s, p - (c.zw + 0.5) * s);
        vec2 g = dot(h.xy, h.xy) < dot(h.zw, h.zw) ? h.xy : h.zw;
        g = abs(g);
        return max(dot(g, s * 0.5), g.x);
      }

      void main() {
        float facing = abs(dot(normalize(vNormal), normalize(vView)));
        float rim = pow(1.0 - facing, 2.2);
        float hex = smoothstep(0.43, 0.5, hexEdge(vUv * vec2(36.0, 18.0)));
        float band = pow(fract(vLocal.y * 1.2 - uTime * 0.35), 8.0);

        vec3 color = mix(uLine, uRim, rim);
        float alpha = 0.10 + rim * 0.85 + hex * (0.22 + band * 0.5) + band * 0.12;
        gl_FragColor = vec4(color, clamp(alpha, 0.0, 1.0));
      }
    `
  });
}

/**
 * Hero subject (backup option): a NYC taxi on the paper, slowly swaying, lit by
 * a room environment. The reveal scene holds the glass shield, shown only where
 * the fluid (cursor) mask is active.
 */
export class TaxiScene extends HeroStage {
  readonly #taxi = new Group();
  #shield: Mesh<SphereGeometry, ShaderMaterial> | null = null;
  #ready = false;

  constructor() {
    super();
    const hemi = new HemisphereLight(0xffffff, 0x3a3a30, 0.5);
    const key = new DirectionalLight(0xffffff, 1.6);
    key.position.set(-1.5, 2.5, 2);
    this.scene.add(hemi, key);
  }

  async load(renderer: WebGLRenderer) {
    this.env = createRoomEnvironment(renderer);
    this.scene.environment = this.env;

    const model = (await loadModel(TAXI_URL)).clone(true);
    model.traverse((obj) => {
      const mesh = obj as Mesh;
      if (!mesh.isMesh) return;
      const tune = (m: MeshStandardMaterial) => {
        const mat = m.clone();
        // NYC taxi yellow; the model ships a muted mustard.
        if (mat.name === "Yellow") Object.assign(mat, { color: new Color("#f7b500"), roughness: 0.35, metalness: 0.1 });
        if (mat.name === "Windows") Object.assign(mat, { roughness: 0.05, metalness: 0.6 });
        mat.envMapIntensity = 0.55;
        return mat;
      };
      mesh.material = Array.isArray(mesh.material)
        ? (mesh.material as MeshStandardMaterial[]).map(tune)
        : tune(mesh.material as MeshStandardMaterial);
    });
    model.position.set(0, -TAXI.centreY, -0.1);
    this.#taxi.add(model);

    const shadow = new Mesh(new PlaneGeometry(2.6, 5.2), createContactShadowMaterial());
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.set(0, -TAXI.centreY + 0.002, -0.1);
    this.#taxi.add(shadow);

    this.root.add(this.#taxi);
    this.root.scale.setScalar(TAXI.scale);
    this.root.rotation.x = TAXI.pitch;

    // Ellipsoid bubble around the car, on the reveal root (same transform).
    this.#shield = new Mesh(new SphereGeometry(1, 96, 48), createShieldMaterial());
    this.#shield.scale.set(1.45, 1.05, 2.7);
    this.revealRoot.add(this.#shield);
    this.revealRoot.scale.setScalar(TAXI.scale);
    this.revealRoot.rotation.x = TAXI.pitch;

    this.#ready = true;
  }

  /** Slow sway; the shield follows the car and scans. */
  update(elapsed: number) {
    if (!this.#ready) return;
    const yaw = TAXI.yaw + Math.sin(elapsed * 0.35) * 0.14;
    this.#taxi.rotation.y = yaw;
    this.#taxi.position.y = Math.sin(elapsed * 1.1) * 0.02;
    if (this.#shield) {
      this.#shield.rotation.y = yaw;
      this.#shield.material.uniforms.uTime.value = elapsed;
    }
  }
}
