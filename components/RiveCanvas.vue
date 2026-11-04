<script setup lang="ts">
/**
 * One Rive artboard on a canvas, fed from the shared preloaded files
 * (useRiveFiles). Boolean state-machine inputs are reactive.
 */
import { Alignment, Fit, Layout, Rive, RuntimeLoader, type StateMachineInput } from "@rive-app/canvas";

import { loadAllRiveFiles, type RiveFileKey } from "~/composables/useRiveFiles";

const props = withDefaults(
  defineProps<{
    file: RiveFileKey;
    artboard: string;
    stateMachine: string;
    inputs?: Record<string, boolean>;
    fit?: "contain" | "cover";
  }>(),
  { inputs: () => ({}), fit: "contain" }
);

const canvas = ref<HTMLCanvasElement | null>(null);
let rive: Rive | null = null;
let byName: Record<string, StateMachineInput> = {};
let observer: ResizeObserver | null = null;

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
    autoplay: true,
    layout: new Layout({ fit: props.fit === "cover" ? Fit.Cover : Fit.Contain, alignment: Alignment.Center }),
    onLoad: () => {
      if (!rive) return;
      rive.resizeDrawingSurfaceToCanvas();
      byName = Object.fromEntries(rive.stateMachineInputs(props.stateMachine).map((i) => [i.name, i]));
      applyInputs();
    }
  });
  observer = new ResizeObserver(() => rive?.resizeDrawingSurfaceToCanvas());
  observer.observe(canvas.value);
});

watch(() => props.inputs, applyInputs, { deep: true });

onBeforeUnmount(() => {
  observer?.disconnect();
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
