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

/**
 * Final hero image: paper background with contour outlines, the lit head on
 * top, and (step 3) the helmet revealed through the cursor/fluid mask.
 * Colours are the reference site's traced constants.
 */
export class HeroCompositePass extends FullscreenPass {
  constructor(contours: Texture, head: Texture) {
    super(
      new ShaderMaterial({
        uniforms: {
          tContours: { value: contours },
          tHead: { value: head },
          uReveal: { value: 1 },
          uEdgeOffset: { value: 0.000005 },
          uPaper: { value: raw("#f8f8f3") },
          uLine: { value: raw("#cbcbb9") }
        },
        vertexShader: /* glsl */ `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = vec4(position.xy, 0.0, 1.0);
          }
        `,
        fragmentShader: /* glsl */ `
          uniform sampler2D tContours, tHead;
          uniform float uReveal, uEdgeOffset;
          uniform vec3 uPaper, uLine;
          varying vec2 vUv;

          // 1 where the band value changes within a hair's offset: a 1px isoline.
          float contourEdge(vec2 uv) {
            float c = texture2D(tContours, uv).r;
            vec2 o = vec2(uEdgeOffset, 0.0);
            float d = abs(texture2D(tContours, uv + o.xy).r - c)
                    + abs(texture2D(tContours, uv - o.xy).r - c)
                    + abs(texture2D(tContours, uv + o.yx).r - c)
                    + abs(texture2D(tContours, uv - o.yx).r - c);
            return d > 0.0 ? 1.0 : 0.0;
          }

          void main() {
            vec3 paper = mix(uPaper, uLine, contourEdge(vUv) * uReveal);
            vec4 head = texture2D(tHead, vUv);
            vec3 color = mix(paper, head.rgb, head.a);
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
