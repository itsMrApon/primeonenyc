import { ScrollTrigger } from "gsap/ScrollTrigger";
import type { Ref } from "vue";

import type { HelmetScrollState } from "~/webgl/scenes/HelmetScrollScene";

interface Point {
  x: number;
  y: number;
}
interface Box extends Point {
  w: number;
  h: number;
}

const cubic = (a: Point, b: Point, c: Point, d: Point, t: number): Point => {
  const p = 1 - t;
  return {
    x: p * p * p * a.x + 3 * p * p * t * b.x + 3 * p * t * t * c.x + t * t * t * d.x,
    y: p * p * p * a.y + 3 * p * p * t * b.y + 3 * p * t * t * c.y + t * t * t * d.y
  };
};

/**
 * Reference "heroflip" (On Track): the GL helmet flies between three markers.
 * Centres/sizes of pos1 → pos2 → pos3 are measured relative to the track at
 * init and on resize (debounced 200 ms), joined by two cubic beziers with the
 * reference's control points. Progress: track "top top" → "bottom 25%", scrubbed
 * 1:1. Side = interpolated width. The scene renders while the track is within
 * half a viewport of the screen. Markers: [data-heroflip="pos1|pos2|pos3"] inside the track.
 */
export function useHelmetFlip(
  track: Ref<HTMLElement | null>,
  getExperience: () => { setHelmetScroll: (s: HelmetScrollState) => void } | null | undefined
) {
  let box: Box[] = [];
  let ctrl: Point[] = [];
  let progress = 0;
  let rendering = true;
  const triggers: ScrollTrigger[] = [];
  let resizeTimer = 0;

  function measure() {
    const el = track.value;
    if (!el) return;
    const t = el.getBoundingClientRect();
    const markers = [1, 2, 3].map((i) => el.querySelector<HTMLElement>(`[data-heroflip="pos${i}"]`));
    if (markers.some((m) => !m)) return;
    box = markers.map((m) => {
      const r = m!.getBoundingClientRect();
      return { x: r.left - t.left + r.width / 2, y: r.top - t.top + r.height / 2, w: r.width, h: r.height };
    });
    const [a, b, c] = box;
    ctrl = [
      { x: a.x, y: a.y + (b.y - a.y) * 0.4 },
      { x: b.x, y: b.y - (b.y - a.y) * 0.3 },
      { x: b.x, y: b.y + (c.y - b.y) * 0.3 },
      { x: b.x + (c.x - b.x) * 0.6, y: c.y - (c.y - b.y) * 0.2 }
    ];
  }

  function push() {
    if (box.length < 3) return;
    const [a, b, c] = box;
    let at: Point;
    let size: number;
    if (progress <= 0.5) {
      const k = progress * 2;
      at = cubic(a, ctrl[0], ctrl[1], b, k);
      size = a.w + (b.w - a.w) * k;
    } else {
      const k = (progress - 0.5) * 2;
      at = cubic(b, ctrl[2], ctrl[3], c, k);
      size = b.w + (c.w - b.w) * k;
    }
    // Track starts at the page top, so track-relative y is page y.
    const top = (track.value?.getBoundingClientRect().top ?? 0) + window.scrollY;
    getExperience()?.setHelmetScroll({ x: at.x, y: at.y + top, size, progress, rendering });
  }

  const onResize = () => {
    clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => {
      measure();
      push();
    }, 200);
  };

  onMounted(async () => {
    await document.fonts.ready;
    if (!track.value) return;
    measure();
    triggers.push(
      ScrollTrigger.create({
        trigger: track.value,
        start: "top top",
        end: "bottom 25%",
        scrub: true,
        invalidateOnRefresh: true,
        onRefresh: (self) => {
          progress = self.progress;
          push();
        },
        onUpdate: (self) => {
          progress = self.progress;
          push();
        }
      }),
      ScrollTrigger.create({
        trigger: track.value,
        start: () => `top-=${window.innerHeight / 2} bottom`,
        end: () => `bottom+=${window.innerHeight / 2} top`,
        invalidateOnRefresh: true,
        onToggle: (self) => {
          rendering = self.isActive;
          push();
        },
        onRefresh: (self) => {
          rendering = self.isActive;
          push();
        }
      })
    );
    window.addEventListener("resize", onResize);
    // The experience may come up after this page mounted.
    const wait = () => (getExperience() ? push() : requestAnimationFrame(wait));
    wait();
  });

  onBeforeUnmount(() => {
    clearTimeout(resizeTimer);
    window.removeEventListener("resize", onResize);
    triggers.forEach((t) => t.kill());
  });
}
