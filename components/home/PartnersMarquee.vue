<script setup lang="ts">
const content = useHomeContent();
const logos = computed(() => [...content.partners.logos, ...content.partners.logos]);
</script>

<template>
  <section class="section partners">
    <div class="container partners__intro reveal" data-reveal>
      <h2 class="text-impact" v-html="content.partners.titleHtml" />
      <p class="text-body">{{ content.partners.body }}</p>
      <a class="btn btn--ghost" :href="content.partners.cta.href">
        {{ content.partners.cta.label }}
      </a>
    </div>

    <div class="partners__marquee" aria-hidden="true">
      <div class="partners__track">
        <div v-for="(logo, i) in logos" :key="`${logo.src}-${i}`" class="partners__logo">
          <img :src="logo.src" :alt="logo.alt" loading="lazy" />
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.partners {
  background: var(--color-dark-green);
  color: var(--color-white);
  overflow: clip;
  padding-bottom: 2rem;
}

.partners__intro {
  display: grid;
  gap: 1.25rem;
  justify-items: start;
  margin-bottom: 3rem;
  max-width: 40ch;
}

.partners__marquee {
  overflow: hidden;
  mask-image: linear-gradient(90deg, transparent, #000 8%, #000 92%, transparent);
}

.partners__track {
  display: flex;
  align-items: center;
  gap: clamp(2rem, 5vw, 4rem);
  width: max-content;
  animation: marquee 32s linear infinite;
}

.partners__logo {
  flex: 0 0 auto;
  width: clamp(88px, 12vw, 140px);
  opacity: 0.85;
  filter: brightness(0) invert(1);
}

.partners__logo img {
  width: 100%;
  height: auto;
}

@keyframes marquee {
  from {
    transform: translateX(0);
  }
  to {
    transform: translateX(-50%);
  }
}

@media (prefers-reduced-motion: reduce) {
  .partners__track {
    animation: none;
  }
}
</style>
