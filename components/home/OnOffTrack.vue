<script setup lang="ts">
/**
 * "On track / Off track" (reference `.sticky-track.is-home-otot`, 200vh):
 *   - first 100vh: sticky block, transparent over the off-white WebGL page;
 *     side portraits slide in from ±20u, power3.out over [top − vh, top + vh];
 *     the two text columns close in from ±5u, linear over [top − vh, top + 0.2vh];
 *     titles / copy use the highlighter (col 1 → right, col 2 ← left,
 *     #3B3C38, copy +0.2 s); the lime "On" scribble plays at top-center;
 *   - second 100vh: the helmet photo scrolls up over it, scale 1 → 1.05 and
 *     drifting −0.1×scroll as it passes; nav ink turns light ~20 px after it
 *     reaches the top.
 * Metrics are the live layout at 1440 px in fluid units (1u = 13.33 px there).
 */
import { ScrollTrigger } from "gsap/ScrollTrigger";

const content = useHomeContent();
const on = computed(() => content.onOffTrack.on);
const off = computed(() => content.onOffTrack.off);

const track = ref<HTMLElement | null>(null);
const leftImg = ref<HTMLImageElement | null>(null);
const col1 = ref<HTMLElement | null>(null);
const col2 = ref<HTMLElement | null>(null);
const rightImg = ref<HTMLImageElement | null>(null);
const endImg = ref<HTMLImageElement | null>(null);
const phrase = ref<{ play: () => void } | null>(null);
/** "Tax" brush word in place of the phrases.riv "ON" (same strokes as the Tax Consultant hero). */
const TAX_WORD = ["T-bar", "T-stem", "a", "x-1", "x-2"];
const phraseBox = ref<HTMLElement | null>(null);
const hover = reactive({ on: false, off: false });
const triggers: ScrollTrigger[] = [];

const clamp01 = (t: number) => Math.min(Math.max(t, 0), 1);

function update() {
  const el = track.value;
  if (!el) return;
  const vh = window.innerHeight;
  const unit = fluidUnit();
  const top = el.getBoundingClientRect().top + window.scrollY;
  const dy = window.scrollY - top;

  const mobile = isMobileLayout();
  // Portraits ease in until the end photo arrives: track − vh past the top (vh desktop, 0.6vh mobile).
  const span = vh + Math.max(el.offsetHeight - vh, 1);
  const k = Math.pow(1 - clamp01((dy + vh) / span), 3); // power3.out, remaining
  const slide = 20 * unit * k;
  if (leftImg.value) leftImg.value.style.transform = `translate3d(${-slide}px, 0, 0)`;
  if (rightImg.value) rightImg.value.style.transform = `translate3d(${slide}px, 0, 0)`;

  const gap = 5 * unit * (1 - clamp01((dy + vh) / ((mobile ? 1 : 1.2) * vh)));
  if (col1.value) col1.value.style.transform = `translate3d(${-gap}px, 0, 0)`;
  if (col2.value) col2.value.style.transform = `translate3d(${gap}px, 0, 0)`;

  const passed = Math.max(dy, 0);
  if (endImg.value) {
    // Mobile shows the full 4:5 poster: no drift or zoom (either would crop its text).
    const drift = mobile ? 0 : -0.1 * passed;
    const grow = mobile ? 0 : 0.05 * (passed / vh);
    endImg.value.style.transform = `translate3d(0, ${drift}px, 0) scale(${1 + grow})`;
  }

  const nav = document.querySelector<HTMLElement>("[data-app-nav]");
  if (nav && dy > -vh && dy < 2 * vh) nav.dataset.navTheme = dy > vh + 20 ? "light" : "dark";
}

onMounted(() => {
  update();
  triggers.push(
    ScrollTrigger.create({ trigger: track.value, start: "top bottom", end: "bottom top", onUpdate: update, onRefresh: update }),
    ScrollTrigger.create({ trigger: phraseBox.value, start: "top center", once: true, onEnter: () => phrase.value?.play() })
  );
  window.addEventListener("resize", update);
});

onBeforeUnmount(() => {
  triggers.forEach((t) => t.kill());
  window.removeEventListener("resize", update);
});
</script>

