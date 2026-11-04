import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";

gsap.registerPlugin(ScrollTrigger);

/**
 * Homepage scroll choreography:
 * - Lenis smooth scroll (optional)
 * - Section reveals
 * - Hero scroll-out → WebGL (card shrink, filter, camera), nav theme, next-race card
 * - WebGL keeps drawing the dark contour page behind later transparent sections
 */
export interface HeroScrollTarget {
  setHeroScroll: (progress: number, offset: number) => void;
  setPageTint: (t: number) => void;
}

export function useHomeScroll(options: { getExperience?: () => HeroScrollTarget | null | undefined }) {
  let lenis: Lenis | null = null;
  let rafId = 0;
  const triggers: ScrollTrigger[] = [];

  onMounted(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (!reduceMotion) {
      // Reference options (lando-by-OFF+BRAND): lerp-based smoothing, not duration.
      lenis = new Lenis({
        lerp: 0.1,
        smoothWheel: true,
        syncTouch: true,
        touchMultiplier: 1.25,
        autoResize: true
      });
      (window as unknown as { lenis?: Lenis }).lenis = lenis;
      lenis.on("scroll", ScrollTrigger.update);
      const raf = (time: number) => {
        lenis?.raf(time);
        rafId = requestAnimationFrame(raf);
      };
      rafId = requestAnimationFrame(raf);
      ScrollTrigger.scrollerProxy(document.documentElement, {
        scrollTop(value) {
          if (arguments.length && typeof value === "number") {
            lenis?.scrollTo(value, { immediate: true });
          }
          return window.scrollY || document.documentElement.scrollTop;
        },
        getBoundingClientRect() {
          return {
            top: 0,
            left: 0,
            width: window.innerWidth,
            height: window.innerHeight
          };
        }
      });
    }

    // Reveals
    document.querySelectorAll<HTMLElement>("[data-reveal]").forEach((el) => {
      const st = ScrollTrigger.create({
        trigger: el,
        start: "top 85%",
        onEnter: () => el.classList.add("is-in"),
        onEnterBack: () => el.classList.add("is-in")
      });
      triggers.push(st);
    });

    // Hero track (200vh, sticky 100vh): reference scroll-out choreography.
    const hero = document.querySelector<HTMLElement>("[data-hero]");
    const nav = document.querySelector<HTMLElement>("[data-app-nav]");
    const card = hero?.querySelector<HTMLElement>(".home-hero-next-race-w");
    if (hero && nav) {
      const update = () => {
        const vh = window.innerHeight;
        const scrolled = Math.max(0, -hero.getBoundingClientRect().top);
        options.getExperience?.()?.setHeroScroll(scrolled / vh, scrolled - vh);
        nav.dataset.navTheme = scrolled > vh * 0.05 ? "light" : "dark";
        // Reference: the nav LN4 hides while the marquee card is on screen.
        nav.dataset.navLogo = scrolled > vh * 0.3 && scrolled < vh * 2.05 ? "hidden" : "shown"; // back by ~1900 at 900 high
        card?.classList.toggle("is-hidden", scrolled > 0);
        // Reference: nav compacts 60 → 50 px (scale 0.833) over the first ~0.08vh, ease-out.
        const k = Math.min(scrolled / (vh * 0.08), 1);
        nav.style.setProperty("--nav-scale", String(1 - (1 / 6) * (1 - (1 - k) * (1 - k))));
      };
      const st = ScrollTrigger.create({
        trigger: hero,
        start: "top top",
        // half a viewport past the track so the nav logo's return (≈2.05vh) is applied
        end: () => `bottom+=${window.innerHeight * 0.5} top`,
        invalidateOnRefresh: true,
        onUpdate: update,
        onRefresh: update
      });
      triggers.push(st);
    }

    ScrollTrigger.refresh();
  });

  onBeforeUnmount(() => {
    cancelAnimationFrame(rafId);
    triggers.forEach((t) => t.kill());
    ScrollTrigger.getAll().forEach((t) => t.kill());
    lenis?.destroy();
    lenis = null;
  });
}
