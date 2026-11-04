import { ShaderMaterial, type Texture } from "three";

import { FullscreenPass } from "./FullscreenPass";
import { fullRect, rectVert } from "./rect";

/** Draws an offscreen layer (e.g. the marquee text) as a blended screen rectangle. */
export class TexturePlanePass extends FullscreenPass {
  constructor(texture: Texture) {
    super(
      new ShaderMaterial({
        uniforms: { tDiffuse: { value: texture }, uRect: { value: fullRect() } },
        vertexShader: rectVert,
        fragmentShader: /* glsl */ `
          uniform sampler2D tDiffuse;
          varying vec2 vUv;
          void main() {
            gl_FragColor = texture2D(tDiffuse, vUv);
            // Reference copies the layer without output conversion (text shows its raw #B2C73A / #DDE1D2).
          }
        `,
        transparent: true,
        depthTest: false,
        depthWrite: false
      })
    );
  }
}
