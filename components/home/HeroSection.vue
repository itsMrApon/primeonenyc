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

          <!-- Stand-in for the circuits Rive badge that floats near the portrait -->
          <div class="hero-circuit-badge" aria-hidden="true">
            <svg viewBox="0 0 88 72" class="circuit-glyph">
              <ellipse
                cx="44"
                cy="36"
                rx="34"
                ry="22"
                fill="none"
                stroke="currentColor"
                stroke-width="2.5"
              />
              <ellipse
                cx="44"
                cy="36"
                rx="22"
                ry="14"
                fill="none"
                stroke="currentColor"
                stroke-width="1.5"
                opacity="0.75"
              />
              <circle cx="44" cy="36" r="3.5" fill="currentColor" />
            </svg>
          </div>

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

            <div class="home-hero-next-race-top">
              <div class="text-eyebrow">{{ content.hero.nextRace.label }}</div>
            </div>

            <div class="home-hero-next-race-row is-1">
              <div class="home-hero-next-race-rive-w" aria-hidden="true">
                <!-- Circuit glyph stand-in for Rive circuits artboard -->
                <svg viewBox="0 0 88 72" class="circuit-glyph">
                  <path
                    d="M8 36c8-18 20-26 36-26s28 8 36 26c-8 18-20 26-36 26S16 54 8 36Z"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                  />
                  <path
                    d="M18 40c6-10 14-14 26-14s20 4 26 14c-6 10-14 14-26 14S24 50 18 40Z"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.5"
                    opacity="0.7"
                  />
                  <circle cx="44" cy="36" r="3" fill="currentColor" />
                </svg>
              </div>
              <div class="eyebrow-w">
                <div class="text-eyebrow">{{ content.hero.nextRace.name }}</div>
                <div class="text-eyebrow">{{ content.hero.nextRace.suffix }}</div>
              </div>
            </div>

            <div class="home-hero-next-race-line" />

            <div class="home-hero-next-race-row is-2" data-gl-helmet="hover">
              <div class="text-eyebrow next-race-sub">
                mclaren f1<br />since 2019
              </div>
            </div>
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

.hero-circuit-badge {
  position: absolute;
  left: 50%;
  top: 58%;
  z-index: 5;
  width: 5.25rem;
  height: 5.25rem;
  transform: translate(-110%, 10%);
  color: var(--color-dark-green);
  pointer-events: none;
  display: grid;
  place-items: center;
}

.hero-circuit-badge .circuit-glyph {
  width: 100%;
  height: auto;
}

@media (max-width: 767px) {
  .hero-circuit-badge {
    display: none;
  }
}

.home-hero-next-race-w {
  position: absolute;
  left: var(--pad-x);
  bottom: var(--pad-x);
  z-index: 10;
  width: 7.4375rem;
  height: 15.25rem;
  color: var(--color-dark-green-tint-2);
  display: grid;
  grid-template-rows: auto 1fr auto auto;
  padding: 0.55rem 0.35rem 0.65rem;
  text-decoration: none;
}

.home-hero-next-race-outline {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  z-index: -1;
  color: inherit;
}

.home-hero-next-race-top {
  display: flex;
  justify-content: flex-start;
  align-items: flex-start;
  height: 1.3rem;
  padding-left: 0.35rem;
}

.home-hero-next-race-row {
  display: flex;
  flex-flow: column;
  justify-content: center;
  align-items: center;
  gap: 0.35rem;
}

.home-hero-next-race-row.is-1 {
  justify-content: flex-start;
  padding-top: 0.35rem;
}

.home-hero-next-race-rive-w {
  width: 5.5rem;
  height: 4.2rem;
  display: grid;
  place-items: center;
}

.circuit-glyph {
  width: 4.6rem;
  height: auto;
  color: var(--color-dark-green);
}

.eyebrow-w {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.1rem;
  text-align: center;
}

.home-hero-next-race-line {
  background-color: currentColor;
  width: 80%;
  height: 0.0625rem;
  margin: 0.15rem auto;
}

.next-race-sub {
  text-align: center;
  line-height: 1.25;
  font-size: 0.62rem;
  letter-spacing: 0.06em;
}

.text-eyebrow {
  font-family: var(--font-mona);
  font-size: 0.68rem;
  font-weight: 650;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-dark-green);
}

@media (max-width: 767px) {
  .home-hero-next-race-w {
    display: none;
  }
}
</style>
