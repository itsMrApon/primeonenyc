<script setup lang="ts">
/**
 * On Track closing photo (reference section[data-otot-bottom].is-otot-end, bundle k$):
 * a 100vh window onto a 120vh cover photo that drifts up 20vh and grows to 1.1 while the
 * section crosses the screen (top bottom → bottom top, scrub, linear).
 * See .reanimate/on-track/08-otot-end/spec.md.
 */
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import content from "~/content/on-track.json";

const end = content.end;
const section = ref<HTMLElement | null>(null);
const img = ref<HTMLImageElement | null>(null);
let tween: gsap.core.Tween | null = null;

onMounted(() => {
  gsap.registerPlugin(ScrollTrigger);
  tween = gsap.to(img.value, {
    y: "-20vh",
    scale: 1.1,
    ease: "none",
    scrollTrigger: { trigger: section.value, start: "top bottom", end: "bottom top", scrub: true }
  });
});

onBeforeUnmount(() => {
  tween?.scrollTrigger?.kill();
  tween?.kill();
});
</script>

<template>
  <section ref="section" class="ot-end">
    <div class="img-w">
      <img ref="img" class="img" :src="end.src" :alt="end.alt" />
    </div>
  </section>
</template>

<style scoped>
.ot-end {
  position: relative;
  z-index: 10;
}

.img-w {
  position: relative;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  min-height: 100vh;
  overflow: clip;
}

.img {
  position: absolute;
  width: 100%;
  height: 120vh;
  object-fit: cover;
}
/* Reference ≤479: a 60vh window onto an 80vh photo. */
@media (max-width: 767px) {
  .img-w {
    min-height: 60vh;
  }

  .img {
    height: 80vh;
  }
}
</style>
