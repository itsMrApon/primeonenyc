import { Vector4 } from "three";

/**
 * Full-screen-quad vertex shader placed into a screen rectangle.
 * uRect = (scaleX, scaleY, offsetX, offsetY) in NDC; (1, 1, 0, 0) = whole screen.
 */
export const rectVert = /* glsl */ `
  uniform vec4 uRect;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy * uRect.xy + uRect.zw, 0.0, 1.0);
  }
`;

export const fullRect = () => new Vector4(1, 1, 0, 0);

/** A w×h px rectangle centred horizontally, its centre `offsetY` px above screen centre. */
export function setRect(rect: Vector4, w: number, h: number, offsetY: number, screenW: number, screenH: number) {
  rect.set(w / screenW, h / screenH, 0, (2 * offsetY) / screenH);
}
