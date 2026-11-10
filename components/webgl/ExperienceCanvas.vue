<script setup lang="ts">
import { Experience, type ExperiencePage } from "~/webgl/Experience";

/** Begin loading only once the boot screen is up (reference load order). */
const props = defineProps<{ start: boolean; page?: ExperiencePage }>();

const emit = defineEmits<{
  progress: [number, string];
  ready: [];
  error: [Error];
}>();

const canvas = ref<HTMLCanvasElement | null>(null);
const experience = shallowRef<Experience | null>(null);

let resizeObserver: ResizeObserver | null = null;

const onPointerMove = (event: PointerEvent) => {
  experience.value?.setPointer(
    (event.clientX / window.innerWidth) * 2 - 1,
    1 - (event.clientY / window.innerHeight) * 2
  );
};

let initialised = false;

async function init() {
  if (initialised || !canvas.value) return;
  initialised = true;

  const instance = new Experience({
    canvas: canvas.value,
    page: props.page,
    onProgress: (p, label) => emit("progress", p, label)
  });
  experience.value = instance;

  const applySize = () => {
    instance.resize(window.innerWidth, window.innerHeight);
  };
  applySize();

  try {
    await instance.load();
  } catch (error) {
    emit("error", error as Error);
    return;
  }

  applySize();
  instance.start();
  emit("ready");

  (window as unknown as { experience: Experience }).experience = instance;

  resizeObserver = new ResizeObserver(applySize);
  resizeObserver.observe(document.documentElement);
  window.addEventListener("pointermove", onPointerMove, { passive: true });
}

onMounted(() => {
  watch(
    () => props.start,
    (start) => {
      if (start) init();
    },
    { immediate: true }
  );
});

onBeforeUnmount(() => {
  window.removeEventListener("pointermove", onPointerMove);
  resizeObserver?.disconnect();
  experience.value?.dispose();
  experience.value = null;
});

defineExpose({ experience });
</script>

<template>
  <canvas ref="canvas" class="webgl-canvas" aria-hidden="true" />
</template>
