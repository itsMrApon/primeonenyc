<script setup lang="ts">
/**
 * "What's up on socials" (reference `.s.is-callout-socials`), live layout at
 * 1440 px in fluid units (1u = 13.33 px = the reference rem there).
 *   - title: oval reveal at "top 95%" (clip ellipse(20% 0%) → (100% 120%)
 *     at top centre, 1.5 s power2.inOut, 0.15 s stagger; lines rise from −40 %);
 *   - fan of 7 cards at "top 90%": rise from 10u (0.8 s power2.out, stagger
 *     0.5 s from the end), then spread to the fan (1.2 s elastic.out(1, 0.75),
 *     stagger 0.2 s from the centre, overlapping by 0.4 s);
 *   - hover (after the intro): hovered card lifts 2.5u and grows ×1.08, the
 *     others push away from it; 0.5 s elastic.out(1, 0.75), 0.02 s per step;
 *     the hovered card plays the Vimeo loop over its poster;
 *   - intro line + links: highlighter (#3B3C38).
 */
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import type { HomeContent } from "~/composables/useHomeContent";

const props = withDefaults(
  defineProps<{
    /** Defaults to the home copy; /on-track passes its own card images. */
    socials?: HomeContent["socials"];
    /** Reference "dark-mode" variant (/on-track): black page, light text, light nav. */
    dark?: boolean;
  }>(),
  { socials: undefined, dark: false }
);

const content = useHomeContent();
const s = computed(() => props.socials ?? content.socials);

/** Fan layout in units (reference desktop values). */
const FAN = [
  { scale: 0.7756, rotation: -21, x: -30, y: 7.3, z: 1 },
  { scale: 0.8498, rotation: -14, x: -22, y: 4, z: 2 },
  { scale: 0.9346, rotation: -7, x: -11, y: 1.3, z: 3 },
  { scale: 1, rotation: 0, x: 0, y: 0, z: 10 },
  { scale: 0.9346, rotation: 7, x: 11, y: 1.3, z: 3 },
  { scale: 0.8498, rotation: 14, x: 22, y: 4, z: 2 },
  { scale: 0.7756, rotation: 21, x: 30, y: 7.3, z: 1 }
];
/** Reference ≤767 (live at 375 px): same fan, tighter x spread. */
const FAN_X_MOBILE = [-15, -11, -6, 0, 6, 11, 15];
const fanX = (i: number) => (isMobileLayout() ? FAN_X_MOBILE[i] : FAN[i].x);
const ELASTIC = "elastic.out(1, 0.75)";

const title = ref<HTMLElement | null>(null);
const fan = ref<HTMLElement | null>(null);
const cards: (HTMLElement | null)[] = [];
const setCard = (i: number) => (el: unknown) => (cards[i] = el as HTMLElement | null);
const hovered = ref<number | null>(null);

const triggers: ScrollTrigger[] = [];
let interactive = false;
let leaveTimer: ReturnType<typeof setTimeout> | null = null;

const unit = () => fluidUnit();
const centre = Math.floor(FAN.length / 2);

function rest() {
  const u = unit();
  const tl = gsap.timeline();
  cards.forEach((card, i) => {
    const f = FAN[i];
    tl.to(card, { x: fanX(i) * u, y: f.y * u, scale: f.scale, rotation: f.rotation, duration: 0.5, ease: ELASTIC, overwrite: "auto" }, Math.abs(i - centre) * 0.02);
  });
}

function spreadAround(n: number) {
  const u = unit();
  const last = FAN.length - 1;
  const tl = gsap.timeline();
  cards.forEach((card, i) => {
    const f = FAN[i];
    const d = Math.abs(i - n);
    const reach = 1 - Math.abs((i - centre) / centre);
    const boost = 1 + 0.2 * Math.max(0, 3 - d);
    let to: gsap.TweenVars;
    if (i === n) {
      to = { x: fanX(i) * u, y: (f.y - 2.5) * u, scale: f.scale * 1.08, rotation: f.rotation };
    } else if (i < n) {
      to = { x: (fanX(i) - 8 * reach * boost) * u, y: f.y * u, scale: f.scale, rotation: f.rotation - 3 / (d + 1) };
    } else {
      const push = i === last ? 0 : 8 * reach * boost;
      to = { x: (fanX(i) + push) * u, y: (f.y + (i === last ? -1 : 0)) * u, scale: f.scale, rotation: f.rotation + 3 / (d + 1) };
    }
    tl.to(card, { ...to, duration: 0.5, ease: ELASTIC, overwrite: "auto" }, d * 0.02);
  });
}

