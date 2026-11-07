<script setup lang="ts">
/**
 * Helmets Hall of Fame (reference `.s-group.bg-black`), live layout at 1440 px
 * in fluid units (1u = 13.33 px there).
 *   - title / copy highlighter reveals (lime; copy +0.2 s);
 *   - 4×4 grid of masked helmet cards; over the grid's "top bottom" →
 *     "bottom top" every card rises 5u → 0, columns 2 and 4 rise 25u → 0
 *     (linear scrub);
 *   - hover: lime outline, helmet ×1.1, photo revealed by an ellipse clip
 *     (0.75 s cubic-bezier(0.65, 0.05, 0, 1));
 *   - callout: reef helmet Rive scrubbed by scroll ("top bottom" →
 *     "bottom center", input scroll = progress × 1000), Brier line, lime CTA.
 */
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

const content = useHomeContent();
const h = computed(() => content.helmets);

const grid = ref<HTMLElement | null>(null);
const cards: (HTMLElement | null)[] = [];
const setCard = (i: number) => (el: unknown) => (cards[i] = el as HTMLElement | null);
const callout = ref<HTMLElement | null>(null);
const reefScroll = ref(0);
const ctaHover = ref(false);
const triggers: ScrollTrigger[] = [];

function updateGrid(progress: number) {
  const unit = fluidUnit();
  const left = isMobileLayout() ? 0 : 1 - progress; // reference ≤767: cards don't lift
  cards.forEach((card, i) => {
    if (!card) return;
    const lift = (i % 2 === 1 ? 25 : 5) * unit * left;
    card.style.transform = `translate3d(0, ${lift}px, 0)`;
  });
}

onMounted(() => {
  gsap.registerPlugin(ScrollTrigger);
  const st = ScrollTrigger.create({
    trigger: grid.value,
    start: "top bottom",
    end: "bottom top",
    onUpdate: (self) => updateGrid(self.progress),
    onRefresh: (self) => updateGrid(self.progress)
  });
  triggers.push(st);
  updateGrid(st.progress);

  const state = { p: 0 };
  const tween = gsap.to(state, {
    p: 1,
    ease: "none",
    onUpdate: () => (reefScroll.value = state.p * 1000),
    scrollTrigger: { trigger: callout.value, start: "top bottom", end: "bottom center", scrub: 0.5 }
  });
  if (tween.scrollTrigger) triggers.push(tween.scrollTrigger);
});

onBeforeUnmount(() => triggers.forEach((t) => t.kill()));
</script>

<template>
  <div class="helmets-group" data-nav-theme-target="light">
    <section class="helmets">
      <div class="helmets-title">
        <div class="helmets-headline">
          <HighLines tag="h2" class="t-mona" :html="h.eyebrow" />
          <HighLines tag="h2" class="t-mona" :html="`<strong>${h.title}</strong>`" />
        </div>
        <HighLines tag="p" class="helmets-p" :html="h.body" :delay="0.2" />
      </div>

      <div ref="grid" class="helmet-grid" role="list">
        <div
          v-for="(item, i) in h.items"
          :key="`${item.year}-${item.name}-${i}`"
          :ref="setCard(i)"
          class="helmet-cell"
          role="listitem"
        >
          <div class="helmet-card">
            <HomeHelmetFrame />
            <div class="helmet-img-w">
              <img class="helmet-img" :src="item.src" alt="" loading="lazy" />
            </div>
            <img class="helmet-reveal" :src="item.hover" alt="" loading="lazy" />
          </div>
          <div class="helmet-label">
            <h3 class="helmet-name">{{ item.name }}</h3>
            <span class="helmet-year">{{ item.year }}</span>
          </div>
        </div>
      </div>
    </section>

    <section ref="callout" class="helmets-callout">
      <div class="callout-icon">
        <RiveCanvas
          file="reef"
          artboard="helmet-reef"
          state-machine="helmet-reef_scroll"
          :inputs="{ color_lime: true, scroll: reefScroll }"
        />
      </div>
      <HighLines class="callout-text" :html="h.callout.text" />
      <a
        class="callout-btn"
        :href="h.callout.cta.href"
        @pointerenter="ctaHover = true"
        @pointerleave="ctaHover = false"
      >
        <span class="callout-btn-text">{{ h.callout.cta.label }}</span>
        <span class="callout-btn-icon">
          <RiveCanvas file="btn-ui" artboard="arrow" state-machine="arrow" :inputs="{ hover: ctaHover }" />
        </span>
      </a>
    </section>
  </div>
</template>

<style scoped>
.helmets-group {
  --ease: cubic-bezier(0.65, 0.05, 0, 1);
  background: #111112;
  color: #f4f4ed;
}

.helmets {
  padding: calc(var(--u) * 2.52) calc(var(--u) * 1.25) calc(var(--u) * 1.2);
}

/* Reference title grid: 4 × 24.845u columns (331.27 px), 1.25u gaps, left-packed. */
.helmets-title {
  display: grid;
  grid-template-columns: repeat(4, calc(var(--u) * 24.845));
  column-gap: calc(var(--u) * 1.25);
}

.helmets-headline {
  grid-column: 1 / 3;
}

.t-mona {
  margin: 0;
  font-family: var(--font-mona);
  font-size: calc(var(--u) * 4.5);
  font-variation-settings: "wdth" 93, "wght" 750;
  line-height: 0.886;
  letter-spacing: calc(var(--u) * -0.125);
  text-transform: uppercase;
}

