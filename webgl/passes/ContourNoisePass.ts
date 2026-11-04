import { ShaderMaterial, Vector2 } from "three";

import { simplex3d } from "../shaders/simplex3d";
import { FullscreenPass } from "./FullscreenPass";

/**
 * Banded, domain-warped simplex field used for the topographic contour lines.
 * r = band (0/1), g = position inside the band (0..1).
 * Constants are the reference site's traced values (see .reanimate/hero/spec.md).
 */
export class ContourNoisePass extends FullscreenPass {
  constructor() {
    super(
      new ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uAspect: { value: 1 },
          uReveal: { value: 1 },
          uPointer: { value: new Vector2() },
          uPointerPace: { value: 0 },
          uScale: { value: 1 },
          uSpeed: { value: 0.1 },
          uWarpScale: { value: 1 },
          uWarpAmount: { value: 0.5 },
          uBands: { value: 3 },
          uPointerAmount: { value: 0.15 },
          uPointerRadius: { value: 3 },
          uPointerFloor: { value: -0.75 },
          uRevealSize: { value: 25 }
        },
        vertexShader: /* glsl */ `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = vec4(position.xy, 0.0, 1.0);
          }
        `,
        fragmentShader: /* glsl */ `
          ${simplex3d}

          uniform float uTime, uAspect, uReveal, uPointerPace;
          uniform float uScale, uSpeed, uWarpScale, uWarpAmount, uBands;
          uniform float uPointerAmount, uPointerRadius, uPointerFloor, uRevealSize;
          uniform vec2 uPointer;
          varying vec2 vUv;

          // Reveal zoom: at uReveal = 0 the field is stretched far off-screen.
          vec2 revealUv(vec2 uv) {
            float hidden = 1.0 - uReveal;
            uv.x *= uAspect;
            uv.y = (uv.y + uRevealSize * (4.0 / 3.0) * hidden) / (1.0 + uRevealSize * hidden);
            return uv;
          }

          void main() {
            vec2 p = revealUv(vUv);

            vec2 pointer = (uPointer * 0.5 + 0.5) * vec2(uAspect, 1.0);
            float push = clamp((1.0 - distance(pointer, p) * uPointerRadius) * uPointerPace, uPointerFloor, 1.0);

            float t = uTime * uSpeed;
            float warp = 0.5 + 0.5 * snoise(vec3(p * uWarpScale, t * 0.1));
            vec2 q = (p + push * uPointerAmount + warp * uWarpAmount) * uScale;
            float n = 0.5 + 0.5 * snoise(vec3(q, t));

            float inBand = fract(n * uBands);
            gl_FragColor = vec4(step(0.5, inBand), inBand, 0.0, 1.0);
          }
        `,
        depthTest: false,
        depthWrite: false
      })
    );
  }
}
