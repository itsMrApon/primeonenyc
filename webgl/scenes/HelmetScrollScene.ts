import {
  DoubleSide,
  EquirectangularReflectionMapping,
  Group,
  LinearFilter,
  type Mesh,
  MeshMatcapMaterial,
  MeshPhysicalMaterial,
  NoColorSpace,
  PerspectiveCamera,
  RepeatWrapping,
  Scene,
  ShaderMaterial,
  SRGBColorSpace,
  TextureLoader,
  type Texture,
  type WebGLRenderer,
  WebGLRenderTarget
} from "three";
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader.js";

import { loadModel } from "../loaders";
import { FullscreenPass } from "../passes/FullscreenPass";
import { fullRect, rectVert } from "../passes/rect";

const TEX = "/gl/textures";

/** Non-head textures: glTF orientation, no mipmaps (reference settings). */
function prep(tex: Texture, color: boolean) {
  tex.flipY = false;
  tex.minFilter = LinearFilter;
  tex.magFilter = LinearFilter;
  tex.wrapS = tex.wrapT = RepeatWrapping;
  tex.colorSpace = color ? SRGBColorSpace : NoColorSpace;
  tex.needsUpdate = true;
  return tex;
}

const quadInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
const quadIn = (t: number) => t * t;
const quadOut = (t: number) => 1 - (1 - t) * (1 - t);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Where the helmet plane sits: centre (page px, relative to the track top), side, scroll progress. */
export interface HelmetScrollState {
  x: number;
  y: number;
  size: number;
  progress: number;
  rendering: boolean;
}

/**
 * On Track page helmet ("helmet-scroll" scene in the reference):
 * the livery helmet is rendered offscreen with its own fov-20 camera (aspect 1)
 * into a screen-sized target, then drawn as a square plane whose centre and
 * side follow a two-segment bezier between the page's pos1 → pos2 → pos3
 * markers (useHelmetFlip). The plane's edges fade (smoothstep 0.4 → 0.5 of uv).
 * Scroll progress drives a spin: group y PI/2.2 → 4PI (power1.inOut) while the
 * helmet tilts x PI/12 → −PI/10 (power1.in, first half) → PI/20 (power1.out).
 */
