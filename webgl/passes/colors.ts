import { Color } from "three";

/**
 * The reference feeds hex bytes to its shaders as *linear* values and then
 * converts to sRGB on output (#f8f8f3 renders as #fcfcfa). Keep that:
 * setRGB with no colour space = raw working-space numbers.
 */
export const raw = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return new Color().setRGB(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
};
