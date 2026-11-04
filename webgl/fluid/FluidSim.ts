import {
  AdditiveBlending,
  HalfFloatType,
  LinearFilter,
  Mesh,
  OrthographicCamera,
  PlaneGeometry,
  RawShaderMaterial,
  Scene,
  Vector2,
  WebGLRenderTarget,
  type WebGLRenderer
} from "three";

/**
 * Grid-based stable fluids (Stam) driven by a cursor splat. Produces a
 * full-resolution "cursor effect" texture: white where the fluid is still,
 * tinted by velocity where it moves. The hero uses 1 − r as a reveal mask.
 *
 * Settings are the reference's traced values: 10 % grid, BFECC advection,
 * dissipation 0.96, dt 0.014 per frame, 4 Jacobi iterations, splat radius 18
 * cells, force = Δpointer / 2 × 50. Cell scale is normalised to an 1100 px
 * wide reference so the splat keeps the same on-screen size at any width.
 */

const OPTIONS = {
  resolution: 0.1,
  dt: 0.014,
  dissipation: 0.96,
  pressureIterations: 4,
  straightness: 1,
  cursorSize: 18,
  mouseForce: 50,
  referenceWidth: 1100
} as const;

const camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);

/** Quad inset by `boundary` cells so the outermost ring stays at rest (wall). */
const insetVert = /* glsl */ `
  precision highp float;
  attribute vec3 position;
  uniform vec2 boundary;
  varying vec2 uv;
  void main() {
    vec2 p = position.xy * (1.0 - boundary * 2.0);
    uv = 0.5 + p * 0.5;
    gl_Position = vec4(p, 0.0, 1.0);
  }
`;

function pass(fragmentShader: string, uniforms: Record<string, { value: unknown }>, vertexShader = insetVert) {
  const material = new RawShaderMaterial({ vertexShader, fragmentShader, uniforms, depthTest: false, depthWrite: false });
  const scene = new Scene();
  const mesh = new Mesh(new PlaneGeometry(2, 2), material);
  mesh.frustumCulled = false;
  scene.add(mesh);
  return { material, scene, mesh };
}

function target() {
  return new WebGLRenderTarget(1, 1, {
    type: HalfFloatType,
    minFilter: LinearFilter,
    magFilter: LinearFilter,
    depthBuffer: false
  });
}

export class FluidSim {
  readonly output = new WebGLRenderTarget(1, 1, { samples: 4, depthBuffer: false });

  readonly #cell = new Vector2();
  readonly #boundary = new Vector2();
  readonly #grid = new Vector2();

  readonly #velocity = target(); // settled velocity, input to the next frame
  readonly #advected = target(); // advected + splatted
  readonly #divergence = target();
  #pressureA = target();
  #pressureB = target();

  readonly #coords = new Vector2();
  readonly #previous = new Vector2();
  #fromUser = false;

  readonly #advect = pass(
    /* glsl */ `
      precision highp float;
      uniform sampler2D velocity;
      uniform float dt, dissipation;
      uniform vec2 grid;
      varying vec2 uv;
      // BFECC: advect back, forward again, halve the round-trip error, re-advect.
      void main() {
        vec2 ratio = max(grid.x, grid.y) / grid;
        vec2 step = dt * ratio;
        vec2 back = uv - texture2D(velocity, uv).xy * step;
        vec2 forth = back + texture2D(velocity, back).xy * step;
        vec2 corrected = uv - (forth - uv) * 0.5;
        vec2 from = corrected - texture2D(velocity, corrected).xy * step;
        gl_FragColor = vec4(texture2D(velocity, from).xy * dissipation, 0.0, 0.0);
      }
    `,
    {
      velocity: { value: null },
      dt: { value: OPTIONS.dt },
      dissipation: { value: OPTIONS.dissipation },
      grid: { value: this.#grid },
      boundary: { value: this.#boundary }
    }
  );

  readonly #splat = (() => {
    const p = pass(
      /* glsl */ `
        precision highp float;
        uniform vec2 force;
        varying vec2 vUv;
        void main() {
          float falloff = 1.0 - min(length(vUv * 2.0 - 1.0), 1.0);
          gl_FragColor = vec4(force * falloff * falloff, 0.0, 1.0);
        }
      `,
      {
        force: { value: new Vector2() },
        center: { value: new Vector2() },
        radius: { value: new Vector2(OPTIONS.cursorSize, OPTIONS.cursorSize) },
        cell: { value: this.#cell }
      },
      /* glsl */ `
        precision highp float;
        attribute vec3 position;
        attribute vec2 uv;
        uniform vec2 center, radius, cell;
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position.xy * radius * cell + center, 0.0, 1.0);
        }
      `
    );
    p.material.blending = AdditiveBlending;
    p.material.transparent = true;
    return p;
  })();

