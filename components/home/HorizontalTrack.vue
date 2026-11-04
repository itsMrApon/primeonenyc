<script setup lang="ts">
/**
 * Horizontal photo track (reference "is-horizontal-track"), rebuilt from the
 * live layout at 1440 px (all numbers in px there, converted to fluid units).
 *
 * Motion, all from scroll position (no smoothing beyond Lenis):
 *   - track x = −clamp(scroll − (sectionTop − vh), 0, trackW − vw): it starts
 *     moving as the section enters and is pinned for (trackW − vw − vh);
 *   - each photo is its frame + 4u, offset −4u, and slides 0 → 4u while its
 *     frame crosses the screen: (vw − x) / (vw + w);
 *   - WebGL page tint dark green → off-white, power1.out over the pinned part;
 *     nav ink flips to dark at 10 % of it;
 *   - eyebrows / callouts play the highlighter reveal once their left edge
 *     passes 90 % of vw.
 */
import { ScrollTrigger } from "gsap/ScrollTrigger";

import type { HeroScrollTarget } from "~/composables/useHomeScroll";

const content = useHomeContent();
const PX = 1440 / 108; // px per unit at the 1440 reference
const TRACK_W = 4582.5;

type Box = [number, number, number, number]; // x, y, w, h in reference px

interface PhotoSlot {
  kind: "photo";
  item: number;
  eyebrow: [number, number];
  frame: Box;
  dark?: boolean;
  pill?: Box;
}
interface QuoteSlot {
  kind: "quote";
  quote: number;
  box: [number, number, number];
  signature: Box;
  dark?: boolean;
}

const SLOTS: (PhotoSlot | QuoteSlot)[] = [
  { kind: "photo", item: 0, eyebrow: [1080, 63], frame: [1080, 88, 243, 301.1] },
  { kind: "photo", item: 1, eyebrow: [1209.8, 502.2], frame: [1209.8, 527.2, 263.7, 263.7] },
  { kind: "quote", quote: 0, box: [1627.3, 78, 231.7], signature: [1627.3, 151.1, 55, 25] },
  { kind: "photo", item: 2, eyebrow: [1627.3, 306.4], frame: [1627.3, 331.4, 589.3, 535.3] },
  { kind: "photo", item: 3, eyebrow: [2358.4, 63], frame: [2358.4, 88, 197.8, 188.6] },
  { kind: "photo", item: 4, eyebrow: [2500.2, 452.8], frame: [2500.2, 477.8, 285.8, 258.8], pill: [2500.2, 753.2, 88.7, 40] },
  { kind: "photo", item: 5, eyebrow: [2927.7, 592.9], frame: [2927.7, 617.8, 192.4, 238.3], dark: true },
  { kind: "photo", item: 6, eyebrow: [3120.1, 135], frame: [3120.1, 160, 186.7, 186.7], dark: true },
  { kind: "photo", item: 7, eyebrow: [3448.5, 81], frame: [3448.5, 106, 548.5, 548.5], dark: true },
  { kind: "quote", quote: 1, box: [3448.5, 744.6, 400], signature: [3448.5, 817.7, 55, 25], dark: true },
  { kind: "photo", item: 8, eyebrow: [4280.7, 197.3], frame: [4280.7, 222.3, 285.2, 278.1], dark: true },
  { kind: "photo", item: 9, eyebrow: [4138.9, 584.2], frame: [4138.9, 609.2, 246.8, 224.2], dark: true }
];

const u = (px: number) => `calc(var(--u) * ${(px / PX).toFixed(4)})`;
const at = (x: number, y: number, w?: number, h?: number) => ({
  left: u(x),
  top: u(y),
  ...(w !== undefined ? { width: u(w) } : {}),
  ...(h !== undefined ? { height: u(h) } : {})
});

const section = ref<HTMLElement | null>(null);
const track = ref<HTMLElement | null>(null);
// Indexed by slot (function refs: v-for ref arrays are not order-guaranteed).
const photos: (HTMLImageElement | null)[] = [];
const reveals: ({ play: () => void } | null)[] = [];
const setPhoto = (i: number) => (el: unknown) => (photos[i] = el as HTMLImageElement | null);
const setReveal = (i: number) => (el: unknown) => (reveals[i] = el as { play: () => void } | null);
let trigger: ScrollTrigger | null = null;

const easeOutQuad = (t: number) => 1 - (1 - t) * (1 - t);
const clamp01 = (t: number) => Math.min(Math.max(t, 0), 1);

function update() {
  const el = section.value;
  const tr = track.value;
  if (!el || !tr) return;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const unit = Math.min(Math.max(vw, 992), 1920) / 108;
  const scale = unit / PX; // reference px → current px
  const trackW = TRACK_W * scale;
  const travel = Math.max(trackW - vw, 0);
  el.style.height = `${travel}px`;

  const top = el.getBoundingClientRect().top + window.scrollY;
  const scrolled = window.scrollY - (top - vh);
  const x = -Math.min(Math.max(scrolled, 0), travel);
  tr.style.transform = `translate3d(${x}px, 0, 0)`;

  const shift = 4 * unit;
  SLOTS.forEach((slot, i) => {
    const left = slot.kind === "photo" ? slot.eyebrow[0] : slot.box[0];
    if (left * scale + x < vw * 0.9) reveals[i]?.play();
    const img = photos[i];
    if (slot.kind !== "photo" || !img) return;
    const fx = slot.frame[0] * scale + x;
    const fw = slot.frame[2] * scale;
    img.style.transform = `translate3d(${shift * clamp01((vw - fx) / (vw + fw))}px, 0, 0)`;
  });

  const pinned = clamp01((window.scrollY - top) / Math.max(travel - vh, 1));
  const exp = (window as unknown as { experience?: HeroScrollTarget }).experience;
  exp?.setPageTint(easeOutQuad(pinned));
  const nav = document.querySelector<HTMLElement>("[data-app-nav]");
  if (nav && window.scrollY >= top - vh) {
    nav.dataset.navTheme = pinned >= 0.1 ? "dark" : "light";
    // Reference: the nav LN4 is hidden from just before the track (≈0.2vh) to its end.
    const inTrack = window.scrollY >= top - vh * 0.2 && window.scrollY <= top + travel;
    nav.dataset.navLogo = inTrack ? "hidden" : "shown";
  }
}

