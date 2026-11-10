<script setup lang="ts">
/**
 * Off Track impact (reference .impact-content-w.off-track), second half of the photo flight.
 * See .reanimate/off-track/spec.md.
 *   - reef.riv off-icons-reef (play at "top 80%") over the eyebrow highlighter.
 *   - Quote: oval reveal per line at "top 95%" (OvalLines); Brier runs in green-off-white-2.
 *   - [data-heroflip="pos2"] centred on the quote, lowered 10u; "pos3" over the signature:
 *     where the flying photo passes and lands (useHeroImageFlip).
 *   - Signature (signature_scroll, dark-green-tint-2): written on with the scroll while its
 *     box goes from "top 50%" to "top 10%".
 */
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import content from "~/content/off-track.json";

const impact = content.impact;
const sigWrap = ref<HTMLElement | null>(null);
const sig = ref<{ seek: (p: number) => void } | null>(null);
let trigger: ScrollTrigger | null = null;

onMounted(() => {
  gsap.registerPlugin(ScrollTrigger);
  trigger = ScrollTrigger.create({
    trigger: sigWrap.value,
    start: "top 50%",
    end: "top 10%",
    scrub: true,
    onUpdate: (self) => sig.value?.seek(self.progress)
  });
});

onBeforeUnmount(() => trigger?.kill());
</script>

<template>
  <section class="off-impact">
    <div class="content">
      <div class="icon-w">
        <div class="reef">
          <RiveCanvas
            file="reef"
            artboard="off-icons-reef"
            state-machine="off-icons-reef_play"
            :inputs="{ 'color_green-off-white-2': true }"
            play-at="top 80%"
          />
        </div>
        <HighLines class="eyebrow" :html="impact.eyebrow" />
      </div>
      <div class="text-w">
        <OvalLines class="quote" :html="impact.html" />
        <div data-heroflip="pos2" class="img-pos2" />
      </div>
      <div class="icon-w is-end">
        <div data-heroflip="pos3" class="img-pos3" />
        <div ref="sigWrap" class="sig-w">
          <div class="sig">
            <SignatureDraw ref="sig" color="#535450" :weight="3" :autoplay="false" />
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
/* Reference metrics at 1440 px; 1u = 13.33 px (the reference rem). */
.off-impact {
  --gap: calc(var(--u) * 1.25);
  padding: 0 var(--gap);
}

.content {
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: center;
  gap: calc(var(--gap) * 3);
  max-width: calc(var(--u) * 78);
  margin-inline: auto;
  padding: calc(var(--u) * 17) 0 calc(var(--u) * 12);
  color: #dde1d2;
  text-align: center;
}

.icon-w {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: var(--gap);
}

/* .base-helmet-rive */
.reef {
  position: relative;
  display: flex;
  width: calc(var(--u) * 6.0625);
  height: calc(var(--u) * 3.1875);
  margin-inline: auto;
}

.eyebrow {
  letter-spacing: 0;
  font-family: var(--font-mona);
  font-size: calc(var(--u) * 0.625);
  font-variation-settings: "wght" 700, "wdth" 100;
  line-height: 1;
  text-transform: uppercase;
}

.text-w {
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  color: #282c20;
}

/* .text-impact-lg-mona */
.quote {
  font-family: var(--font-mona);
  font-size: calc(var(--u) * 7.9375);
  font-variation-settings: "wght" 660, "wdth" 93;
  line-height: 90.6%;
  letter-spacing: calc(var(--u) * -0.0625);
  text-transform: uppercase;
}

/* .text-impact-lg-brier.c-green-off-white-2 */
.quote :deep(strong) {
  font-family: var(--font-brier);
  font-size: calc(var(--u) * 8.25);
  font-weight: 700;
  font-variation-settings: normal;
  line-height: 83%;
  letter-spacing: calc(var(--u) * -0.1875);
  color: #b4b8a5;
}

/* .off-t-impact-img-pos */
.img-pos2 {
  position: absolute;
  z-index: 10;
  width: calc(var(--u) * 22);
  height: calc(var(--u) * 25);
  transform: translate(0, calc(var(--u) * 10));
}

.icon-w.is-end {
  z-index: 30;
  justify-content: center;
  align-items: center;
  margin-top: calc(var(--u) * 3);
}

/* .off-t-impact-img-pos2 */
.img-pos3 {
  position: absolute;
  flex: none;
  width: calc(var(--u) * 7);
  aspect-ratio: 9 / 10;
}

.sig-w {
  position: relative;
}

/* .base-helmet-rive.off-track-impact */
.sig {
  position: relative;
  display: flex;
  width: calc(var(--u) * 8);
  aspect-ratio: 6.0625 / 3.1875;
  justify-content: center;
  margin-inline: auto;
  transform: scale(1.3);
}

/* The signature_scroll artboard draws the signature at ~88 % of the box width. */
.sig :deep(.signature-draw) {
  width: 88%;
}

/* Reference ≤479 (live at 375 px; 1u = the phone rem). */
@media (max-width: 767px) {
  .off-impact {
    padding: 0 calc(var(--u) * 1.25);
  }

  .eyebrow {
    font-size: calc(var(--u) * 0.8);
  }

  .reef {
    width: calc(var(--u) * 4.7);
    height: auto;
    aspect-ratio: 6.0625 / 3.1875;
  }

  .quote {
    font-size: calc(var(--u) * 3.5);
    line-height: 0.9;
  }

  .quote :deep(strong) {
    font-size: calc(var(--u) * 3.6);
  }
}
</style>
