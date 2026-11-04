<script setup lang="ts">
const content = useHomeContent();
</script>

<template>
  <section class="section socials">
    <div class="container">
      <header class="socials__header reveal" data-reveal>
        <h2 class="text-impact socials__title">
          <span>{{ content.socials.titleTop }}</span>
          <span class="text-brier">{{ content.socials.titleBottom }}</span>
        </h2>
        <p class="text-body">{{ content.socials.follow }}</p>
        <ul class="socials__links">
          <li v-for="link in content.socials.links" :key="link.href">
            <a :href="link.href" target="_blank" rel="noopener">{{ link.label }}</a>
          </li>
        </ul>
      </header>

      <div class="socials__grid">
        <img
          v-for="src in content.socials.images"
          :key="src"
          class="reveal"
          data-reveal
          :src="src"
          alt=""
          loading="lazy"
        />
      </div>
    </div>
  </section>
</template>

<style scoped>
.socials {
  background: var(--color-white);
  color: var(--color-dark-green);
}

.socials__header {
  display: grid;
  gap: 1rem;
  margin-bottom: 2.5rem;
  justify-items: start;
}

.socials__title {
  display: grid;
  gap: 0.15em;
  line-height: 0.95;
}

.socials__links {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem 1.5rem;
  list-style: none;
  margin: 0;
  padding: 0;
  text-transform: lowercase;
  font-weight: 650;
}

.socials__links a:hover {
  color: color-mix(in srgb, var(--color-dark-green) 70%, var(--color-lime));
}

.socials__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.65rem;
}

@media (min-width: 900px) {
  .socials__grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

.socials__grid img {
  width: 100%;
  aspect-ratio: 4 / 5;
  object-fit: cover;
}
</style>
