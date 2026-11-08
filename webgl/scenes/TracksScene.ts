import {
  BufferAttribute,
  Color,
  DoubleSide,
  Group,
  Mesh,
  type Object3D,
  PerspectiveCamera,
  PlaneGeometry,
  Scene,
  ShaderMaterial,
  SRGBColorSpace,
  type Texture,
  TextureLoader,
  Vector2,
  Vector3,
  type WebGLRenderer,
  WebGLRenderTarget
} from "three";
import gsap from "gsap";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";

import { loadModel } from "../loaders";
import { FullscreenPass } from "../passes/FullscreenPass";
import { fullRect, rectVert } from "../passes/rect";

const MODEL = "/gl/models/tracks/tracks-06-test.glb";
const MATCAP = "/gl/textures/tracks/lando__matcap-02.webp";
const HEIGHT = 0.1; // ribbon height (scene units)
const TRANSITION = 2; // s, out + in
const AUTOROTATE_SPEED = 0.2;

/**
 * Ribbon shader: a matcap-lit translucent wall with a bright lime top edge whose
 * brightness ripples along the lap (race direction), a dim lime ground line, and a
 * dashed wipe (uProgress) used by the track-to-track transition.
 * uv.x runs along the lap, uv.y = 0 at the top edge, 1 at the ground.
 */
const ribbonVert = /* glsl */ `
  uniform float uThickness;
  varying vec2 vUv;
  varying vec2 vMatcapUv;

  void main() {
    vec4 world = vec4(position + normal * uThickness, 1.0);
    vec3 eye = normalize((modelViewMatrix * world).xyz);
    vec3 n = normalize(normalMatrix * normal);
    vec3 r = reflect(eye, n);
    float k = 2.0 * length(vec3(r.xy, r.z + 1.0));
    vMatcapUv = r.xy / k + 0.5;
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * world;
  }
`;

const ribbonFrag = /* glsl */ `
  uniform sampler2D uMatcap;
  uniform float uTime;
  uniform float uProgress;
  uniform float uReverse;
  uniform float uDirection;
  varying vec2 vUv;
  varying vec2 vMatcapUv;

  const vec3 LIME = vec3(0.824, 1.0, 0.0);

  void main() {
    float sweep = pow(fract(vUv.x * 5.0 - uTime * uDirection), 2.0) * 10.0 - 5.0;
    float top = smoothstep(0.075, 0.025, vUv.y);
    top -= sweep * top * 0.3;
    float ground = step(0.975, vUv.y) * 0.25;

    float wipe = smoothstep(uProgress * 1.2, uProgress * 1.2 - 0.2, abs(uReverse - fract(vUv.x * 8.0)));

    float alpha = clamp(0.35 + top + ground, 0.0, 1.0) - wipe;
    vec3 color = vec3(0.1, 0.15, 0.05) + texture2D(uMatcap, vMatcapUv).rgb + LIME * (top + ground);
    gl_FragColor = vec4(color, alpha);
  }
`;

/** Chequered start flag used on the "start" point (reference inline SVG). */
const START_SVG = `<svg width="24" height="14" viewBox="0 0 24 14" fill="none" xmlns="http://www.w3.org/2000/svg" style="height:auto"><path d="M4.666 9.333H0V14h4.666V9.333Z" fill="white"/><path d="M4.666 4.667H0v4.666h4.666V4.667Z" fill="#111718"/><path d="M9.283 9.333H4.617V14h4.666V9.333Z" fill="#111718"/><path d="M4.666 0H0v4.667h4.666V0Z" fill="white"/><path d="M9.283 4.667H4.617v4.666h4.666V4.667Z" fill="white"/><path d="M9.283 0H4.617v4.667h4.666V0Z" fill="#111718"/><path d="M13.95 9.333H9.283V14h4.667V9.333Z" fill="white"/><path d="M13.95 4.667H9.283v4.666h4.667V4.667Z" fill="#111718"/><path d="M13.95 0H9.283v4.667h4.667V0Z" fill="white"/><path d="M18.567 9.333H13.9V14h4.667V9.333Z" fill="#111718"/><path d="M18.567 4.667H13.9v4.666h4.667V4.667Z" fill="white"/><path d="M18.567 0H13.9v4.667h4.667V0Z" fill="#111718"/><path d="M23.233 9.333h-4.666V14h4.666V9.333Z" fill="white"/><path d="M23.233 4.667h-4.666v4.666h4.666V4.667Z" fill="#111718"/><path d="M23.233 0h-4.666v4.667h4.666V0Z" fill="white"/></svg>`;

const pad2 = (n: number) => n.toString().padStart(2, "0");

interface TrackData {
  name: string;
  meshes: Mesh<PlaneGeometry, ShaderMaterial>[];
  points: { x: number; z: number; type: string }[];
}

