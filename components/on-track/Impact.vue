<script setup lang="ts">
/**
 * On Track impact (reference .impact-content-w.on-track), second half of the
 * helmet-flight track. See .reanimate/on-track/01-impact/spec.md.
 *   - Signature (SignatureDraw, grey) written on at "top 80%" (bundle CH: signature.riv); eyebrow + quote highlighters (lime).
 *   - [data-heroflip="pos2"] centred on the quote, raised 13u; "pos3" over the
 *     reef Rive: where the GL helmet passes and lands (useHelmetFlip).
 *   - reef.riv 3d-helmet-reef_scroll: scroll = progress × 1000 over
 *     ".on-track-impact-reef-rive-w" "top bottom" → "bottom center", scrub 0.5.
 */
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import content from "~/content/on-track.json";

const impact = content.impact;
const reefWrap = ref<HTMLElement | null>(null);
const reefInputs = reactive({ color_lime: true, scroll: 0 });
let trigger: ScrollTrigger | null = null;
let scrub: gsap.core.Tween | null = null;

onMounted(() => {
  gsap.registerPlugin(ScrollTrigger);
  const state = { p: 0 };
  scrub = gsap.to(state, {
    p: 1,
    ease: "none",
    paused: true,
    onUpdate: () => (reefInputs.scroll = gsap.utils.clamp(0, 1, state.p) * 1000)
  });
  trigger = ScrollTrigger.create({
    trigger: reefWrap.value,
    start: "top bottom",
    end: "bottom center",
    scrub: 0.5,
    animation: scrub,
    onEnter: () => (reefInputs.scroll = 0),
    onLeave: () => (reefInputs.scroll = 1000),
    onLeaveBack: () => (reefInputs.scroll = 0)
  });
});

onBeforeUnmount(() => {
  trigger?.kill();
  scrub?.kill();
});
</script>

<template>
  <section class="ot-impact">
    <div class="impact-content">
      <div class="impact-icon">
        <div class="signature-rive">
          <SignatureDraw play-at="top 80%" />
        </div>
        <div class="eyebrow-w">
          <HighLines class="eyebrow" :html="impact.eyebrow" />
        </div>
      </div>
      <div class="text-w">
        <div class="text-inner">
          <HighLines class="quote" :html="impact.html" />
          <div data-heroflip="pos2" class="helm-pos2" />
        </div>
        <div ref="reefWrap" class="reef-rive-w">
          <div class="reef-rive">
            <RiveCanvas file="reef" artboard="3d-helmet-reef" state-machine="3d-helmet-reef_scroll" :inputs="reefInputs" />
          </div>
          <div data-heroflip="pos3" class="helm-pos3" />
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
/* Reference metrics at 1440 px; 1u = 13.33 px. */
.ot-impact {
  --gap: calc(var(--u) * 1.25);
}

.impact-content {
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: center;
  gap: calc(var(--gap) * 3);
  max-width: calc(var(--u) * 78);
  margin-inline: auto;
  padding-top: calc(var(--u) * 18);
  color: #dde1d2;
  text-align: center;
}

.impact-icon {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: var(--gap);
}

.signature-rive {
  position: relative;
  display: flex;
  height: calc(var(--u) * 4.5);
  aspect-ratio: 133 / 72;
  margin-inline: auto;
}

.eyebrow-w {
  display: flex;
  justify-content: center;
  gap: calc(var(--gap) * 0.5);
  color: #b9bbad;
  overflow: clip;
}

.eyebrow {
  letter-spacing: 0; /* global .eyebrow adds 0.08em; reference .text-eyebrow is 0 */
  font-family: var(--font-mona);
  font-size: calc(var(--u) * 0.625);
  font-variation-settings: "wght" 700, "wdth" 100;
  line-height: 1;
  text-transform: uppercase;
}

.text-w {
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: center;
}

.text-inner {
  display: flex;
  justify-content: center;
  align-items: center;
}

.quote {
  margin-bottom: calc(var(--u) * 6.25);
  font-family: var(--font-mona);
  font-size: calc(var(--u) * 7.9375);
  font-variation-settings: "wght" 660, "wdth" 93;
  line-height: 90.6%;
  letter-spacing: calc(var(--u) * -0.0625);
  text-transform: uppercase;
}

.quote :deep(strong) {
  font-family: var(--font-brier);
  font-size: calc(var(--u) * 8.25);
  font-weight: 700;
  line-height: 83%;
  letter-spacing: calc(var(--u) * -0.1875);
  color: #b9bbad;
}

.helm-pos2 {
  position: absolute;
  width: calc(var(--u) * 32);
  height: calc(var(--u) * 27.625);
  transform: translate(0, calc(var(--u) * -13));
}

.reef-rive-w {
  position: relative;
}

.reef-rive {
  position: relative;
  display: flex;
  width: calc(var(--u) * 11.5);
  aspect-ratio: 184 / 81;
  margin-inline: auto;
  color: var(--color-lime);
}

.helm-pos3 {
  position: absolute;
  inset: 0 20%;
  z-index: 10;
  transform: translate(0, calc(var(--u) * -1));
}
/* Reference ≤479 (live at 375 px; 1u = the phone rem). */
@media (max-width: 767px) {
  .impact-content {
    max-width: none;
    padding-inline: var(--gap);
  }

  .eyebrow {
    font-size: calc(var(--u) * 0.8);
  }

  .quote {
    font-size: calc(var(--u) * 3.5);
    line-height: 0.9;
  }

  .quote :deep(strong) {
    font-size: calc(var(--u) * 3.5);
  }

  .reef-rive {
    width: calc(var(--u) * 9);
  }
}
</style>
