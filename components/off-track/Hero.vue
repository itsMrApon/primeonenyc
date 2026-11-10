<script setup lang="ts">
/**
 * Off Track hero (reference .s.is-on-track-home on /off-track, a [data-hero-animation-container]).
 * See .reanimate/off-track/spec.md.
 *   - "NYC" (Brier 23.2u) + "INSURANCE" (Mona 22.3u), scaled by --fit to stay one line, centred, oval reveal from the bottom:
 *     lines/chars rise 40 % → 0 (1.5 s power2.inOut, chars 15 ms each from the centre) from
 *     init; at +0.75 s the clip opens ellipse(20% 0%) → (100% 120%) at bottom centre and every
 *     highlighter, the off-icons Rive and the signature play.
 *   - Left half: name / age / icon row, then (bottom-aligned) eyebrow, intro, signature, side
 *     note and the partner-logo marquee (right, speed 40; hidden on phones).
 *   - Right half: [data-heroflip="pos1"], where the flying photo starts (useHeroImageFlip).
 */
import gsap from "gsap";

import content from "~/content/off-track.json";

const hero = content.hero;
const title = ref<HTMLElement | null>(null);
const highs = ref<{ play: () => void }[]>([]);
const rives = ref<{ play: () => void }[]>([]);
const setHigh = (el: unknown) => el && !highs.value.includes(el as never) && highs.value.push(el as never);
const setRive = (el: unknown) => el && !rives.value.includes(el as never) && rives.value.push(el as never);

const brierChars = hero.titleBrier.toUpperCase().split("");
const monoChars = hero.title.toUpperCase().split("");
const tweens: gsap.core.Animation[] = [];
let clip: gsap.core.Timeline | null = null;

const HIDDEN = "ellipse(20% 0% at 50% 100%)";
const SHOWN = "ellipse(100% 120% at 50% 100%)";

function init() {
  const wrap = title.value?.querySelector(".oval-wrap");
  const line = title.value?.querySelector(".oval-line");
  const cs = title.value?.querySelectorAll(".oval-char") ?? [];
  clip = gsap.timeline({ paused: true });
  clip.to(wrap ?? [], { clipPath: SHOWN, duration: 1.5, ease: "power2.inOut" });
  // Reference: the line/char moves are plain tweens started at init, not part of the clip timeline.
  tweens.push(gsap.to(line ?? [], { yPercent: 0, duration: 1.5, ease: "power2.inOut", delay: 0.15 }));
  tweens.push(
    gsap.to(cs, { yPercent: 0, duration: 1.5, ease: "power2.inOut", stagger: { amount: 0.015 * cs.length, from: "center" } })
  );
  tweens.push(
    gsap.delayedCall(0.75, () => {
      clip?.play();
      highs.value.forEach((h) => h.play());
      rives.value.forEach((r) => r.play());
    })
  );
}

const onRevealed = () => init();

/** Shrink the one-line title (--fit ≤ 1) so a longer name than "Off Track" still fits the hero width. */
function fitTitle() {
  const el = title.value;
  const box = el?.parentElement;
  if (!el || !box) return;
  const fit = Number(el.style.getPropertyValue("--fit") || 1);
  const natural = el.getBoundingClientRect().width / fit;
  el.style.setProperty("--fit", String(Math.min(1, box.getBoundingClientRect().width / natural)));
}

onMounted(() => {
  fitTitle();
  document.fonts.ready.then(fitTitle);
  window.addEventListener("resize", fitTitle, { passive: true });
  gsap.set(title.value?.querySelector(".oval-wrap") ?? [], { clipPath: HIDDEN });
  gsap.set(title.value?.querySelectorAll(".oval-line, .oval-char") ?? [], { yPercent: 40 });
  if ((window as unknown as { pageRevealed?: boolean }).pageRevealed) init();
  else window.addEventListener("page:revealed", onRevealed, { once: true });
});

onBeforeUnmount(() => {
  window.removeEventListener("page:revealed", onRevealed);
  window.removeEventListener("resize", fitTitle);
  clip?.kill();
  tweens.forEach((t) => t.kill());
});
</script>