/**
 * On Track calendar: one glowing ribbon per circuit (tracks GLB), shown one at a time.
 * Rendered with its own near-orthographic camera (vertical fov from a 1° horizontal fov,
 * at (87.5, 70, 175), polar angle locked at PI/2.5, slow auto-rotate + drag via
 * OrbitControls on the DOM target) through bloom (1.5 / 0.5 / 0.25) into an 8-bit
 * target the size of the screen, then drawn into the DOM target's rect.
 * Corner / DRS / start markers are DOM nodes inside the target, placed each frame
 * at their projected positions.
 */
export class TracksScene {
  readonly scene = new Scene();
  readonly camera = new PerspectiveCamera(1, 1, 0.1, 1000);
  readonly #instance = new Group();
  readonly #pointsGroup = new Group();
  readonly #pointObjects: Object3D[] = [];
  #pointEls: HTMLElement[] = [];
  #data: TrackData[] = [];
  #current = 0;
  #transitioning = false;
  #el: HTMLElement | null = null;
  #controls: OrbitControls | null = null;
  #composer: EffectComposer | null = null;
  #bloom: UnrealBloomPass | null = null;
  #matcap: Texture | null = null;
  readonly #size = { w: 1, h: 1, dpr: 1 };
  readonly #plane = new FullscreenPass(
    new ShaderMaterial({
      uniforms: { tDiffuse: { value: null }, uRect: { value: fullRect() } },
      vertexShader: rectVert,
      fragmentShader: /* glsl */ `
        uniform sampler2D tDiffuse;
        varying vec2 vUv;
        void main() { gl_FragColor = texture2D(tDiffuse, vUv); }
      `,
      transparent: true,
      depthTest: false,
      depthWrite: false
    })
  );
  #pendingName: string | null = null;
  #timeline: gsap.core.Timeline | null = null;

  constructor() {
    this.scene.background = new Color(0x121212).convertLinearToSRGB();
    this.camera.position.set(87.5, 70, 175);
    this.#instance.add(this.#pointsGroup);
    this.scene.add(this.#instance);
  }

  async load() {
    const [model, matcap] = await Promise.all([loadModel(MODEL), new TextureLoader().loadAsync(MATCAP)]);
    matcap.colorSpace = SRGBColorSpace;
    this.#matcap = matcap;
    model.children.forEach((track) => {
      const path = track.children.find((c) => c.userData.group === "mesh") as Mesh | undefined;
      const points = track.children.find((c) => c.userData.group === "points");
      if (!path) return;
      this.#data.push({
        name: track.name,
        meshes: this.#ribbons(track, path),
        points: (points?.children ?? []).map((p) => ({ x: p.position.x, z: p.position.z, type: p.userData.type as string }))
      });
    });
    this.#data.forEach((d) => d.meshes.forEach((m) => this.#instance.add(m)));
    const max = Math.max(0, ...this.#data.map((d) => d.points.length));
    for (let i = 0; i < max; i++) {
      const o = new Group();
      this.#pointObjects.push(o);
      this.#pointsGroup.add(o);
    }
    if (this.#el) this.#buildPointEls(this.#el);
    const start = this.#pendingName ? this.#index(this.#pendingName) : -1;
    this.#show(start === -1 ? 0 : start);
    this.#pendingName = null;
  }

  /** One `.lando-gl__point` per marker slot (max over all circuits), like the reference. */
  #buildPointEls(el: HTMLElement) {
    this.#pointEls.forEach((p) => p.remove());
    this.#pointEls = this.#pointObjects.map(() => {
      const p = document.createElement("div");
      p.className = "lando-gl__point";
      p.innerHTML = '<div class="lando-gl__point__content"></div>';
      el.appendChild(p);
      return p;
    });
    if (this.#data.length) this.#fillPoints(this.#current);
  }

  /** Closed ribbon: plane with one column per path vertex, ground row at y 0, top row at HEIGHT. */
  #ribbons(track: Object3D, path: Mesh): Mesh<PlaneGeometry, ShaderMaterial>[] {
    const src = path.geometry.attributes.position;
    const n = src.count;
    const geometry = new PlaneGeometry(1, 1, n - 1, 1);
    const pos = geometry.getAttribute("position") as BufferAttribute;
    for (let i = 0; i < n; i++) {
      const k = i < n - 1 ? i : 0; // last vertex closes the loop
      pos.setXYZ(i, src.getX(k), 0, src.getZ(k));
      pos.setXYZ(n + i, src.getX(k), HEIGHT, src.getZ(k));
    }
    geometry.computeVertexNormals();

    const material = () =>
      new ShaderMaterial({
        vertexShader: ribbonVert,
        fragmentShader: ribbonFrag,
        side: DoubleSide,
        transparent: true,
        visible: false,
        uniforms: {
          uThickness: { value: 0 },
          uMatcap: { value: this.#matcap },
          uTime: { value: 0 },
          uProgress: { value: 0 },
          uReverse: { value: 1 },
          uDirection: { value: track.userData.raceDirection === "left" ? 1 : -1 }
        }
      });
    const inner = new Mesh(geometry, material());
    const outer = new Mesh(geometry, material());
    const side = track.userData.side;
    if (side === "inner") outer.material.uniforms.uThickness.value = 0.035;
    else if (side === "outer") outer.material.uniforms.uThickness.value = -0.035;
    else if (side === "center") {
      inner.material.uniforms.uThickness.value = -0.0175;
      outer.material.uniforms.uThickness.value = 0.0175;
    }
    return [inner, outer];
  }

  #index(name: string) {
    return this.#data.findIndex((d) => d.name === name);
  }

  /** DOM target: the scene renders into its rect, hosts the markers and the orbit controls. */
  attach(el: HTMLElement) {
    this.detach();
    this.#el = el;
    this.#buildPointEls(el);
    const controls = new OrbitControls(this.camera, el);
    controls.enableDamping = true;
    controls.enableZoom = false;
    controls.minPolarAngle = controls.maxPolarAngle = Math.PI / 2.5;
    controls.autoRotate = true;
    controls.autoRotateSpeed = AUTOROTATE_SPEED;
    this.#controls = controls;
  }

  detach() {
    this.#controls?.dispose();
    this.#controls = null;
    this.#pointEls.forEach((p) => p.remove());
    this.#pointEls = [];
    this.#timeline?.kill();
    this.#transitioning = false;
    this.#el = null;
  }

  /**
   * Switch to a circuit by id (calendar items). `immediate`: show it without the out/in
   * transition (the page's current race at load, like the reference's initial CURRENT).
   */
  setTrack(name: string, direction: "forward" | "backward" = "forward", immediate = false) {
    if (!this.#data.length) {
      this.#pendingName = name;
      return;
    }
    const i = this.#index(name);
    if (i === -1 || i === this.#current) return;
    if (immediate) this.#show(i);
    else this.#translate(i, direction);
  }

  #show(i: number) {
    this.#current = i;
    this.#data.forEach((d, j) =>
      d.meshes.forEach((m) => {
        m.material.visible = j === i;
        m.material.uniforms.uReverse.value = 1; // reference: 0 only once a track has transitioned in
      })
    );
    this.#fillPoints(i);
  }

  #fillPoints(i: number) {
    const pts = this.#data[i].points;
    let corner = 1;
    let drs = 1;
    this.#pointObjects.forEach((o, k) => {
      const p = pts[k];
      const el = this.#pointEls[k];
      if (!p) {
        if (el) el.style.visibility = "hidden";
        return;
      }
      o.position.set(p.x, HEIGHT, p.z);
      if (!el) return;
      if (p.type === "start") el.innerHTML = `<div class="lando-gl__point__content lando-gl__point__start">${START_SVG}</div>`;
      else if (p.type === "corner")
        el.innerHTML = `<div class="lando-gl__point__content"><p class="lando-gl__point__text--top">${pad2(corner++)}</p><p class="lando-gl__point__text--bottom"></p></div>`;
      else if (p.type === "drs")
        el.innerHTML = `<div class="lando-gl__point__content lando-gl__point__content--drs"><p class="lando-gl__point__text--top">DRS</p><p class="lando-gl__point__text--bottom">${pad2(drs++)}</p></div>`;
      el.style.visibility = "visible";
    });
  }

  /** Reference translate: 1 s out (expo.in) → swap → 1 s in (expo.out); markers fade/lift with a 15 ms stagger. */
  #translate(next: number, direction: "forward" | "backward") {
    if (this.#transitioning) return;
    this.#transitioning = true;
    document.documentElement.classList.add("gl-tracks-isTransitioning");
    const half = TRANSITION / 2;
    const turn = direction === "forward" ? -Math.PI / 4 : Math.PI / 4;
    const params = { progress: 0 };
    const contents = () => this.#pointEls.map((p) => p.querySelector(".lando-gl__point__content")).filter(Boolean);
    const from = this.#data[this.#current];
    const to = this.#data[next];

    const tl = gsap.timeline({
      onComplete: () => {
        this.#transitioning = false;
        document.documentElement.classList.remove("gl-tracks-isTransitioning");
      }
    });
    tl.to(params, {
      progress: 1,
      duration: half,
      ease: "expo.in",
      onUpdate: () => from.meshes.forEach((m) => (m.material.uniforms.uProgress.value = params.progress))
    }, 0);
    from.meshes.forEach((m) => tl.fromTo(m.rotation, { y: 0 }, { y: turn, duration: half, ease: "expo.in" }, 0));
    tl.fromTo(this.#pointsGroup.rotation, { y: 0 }, { y: turn, duration: half, ease: "expo.in" }, 0);
    contents().forEach((c, k) =>
      tl.fromTo(c, { yPercent: 0, opacity: 1 }, { yPercent: -25, opacity: 0, duration: half / 2, delay: k * 0.015, ease: "expo.in" }, 0)
    );
    tl.call(() => {
      from.meshes.forEach((m) => {
        m.material.uniforms.uReverse.value = 1;
        m.material.visible = false;
        m.rotation.y = 0;
      });
      to.meshes.forEach((m) => (m.material.visible = true));
      this.#current = next;
      this.#fillPoints(next);
      const fresh = contents();
      fresh.forEach((c) => gsap.set(c, { yPercent: -25, opacity: 0 }));
      params.progress = 1;
      const tin = gsap.timeline();
      tin.to(params, {
        progress: 0,
        duration: half,
        ease: "expo.out",
        onUpdate: () => to.meshes.forEach((m) => (m.material.uniforms.uProgress.value = params.progress)),
        onComplete: () => to.meshes.forEach((m) => (m.material.uniforms.uReverse.value = 0))
      }, 0);
      to.meshes.forEach((m) => tin.fromTo(m.rotation, { y: -turn }, { y: 0, duration: half, ease: "expo.out" }, 0));
      tin.fromTo(this.#pointsGroup.rotation, { y: -turn }, { y: 0, duration: half, ease: "expo.out" }, 0);
      fresh.forEach((c, k) =>
        tin.fromTo(c, { yPercent: -25, opacity: 0 }, { yPercent: 0, opacity: 1, duration: half / 2, delay: k * 0.015, ease: "expo.out" }, 0)
      );
      tl.add(tin);
    }, [], half);
    this.#timeline = tl;
  }

  resize(width: number, height: number, pixelRatio: number, renderer: WebGLRenderer) {
    this.#size.w = width;
    this.#size.h = height;
    this.#size.dpr = pixelRatio;
    if (!this.#composer) {
      const target = new WebGLRenderTarget(width * pixelRatio, height * pixelRatio, { samples: 2 });
      this.#composer = new EffectComposer(renderer, target);
      this.#composer.renderToScreen = false;
      this.#composer.addPass(new RenderPass(this.scene, this.camera));
      this.#bloom = new UnrealBloomPass(new Vector2(width, height), 1.5, 0.5, 0.25);
      this.#composer.addPass(this.#bloom);
    }
    this.#composer.setPixelRatio(pixelRatio);
    this.#composer.setSize(width, height);
  }

  /** Render into the target's rect while it is within half a screen of the viewport. */
  render(renderer: WebGLRenderer, elapsed: number) {
    const el = this.#el;
    if (!el || !this.#composer || !this.#data.length) return;
    const r = el.getBoundingClientRect();
    const { w, h } = this.#size;
    if (r.bottom < -h / 2 || r.top > h * 1.5 || r.width === 0) return;

    const aspect = r.width / r.height;
    this.camera.fov = 2 * Math.atan(Math.tan((0.5 * Math.PI) / 180) / aspect) * (180 / Math.PI);
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
    this.#data[this.#current].meshes.forEach((m) => (m.material.uniforms.uTime.value = elapsed));

    // Markers: projected point → offset from the target centre. Like the reference, this runs
    // before controls.update(): its lookAt() refreshes the camera matrix with the new position
    // but the old rotation, which the 1° camera turns into a ~20 px marker jitter.
    const v = new Vector3();
    this.#pointEls.forEach((p, k) => {
      if (!this.#data[this.#current].points[k]) return;
      this.#pointObjects[k].getWorldPosition(v).project(this.camera);
      p.style.transform = `translateX(${v.x * r.width * 0.5}px) translateY(${-v.y * r.height * 0.5}px)`;
    });
    this.#controls?.update();

    const target = renderer.getRenderTarget();
    this.#composer.render();
    const u = this.#plane.material.uniforms;
    u.tDiffuse.value = this.#composer.readBuffer.texture;
    u.uRect.value.set(r.width / w, r.height / h, ((r.left + r.width / 2) / w) * 2 - 1, 1 - ((r.top + r.height / 2) / h) * 2);
    this.#plane.render(renderer, target);
  }

  dispose() {
    this.detach();
    this.#data.forEach((d) => {
      d.meshes[0].geometry.dispose();
      d.meshes.forEach((m) => m.material.dispose());
    });
    this.#matcap?.dispose();
    this.#bloom?.dispose();
    this.#composer?.renderTarget1.dispose();
    this.#composer?.renderTarget2.dispose();
    this.#composer?.dispose();
    this.#plane.dispose();
  }
}
