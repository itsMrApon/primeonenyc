<script setup lang="ts">
/**
 * On Track hero (reference .s.is-on-track-home, a [data-hero-animation-container]).
 * See .reanimate/on-track/00-on-track-home/spec.md.
 *   - Lime "ON" (phrases.riv phrase_on) + TRACK in Mona 22.3u, oval reveal.
 *   - Info row and stats block in grid columns 3–4; stats UI: previous race card,
 *     current round box (masked, pattern fill), circuit + "4" + signature box.
 *   - Intro (reference: page init, then +750 ms): TRACK lines/chars drop −40 % → 0
 *     (1.5 s power2.inOut) from init; at +0.75 s the oval clip opens, every
 *     highlighter plays and every hero Rive starts.
 *   - "Previous" circuit (circuits.riv) autoplays with its track; hovering the "5th" row
 *     switches it to the row's hover track (reference data-rive-circuit-hover). The current
 *     box shows the office outline (OutletIcon) instead of a circuit.
 *   - [data-heroflip="pos1"]: where the GL helmet starts (useHelmetFlip).
 */
import gsap from "gsap";

import content from "~/content/on-track.json";

const hero = content.hero;
const title = ref<HTMLElement | null>(null);
const highs = ref<{ play: () => void }[]>([]);
const rives = ref<{ play: () => void }[]>([]);
const setHigh = (el: unknown) => el && !highs.value.includes(el as never) && highs.value.push(el as never);
const setRive = (el: unknown) => el && !rives.value.includes(el as never) && rives.value.push(el as never);

/** Only one track boolean on at a time (reference clears the others first). */
const hoverTrack = ref<string | null>(null);
const circuitInputs = (own: string) => {
  const active = hoverTrack.value ?? own;
  return { [own]: active === own, [hero.previous.hoverTrack]: active === hero.previous.hoverTrack };
};

const chars = hero.title.toUpperCase().split("");
/** "Tax" brush word in place of the phrases.riv "ON" (strokes shared with the countdown phrase). */
const TAX_WORD = ["T-bar", "T-stem", "a", "x-1", "x-2"];
const tweens: gsap.core.Animation[] = [];
let clip: gsap.core.Timeline | null = null;

function init() {
  const wraps = [...(title.value?.querySelectorAll<HTMLElement>(".oval-wrap") ?? [])];
  clip = gsap.timeline({ paused: true });
  clip.to(wraps, { clipPath: "ellipse(100% 120% at 50% 0%)", duration: 1.5, ease: "power2.inOut", stagger: 0.15 });
  // Reference: the line/char drops are plain tweens started at init, not part of the clip timeline.
  wraps.forEach((wrap, i) => {
    const line = wrap.querySelector(".oval-line");
    const cs = wrap.querySelectorAll(".oval-char");
    tweens.push(gsap.to(line, { yPercent: 0, duration: 1.5, ease: "power2.inOut", delay: 0.15 + 0.1 * i }));
    tweens.push(
      gsap.to(cs, {
        yPercent: 0,
        duration: 1.5,
        ease: "power2.inOut",
        delay: 0.15 * i,
        stagger: { amount: 0.015 * cs.length, from: "center" }
      })
    );
  });
  tweens.push(
    gsap.delayedCall(0.75, () => {
      clip?.play();
      highs.value.forEach((h) => h.play());
      rives.value.forEach((r) => r.play());
    })
  );
}

const onRevealed = () => init();

onMounted(() => {
  const wraps = title.value?.querySelectorAll(".oval-wrap");
  gsap.set(wraps ?? [], { clipPath: "ellipse(20% 0% at 50% 0%)" });
  gsap.set(title.value?.querySelectorAll(".oval-line, .oval-char") ?? [], { yPercent: -40 });
  if ((window as unknown as { pageRevealed?: boolean }).pageRevealed) init();
  else window.addEventListener("page:revealed", onRevealed, { once: true });
});

