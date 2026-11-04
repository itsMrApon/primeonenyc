<script setup lang="ts">
useHomeScroll({
  getExperience: () => {
    const exp = (window as unknown as { experience?: { setHeroVisible: (v: boolean) => void } })
      .experience;
    return exp ?? null;
  }
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