export class HelmetScrollScene {
  readonly scene = new Scene();
  readonly camera = new PerspectiveCamera(20, 1, 0.1, 1000);
  readonly #group = new Group();
  #helmet: Group | null = null;
  readonly #target = new WebGLRenderTarget(1, 1, { samples: 1 });
  readonly #plane = new FullscreenPass(
    new ShaderMaterial({
      uniforms: { tDiffuse: { value: this.#target.texture }, uRect: { value: fullRect() } },
      vertexShader: rectVert,
      fragmentShader: /* glsl */ `
        uniform sampler2D tDiffuse;
        varying vec2 vUv;
        void main() {
          gl_FragColor = texture2D(tDiffuse, vUv);
          gl_FragColor.a *= smoothstep(0.5, 0.4, abs(vUv.x - 0.5));
          gl_FragColor.a *= smoothstep(0.5, 0.4, abs(vUv.y - 0.5));
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }
      `,
      transparent: true,
      depthTest: false,
      depthWrite: false
    })
  );
  readonly #state: HelmetScrollState = { x: 0, y: 0, size: 0, progress: 0, rendering: false };
  readonly #size = { w: 1, h: 1 };
  readonly #uniforms = { uHelmetTransition: { value: 0 } };

  constructor() {
    this.camera.position.z = 2;
    this.scene.add(this.#group);
  }

  async load() {
    const tl = new TextureLoader();
    const t = (path: string, color: boolean) => tl.loadAsync(`${TEX}/${path}`).then((x) => prep(x, color));
    const [model, light, faded, gold, disco, normal, metallic, glassBase, glassNormal, glassRoughness, plasticMatcap] =
      await Promise.all([
        loadModel("/gl/models/helmet-21.glb"),
        new RGBELoader().loadAsync("/gl/hdri/studio_small_08_1k--light.hdr"),
        new RGBELoader().loadAsync("/gl/hdri/studio_small_08_1k--faded.hdr"),
        // Reference "Lime" variant points at the gold livery texture.
        t("helmet/webp/gold/Norris_Helmet_mat_BaseColor.webp", true),
        t("helmet/webp/disco/Norris_Helmet_mat_BaseColor.webp", true),
        t("helmet/webp/Norris_Helmet_mat_Normal.webp", false),
        t("helmet/webp/Norris_Helmet_mat_Metallic.webp", false),
        t("glass/webp/Norris_Glass_mat_BaseColor.webp", true),
        t("glass/webp/Norris_Glass_mat_Normal.webp", false),
        t("glass/webp/Norris_Glass_mat_Roughness.webp", false),
        t("plastic/plastic__matcap-02.webp", false)
      ]);
    light.mapping = EquirectangularReflectionMapping;
    faded.mapping = EquirectangularReflectionMapping;

    const shell = new MeshPhysicalMaterial({
      normalMap: normal,
      metalness: 1,
      roughness: 0.05,
      envMap: light,
      envMapIntensity: 1.5,
      side: DoubleSide
    });
    shell.defines = { USE_UV: "" };
    const uniforms = { ...this.#uniforms, tCurrentTexture: { value: gold }, tNextTexture: { value: disco } };
    shell.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, uniforms);
      shader.vertexShader = shader.vertexShader
        .replace("#include <common>", "#include <common>\nvarying vec3 vLocalPosition;")
        .replace("#include <begin_vertex>", "#include <begin_vertex>\nvLocalPosition = position;");
      shader.fragmentShader = shader.fragmentShader
        .replace(
          "#include <common>",
          `#include <common>
          varying vec3 vLocalPosition;
          uniform float uHelmetTransition;
          uniform sampler2D tCurrentTexture, tNextTexture;`
        )
        .replace(
          "vec4 diffuseColor = vec4( diffuse, opacity );",
          `vec4 diffuseColor = vec4(vec3(0.0), 1.0);
          vec3 livery = mix(texture2D(tNextTexture, vUv).rgb, texture2D(tCurrentTexture, vUv).rgb,
            step(vLocalPosition.y, mix(0.0425, -0.0425, uHelmetTransition)));
          if (gl_FrontFacing) diffuseColor = vec4(livery, opacity);`
        );
    };
    shell.userData.textures = [gold, disco];

    const glass = new MeshPhysicalMaterial({
      map: glassBase,
      roughnessMap: glassRoughness,
      normalMap: glassNormal,
      metalnessMap: metallic,
      envMap: faded,
      envMapIntensity: 1.5
    });

    const plastic = new MeshMatcapMaterial({ matcap: plasticMatcap, side: DoubleSide, transparent: true, opacity: 0.25 });

    const helmet = model.clone();
    helmet.scale.setScalar(6);
    helmet.children.forEach((child) => {
      const mesh = child as Mesh;
      if (mesh.name === "helmet") mesh.material = shell;
      if (mesh.name === "glass") mesh.material = glass;
      if (mesh.name === "plastic") {
        mesh.renderOrder = 1;
        mesh.material = plastic;
      }
    });
    this.#helmet = helmet;
    this.#group.add(helmet);
    this.#applyProgress();
  }

  resize(width: number, height: number, pixelRatio: number) {
    this.#size.w = width;
    this.#size.h = height;
    this.#target.setSize(Math.round(width * pixelRatio), Math.round(height * pixelRatio));
  }

  set(state: HelmetScrollState) {
    Object.assign(this.#state, state);
  }

  #applyProgress() {
    if (!this.#helmet) return;
    const p = Math.min(this.#state.progress + 0.001, 1);
    this.#group.rotation.y = lerp(Math.PI / 2.2, Math.PI * 4, quadInOut(p));
    this.#helmet.rotation.x =
      p < 0.5 ? lerp(Math.PI / 12, -Math.PI / 10, quadIn(p / 0.5)) : lerp(-Math.PI / 10, Math.PI / 20, quadOut((p - 0.5) / 0.5));
  }

  /** Helmet → offscreen target, then the faded square plane onto the current target. */
  render(renderer: WebGLRenderer) {
    if (!this.#helmet || !this.#state.rendering) return;
    this.#applyProgress();
    const target = renderer.getRenderTarget();
    renderer.setRenderTarget(this.#target);
    renderer.clear();
    renderer.render(this.scene, this.camera);

    const { w, h } = this.#size;
    const { x, y, size } = this.#state;
    const screenY = y - window.scrollY;
    this.#plane.material.uniforms.uRect.value.set(size / w, size / h, (x / w) * 2 - 1, 1 - (screenY / h) * 2);
    this.#plane.render(renderer, target);
  }

  dispose() {
    this.scene.traverse((obj) => {
      const m = obj as Mesh;
      if (!m.isMesh) return;
      const mat = m.material as MeshPhysicalMaterial & MeshMatcapMaterial;
      for (const key of ["map", "normalMap", "roughnessMap", "metalnessMap", "envMap", "matcap"] as const) mat[key]?.dispose();
      (mat.userData.textures as Texture[] | undefined)?.forEach((tex) => tex.dispose());
      mat.dispose();
    });
    this.#target.dispose();
    this.#plane.dispose();
  }
}
