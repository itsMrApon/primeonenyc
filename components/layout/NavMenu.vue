<script setup lang="ts">
/**
 * Full-screen nav menu (reference [data-nav-m] .nav-menu-w, bundle kL).
 *   - Open (paused timeline, played forward; closing reverses it at ×1.5):
 *       0     panel clip ellipse(120% 0% at 50% 0%) → (120% 100% at 50% 20%), 0.8 s power3.out
 *       0.15  photos same clip + y 25 → 0, 0.8 s power3.out, 0.06 s stagger (data-nav-img order)
 *       0.2   laurel helmet Rive input scroll 0 → 1000 over 1.7 s
 *       0.35  links clip ellipse(30% 0% at 50% 0%) → open + y 20 → 0, 0.6 s back.out(1.2), 0.08 s stagger
 *       0.4   current-page squiggle draws in (stroke dash), 0.6 s power2.inOut
 *       0.5   eyebrow + bottom links rise from inset(0 100% 0 0) / y 15, 0.7 s back.out(1.1), 0.04 s;
 *             their lime bars shrink from 0.7 s (0.6 s power2.inOut, 0.05 s)
 *       0.6   contour background fades to 0.12
 *   - Photos: duotone (saturation / plus-lighter / tint blends) with a colour copy on top at
 *     opacity 0; the current page's colour copy sits at 0.5, a hovered link's goes to 1.
 *   - Photo columns drift ∓(pointerY / vh − 0.5)·12u (2 s power2.out) while open.
 *   - Links / text links: chars slide up on hover (text-shadow copy one line below).
 * ≤991 px: photos hidden, links centred; ≤479 px: 3.7u links, wrapped socials.
 */
import gsap from "gsap";

const props = defineProps<{ open: boolean }>();
const emit = defineEmits<{ close: [] }>();

const content = useHomeContent();
const nav = computed(() => content.nav);
const route = useRoute();

/** Photo per link (data-nav-img N ↔ link N − 1); 4 is in the markup but hidden; 5 has no link. */
const IMAGES = {
  1: "/images/social/primeone-office-booth.webp",
  2: "/images/social/primeone-delowar-kurta.webp",
  3: "/images/social/primeone-duo-sunglasses.webp",
  5: "/images/social/primeone-family-autumn.webp"
};
const COLUMNS = [
  [1, 3],
  [2, 5]
] as const;
/** Reference squiggle stroke per link (Home's is drawn heavier). */
const STROKES = [6, 3.28, 3.28, 3.28];
const SQUIGGLE =
  "M0 2h73.539c5.858 0 11.47 2.35 15.58 6.525l8.565 8.7a21.863 21.863 0 0 0 15.58 6.525h72.678c6.045 0 11.82-2.503 15.954-6.914l6.485-6.922A21.865 21.865 0 0 1 224.336 3h76.752a21.864 21.864 0 0 1 16.806 7.88l4.362 5.24A21.864 21.864 0 0 0 339.063 24H412";

const currentIndex = computed(() => nav.value.links.findIndex((l) => l.href === route.path));

const root = ref<HTMLElement | null>(null);
const helmetScroll = ref(0);
let tl: gsap.core.Timeline | null = null;
let hovered = -1;
let hovering = false;

const chars = (s: string) => s.split("");
const q = <T extends Element>(sel: string) => [...(root.value?.querySelectorAll<T>(sel) ?? [])];

function tops() {
  const map: Record<number, HTMLElement> = {};
  q<HTMLElement>("[data-nav-img]").forEach((w) => {
    const n = Number(w.dataset.navImg) - 1;
    const top = w.querySelector<HTMLElement>(".menu-img-top");
    if (top) map[n] = top;
  });
  return map;
}

function restTops() {
  const map = tops();
  Object.entries(map).forEach(([n, el]) =>
    gsap.to(el, { opacity: Number(n) === currentIndex.value ? 0.5 : 0, duration: 0.2, ease: "power2.inOut", overwrite: "auto" })
  );
}

function linkEnter(i: number) {
  slide(i, true);
  const map = tops();
  const own = map[i];
  if (!own) return;
  Object.entries(map).forEach(([n, el]) => {
    if (Number(n) !== i) gsap.to(el, { opacity: 0, duration: 0.3, overwrite: "auto" });
  });
  hovered = i;
  hovering = true;
  gsap.to(own, { opacity: 1, duration: 0.2, overwrite: "auto", ease: "power2.inOut" });
}

function linkLeave(i: number) {
  slide(i, false);
  hovering = false;
  setTimeout(() => {
    if (!hovering && hovered === i) {
      restTops();
      hovered = -1;
    }
  }, 50);
}

function slide(i: number | string, on: boolean) {
  const cs = q<HTMLElement>(`[data-hover="${i}"] .char`);
  gsap.to(cs, { yPercent: on ? -100 : 0, duration: 0.6, stagger: 0.02, ease: "power3.out", overwrite: true });
}

