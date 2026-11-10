import {
  BufferAttribute,
  BufferGeometry,
  Color,
  DoubleSide,
  Group,
  Mesh,
  PerspectiveCamera,
  Scene,
  ShaderMaterial,
  SRGBColorSpace,
  type Texture,
  TextureLoader,
  Vector2,
  type WebGLRenderer,
  WebGLRenderTarget
} from "three";
import gsap from "gsap";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { SVGLoader } from "three/examples/jsm/loaders/SVGLoader.js";

import { FullscreenPass } from "../passes/FullscreenPass";
import { fullRect, rectVert } from "../passes/rect";

const MATCAP = "/gl/textures/tracks/lando__matcap-02.webp";
/** SVG viewBox of the outlet drawings (766 × 482) and the width it maps to in scene units. */
const VIEW = { w: 766, h: 482 };
const WIDTH = 2.3;
const K = WIDTH / VIEW.w;
/** Depth of the neon tubes (front edge bright, back edge dim). */
const DEPTH = 0.11;
/** Draw-on order and delays (s), as in the neon demo: roof → sign → wall → door → windows → bars → details. */
const GROUP_DELAY: Record<string, number> = { roof: 0, sign: 0.5, wall: 0.9, door: 1.2, windows: 1.4, bars: 1.7, details: 2 };
const DRAW_DURATION = 1.6;
/** Fine repeated strokes are thinner / dimmer in the demo (stroke 1.4, opacity .75). */
const FINE = new Set([
  "awning-ribs", "security-bars", "cornice-dentils", "window-mullions", "porch-railing", "window-shutters", "mullions",
  "spokes", "glass-shine", "motion-lines"
]);
const OUT = 0.7; // s, wipe-out before the swap

/**
 * Neon wall shader. uv.x runs 0 → 1 along each stroke (draw-on), aLen is the absolute length along
 * it (moving glow), uv.y = 0 on the front edge (bright lime), 1 on the back edge (dim).
 *   uDraw     strokes appear up to uv.x ≤ uDraw, with a hot "pen" head at the tip;
 *   uTime     a lime sweep runs along every stroke;
 *   uProgress dashed wipe used when switching outlets (out).
 */
const vert = /* glsl */ `
  attribute float aLen;
  varying vec2 vUv;
  varying float vLen;
  varying vec2 vMatcapUv;

  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vec3 eye = normalize(mv.xyz);
    vec3 n = normalize(normalMatrix * normal);
    vec3 r = reflect(eye, n);
    float k = 2.0 * length(vec3(r.xy, r.z + 1.0));
    vMatcapUv = r.xy / k + 0.5;
    vUv = uv;
    vLen = aLen;
    gl_Position = projectionMatrix * mv;
  }
`;

const frag = /* glsl */ `
  uniform sampler2D uMatcap;
  uniform float uTime;
  uniform float uDraw;
  uniform float uProgress;
  uniform float uStrength;
  varying vec2 vUv;
  varying float vLen;
  varying vec2 vMatcapUv;

  const vec3 LIME = vec3(0.824, 1.0, 0.0);

  void main() {
    if (vUv.x > uDraw + 0.0001) discard;
    float sweep = pow(fract(vLen * 1.6 - uTime * 0.45), 2.0) * 10.0 - 5.0;
    float front = smoothstep(0.16, 0.04, vUv.y);
    front -= sweep * front * 0.22;
    float back = step(0.94, vUv.y) * 0.25;
    float pen = smoothstep(0.05, 0.0, uDraw - vUv.x) * step(uDraw, 0.999);
    float wipe = smoothstep(uProgress * 1.2, uProgress * 1.2 - 0.2, fract(vUv.x * 8.0));

    float alpha = (clamp(0.2 + front + back + pen, 0.0, 1.0) - wipe) * uStrength;
    vec3 color = vec3(0.08, 0.12, 0.04) + texture2D(uMatcap, vMatcapUv).rgb * 0.55 + LIME * (front + back + pen);
    gl_FragColor = vec4(color, alpha);
  }
`;

const DARK_BG = 0x121212;

interface Stroke {
  mesh: Mesh<BufferGeometry, ShaderMaterial>;
  delay: number;
}

interface Outlet {
  name: string;
  group: Group;
  strokes: Stroke[];
}

export interface OutletSource {
  name: string;
  svg: string;
}

