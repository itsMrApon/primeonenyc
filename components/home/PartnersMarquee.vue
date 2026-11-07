<script setup lang="ts">
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

const content = useHomeContent();
const logos = computed(() => [...content.partners.logos, ...content.partners.logos]);

/**
 * Reference "exe-top-visor": the helmets' black hangs into this section as a curved
 * visor, opening ellipse(70% 0%) → (70% 100%) at top centre while it scrolls from
 * "top bottom" to "bottom center" (scrubbed, linear).
 */
const visor = ref<HTMLElement | null>(null);
let tween: gsap.core.Tween | null = null;
onMounted(() => {
  gsap.registerPlugin(ScrollTrigger);
  tween = gsap.fromTo(
    visor.value,
    { clipPath: "ellipse(70% 0% at 50% 0%)" },
    {
      clipPath: "ellipse(70% 100% at 50% 0%)",
      ease: "none",
      scrollTrigger: { trigger: visor.value, start: "top bottom", end: "bottom center", scrub: true }
    }
  );
});
onBeforeUnmount(() => {
  tween?.scrollTrigger?.kill();
  tween?.kill();
});
</script>

<template>
  <section class="section partners" data-gl-lines-fade data-nav-theme-target="dark">
    <div ref="visor" class="partners-visor" aria-hidden="true" />
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
/* Reference "is-home-collabs": transparent over the off-white page, dark ink. */
.partners {
  position: relative;
  background: transparent;
  color: #111112;
  /* Sideways only: the visor must overlap the black section above to hide its
     fractional-pixel edge (full `overflow: clip` cut that overlap off → hairline). */
  overflow-x: clip;
  padding-top: calc(var(--u) * 8 + var(--pad-section) * 0.5); /* clear the open visor */
  padding-bottom: 2rem;
}

/* Reference .exe-top-visor: 8u black strip, clipped to a growing ellipse. */
.partners-visor {
  position: absolute;
  inset: -2px 0 auto; /* 2px overlap: the black section ends on a fractional pixel */
  z-index: 0;
  height: calc(var(--u) * 8);
  background-color: #111112;
  clip-path: ellipse(70% 0% at 50% 0%);
  pointer-events: none;
}

.partners > :not(.partners-visor) {
  position: relative;
  z-index: 1;
}

.partners__intro {
  display: grid;
  gap: 1.25rem;
  justify-items: start;
  margin-bottom: 3rem;
  max-width: 40ch;
}

.partners :deep(.btn--ghost),
.partners .btn--ghost {
  color: #111112;
  border-color: color-mix(in srgb, #111112 35%, transparent);
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
  filter: brightness(0);
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
