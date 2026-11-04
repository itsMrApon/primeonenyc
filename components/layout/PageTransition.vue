<script setup lang="ts">
/**
 * Boot screen + reveal, driven by the reference's own page-transition.riv:
 *   load  → state machine "page-transition" with `initial` = true
 *           (lime screen, looping LN logo, "Load Norris" button)
 *   ready → `initial` false, `transition-in` true (the "4" mask opens);
 *           button fades at +100 ms, wrapper hides at +500 ms.
 * "Ready" = the WebGL experience is up AND every Rive file is loaded, as on
 * the reference (the state machine opens immediately once told to).
 */
import { Alignment, Fit, Layout, Rive, RuntimeLoader, type StateMachineInput } from "@rive-app/canvas";

const props = defineProps<{ ready: boolean }>();
/** booted: the lime boot state is on screen — start loading the page (reference order). */
const emit = defineEmits<{ booted: []; revealed: [] }>();

const canvas = ref<HTMLCanvasElement | null>(null);
const buttonHidden = ref(false);
const hidden = ref(false);
const riveReady = ref(false); // until then the wrapper itself paints lime

let rive: Rive | null = null;
let inputs: Record<string, StateMachineInput> = {};
let loaded = false;
let riveFilesLoaded = false;
const timers: number[] = [];

const onResize = () => rive?.resizeDrawingSurfaceToCanvas();

function reveal() {
  if (!loaded || !riveFilesLoaded || !props.ready || hidden.value) return;
  inputs.initial.value = false;
  inputs["transition-out"].value = false;
  inputs["transition-in"].value = true;
  timers.push(window.setTimeout(() => (buttonHidden.value = true), 100));
  timers.push(
    window.setTimeout(() => {
      hidden.value = true;
      emit("revealed");
    }, 500)
  );
}

onMounted(() => {
  if (!canvas.value) return;
  RuntimeLoader.setWasmUrl("/rive/rive.wasm");
  rive = new Rive({
    src: "/rive/page-transition.riv",
    canvas: canvas.value,
    artboard: "page-transition",
    stateMachines: "page-transition",
    autoplay: true,
    layout: new Layout({ fit: Fit.Cover, alignment: Alignment.Center }),
    onLoad: () => {
      if (!rive) return;
      rive.resizeDrawingSurfaceToCanvas();
      inputs = Object.fromEntries(rive.stateMachineInputs("page-transition").map((i) => [i.name, i]));
      inputs.initial.value = true;
      inputs["transition-out"].value = false;
      inputs["transition-in"].value = false;
      riveReady.value = true;
      // Let the state machine enter `initial` before anything can flip it,
      // otherwise it jumps straight to the end and the "4" never plays.
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          loaded = true;
          emit("booted");
          loadAllRiveFiles()
            .catch((error) => console.error("[PageTransition] Rive preload failed", error))
            .finally(() => {
              riveFilesLoaded = true;
              reveal();
            });
        })
      );
    }
  });
  window.addEventListener("resize", onResize);
});

watch(() => props.ready, reveal);

onBeforeUnmount(() => {
  timers.forEach(clearTimeout);
  window.removeEventListener("resize", onResize);
  rive?.cleanup();
  rive = null;
});
</script>

<template>
  <div class="transition-w" :class="{ 'is-hidden': hidden, 'is-rive': riveReady }" aria-hidden="true">
    <div class="transition-rive"><canvas ref="canvas" /></div>
    <div class="transition-btn" :class="{ 'is-faded': buttonHidden }">
      <span class="transition-btn__inner">Load Norris</span>
    </div>
  </div>
</template>

<style scoped>
/* Reference sizing: 1rem = clamp(992px, 100vw, 1920px) / 1728 × 16 on desktop. */
.transition-w {
  --u: calc(clamp(992px, 100vw, 1920px) / 1728 * 16);
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  justify-content: center;
  align-items: flex-end;
  width: 100vw;
  height: 100svh;
  background-color: var(--color-lime);
  pointer-events: auto;
}

/* Once the artboard is up it paints the lime itself (and opens the "4"). */
.transition-w.is-rive {
  background-color: transparent;
}

.transition-w.is-hidden {
  visibility: hidden;
  pointer-events: none;
}

.transition-rive {
  position: absolute;
  inset: 0;
}

.transition-rive canvas {
  display: block;
  width: 100%;
  height: 100%;
}

.transition-btn {
  position: relative;
  z-index: 10;
  bottom: calc(var(--u) * 1.25);
  transition: opacity 300ms;
}

.transition-btn.is-faded {
  opacity: 0;
}

.transition-btn__inner {
  display: flex;
  align-items: center;
  height: calc(var(--u) * 3);
  padding: 0 var(--u);
  border: 1px solid var(--color-lime);
  border-radius: calc(var(--u) * 0.54);
  background: var(--color-lime);
  color: #282c20;
  font-family: var(--font-mona);
  font-size: var(--u);
  font-weight: 800;
  line-height: 1;
  text-transform: uppercase;
}
</style>