function onPointer(e: MouseEvent) {
  if (!props.open) return;
  const cols = q<HTMLElement>(".nav-menu-images-col");
  if (cols.length < 2) return;
  const u = fluidUnit();
  const d = (e.clientY / window.innerHeight - 0.5) * 2 * 6 * u;
  gsap.to(cols[0], { y: -d, duration: 2, ease: "power2.out", overwrite: "auto" });
  gsap.to(cols[1], { y: d, duration: 2, ease: "power2.out", overwrite: "auto" });
}

type LenisLike = { stop: () => void; start: () => void };
const lenis = () => (window as unknown as { lenis?: LenisLike }).lenis;

function build() {
  const menu = root.value;
  if (!menu) return;
  const imgs = q<HTMLElement>("[data-nav-img]").sort((a, b) => Number(a.dataset.navImg) - Number(b.dataset.navImg));
  const links = q<HTMLElement>(".nav-menu-link-w");
  const highs = q<HTMLElement>("[data-nav-link-highlight]");
  const bars = q<HTMLElement>("[data-nav-link-highlight] > .high-line-reveal");
  const paths = q<SVGPathElement>(".nav-menu-link-current-svg path");
  const bg = menu.querySelector(".nav-menu-bg");
  const scroll = { value: 0 };

  gsap.set(menu, { clipPath: "ellipse(120% 0% at 50% 0%)", display: "none" });
  gsap.set(imgs, { clipPath: "ellipse(120% 0% at 50% 0%)", y: 25 });
  gsap.set(links, { clipPath: "ellipse(30% 0% at 50% 0%)", y: 20 });
  gsap.set(bg, { autoAlpha: 0 });
  gsap.set(highs, { clipPath: "inset(0 100% 0 0)", y: 15 });
  gsap.set(bars, { scaleX: 1 });
  paths.forEach((p) => {
    const len = p.getTotalLength();
    gsap.set(p, { strokeDasharray: len, strokeDashoffset: len });
  });
  restTops();

  tl = gsap.timeline({
    paused: true,
    onStart: () => {
      lenis()?.stop();
      gsap.set(menu, { display: "flex" });
    },
    onReverseComplete: () => {
      lenis()?.start();
      gsap.set(menu, { display: "none" });
      gsap.to(q(".nav-menu-images-col"), { y: 0, duration: 0.3, ease: "power2.inOut" });
    }
  });
  tl.to(menu, { clipPath: "ellipse(120% 100% at 50% 20%)", duration: 0.8, ease: "power3.out" }, 0);
  tl.to(imgs, { clipPath: "ellipse(120% 100% at 50% 20%)", y: 0, duration: 0.8, stagger: 0.06, ease: "power3.out" }, 0.15);
  tl.to(links, { clipPath: "ellipse(120% 100% at 50% 20%)", y: 0, duration: 0.6, stagger: 0.08, ease: "back.out(1.2)" }, 0.35);
  tl.to(scroll, { value: 1000, duration: 1.7, onUpdate: () => (helmetScroll.value = Math.round(scroll.value)) }, 0.2);
  tl.to(bg, { autoAlpha: 0.12, duration: 0.6 }, 0.6);
  tl.to(paths, { strokeDashoffset: 0, duration: 0.6, stagger: 0.05, ease: "power2.inOut" }, 0.4);
  tl.to(highs, { clipPath: "inset(0 0% 0 0)", y: 0, duration: 0.7, stagger: 0.04, ease: "back.out(1.1)" }, 0.5);
  tl.to(bars, { scaleX: 0, duration: 0.6, stagger: 0.05, ease: "power2.inOut" }, 0.7);
}

watch(
  () => props.open,
  (v) => {
    if (!tl) return;
    if (v) tl.timeScale(1).play();
    else tl.timeScale(1.5).reverse();
  }
);

onMounted(() => {
  build();
  document.addEventListener("mousemove", onPointer);
});

onBeforeUnmount(() => {
  document.removeEventListener("mousemove", onPointer);
  tl?.kill();
  if (props.open) lenis()?.start();
});
</script>

