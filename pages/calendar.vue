<script setup lang="ts">
import type { HeroScrollTarget } from "~/composables/useHomeScroll";
import type { Experience } from "~/webgl/Experience";

/**
 * Calendar page (reference /calendar): calendar hero, the Tax Consultant calendar card
 * (keeps its "upcominG 2026 schedule" title) with the services calendar above its upcoming
 * list, "Services / & forms", the countdown and the footer.
 * Stacking like /tax-consultant: GL canvas (z 5: the calendar circuits) < every section
 * (one z 10 group) < nav.
 */
useHead({ title: "Calendar", htmlAttrs: { class: "is-calendar" } });

const getExperience = () => (window as unknown as { experience?: Experience }).experience ?? null;
useHomeScroll({ getExperience: () => getExperience() as unknown as HeroScrollTarget | null });

const services = useServices();
</script>

<template>
  <main class="calendar-page">
    <div class="group-z10" data-nav-theme-target="light">
      <CalendarHero />
      <OnTrackCalendar start="multilingual">
        <template #before-list>
          <CalendarSeasonList v-if="services" :data="services" />
        </template>
      </OnTrackCalendar>
      <CalendarServiceForms v-if="services" :data="services" />
      <OnTrackCountdown />
      <HomeSiteFooter dark />
    </div>
  </main>
</template>

<style scoped>
.calendar-page {
  position: relative;
  overflow-x: clip;
  background-color: #111112;
  color: #f4f4ed;
}

.group-z10 {
  position: relative;
  z-index: 10;
}
</style>

<style>
html.is-calendar body {
  background: #111112;
}

/* Let the GL canvas sit between the page content and the nav (reference gl-wrap z 5). */
html.is-calendar .overlay-root {
  z-index: auto;
}

html.is-calendar .webgl-canvas {
  z-index: 5;
}
</style>
