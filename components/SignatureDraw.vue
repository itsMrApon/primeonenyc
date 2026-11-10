<script setup lang="ts">
/**
 * Kamrun Nahar signature written on stroke by stroke (stands in for signature.riv "signature_play").
 * Same contract as the RiveCanvas it replaces: `playAt` starts it once at that ScrollTrigger start;
 * `autoplay: false` waits for the exposed play(). The whole signature takes DURATION s (the Rive's
 * write-on time), shared between strokes by length with a short pen lift between them.
 */
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import { SIGNATURE_PEN, SIGNATURE_STROKES, SIGNATURE_VIEWBOX } from "~/utils/strokes/signature";

const props = withDefaults(
  defineProps<{
    color?: string;
    /** Pen width as a multiple of the source artwork's pen. */
    weight?: number;
    playAt?: string;
    autoplay?: boolean;
  }>(),
  { color: "#b9bbad", weight: 2, playAt: undefined, autoplay: true }
);

const DURATION = 1.6;
const LIFT = 0.06;

const svg = ref<SVGSVGElement | null>(null);
const paths = ref<SVGPathElement[]>([]);
const strokes = SIGNATURE_STROKES;

let tl: gsap.core.Timeline | null = null;
let trigger: ScrollTrigger | null = null;

function play() {
  tl?.play();
}
/** Scroll-driven write-on (signature.riv "signature_scroll"): 0 = blank, 1 = written. */
function seek(progress: number) {
  tl?.progress(progress);
}
defineExpose({ play, seek });

onMounted(() => {
  const lifts = (strokes.length - 1) * LIFT;
  const total = strokes.reduce((a, s) => a + s.length, 0);
  tl = gsap.timeline({ paused: true });
  paths.value.forEach((el, i) => {
    const s = strokes[i];
    const dur = Math.max(0.02, ((DURATION - lifts) * s.length) / total);
    // Dots (zero length): pop in; strokes: trim end 0 -> 1 (pathLength 1, dasharray "1 1").
    if (s.length < 1) tl!.set(el, { opacity: 1 }, `+=${LIFT}`);
    else tl!.to(el, { strokeDashoffset: 0, duration: dur, ease: "sine.inOut" }, i ? `+=${LIFT}` : 0);
  });
  if (props.playAt) {
    trigger = ScrollTrigger.create({ trigger: svg.value, start: props.playAt, once: true, onEnter: play });
  } else if (props.autoplay) play();
});

onBeforeUnmount(() => {
  trigger?.kill();
  tl?.kill();
});
</script>

<template>
  <svg ref="svg" class="signature-draw" :viewBox="SIGNATURE_VIEWBOX" fill="none" aria-hidden="true">
    <path
      v-for="(s, i) in strokes"
      :key="i"
      ref="paths"
      :d="s.d"
      :stroke="color"
      :stroke-width="SIGNATURE_PEN * weight"
      stroke-linecap="round"
      stroke-linejoin="round"
      pathLength="1"
      stroke-dasharray="1 1"
      :stroke-dashoffset="s.length < 1 ? 0 : 1"
      :opacity="s.length < 1 ? 0 : 1"
    />
  </svg>
</template>

<style scoped>
.signature-draw {
  display: block;
  width: 100%;
  height: 100%;
  overflow: visible;
}
</style>
