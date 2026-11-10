<script setup lang="ts">
/**
 * Highlighter line reveal used across the reference site ([data-anim-high]):
 * text is split into the lines the browser lays out; when the block's top
 * reaches 90 % of the viewport (once), each line, 0.15 s apart:
 *   - opens a clip left → right over 0.6 s (power2.out), exposing a solid bar;
 *   - 0.3 s in, the bar shrinks toward the right over 0.6 s (power2.inOut).
 * Input: plain text with optional <strong>…</strong> runs (styled by the parent).
 * `manual`: no scroll trigger; the parent calls play() (e.g. horizontal track,
 * where the reference triggers when the block's left edge passes 90 % of vw).
 */
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

const props = withDefaults(
  defineProps<{
    html: string;
    color?: "lime" | "lime-off" | "dark-green-tint-1";
    tag?: string;
    manual?: boolean;
    /** "right" reveals left → right (bar leaves to the right); "left" mirrors it. */
    direction?: "right" | "left";
    /** Extra start delay in seconds (reference third parameter, given there in ms). */
    delay?: number;
  }>(),
  { color: "lime", tag: "div", manual: false, direction: "right", delay: 0 }
);

const BAR = { lime: "#d2ff00", "lime-off": "#b2c73a", "dark-green-tint-1": "#3b3c38" } as const;
const STAGGER = 0.15;
const CLIP_S = 0.6;
const BAR_S = 0.6;

interface Word {
  text: string;
  strong: boolean;
  /** forced line break (<br>) before this word */
  br?: boolean;
}

/** "a <strong>b c</strong><br>d" → words with a strong flag; trailing space kept. */
const words = computed<Word[]>(() => {
  const out: Word[] = [];
  const re = /<strong>([\s\S]*?)<\/strong>|(<br\s*\/?>)|([^<]+)/g;
  let br = false;
  for (const m of props.html.matchAll(re)) {
    if (m[2]) {
      br = true;
      continue;
    }
    const strong = m[1] !== undefined;
    for (const w of (m[1] ?? m[3] ?? "").split(/(?<=\s)/)) {
      if (!w) continue;
      out.push({ text: w, strong, br });
      br = false;
    }
  }
  return out;
});

const root = ref<HTMLElement | null>(null);
const lines = ref<Word[][] | null>(null);
let timeline: gsap.core.Timeline | null = null;
let trigger: ScrollTrigger | null = null;
let played = false;
let built = false;
let observer: ResizeObserver | null = null;
let lastWidth = 0;

async function split() {
  lines.value = null;
  await nextTick();
  const el = root.value;
  if (!el) return;
  const spans = [...el.querySelectorAll<HTMLElement>("[data-word]")];
  const grouped: Word[][] = [];
  // Mixed fonts (<strong> is a larger face) give different box tops on the same
  // line, so start a new line only when a word's centre drops below the
  // current line's bottom.
  let lineBottom = -Infinity;
  spans.forEach((span, i) => {
    const r = span.getBoundingClientRect();
    const centre = (r.top + r.bottom) / 2;
    if (grouped.length === 0 || centre > lineBottom) {
      grouped.push([]);
      lineBottom = r.bottom;
    } else {
      lineBottom = Math.max(lineBottom, r.bottom);
    }
    grouped[grouped.length - 1].push(words.value[i]);
  });
  lines.value = grouped;
  await nextTick();
  animate();
}

function animate() {
  const el = root.value;
  if (!el) return;
  timeline?.kill();
  trigger?.kill();
  const lineEls = [...el.querySelectorAll<HTMLElement>(".line")];
  timeline = gsap.timeline({ paused: true });
  const right = props.direction === "right";
  const hidden = right ? "inset(0 100% 0 0)" : "inset(0 0 0 100%)";
  const shown = right ? "inset(0 0% 0 0)" : "inset(0 0 0 0%)";
  lineEls.forEach((line, i) => {
    const bar = line.querySelector<HTMLElement>(".high-line-reveal");
    gsap.set(line, { clipPath: hidden });
    gsap.set(bar, { scaleX: 1, transformOrigin: right ? "right center" : "left center" });
    const at = props.delay + i * STAGGER;
    timeline!.to(line, { clipPath: shown, duration: CLIP_S, ease: "power2.out" }, at);
    timeline!.to(bar, { scaleX: 0, duration: BAR_S, ease: "power2.inOut" }, at + CLIP_S / 2);
  });
  const wasBuilt = built;
  built = true;
  if (played) {
    // first build after an early play(): animate; a re-split after resize: jump to the end
    if (wasBuilt) timeline.progress(1);
    else timeline.play();
    return;
  }
  if (props.manual) return;
  trigger = ScrollTrigger.create({
    trigger: el,
    start: "top 90%",
    once: true,
    onEnter: () => {
      played = true;
      timeline?.play();
    }
  });
}

function play() {
  if (played) return;
  played = true;
  timeline?.play();
}

defineExpose({ play });

onMounted(async () => {
  gsap.registerPlugin(ScrollTrigger);
  await document.fonts.ready;
  await split();
  lastWidth = root.value?.clientWidth ?? 0;
  observer = new ResizeObserver(() => {
    const w = root.value?.clientWidth ?? 0;
    if (Math.abs(w - lastWidth) < 1) return;
    lastWidth = w;
    split();
  });
  if (root.value) observer.observe(root.value);
});

onBeforeUnmount(() => {
  observer?.disconnect();
  timeline?.kill();
  trigger?.kill();
});
</script>

<template>
  <component :is="tag" ref="root" class="high-lines" :aria-label="html.replace(/<[^>]+>/g, '')">
    <template v-if="!lines">
      <template v-for="(w, i) in words" :key="i">
        <br v-if="w.br" />
        <strong v-if="w.strong" data-word>{{ w.text }}</strong>
        <span v-else data-word>{{ w.text }}</span>
      </template>
    </template>
    <template v-else>
      <span v-for="(line, li) in lines" :key="li" class="line" aria-hidden="true">
        <template v-for="(w, wi) in line" :key="wi">
          <strong v-if="w.strong">{{ w.text }}</strong>
          <template v-else>{{ w.text }}</template>
        </template>
        <span class="high-line-reveal" :style="{ backgroundColor: BAR[color] }" />
      </span>
    </template>
  </component>
</template>

<style scoped>
.line {
  position: relative;
  display: block;
  width: fit-content;
  margin-inline: auto;
  clip-path: inset(0 100% 0 0);
}

.high-line-reveal {
  position: absolute;
  inset: 0;
  z-index: 5;
  transform-origin: right center;
}
</style>
