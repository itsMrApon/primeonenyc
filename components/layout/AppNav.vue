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

/** Reference kL: while open the nav goes light (brand, ham), the PO monogram fades out. */
let themeBeforeOpen: string | undefined;
watch(open, (v) => {
  document.documentElement.classList.toggle("nav-open", v);
  const el = header.value;
  if (!el) return;
  if (v) {
    themeBeforeOpen = el.dataset.navTheme;
    el.dataset.navTheme = "light";
  } else if (themeBeforeOpen) {
    el.dataset.navTheme = themeBeforeOpen;
  }
});

const hamInputs = computed(() =>
  open.value
    ? { hover: hover.value, close: true, "color-transparent": true, "color-white": false }
    : { hover: hover.value, close: false, "color-transparent": theme.value === "dark", "color-white": theme.value === "light" }
);
</script>

<template>
  <header ref="header" data-app-nav data-nav-theme="dark" class="nav">
    <div class="nav-inner">
      <a class="nav-brand-link" href="/" aria-label="Delowar Hossain Home" title="Delowar Hossain Home">
        <LayoutNavBrand />
      </a>

      <!-- PO monogram (same paths as /images/misc/ln-logo.svg, cropped); colour follows the nav theme. -->
      <a class="nav-middle" :class="{ 'is-hidden': !logoShown, 'is-light': theme === 'light', 'is-menu-open': open }" href="/" aria-label="Home">
        <svg class="nav-po" viewBox="41 106 430 300" aria-hidden="true">
          <g transform="translate(256 256) skewX(-14) translate(-178 -150)" fill="currentColor" fill-rule="evenodd">
            <path d="M0 0H90C128 0 150 24 150 62V108C150 146 128 170 90 170H52V300H0Z M52 48V122H84C94 122 98 116 98 106V64C98 54 94 48 84 48Z" />
            <path d="M222 0H310C338 0 356 18 356 46V254C356 282 338 300 310 300H222C194 300 176 282 176 254V46C176 18 194 0 222 0Z M242 48C233 48 228 53 228 62V238C228 247 233 252 242 252H290C299 252 304 247 304 238V62C304 53 299 48 290 48Z" />
          </g>
        </svg>
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
            :inputs="hamInputs"
          />
        </button>
      </div>
    </div>

    <LayoutNavMenu :open="open" @close="open = false" />
  </header>
</template>

<style scoped>
/* Reference metrics at 1440 px: 1u = clamp(992px, 100vw, 1920px) / 1728 × 16 = 13.33 px. */
.nav {
  position: fixed;
  inset: 0 0 auto;
  z-index: 120;
  pointer-events: none;
}

.nav-inner {
  position: relative;
  z-index: 50; /* above the menu (z 25), like the reference */
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

.nav-brand-link :deep(path),
.nav-brand-link :deep(text) {
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
  display: flex;
  align-items: center;
  justify-content: center;
  color: #282c20;
  transition: color 0.75s cubic-bezier(0.65, 0.05, 0, 1);
}

.nav-middle.is-light {
  color: #ebeee0;
}

.nav-middle.is-menu-open {
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.4s cubic-bezier(0.33, 1, 0.68, 1);
}

.nav-middle {
  transition:
    color 0.75s cubic-bezier(0.65, 0.05, 0, 1),
    opacity 0.4s cubic-bezier(0.33, 1, 0.68, 1);
}

.nav-po {
  display: block;
  width: 100%;
  height: auto;
  transition:
    opacity 0.4s cubic-bezier(0.65, 0.05, 0, 1),
    translate 0.4s cubic-bezier(0.65, 0.05, 0, 1);
}

.nav-middle.is-hidden .nav-po {
  opacity: 0;
  translate: 0 -40%;
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

/* Reference ≤991 / ≤479: brand hidden, Store left + hamburger right, LN4 centred below. */
@media (max-width: 767px) {
  .nav-brand-link {
    display: none;
  }

  /* Reference mobile nav never compacts on scroll (and a full-width row scaled
     from the right would drag Store inwards). */
  .btn-layout.is-nav {
    justify-content: space-between;
    width: 100%;
    transform: none;
  }

  /* Centred on the store / menu buttons' row. */
  .nav-middle {
    top: calc(var(--u) * 2.3);
    width: calc(var(--u) * 2.5);
    height: calc(var(--u) * 2.5);
  }

  .btn-w.is-nav {
    gap: calc(var(--u) * 0.62);
    height: calc(var(--u) * 4.7);
    padding: 0 calc(var(--u) * 1.1 - 1px); /* 1.1u inset measured from the outer (border) edge */
  }

  .btn-icon {
    width: calc(var(--u) * 1.5);
    height: calc(var(--u) * 1.5);
  }

  /* Live at 375 px the label measures as the true "wdth" 86 (3.42u), unlike desktop. */
  .btn-w.is-nav .btn-text {
    font-variation-settings: "wdth" 86;
  }

  .nav-ham {
    width: calc(var(--u) * 4.7);
    height: calc(var(--u) * 4.7);
  }
}
</style>