<template>
  <div id="site-menu" ref="root" class="nav-menu-w">
    <div class="nav-menu-inner">
      <div class="nav-menu-grid">
        <div class="nav-menu-images-w">
          <div class="nav-menu-images-track">
            <div v-for="(col, c) in COLUMNS" :key="c" class="nav-menu-images-col">
              <div v-for="n in col" :key="n" :data-nav-img="n" class="nav-menu-img-w">
                <img :src="IMAGES[n]" alt="" class="menu-img-top" />
                <div class="menu-img-blends-w">
                  <div class="menu-img-blend-1" />
                  <div class="menu-img-blend-2" />
                  <div class="menu-img-blend-3" />
                  <img :src="IMAGES[n]" alt="" class="menu-img-no-blend" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="nav-menu-links-w">
          <div class="nav-menu-spacer" />
          <div class="nav-menu-links-col">
            <div class="nav-menu-links-list">
              <a
                v-for="(link, i) in nav.links"
                :key="link.href"
                :href="link.href"
                class="nav-menu-link-w"
                :class="{ 'is-current': i === currentIndex }"
                :aria-current="i === currentIndex ? 'page' : undefined"
                :data-hover="i"
                @mouseenter="linkEnter(i)"
                @mouseleave="linkLeave(i)"
                @click="emit('close')"
              >
                <span class="text-nav-link" :aria-label="link.label">
                  <span v-for="(ch, k) in chars(link.label)" :key="k" class="char" aria-hidden="true">{{ ch === " " ? " " : ch }}</span>
                </span>
                <span class="nav-menu-link-current-svg" aria-hidden="true">
                  <svg width="100%" height="100%" viewBox="0 0 412 26" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path :d="SQUIGGLE" stroke="currentColor" :stroke-width="STROKES[i]" />
                  </svg>
                </span>
              </a>
            </div>
            <div class="nav-helmet-rive-w">
              <div class="base-helmet-rive">
                <RiveCanvas
                  file="reef"
                  artboard="helmet-reef"
                  state-machine="helmet-reef_scroll"
                  :inputs="{ 'color_green-off-white-2': true, scroll: helmetScroll }"
                />
              </div>
              <div data-nav-link-highlight class="text-eyebrow">
                {{ nav.tagline }}
                <span class="high-line-reveal" />
              </div>
            </div>
          </div>
          <div class="nav-menu-social-w">
            <a
              data-nav-link-highlight
              data-hover="business"
              :href="nav.business.href"
              class="text-link-w"
              @mouseenter="slide('business', true)"
              @mouseleave="slide('business', false)"
            >
              <span class="text-clip-w">
                <span class="btn-text" :aria-label="nav.business.label">
                  <span v-for="(ch, k) in chars(nav.business.label)" :key="k" class="char" aria-hidden="true">{{ ch === " " ? " " : ch }}</span>
                </span>
              </span>
              <span class="high-line-reveal" />
            </a>
            <div class="callout-socials-links-layout">
              <a
                v-for="(s, i) in nav.socials"
                :key="s.href"
                data-nav-link-highlight
                :data-hover="`s${i}`"
                :href="s.href"
                target="_blank"
                rel="noopener"
                class="text-link-w"
                @mouseenter="slide(`s${i}`, true)"
                @mouseleave="slide(`s${i}`, false)"
              >
                <span class="text-clip-w">
                  <span class="btn-text" :aria-label="s.label">
                    <span v-for="(ch, k) in chars(s.label)" :key="k" class="char" aria-hidden="true">{{ ch }}</span>
                  </span>
                </span>
                <span class="high-line-reveal" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="nav-menu-bg" />
  </div>
</template>

<style scoped>
/* Reference metrics in fluid units (1u = the reference rem). */
.nav-menu-w {
  --gap: calc(var(--u) * 1.25);
  position: fixed;
  inset: 0;
  z-index: 25;
  display: none;
  justify-content: center;
  align-items: center;
  width: 100vw;
  height: 100vh;
  overflow: clip;
  background-color: #282c20;
  color: #f4f4ed;
  pointer-events: auto;
}

.nav-menu-inner {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 100%;
  max-height: calc(var(--u) * 80);
  margin-block: auto;
  padding: calc(var(--u) * 2.5) calc(var(--u) * 1.25) calc(var(--u) * 2);
}

.nav-menu-grid {
  display: flex;
  justify-content: space-between;
  gap: var(--gap);
  width: 100%;
  height: 100%;
  padding: 0 calc(var(--u) * 8) 0 calc(var(--u) * 2.25);
}

.nav-menu-images-w {
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: flex-start;
  height: calc(100vh - var(--gap) * 2);
  max-height: 100%;
}

.nav-menu-images-track {
  display: flex;
  flex: none;
  justify-content: flex-start;
  align-items: center;
  gap: calc(var(--gap) * 3);
  height: 100%;
  max-height: 100%;
}

.nav-menu-images-col {
  display: flex;
  flex: none;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: calc(var(--gap) * 3);
}

.nav-menu-img-w {
  position: relative;
  flex: none;
  width: calc(var(--u) * 23);
  height: calc(var(--u) * 25);
  clip-path: ellipse(120% 100% at 50% 20%);
}

.menu-img-top {
  position: absolute;
  inset: 0;
  z-index: 10;
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0;
}

.menu-img-blends-w {
  position: relative;
  z-index: 5;
  width: 100%;
  height: 100%;
}

