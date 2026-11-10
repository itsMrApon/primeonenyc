<script setup lang="ts">
/**
 * On Track minis callout (reference `.c.is-callout`): same pattern as home's helmets callout —
 * reef helmet Rive (helmet-reef_scroll, color_lime) scrubbed by scroll ("top bottom" →
 * "bottom center" of the section, input scroll = progress × 1000, scrub 0.5), Brier line with
 * a lime highlighter, lime CTA to the store. See .reanimate/on-track/11-callout/spec.md.
 */
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import content from "~/content/on-track.json";

const c = content.callout;
const section = ref<HTMLElement | null>(null);
const reefScroll = ref(0);
let tween: gsap.core.Tween | null = null;

onMounted(() => {
  gsap.registerPlugin(ScrollTrigger);
  const state = { p: 0 };
  tween = gsap.to(state, {
    p: 1,
    ease: "none",
    onUpdate: () => (reefScroll.value = state.p * 1000),
    scrollTrigger: { trigger: section.value, start: "top bottom", end: "bottom center", scrub: 0.5 }
  });
});

onBeforeUnmount(() => {
  tween?.scrollTrigger?.kill();
  tween?.kill();
});
</script>

<template>
  <section ref="section" class="ot-callout">
    <div class="callout-layout">
      <div class="callout-icon">
        <RiveCanvas
          file="reef"
          artboard="helmet-reef"
          state-machine="helmet-reef_scroll"
          :inputs="{ color_lime: true, scroll: reefScroll }"
        />
      </div>
      <HighLines class="callout-text" :html="c.text" />
      <BtnPrimary :label="c.cta.label" :href="c.cta.href" target="_blank" />
    </div>
  </section>
</template>

<style scoped>
/* Reference metrics at 1440 px; 1u = 13.33 px. */
.ot-callout {
  display: flex;
  justify-content: center;
  padding: calc(var(--u) * 12) calc(var(--u) * 1.25) calc(var(--u) * 8.75);
  color: #f4f4ed;
}

.callout-layout {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: calc(var(--u) * 2.5);
}

.callout-icon {
  width: calc(var(--u) * 5.625);
  height: calc(var(--u) * 2.775);
}

.callout-text {
  width: calc(var(--u) * 32.5);
  font-family: "Brier", serif;
  font-size: calc(var(--u) * 2);
  font-weight: 700;
  line-height: 1.04;
  letter-spacing: calc(var(--u) * 0.05);
  text-align: center;
}
/* Same phone sizes as home's helmets callout (reference ≤479). */
@media (max-width: 767px) {
  .callout-text {
    width: calc(var(--u) * 29);
    font-size: calc(var(--u) * 1.7);
  }
}
</style>
