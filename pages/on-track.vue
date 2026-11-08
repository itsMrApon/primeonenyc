<script setup lang="ts">
import type { HeroScrollTarget } from "~/composables/useHomeScroll";
import content from "~/content/on-track.json";
import type { Experience } from "~/webgl/Experience";

/**
 * On Track page (reference /on-track). Built section by section; see
 * .reanimate/on-track/index.json for the reference capture.
 * Stacking like the reference: hero + impact group (z 3) < GL canvas (z 5: the
 * flying helmet, the calendar circuits) < every later section (one z 10 group) < nav.
 */
useHead({ title: "On Track", htmlAttrs: { class: "is-on-track" } });

const getExperience = () => (window as unknown as { experience?: Experience }).experience ?? null;
useHomeScroll({ getExperience: () => getExperience() as unknown as HeroScrollTarget | null });

const track = ref<HTMLElement | null>(null);
useHelmetFlip(track, getExperience);
</script>

<template>
  <main class="on-track">
    <div ref="track" class="helmet-track" data-nav-theme-target="light">
      <OnTrackHero />
      <OnTrackImpact />
    </div>
    <div class="group-z10" data-nav-theme-target="light">
      <OnTrackPodiums />
      <OnTrackHighlights />
      <OnTrackHorizontalTrack data-nav-theme-target="light" />
      <OnTrackPreF1Career />
      <OnTrackCountdown />
      <OnTrackCalendar />
      <OnTrackOtotEnd />
      <div class="group-bg-black">
        <HomeHelmetsHall class="helmets-z6" :helmets="content.helmets" :callout="false" accent="#b9bbad" lift-on-phones />
        <HomeSocialsSection class="socials-z5" :socials="content.socials" dark />
        <OnTrackCallout />
      </div>
      <HomeSiteFooter dark />
    </div>
  </main>
</template>

<style scoped>
.on-track {
  position: relative;
  overflow-x: clip; /* reference .page-w overflow-clip="x": wide parts never widen the phone viewport */
  background-color: #111112;
  color: #f4f4ed;
}

.helmet-track {
  position: relative;
  z-index: 3;
}

.group-z10 {
  position: relative;
  z-index: 10;
}

/* Reference .s-group.bg-black: helmets (z 6), socials callout (z 5), callout. */
.group-bg-black {
  background-color: #111112;
}

.helmets-z6 {
  position: relative;
  z-index: 6;
}

.socials-z5 {
  position: relative;
  z-index: 5;
}

/* On-track reference ≤479: title margin 2.5u + spacer 8.75u above the helmet grid (home uses 8.5u). */
@media (max-width: 767px) {
  .helmets-z6 :deep(.helmet-grid) {
    margin-top: calc(var(--u) * 11.25);
  }

  /* Grey Brier (.text-title-lg-brier) is 2.6rem on phones; home's lime-off variant is 2.4rem. */
  .helmets-z6 :deep(.t-mona) {
    letter-spacing: calc(var(--u) * -0.125);
  }

  .helmets-z6 :deep(.t-mona strong) {
    font-size: calc(var(--u) * 2.6);
  }
}
</style>

<style>
html.is-on-track body {
  background: #111112;
}

/* Let the GL canvas sit between the page content and the nav (reference gl-wrap z 5). */
html.is-on-track .overlay-root {
  z-index: auto;
}

html.is-on-track .webgl-canvas {
  z-index: 5;
}
</style>