<template>
  <div ref="track" class="otot-track">
    <div class="otot-sticky">
      <section class="otot">
        <div class="otot-bg" aria-hidden="true">
          <div class="otot-img-w is-1"><img ref="leftImg" class="otot-img" :src="on.image" :alt="on.imageAlt" /></div>
          <div class="otot-img-w is-2"><img ref="rightImg" class="otot-img" :src="off.image" :alt="off.imageAlt" /></div>
        </div>

        <div class="otot-layout">
          <div ref="col1" class="otot-col is-1">
            <div class="otot-titles">
              <HighLines tag="h2" class="otot-t-brier" :html="on.titleTop" color="dark-green-tint-1" />
              <HighLines tag="h2" class="otot-t-mona is-long" :html="on.titleBottom" color="dark-green-tint-1" />
              <div ref="phraseBox" class="otot-phrase">
                <BrushPhrase ref="phrase" :only="TAX_WORD" view-box="9 160 402 205" :autoplay="false" />
              </div>
            </div>
            <HighLines tag="p" class="otot-p" :html="on.body" color="dark-green-tint-1" :delay="0.2" />
            <a
              class="otot-btn is-flipped"
              :href="on.href"
              title="Tax Consultant page"
              @pointerenter="hover.on = true"
              @pointerleave="hover.on = false"
            >
              <span class="otot-btn-icon">
                <RiveCanvas file="btn-ui" artboard="arrow" state-machine="arrow" :inputs="{ hover: hover.on }" />
              </span>
            </a>
          </div>

          <div ref="col2" class="otot-col is-2">
            <div class="otot-titles">
              <HighLines tag="h2" class="otot-t-brier" :html="off.titleTop" color="dark-green-tint-1" direction="left" />
              <HighLines tag="h2" class="otot-t-mona" :html="off.titleBottom" color="dark-green-tint-1" direction="left" />
            </div>
            <HighLines tag="p" class="otot-p" :html="off.body" color="dark-green-tint-1" direction="left" :delay="0.2" />
            <a
              class="otot-btn"
              :href="off.href"
              title="NYC Insurance page"
              @pointerenter="hover.off = true"
              @pointerleave="hover.off = false"
            >
              <span class="otot-btn-icon">
                <RiveCanvas file="btn-ui" artboard="arrow" state-machine="arrow" :inputs="{ hover: hover.off }" />
              </span>
            </a>
          </div>
        </div>
      </section>
    </div>

    <section class="otot-end">
      <picture>
        <source media="(max-width: 767px)" :srcset="content.onOffTrack.featureImageMobile" />
        <img ref="endImg" class="otot-end-img" :src="content.onOffTrack.featureImage" :alt="content.onOffTrack.featureImageAlt" />
      </picture>
    </section>
  </div>
</template>

<style scoped>
.otot-track {
  position: relative;
  height: 200vh;
  color: #282c20;
}

.otot-sticky {
  position: sticky;
  top: 0;
  height: 100vh;
  overflow: hidden;
}

.otot {
  position: relative;
  height: 100%;
  background: transparent; /* off-white WebGL page behind */
}

.otot-img-w {
  position: absolute;
  bottom: 0;
  height: calc(var(--u) * 61.2);
  overflow: hidden;
}

.otot-img-w.is-1 {
  left: 0;
  width: calc(var(--u) * 25.725);
}

.otot-img-w.is-2 {
  right: 0;
  width: calc(var(--u) * 27.7);
}

.otot-img {
  display: block;
  width: 100%;
  max-width: none;
  height: 100%;
  object-fit: cover;
  will-change: transform;
}

.otot-layout {
  position: absolute;
  top: calc(var(--u) * 22.52);
  left: 50%;
  display: flex;
  gap: calc(var(--u) * 3.75);
  transform: translateX(-50%);
}

.otot-col {
  display: flex;
  flex-direction: column;
  width: calc(var(--u) * 21.255);
}

.otot-col.is-1 {
  align-items: flex-end;
  text-align: right;
}

.otot-col.is-2 {
  align-items: flex-start;
  text-align: left;
}

.otot-titles {
  position: relative;
  width: 100%;
}

.otot-t-brier {
  margin: 0;
  font-family: "Brier", serif;
  font-size: calc(var(--u) * 7.3125);
  font-weight: 700;
  line-height: 0.81;
  letter-spacing: calc(var(--u) * -0.21875);
  text-transform: uppercase;
}

