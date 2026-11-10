import gsap from "gsap";
import { MotionPathPlugin } from "gsap/MotionPathPlugin";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type { Ref } from "vue";

/**
 * /off-track hero photo flight (reference bundle z_). The photo box `img` lives in `track`
 * (absolute, centred on its x/y) and flies along a two-segment cubic path through the
 * centres of [data-heroflip="pos1" | "pos2" | "pos3"], scrubbed over the track:
 * "top top" → "bottom center" (≤991: "20% top" → "bottom 80%"), linear, 1.5 s of timeline.
 *   - size: pos1 → pos2 over the first half, pos2 → pos3 over the second;
 *   - photo: layer floor(progress × n) shows, the others hide (one photo per 1/n of the flight).
 * Rebuilt 200 ms after a resize.
 */
export function useHeroImageFlip(track: Ref<HTMLElement | null>, img: Ref<HTMLElement | null>) {
  let tl: gsap.core.Timeline | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;

  function points() {
    const t = track.value!.getBoundingClientRect();
    return ["pos1", "pos2", "pos3"].map((k) => {
      const r = track.value!.querySelector(`[data-heroflip="${k}"]`)!.getBoundingClientRect();
      return { x: r.left - t.left + r.width / 2, y: r.top - t.top + r.height / 2, w: r.width, h: r.height };
    });
  }

  function build() {
    if (!track.value || !img.value) return;
    tl?.scrollTrigger?.kill();
    tl?.kill();
    const el = img.value;
    const layers = [...el.querySelectorAll<HTMLElement>("[data-layer]")];
    const [a, b, c] = points();
    gsap.set(el, { x: a.x, y: a.y, width: a.w, height: a.h });
    const c1 = { x: a.x, y: a.y + (b.y - a.y) * 0.8 };
    const c2 = { x: b.x, y: b.y - Math.min(800, (b.y - a.y) * 0.3) };
    const c3 = { x: b.x, y: b.y + Math.min(80, (c.y - b.y) * 0.3) };
    const c4 = { x: b.x + (c.x - b.x) * 0.6, y: c.y - (c.y - b.y) * 0.2 };
    const path = `M${a.x},${a.y} C${c1.x},${c1.y} ${c2.x},${c2.y} ${b.x},${b.y} C${c3.x},${c3.y} ${c4.x},${c4.y} ${c.x},${c.y}`;
    const small = window.innerWidth <= 991;
    tl = gsap.timeline({
      scrollTrigger: {
        trigger: track.value,
        start: small ? "20% top" : "top top",
        end: small ? "bottom 80%" : "bottom center",
        scrub: true,
        invalidateOnRefresh: true
      }
    });
    tl.to(el, {
      duration: 1.5,
      motionPath: { path, autoRotate: false },
      ease: "none",
      onUpdate() {
        const p = this.progress();
        const shown = Math.min(Math.floor(p * layers.length), layers.length - 1);
        layers.forEach((l, i) => (l.style.opacity = i === shown ? "1" : "0"));
        const [from, to, k] = p <= 0.5 ? [a, b, p * 2] : [b, c, (p - 0.5) * 2];
        el.style.width = `${from.w + (to.w - from.w) * k}px`;
        el.style.height = `${from.h + (to.h - from.h) * k}px`;
      }
    });
  }

  const onResize = () => {
    clearTimeout(timer);
    timer = setTimeout(build, 200);
  };

  onMounted(async () => {
    gsap.registerPlugin(ScrollTrigger, MotionPathPlugin);
    if (img.value) gsap.set(img.value, { transformOrigin: "50% 50%", xPercent: -50, yPercent: -50 });
    await document.fonts.ready;
    await nextTick();
    build();
    window.addEventListener("resize", onResize);
  });

  onBeforeUnmount(() => {
    clearTimeout(timer);
    window.removeEventListener("resize", onResize);
    tl?.scrollTrigger?.kill();
    tl?.kill();
  });
}