function enter(i: number) {
  if (!interactive) return;
  if (leaveTimer) clearTimeout(leaveTimer);
  leaveTimer = null;
  hovered.value = i;
  spreadAround(i);
}

function leave(i: number) {
  if (!interactive || hovered.value !== i) return;
  leaveTimer = setTimeout(() => {
    if (hovered.value === i) {
      hovered.value = null;
      rest();
    }
    leaveTimer = null;
  }, 50);
}

function leaveFan() {
  if (!interactive) return;
  if (leaveTimer) clearTimeout(leaveTimer);
  leaveTimer = null;
  hovered.value = null;
  rest();
}

onMounted(() => {
  gsap.registerPlugin(ScrollTrigger);
  const u = unit();

  // Title: oval reveal
  const wraps = [...(title.value?.querySelectorAll<HTMLElement>(".oval-wrap") ?? [])];
  const lines = wraps.map((w) => w.querySelector<HTMLElement>(".oval-line"));
  gsap.set(wraps, { clipPath: "ellipse(20% 0% at 50% 0%)" });
  gsap.set(lines, { yPercent: -40 });
  const titleTl = gsap.timeline({ paused: true });
  titleTl.to(wraps, { clipPath: "ellipse(100% 120% at 50% 0%)", duration: 1.5, ease: "power2.inOut", stagger: 0.15 });
  lines.forEach((line, i) => titleTl.to(line, { yPercent: 0, duration: 1.5, ease: "power2.inOut" }, 0.15 + 0.1 * i));
  triggers.push(ScrollTrigger.create({ trigger: title.value, start: "top 95%", once: true, onEnter: () => titleTl.play() }));

  // Fan intro
  cards.forEach((card, i) => {
    if (card) card.style.zIndex = String(FAN[i].z);
  });
  gsap.set(cards, { x: 0, y: 10 * u, scale: 1, rotation: 0, transformOrigin: "center center", opacity: 1 });
  const intro = gsap.timeline({
    scrollTrigger: { trigger: fan.value, start: "top 90%", once: true },
    onComplete: () => (interactive = true)
  });
  intro
    .to(cards, { y: 0, duration: 0.8, ease: "power2.out", stagger: { amount: 0.5, from: "end" } })
    .to(
      cards,
      {
        x: (i: number) => fanX(i) * u,
        y: (i: number) => FAN[i].y * u,
        scale: (i: number) => FAN[i].scale,
        rotation: (i: number) => FAN[i].rotation,
        duration: 1.2,
        ease: ELASTIC,
        stagger: { amount: 0.2, from: "center" }
      },
      "-=0.4"
    );
  if (intro.scrollTrigger) triggers.push(intro.scrollTrigger);
});

onBeforeUnmount(() => {
  triggers.forEach((t) => t.kill());
  gsap.killTweensOf(cards);
  if (leaveTimer) clearTimeout(leaveTimer);
});
</script>