<template>
  <div class="off-hero" data-hero-animation-container>
    <div class="off-hero-c">
      <div class="title-layout">
        <div class="title-w">
          <h1 class="sr-only">{{ hero.titleBrier }}{{ hero.title }}</h1>
          <div ref="title" class="title" aria-hidden="true">
            <div class="oval-outer">
              <div class="oval-wrap">
                <div class="oval-line">
                  <span class="brier"
                    ><span v-for="(c, i) in brierChars" :key="`b${i}`" class="oval-char">{{ c }}</span></span
                  ><span v-for="(c, i) in monoChars" :key="`m${i}`" class="oval-char">{{ c }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="info-grid grid-main">
          <div class="sub-w">
            <HighLines :ref="setHigh" manual class="quote" :html="hero.name" />
            <div class="sub-col">
              <HighLines :ref="setHigh" manual class="quote" :html="hero.age" />
              <div class="icon">
                <RiveCanvas
                  :ref="setRive"
                  file="reef"
                  artboard="off-icons"
                  state-machine="off-icons"
                  :inputs="{ 'color_green-off-white-2': true }"
                  :autoplay="false"
                />
              </div>
            </div>
          </div>
        </div>

        <div class="stats-grid grid-main">
          <div class="stats-w">
            <div class="spacer" />
            <div class="stats-layout">
              <div class="eyebrow-w">
                <HighLines :ref="setHigh" manual class="eyebrow" :html="hero.eyebrow" />
              </div>
              <div class="para-w">
                <HighLines
                  :ref="setHigh"
                  manual
                  tag="h2"
                  class="body-lg"
                  :html="`${hero.intro} <strong>${hero.introAccent}</strong>.`"
                />
              </div>
              <div class="signature">
                <SignatureDraw :ref="setRive" color="#535450" :autoplay="false" />
              </div>
            </div>
            <div class="sub-para-w grid-main">
              <div class="sub-para">
                <HighLines :ref="setHigh" manual tag="p" class="body-sm" :html="hero.sub" />
              </div>
            </div>
            <div class="marquee-w" aria-hidden="true">
              <Marquee :speed="40" direction="right" :duplicate="4" :scroll-shift="10">
                <div v-for="logo in hero.logos" :key="logo.src" class="logo-item">
                  <img class="logo" :src="logo.src" :alt="logo.alt" />
                  <div class="logo-spacer" />
                </div>
              </Marquee>
            </div>
          </div>
          <div class="img-slot">
            <div data-heroflip="pos1" class="img-w" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Reference metrics at 1440 px; 1u = 13.33 px (the reference rem). */
.off-hero {
  --gap: calc(var(--u) * 1.25);
  color: #282c20;
}

.off-hero-c {
  position: relative;
  display: flex;
  flex-direction: column;
  height: min(100vh, 1200px);
  padding: calc(var(--u) * 5.375) var(--gap) 0;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
}

.title-layout {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding-bottom: var(--gap);
}

.title-w {
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
}

/* .text-on-t-hero-heading.is-off-t */
.title {
  flex: none;
  font-family: var(--font-mona);
  font-size: calc(var(--u) * 22.3 * var(--fit, 1));
  font-variation-settings: "wdth" 95, "wght" 700;
  line-height: 0.886;
  letter-spacing: calc(var(--u) * -0.1875 * var(--fit, 1));
  text-transform: uppercase;
  white-space: nowrap;
  pointer-events: none;
}

/* .text-on-t-hero-heading-mona.margin */
.brier {
  margin-right: calc(var(--u) * 0.4 * var(--fit, 1));
  font-family: var(--font-brier);
  font-size: calc(var(--u) * 23.2 * var(--fit, 1));
  font-variation-settings: normal;
}

.oval-outer {
  overflow: clip;
}

.oval-line,
.oval-char {
  display: inline-block;
}

.grid-main {
  display: grid;
  grid-template-columns: 23.55% 23.55% 23.55% 23.55%;
  column-gap: var(--gap);
  width: 100%;
}

.sub-w {
  grid-column: 1 / span 2;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--gap);
}

