import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type { Ref } from "vue";

/**
 * Reference [data-stat-list] row reveal (bundle UZ): when the list's top reaches
 * 90 % of the viewport (once), each [data-stat-item] opens a clip left → right
 * (0.6 s power2.out, 0.05 s apart) and its lime bar (".row-reveal", absolute,
 * origin right) shrinks away from +0.3 s (0.6 s power2.inOut).
 */
export function useStatListReveal(list: Ref<HTMLElement | null>) {
  let tl: gsap.core.Timeline | null = null;

  onMounted(() => {
    gsap.registerPlugin(ScrollTrigger);
    const rows = [...(list.value?.querySelectorAll<HTMLElement>("[data-stat-item]") ?? [])];
    if (!rows.length) return;
    tl = gsap.timeline({ scrollTrigger: { trigger: list.value, start: "top 90%", once: true } });
    rows.forEach((row, i) => {
      const bar = row.querySelector(".row-reveal");
      gsap.set(row, { clipPath: "inset(0 100% 0 0)", autoAlpha: 1 });
      gsap.set(bar, { scaleX: 1, transformOrigin: "right center" });
      tl!.to(row, { clipPath: "inset(0 0% 0 0)", duration: 0.6, ease: "power2.out" }, i * 0.05);
      tl!.to(bar, { scaleX: 0, duration: 0.6, ease: "power2.inOut" }, i * 0.05 + 0.3);
    });
  });

  onBeforeUnmount(() => {
    tl?.scrollTrigger?.kill();
    tl?.kill();
  });
}
