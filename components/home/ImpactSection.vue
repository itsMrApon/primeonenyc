<script setup lang="ts">
const content = useHomeContent();
</script>

<template>
  <section class="section impact">
    <div class="container impact__inner">
      <p class="eyebrow c-lime reveal" data-reveal>{{ content.impact.eyebrow }}</p>
      <div
        class="text-impact impact__quote reveal"
        data-reveal
        v-html="content.impact.html"
      />
    </div>
  </section>
</template>

<style scoped>
.impact {
  background: var(--color-dark-green);
  color: var(--color-white);
  padding-block: clamp(5rem, 14vh, 9rem);
}

.impact__inner {
  display: grid;
  gap: 1.5rem;
  max-width: 18ch;
}

@media (min-width: 768px) {
  .impact__inner {
    max-width: 22ch;
  }
}

.impact__quote {
  font-weight: 500;
}

.impact__quote :deep(strong) {
  color: var(--color-lime);
  font-weight: 700;
}
</style>
