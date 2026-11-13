<script setup lang="ts">
/**
 * Laurel badge: reef.riv "helmet-reef" with the helmet masked out and the Prime One PO
 * monogram in its place. Other attrs (inputs, autoplay, play-on-view…) go to
 * RiveCanvas; play() is forwarded so parents that sequence Rives keep working.
 * The PO uses `color` (default currentColor; match it to the laurel colour input) and fades in with
 * `progress` (0–1, e.g. a scroll input / 1000) or, without it, when the Rive plays.
 */
defineOptions({ inheritAttrs: false });

const props = defineProps<{ stateMachine: string; progress?: number; color?: string }>();
const attrs = useAttrs();

const rive = ref<{ play: () => void } | null>(null);
const played = ref(attrs.autoplay !== false);
const opacity = computed(() => props.progress ?? (played.value ? 1 : 0));

function play() {
  rive.value?.play();
  played.value = true;
}

defineExpose({ play });
</script>

<template>
  <div class="po-reef" :style="props.color ? { color: props.color } : undefined">
    <RiveCanvas ref="rive" file="reef" artboard="helmet-reef" :state-machine="props.stateMachine" v-bind="attrs" />
    <svg
      class="po-reef__po"
      :class="{ 'is-timed': props.progress === undefined }"
      :style="{ opacity }"
      viewBox="0 0 356 300"
      aria-hidden="true"
    >
      <g transform="translate(178 150) skewX(-14) translate(-178 -150)" fill="currentColor" fill-rule="evenodd">
        <path d="M0 0H90C128 0 150 24 150 62V108C150 146 128 170 90 170H52V300H0Z M52 48V122H84C94 122 98 116 98 106V64C98 54 94 48 84 48Z" />
        <path
          d="M222 0H310C338 0 356 18 356 46V254C356 282 338 300 310 300H222C194 300 176 282 176 254V46C176 18 194 0 222 0Z M242 48C233 48 228 53 228 62V238C228 247 233 252 242 252H290C299 252 304 247 304 238V62C304 53 299 48 290 48Z"
        />
      </g>
    </svg>
  </div>
</template>

<style scoped>
.po-reef {
  position: relative;
  display: flex;
  width: 100%;
  height: 100%;
}

/* The helmet fills the middle ~48% of the artboard; keep only the laurels either side. */
.po-reef .rive-canvas {
  mask-image: linear-gradient(90deg, #000 25.5%, transparent 25.5% 74.5%, #000 74.5%);
}

.po-reef__po {
  position: absolute;
  top: 50%;
  left: 50%;
  width: auto;
  height: 52%;
  overflow: visible;
  translate: -50% -50%;
}

.po-reef__po.is-timed {
  transition: opacity 0.6s ease 0.3s;
}
</style>
