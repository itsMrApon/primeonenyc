<script setup lang="ts">
const route = useRoute();
/** Each route is a full page load (nav uses plain links), so the GL page is fixed per boot. */
const glPage = route.path.replace(/\/$/, "") === "/tax-consultant" ? "on-track" : "home";
const booted = ref(false);
const ready = ref(false);
const failure = ref<string | null>(null);

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

/** Pages that run an intro once the boot screen has opened (reference hero containers). */
const onRevealed = () => {
  (window as unknown as { pageRevealed?: boolean }).pageRevealed = true;
  window.dispatchEvent(new Event("page:revealed"));
};

const onError = (error: Error) => {
  failure.value = error.message;
  console.error("[Experience] failed to start", error);
};
</script>

<template>
  <div class="app-root">
    <WebglExperienceCanvas
      :start="booted"
      :page="glPage"
      @ready="ready = true"
      @error="onError"
    />

    <div class="overlay-root">
      <LayoutAppNav />
      <NuxtPage />
    </div>

    <LayoutPageTransition :ready="ready || !!failure" @booted="booted = true" @revealed="onRevealed" />

    <p v-if="failure" class="startup-error" role="alert">
      The experience failed to start: {{ failure }}
    </p>
  </div>
</template>

<style scoped>
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
