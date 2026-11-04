import {
  DoubleSide,
  EquirectangularReflectionMapping,
  Group,
  LinearFilter,
  Mesh,
  MeshMatcapMaterial,
  MeshStandardMaterial,
  NoColorSpace,
  RepeatWrapping,
  Scene,
  SRGBColorSpace,
  TextureLoader,
  type Texture
} from "three";
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader.js";

import { loadModel } from "../loaders";
import { HELMET_TRANSFORM } from "./HeadScene";

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

/**
 * Livery shell: polished metal whose base colour comes from two livery
 * textures split along local height (the "next" livery wipes in from the top
 * as uHelmetTransition goes 0 → 1). Back faces are black.
 */
function liveryMaterial(current: Texture, next: Texture, normal: Texture, env: Texture) {
  const material = new MeshStandardMaterial({
    normalMap: normal,
    metalness: 1,
    roughness: 0.05,
    envMap: env,
    envMapIntensity: 3
  });
  material.defines = { USE_UV: "" };
  const uniforms = {
    tLiveryCurrent: { value: current },
    tLiveryNext: { value: next },
    uHelmetTransition: { value: 0 }
  };
  material.userData.uniforms = uniforms;
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vLocal;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvLocal = position;");
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
        varying vec3 vLocal;
        uniform sampler2D tLiveryCurrent, tLiveryNext;
        uniform float uHelmetTransition;`
      )
      .replace(
        "vec4 diffuseColor = vec4( diffuse, opacity );",
        `float wipe = vLocal.y - sin(vLocal.x * PI) * sin(uHelmetTransition * PI) * 0.1;
        float showCurrent = step(wipe, mix(0.05, -0.05, uHelmetTransition));
        vec3 livery = mix(texture2D(tLiveryNext, vUv).rgb, texture2D(tLiveryCurrent, vUv).rgb, showCurrent);
        vec4 diffuseColor = gl_FrontFacing ? vec4(livery, opacity) : vec4(0.0, 0.0, 0.0, 1.0);`
      );
  };
  return material;
}

/** Helmet rendered offscreen with the head camera; revealed through the fluid mask. */
export class HelmetScene {
  readonly scene = new Scene();
  readonly root = new Group();

  constructor() {
    this.root.scale.setScalar(HELMET_TRANSFORM.scale);
    this.root.rotation.x = HELMET_TRANSFORM.rotationX;
    this.root.position.y = HELMET_TRANSFORM.positionY;
    this.scene.add(this.root);
  }

  async load() {
    const tl = new TextureLoader();
    const t = (path: string, color: boolean) => tl.loadAsync(`${TEX}/${path}`).then((x) => prep(x, color));
    const [model, env, gold, disco, helmetNormal, helmetMetallic, glassBase, glassNormal, glassRoughness, plasticMatcap] =
      await Promise.all([
        loadModel("/gl/models/helmet-21.glb"),
        new RGBELoader().loadAsync("/gl/hdri/studio_small_08_1k--light.hdr"),
        t("helmet/webp/gold/Norris_Helmet_mat_BaseColor.webp", true),
        t("helmet/webp/disco/Norris_Helmet_mat_BaseColor.webp", true),
        t("helmet/webp/Norris_Helmet_mat_Normal.webp", false),
        t("helmet/webp/Norris_Helmet_mat_Metallic.webp", false),
        t("glass/webp/Norris_Glass_mat_BaseColor.webp", true),
        t("glass/webp/Norris_Glass_mat_Normal.webp", false),
        t("glass/webp/Norris_Glass_mat_Roughness.webp", false),
        t("plastic/plastic__matcap-02.webp", false)
      ]);
    env.mapping = EquirectangularReflectionMapping;

    const mesh = (name: string) => (model.getObjectByName(name) as Mesh).clone();

    const shell = mesh("helmet");
    shell.material = liveryMaterial(gold, disco, helmetNormal, env);

    const glass = mesh("glass");
    glass.material = new MeshStandardMaterial({
      map: glassBase,
      normalMap: glassNormal,
      roughnessMap: glassRoughness,
      metalnessMap: helmetMetallic,
      roughness: 1,
      metalness: 0,
      envMap: env,
      envMapIntensity: 1.5
    });

    const plastic = mesh("plastic");
    plastic.material = new MeshMatcapMaterial({
      matcap: plasticMatcap,
      side: DoubleSide,
      transparent: true,
      opacity: 0.25
    });
    plastic.renderOrder = 1;

    this.root.add(shell, glass, plastic);
  }

  dispose() {
    this.scene.traverse((obj) => {
      const m = obj as Mesh;
      if (!m.isMesh) return;
      const mat = m.material as MeshStandardMaterial;
      for (const key of ["map", "normalMap", "roughnessMap", "metalnessMap", "envMap"] as const) mat[key]?.dispose();
      (mat as unknown as MeshMatcapMaterial).matcap?.dispose();
      const u = mat.userData.uniforms;
      if (u) {
        u.tLiveryCurrent.value.dispose();
        u.tLiveryNext.value.dispose();
      }
      mat.dispose();
    });
  }
}
