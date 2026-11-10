<script setup lang="ts">
/**
 * Reference [data-oval-scroll] on a split-lines block (bundle e0), for wrapped text:
 * the text is split into the lines the browser lays out, each line sits in a clip
 * wrap that opens ellipse(20% 0%) → (100% 120%) at top (or bottom) centre, 1.5 s
 * power2.inOut, 0.15 s apart, once the block's top reaches 95 % of the viewport.
 * (The reference's per-line drops run at page init, so they're done by then.)
 * Input: text with optional <strong>…</strong> runs and <br> (styled by the parent).
 */
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

const props = withDefaults(defineProps<{ html: string; tag?: string; from?: "top" | "bottom" }>(), {
  tag: "div",
  from: "top"
});

interface Word {
  text: string;
  strong: boolean;
  br?: boolean;
}

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
let observer: ResizeObserver | null = null;
let lastWidth = 0;

const at = computed(() => (props.from === "top" ? "50% 0%" : "50% 100%"));

async function split() {
  lines.value = null;
  await nextTick();
  const el = root.value;
  if (!el) return;
  const grouped: Word[][] = [];
  let lineBottom = -Infinity;
  [...el.querySelectorAll<HTMLElement>("[data-word]")].forEach((span, i) => {
    const r = span.getBoundingClientRect();
    const centre = (r.top + r.bottom) / 2;
    if (grouped.length === 0 || centre > lineBottom) {
      grouped.push([]);
      lineBottom = r.bottom;
    } else lineBottom = Math.max(lineBottom, r.bottom);
    grouped[grouped.length - 1].push(words.value[i]);
  });
  lines.value = grouped;
  await nextTick();
  build();
}

function build() {
  timeline?.kill();
  trigger?.kill();
  const wraps = [...(root.value?.querySelectorAll<HTMLElement>(".oval-wrap") ?? [])];
  gsap.set(wraps, { clipPath: `ellipse(20% 0% at ${at.value})` });
  timeline = gsap.timeline({ paused: true });
  timeline.to(wraps, { clipPath: `ellipse(100% 120% at ${at.value})`, duration: 1.5, ease: "power2.inOut", stagger: 0.15 });
  if (played) {
    timeline.progress(1);
    return;
  }
  trigger = ScrollTrigger.create({
    trigger: root.value,
    start: "top 95%",
    once: true,
    onEnter: () => {
      played = true;
      timeline?.play();
    }
  });
}

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
  <component
    :is="tag"
    ref="root"
    :aria-label="html.replace(/<[^>]+>/g, '')"
    :style="lines ? undefined : { visibility: 'hidden' }"
  >
    <template v-if="!lines">
      <template v-for="(w, i) in words" :key="i">
        <br v-if="w.br" />
        <strong v-if="w.strong" data-word>{{ w.text }}</strong>
        <span v-else data-word>{{ w.text }}</span>
      </template>
    </template>
    <div v-else class="oval-outer" aria-hidden="true">
      <div v-for="(line, li) in lines" :key="li" class="oval-wrap">
        <span class="oval-line">
          <template v-for="(w, wi) in line" :key="wi">
            <strong v-if="w.strong">{{ w.text }}</strong>
            <template v-else>{{ w.text }}</template>
          </template>
        </span>
      </div>
    </div>
  </component>
</template>

<style scoped>
.oval-outer {
  overflow: clip;
}

.oval-wrap {
  display: block;
}

.oval-line {
  display: inline-block;
}
</style>
