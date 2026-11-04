import { Color, ShaderMaterial, type Texture } from "three";

import { raw } from "./colors";
import { FullscreenPass } from "./FullscreenPass";
import { fullRect, rectVert } from "./rect";

/**
 * Dark green page behind the hero card: #282C20 with the same 1px contour
 * isolines (from the shared contour field) drawn in #363B25.
 */
const PAPER = { from: raw("#282c20"), to: raw("#f4f4ed") };
const LINE = { from: raw("#363b25"), to: raw("#d4d7ca") };

export class DarkContourPass extends FullscreenPass {
  /**
   * 0 = dark green page, 1 = off-white page (reference horizontal track:
   * #282C20 / #363B25 → #F4F4ED / #D4D7CA, mixed in raw byte space).
   */
  setTint(t: number) {
    this.#tint = t;
    this.#apply();
  }

  /** 0 = contour lines visible, 1 = lines faded into the paper (reference partners section). */
  setLineFade(t: number) {
    this.#fade = t;
    this.#apply();
  }

  #tint = 0;
  #fade = 0;

  #apply() {
    const u = this.material.uniforms;
    const paper = u.uPaper.value as Color;
    paper.lerpColors(PAPER.from, PAPER.to, this.#tint);
    (u.uLine.value as Color).lerpColors(LINE.from, LINE.to, this.#tint).lerp(paper, this.#fade);
  }

  constructor(contours: Texture) {
    super(
      new ShaderMaterial({
        uniforms: {
          tContours: { value: contours },
          uRect: { value: fullRect() },
          uEdgeOffset: { value: 0.000005 },
          uPaper: { value: PAPER.from.clone() },
          uLine: { value: LINE.from.clone() }
        },
        vertexShader: rectVert,
        fragmentShader: /* glsl */ `
          uniform sampler2D tContours;
          uniform float uEdgeOffset;
          uniform vec3 uPaper, uLine;
          varying vec2 vUv;
          void main() {
            float c = texture2D(tContours, vUv).r;
            vec2 o = vec2(uEdgeOffset, 0.0);
            float d = abs(texture2D(tContours, vUv + o.xy).r - c) + abs(texture2D(tContours, vUv - o.xy).r - c)
                    + abs(texture2D(tContours, vUv + o.yx).r - c) + abs(texture2D(tContours, vUv - o.yx).r - c);
            gl_FragColor = vec4(mix(uPaper, uLine, d > 0.0 ? 1.0 : 0.0), 1.0);
            // Reference writes these bytes straight out (no linear→sRGB), so #282C20 shows as #282C20.
          }
        `,
        depthTest: false,
        depthWrite: false
      })
    );
  }
}