onBeforeUnmount(() => {
  window.removeEventListener("page:revealed", onRevealed);
  clip?.kill();
  tweens.forEach((t) => t.kill());
});
</script>

<template>
  <div class="ot-hero" data-hero-animation-container>
    <div class="ot-hero-c">
      <h1 class="sr-only">Tax Consultant</h1>
      <div class="title-layout">
        <div class="title-w">
          <div class="title-rive-w">
            <div class="title-rive">
              <BrushPhrase :ref="setRive" :only="TAX_WORD" view-box="9 160 402 205" :autoplay="false" />
            </div>
          </div>
          <div ref="title" class="title" :aria-label="hero.title">
            <div class="oval-outer">
              <div class="oval-wrap">
                <div class="oval-line" aria-hidden="true">
                  <span v-for="(c, i) in chars" :key="i" class="oval-char">{{ c }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="info-grid grid-main">
          <div class="sub-w">
            <HighLines :ref="setHigh" manual class="stat-label hide-m" :html="hero.meta.nickname" />
            <div class="sub-col">
              <HighLines :ref="setHigh" manual class="stat-label" :html="hero.meta.age" />
              <div class="label-flex">
                <HighLines :ref="setHigh" manual class="stat-label" :html="hero.meta.hometown" />
                <div class="flag is-sm"><img src="/images/on-track/calendar/flag-usa.svg" alt="US Flag" /></div>
              </div>
            </div>
          </div>
        </div>

        <div class="stats-grid grid-main">
          <div class="stats-w">
            <div class="spacer" />
            <div class="stats-layout">
              <div class="eyebrow-w is-grey">
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

              <div class="ui-w">
                <!-- Previous race card -->
                <div class="ui-sec hide-m">
                  <svg class="ui-sec-outline" width="100%" height="100%" viewBox="0 0 119 244" fill="none" aria-hidden="true">
                    <path
                      d="M118.5 6v232a5.5 5.5 0 0 1-5.5 5.5H6A5.5 5.5 0 0 1 .5 238V25A5.5 5.5 0 0 1 6 19.5h46.346c4.695 0 9.167-2 12.297-5.498l7.46-8.337A15.5 15.5 0 0 1 83.653.5H113a5.5 5.5 0 0 1 5.5 5.5Z"
                      stroke="currentColor"
                    />
                  </svg>
                  <div class="ui-top">
                    <HighLines :ref="setHigh" manual class="eyebrow" :html="hero.previous.label" />
                  </div>
                  <div class="ui-row is-1">
                    <div class="circuit-rive-w">
                      <div class="circuit-rive">
                        <RiveCanvas
                          file="circuits"
                          artboard="circuits"
                          state-machine="circuits"
                          exclusive
                          :inputs="circuitInputs(hero.previous.circuit)"
                        />
                      </div>
                    </div>
                    <div class="eyebrow-w gap-quarter">
                      <HighLines v-for="w in hero.previous.name" :key="w" :ref="setHigh" manual class="eyebrow" :html="w" />
                    </div>
                  </div>
                  <div class="ui-line" />
                  <div class="ui-row is-2" @mouseenter="hoverTrack = hero.previous.hoverTrack" @mouseleave="hoverTrack = null">
                    <HighLines
                      :ref="setHigh"
                      manual
                      class="stat-label is-position"
                      :html="`${hero.previous.position}<strong>${hero.previous.suffix}</strong>`"
                    />
                  </div>
                </div>

                <!-- Current round -->
                <div class="box1">
                  <div class="ui-top is-abs">
                    <div class="eyebrow-w">
                      <HighLines :ref="setHigh" manual class="eyebrow" :html="hero.current.label" />
                    </div>
                  </div>
                  <div class="box1-layout">
                    <div class="box1-row is-1">
                      <div class="box1-item is-1">
                        <HighLines :ref="setHigh" manual class="stat-label" html="Rnd." />
                        <div class="stat-label">{{ hero.current.round }}</div>
                        <div class="img-fill is-2" />
                      </div>
                      <div class="box1-item is-2">
                        <div class="flag is-md"><img :src="hero.current.flag" alt="" /></div>
                        <HighLines :ref="setHigh" manual class="eyebrow" :html="hero.current.city" />
                      </div>
                    </div>
                    <div class="box1-row is-2">
                      <div class="helmet-rive">
                        <RiveCanvas
                          :ref="setRive"
                          file="reef"
                          artboard="helmet-reef"
                          state-machine="helmet-reef_play"
                          :inputs="{ 'color_grey-on-track': true }"
                          :autoplay="false"
                        />
                      </div>
                      <div class="eyebrow-w is-team">
                        <HighLines :ref="setHigh" manual class="eyebrow" :html="hero.current.team" />
                      </div>
                    </div>
                  </div>
                  <svg class="box1-frame" width="100%" height="100%" viewBox="0 0 276 244" fill="none" aria-hidden="true">
                    <path
                      d="M275 .5v243H6A5.5 5.5 0 0 1 .5 238V25A5.5 5.5 0 0 1 6 19.5h46.346c4.695 0 9.167-2 12.297-5.498l7.46-8.337A15.5 15.5 0 0 1 83.653.5H275Z"
                      stroke="currentColor"
                    />
                  </svg>
                </div>

                <div class="img-fill is-1" />

                <!-- Circuit, "4", signature -->
                <div class="box2">
                  <div class="box2-col-1">
                    <div class="box2-rive-w">
                      <OutletIcon :src="hero.current.outline" color="#b9bbad" />
                    </div>
                    <div class="box2-flag">
                      <div>
                        <div class="eyebrow-w is-row3">
                          <HighLines :ref="setHigh" manual class="eyebrow" :html="hero.current.country" />
                        </div>
                        <div class="eyebrow-w is-row3 is-alt">
                          <HighLines v-for="d in hero.current.dates" :key="d" :ref="setHigh" manual class="eyebrow" :html="d" />
                        </div>
                      </div>
                    </div>
                  </div>
                  <div class="box2-col-2">
                    <div class="box2-row is-1">
                      <svg class="box2-four" width="100%" height="100%" viewBox="0 0 37 49" fill="none" aria-hidden="true">
                        <path
                          d="m27.383 48.896 8.805-36.547c.424-1.678-.83-2.564-2.263-2.564h-7.003a.272.272 0 0 0-.264.207l-4.638 19.24a.264.264 0 0 1-.264.207h-9.493a.272.272 0 0 1-.264-.33l4.647-19.324 2.32-9.596A.242.242 0 0 1 19.153 0H8.888c.01.043.01.088 0 .132L.084 36.679c-.424 1.678.83 2.564 2.262 2.564l16.94.01a.271.271 0 0 1 .264.33l-2.244 9.257a.283.283 0 0 1-.113.16h10.19a.194.194 0 0 1 0-.104Z"
                          fill="currentColor"
                        />
                      </svg>
                    </div>
                    <div class="box2-row is-2">
                      <div class="signature-rive">
                        <SignatureDraw :ref="setRive" :autoplay="false" />
                      </div>
                    </div>
                  </div>
                </div>

                <div class="img-fill is-3" />
              </div>
            </div>
          </div>
          <div data-heroflip="pos1" class="helm-pos1" />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Reference metrics at 1440 px; 1u = clamp(992px, 100vw, 1920px) / 1728 × 16 = 13.33 px. */
.ot-hero {
  --gap: calc(var(--u) * 1.25);
  --grey: #b9bbad;
  --tint-1: #3b3c38;
  color: #f4f4ed;
}

.ot-hero-c {
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
  justify-content: flex-end;
  align-items: center;
}

/* "Tax" brush (402 x 205 viewBox) left of CONSULTANT, overlapping its first letter like the reference "ON". */
.title-rive-w {
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;
  height: calc(var(--u) * 10.8);
}

.title-rive {
  position: absolute;
  bottom: calc(var(--u) * -5.7);
  left: calc(var(--u) * -0.5);
  z-index: 10;
  display: flex;
  flex: none;
  width: calc(var(--u) * 26);
  height: calc(var(--u) * 13.26);
}

/* CONSULTANT is 6.48 em wide: 12.2u keeps it to ~79u, the reference TRACK's right-aligned slot. */
.title {
  flex: none;
  font-family: var(--font-mona);
  font-size: calc(var(--u) * 12.2);
  font-variation-settings: "wdth" 95, "wght" 700;
  line-height: 0.886;
  letter-spacing: calc(var(--u) * -0.1875);
  text-transform: uppercase;
  pointer-events: none;
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
  grid-column: 3 / span 2;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--gap);
}