onMounted(() => {
  update();
  trigger = ScrollTrigger.create({
    trigger: section.value,
    start: "top bottom",
    end: "bottom top",
    onUpdate: update,
    onRefresh: update
  });
  window.addEventListener("resize", update);
});

onBeforeUnmount(() => {
  trigger?.kill();
  window.removeEventListener("resize", update);
});
</script>

<template>
  <section ref="section" class="htrack">
    <div class="htrack-sticky">
      <div ref="track" class="htrack-track">
        <template v-for="(slot, i) in SLOTS" :key="i">
          <template v-if="slot.kind === 'photo'">
            <HighLines
              :ref="setReveal(i)"
              manual
              class="htrack-eyebrow"
              :class="{ 'is-dark': slot.dark }"
              :style="at(slot.eyebrow[0], slot.eyebrow[1])"
              :html="content.horizontal.items[slot.item].caption"
            />
            <div class="htrack-frame" :style="at(...slot.frame)">
              <img
                :ref="setPhoto(i)"
                class="htrack-img"
                :src="content.horizontal.items[slot.item].src"
                :alt="content.horizontal.items[slot.item].alt"
                loading="lazy"
              />
            </div>
            <div v-if="slot.pill" class="htrack-pill" :style="at(...slot.pill)">
              <span class="htrack-pill-box">1</span>
              <span class="htrack-pill-box"><img src="/images/misc/crossed-flags.svg" alt="" /></span>
            </div>
          </template>
          <template v-else>
            <HighLines
              :ref="setReveal(i)"
              manual
              class="htrack-quote"
              :class="{ 'is-dark': slot.dark }"
              :style="at(slot.box[0], slot.box[1], slot.box[2])"
              :html="content.horizontal.quotes[slot.quote].text"
            />
            <img
              class="htrack-signature"
              :style="at(...slot.signature)"
              :src="content.horizontal.quotes[slot.quote].signatureSrc"
              alt=""
            />
          </template>
        </template>
      </div>
    </div>
  </section>
</template>

<style scoped>
/* Transparent: the WebGL page (tinting dark green → off-white) shows through. */
.htrack {
  --u: calc(clamp(992px, 100vw, 1920px) / 1728 * 16);
  position: relative;
  background: transparent;
}

.htrack-sticky {
  position: sticky;
  top: 0;
  height: 100vh;
  overflow: hidden;
}

.htrack-track {
  position: absolute;
  inset: 0 auto 0 0;
  width: calc(var(--u) * 343.6875);
  will-change: transform;
}

.htrack-track > * {
  position: absolute;
}

.htrack-eyebrow {
  color: #b4b8a5;
  font-family: var(--font-mona);
  font-size: calc(var(--u) * 0.625);
  font-variation-settings: "wdth" 100, "wght" 700;
  line-height: 1;
  text-transform: uppercase;
  white-space: nowrap;
}

.htrack-eyebrow.is-dark,
.htrack-quote.is-dark {
  color: #535450;
}

.htrack-frame {
  overflow: hidden;
}

.htrack-img {
  position: absolute;
  top: calc(var(--u) * -2);
  left: calc(var(--u) * -4);
  width: calc(100% + var(--u) * 4);
  max-width: none; /* global img { max-width: 100% } would cap the parallax overscan */
  height: calc(100% + var(--u) * 4);
  object-fit: cover;
  will-change: transform;
}

.htrack-quote {
  color: #b4b8a5;
  font-family: "Brier", serif;
  font-size: calc(var(--u) * 1.5);
  font-weight: 700;
  line-height: 0.94;
  letter-spacing: calc(var(--u) * 0.05);
}

.htrack-quote :deep(strong) {
  font-weight: inherit;
  color: #dde1d2;
}

.htrack-eyebrow :deep(.line),
.htrack-quote :deep(.line) {
  margin-inline: 0;
}

.htrack-signature {
  object-fit: contain;
  object-position: left center;
}

.htrack-pill {
  display: flex;
  border: 1px solid #b4b8a5;
  border-radius: calc(var(--u) * 0.2);
}

.htrack-pill-box {
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: center;
  color: #b4b8a5;
  font-family: var(--font-mona);
  font-size: calc(var(--u) * 1.5);
}

.htrack-pill-box + .htrack-pill-box {
  border-left: 1px solid #b4b8a5;
}

.htrack-pill-box img {
  width: calc(var(--u) * 1.5);
  height: auto;
}

@media (max-width: 767px) {
  .htrack-pill {
    display: none;
  }
}
</style>
