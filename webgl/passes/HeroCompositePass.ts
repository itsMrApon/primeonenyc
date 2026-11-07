import { ShaderMaterial, type Texture } from "three";

import { raw } from "./colors";
import { FullscreenPass } from "./FullscreenPass";
import { fullRect, rectVert } from "./rect";

export interface HeroCompositeInputs {
  contours: Texture;
  head: Texture;
  cursorEffect: Texture;
}

/**
 * Final hero image:
 *   paper + 1px contour outlines
 *   → under the fluid mask: banded "cursor paper" (two greys) with its own outline
 *   → lit head on top
 *   → uFilter 0 → 1 (scroll-out): fades to a grey, contrasty, olive-tinted
 *     head on near-black (grayscale → contrast 0.8 → ×0.75 → hard light #50593F).
 * Drawn into uRect so the hero can shrink into the marquee card on scroll.
 * Colours are the reference site's traced constants.
 */
export class HeroCompositePass extends FullscreenPass {
  constructor(inputs: HeroCompositeInputs) {
    super(
      new ShaderMaterial({
        uniforms: {
          tContours: { value: inputs.contours },
          tHead: { value: inputs.head },
          tCursorEffect: { value: inputs.cursorEffect },
          uRect: { value: fullRect() },
          uReveal: { value: 1 },
          uFilter: { value: 0 },
          uFilterTint: { value: raw("#50593f") },
          uCursorIntensity: { value: 1 },
          uEdgeOffset: { value: 0.000005 },
          uPaper: { value: raw("#f8f8f3") },
          uLine: { value: raw("#cbcbb9") },
          uCursorPaper: { value: raw("#e8e8df") },
          uCursorPaperAlt: { value: raw("#cfd2c5") },
          uCursorLine: { value: raw("#e8e8df") }
        },
        vertexShader: rectVert,
        fragmentShader: /* glsl */ `
          uniform sampler2D tContours, tHead, tCursorEffect;
          uniform float uReveal, uCursorIntensity, uEdgeOffset, uFilter;
          uniform vec3 uPaper, uLine, uCursorPaper, uCursorPaperAlt, uCursorLine, uFilterTint;
          varying vec2 vUv;

          vec3 grayscale(vec3 c) { return vec3(dot(c, vec3(0.299, 0.587, 0.114))); }
          float overlay(float base, float top) {
            return base < 0.5 ? 2.0 * base * top : 1.0 - 2.0 * (1.0 - base) * (1.0 - top);
          }
          // Hard light = overlay with the layers swapped.
          vec3 hardLight(vec3 base, vec3 top) {
            return vec3(overlay(top.r, base.r), overlay(top.g, base.g), overlay(top.b, base.b));
          }

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
            vec3 color = mix(paper, head.rgb, head.a);

            vec3 filtered = grayscale(mix(head.rgb, vec3(0.05), 1.0 - head.a));
            filtered = ((filtered - 0.5) * 0.8 + 0.5) * 0.75;
            filtered = hardLight(filtered, uFilterTint);
            color = mix(color, filtered, uFilter);

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
