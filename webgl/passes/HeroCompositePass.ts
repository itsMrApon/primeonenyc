import { Color, ShaderMaterial, type Texture } from "three";

import { FullscreenPass } from "./FullscreenPass";

/**
 * The reference feeds these hex bytes to the shader as *linear* values and
 * then converts to sRGB on output (#f8f8f3 renders as #fcfcfa). Keep that:
 * setRGB with no colour space = raw working-space numbers.
 */
const raw = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return new Color().setRGB(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
};

export interface HeroCompositeInputs {
  contours: Texture;
  head: Texture;
  helmet: Texture;
  cursorEffect: Texture;
}

/**
 * Final hero image:
 *   paper + 1px contour outlines
 *   → under the fluid mask: banded "cursor paper" (two greys) with its own outline
 *   → lit head on top
 *   → helmet on top of that, only where the fluid mask is active.
 * Colours are the reference site's traced constants.
 */
export class HeroCompositePass extends FullscreenPass {
  constructor(inputs: HeroCompositeInputs) {
    super(
      new ShaderMaterial({
        uniforms: {
          tContours: { value: inputs.contours },
          tHead: { value: inputs.head },
          tHelmet: { value: inputs.helmet },
          tCursorEffect: { value: inputs.cursorEffect },
          uReveal: { value: 1 },
          uCursorIntensity: { value: 1 },
          uEdgeOffset: { value: 0.000005 },
          uPaper: { value: raw("#f8f8f3") },
          uLine: { value: raw("#cbcbb9") },
          uCursorPaper: { value: raw("#e8e8df") },
          uCursorPaperAlt: { value: raw("#cfd2c5") },
          uCursorLine: { value: raw("#e8e8df") }
        },
        vertexShader: /* glsl */ `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = vec4(position.xy, 0.0, 1.0);
          }
        `,
        fragmentShader: /* glsl */ `
          uniform sampler2D tContours, tHead, tHelmet, tCursorEffect;
          uniform float uReveal, uCursorIntensity, uEdgeOffset;
          uniform vec3 uPaper, uLine, uCursorPaper, uCursorPaperAlt, uCursorLine;
          varying vec2 vUv;

          // 1 where the band value changes within a hair's offset: a 1px isoline.
          float contourEdge(vec2 uv, float c) {
            vec2 o = vec2(uEdgeOffset, 0.0);
            float d = abs(texture2D(tContours, uv + o.xy).r - c)
                    + abs(texture2D(tContours, uv - o.xy).r - c)
                    + abs(texture2D(tContours, uv + o.yx).r - c)
                    + abs(texture2D(tContours, uv - o.yx).r - c);
            return d > 0.0 ? 1.0 : 0.0;
          }

          void main() {
            float band = texture2D(tContours, vUv).r;
            float edge = contourEdge(vUv, band);

            // Fluid mask, inset 2.5 % on every side (hides the sim's wall ring).
            float mask = step(0.1, 1.0 - texture2D(tCursorEffect, 0.025 + vUv * 0.95).r) * uCursorIntensity;

            vec3 paper = mix(uPaper, uLine, edge * uReveal);
            vec3 cursorPaper = mix(mix(uCursorPaper, uCursorPaperAlt, band), uCursorLine, edge);
            paper = mix(paper, cursorPaper, mask);

            vec4 head = texture2D(tHead, vUv);
            vec4 helmet = texture2D(tHelmet, vUv);
            vec3 color = mix(paper, head.rgb, head.a);
            color = mix(color, helmet.rgb, clamp(mask, 0.0, 1.0) * helmet.a);

            gl_FragColor = vec4(color, 1.0);
            #include <colorspace_fragment>
          }
        `,
        depthTest: false,
        depthWrite: false
      })
    );
  }
}
