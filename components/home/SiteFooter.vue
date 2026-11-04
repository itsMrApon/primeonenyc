<script setup lang="ts">
const content = useHomeContent();
</script>

<template>
  <footer class="footer">
    <div class="footer__bg" aria-hidden="true">
      <img v-if="content.footer.bg" :src="content.footer.bg" alt="" />
    </div>

    <div class="container footer__inner">
      <h2
        class="text-impact-lg footer__tagline reveal"
        data-reveal
        v-html="content.footer.taglineHtml"
      />

      <div class="footer__meta">
        <a class="footer__business" :href="content.footer.business.href">
          {{ content.footer.business.label }}
        </a>
        <nav class="footer__legal">
          <a
            v-for="link in content.footer.legal"
            :key="link.href"
            :href="link.href"
          >
            {{ link.label }}
          </a>
        </nav>
        <p class="footer__copy">© {{ new Date().getFullYear() }} Lando Norris</p>
      </div>
    </div>
  </footer>
</template>

<style scoped>
.footer {
  position: relative;
  background: var(--color-dark-green);
  color: var(--color-white);
  padding: clamp(5rem, 12vh, 8rem) var(--pad-x) 2.5rem;
  overflow: clip;
}

.footer__bg {
  position: absolute;
  inset: auto 0 0;
  height: 55%;
  opacity: 0.35;
  pointer-events: none;
}

.footer__bg img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center top;
}

.footer__inner {
  position: relative;
  z-index: 1;
  display: grid;
  gap: 3rem;
}

.footer__tagline {
  max-width: 14ch;
  font-weight: 600;
}

.footer__tagline :deep(.c-lime) {
  color: var(--color-lime);
}

.footer__meta {
  display: grid;
  gap: 1rem;
}

.footer__business {
  color: var(--color-lime);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: 0.85rem;
  font-weight: 650;
}

.footer__legal {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem 1.5rem;
  opacity: 0.8;
  font-size: 0.9rem;
}

.footer__copy {
  opacity: 0.55;
  font-size: 0.8rem;
}
</style>
