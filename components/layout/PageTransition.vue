<script setup lang="ts">
/**
 * Boot screen + reveal:
 *   load  → dark-green screen, pulsing PO logo
 *   ready → logo zooms out and the screen fades; wrapper hides at +500 ms.
 * "Ready" = the WebGL experience is up AND every Rive file is loaded.
 */
const props = defineProps<{ ready: boolean }>();
/** booted: the boot screen is on screen — start loading the page. */
const emit = defineEmits<{ booted: []; revealed: [] }>();

const leaving = ref(false);
const hidden = ref(false);

let loaded = false;
let riveFilesLoaded = false;
const timers: number[] = [];

function reveal() {
  if (!loaded || !riveFilesLoaded || !props.ready || leaving.value) return;
  leaving.value = true;
  timers.push(
    window.setTimeout(() => {
      hidden.value = true;
      emit("revealed");
    }, 500)
  );
}

onMounted(() => {
  // Paint the boot screen first, then start loading the page.
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
});

watch(() => props.ready, reveal);

onBeforeUnmount(() => timers.forEach(clearTimeout));
</script>

<template>
  <div class="transition-w" :class="{ 'is-leaving': leaving, 'is-hidden': hidden }" aria-hidden="true">
    <img class="transition-logo" src="/images/misc/ln-logo.svg" alt="" />
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
  background-color: var(--color-dark-green);
  pointer-events: auto;
  transition: opacity 400ms cubic-bezier(0.65, 0.05, 0, 1);
}

.transition-w.is-leaving {
  opacity: 0;
}

.transition-w.is-hidden {
  visibility: hidden;
  pointer-events: none;
}

.transition-logo {
  position: absolute;
  top: 50%;
  left: 50%;
  width: calc(var(--u) * 10);
  height: calc(var(--u) * 10);
  translate: -50% -50%;
  animation: po-pulse 1.6s ease-in-out infinite;
  transition: scale 500ms cubic-bezier(0.65, 0.05, 0, 1);
}

.is-leaving .transition-logo {
  animation: none;
  scale: 1.4;
}

@keyframes po-pulse {
  0%,
  100% {
    scale: 1;
    opacity: 1;
  }
  50% {
    scale: 0.94;
    opacity: 0.7;
  }
}

@media (prefers-reduced-motion: reduce) {
  .transition-logo {
    animation: none;
  }
}
</style>
