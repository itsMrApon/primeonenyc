<script setup lang="ts">
const content = useHomeContent();
</script>

<template>
  <section class="section otot">
    <div class="container otot__grid">
      <div class="otot__col reveal" data-reveal>
        <h2 class="otot__title">
          <span class="text-brier text-impact-lg">{{ content.onOffTrack.on.titleTop }}</span>
          <span class="text-impact-lg">{{ content.onOffTrack.on.titleBottom }}</span>
        </h2>
        <p class="text-body" v-html="content.onOffTrack.on.body" />
        <a class="btn btn--ghost" :href="content.onOffTrack.on.href">Explore</a>
        <img
          class="otot__img"
          :src="content.onOffTrack.on.image"
          :alt="content.onOffTrack.on.imageAlt"
          loading="lazy"
        />
      </div>

      <div class="otot__col is-off reveal" data-reveal>
        <h2 class="otot__title">
          <span class="text-brier text-impact-lg">{{ content.onOffTrack.off.titleTop }}</span>
          <span class="text-impact-lg">{{ content.onOffTrack.off.titleBottom }}</span>
        </h2>
        <p class="text-body" v-html="content.onOffTrack.off.body" />
        <a class="btn btn--ghost" :href="content.onOffTrack.off.href">Explore</a>
        <img
          class="otot__img"
          :src="content.onOffTrack.off.image"
          :alt="content.onOffTrack.off.imageAlt"
          loading="lazy"
        />
      </div>
    </div>
  </section>
</template>

<style scoped>
.otot {
  background: var(--color-white);
  color: var(--color-dark-green);
  overflow: clip;
}

.otot__grid {
  display: grid;
  gap: 3rem;
}

@media (min-width: 900px) {
  .otot__grid {
    grid-template-columns: 1fr 1fr;
    gap: 2rem;
    align-items: start;
  }
}

.otot__col {
  display: grid;
  gap: 1.25rem;
  justify-items: start;
}

.otot__title {
  display: grid;
  line-height: 0.92;
}

.otot__img {
  width: min(100%, 420px);
  margin-top: 1rem;
  mix-blend-mode: multiply;
}
</style>
