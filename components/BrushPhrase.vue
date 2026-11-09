<script setup lang="ts">
/**
 * Lime brush phrase built from the phrases.riv "race-day" strokes (utils/strokes/taxDay.ts):
 * "Tax Day" in full (countdown), or a subset of strokes such as just "Tax" (`only` + `viewBox`).
 * Each stroke is revealed by its sampled trim curve on one GSAP clock, started like the Rive
 * it replaces: once at `playAt` ("top 80%"), or by the exposed play() when `autoplay` is false.
 */
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import { TAX_DAY_COLOR, TAX_DAY_STROKES, TAX_DAY_VIEWBOX } from "~/utils/strokes/taxDay";

const props = withDefaults(
  defineProps<{ only?: string[]; viewBox?: string; playAt?: string; autoplay?: boolean }>(),
  { only: undefined, viewBox: TAX_DAY_VIEWBOX, playAt: "top 80%", autoplay: true }
);

const svg = ref<SVGSVGElement | null>(null);
const paths = ref<SVGPathElement[]>([]);
const strokes = props.only ? TAX_DAY_STROKES.filter((s) => props.only!.includes(s.name)) : TAX_DAY_STROKES;
const t0 = Math.min(...strokes.map((s) => s.start));
const duration = Math.max(...strokes.map((s) => s.start + (s.curve.length - 1) / 60)) - t0;

let tween: gsap.core.Tween | null = null;
let trigger: ScrollTrigger | null = null;

/** Trim-end progress of a stroke at clock time t (linear between the 60 fps samples). */
function progress(s: (typeof strokes)[number], t: number) {
  const f = (t + t0 - s.start) * 60;
  if (f <= 0) return 0;
  const i = Math.floor(f);
  if (i >= s.curve.length - 1) return s.curve[s.curve.length - 1];
  return s.curve[i] + (s.curve[i + 1] - s.curve[i]) * (f - i);
}

function draw(t: number) {
  strokes.forEach((s, i) => {
    const p = progress(s, t);
    // pathLength 1, dasharray "1 1": offset 1-p shows [0,p]; p-1 shows [1-p,1].
    paths.value[i]?.style.setProperty("stroke-dashoffset", String(s.reverse ? p - 1 : 1 - p));
  });
}

let pendingPlay = false;
function play() {
  if (tween) tween.play();
  else pendingPlay = true;
}
defineExpose({ play });

onMounted(() => {
  draw(0);
  const clock = { t: 0 };
  tween = gsap.to(clock, { t: duration, duration, ease: "none", paused: true, onUpdate: () => draw(clock.t) });
  if (pendingPlay) tween.play();
  else if (props.autoplay) {
    trigger = ScrollTrigger.create({ trigger: svg.value, start: props.playAt, once: true, onEnter: play });
  }
});

onBeforeUnmount(() => {
  trigger?.kill();
  tween?.kill();
});
</script>

<template>
  <svg ref="svg" class="brush-phrase" :viewBox="viewBox" fill="none" aria-hidden="true">
    <path
      v-for="s in strokes"
      :key="s.name"
      ref="paths"
      :d="s.d"
      :transform="s.transform || undefined"
      :stroke="TAX_DAY_COLOR"
      :stroke-width="s.width"
      pathLength="1"
      stroke-dasharray="1 1"
      stroke-dashoffset="1"
    />
  </svg>
</template>

<style scoped>
.brush-phrase {
  display: block;
  width: 100%;
  height: 100%;
  overflow: visible;
}
</style>
