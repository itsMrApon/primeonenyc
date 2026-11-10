<script setup lang="ts">
/**
 * Calendar hero (reference .s.is-calendar-hero, a [data-hero-animation-container]):
 * "Upcoming / 2026 calendar" centred between two 12u spacers, the lime signature
 * (SignatureDraw in place of signature.riv) centred over it, written on once the boot
 * screen has opened (reference: page init +750 ms, data-hero-animation).
 */
import content from "~/content/calendar.json";

const hero = content.hero;
const sig = ref<{ play: () => void } | null>(null);
let timer: ReturnType<typeof setTimeout> | undefined;

const start = () => {
  timer = setTimeout(() => sig.value?.play(), 750);
};

onMounted(() => {
  if ((window as unknown as { pageRevealed?: boolean }).pageRevealed) start();
  else window.addEventListener("page:revealed", start, { once: true });
});

onBeforeUnmount(() => {
  clearTimeout(timer);
  window.removeEventListener("page:revealed", start);
});
</script>

<template>
  <section class="cal-hero">
    <div class="c">
      <div class="spacer" />
      <div class="layout">
        <h1 class="impact">
          {{ hero.title }}<br /><span class="impact-brier">{{ hero.titleBrier }}</span>
        </h1>
        <div class="sig-w" aria-hidden="true">
          <SignatureDraw ref="sig" color="#d2ff00" :autoplay="false" />
        </div>
      </div>
      <div class="spacer" />
    </div>
  </section>
</template>

<style scoped>
/* Reference metrics at 1440 px; 1u = 13.33 px (the reference rem). */
.cal-hero {
  position: relative;
  color: #f4f4ed;
}

.c {
  padding: 0 calc(var(--u) * 1.25);
}

.spacer {
  height: calc(var(--u) * 12);
}

.layout {
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  text-align: center;
}

/* .text-impact-lg-mona */
.impact {
  margin: 0;
  font-family: var(--font-mona);
  font-size: calc(var(--u) * 7.9375);
  font-weight: 700;
  font-variation-settings: "wdth" 93, "wght" 660;
  line-height: 0.9;
  letter-spacing: calc(var(--u) * -0.0625);
  text-transform: uppercase;
}

/* .text-impact-lg-brier.c-grey-on-track */
.impact-brier {
  font-family: var(--font-brier);
  font-size: calc(var(--u) * 8.25);
  line-height: 0.83;
  letter-spacing: calc(var(--u) * -0.1875);
  color: #b9bbad;
}

.sig-w {
  position: absolute;
  top: 50%;
  left: 50%;
  width: calc(var(--u) * 36.2);
  height: calc(var(--u) * 24.2);
  transform: translate(-50%, -50%);
  pointer-events: none;
}

/* Reference ≤479 (phone rem): 1u side padding, 12u / 5u spacers, 3.5u type, 16u signature. */
@media (max-width: 767px) {
  .c {
    padding: 0 var(--u);
  }

  .spacer:last-child {
    height: calc(var(--u) * 5);
  }

  .impact,
  .impact-brier {
    font-size: calc(var(--u) * 3.5);
  }

  .sig-w {
    width: calc(var(--u) * 16);
    height: calc(var(--u) * 10.67);
  }
}
</style>
