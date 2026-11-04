<script setup lang="ts">
/**
 * Reference "marquee-adv" behaviour, reusable:
 *   - the item collection plus `duplicate` copies drift continuously at
 *     vw / speed px per second (speed 30 → 48 px/s at 1440), left or right;
 *   - scrolling up reverses the drift, scrolling down restores it;
 *   - the strip is (100 + 2·scrollShift) % wide, offset −scrollShift %, and
 *     slides +scrollShift vw → −scrollShift vw while it crosses the viewport.
 */
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

const props = withDefaults(
  defineProps<{ speed?: number; direction?: "left" | "right"; duplicate?: number; scrollShift?: number }>(),
  { speed: 30, direction: "left", duplicate: 3, scrollShift: 5 }
);

const root = ref<HTMLElement | null>(null);
const strip = ref<HTMLElement | null>(null);
const row = ref<HTMLElement | null>(null);
const copies = computed(() => props.duplicate + 1);

let offset = 0;
let width = 0;
let sign = props.direction === "right" ? 1 : -1;
let flow = 1; // 1 = normal, −1 = reversed while scrolling up
const triggers: ScrollTrigger[] = [];

function measure() {
  const first = row.value?.firstElementChild as HTMLElement | null;
  width = first?.offsetWidth ?? 0;
  offset = -width * 0.5; // reference starts the loop half way
}

function tick(_time: number, deltaMs: number) {
  if (!width || !row.value) return;
  const pxPerSec = window.innerWidth / props.speed;
  offset += sign * flow * pxPerSec * (deltaMs / 1000);
  offset = ((offset % width) - width) % width; // keep in (−width, 0]
  row.value.style.transform = `translate3d(${offset}px, 0, 0)`;
}

onMounted(() => {
  gsap.registerPlugin(ScrollTrigger);
  measure();
  gsap.ticker.add(tick);
  triggers.push(
    ScrollTrigger.create({
      trigger: root.value,
      start: "top bottom",
      end: "bottom top",
      onUpdate: (self) => (flow = self.direction === 1 ? 1 : -1)
    })
  );
  const shift = props.scrollShift * (sign === -1 ? 1 : -1);
  const tween = gsap.fromTo(
    strip.value,
    { x: () => (shift * window.innerWidth) / 100 },
    {
      x: () => (-shift * window.innerWidth) / 100,
      ease: "none",
      scrollTrigger: { trigger: root.value, start: "0% 100%", end: "100% 0%", scrub: 0, invalidateOnRefresh: true }
    }
  );
  if (tween.scrollTrigger) triggers.push(tween.scrollTrigger);
  window.addEventListener("resize", measure);
});

onBeforeUnmount(() => {
  gsap.ticker.remove(tick);
  triggers.forEach((t) => t.kill());
  window.removeEventListener("resize", measure);
});
</script>

<template>
  <div ref="root" class="marquee">
    <div
      ref="strip"
      class="marquee-strip"
      :style="{ marginLeft: `${-scrollShift}%`, width: `${100 + 2 * scrollShift}%` }"
    >
      <div ref="row" class="marquee-row">
        <div v-for="n in copies" :key="n" class="marquee-collection" :aria-hidden="n > 1 ? 'true' : undefined">
          <slot />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.marquee {
  overflow: hidden;
}

.marquee-row {
  display: flex;
  width: max-content;
  will-change: transform;
}

.marquee-collection {
  display: flex;
  flex-shrink: 0;
}
</style>