.otot-t-mona {
  margin: 0;
  font-family: var(--font-mona);
  font-size: calc(var(--u) * 7);
  font-variation-settings: "wdth" 93, "wght" 750;
  line-height: 0.85;
  letter-spacing: calc(var(--u) * -0.25);
  text-transform: uppercase;
}

.otot-col.is-1 :deep(.line) {
  margin-inline: auto 0;
}

.otot-col.is-2 :deep(.line) {
  margin-inline: 0;
}

/* CONSULTANT (6.48 em) sized to the column the reference TRACK filled. */
.otot-t-mona.is-long {
  font-size: calc(var(--u) * 3.2);
  letter-spacing: calc(var(--u) * -0.1);
}

/* "Tax" brush (402 x 205) over the serif TAX, like the reference "ON" brush over "ON". */
.otot-phrase {
  position: absolute;
  top: calc(var(--u) * -1);
  left: calc(var(--u) * 6.315);
  width: calc(var(--u) * 15.94);
  height: calc(var(--u) * 8.13);
  pointer-events: none;
}

.otot-p {
  width: calc(var(--u) * 21);
  margin: calc(var(--u) * 2.5) 0 0;
  font-family: var(--font-mona);
  font-size: calc(var(--u) * 1.25);
  font-variation-settings: "wdth" 100, "wght" 500;
  line-height: 1.25;
  letter-spacing: calc(var(--u) * -0.0125);
}

.otot-p :deep(strong) {
  font-weight: inherit;
}

.otot-btn {
  display: grid;
  place-items: center;
  width: calc(var(--u) * 3.75);
  height: calc(var(--u) * 3.75);
  margin-top: calc(var(--u) * 1.25);
  border-radius: calc(var(--u) * 0.54);
  background: #d2ff00;
}

.otot-btn-icon {
  display: block;
  width: var(--u);
  height: var(--u);
}

.otot-btn.is-flipped .otot-btn-icon {
  transform: rotate(180deg);
}

.otot-end {
  position: relative;
  height: 100vh;
  overflow: hidden;
}

.otot-end-img {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  max-width: none;
  height: 120%;
  object-fit: cover;
  transform-origin: center center;
  will-change: transform;
}

/* Reference ≤991 / ≤479 at 375 px: 2-col grid from 8u, 4u titles, side photos
   62.67vh tall pushed 7u off-screen, end photo 60vh (image 80vh). */
@media (max-width: 767px) {
  /* Sticky 100vh + the end poster at its own height. */
  .otot-track {
    height: auto;
  }

  .otot-img-w {
    height: 62.67vh;
    width: auto;
  }

  /* Reference pushes these 7u off-screen; our portraits have the faces on the outer
     edge, so they sit flush with the screen edges, at their own aspect, uncropped. */
  .otot-img-w.is-1 {
    left: 0;
    width: auto;
    aspect-ratio: 883 / 1984;
  }

  .otot-img-w.is-2 {
    right: 0;
    width: auto;
    aspect-ratio: 830 / 1984;
  }

  .otot-layout {
    top: calc(var(--u) * 8);
    gap: calc(var(--u) * 2.5);
  }

  .otot-col {
    width: calc(var(--u) * 15.5);
  }

  .otot-t-brier,
  .otot-t-mona {
    font-size: calc(var(--u) * 4);
    letter-spacing: calc(var(--u) * -0.1);
  }

  .otot-phrase {
    top: calc(var(--u) * -0.6);
    left: calc(var(--u) * 5);
    width: calc(var(--u) * 10.5);
    height: calc(var(--u) * 5.35);
  }

  .otot-t-mona.is-long {
    font-size: calc(var(--u) * 2.35);
    letter-spacing: calc(var(--u) * -0.05);
  }

  .otot-p {
    width: 100%;
    font-size: calc(var(--u) * 1.3);
  }

  .otot-btn {
    width: calc(var(--u) * 3.3);
    height: calc(var(--u) * 3.3);
  }

  /* Mobile poster (1080 × 1350) is shown whole instead of the cropped desktop photo. */
  .otot-end {
    height: auto;
    aspect-ratio: 1080 / 1350;
  }

  .otot-end-img {
    height: 100%;
  }
}
</style>
