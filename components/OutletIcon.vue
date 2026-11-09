<script setup lang="ts">
/**
 * Office storefront outline (calendar/outlets/*.svg) as a small line icon, standing in for the
 * circuits.riv tracks: drawn on group by group (roof → sign → wall → door → windows → bars →
 * details), then swaying on Y in a gentle turntable loop. Stroke width is in CSS px.
 */
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

const props = withDefaults(
  defineProps<{ src: string; color?: string; strokeWidth?: number; playAt?: string; draw?: boolean }>(),
  { color: "currentColor", strokeWidth: 1.2, playAt: "top 90%", draw: true }
);

const GROUP_DELAY: Record<string, number> = { roof: 0, sign: 0.25, wall: 0.45, door: 0.6, windows: 0.7, bars: 0.85, details: 1 };
const DRAW = 0.8;

const root = ref<HTMLElement | null>(null);
const viewBox = ref("0 0 766 482");
const paths = ref<{ d: string; group: string }[]>([]);
const els = ref<SVGPathElement[]>([]);

let tl: gsap.core.Timeline | null = null;
let sway: gsap.core.Tween | null = null;
let trigger: ScrollTrigger | null = null;

onMounted(async () => {
  const text = await fetch(props.src).then((r) => r.text());
  const doc = new DOMParser().parseFromString(text, "image/svg+xml");
  viewBox.value = doc.documentElement.getAttribute("viewBox") ?? viewBox.value;
  paths.value = [...doc.querySelectorAll("path")].map((p) => ({
    d: p.getAttribute("d") ?? "",
    group: p.closest("g")?.id ?? ""
  }));
  await nextTick();
  if (!root.value) return;

  sway = gsap.fromTo(root.value, { rotationY: -28 }, { rotationY: 28, duration: 3, ease: "sine.inOut", repeat: -1, yoyo: true });
  if (!props.draw) return;
  tl = gsap.timeline({ paused: true });
  els.value.forEach((el, i) => {
    tl!.fromTo(el, { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: DRAW, ease: "power2.inOut" }, GROUP_DELAY[paths.value[i].group] ?? 1);
  });
  tl.progress(0);
  trigger = ScrollTrigger.create({ trigger: root.value, start: props.playAt, once: true, onEnter: () => tl?.play() });
});

onBeforeUnmount(() => {
  trigger?.kill();
  tl?.kill();
  sway?.kill();
});
</script>

<template>
  <div class="outlet-icon">
    <div ref="root" class="outlet-icon-inner">
      <svg :viewBox="viewBox" fill="none" aria-hidden="true">
        <path
          v-for="(p, i) in paths"
          :key="i"
          ref="els"
          :d="p.d"
          :stroke="color"
          :stroke-width="strokeWidth"
          vector-effect="non-scaling-stroke"
          stroke-linecap="round"
          stroke-linejoin="round"
          pathLength="1"
          stroke-dasharray="1 1"
          :stroke-dashoffset="draw ? 1 : 0"
        />
      </svg>
    </div>
  </div>
</template>

<style scoped>
.outlet-icon {
  display: flex;
  width: 100%;
  height: 100%;
  perspective: 400px;
}

.outlet-icon-inner {
  display: flex;
  width: 100%;
  height: 100%;
}

.outlet-icon svg {
  display: block;
  width: 100%;
  height: 100%;
  overflow: visible;
}
</style>
