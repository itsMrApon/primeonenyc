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
  setPageLineFade: (t: number) => void;
}

export function useHomeScroll(options: { getExperience?: () => HeroScrollTarget | null | undefined }) {
  let lenis: Lenis | null = null;
  let rafId = 0;
  const triggers: ScrollTrigger[] = [];
  let onImageLoad: ((event: Event) => void) | null = null;

  onMounted(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (!reduceMotion) {
      // Reference options (lando-by-OFF+BRAND): lerp-based smoothing, not duration.
      lenis = new Lenis({
        lerp: 0.1,
        smoothWheel: true,
        syncTouch: true,
        // Reference uses 1.25; deliberately 1 so the page tracks the finger 1:1 on phones
        // (touch only — wheel/trackpad are unaffected).
        touchMultiplier: 1,
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
        // Only inside the hero's own range: refreshes (e.g. lazy images) re-run this
        // anywhere on the page and must not override later sections' nav state.
        if (scrolled <= vh * 2.5) {
          nav.dataset.navTheme = scrolled > vh * 0.05 ? "light" : "dark";
          // Reference: the nav LN4 hides while the marquee card is on screen.
          nav.dataset.navLogo = scrolled > vh * 0.3 && scrolled < vh * 2.05 ? "hidden" : "shown"; // back by ~1900 at 900 high
        }
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
    } else if (nav) {
      // Pages without the home hero (reference, every page): brand + buttons scale
      // 1.2 → 1 over the first 10vh (scrubbed, power2.out) and the LN4 logo hides
      // as soon as the page leaves the top.
      const update = () => {
        const y = window.scrollY;
        const k = Math.min(y / (window.innerHeight * 0.1), 1);
        nav.style.setProperty("--nav-scale", String(1 - (1 / 6) * (1 - (1 - k) * (1 - k))));
        nav.dataset.navLogo = y > 0 ? "hidden" : "shown";
      };
      triggers.push(ScrollTrigger.create({ start: 0, end: "max", onUpdate: update, onRefresh: update }));
    }

    // Sections that only declare a nav ink (reference [data-nav-theme-target]):
    // the theme applies while the element spans the nav's centre line.
    // With nested markers (e.g. footer section dark, its panel light) the most
    // recently started active one wins; re-evaluated on every enter/leave.
    const themeTargets: { st: ScrollTrigger; value: string }[] = [];
    const applyTheme = () => {
      const active = themeTargets.filter((t) => t.st.isActive).sort((a, b) => b.st.start - a.st.start)[0];
      if (active && nav) nav.dataset.navTheme = active.value;
    };
    document.querySelectorAll<HTMLElement>("[data-nav-theme-target]").forEach((el) => {
      const value = el.dataset.navThemeTarget;
      if (!value) return;
      // onRefresh too: a marker already active at load (page-top section) never toggles.
      const st = ScrollTrigger.create({
        trigger: el,
        start: "top 42px",
        end: "bottom 42px",
        onToggle: applyTheme,
        onRefresh: applyTheme
      });
      themeTargets.push({ st, value });
      triggers.push(st);
    });

    // Reference partners section: contour lines fade into the page from "top bottom" to "top top".
    const linesFade = document.querySelector<HTMLElement>("[data-gl-lines-fade]");
    if (linesFade) {
      const fade = (p: number) => options.getExperience?.()?.setPageLineFade(p);
      triggers.push(
        ScrollTrigger.create({
          trigger: linesFade,
          start: "top bottom",
          end: "top top",
          onUpdate: (self) => fade(self.progress),
          onRefresh: (self) => fade(self.progress)
        })
      );
    }

    // Lazy images change section heights after first layout; keep trigger positions current.
    let refreshTimer = 0;
    onImageLoad = (event: Event) => {
      if ((event.target as HTMLElement)?.tagName !== "IMG") return;
      clearTimeout(refreshTimer);
      refreshTimer = window.setTimeout(() => ScrollTrigger.refresh(), 150);
    };
    document.addEventListener("load", onImageLoad, true);

    ScrollTrigger.refresh();
  });

  onBeforeUnmount(() => {
    if (onImageLoad) document.removeEventListener("load", onImageLoad, true);
    cancelAnimationFrame(rafId);
    triggers.forEach((t) => t.kill());
    ScrollTrigger.getAll().forEach((t) => t.kill());
    lenis?.destroy();
    lenis = null;
  });
}
