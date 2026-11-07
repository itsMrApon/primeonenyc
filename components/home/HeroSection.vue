<script setup lang="ts">
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

const content = useHomeContent();

/**
 * Signature (SVG wipe) is scrubbed by scroll like the reference: trigger is the
 * tracker (second 100vh of the track), "top center" → "bottom 80%", scrub 0.5,
 * signatureScroll = progress × 1000.
 */
const tracker = ref<HTMLElement | null>(null);
const track = ref<HTMLElement | null>(null);
const logo = ref<HTMLElement | null>(null);
const msg = ref<HTMLElement | null>(null);
const signatureScroll = ref(0);
const triggers: ScrollTrigger[] = [];

onMounted(() => {
  gsap.registerPlugin(ScrollTrigger);
  const state = { p: 0 };
  const tween = gsap.to(state, {
    p: 1,
    ease: "none",
    onUpdate: () => (signatureScroll.value = state.p * 1000),
    scrollTrigger: { trigger: tracker.value, start: "top center", end: "bottom 80%", scrub: 0.5 }
  });
  if (tween.scrollTrigger) triggers.push(tween.scrollTrigger);

  // Lime PO logo + "Message from Prime One": hidden at the top, scrubbed in over
  // scroll 0.778 → 0.944 vh (700 → 850 at 900). The message keeps its −50 % x centring.
  const xCentre = (i: number) => (i === 1 ? -50 : 0);
  const reveal = gsap.fromTo(
    [logo.value, msg.value],
    { opacity: 0, xPercent: xCentre, y: () => fluidUnit() }, // 1u
    {
      opacity: 1,
      xPercent: xCentre,
      y: 0,
      ease: "power2.out",
      scrollTrigger: {
        trigger: track.value,
        start: () => `top+=${window.innerHeight * 0.778} top`,
        end: () => `top+=${window.innerHeight * 0.944} top`,
        scrub: true,
        invalidateOnRefresh: true
      }
    }
  );
  if (reveal.scrollTrigger) triggers.push(reveal.scrollTrigger);
});

onBeforeUnmount(() => triggers.forEach((t) => t.kill()));
</script>

<template>
  <!-- Sticky track mirrors original: 200vh track, sticky 100svh lime hero -->
  <div ref="track" data-hero data-gl-track="head" class="sticky-track home-hero">
    <div class="sticky-item home-hero">
      <section class="s home-hero">
        <div class="c home-hero">
          <!-- WebGL head paints into the fixed canvas behind; this is the DOM mount zone -->
          <div data-gl="head" data-sticky-hero="canvas" class="gl-canvas" aria-hidden="true" />

          <img
            ref="logo"
            class="hero-msg-logo"
            src="/images/misc/ln4-LN-logo-lime.svg"
            alt=""
            aria-hidden="true"
          />
          <p ref="msg" class="hero-msg">Message from Prime One</p>

          <!-- Signature: hidden at the top, writes itself left → right as the tracker scrolls. -->
          <div class="hero-signature" aria-hidden="true">
            <img
              class="hero-signature__img"
              src="/images/misc/signature-lime.svg"
              alt=""
              :style="{ '--p': signatureScroll / 1000 }"
            />
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
    <div ref="tracker" class="hero-rive-tracker" aria-hidden="true" />
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

.sticky-track.home-hero,
.hero-msg,
.hero-msg-logo,
.hero-signature {
}

/* Second 100vh of the track: drives the signature scrub. */
.hero-rive-tracker {
  position: absolute;
  top: 100vh;
  left: 0;
  width: 10px;
  height: 100vh;
  pointer-events: none;
}

/* White on the light hero (effectively invisible); reads once the page turns dark. */
.hero-msg {
  position: absolute;
  top: calc(var(--u) * 14.78);
  left: 50%;
  margin: 0;
  transform: translateX(-50%);
  color: #f4f4ed;
  font-family: var(--font-mona);
  font-size: calc(var(--u) * 0.625);
  font-variation-settings: "wdth" 100, "wght" 700;
  line-height: 1;
  text-transform: uppercase;
  white-space: nowrap;
  opacity: 0;
  pointer-events: none;
}

.hero-msg-logo {
  position: absolute;
  top: calc(var(--u) * 11.25);
  left: 50%;
  width: calc(var(--u) * 1.875);
  height: calc(var(--u) * 2.1);
  margin-left: calc(var(--u) * -0.9375);
  object-fit: cover;
  opacity: 0;
  pointer-events: none;
}

.hero-signature {
  position: absolute;
  top: calc(var(--u) * 12.32);
  left: 50%;
  width: calc(var(--u) * 60);
  height: calc(var(--u) * 42.86);
  transform: translateX(-50%);
  pointer-events: none;
}

.hero-signature__img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
  /* Soft-edged wipe: --p = 0 hides it, 1 shows all of it. */
  --edge: calc(var(--p) * 110% - 10%);
  mask-image: linear-gradient(90deg, #000 var(--edge), transparent calc(var(--edge) + 10%));
  -webkit-mask-image: linear-gradient(90deg, #000 var(--edge), transparent calc(var(--edge) + 10%));
}

/* Next-race card — reference metrics at 1440 px, 1u = 13.33 px. */
.home-hero-next-race-w {
  position: absolute;
  left: calc(var(--u) * 1.25);
  bottom: calc(var(--u) * 1.25);
  z-index: 10;
  width: calc(var(--u) * 7.44);
  height: calc(var(--u) * 15.25);
  color: #535450;
  text-decoration: none;
}

/* Hides from the bottom up as soon as the page scrolls (CSS transition, not scrubbed). */
.home-hero-next-race-w {
  clip-path: ellipse(100% 120% at 50% 0%);
  transition: clip-path 0.75s cubic-bezier(0.65, 0.05, 0, 1);
}

.home-hero-next-race-w.is-hidden {
  clip-path: ellipse(100% 0% at 50% 0%);
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

  /* Reference ≤479 at 375 px: logo 16.55u, message 20u, signature 28.8 × 20.57u centred. */
  .hero-msg-logo {
    top: calc(var(--u) * 16.55);
  }

  .hero-msg {
    top: calc(var(--u) * 20);
    font-size: calc(var(--u) * 0.8);
  }

  .hero-signature {
    top: calc(50% - var(--u) * 10.285);
    width: calc(var(--u) * 28.8);
    height: calc(var(--u) * 20.57);
  }
}
</style>