.menu-img-blend-1 {
  position: absolute;
  inset: 0;
  background-color: #000;
  mix-blend-mode: saturation;
}

.menu-img-blend-2 {
  position: absolute;
  inset: 0;
  background-color: #282c20;
  mix-blend-mode: plus-lighter;
}

.menu-img-blend-3 {
  position: absolute;
  inset: 0;
  background-color: #343a26;
  opacity: 0.4;
}

.menu-img-no-blend {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.nav-menu-links-w {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  align-items: center;
  text-align: center;
}

.nav-menu-spacer {
  height: calc(var(--u) * 1.25);
}

.nav-menu-links-col {
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: center;
  gap: calc(var(--gap) * 2);
  width: 100%;
}

.nav-menu-links-list {
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: center;
  color: #dde1d2;
}

.nav-menu-link-w {
  position: relative;
  display: inline-block;
  overflow: clip;
  cursor: pointer;
}

.nav-menu-link-w:hover {
  color: #b2c73a;
}

.nav-menu-link-w.is-current {
  color: #b4b8a5;
  pointer-events: none;
  cursor: auto;
}

.text-nav-link {
  display: block;
  font-family: var(--font-mona);
  font-size: calc(var(--u) * 5.25);
  font-variation-settings: "wght" 660, "wdth" 93;
  line-height: 0.94;
  text-transform: uppercase;
  text-shadow: 0 calc(var(--u) * 5.25) currentColor;
  transition: color 0.6s cubic-bezier(0.19, 1, 0.22, 1);
}

.char {
  display: inline-block;
  white-space: pre;
}

.nav-menu-link-current-svg {
  position: absolute;
  inset: 0;
  z-index: 5;
  color: var(--color-lime);
  visibility: hidden;
}

.nav-menu-link-w.is-current .nav-menu-link-current-svg {
  visibility: visible;
}

.nav-menu-link-current-svg svg {
  display: block;
  width: 100%;
  height: 100%; /* the global svg reset sets height: auto */
}

.nav-helmet-rive-w {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: var(--gap);
  color: #b4b8a5;
}

.base-helmet-rive {
  position: relative;
  display: flex;
  width: calc(var(--u) * 6.0625);
  height: calc(var(--u) * 3.1875);
  margin-inline: auto;
}

.text-eyebrow {
  font-family: var(--font-mona);
  font-size: calc(var(--u) * 0.625);
  font-variation-settings: "wght" 700, "wdth" 100;
  line-height: 1;
  letter-spacing: 0;
  text-transform: uppercase;
}

[data-nav-link-highlight] {
  position: relative;
}

.high-line-reveal {
  position: absolute;
  inset: 0;
  z-index: 5;
  background-color: var(--color-lime);
  transform-origin: right center;
}

.nav-menu-social-w {
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: center;
  gap: calc(var(--u) * 2);
}

.callout-socials-links-layout {
  display: flex;
  gap: calc(var(--gap) * 1.5);
}

.text-link-w {
  display: block;
}

.text-clip-w {
  display: block;
  clip-path: polygon(0 -2%, 0 94%, 100% 94%, 100% -2%);
}

.btn-text {
  display: block;
  font-family: var(--font-mona);
  font-size: var(--u);
  font-weight: 800;
  font-variation-settings: "wdth" 86;
  line-height: 1;
  text-transform: uppercase;
  text-shadow: 0 var(--u) currentColor;
}

.nav-menu-bg {
  position: absolute;
  inset: 0;
  z-index: -1;
  background-image: url("/images/nav/blobs-nav.svg");
  background-position: 50%;
  background-repeat: repeat-x;
  background-size: auto 170%;
  opacity: 0.12;
}

@media (max-width: 991px) {
  .text-eyebrow {
    font-size: calc(var(--u) * 0.8);
  }

  .nav-menu-grid {
    padding-inline: 0;
  }

  .nav-menu-links-w {
    margin-inline: auto;
  }

  .nav-menu-images-w {
    display: none;
  }
}

@media (min-width: 480px) and (max-width: 767px) {
  .text-eyebrow {
    font-size: var(--u);
  }
}

@media (max-width: 479px) {
  .nav-menu-w {
    height: 100svh;
  }

  .text-eyebrow {
    font-size: calc(var(--u) * 0.8);
  }

  .text-nav-link {
    font-size: calc(var(--u) * 3.7);
    text-shadow: 0 calc(var(--u) * 3.7) currentColor;
  }

  .base-helmet-rive {
    width: calc(var(--u) * 4.7);
    height: auto;
    aspect-ratio: 6.0625 / 3.1875;
  }

  .callout-socials-links-layout {
    flex-wrap: wrap;
    justify-content: center;
    align-items: flex-start;
    gap: calc(var(--gap) * 0.5) var(--gap);
    max-width: calc(var(--u) * 20);
  }
}
</style>
