<script setup lang="ts">
import type { HeroScrollTarget } from "~/composables/useHomeScroll";

useHomeScroll({
  getExperience: () => (window as unknown as { experience?: HeroScrollTarget }).experience ?? null
});
</script>

<template>
  <main class="home">
    <HomeHeroSection />
    <HomeImpactSection />
    <HomeHorizontalTrack />
    <HomeOnOffTrack />
    <HomeHelmetsHall />
    <HomeStoreChampion />
    <HomePartnersMarquee />
    <HomeSocialsSection />
    <HomeSiteFooter />
  </main>
</template>

<style scoped>
.home {
  position: relative;
  z-index: 1;
}
</style>