.t-mona :deep(strong) {
  font-family: "Brier", serif;
  font-size: calc(var(--u) * 4.6875);
  font-weight: 700;
  letter-spacing: normal;
  color: #b2c73a;
}

.helmets-p {
  grid-column: 3 / 4;
  margin: 0;
  color: #b9bbad;
  font-family: var(--font-mona);
  font-size: calc(var(--u) * 1.25);
  font-variation-settings: "wdth" 100, "wght" 500;
  line-height: 1.25;
  letter-spacing: calc(var(--u) * -0.0125);
}

.helmets :deep(.line) {
  margin-inline: 0;
}

.helmet-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: calc(var(--u) * 1.25);
  margin-top: calc(var(--u) * 8.75);
}

.helmet-cell {
  position: relative;
  will-change: transform;
}

.helmet-card {
  position: relative;
  aspect-ratio: 339.2 / 342.6;
  mask-image: url("/images/misc/helm-mask-fill.svg");
  mask-size: cover;
  mask-position: 50% 50%;
  mask-repeat: no-repeat;
  -webkit-mask-image: url("/images/misc/helm-mask-fill.svg");
  -webkit-mask-size: cover;
  -webkit-mask-position: 50% 50%;
  -webkit-mask-repeat: no-repeat;
}

.helmet-card :deep(.frame) {
  position: absolute;
  inset: 0;
  z-index: 2; /* outlines draw over the revealed photo (reference) */
  display: block;
  pointer-events: none;
}

.helmet-card :deep(.frame.is-base) {
  color: #535450;
}

.helmet-card :deep(.frame.is-overlay) {
  opacity: 0;
  transition: opacity 0.75s var(--ease);
}

.helmet-img-w {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
}

.helmet-img {
  display: block;
  width: 100%;
  aspect-ratio: 1;
  transition: transform 0.75s var(--ease);
}

.helmet-reveal {
  position: absolute;
  inset: 0;
  width: 100%;
  max-width: none;
  height: 100%;
  object-fit: cover;
  clip-path: ellipse(100% 0% at 50% 0%);
  transform: scale(1.05);
  transition:
    clip-path 0.75s var(--ease),
    transform 0.75s var(--ease);
}

.helmet-cell:hover .helmet-reveal {
  clip-path: ellipse(100% 120% at 50% 0%);
  transform: scale(1);
}

.helmet-cell:hover .helmet-img {
  transform: scale(1.1);
}

.helmet-cell:hover :deep(.frame.is-overlay) {
  opacity: 1;
}

.helmet-label {
  position: absolute;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  gap: calc(var(--u) * 0.8);
  height: calc(var(--u) * 2);
  font-family: var(--font-mona);
  font-size: calc(var(--u) * 0.9);
  line-height: 1.25;
}

.helmet-name {
  margin: 0;
  font-size: inherit;
  font-weight: 600;
  color: #f4f4ed;
}

.helmet-year {
  font-weight: 700;
  color: #d2ff00;
}

.helmets-callout {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: calc(var(--u) * 2.5);
  padding: calc(var(--u) * 12.05) 0 calc(var(--u) * 8.72);
}

.callout-icon {
  width: calc(var(--u) * 5.625);
  height: calc(var(--u) * 2.775);
}

.callout-text {
  width: calc(var(--u) * 32.5);
  font-family: "Brier", serif;
  font-size: calc(var(--u) * 2);
  font-weight: 700;
  line-height: 1.04;
  letter-spacing: calc(var(--u) * 0.05);
  text-align: center;
}

.callout-btn {
  display: inline-flex;
  align-items: center;
  gap: calc(var(--u) * 0.84);
  height: calc(var(--u) * 3);
  padding: 0 var(--u);
  border: 1px solid #d2ff00;
  border-radius: calc(var(--u) * 0.54);
  background: #d2ff00;
  color: #282c20;
}

.callout-btn-text {
  font-family: var(--font-mona);
  font-size: var(--u);
  font-weight: 800;
  font-variation-settings: "wdth" 86;
  line-height: 1;
  text-transform: uppercase;
}

.callout-btn-icon {
  display: block;
  width: calc(var(--u) * 0.78);
  height: calc(var(--u) * 0.78);
}

/* Reference ≤991 / ≤479 at 375 px: 2-col title and 2-col grid, helmet 12u in a 16.13u card. */
@media (max-width: 767px) {
  .helmets {
    padding: calc(var(--u) * 1.25);
  }

  .helmets-title {
    grid-template-columns: 1fr 1fr;
    column-gap: calc(var(--u) * 2.5);
  }

  .helmets-headline {
    grid-column: 1 / 2;
  }

  .helmets-p {
    grid-column: 2 / 3;
    font-size: calc(var(--u) * 1.3);
  }

  .t-mona {
    font-size: calc(var(--u) * 2.6);
    letter-spacing: calc(var(--u) * -0.072);
  }

  .t-mona :deep(strong) {
    font-size: calc(var(--u) * 2.4);
  }

  .helmet-grid {
    grid-template-columns: 1fr 1fr;
    margin-top: calc(var(--u) * 8.5);
  }

  .helmet-img-w {
    justify-content: center;
  }

  .helmet-img {
    width: 74.4%;
  }

  .helmets-callout {
    padding: calc(var(--u) * 12) 0 calc(var(--u) * 8.75);
  }

  .callout-text {
    width: calc(var(--u) * 29);
    font-size: calc(var(--u) * 1.7);
  }
}
</style>