/* .on-t-hero-sub-col.is-grid: two rows, the second empty (its 16 px gap still counts). */
.sub-col {
  display: grid;
  grid-template-rows: auto auto;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

/* .text-quote */
.quote {
  font-family: var(--font-brier);
  font-size: calc(var(--u) * 1.5);
  line-height: 0.95;
  letter-spacing: calc(var(--u) * -0.03125);
}

.icon {
  display: flex;
  width: calc(var(--u) * 2.3125);
  height: calc(var(--u) * 2.3125);
}

.stats-grid {
  position: relative;
  flex: 1;
  row-gap: var(--gap);
  height: 100%;
  margin-top: auto;
}

.stats-w {
  grid-column: 1 / span 2;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  align-items: flex-start;
  gap: 16px;
}

.spacer {
  flex: 1 1 0;
  min-height: calc(var(--u) * 4);
  max-height: calc(var(--u) * 8);
}

.stats-layout {
  display: flex;
  flex-direction: column;
  gap: var(--gap);
}

.eyebrow-w {
  display: flex;
  gap: calc(var(--gap) * 0.5);
  color: #b9bbad;
  overflow: clip;
}

.eyebrow {
  letter-spacing: 0;
  font-family: var(--font-mona);
  font-size: calc(var(--u) * 0.625);
  font-variation-settings: "wght" 700, "wdth" 100;
  line-height: 1;
  text-transform: uppercase;
}

.quote :deep(.line),
.eyebrow :deep(.line),
.body-lg :deep(.line),
.body-sm :deep(.line) {
  margin-inline: 0;
}

.para-w {
  width: calc(var(--u) * 41);
  max-width: 100%;
}

.body-lg {
  margin: 0;
  font-family: var(--font-mona);
  font-size: calc(var(--u) * 2.25);
  font-weight: 400;
  font-variation-settings: "wght" 500, "wdth" 100;
  line-height: 1.1;
  letter-spacing: calc(var(--u) * -0.0625);
}

/* .text-body-lg-brier.c-green-off-white-2 */
.body-lg :deep(strong) {
  font-family: var(--font-brier);
  font-weight: 700;
  font-variation-settings: normal;
  color: #b4b8a5;
}

/* .off-track-hero-signature-rive.scale */
.signature {
  position: relative;
  display: flex;
  height: calc(var(--u) * 4.5);
  aspect-ratio: 133 / 72;
  margin-right: auto;
  transform: scale(1.3);
}

.sub-para-w.grid-main {
  grid-template-columns: 47.1% 47.1%;
}

.sub-para {
  grid-column: 2;
  max-width: calc(var(--u) * 16.375);
}

/* .text-body-sm-mona */
.body-sm {
  margin: 0;
  font-family: var(--font-mona);
  font-size: var(--u);
  font-weight: 400;
  font-variation-settings: "wght" 500, "wdth" 100;
  line-height: 1.3;
  letter-spacing: calc(var(--u) * -0.0125);
}

/* .marquee-offest-w.z-20 */
.marquee-w {
  position: relative;
  left: calc(var(--gap) * -1);
  z-index: 20;
  width: 100vw;
  margin-top: calc(var(--u) * 2);
  overflow: clip;
}

.logo-item {
  display: flex;
  align-items: center;
}

.logo {
  display: flex;
  flex: none;
  height: calc(var(--u) * 3.4375);
}

.logo-spacer {
  flex: none;
  width: calc(var(--u) * 7);
}

.img-slot {
  position: relative;
  right: calc(var(--u) * -1);
  grid-column: 3 / span 2;
}

/* .off-t-hero-img-w: pos1, 52.125 × 60u, raised 12u. */
.img-w {
  position: absolute;
  inset: calc(var(--u) * -12) auto auto 0;
  width: calc(var(--u) * 52.125);
  height: calc(var(--u) * 60);
}

/* Reference ≤479 (live at 375 px; 1u = the phone rem, vw / 36). */
@media (max-width: 767px) {
  .off-hero-c {
    height: 100vh;
    padding: calc(var(--u) * 6.375) var(--u) 0;
  }

  .title {
    font-size: calc(var(--u) * 7.3 * var(--fit, 1));
  }

  .brier {
    font-size: calc(var(--u) * 7.6 * var(--fit, 1));
  }

  .info-grid {
    margin-top: calc(var(--u) * 0.2);
  }

  .sub-w {
    grid-column: 1 / -1;
    grid-template-columns: repeat(2, calc(var(--u) * 17.26));
  }

  .stats-grid.grid-main {
    display: flex;
    flex-direction: column;
    margin-top: 0;
  }

  .stats-w {
    justify-content: flex-start;
  }

  .spacer {
    flex: 1;
    min-height: calc(var(--u) * 2);
    max-height: none;
  }

  .stats-layout,
  .para-w {
    max-width: 100%;
  }

  .para-w {
    margin-bottom: var(--u);
  }

  .eyebrow {
    font-size: calc(var(--u) * 0.8);
  }

  .body-lg :deep(strong) {
    font-size: calc(var(--u) * 1.9);
  }

  .signature {
    transform-origin: center;
  }

  .marquee-w {
    display: none;
  }

  .img-slot {
    right: 0;
  }

  .img-w {
    position: relative;
    inset: 0;
    width: 100%;
    height: auto;
    aspect-ratio: 52.125 / 60;
  }
}
</style>
