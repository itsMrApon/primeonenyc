<script setup lang="ts">
const content = useHomeContent();
</script>

<template>
  <section class="section store">
    <div class="container store__grid">
      <div class="store__copy reveal" data-reveal>
        <p class="eyebrow">{{ content.store.eyebrow }}</p>
        <h2 class="text-impact-lg" v-html="content.store.titleHtml" />
        <p class="text-body">{{ content.store.body }}</p>
        <a
          class="btn"
          :href="content.store.cta.href"
          target="_blank"
          rel="noopener"
        >
          {{ content.store.cta.label }}
        </a>
      </div>

      <div class="store__gallery">
        <img
          v-for="(src, i) in content.store.images"
          :key="src"
          class="store__img reveal"
          data-reveal
          :src="src"
          alt=""
          loading="lazy"
          :style="{ '--i': i }"
        />
      </div>
    </div>
  </section>
</template>

<style scoped>
.store {
  background: var(--color-white);
  color: var(--color-dark-green);
}

.store__grid {
  display: grid;
  gap: 2.5rem;
}

@media (min-width: 960px) {
  .store__grid {
    grid-template-columns: 0.9fr 1.1fr;
    align-items: center;
  }
}

.store__copy {
  display: grid;
  gap: 1.25rem;
  justify-items: start;
}

.store__gallery {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
}

.store__img {
  width: 100%;
  aspect-ratio: 4 / 5;
  object-fit: cover;
  background: #ddd;
}

.store__img:nth-child(2),
.store__img:nth-child(3) {
  transform: translateY(8%);
}
</style>
