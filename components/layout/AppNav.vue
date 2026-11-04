<script setup lang="ts">
const content = useHomeContent();
const open = ref(false);

watch(open, (v) => {
  document.documentElement.classList.toggle("nav-open", v);
});
</script>

<template>
  <header data-app-nav data-nav-theme="light" class="nav">
    <div class="nav-inner">
      <a class="nav-brand-link" href="/" aria-label="Lando Home" title="Lando Home">
        <img :src="content.nav.logoSrc" alt="LN" width="56" height="28" class="nav-brand-img" />
      </a>

      <div class="btn-layout is-nav">
        <a
          class="btn-w is-nav"
          :href="content.nav.store.href"
          target="_blank"
          rel="noopener"
          data-theme="lime"
        >
          <span class="btn-text">{{ content.nav.store.label }}</span>
        </a>

        <button
          class="nav-ham"
          type="button"
          data-nav-ham
          :aria-expanded="open"
          :aria-label="open ? 'Close menu' : 'Open menu'"
          aria-controls="site-menu"
          @click="open = !open"
        >
          <span class="nav-ham__bars" aria-hidden="true">
            <i />
            <i />
          </span>
        </button>
      </div>
    </div>

    <nav id="site-menu" class="nav-menu-w" :class="{ 'is-open': open }">
      <div class="nav-menu-inner">
        <ul class="nav-menu-links-list">
          <li v-for="link in content.nav.links" :key="link.href">
            <a class="nav-menu-link-w" :href="link.href" @click="open = false">
              {{ link.label }}
            </a>
          </li>
        </ul>
        <a class="nav-business" :href="content.nav.business.href">
          {{ content.nav.business.label }}
        </a>
        <ul class="nav-menu-social-w">
          <li v-for="s in content.nav.socials" :key="s.href">
            <a :href="s.href" target="_blank" rel="noopener">{{ s.label }}</a>
          </li>
        </ul>
      </div>
    </nav>
  </header>
</template>

<style scoped>
.nav {
  z-index: 120;
  pointer-events: none;
  justify-content: space-between;
  align-items: center;
  display: flex;
  position: fixed;
  inset: 0 0 auto;
  color: var(--color-dark-green);
}

.nav-inner {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.85rem var(--pad-x);
  pointer-events: none;
}

.nav-brand-link,
.btn-layout {
  pointer-events: auto;
}

.nav-brand-img {
  height: 1.65rem;
  width: auto;
}

.btn-layout.is-nav {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.btn-w.is-nav {
  border: 1px solid var(--color-lime);
  background-color: var(--color-lime);
  color: var(--color-dark-green);
  border-radius: 0.54rem;
  height: 3rem;
  padding: 0 1rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-weight: 650;
  font-size: 0.92rem;
  transition: transform 0.3s var(--ease-out);
}

.btn-w.is-nav:hover {
  transform: translateY(-1px);
}

.nav-ham {
  pointer-events: auto;
  width: 3rem;
  height: 3rem;
  border-radius: 0.54rem;
  border: 1px solid color-mix(in srgb, var(--color-dark-green) 35%, transparent);
  display: grid;
  place-items: center;
  background: color-mix(in srgb, var(--color-lime) 55%, transparent);
}

.nav-ham__bars {
  display: grid;
  gap: 5px;
  width: 1.05rem;
}

.nav-ham__bars i {
  display: block;
  height: 1.5px;
  background: var(--color-dark-green);
  border-radius: 1px;
}

.nav[data-nav-theme="dark"] {
  color: var(--color-white);
}

.nav[data-nav-theme="dark"] .btn-w.is-nav {
  background: var(--color-lime);
  color: var(--color-dark-green);
}

.nav[data-nav-theme="dark"] .nav-ham {
  background: transparent;
  border-color: color-mix(in srgb, var(--color-white) 40%, transparent);
}

.nav[data-nav-theme="dark"] .nav-ham__bars i {
  background: var(--color-white);
}

.nav[data-nav-theme="dark"] .nav-brand-img {
  filter: invert(1) brightness(1.15);
}

.nav-menu-w {
  position: fixed;
  inset: 0;
  z-index: 110;
  background: var(--color-dark-green);
  color: var(--color-white);
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  transition: opacity 0.35s ease, visibility 0.35s ease;
}

.nav-menu-w.is-open {
  opacity: 1;
  visibility: visible;
  pointer-events: auto;
}

.nav-menu-inner {
  min-height: 100%;
  display: grid;
  place-content: center;
  gap: 2rem;
  padding: var(--pad-x);
  text-align: center;
}

.nav-menu-links-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.nav-menu-link-w {
  display: block;
  padding: 0.35rem 0;
  font-size: clamp(2rem, 6vw, 4rem);
  font-weight: 650;
  letter-spacing: -0.03em;
}

.nav-menu-link-w:hover {
  color: var(--color-lime);
}

.nav-business {
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: 0.8rem;
  color: var(--color-lime);
}

.nav-menu-social-w {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 1rem;
  list-style: none;
  margin: 0;
  padding: 0;
  text-transform: lowercase;
  font-size: 0.9rem;
}
</style>