.sub-col {
  display: flex;
  justify-content: space-between;
}

.label-flex {
  display: flex;
  gap: calc(var(--gap) * 0.5);
}

.stat-label {
  font-family: var(--font-mona);
  font-size: calc(var(--u) * 2.0625);
  font-variation-settings: "wdth" 75, "wght" 700;
  line-height: 0.97;
  letter-spacing: calc(var(--u) * -0.00625);
  text-transform: uppercase;
}

.flag {
  display: flex;
  border-radius: calc(var(--u) * 0.2);
  overflow: clip;
}

.flag img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.flag.is-sm {
  position: relative;
  top: calc(var(--u) * 0.2);
  height: calc(var(--u) * 0.9175);
}

.flag.is-sm img {
  width: auto;
}

.flag.is-md {
  width: calc(var(--u) * 2.12438);
  height: calc(var(--u) * 1.3125);
}

.stats-grid {
  position: relative;
  flex: 1;
  height: 100%;
  margin-top: auto;
}

.stats-w {
  grid-column: 3 / span 2;
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
  overflow: clip;
}

.eyebrow-w.is-grey {
  color: var(--grey);
}

.eyebrow-w.gap-quarter {
  gap: calc(var(--gap) * 0.25);
}

.eyebrow {
  letter-spacing: 0; /* global .eyebrow adds 0.08em; reference .text-eyebrow is 0 */
  font-family: var(--font-mona);
  font-size: calc(var(--u) * 0.625);
  font-variation-settings: "wght" 700, "wdth" 100;
  line-height: 1;
  text-transform: uppercase;
}

