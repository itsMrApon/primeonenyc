<script setup lang="ts">
import type { HeroScrollTarget } from "~/composables/useHomeScroll";

import content from "~/content/off-track.json";

/**
 * NYC Insurance page, served at /nyc-insurance (reference /off-track): the hero + impact group
 * with the flying photo (reference .s-group, [data-heroflip="track"]), the calendar card and the
 * podiums / career section (both shared with /tax-consultant, in their light variants), then the
 * home "What's up on socials" and footer (both the reference's light variants).
 * GL: the calendar outlets only (like /calendar), in light mode; the canvas (z 5) sits over the
 * page and under the calendar section (z 15).
 */
useHead({ title: "NYC Insurance", htmlAttrs: { class: "is-off-track" } });

useHomeScroll({
  getExperience: () => (window as unknown as { experience?: HeroScrollTarget }).experience ?? null
});

const track = ref<HTMLElement | null>(null);
const img = ref<HTMLElement | null>(null);
const images = content.hero.images;
useHeroImageFlip(track, img);
</script>

<template>
  <main class="off-track">
    <div ref="track" class="track" data-nav-theme-target="dark">
      <OffTrackHero />
      <OffTrackImpact />
      <!-- Reference .off-t-hero-img: one photo per tenth of the flight. -->
      <div ref="img" class="hero-img" aria-hidden="true">
        <div
          v-for="(src, i) in images"
          :key="src"
          data-layer
          class="hero-img-layer"
          :style="{ backgroundImage: `url(${src})`, zIndex: images.length - i, opacity: i === 0 ? 1 : 0 }"
        />
      </div>
    </div>
    <div data-nav-theme-target="dark">
      <OnTrackCalendar light start="english" />
      <OnTrackPodiums light />
    </div>
    <HomeSocialsSection />
    <HomeSiteFooter />
  </main>
</template>

<style scoped>
/* Reference .taxi-w.off-track: off-white page, dark-green text. */
.off-track {
  position: relative;
  overflow-x: clip;
  background-color: #f4f4ed;
  color: #282c20;
}

.track {
  position: relative;
}

.hero-img {
  position: absolute;
  top: 0;
  left: 0;
  z-index: 10;
  pointer-events: none;
}

.hero-img-layer {
  position: absolute;
  inset: 0;
  background-position: center;
  background-size: cover;
}
</style>

<style>
html.is-off-track body {
  background: #f4f4ed;
}

/* Let the GL canvas sit between the page content and the calendar (reference gl-wrap z 5). */
html.is-off-track .overlay-root {
  z-index: auto;
}

html.is-off-track .webgl-canvas {
  z-index: 5;
}
</style>
