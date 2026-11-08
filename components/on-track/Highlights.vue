<script setup lang="ts">
/**
 * On Track "F1 result highlights" (reference .c.is-f1-highlight-outer).
 * See .reanimate/on-track/03-f1-highlight-outer/spec.md.
 *   - Title + paragraph highlighters; header eyebrows (grey). The paragraph's <br>s
 *     reproduce the reference's line breaks, which are narrower than its 331 px box
 *     (its split lines are frozen inline-blocks).
 *   - Full-bleed rows (11.775 / 35.325 / 23.55 % / 1fr / 1fr): hover → lime row,
 *     black text, top line hidden. Rows reveal with useStatListReveal.
 *   - Cursor photo over the list (bundle T$): 20.6 × 24.6u, follows the cursor
 *     (+20, −20 px, 0.5 s power2.out), clip ellipse(120% 0%) → (120% 120%) 0.8 s
 *     power2.out in, reversed at ×2 out; photo = the hovered row's image.
 */
import gsap from "gsap";

import content from "~/content/on-track.json";

const h = content.highlights;

const list = ref<HTMLElement | null>(null);
const mouse = ref<HTMLElement | null>(null);
const photo = ref("");
useStatListReveal(list);

let tl: gsap.core.Timeline | null = null;
let hovering = false;
let inView = false;
let pointer = { x: 0, y: 0 };
let io: IntersectionObserver | null = null;

function follow(r: DOMRect) {
  gsap.to(mouse.value, { x: pointer.x - r.left + 20, y: pointer.y - r.top - 20, duration: 0.5, ease: "power2.out" });
}

/** Global check (mousemove + scroll), like the reference: the list can scroll under a still cursor. */
function check() {
  if (!inView || !list.value || !tl) return;
  const r = list.value.getBoundingClientRect();
  const inside = pointer.x >= r.left && pointer.x <= r.right && pointer.y >= r.top && pointer.y <= r.bottom;
  if (inside && !hovering) {
    hovering = true;
    tl.timeScale(1).play();
  } else if (!inside && hovering) {
    hovering = false;
    tl.timeScale(2).reverse();
  }
  if (inside) follow(r);
}

const onPointer = (e: MouseEvent) => {
  pointer = { x: e.clientX, y: e.clientY };
  check();
};
const onScroll = () => check();
// Reference also listens on the list itself (Chromium fires enter/leave when content scrolls under a still pointer).
const onEnter = () => {
  hovering = true;
  tl?.timeScale(1).play();
};
const onLeave = () => {
  hovering = false;
  tl?.timeScale(2).reverse();
};
const onMove = (ev: MouseEvent) => {
  const r = list.value?.getBoundingClientRect();
  if (!r) return;
  pointer = { x: ev.clientX, y: ev.clientY };
  follow(r);
};

onMounted(() => {
  gsap.set(mouse.value, { clipPath: "ellipse(120% 0% at 50% 0%)", x: 0, y: 0 });
  tl = gsap.timeline({ paused: true });
  tl.to(mouse.value, { clipPath: "ellipse(120% 120% at 50% 0%)", autoAlpha: 1, duration: 0.8, ease: "power2.out" });
  io = new IntersectionObserver((e) => (inView = e[0].isIntersecting), { threshold: 0.1 });
  if (list.value) io.observe(list.value);
  document.addEventListener("mousemove", onPointer, { passive: true });
  window.addEventListener("scroll", onScroll, { passive: true });
});

onBeforeUnmount(() => {
  io?.disconnect();
  document.removeEventListener("mousemove", onPointer);
  window.removeEventListener("scroll", onScroll);
  tl?.kill();
});
</script>

<template>
  <section class="ot-highlights">
    <div class="spacer h14" />
    <div class="c">
      <div class="title-layout grid-main">
        <div class="headline-w">
          <HighLines tag="h2" class="title-lg" :html="h.title" />
        </div>
        <div class="para-w">
          <HighLines tag="p" class="body-reg" :html="h.body" />
        </div>
      </div>
    </div>
    <div class="spacer h875" />
    <div class="hl-grid is-top">
      <div v-for="col in h.columns" :key="col" class="eyebrow-w">
        <HighLines class="eyebrow" :html="col" />
      </div>
    </div>
    <div ref="list" class="collection-w" @mouseenter="onEnter" @mouseleave="onLeave" @mousemove="onMove">
      <div class="collection">
        <div class="hl-list">
          <div
            v-for="row in h.rows"
            :key="row.name + row.year"
            class="hl-grid is-row"
            data-stat-item
            @mouseover="photo = row.hover"
          >
            <div class="hl-item"><div class="label-major">{{ row.series }}</div></div>
            <div class="hl-item">
              <div class="label-major">{{ row.name }}</div>
              <div class="flag"><img :src="row.flag" alt="" /></div>
            </div>
            <div class="hl-item">
              <div class="label-major">{{ row.date }}</div>
              <div class="label-major">{{ row.year }}</div>
            </div>
            <div class="hl-item">
              <div class="item-text">
                <div class="label-major is-flex">
                  {{ row.position }}<span class="label-sm">{{ row.suffix }}</span>
                </div>
              </div>
              <div class="trophy-w"><img class="trophy" :src="row.trophy" alt="" /></div>
            </div>
            <div class="hl-item">
              <div class="item-text is-gap"><div class="stat-label">{{ row.time }}</div></div>
            </div>
            <div class="hl-line" />
            <div class="row-reveal" />
          </div>
        </div>
      </div>
      <div ref="mouse" class="mouse-w" aria-hidden="true">
        <!-- Reference lime .f1-highlight-mouse-over-reveal stays at CSS opacity 0; not ported. -->
        <img v-if="photo" class="mouse-img" :src="photo" alt="" />
      </div>
    </div>
    <div class="spacer h14" />
  </section>
