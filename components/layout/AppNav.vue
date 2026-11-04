<script setup lang="ts">
const content = useHomeContent();
const open = ref(false);
const hover = ref(false);

/** Mirrors [data-nav-theme] (set by the scroll choreography) for the Rive hamburger. */
const header = ref<HTMLElement | null>(null);
const theme = ref<"dark" | "light">("dark");
const logoShown = ref(true);
let themeObserver: MutationObserver | null = null;
onMounted(() => {
  if (!header.value) return;
  themeObserver = new MutationObserver(() => {
    theme.value = header.value?.dataset.navTheme === "light" ? "light" : "dark";
    logoShown.value = header.value?.dataset.navLogo !== "hidden";
  });
  themeObserver.observe(header.value, { attributes: true, attributeFilter: ["data-nav-theme", "data-nav-logo"] });
});
onBeforeUnmount(() => themeObserver?.disconnect());

watch(open, (v) => {
  document.documentElement.classList.toggle("nav-open", v);
});
</script>

<template>
  <header ref="header" data-app-nav data-nav-theme="dark" class="nav">
    <div class="nav-inner">
      <a class="nav-brand-link" href="/" aria-label="Lando Home" title="Lando Home">
        <LayoutNavBrand />
      </a>

      <a class="nav-middle" href="/" aria-label="Home">
        <RiveCanvas
          file="logo"
          artboard="logo"
          state-machine="logo"
          :inputs="{
            'logo-active': logoShown,
            'color_dark-green': theme === 'dark',
            color_white: theme === 'light'
          }"
        />
      </a>

      <div class="btn-layout is-nav">
        <a
          class="btn-w is-nav"
          :href="content.nav.store.href"
          target="_blank"
          rel="noopener"
          data-theme="lime"
        >
          <span class="btn-icon"><LayoutStoreIcon /></span>
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
          @pointerenter="hover = true"
          @pointerleave="hover = false"
        >
          <RiveCanvas
            file="btn-ui"
            artboard="hamburger"
            state-machine="hamburger"
            :inputs="{ hover, close: open, 'color-transparent': theme === 'dark', 'color-white': theme === 'light' }"
          />
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
/* Reference metrics at 1440 px: 1u = clamp(992px, 100vw, 1920px) / 1728 × 16 = 13.33 px. */
.nav {
  --u: calc(clamp(992px, 100vw, 1920px) / 1728 * 16);
  position: fixed;
  inset: 0 0 auto;
  z-index: 120;
  pointer-events: none;
}

.nav-inner {
  position: relative;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: calc(var(--u) * 1.25);
}

.nav-brand-link,
.nav-middle,
.btn-layout {
  pointer-events: auto;
}

.nav-brand-link {
  display: block;
  height: calc(var(--u) * 4.5);
  transform: scale(var(--nav-scale, 1));
  transform-origin: top left;
}

.nav-brand-link :deep(.nav-brand) {
  display: block;
  width: auto;
  height: 100%;
}

.nav-brand-link :deep(path) {
  transition: fill 0.75s cubic-bezier(0.65, 0.05, 0, 1);
}

.nav[data-nav-theme="dark"] :deep(.nav-brand__p1),
.nav[data-nav-theme="dark"] :deep(.nav-brand__p2) {
  fill: #282c20;
}

.nav[data-nav-theme="light"] :deep(.nav-brand__p1) {
  fill: #c8cbbd;
}

.nav[data-nav-theme="light"] :deep(.nav-brand__p2) {
  fill: #ebeee0;
}

.nav-middle {
  position: absolute;
  top: calc(var(--u) * 1.75);
  left: 50%;
  width: calc(var(--u) * 2.75);
  height: calc(var(--u) * 2.75);
  transform: translateX(-50%);
}

.btn-layout.is-nav {
  display: flex;
  align-items: center;
  gap: calc(var(--u) * 0.75);
  transform: scale(var(--nav-scale, 1));
  transform-origin: top right;
}

.btn-w.is-nav {
  display: inline-flex;
  align-items: center;
  gap: calc(var(--u) * 0.8);
  height: calc(var(--u) * 4.5);
  padding: 0 calc(var(--u) * 1.25);
  border: 1px solid var(--color-lime);
  border-radius: calc(var(--u) * 0.54);
  background-color: var(--color-lime);
  color: #282c20;
}

.btn-icon {
  display: block;
  width: calc(var(--u) * 1.36);
  height: calc(var(--u) * 1.44);
}

.btn-icon :deep(svg) {
  display: block;
}

.btn-w.is-nav .btn-text {
  font-family: var(--font-mona);
  font-size: calc(var(--u) * 1.25);
  font-weight: 800;
  /* Reference declares "wdth" 86 but the nav Store label alone measures like
     96.5 with the same font file (STORE = 54.7 px at 1440; every other label on
     the site measures as a true 86); match the measured result. */
  font-variation-settings: "wdth" 96.5;
  line-height: 1;
  text-transform: uppercase;
}

.nav-ham {
  width: calc(var(--u) * 4.5);
  height: calc(var(--u) * 4.5);
  padding: 0;
  border: 0;
  background: transparent;
  cursor: pointer;
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
