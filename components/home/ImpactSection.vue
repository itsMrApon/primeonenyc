<script setup lang="ts">
const content = useHomeContent();
</script>

<template>
  <!-- Transparent: the WebGL dark contour page shows through (reference). -->
  <section class="impact">
    <div class="impact-content">
      <div class="impact-icon">
        <span class="impact-helmet">
          <RiveCanvas
            file="reef"
            artboard="helmet-reef"
            state-machine="helmet-reef_play"
            :inputs="{ 'color_green-off-white-2': true }"
            play-on-view
          />
        </span>
        <HighLines class="impact-eyebrow" :html="content.impact.eyebrow" color="lime" />
      </div>
      <HighLines class="impact-quote" :html="content.impact.html" color="lime-off" />
    </div>
  </section>
</template>

<style scoped>
/* Reference metrics at 1440 px, 1u = clamp(992px, 100vw, 1920px) / 1728 × 16 = 13.33 px. */
.impact {
  position: relative;
  padding: calc(var(--u) * 6) 0 calc(var(--u) * 12);
  background: transparent;
  color: #dde1d2;
  text-align: center;
}

.impact-content {
  width: calc(var(--u) * 80.1);
  margin: 0 auto;
}

.impact-icon {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: calc(var(--u) * 1.25);
}

.impact-helmet {
  display: block;
  width: calc(var(--u) * 6.06);
  height: calc(var(--u) * 3.19);
}

.impact-eyebrow {
  font-family: var(--font-mona);
  font-size: calc(var(--u) * 0.625);
  font-variation-settings: "wdth" 100, "wght" 700;
  line-height: 1;
  text-transform: uppercase;
}

.impact-quote {
  margin-top: calc(var(--u) * 3.75);
  font-family: var(--font-mona);
  font-size: calc(var(--u) * 7.9375);
  font-variation-settings: "wdth" 93, "wght" 660;
  line-height: 0.9;
  letter-spacing: calc(var(--u) * -0.0625);
  text-transform: uppercase;
}

.impact-quote :deep(strong) {
  font-family: "Brier", serif;
  font-size: calc(var(--u) * 8.25);
  font-weight: 700;
  line-height: 0.83;
  letter-spacing: calc(var(--u) * -0.1875);
  color: #b2c73a;
}

/* Reference ≤479 (live at 375 px): full-width column, 3.5u quote, Brier inherits size. */
@media (max-width: 767px) {
  .impact-content {
    width: auto;
    padding: 0 calc(var(--u) * 1.25);
  }

  .impact-helmet {
    width: calc(var(--u) * 4.7);
    height: calc(var(--u) * 2.47);
  }

  .impact-eyebrow {
    font-size: calc(var(--u) * 0.8);
  }

  .impact-quote {
    font-size: calc(var(--u) * 3.5);
  }

  .impact-quote :deep(strong) {
    font-size: inherit;
  }
}
</style>