  readonly #divergencePass = pass(
    /* glsl */ `
      precision highp float;
      uniform sampler2D velocity;
      uniform float dt;
      uniform vec2 cell;
      varying vec2 uv;
      void main() {
        float dx = texture2D(velocity, uv + vec2(cell.x, 0.0)).x - texture2D(velocity, uv - vec2(cell.x, 0.0)).x;
        float dy = texture2D(velocity, uv + vec2(0.0, cell.y)).y - texture2D(velocity, uv - vec2(0.0, cell.y)).y;
        gl_FragColor = vec4((dx + dy) * 0.5 / dt);
      }
    `,
    { velocity: { value: null }, dt: { value: OPTIONS.dt }, cell: { value: this.#cell }, boundary: { value: this.#boundary } }
  );

  readonly #jacobi = pass(
    /* glsl */ `
      precision highp float;
      uniform sampler2D pressure, divergence;
      uniform float straightness;
      uniform vec2 cell;
      varying vec2 uv;
      void main() {
        vec2 o = cell * 2.0;
        float sum = texture2D(pressure, uv + vec2(o.x, 0.0)).r + texture2D(pressure, uv - vec2(o.x, 0.0)).r
                  + texture2D(pressure, uv + vec2(0.0, o.y)).r + texture2D(pressure, uv - vec2(0.0, o.y)).r;
        gl_FragColor = vec4(sum / (4.0 + straightness) - texture2D(divergence, uv).r);
      }
    `,
    {
      pressure: { value: null },
      divergence: { value: this.#divergence.texture },
      straightness: { value: OPTIONS.straightness },
      cell: { value: this.#cell },
      boundary: { value: this.#boundary }
    }
  );

  readonly #project = pass(
    /* glsl */ `
      precision highp float;
      uniform sampler2D pressure, velocity;
      uniform float dt;
      uniform vec2 cell;
      varying vec2 uv;
      void main() {
        vec2 grad = vec2(
          texture2D(pressure, uv + vec2(cell.x, 0.0)).r - texture2D(pressure, uv - vec2(cell.x, 0.0)).r,
          texture2D(pressure, uv + vec2(0.0, cell.y)).r - texture2D(pressure, uv - vec2(0.0, cell.y)).r
        ) * 0.5;
        gl_FragColor = vec4(texture2D(velocity, uv).xy - grad * dt, 0.0, 1.0);
      }
    `,
    {
      pressure: { value: null },
      velocity: { value: this.#advected.texture },
      dt: { value: OPTIONS.dt },
      cell: { value: this.#cell },
      boundary: { value: this.#boundary }
    }
  );

  readonly #display = pass(
    /* glsl */ `
      precision highp float;
      uniform sampler2D velocity;
      varying vec2 uv;
      void main() {
        vec2 v = texture2D(velocity, uv).xy;
        gl_FragColor = vec4(mix(vec3(1.0), vec3(v * 0.5 + 0.5, 1.0), length(v)), 1.0);
      }
    `,
    { velocity: { value: this.#velocity.texture }, boundary: { value: new Vector2(0, 0) } }
  );

  resize(width: number, height: number) {
    const w = Math.max(1, Math.round(OPTIONS.resolution * width));
    const h = Math.max(1, Math.round(OPTIONS.resolution * height));
    const norm = w / (OPTIONS.referenceWidth * OPTIONS.resolution);
    this.#grid.set(w, h);
    this.#cell.set(norm / w, norm / h);
    this.#boundary.copy(this.#cell);
    for (const t of [this.#velocity, this.#advected, this.#divergence, this.#pressureA, this.#pressureB]) t.setSize(w, h);
    this.output.setSize(Math.max(1, Math.round(width)), Math.max(1, Math.round(height)));
  }

  /**
   * Pointer in NDC (−1..1, y up). Call once per frame before `update`.
   * `fromUser`: real mouse — a sample at exactly (0,0) (no move yet) gives no kick.
   */
  setPointer(x: number, y: number, fromUser: boolean) {
    this.#coords.set(x, y);
    this.#fromUser = fromUser;
  }

  update(renderer: WebGLRenderer) {
    const diff = this.#coords.clone().sub(this.#previous);
    this.#previous.copy(this.#coords);
    if (this.#fromUser && this.#coords.x === 0 && this.#coords.y === 0) diff.set(0, 0);

    const r = OPTIONS.cursorSize;
    const cx = this.#cell.x * r + this.#cell.x * 2;
    const cy = this.#cell.y * r + this.#cell.y * 2;
    const s = this.#splat.material.uniforms;
    (s.force.value as Vector2).set((diff.x / 2) * OPTIONS.mouseForce, (diff.y / 2) * OPTIONS.mouseForce);
    (s.center.value as Vector2).set(
      Math.min(Math.max(this.#coords.x, -1 + cx), 1 - cx),
      Math.min(Math.max(this.#coords.y, -1 + cy), 1 - cy)
    );

    this.#advect.material.uniforms.velocity.value = this.#velocity.texture;
    this.#draw(renderer, this.#advect.scene, this.#advected);
    this.#draw(renderer, this.#splat.scene, this.#advected);

    this.#divergencePass.material.uniforms.velocity.value = this.#advected.texture;
    this.#draw(renderer, this.#divergencePass.scene, this.#divergence);

    for (let i = 0; i < OPTIONS.pressureIterations; i++) {
      this.#jacobi.material.uniforms.pressure.value = this.#pressureA.texture;
      this.#draw(renderer, this.#jacobi.scene, this.#pressureB);
      [this.#pressureA, this.#pressureB] = [this.#pressureB, this.#pressureA];
    }

    this.#project.material.uniforms.pressure.value = this.#pressureA.texture;
    this.#draw(renderer, this.#project.scene, this.#velocity);

    this.#draw(renderer, this.#display.scene, this.output);
  }

  #draw(renderer: WebGLRenderer, scene: Scene, to: WebGLRenderTarget) {
    renderer.setRenderTarget(to);
    renderer.render(scene, camera);
  }

  dispose() {
    for (const t of [this.#velocity, this.#advected, this.#divergence, this.#pressureA, this.#pressureB, this.output]) t.dispose();
    for (const p of [this.#advect, this.#splat, this.#divergencePass, this.#jacobi, this.#project, this.#display]) {
      p.material.dispose();
      p.mesh.geometry.dispose();
    }
  }
}
