<script setup lang="ts">
const content = useHomeContent();
</script>

<template>
  <!-- Sticky track mirrors original: 200vh track, sticky 100svh lime hero -->
  <div data-hero data-gl-track="head" class="sticky-track home-hero">
    <div class="sticky-item home-hero">
      <section class="s home-hero">
        <div class="c home-hero">
          <!-- WebGL head paints into the fixed canvas behind; this is the DOM mount zone -->
          <div data-gl="head" data-sticky-hero="canvas" class="gl-canvas" aria-hidden="true" />

          <a class="home-hero-next-race-w" :href="content.hero.nextRace.href">
            <!-- Exact path from landonorris.com next-race outline -->
            <svg
              class="home-hero-next-race-outline"
              width="119"
              height="244"
              viewBox="0 0 119 244"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M118.5 6v232a5.5 5.5 0 0 1-5.5 5.5H6A5.5 5.5 0 0 1 .5 238V25A5.5 5.5 0 0 1 6 19.5h46.346c4.695 0 9.167-2 12.297-5.498l7.46-8.337A15.5 15.5 0 0 1 83.653.5H113a5.5 5.5 0 0 1 5.5 5.5Z"
                stroke="currentColor"
              />
            </svg>

            <span class="nr-text nr-label">{{ content.hero.nextRace.label }}</span>

            <span class="nr-circuit">
              <RiveCanvas
                file="circuits"
                artboard="circuits"
                state-machine="circuits"
                :inputs="{ [content.hero.nextRace.track]: true }"
              />
            </span>

            <span class="nr-name">
              <span class="nr-text">{{ content.hero.nextRace.name }}</span>
              <span class="nr-text">{{ content.hero.nextRace.suffix }}</span>
            </span>

            <span class="nr-line" />

            <span class="nr-helmet">
              <RiveCanvas file="reef" artboard="helmet-reef" state-machine="helmet-reef_play" />
            </span>

            <span class="nr-text nr-sub">mclaren f1<br />since 2019</span>
          </a>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.sticky-track.home-hero {
  height: 200vh;
  position: relative;
  /* Transparent so the fixed WebGL lime + head shows through */
  background: transparent;
}

.sticky-item.home-hero {
  position: sticky;
  top: 0;
  height: 100svh;
  overflow: clip;
}

.s.home-hero {
  height: 100%;
}

.c.home-hero {
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  max-width: none;
  min-height: 100svh;
  height: 100%;
  background: transparent;
}

/* Mount marker — actual WebGL is the fixed canvas behind overlays */
.gl-canvas {
  position: absolute;
  inset: 0;
  width: 100vw;
  height: 100svh;
  pointer-events: none;
}

/* Next-race card — reference metrics at 1440 px, 1u = 13.33 px. */
.home-hero-next-race-w {
  --u: calc(clamp(992px, 100vw, 1920px) / 1728 * 16);
  position: absolute;
  left: calc(var(--u) * 1.25);
  bottom: calc(var(--u) * 1.25);
  z-index: 10;
  width: calc(var(--u) * 7.44);
  height: calc(var(--u) * 15.25);
  color: #535450;
  text-decoration: none;
}

.home-hero-next-race-outline {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.nr-text {
  display: block;
  font-family: var(--font-mona);
  font-size: calc(var(--u) * 0.625);
  font-weight: 400;
  font-variation-settings: "wdth" 100, "wght" 700; /* reference eyebrow axes */
  line-height: 1;
  text-transform: uppercase;
  white-space: nowrap;
}

.nr-label {
  position: absolute;
  top: 0;
  left: 0;
}

.nr-circuit {
  position: absolute;
  top: calc(var(--u) * 1.78);
  left: calc(var(--u) * 0.97);
  width: calc(var(--u) * 5.5);
  height: calc(var(--u) * 4.7);
}

.nr-name {
  position: absolute;
  top: calc(var(--u) * 7.1);
  left: 0;
  right: 0;
  display: flex;
  justify-content: center;
  gap: calc(var(--u) * 0.31);
}

.nr-line {
  position: absolute;
  top: calc(var(--u) * 8.2);
  left: calc(var(--u) * 0.74);
  width: calc(var(--u) * 5.95);
  height: calc(var(--u) * 0.0625);
  background-color: currentColor;
}

.nr-helmet {
  position: absolute;
  top: calc(var(--u) * 9.18);
  left: calc(var(--u) * 0.69);
  width: calc(var(--u) * 6.06);
  height: calc(var(--u) * 3.19);
}

.nr-sub {
  position: absolute;
  top: calc(var(--u) * 12.99);
  left: 0;
  right: 0;
  text-align: center;
}

@media (max-width: 767px) {
  .home-hero-next-race-w {
    display: none;
  }
}
</style>