/* Left-aligned blocks: lines start at the left edge (HighLines centres by default). */
.stat-label :deep(.line),
.eyebrow :deep(.line),
.body-lg :deep(.line) {
  margin-inline: 0;
}

.para-w {
  max-width: calc(var(--u) * 41);
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

.body-lg :deep(strong) {
  font-family: var(--font-brier);
  font-weight: 700;
  font-variation-settings: normal;
  color: var(--color-lime);
}

.ui-w {
  position: relative;
  display: flex;
  height: calc(var(--u) * 15.1875);
  margin-top: calc(var(--gap) * 2);
}

/* Previous race */
.ui-sec {
  position: relative;
  z-index: 10;
  width: calc(var(--u) * 7.4375);
  height: calc(var(--u) * 15.25);
  color: var(--tint-1);
  clip-path: ellipse(100% 120% at 50% 0);
}

.ui-sec-outline {
  position: absolute;
  inset: 0;
  z-index: -1;
}

.ui-top {
  position: relative;
  display: flex;
  justify-content: flex-start;
  align-items: flex-start;
  height: calc(var(--u) * 1.3);
  color: var(--grey);
}

.ui-top.is-abs {
  position: absolute;
  inset: 0 auto auto 0;
}

.ui-row {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: calc(var(--gap) * 0.5);
  height: calc(var(--u) * 6.9);
  color: #f4f4ed;
}

.ui-row.is-1 {
  justify-content: flex-start;
}

.circuit-rive-w {
  position: relative;
  height: calc(var(--u) * 4.7);
}

.circuit-rive {
  position: relative;
  display: flex;
  width: calc(var(--u) * 5.5);
  height: calc(var(--u) * 4.7);
  margin-inline: auto;
}

.ui-line {
  width: 80%;
  height: calc(var(--u) * 0.0625);
  margin-inline: auto;
  background-color: currentColor;
}

/* "5th": number and suffix as flex items, suffix 1.5u grey raised 0.4u (reference data-text-format="position"). */
.is-position :deep(.line) {
  display: flex;
}

.is-position :deep(strong) {
  position: relative;
  top: calc(var(--u) * 0.4);
  right: calc(var(--u) * -0.2);
  font-size: calc(var(--u) * 1.5);
  font-weight: 400;
  line-height: 1;
  color: var(--grey);
}

/* Current round */
.box1 {
  position: relative;
  display: flex;
  flex: none;
  width: calc(var(--u) * 17.2188);
  aspect-ratio: 275.5 / 244;
  margin-left: var(--gap);
}

.box1-layout {
  position: absolute;
  width: 100%;
  height: 100%;
  mask: url("/images/on-track/ui-box1-fill.svg") center / cover no-repeat;
}

.box1-row {
  display: flex;
  width: 100%;
  height: calc(var(--u) * 7.5);
  border-bottom: 1px solid var(--tint-1);
}

.box1-row.is-2 {
  justify-content: center;
  align-items: center;
  gap: var(--gap);
  height: calc(100% - var(--u) * 7.5);
}

.box1-item {
  display: flex;
  justify-content: center;
  align-items: center;
  width: calc(var(--u) * 8.7);
  overflow: clip;
}

.box1-item.is-1 {
  position: relative;
  padding-top: calc(var(--u) * 0.8);
}

.box1-item.is-2 {
  flex-direction: column;
  gap: calc(var(--gap) * 0.5);
}

.helmet-rive {
  position: relative;
  display: flex;
  width: calc(var(--u) * 6.0625);
  height: calc(var(--u) * 3.1875);
}

.eyebrow-w.is-team {
  justify-content: flex-start;
  align-items: flex-start;
  max-width: calc(var(--u) * 6);
  text-align: left;
}

.box1-frame {
  position: absolute;
  inset: 0;
  z-index: 2;
  display: flex;
  color: var(--tint-1);
  pointer-events: none;
}

.img-fill {
  position: relative;
  background: url("/images/on-track/ui-pattern.webp") 50% / auto 130% no-repeat;
}

.img-fill.is-1,
.img-fill.is-3 {
  flex: none;
  width: var(--gap);
  border-top: 1px solid var(--tint-1);
  border-bottom: 1px solid var(--tint-1);
}

.img-fill.is-2 {
  position: absolute;
  inset: 0;
  z-index: -1;
  width: 100%;
  height: 100%;
  border-right: 1px solid var(--tint-1);
  background-size: 220%;
}

.img-fill.is-3 {
  border-right: 1px solid var(--tint-1);
  border-top-right-radius: calc(var(--u) * 0.375);
  border-bottom-right-radius: calc(var(--u) * 0.375);
}

/* Circuit, "4", signature */
.box2 {
  position: relative;
  display: flex;
  width: calc(var(--u) * 24);
  height: 100%;
  border: 1px solid var(--tint-1);
}

.box2-col-1 {
  display: flex;
  flex: none;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: var(--gap);
  width: calc(var(--u) * 16.1875);
  border-right: 1px solid var(--tint-1);
}

.box2-rive-w {
  position: relative;
  display: flex;
  width: 80%;
  height: 60%;
}

.box2-flag {
  display: flex;
  gap: var(--gap);
  text-align: center;
}

.eyebrow-w.is-row3 {
  justify-content: flex-start;
  align-items: flex-start;
  gap: calc(var(--gap) * 0.25);
  max-width: calc(var(--u) * 6);
  text-align: left;
}

.eyebrow-w.is-row3.is-alt {
  justify-content: center;
  text-align: center;
}

.box2-col-2 {
  width: 100%;
}

.box2-row {
  display: flex;
  justify-content: center;
  align-items: center;
}

.box2-row.is-1 {
  height: 60%;
  border-bottom: 1px solid var(--tint-1);
  color: var(--color-lime);
}

.box2-row.is-2 {
  height: 40%;
}

.box2-four {
  display: flex;
  height: calc(var(--u) * 3.125);
}

.signature-rive {
  position: relative;
  display: flex;
  height: calc(var(--u) * 4.5);
  aspect-ratio: 133 / 72;
  margin-inline: auto;
  transform: scale(1.3);
}

.helm-pos1 {
  position: absolute;
  inset: calc(var(--u) * -14) auto auto calc(var(--u) * -29);
  width: calc(var(--u) * 77.5625);
  height: calc(var(--u) * 66);
  pointer-events: auto;
}
/* Reference ≤479 (live at 375 px; 1u = the phone rem, vw / 36). One phone layout for ≤767. */
@media (max-width: 767px) {
  .hide-m {
    display: none;
  }

  .ot-hero-c {
    height: 100vh;
    padding: calc(var(--u) * 6.375) var(--u) 0; /* reference --padding--container: 1rem */
  }

  .title-layout {
    min-height: auto;
  }

  /* Phone: "Tax" brush on its own row, CONSULTANT full width under it (6.32 em → 34u). */
  .title-w {
    flex-direction: column;
    align-items: flex-start;
  }

  .title-rive-w {
    height: calc(var(--u) * 6);
  }

  .title-rive {
    inset: auto auto calc(var(--u) * -2.2) calc(var(--u) * -0.4);
    width: calc(var(--u) * 15);
    height: auto;
    aspect-ratio: 402 / 205;
  }

  .title {
    font-size: calc(var(--u) * 5.35);
  }

  .info-grid.grid-main {
    grid-template-columns: 23.55% 23.55%;
  }

  .sub-w {
    display: flex;
    justify-content: space-between;
    max-width: 100%;
  }

  .sub-col {
    width: 100%;
    max-width: 100%;
  }

  .stat-label {
    font-size: calc(var(--u) * 1.6);
  }

  .eyebrow {
    font-size: calc(var(--u) * 0.8);
  }

  .flag.is-md {
    border-radius: calc(var(--u) * 0.3);
  }

  .stats-grid.grid-main {
    display: flex;
    flex-direction: column;
    margin-top: 0;
  }

  .stats-w {
    grid-column-start: 1;
    justify-content: flex-start;
    align-items: flex-start;
    max-width: 100%;
    margin-top: auto;
  }

  .spacer {
    flex: 1;
    height: 100%;
    min-height: calc(var(--u) * 2);
    max-height: none;
  }

  .stats-layout {
    max-width: 100%;
  }

  .para-w {
    max-width: 100%;
    margin-bottom: var(--u);
  }

  .body-lg :deep(strong) {
    font-size: calc(var(--u) * 1.9);
  }

  .ui-w {
    height: calc(var(--u) * 13.3);
    margin-top: 0;
  }

  .img-fill.is-1 {
    width: var(--u);
  }

  .box1 {
    width: calc(var(--u) * 14.9);
    height: 100%;
    aspect-ratio: auto;
    margin-left: 0;
  }

  .box1-item.is-1,
  .box1-item.is-2 {
    width: calc(var(--u) * 7);
  }

  .box2 {
    width: auto;
  }

  .box2-col-1 {
    width: calc(var(--u) * 12);
  }

  .box2-row.is-1 {
    padding-inline: calc(var(--u) * 1.1);
  }

  .signature-rive {
    position: absolute;
    height: calc(var(--u) * 4);
  }

  .helm-pos1 {
    position: relative;
    inset: 0 auto auto;
    flex: none;
    width: 100%;
    height: auto;
    aspect-ratio: 77.5625 / 66;
    margin-top: calc(var(--u) * -3);
    pointer-events: none;
  }
}
</style>
