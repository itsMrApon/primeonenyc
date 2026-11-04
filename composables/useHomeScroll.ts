import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";

gsap.registerPlugin(ScrollTrigger);

/**
 * Homepage scroll choreography:
 * - Lenis smooth scroll (optional)
 * - Horizontal photo track pin + scrub translateX
 * - Section reveals
 * - Nav theme (lime hero → dark body)
 * - WebGL hero visibility
 */
export function useHomeScroll(options: {
  getExperience?: () => { setHeroVisible: (v: boolean) => void } | null | undefined;
}) {
  let lenis: Lenis | null = null;
  let rafId = 0;
  const triggers: ScrollTrigger[] = [];

  onMounted(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (!reduceMotion) {
      lenis = new Lenis({
        duration: 1.1,
        smoothWheel: true
      });
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

    // Horizontal track
    const pin = document.querySelector<HTMLElement>("[data-horizontal-pin]");
    const track = document.querySelector<HTMLElement>("[data-horizontal-track]");
    if (pin && track) {
      const getScroll = () => Math.max(0, track.scrollWidth - window.innerWidth);

      const tween = gsap.to(track, {
        x: () => -getScroll(),
        ease: "none",
        scrollTrigger: {
          trigger: pin,
          start: "top top",
          end: () => `+=${getScroll()}`,
          pin: true,
          scrub: 0.65,
          invalidateOnRefresh: true,
          anticipatePin: 1
        }
      });
      if (tween.scrollTrigger) triggers.push(tween.scrollTrigger);
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

    // Nav theme + WebGL visibility from hero
    const hero = document.querySelector<HTMLElement>("[data-hero]");
    const nav = document.querySelector<HTMLElement>("[data-app-nav]");
    if (hero && nav) {
      const st = ScrollTrigger.create({
        trigger: hero,
        start: "top top",
        end: "bottom top+=80",
          onUpdate: (self) => {
          const lime = self.progress < 0.92;
          nav.dataset.navTheme = lime ? "dark" : "light";
          options.getExperience?.()?.setHeroVisible(lime);
        },
        onLeave: () => {
          nav.dataset.navTheme = "light";
          options.getExperience?.()?.setHeroVisible(false);
        },
        onEnterBack: () => {
          nav.dataset.navTheme = "dark";
          options.getExperience?.()?.setHeroVisible(true);
        }
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
