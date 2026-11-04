<script setup lang="ts">
const ready = ref(false);
const failure = ref<string | null>(null);
const loadProgress = ref(0);
const loadLabel = ref("");

const syncAppVh = () => {
  document.documentElement.style.setProperty("--app-vh", `${window.innerHeight * 0.01}px`);
};

onMounted(() => {
  syncAppVh();
  window.addEventListener("resize", syncAppVh, { passive: true });
});

onBeforeUnmount(() => {
  window.removeEventListener("resize", syncAppVh);
});

const onProgress = (p: number, label: string) => {
  loadProgress.value = p;
  loadLabel.value = label;
};

const onError = (error: Error) => {
  failure.value = error.message;
  console.error("[Experience] failed to start", error);
};
</script>

<template>
  <div class="app-root">
    <WebglExperienceCanvas
      @progress="onProgress"
      @ready="ready = true"
      @error="onError"
    />

    <div class="overlay-root">
      <LayoutAppNav />
      <NuxtPage />
    </div>

    <div v-if="!ready && !failure" class="boot" aria-live="polite">
      <p class="eyebrow">Loading Norris</p>
      <p class="boot__bar">
        <span :style="{ width: `${Math.round(loadProgress * 100)}%` }" />
      </p>
      <p class="boot__label">{{ loadLabel }}</p>
    </div>

    <p v-if="failure" class="startup-error" role="alert">
      The experience failed to start: {{ failure }}
    </p>
  </div>
</template>

<style scoped>
.boot {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: grid;
  place-content: center;
  gap: 0.75rem;
  background: var(--color-lime);
  color: var(--color-dark-green);
  pointer-events: none;
}

.boot__bar {
  width: min(220px, 50vw);
  height: 3px;
  background: color-mix(in srgb, var(--color-dark-green) 20%, transparent);
  overflow: hidden;
}

.boot__bar span {
  display: block;
  height: 100%;
  background: var(--color-dark-green);
  transition: width 0.25s ease;
}

.boot__label {
  font-size: 0.8rem;
  opacity: 0.7;
  text-align: center;
}

.startup-error {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 100;
  margin: 0;
  padding: 12px 20px;
  border-radius: 999px;
  background: rgb(0 0 0 / 70%);
  color: #fff;
  font-size: 14px;
}
</style>
