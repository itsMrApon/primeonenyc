/** Mobile layout breakpoint (matches the `max-width: 767px` blocks). */
export const MOBILE_MAX = 767;

export const isMobileLayout = (vw = window.innerWidth) => vw <= MOBILE_MAX;

/** px per fluid unit — must match `--u` in assets/css/tokens.css. */
export function fluidUnit(vw = window.innerWidth) {
  if (vw <= MOBILE_MAX) return Math.min(Math.max(vw, 320), 479) / 36;
  if (vw <= 991) return vw / 108;
  return Math.min(Math.max(vw, 992), 1920) / 108;
}