/** One SVG <path> (all its subpaths) → a merged strip geometry extruded along Z. */
function strokeGeometry(subPaths: Vector2[][]): BufferGeometry {
  const pos: number[] = [];
  const nrm: number[] = [];
  const uv: number[] = [];
  const len: number[] = [];
  const idx: number[] = [];
  let base = 0;
  for (const raw of subPaths) {
    // drop consecutive duplicates
    const pts = raw.filter((p, i) => i === 0 || p.distanceTo(raw[i - 1]) > 1e-4);
    if (pts.length < 2) continue;
    const world = pts.map((p) => new Vector2((p.x - VIEW.w / 2) * K, (VIEW.h / 2 - p.y) * K));
    const cum = [0];
    for (let i = 1; i < world.length; i++) cum.push(cum[i - 1] + world[i].distanceTo(world[i - 1]));
    const total = cum[cum.length - 1] || 1;
    world.forEach((p, i) => {
      const a = world[Math.max(0, i - 1)];
      const b = world[Math.min(world.length - 1, i + 1)];
      const t = new Vector2().subVectors(b, a).normalize();
      for (const [z, v] of [
        [DEPTH / 2, 0],
        [-DEPTH / 2, 1]
      ]) {
        pos.push(p.x, p.y, z);
        nrm.push(-t.y, t.x, 0);
        uv.push(cum[i] / total, v);
        len.push(cum[i]);
      }
    });
    for (let i = 0; i < world.length - 1; i++) {
      const a = base + i * 2;
      idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
    base += world.length * 2;
  }
  const g = new BufferGeometry();
  g.setAttribute("position", new BufferAttribute(new Float32Array(pos), 3));
  g.setAttribute("normal", new BufferAttribute(new Float32Array(nrm), 3));
  g.setAttribute("uv", new BufferAttribute(new Float32Array(uv), 2));
  g.setAttribute("aLen", new BufferAttribute(new Float32Array(len), 1));
  g.setIndex(idx);
  return g;
}

/**
 * On Track calendar card, tax-office edition: each office is a neon storefront outline (SVG) standing
 * up in the card, built as lime tubes with depth and bloom. Same contract as TracksScene (attach /
 * setTrack / resize / render) and the same near-orthographic camera (1° horizontal fov) drawn into the
 * DOM target's rect. Motion: the outline draws itself in group by group when it first comes into view
 * and after every switch; a lime glow keeps running along every stroke; the camera sways gently and
 * follows the pointer a little. Switching wipes the old outline out while it turns away, then draws
 * the next one in while it turns back.
 */
export class OutletsScene {
  readonly scene = new Scene();
  readonly camera = new PerspectiveCamera(1, 1, 0.1, 1000);
  readonly #turn = new Group();
  #outlets: Outlet[] = [];
  #current = 0;
  #el: HTMLElement | null = null;
  #composer: EffectComposer | null = null;
  #bloom: UnrealBloomPass | null = null;
  #matcap: Texture | null = null;
  readonly #size = { w: 1, h: 1, dpr: 1 };
  readonly #plane = new FullscreenPass(
    new ShaderMaterial({
      uniforms: { tDiffuse: { value: null }, uRect: { value: fullRect() }, uLight: { value: 0 } },
      vertexShader: rectVert,
      fragmentShader: /* glsl */ `
        uniform sampler2D tDiffuse;
        uniform float uLight;
        varying vec2 vUv;

        // Light mode (off-white page): the neon render on black becomes ink on paper. Brightness
        // drives it: the faint glow turns a soft lime wash, the bright tubes dark green.
        const vec3 PAGE = vec3(0.957, 0.957, 0.929); // #f4f4ed
        const vec3 WASH = vec3(0.824, 1.0, 0.0);     // lime
        const vec3 INK = vec3(0.157, 0.173, 0.125);  // #282c20

        void main() {
          vec4 c = texture2D(tDiffuse, vUv);
          if (uLight < 0.5) { gl_FragColor = c; return; }
          float l = clamp(max(c.r, max(c.g, c.b)), 0.0, 1.0);
          vec3 col = mix(PAGE, WASH, smoothstep(0.0, 0.15, l) * 0.6);
          col = mix(col, INK, smoothstep(0.12, 0.55, l));
          gl_FragColor = vec4(col, 1.0);
        }
      `,
      transparent: true,
      depthTest: false,
      depthWrite: false
    })
  );
  #pendingName: string | null = null;
  #needsDraw = true;
  #timeline: gsap.core.Timeline | null = null;
  #transitioning = false;
  readonly #pointer = { x: 0, eased: 0 };
  #sources: OutletSource[] = [];
  #building: Promise<void> | null = null;

  constructor() {
    this.scene.background = new Color(DARK_BG).convertLinearToSRGB();
    this.scene.add(this.#turn);
  }

  /** Light mode for an off-white page: render on black, then the plane maps brightness to ink. */
  setLight(on: boolean) {
    this.scene.background = on ? new Color(0x000000) : new Color(DARK_BG).convertLinearToSRGB();
    this.#plane.material.uniforms.uLight.value = on ? 1 : 0;
  }

  async load() {
    const matcap = await new TextureLoader().loadAsync(MATCAP);
    matcap.colorSpace = SRGBColorSpace;
    this.#matcap = matcap;
    if (this.#sources.length) await this.#build();
  }

  /** The offices, in calendar order (name = calendar item id, svg = outline file). */
  define(sources: OutletSource[]) {
    if (this.#sources.length) return;
    this.#sources = sources;
    if (this.#matcap) void this.#build();
  }

  #build() {
    if (!this.#building)
      this.#building = (async () => {
        const loader = new SVGLoader();
        const texts = await Promise.all(this.#sources.map((s) => fetch(s.svg).then((r) => r.text())));
        this.#outlets = this.#sources.map((s, i) => this.#outlet(s.name, loader.parse(texts[i])));
        this.#outlets.forEach((o) => this.#turn.add(o.group));
        const start = this.#pendingName ? this.#outlets.findIndex((o) => o.name === this.#pendingName) : -1;
        this.#show(start === -1 ? 0 : start);
        this.#pendingName = null;
      })();
    return this.#building;
  }

  #outlet(name: string, data: ReturnType<SVGLoader["parse"]>): Outlet {
    const group = new Group();
    group.visible = false;
    const strokes: Stroke[] = [];
    for (const shape of data.paths) {
      const node = shape.userData?.node as Element | undefined;
      const id = node?.getAttribute("id") ?? "";
      const parent = node?.parentNode as Element | null;
      const groupId = parent?.getAttribute?.("id") ?? "";
      // A drawing may set its own group order (data-delay on the <g>), e.g. the car outline.
      const ownDelay = parseFloat(parent?.getAttribute?.("data-delay") ?? "");
      const sub = shape.subPaths.map((p) => p.getPoints(16));
      const geometry = strokeGeometry(sub);
      const material = new ShaderMaterial({
        vertexShader: vert,
        fragmentShader: frag,
        side: DoubleSide,
        transparent: true,
        depthWrite: false,
        uniforms: {
          uMatcap: { value: this.#matcap },
          uTime: { value: 0 },
          uDraw: { value: 0 },
          uProgress: { value: 0 },
          uStrength: { value: FINE.has(id) ? 0.6 : 1 }
        }
      });
      const mesh = new Mesh(geometry, material);
      group.add(mesh);
      strokes.push({ mesh, delay: Number.isFinite(ownDelay) ? ownDelay : (GROUP_DELAY[groupId] ?? 2) });
    }
    return { name, group, strokes };
  }

  attach(el: HTMLElement) {
    this.detach();
    this.#el = el;
    window.addEventListener("pointermove", this.#onPointer, { passive: true });
  }

  detach() {
    window.removeEventListener("pointermove", this.#onPointer);
    this.#timeline?.kill();
    this.#transitioning = false;
    this.#el = null;
  }

  readonly #onPointer = (e: PointerEvent) => {
    this.#pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
  };

  setTrack(name: string, direction: "forward" | "backward" = "forward", immediate = false) {
    if (!this.#outlets.length) {
      this.#pendingName = name;
      return;
    }
    const i = this.#outlets.findIndex((o) => o.name === name);
    if (i === -1 || i === this.#current) return;
    if (immediate) this.#show(i);
    else this.#switch(i, direction);
  }

  #show(i: number) {
    this.#current = i;
    this.#outlets.forEach((o, j) => {
      o.group.visible = j === i;
      o.strokes.forEach((s) => {
        s.mesh.material.uniforms.uDraw.value = 0;
        s.mesh.material.uniforms.uProgress.value = 0;
      });
    });
    this.#needsDraw = true;
  }

  /** Draw-on timeline for one outlet (demo timing: 1.6 s per stroke, group delays). */
  #draw(o: Outlet) {
    const tl = gsap.timeline();
    o.strokes.forEach((s) => {
      s.mesh.material.uniforms.uDraw.value = 0;
      s.mesh.material.uniforms.uProgress.value = 0;
      tl.to(s.mesh.material.uniforms.uDraw, { value: 1, duration: DRAW_DURATION, ease: "power3.inOut" }, s.delay * 0.75);
    });
    return tl;
  }

  #switch(next: number, direction: "forward" | "backward") {
    if (this.#transitioning) return;
    this.#transitioning = true;
    const turn = direction === "forward" ? -Math.PI / 4 : Math.PI / 4;
    const from = this.#outlets[this.#current];
    const to = this.#outlets[next];
    const wipe = { p: 0 };
    const tl = gsap.timeline();
    tl.to(wipe, {
      p: 1,
      duration: OUT,
      ease: "expo.in",
      onUpdate: () => from.strokes.forEach((s) => (s.mesh.material.uniforms.uProgress.value = wipe.p))
    }, 0);
    tl.fromTo(from.group.rotation, { y: 0 }, { y: turn, duration: OUT, ease: "expo.in" }, 0);
    tl.call(() => {
      from.group.visible = false;
      from.group.rotation.y = 0;
      this.#current = next;
      to.group.visible = true;
      this.#needsDraw = false;
      const tin = gsap.timeline({ onComplete: () => (this.#transitioning = false) });
      tin.fromTo(to.group.rotation, { y: -turn }, { y: 0, duration: 1, ease: "expo.out" }, 0);
      tin.add(this.#draw(to), 0);
      // Let the next click through once the turn has landed; the outline keeps drawing.
      tin.call(() => (this.#transitioning = false), [], 1);
      tl.add(tin);
    }, [], OUT);
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

  render(renderer: WebGLRenderer, elapsed: number) {
    const el = this.#el;
    if (!el || !this.#composer || !this.#outlets.length) return;
    const r = el.getBoundingClientRect();
    const { w, h } = this.#size;
    if (r.bottom < -h / 2 || r.top > h * 1.5 || r.width === 0) return;

    // First time the card is on screen: draw the current outlet in.
    if (this.#needsDraw && r.top < h * 0.85 && r.bottom > 0) {
      this.#needsDraw = false;
      this.#timeline = this.#draw(this.#outlets[this.#current]);
    }

    // Near-orthographic camera (1° horizontal fov), slightly above, swaying and following the pointer.
    const aspect = r.width / r.height;
    this.camera.fov = 2 * Math.atan(Math.tan((0.5 * Math.PI) / 180) / aspect) * (180 / Math.PI);
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
    this.#pointer.eased += (this.#pointer.x - this.#pointer.eased) * 0.04;
    const theta = Math.sin(elapsed * 0.35) * 0.28 + this.#pointer.eased * 0.15;
    const phi = Math.PI / 2.25;
    const dist = 207.8;
    this.camera.position.set(dist * Math.sin(phi) * Math.sin(theta), dist * Math.cos(phi), dist * Math.sin(phi) * Math.cos(theta));
    this.camera.lookAt(0, 0, 0);

    this.#outlets[this.#current].strokes.forEach((s) => (s.mesh.material.uniforms.uTime.value = elapsed));

    const target = renderer.getRenderTarget();
    this.#composer.render();
    const u = this.#plane.material.uniforms;
    u.tDiffuse.value = this.#composer.readBuffer.texture;
    u.uRect.value.set(r.width / w, r.height / h, ((r.left + r.width / 2) / w) * 2 - 1, 1 - ((r.top + r.height / 2) / h) * 2);
    this.#plane.render(renderer, target);
  }

  dispose() {
    this.detach();
    this.#outlets.forEach((o) =>
      o.strokes.forEach((s) => {
        s.mesh.geometry.dispose();
        s.mesh.material.dispose();
      })
    );
    this.#matcap?.dispose();
    this.#bloom?.dispose();
    this.#composer?.renderTarget1.dispose();
    this.#composer?.renderTarget2.dispose();
    this.#composer?.dispose();
    this.#plane.dispose();
  }
}
