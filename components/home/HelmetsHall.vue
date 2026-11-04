<script setup lang="ts">
const content = useHomeContent();
</script>

<template>
  <section class="section helmets">
    <div class="container">
      <header class="helmets__header reveal" data-reveal>
        <p class="eyebrow c-lime">{{ content.helmets.eyebrow }}</p>
        <h2 class="text-impact text-brier c-lime">{{ content.helmets.title }}</h2>
        <p class="text-body">{{ content.helmets.body }}</p>
      </header>

      <div class="helmets__grid">
        <article
          v-for="item in content.helmets.items"
          :key="`${item.year}-${item.name}`"
          class="helmet-card reveal"
          data-reveal
        >
          <div class="helmet-card__media">
            <img :src="item.src" :alt="`${item.name} ${item.year}`" loading="lazy" />
          </div>
          <div class="helmet-card__meta">
            <h3>{{ item.name }}</h3>
            <p class="eyebrow">{{ item.year }}</p>
          </div>
        </article>
      </div>
    </div>
  </section>
</template>

<style scoped>
.helmets {
  background: var(--color-dark-green);
  color: var(--color-white);
}

.helmets__header {
  display: grid;
  gap: 1rem;
  margin-bottom: clamp(2rem, 6vh, 4rem);
  max-width: 46ch;
}

.helmets__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: clamp(1rem, 2vw, 1.75rem);
}

@media (min-width: 768px) {
  .helmets__grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (min-width: 1100px) {
  .helmets__grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}

.helmet-card {
  display: grid;
  gap: 0.75rem;
}

.helmet-card__media {
  aspect-ratio: 1;
  background: var(--color-dark-green-tint-1);
  overflow: hidden;
  display: grid;
  place-items: center;
  padding: 8%;
}

.helmet-card__media img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  transition: transform 0.5s var(--ease-out);
}

.helmet-card:hover .helmet-card__media img {
  transform: scale(1.06);
}

.helmet-card__meta h3 {
  font-size: 1.05rem;
  font-weight: 650;
}

.helmet-card__meta .eyebrow {
  opacity: 0.7;
  margin-top: 0.25rem;
}
</style>
