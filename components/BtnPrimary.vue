<script setup lang="ts">
/**
 * Reference primary button (.btn-w, lime): 3u tall, padding 0 1u, radius .54u,
 * Mona 1u wdth 86 wght 800 caps + btn-ui.riv arrow (hover input).
 * Text hover ([data-anim="text-hover"]): chars slide y −100 % (0.6 s power3.out,
 * stagger .02) and back on leave; a text-shadow one line below fills the gap.
 */
import gsap from "gsap";

const props = defineProps<{ label: string; href: string }>();

const root = ref<HTMLElement | null>(null);
const hover = ref(false);
const chars = computed(() => props.label.split(""));

function slide(on: boolean) {
  hover.value = on;
  const cs = root.value?.querySelectorAll(".btn-char");
  if (!cs?.length) return;
  gsap.to(cs, { yPercent: on ? -100 : 0, duration: 0.6, stagger: 0.02, ease: "power3.out", overwrite: true });
}
</script>

<template>
  <a ref="root" class="btn" :href="href" @mouseenter="slide(true)" @mouseleave="slide(false)">
    <span class="btn-inner">
      <span class="btn-text-w">
        <span class="btn-text" :aria-label="label">
          <span v-for="(c, i) in chars" :key="i" class="btn-char" aria-hidden="true">{{ c === " " ? " " : c }}</span>
        </span>
      </span>
      <span class="btn-icon">
        <span class="btn-rive">
          <RiveCanvas file="btn-ui" artboard="arrow" state-machine="arrow" :inputs="{ hover }" />
        </span>
      </span>
    </span>
  </a>
</template>

<style scoped>
.btn {
  display: flex;
  flex: none;
  justify-content: center;
  align-items: center;
  height: calc(var(--u) * 3);
  padding: 0 var(--u);
  border: 1px solid var(--color-lime);
  border-radius: calc(var(--u) * 0.54);
  background-color: var(--color-lime);
  color: #282c20;
  text-decoration: none;
}

.btn-inner {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: calc(var(--u) * 0.625);
}

.btn-text-w {
  overflow: clip;
}

.btn-text {
  display: block;
  font-family: var(--font-mona);
  font-size: var(--u);
  font-weight: 800;
  font-variation-settings: "wdth" 86;
  line-height: 1;
  text-transform: uppercase;
  text-shadow: 0 var(--u) currentColor;
  white-space: nowrap;
}

.btn-char {
  display: inline-block;
}

.btn-icon {
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  width: calc(var(--u) * 1.2);
  aspect-ratio: 1;
}

.btn-rive {
  display: flex;
  height: calc(var(--u) * 0.78125);
  aspect-ratio: 1;
}
</style>