<template>
  <section class="socials" :class="{ 'is-dark': dark }" :data-nav-theme-target="dark ? 'light' : 'dark'">
    <div class="socials-layout">
      <div class="socials-icon">
        <RiveCanvas
          file="reef"
          artboard="off-icons"
          state-machine="off-icons"
          :inputs="{ 'color_green-off-white-2': true }"
          play-on-view
        />
      </div>

      <h2 ref="title" class="socials-title" :aria-label="`${s.titleTop} ${s.titleBottom}`">
        <span class="oval-wrap"><span class="oval-line">{{ s.titleTop }}</span></span>
        <span class="oval-wrap"><span class="oval-line is-brier">{{ s.titleBottom }}</span></span>
      </h2>

      <div ref="fan" class="socials-fan" @mouseleave="leaveFan">
        <div
          v-for="(src, i) in s.images"
          :key="src"
          :ref="setCard(i)"
          class="socials-card"
          @mouseenter="enter(i)"
          @mouseleave="leave(i)"
        >
          <img class="socials-card-img" :src="src" alt="" loading="lazy" />
        </div>
      </div>

      <HighLines class="socials-follow" :html="s.follow" color="dark-green-tint-1" />

      <div class="socials-links">
        <a v-for="link in s.links" :key="link.href" class="socials-link" :href="link.href" target="_blank" rel="noopener">
          <HighLines :html="link.label" color="dark-green-tint-1" />
        </a>
      </div>
    </div>
  </section>
</template>

<style scoped>
/* Transparent: the off-white WebGL page shows through. */
.socials {
  position: relative;
  padding: calc(var(--u) * 8) calc(var(--u) * 1.25) 0;
  color: #111112;
}

.socials.is-dark {
  color: #f4f4ed;
}

.socials-layout {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: calc(var(--u) * 2.5);
  text-align: center;
}

.socials-icon {
  width: calc(var(--u) * 3.5);
  height: calc(var(--u) * 3.5);
}

.socials-title {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin: 0;
  overflow: clip;
  font-family: var(--font-mona);
  font-size: calc(var(--u) * 4.5);
  font-variation-settings: "wdth" 93, "wght" 750;
  line-height: 0.886;
  letter-spacing: calc(var(--u) * -0.125);
  text-transform: uppercase;
}

.oval-wrap {
  display: block;
}

.oval-line {
  display: inline-block;
}

/* Unlike the helmets title, this Brier line keeps the Mona size and tracking (4.5u, −0.125u). */
.oval-line.is-brier {
  font-family: "Brier", serif;
  font-weight: 700;
}

.socials-fan {
  position: relative;
  width: calc(var(--u) * 80);
  height: calc(var(--u) * 36);
  margin-bottom: calc(var(--u) * 3.75);
}

.socials-card {
  position: absolute;
  top: calc(var(--u) * 0.5);
  left: 50%;
  width: calc(var(--u) * 20);
  height: calc(var(--u) * 35);
  margin-left: calc(var(--u) * -10);
  overflow: clip;
  border-radius: calc(var(--u) * 3.316);
  background: #000;
  will-change: transform;
}

.socials-card-img {
  position: absolute;
  inset: 0;
  width: 100%;
  max-width: none;
  height: 100%;
  border: 0;
  object-fit: cover;
}


.socials-follow {
  font-family: "Brier", serif;
  font-size: calc(var(--u) * 2);
  font-weight: 700;
  line-height: 1.04;
  letter-spacing: calc(var(--u) * 0.05);
}

.socials-links {
  display: flex;
  gap: calc(var(--u) * 1.875);
}

.socials-link {
  font-family: var(--font-mona);
  font-size: var(--u);
  font-weight: 800;
  font-variation-settings: "wdth" 86;
  line-height: 1;
  text-transform: uppercase;
}

/* Reference ≤479 at 375 px: 2.6u title, 14 × 24.48u cards centred in a 33.5 × 36u fan. */
@media (max-width: 767px) {
  /* Outer fan cards extend past the viewport (as on the reference); clip so they can't widen the page. */
  .socials {
    overflow-x: clip;
  }

  .socials-title {
    font-size: calc(var(--u) * 2.6);
    letter-spacing: calc(var(--u) * -0.072);
  }

  .socials-fan {
    width: 100%;
  }

  .socials-card {
    top: calc(var(--u) * 5.76);
    width: calc(var(--u) * 14.02);
    height: calc(var(--u) * 24.48);
    margin-left: calc(var(--u) * -7.01);
  }

  .socials-follow {
    font-size: calc(var(--u) * 1.7);
  }

  .socials-links {
    gap: calc(var(--u) * 1.25);
  }
}
</style>
