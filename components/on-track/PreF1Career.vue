<script setup lang="ts">
/**
 * On Track "pre-F1 career" (reference section after the horizontal track; .f1-car-img-w,
 * .pre-f1-car-stats-grid). See .reanimate/on-track/05-f1-car/spec.md.
 *   - Title / paragraph highlighters (paragraph <br>s = the reference's frozen lines).
 *   - Photo 28.5625u tall (407 / 457): image highlight "top, lime" (bundle fJ, "top 80%").
 *   - 2 × 4 stats: reef Rive (reef_play, bundle CH "top 80%") 3.75u square, pulled −5.25u
 *     left of each item; title 1.5u wdth 75; year descriptor with a highlighter.
 * Desktop only: the reference's mobile photo (.f1-car-img-w.mobile) is not rebuilt.
 */
import gsap from "gsap";

import content from "~/content/on-track.json";

const p = content.preF1;

const imgWrap = ref<HTMLElement | null>(null);
const imgReveal = ref<HTMLElement | null>(null);
let tl: gsap.core.Timeline | null = null;

onMounted(() => {
  gsap.set(imgWrap.value, { clipPath: "ellipse(120% 0% at 50% 0%)" });
  gsap.set(imgReveal.value, { clipPath: "ellipse(120% 120% at 50% 100%)" });
  tl = gsap.timeline({ scrollTrigger: { trigger: imgWrap.value, start: "top 80%", once: true } });
  tl.to(imgWrap.value, { clipPath: "ellipse(120% 120% at 50% 0%)", duration: 0.8, ease: "power2.out" });
  tl.to(imgReveal.value, { clipPath: "ellipse(120% 0% at 50% 100%)", duration: 0.6, ease: "power2.out" }, "-=0.4");
});

onBeforeUnmount(() => {
  tl?.scrollTrigger?.kill();
  tl?.kill();
});
</script>

<template>
  <section class="ot-pref1">
    <div class="c">
      <div class="spacer h14" />
      <div class="grid-main">
        <div class="headline-w">
          <HighLines tag="h2" class="title-lg" :html="p.title" />
        </div>
        <div class="para-w">
          <HighLines tag="p" class="body-reg" :html="p.body" />
        </div>
      </div>
      <div class="spacer h5" />
      <div class="grid-main">
        <div class="img-col">
          <div class="car-img-w">
            <div ref="imgWrap" class="img-hl">
              <img class="car-img" :src="p.image.src" :alt="p.image.alt" />
              <div ref="imgReveal" class="img-hl-reveal" />
            </div>
          </div>
        </div>
        <div class="stats-list">
          <div class="stats-grid">
            <div v-for="s in p.stats" :key="s.title" class="stat">
              <div class="reef">
                <RiveCanvas
                  file="reef"
                  artboard="reef"
                  state-machine="reef_play"
                  :inputs="{ [`color_${s.color}`]: true }"
                  play-at="top 80%"
                />
              </div>
              <div class="stat-text">
                <div class="stat-label">{{ s.title }}</div>
                <div class="year-w">
                  <HighLines class="descriptor" :html="s.year" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="spacer h10" />
    </div>
  </section>
</template>

<style scoped>
/* Reference metrics at 1440 px; 1u = 13.33 px. */
.ot-pref1 {
  --gap: calc(var(--u) * 1.25);
  --grey: #b9bbad;
  position: relative;
  color: #f4f4ed;
}

.c {
  padding: 0 var(--gap);
}

.spacer.h14 {
  height: calc(var(--u) * 14);
}

.spacer.h5 {
  height: calc(var(--u) * 5);
}

.spacer.h10 {
  height: calc(var(--u) * 10);
}

.grid-main {
  display: grid;
  grid-template-columns: 23.55% 23.55% 23.55% 23.55%;
  column-gap: var(--gap);
  width: 100%;
}

.headline-w {
  grid-column: 1 / span 2;
  display: flex;
  justify-content: flex-start;
  align-items: flex-start;
}

.title-lg {
  margin: 0;
  font-family: var(--font-mona);
  font-size: calc(var(--u) * 4.5);
  font-weight: 700;
  font-variation-settings: "wght" 750, "wdth" 93;
  line-height: 0.886;
  letter-spacing: calc(var(--u) * -0.125);
  text-transform: uppercase;
}

.title-lg :deep(strong) {
  font-family: var(--font-brier);
  font-size: calc(var(--u) * 4.6875);
  font-weight: 700;
  line-height: 0.886;
  color: var(--grey);
}

.para-w {
  grid-column: 3;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  color: var(--grey);
}

.body-reg {
  margin: 0;
  font-family: var(--font-mona);
  font-size: calc(var(--u) * 1.25);
  font-weight: 400;
  font-variation-settings: "wght" 500, "wdth" 100;
  line-height: 1.25;
  letter-spacing: calc(var(--u) * -0.0125);
}

.title-lg :deep(.line),
.body-reg :deep(.line),
.descriptor :deep(.line) {
  margin-inline: 0;
}

.img-col {
  grid-column: 1 / span 2;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.car-img-w {
  height: calc(var(--u) * 28.5625);
  aspect-ratio: 407 / 457;
  overflow: clip;
}

.img-hl {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.car-img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.img-hl-reveal {
  position: absolute;
  inset: 0;
  z-index: 5;
  background-color: var(--color-lime);
}

.stats-list {
  grid-column: 3 / span 2;
}

.stats-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: calc(var(--gap) * 2) var(--gap);
}

.stat {
  display: flex;
  gap: var(--gap);
  justify-content: flex-start;
  align-items: flex-start;
}

.reef {
  position: absolute;
  display: flex;
  height: calc(var(--u) * 3.75);
  aspect-ratio: 1;
  transform: translateX(calc(var(--u) * -5.25));
}

.stat-text {
  display: flex;
  flex-direction: column;
  gap: calc(var(--gap) * 0.5);
  max-width: calc(var(--u) * 12);
}

.stat-label {
  font-family: var(--font-mona);
  font-size: calc(var(--u) * 1.5);
  font-variation-settings: "wght" 700, "wdth" 75;
  line-height: 1;
  text-transform: uppercase;
}

.year-w {
  position: relative;
  z-index: 5;
  display: flex;
  gap: calc(var(--gap) * 0.5);
  max-width: calc(var(--u) * 6.8125);
  color: var(--grey);
}

.descriptor {
  font-family: var(--font-mona);
  font-size: var(--u);
  font-variation-settings: "wght" 800, "wdth" 87.5;
  line-height: 0.97;
  text-transform: uppercase;
}
</style>
