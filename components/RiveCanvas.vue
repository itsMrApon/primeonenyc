<script setup lang="ts">
/**
 * One Rive artboard on a canvas, fed from the shared preloaded files
 * (useRiveFiles). State-machine inputs (boolean or number) are reactive.
 */
import {
  Alignment,
  Fit,
  Layout,
  Rive,
  RuntimeLoader,
  type StateMachineInput,
  StateMachineInputType
} from "@rive-app/canvas";

import { ScrollTrigger } from "gsap/ScrollTrigger";

import { loadAllRiveFiles, type RiveFileKey } from "~/composables/useRiveFiles";

const props = withDefaults(
  defineProps<{
    file: RiveFileKey;
    artboard: string;
    stateMachine: string;
    inputs?: Record<string, boolean | number>;
    fit?: "contain" | "cover";
    /** Reference behaviour for in-page Rives: start 100 ms after 10 % is in view (bottom −10 %). */
    playOnView?: boolean;
    /** false: stays on its first frame until play() (e.g. a scroll trigger in the parent). */
    autoplay?: boolean;
    /** circuits.riv: on load, set every boolean input except color_* / weight_* false before `inputs` (reference). */
    exclusive?: boolean;
    /**
     * Reference in-page Rives (bundle CH): hidden on their first frame until the canvas
     * reaches this ScrollTrigger start (e.g. "top 80%"), then shown (opacity .1 s) and played.
     */
    playAt?: string;
  }>(),
  { inputs: () => ({}), fit: "contain", playOnView: false, autoplay: true, exclusive: false, playAt: undefined }
);

const canvas = ref<HTMLCanvasElement | null>(null);
let rive: Rive | null = null;
let byName: Record<string, StateMachineInput> = {};
let observer: ResizeObserver | null = null;
let viewObserver: IntersectionObserver | null = null;
let playTrigger: ScrollTrigger | null = null;
let hideTimer = 0;

function applyInputs() {
  for (const [name, value] of Object.entries(props.inputs)) {
    if (byName[name]) byName[name].value = value;
  }
}

onMounted(async () => {
  const files = await loadAllRiveFiles();
  if (!canvas.value) return;
  RuntimeLoader.setWasmUrl("/rive/rive.wasm");
  rive = new Rive({
    buffer: files[props.file].slice(0),
    canvas: canvas.value,
    artboard: props.artboard,
    stateMachines: props.stateMachine,
    autoplay: props.autoplay && !props.playOnView && !props.playAt,
    layout: new Layout({ fit: props.fit === "cover" ? Fit.Cover : Fit.Contain, alignment: Alignment.Center }),
    onLoad: () => {
      if (!rive) return;
      rive.resizeDrawingSurfaceToCanvas();
      const all = rive.stateMachineInputs(props.stateMachine);
      byName = Object.fromEntries(all.map((i) => [i.name, i]));
      if (props.exclusive) {
        for (const i of all) {
          if (i.type === StateMachineInputType.Boolean && !/^(color|weight)_/.test(i.name)) i.value = false;
        }
      }
      applyInputs();
      if (pendingPlay) rive.play();
      if (props.playAt && canvas.value) {
        const el = canvas.value;
        el.style.opacity = "0";
        el.style.transition = "opacity 0.1s ease-in-out";
        rive.play();
        hideTimer = window.setTimeout(() => rive?.pause(), 50);
        playTrigger = ScrollTrigger.create({
          trigger: el,
          start: props.playAt,
          once: true,
          onEnter: () => {
            clearTimeout(hideTimer);
            el.style.opacity = "1";
            rive?.play();
          }
        });
      }
      if (props.playOnView && canvas.value) {
        viewObserver = new IntersectionObserver(
          (entries) => {
            if (!entries.some((e) => e.isIntersecting)) return;
            viewObserver?.disconnect();
            setTimeout(() => rive?.play(), 100);
          },
          { threshold: 0.1, rootMargin: "0px 0px -10% 0px" }
        );
        viewObserver.observe(canvas.value);
      }
    }
  });
  observer = new ResizeObserver(() => rive?.resizeDrawingSurfaceToCanvas());
  observer.observe(canvas.value);
});

watch(() => props.inputs, applyInputs, { deep: true });

let pendingPlay = false;
function play() {
  if (rive) rive.play();
  else pendingPlay = true;
}
defineExpose({ play });

onBeforeUnmount(() => {
  observer?.disconnect();
  viewObserver?.disconnect();
  clearTimeout(hideTimer);
  playTrigger?.kill();
  rive?.cleanup();
  rive = null;
});
</script>

<template>
  <canvas ref="canvas" class="rive-canvas" aria-hidden="true" />
</template>

<style scoped>
.rive-canvas {
  display: block;
  width: 100%;
  height: 100%;
}
</style>
