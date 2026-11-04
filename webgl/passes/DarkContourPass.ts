import { ShaderMaterial, type Texture } from "three";

import { raw } from "./colors";
import { FullscreenPass } from "./FullscreenPass";
import { fullRect, rectVert } from "./rect";

/**
 * Dark green page behind the hero card: #282C20 with the same 1px contour
 * isolines (from the shared contour field) drawn in #363B25.
 */
export class DarkContourPass extends FullscreenPass {
  constructor(contours: Texture) {
    super(
      new ShaderMaterial({
        uniforms: {
          tContours: { value: contours },
          uRect: { value: fullRect() },
          uEdgeOffset: { value: 0.000005 },
          uPaper: { value: raw("#282c20") },
          uLine: { value: raw("#363b25") }
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
