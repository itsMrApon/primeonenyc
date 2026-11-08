<script setup lang="ts">
/**
 * On Track horizontal photo track (reference .s.is-horizontal-track on /on-track).
 * Same mechanics and slot positions as the home track (components/home/HorizontalTrack.vue,
 * .reanimate/track/spec.md) — the page reuses its first six slots — but:
 *   - 2803 px track (reference px at 1440), so section height = trackW − vw = 1363;
 *   - eyebrows / pill grey-on-track #B9BBAD, quote #B4B8A5 + #DDE1D2 words;
 *   - no highlighter reveals (no data-anim-high here), no GL page tint, nav unchanged.
 * See .reanimate/on-track/04-horizontal-track/spec.md.
 */
import { ScrollTrigger } from "gsap/ScrollTrigger";

import content from "~/content/on-track.json";
import { fluidUnit } from "~/utils/fluid";

const t = content.track;
const PX = 1440 / 108; // px per unit at the 1440 reference
const TRACK_W = 2803;

type Box = [number, number, number, number]; // x, y, w, h in reference px (track-relative)
const PHOTOS: { item: number; eyebrow: [number, number]; frame: Box }[] = [
  { item: 0, eyebrow: [1080, 63], frame: [1080, 88, 243, 301.1] },
  { item: 1, eyebrow: [1209.8, 502.2], frame: [1209.8, 527.2, 263.7, 263.7] },
  { item: 2, eyebrow: [1627.3, 306.4], frame: [1627.3, 331.4, 589.3, 535.3] },
  { item: 3, eyebrow: [2358.4, 63], frame: [2358.4, 88, 197.8, 188.6] },
  { item: 4, eyebrow: [2500.2, 452.8], frame: [2500.2, 477.8, 285.8, 258.8] }
];
const QUOTE: [number, number, number] = [1627.3, 78, 231.7];
const SIGNATURE: Box = [1627.3, 151.1, 55, 25];
const PILL: Box = [2500.2, 753.2, 88.7, 40];

const u = (px: number) => `calc(var(--u) * ${(px / PX).toFixed(4)})`;
const at = ([x, y, w, h]: number[]) => ({
  left: u(x),
  top: u(y),
  ...(w !== undefined ? { width: u(w) } : {}),
  ...(h !== undefined ? { height: u(h) } : {})
});

const section = ref<HTMLElement | null>(null);
const track = ref<HTMLElement | null>(null);
const photos: (HTMLImageElement | null)[] = [];
const setPhoto = (i: number) => (el: unknown) => (photos[i] = el as HTMLImageElement | null);
let trigger: ScrollTrigger | null = null;

const clamp01 = (v: number) => Math.min(Math.max(v, 0), 1);

function update() {
  const el = section.value;
  const tr = track.value;
  if (!el || !tr) return;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const unit = fluidUnit(vw);
  const scale = unit / PX;
  const travel = Math.max(TRACK_W * scale - vw, 0);
  el.style.height = `${travel}px`;

  const top = el.getBoundingClientRect().top + window.scrollY;
  const x = -Math.min(Math.max(window.scrollY - (top - vh), 0), travel);
  tr.style.transform = `translate3d(${x}px, 0, 0)`;

  const shift = 4 * unit;
  PHOTOS.forEach((p, i) => {
    const img = photos[i];
    if (!img) return;
    const fx = p.frame[0] * scale + x;
    const fw = p.frame[2] * scale;
    img.style.transform = `translate3d(${shift * clamp01((vw - fx) / (vw + fw))}px, 0, 0)`;
  });
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
        <template v-for="(p, i) in PHOTOS" :key="i">
          <div class="htrack-eyebrow" :style="at(p.eyebrow)">{{ t.items[p.item].caption }}</div>
          <div class="htrack-frame" :style="at(p.frame)">
            <img :ref="setPhoto(i)" class="htrack-img" :src="t.items[p.item].src" :alt="t.items[p.item].alt" />
          </div>
        </template>
        <!-- eslint-disable-next-line vue/no-v-html -- trusted copy from content/on-track.json -->
        <div class="htrack-quote" :style="at(QUOTE)" v-html="t.quote.text" />
        <img class="htrack-signature" :style="at(SIGNATURE)" :src="t.quote.signature" alt="Lando's signature in lime color" />
        <div class="htrack-pill" :style="at(PILL)">
          <span class="htrack-pill-box is-side">{{ t.pill.text }}</span>
          <span class="htrack-pill-box"><img :src="t.pill.icon" :alt="t.pill.alt" /></span>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.htrack {
  position: relative;
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
  width: calc(var(--u) * 210.225);
  will-change: transform;
}

.htrack-track > * {
  position: absolute;
}

.htrack-eyebrow {
  color: #b9bbad;
  font-family: var(--font-mona);
  font-size: calc(var(--u) * 0.625);
  font-variation-settings: "wdth" 100, "wght" 700;
  line-height: 1;
  text-transform: uppercase;
  white-space: nowrap;
}

.htrack-frame {
  overflow: hidden;
}

/* Photo = frame + 4u, offset (−4u, −2u); slides 0 → 4u while the frame crosses the screen. */
.htrack-img {
  position: absolute;
  top: calc(var(--u) * -2);
  left: calc(var(--u) * -4);
  width: calc(100% + var(--u) * 4);
  max-width: none;
  height: calc(100% + var(--u) * 4);
  object-fit: cover;
  will-change: transform;
}

.htrack-quote {
  color: #b4b8a5;
  font-family: var(--font-brier);
  font-size: calc(var(--u) * 1.5);
  font-weight: 700;
  line-height: 0.94;
  letter-spacing: calc(var(--u) * 0.05);
}

.htrack-quote :deep(strong) {
  font-weight: inherit;
  color: #dde1d2;
}

.htrack-signature {
  object-fit: contain;
  object-position: left center;
}

.htrack-pill {
  display: flex;
  border: 1px solid #b9bbad;
  border-radius: calc(var(--u) * 0.2);
}

.htrack-pill-box {
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: center;
  color: #b9bbad;
  font-family: var(--font-mona);
  font-size: calc(var(--u) * 1.5);
}

.htrack-pill-box + .htrack-pill-box {
  border-left: 1px solid #b9bbad;
}

.htrack-pill-box img {
  width: calc(var(--u) * 1.5);
  height: auto;
}
</style>
