<script setup lang="ts">
/**
 * Boot screen + reveal, modelled on the reference page-transition.riv:
 *   load  → lime screen, dark PO logo looping (~1.2 s): P stem draws up, bowl
 *           and O wipe in, hold, then the strokes wipe out again.
 *   ready → the loop fades and a PO-shaped hole zooms open from the centre
 *           (exponential, ~0.6 s), uncovering the page; then the wrapper hides.
 * The hole pivots inside the O's left wall (glyph x 202) so no lime is left
 * on screen at full size. "Ready" = WebGL up AND every Rive file loaded.
 */
import gsap from "gsap";

const props = defineProps<{ ready: boolean }>();
/** booted: the boot screen is on screen — start loading the page. */
const emit = defineEmits<{ booted: []; revealed: [] }>();

const leaving = ref(false);
const hidden = ref(false);
const hole = ref<SVGGElement | null>(null);

let loaded = false;
let riveFilesLoaded = false;
let tween: gsap.core.Tween | null = null;

/** PO glyph paths (356 × 300, upright); same shapes as /images/misc/ln-logo.svg. */
const P_STEM = "M0 0H52V300H0Z";
const P_BOWL =
  "M52 0H90C128 0 150 24 150 62V108C150 146 128 170 90 170H52Z M52 48V122H84C94 122 98 116 98 106V64C98 54 94 48 84 48Z";
const O_RING =
  "M222 0H310C338 0 356 18 356 46V254C356 282 338 300 310 300H222C194 300 176 282 176 254V46C176 18 194 0 222 0Z M242 48C233 48 228 53 228 62V238C228 247 233 252 242 252H290C299 252 304 247 304 238V62C304 53 299 48 290 48Z";

function setHole(scale: number, pivotX: number) {
  hole.value?.setAttribute(
    "transform",
    `translate(${window.innerWidth / 2} ${window.innerHeight / 2}) scale(${scale}) translate(${-pivotX} -150)`
  );
}

function reveal() {
  if (!loaded || !riveFilesLoaded || !props.ready || leaving.value) return;
  leaving.value = true;
  // Big enough that the O wall (24 units either side of the pivot) covers the screen.
  const end = Math.hypot(window.innerWidth, window.innerHeight) / 2 / 18;
  const start = 0.02;
  const state = { t: 0 };
  tween = gsap.to(state, {
    t: 1,
    duration: 0.6,
    delay: 0.1,
    ease: "power1.in",
    onUpdate: () => setHole(start * (end / start) ** state.t, 178 + 24 * state.t),
    onComplete: () => {
      hidden.value = true;
      emit("revealed");
    }
  });
}

onMounted(() => {
  setHole(0, 178);
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

onBeforeUnmount(() => tween?.kill());
</script>

<template>
  <div class="transition-w" :class="{ 'is-leaving': leaving, 'is-hidden': hidden }" aria-hidden="true">
    <!-- Lime screen with a PO-shaped hole (scale 0 until the reveal). -->
    <svg class="transition-screen" width="100%" height="100%">
      <defs>
        <mask id="po-hole-mask" maskUnits="userSpaceOnUse" x="0" y="0" width="100%" height="100%">
          <rect width="100%" height="100%" fill="#fff" />
          <g ref="hole" fill="#000" fill-rule="evenodd">
            <g transform="translate(0 150) skewX(-14) translate(0 -150)">
              <path :d="P_STEM" />
              <path :d="P_BOWL" />
              <path :d="O_RING" />
            </g>
          </g>
        </mask>
      </defs>
      <rect width="100%" height="100%" fill="var(--color-lime)" mask="url(#po-hole-mask)" />
    </svg>

    <!-- Looping loader logo -->
    <svg class="transition-logo" viewBox="41 106 430 300">
      <g transform="translate(256 256) skewX(-14) translate(-178 -150)" fill="currentColor" fill-rule="evenodd">
        <path class="po-stem" :d="P_STEM" />
        <path class="po-bowl" :d="P_BOWL" />
        <path class="po-o" :d="O_RING" />
      </g>
    </svg>
  </div>
</template>

<style scoped>
/* Reference sizing: 1rem = clamp(992px, 100vw, 1920px) / 1728 × 16 on desktop. */
.transition-w {
  --ease: cubic-bezier(0.65, 0.05, 0, 1);
  position: fixed;
  inset: 0;
  z-index: 9999;
  width: 100vw;
  height: 100svh;
  pointer-events: auto;
}

.transition-w.is-leaving {
  pointer-events: none;
}

.transition-w.is-hidden {
  visibility: hidden;
}

.transition-screen {
  position: absolute;
  inset: 0;
  display: block;
  width: 100%;
  height: 100%;
}

.transition-logo {
  position: absolute;
  top: 50%;
  left: 50%;
  width: calc(var(--u) * 4);
  translate: -50% -50%;
  color: var(--color-dark-green);
  transition: opacity 0.1s linear;
}

.is-leaving .transition-logo {
  opacity: 0;
}

/* Stroke-by-stroke loop. Wipes run in glyph space, so they follow the slant. */
.po-stem,
.po-bowl,
.po-o {
  animation: 1.2s var(--ease) infinite both;
}

.po-stem {
  animation-name: po-stem;
}

.po-bowl {
  animation-name: po-bowl;
}

.po-o {
  animation-name: po-o;
}

/* Stem draws up from the baseline, later wipes off upward. */
@keyframes po-stem {
  0% { clip-path: inset(100% 0 0 0); }
  22% { clip-path: inset(0 0 0 0); }
  70% { clip-path: inset(0 0 0 0); }
  86%,
  100% { clip-path: inset(0 0 100% 0); }
}

/* Bowl wipes in left → right, later out to the right. */
@keyframes po-bowl {
  0%,
  14% { clip-path: inset(0 100% 0 0); }
  36% { clip-path: inset(0 0 0 0); }
  74% { clip-path: inset(0 0 0 0); }
  90%,
  100% { clip-path: inset(0 0 0 100%); }
}

/* O drops in top → bottom, later wipes out downward. */
@keyframes po-o {
  0%,
  26% { clip-path: inset(0 0 100% 0); }
  50% { clip-path: inset(0 0 0 0); }
  78% { clip-path: inset(0 0 0 0); }
  94%,
  100% { clip-path: inset(100% 0 0 0); }
}

@media (prefers-reduced-motion: reduce) {
  .po-stem,
  .po-bowl,
  .po-o {
    animation: none;
  }
}
</style>