</template>

<style scoped>
/* Reference metrics at 1440 px; 1u = 13.33 px. */
.ot-highlights {
  --gap: calc(var(--u) * 1.25);
  --grey: #b9bbad;
  position: relative;
  color: #f4f4ed;
}

.spacer.h14 {
  height: calc(var(--u) * 14);
}

.spacer.h875 {
  height: calc(var(--u) * 8.75);
}

.c {
  padding: 0 var(--gap);
}

.grid-main {
  display: grid;
  grid-template-columns: 23.55% 23.55% 23.55% 23.55%;
  column-gap: var(--gap);
  width: 100%;
}

.headline-w {
  grid-column: 1 / span 2;
  display: flex;
  justify-content: flex-start;
  align-items: flex-start;
}

.title-lg {
  margin: 0;
  font-family: var(--font-mona);
  font-size: calc(var(--u) * 4.5);
  font-weight: 700;
  font-variation-settings: "wght" 750, "wdth" 93;
  line-height: 0.886;
  letter-spacing: calc(var(--u) * -0.125);
  text-transform: uppercase;
}

.title-lg :deep(strong) {
  font-family: var(--font-brier);
  font-size: calc(var(--u) * 4.6875);
  font-weight: 700;
  line-height: 0.886;
  color: var(--grey);
}

.para-w {
  grid-column: 3;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  color: var(--grey);
}

.body-reg {
  margin: 0;
  font-family: var(--font-mona);
  font-size: calc(var(--u) * 1.25);
  font-weight: 400;
  font-variation-settings: "wght" 500, "wdth" 100;
  line-height: 1.25;
  letter-spacing: calc(var(--u) * -0.0125);
}

.title-lg :deep(.line),
.body-reg :deep(.line),
.eyebrow :deep(.line) {
  margin-inline: 0;
}

.eyebrow-w {
  display: flex;
  gap: calc(var(--gap) * 0.5);
  color: var(--grey);
  overflow: clip;
}

.eyebrow {
  letter-spacing: 0; /* global .eyebrow adds 0.08em; reference .text-eyebrow is 0 */
  font-family: var(--font-mona);
  font-size: calc(var(--u) * 0.625);
  font-variation-settings: "wght" 700, "wdth" 100;
  line-height: 1;
  text-transform: uppercase;
}

.hl-grid {
  position: relative;
  display: grid;
  grid-template-columns: 11.775% 35.325% 23.55% 1fr 1fr;
  gap: var(--gap);
  padding: calc(var(--gap) * 0.5) var(--gap);
}

.hl-grid.is-top {
  pointer-events: none;
}

.collection-w {
  position: relative;
  pointer-events: none;
}

.collection {
  position: relative;
  margin-top: calc(var(--gap) * 2);
  pointer-events: auto;
}

.hl-list {
  position: relative;
  display: flex;
  flex-direction: column;
}

.hl-grid.is-row {
  overflow: hidden;
}

.hl-grid.is-row:hover {
  background-color: var(--color-lime);
  color: #111112;
}

.hl-item {
  position: relative;
  display: flex;
  justify-content: flex-start;
  align-items: flex-start;
  gap: calc(var(--gap) * 0.5);
}

.label-major {
  font-family: var(--font-mona);
  font-size: calc(var(--u) * 4.375);
  font-variation-settings: "wght" 700, "wdth" 75;
  line-height: 0.93;
  text-transform: uppercase;
}

.label-major.is-flex {
  display: flex;
}

/* data-text-format="position": "1" → suffix lime (other places grey), 1.5u, raised .4u. */
.label-sm {
  position: relative;
  top: calc(var(--u) * 0.4);
  right: calc(var(--u) * -0.2);
  font-size: calc(var(--u) * 1.5);
  line-height: 1;
  color: var(--color-lime);
}

.hl-grid.is-row:hover .label-sm {
  color: inherit;
}

.flag {
  position: relative;
  top: calc(var(--u) * 0.4);
  display: flex;
  width: calc(var(--u) * 2.12438);
  height: calc(var(--u) * 1.4125);
  border-radius: calc(var(--u) * 0.2);
  overflow: clip;
}

.flag img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.item-text {
  position: relative;
  display: flex;
  gap: calc(var(--gap) * 0.25);
}

.item-text.is-gap {
  justify-content: flex-start;
  align-items: flex-end;
}

.trophy-w {
  position: absolute;
  inset: 0 auto auto calc(var(--u) * -5.6);
  display: flex;
  justify-content: flex-end;
  align-items: center;
  height: 100%;
  aspect-ratio: 1;
}

.trophy {
  display: block;
  width: 100%;
  height: 90%;
  object-fit: contain;
}

.stat-label {
  font-family: var(--font-mona);
  font-size: calc(var(--u) * 2.0625);
  font-variation-settings: "wght" 700, "wdth" 75;
  line-height: 0.97;
  letter-spacing: calc(var(--u) * -0.00625);
  text-transform: uppercase;
}

.hl-line {
  position: absolute;
  inset: 0 0 auto;
  width: calc(100% - var(--gap) * 2);
  height: 1px;
  margin-inline: auto;
  background-color: #282c20;
}

.hl-grid.is-row:hover .hl-line {
  display: none;
}

.row-reveal {
  position: absolute;
  inset: 0;
  z-index: 5;
  background-color: var(--color-lime);
}

.mouse-w {
  position: absolute;
  inset: 0 auto auto 0;
  z-index: 10;
  width: calc(var(--u) * 20.6);
  height: calc(var(--u) * 24.6);
  overflow: hidden;
  pointer-events: none;
}

.mouse-img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}
</style>
