<script setup lang="ts">
/**
 * On Track podiums + F1 career (reference first .s in .s-group.z-10).
 * See .reanimate/on-track/02-podiums/spec.md.
 *   - "49" (Mona 114u) with "podiums" (17.5u) bottom-right. Over [data-podium="wrap"]
 *     "top bottom" → "bottom center" (scrub, power1.in): "podiums" y 17.5u → 0,
 *     the "9" y 0 → −17.5u.
 *   - Cursor photo over the wrap (bundle V_): 20.6 × 24.6u, follows the cursor
 *     (+20, −20 px, 0.5 s power2.out), clip ellipse(120% 0%) → (120% 120%) 0.8 s
 *     power2.out in, reversed at ×2 out; photo = media[floor(x / width × n)].
 *   - Career: title highlighter; image ellipse reveal + lime wipe ("top 80%");
 *     counters 0 → n (1 s power1.out, zero-padded, "top 90%"); P1 scribble
 *     (phrases.riv phrase_p1) hidden until "top 80%"; season rows: useStatListReveal.
 */
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import content from "~/content/on-track.json";

/** Off-white page variant (/nyc-insurance): dark-green text, light row lines. */
defineProps<{ light?: boolean }>();

const p = content.podiums;
const c = p.career;
const digits = p.count.split("");

const wrap = ref<HTMLElement | null>(null);
const nine = ref<HTMLElement | null>(null);
const podText = ref<HTMLElement | null>(null);
const mouse = ref<HTMLElement | null>(null);
const mouseSrc = ref(p.media[0]);
const imgWrap = ref<HTMLElement | null>(null);
const imgReveal = ref<HTMLElement | null>(null);
const statList = ref<HTMLElement | null>(null);
useStatListReveal(statList);

/** Counter targets: element text animates 0 → value with the value's digit count. */
const counters = ref<HTMLElement[]>([]);
const setCounter = (el: unknown) => el && !counters.value.includes(el as HTMLElement) && counters.value.push(el as HTMLElement);

const anims: (gsap.core.Animation | ScrollTrigger)[] = [];
let mouseTl: gsap.core.Timeline | null = null;
let hovering = false;
let inView = false;
let pointer = { x: 0, y: 0 };
let io: IntersectionObserver | null = null;

function updateMouse() {
  if (!inView || !wrap.value || !mouseTl) return;
  const r = wrap.value.getBoundingClientRect();
  const inside = pointer.x >= r.left && pointer.x <= r.right && pointer.y >= r.top && pointer.y <= r.bottom;
  if (inside && !hovering) {
    hovering = true;
    mouseTl.timeScale(1).play();
  } else if (!inside && hovering) {
    hovering = false;
    mouseTl.timeScale(2).reverse();
  }
  if (!inside) return;
  gsap.to(mouse.value, { x: pointer.x - r.left + 20, y: pointer.y - r.top - 20, duration: 0.5, ease: "power2.out" });
  const f = Math.min(Math.max(0, (pointer.x - r.left) / r.width), 1);
  mouseSrc.value = p.media[Math.min(Math.floor(f * p.media.length), p.media.length - 1)];
}

const onPointer = (e: MouseEvent) => {
  pointer = { x: e.clientX, y: e.clientY };
  updateMouse();
};
const onScroll = () => updateMouse();

onMounted(() => {
  gsap.registerPlugin(ScrollTrigger);
  const unit = () => fluidUnit();

  // "49" / "podiums" scroll (bundle L_: text from 17.5rem at ≥992 else 4rem; the 9 to −17.5rem at ≥480 else −6rem)
  gsap.set(podText.value, { y: (window.innerWidth >= 992 ? 17.5 : 4) * unit() });
  const scrub = { trigger: wrap.value, start: "top bottom", end: "bottom center", scrub: true };
  anims.push(gsap.to(podText.value, { y: 0, ease: "power1.in", scrollTrigger: scrub }));
  anims.push(gsap.to(nine.value, { y: (window.innerWidth >= 480 ? -17.5 : -6) * unit(), ease: "power1.in", scrollTrigger: { ...scrub } }));

  // Cursor photo
  mouseTl = gsap.timeline({ paused: true });
  gsap.set(mouse.value, { clipPath: "ellipse(120% 0% at 50% 0%)", x: 0, y: 0 });
  mouseTl.to(mouse.value, { clipPath: "ellipse(120% 120% at 50% 0%)", autoAlpha: 1, duration: 0.8, ease: "power2.out" });
  anims.push(mouseTl);
  io = new IntersectionObserver((e) => (inView = e[0].isIntersecting), { threshold: 0.1 });
  if (wrap.value) io.observe(wrap.value);
  document.addEventListener("mousemove", onPointer, { passive: true });
  window.addEventListener("scroll", onScroll, { passive: true });

  // Image highlight ("top, lime")
  gsap.set(imgWrap.value, { clipPath: "ellipse(120% 0% at 50% 0%)" });
  gsap.set(imgReveal.value, { clipPath: "ellipse(120% 120% at 50% 100%)" });
  const img = gsap.timeline({ scrollTrigger: { trigger: imgWrap.value, start: "top 80%", once: true } });
  img.to(imgWrap.value, { clipPath: "ellipse(120% 120% at 50% 0%)", duration: 0.8, ease: "power2.out" });
  img.to(imgReveal.value, { clipPath: "ellipse(120% 0% at 50% 100%)", duration: 0.6, ease: "power2.out" }, "-=0.4");
  anims.push(img);

  // Counters
  counters.value.forEach((el) => {
    const target = el.dataset.value ?? "0";
    const n = parseInt(target, 10);
    const width = target.length;
    el.textContent = "0".repeat(width);
    anims.push(
      ScrollTrigger.create({
        trigger: el,
        start: "top 90%",
        once: true,
        onEnter: () => {
          const s = { v: 0 };
          anims.push(
            gsap.to(s, {
              v: n,
              duration: 1,
              ease: "power1.out",
              onUpdate: () => (el.textContent = String(Math.round(s.v)).padStart(width, "0"))
            })
          );
        }
      })
    );
  });

});

onBeforeUnmount(() => {
  io?.disconnect();
  document.removeEventListener("mousemove", onPointer);
  window.removeEventListener("scroll", onScroll);
  anims.forEach((a) => a.kill());
});
</script>

<template>
  <section class="ot-podiums" :class="{ 'is-light': light }">
    <div class="spacer h12" />
    <div ref="wrap" class="podium-layout">
      <div class="podium-num" :aria-label="p.count">
        <span v-for="(d, i) in digits" :key="i" :ref="(el) => i === 1 && (nine = el as HTMLElement)" class="char" aria-hidden="true">{{ d }}</span>
      </div>
      <div ref="podText" class="podium-col">
        <div class="large-number is-podium">{{ p.label }}</div>
      </div>
      <div ref="mouse" class="mouse-w" aria-hidden="true">
        <!-- Reference also has a lime .f1-highlight-mouse-over-reveal here; its CSS keeps it at opacity 0. -->
        <img class="mouse-img" :src="mouseSrc" alt="" />
      </div>
    </div>
    <div class="spacer h8" />

    <div class="title-layout grid-main">
      <div class="headline-w">
        <HighLines tag="h2" class="title-lg" :html="c.title" />
        <div class="car-img-w">
          <div ref="imgWrap" class="img-hl">
            <img class="car-img" :src="c.image.src" :alt="c.image.alt" />
            <div ref="imgReveal" class="img-hl-reveal" />
          </div>
        </div>
      </div>

      <div class="stats-grid">
        <div class="stats-item">
          <div class="eyebrow-w is-item"><HighLines tag="h3" class="descriptor" :html="c.wins.label" /></div>
          <div class="num-w">
            <div class="win-rive">
              <RiveCanvas file="phrases" artboard="phrase_p1" state-machine="phrase_p1" play-at="top 80%" />
            </div>
            <div :ref="setCounter" class="large-number" :data-value="c.wins.value">{{ c.wins.value }}</div>
          </div>
        </div>
        <div class="stats-item">
          <div class="eyebrow-w is-item"><HighLines tag="h3" class="descriptor" :html="c.poles.label" /></div>
          <div class="num-w is-top">
            <div :ref="setCounter" class="large-number" :data-value="c.poles.value">{{ c.poles.value }}</div>
          </div>
        </div>
        <div class="stats-item">
          <div class="eyebrow-w is-item"><HighLines tag="h3" class="descriptor" :html="c.average.label" /></div>
          <div class="num-w is-top">
            <div :ref="setCounter" class="large-number is-fixed" :data-value="c.average.value">{{ c.average.value }}</div>
            <div class="stat-label-w">
              <div class="label-large">.</div>
              <div :ref="setCounter" class="label-large" :data-value="c.average.decimals">{{ c.average.decimals }}</div>
            </div>
          </div>
        </div>
        <div class="stats-item">
          <div class="eyebrow-w is-item"><HighLines tag="h3" class="descriptor" :html="c.fastest.label" /></div>
          <div class="num-w">
            <div :ref="setCounter" class="large-number" :data-value="c.fastest.value">{{ c.fastest.value }}</div>
          </div>
        </div>

        <div class="seasons">
          <div class="eyebrow-w"><HighLines tag="h3" class="descriptor" :html="c.seasons.label" /></div>
          <div class="season-row is-top">
            <div v-for="col in c.seasons.columns" :key="col" class="season-cell">
              <div class="eyebrow-w is-grey"><HighLines class="eyebrow" :html="col" /></div>
            </div>
          </div>
          <div ref="statList" class="season-list">
            <div v-for="row in c.seasons.rows" :key="row.year" class="season-row" data-stat-item>
              <div class="season-cell"><h3 class="stat-label">{{ row.year }}</h3></div>
              <div class="season-cell">
                <div class="stat-label">{{ row.finish }}</div>
                <h3 class="descriptor is-offset">{{ row.suffix }}</h3>
              </div>
              <div class="season-cell"><div class="stat-label">{{ row.podiums }}</div></div>
              <div class="row-reveal" />
            </div>
          </div>
          <BtnPrimary :label="c.cta.label" :href="c.cta.href" />
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
/* Reference metrics at 1440 px; 1u = 13.33 px. */
.ot-podiums {
  --gap: calc(var(--u) * 1.25);
  --grey: #b9bbad;
  position: relative;
  padding: 0 var(--gap);
  color: #f4f4ed;
}

.spacer.h12 {
  height: calc(var(--u) * 12);
}

.spacer.h8 {
  height: calc(var(--u) * 8);
}

.podium-layout {
  position: relative;
  display: grid;
  grid-template-columns: 1fr 1fr;
  align-items: end;
  pointer-events: auto;
}

.podium-num {
  display: flex;
  font-family: var(--font-mona);
  font-size: calc(var(--u) * 114);
  font-variation-settings: "wght" 700, "wdth" 75;
  line-height: 0.85;
  text-transform: uppercase;
  pointer-events: none;
}

.podium-num .char {
  display: inline-block;
}

.podium-col {
  position: absolute;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  padding-bottom: calc(var(--u) * 4.5);
}

.large-number {
  font-family: var(--font-mona);
  font-size: calc(var(--u) * 17.5);
  font-variation-settings: "wght" 700, "wdth" 75;
  line-height: 0.8;
  letter-spacing: calc(var(--u) * -0.1);
  text-transform: uppercase;
}

.large-number.is-podium {
  font-variation-settings: "wght" 693, "wdth" 75;
  letter-spacing: calc(var(--u) * -0.225);
}

.large-number.is-fixed {
  width: calc(var(--u) * 8.1);
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

.grid-main {
  display: grid;
  grid-template-columns: 23.55% 23.55% 23.55% 23.55%;
  column-gap: var(--gap);
  width: 100%;
}

.headline-w {
  grid-column: 1 / span 2;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: calc(var(--gap) * 4);
}

.title-lg {
  max-width: calc(var(--u) * 25);
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

.title-lg :deep(.line),
.descriptor :deep(.line),
.eyebrow :deep(.line) {
  margin-inline: 0;
}

.car-img-w {
  height: calc(var(--u) * 28.5625);
  aspect-ratio: 407 / 457;
  overflow: clip;
}

.img-hl {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

/* .image.is-clip-fix, but the highlight wrapper (bundle fJ) forces 100 % × 100 % inline; the −1 % margins stay. */
.car-img {
  display: block;
  width: 100%;
  max-width: 102%;
  height: 100%;
  margin: -1% 0 0 -1%;
  object-fit: cover;
}

.img-hl-reveal {
  position: absolute;
  inset: 0;
  z-index: 5;
  background-color: var(--color-lime);
}

.stats-grid {
  grid-column: 3 / span 2;
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: auto auto;
  gap: calc(var(--gap) * 6) var(--gap);
}

.stats-item {
  justify-self: start;
  display: flex;
  flex-direction: column;
  gap: var(--gap);
}

.eyebrow-w {
  display: flex;
  gap: calc(var(--gap) * 0.5);
  overflow: clip;
}

.eyebrow-w.is-item {
  position: relative;
  z-index: 5;
  max-width: calc(var(--u) * 6.8125);
}

.eyebrow-w.is-grey {
  color: var(--grey);
}

.descriptor {
  margin: 0;
  font-family: var(--font-mona);
  font-size: var(--u);
  font-weight: 400;
  font-variation-settings: "wght" 800, "wdth" 87.5;
  line-height: 0.97;
  text-transform: uppercase;
}

.descriptor.is-offset {
  position: relative;
  top: calc(var(--u) * 0.1);
  left: calc(var(--u) * 0.1);
  color: var(--grey);
}

.eyebrow {
  letter-spacing: 0; /* global .eyebrow adds 0.08em; reference .text-eyebrow is 0 */
  font-family: var(--font-mona);
  font-size: calc(var(--u) * 0.625);
  font-variation-settings: "wght" 700, "wdth" 100;
  line-height: 1;
  text-transform: uppercase;
}

.num-w {
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
}

.num-w.is-top {
  justify-content: flex-start;
  align-items: flex-start;
  gap: calc(var(--gap) * 0.25);
}

.win-rive {
  position: absolute;
  display: flex;
  width: calc(var(--u) * 13.5625);
  aspect-ratio: 1;
  pointer-events: none;
}

.stat-label-w {
  position: relative;
  top: calc(var(--u) * 0.8);
  display: flex;
}

.label-large {
  font-family: var(--font-mona);
  font-size: calc(var(--u) * 2.75);
  font-variation-settings: "wght" 700, "wdth" 75;
  line-height: 0.97;
  text-transform: uppercase;
  color: var(--grey);
}

.seasons {
  grid-column: 1 / span 2;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: flex-start;
}

.season-list {
  width: 100%;
  margin-bottom: calc(var(--gap) * 2);
}

.season-row {
  position: relative;
  display: grid;
  grid-template-columns: 1fr 1fr 1fr 1fr;
  gap: var(--gap);
  width: 100%;
  padding: calc(var(--gap) * 0.5) 0;
  border-bottom: 1px solid #282c20;
  overflow: hidden;
}

.season-row.is-top {
  padding: calc(var(--gap) * 1.5) 0;
  overflow: visible;
}

.season-cell {
  display: flex;
}

/* Reference grid placement: the year column spans two of the four tracks. */
.season-cell:first-child {
  grid-column: span 2;
}

.stat-label {
  margin: 0;
  font-family: var(--font-mona);
  font-size: calc(var(--u) * 2.0625);
  font-weight: 700;
  font-variation-settings: "wght" 700, "wdth" 75;
  line-height: 0.97;
  letter-spacing: calc(var(--u) * -0.00625);
  text-transform: uppercase;
}

.ot-podiums.is-light {
  --grey: #535450;
  color: #282c20;
}

.is-light .season-row {
  border-bottom-color: #dde1d2;
}

.row-reveal {
  position: absolute;
  inset: 0;
  z-index: 5;
  background-color: var(--color-lime);
  transform-origin: right center;
}

.season-row.is-top .row-reveal {
  display: none;
}
/* Reference ≤479 (live at 375 px; 1u = the phone rem). */
@media (max-width: 767px) {
  .mouse-w {
    display: none;
  }

  .podium-num {
    font-size: calc(var(--u) * 38.8);
  }

  .podium-col {
    padding-bottom: calc(var(--u) * 1.8);
  }

  .large-number {
    font-size: calc(var(--u) * 10);
  }

  .large-number.is-podium {
    font-size: calc(var(--u) * 5.6);
  }

  .large-number.is-fixed {
    width: calc(var(--u) * 5);
  }

  .title-layout.grid-main {
    grid-template-columns: 1fr;
    gap: calc(var(--gap) * 2);
    margin-bottom: calc(var(--gap) * 2);
  }

  .headline-w,
  .stats-grid {
    grid-column: 1 / -1;
  }

  .headline-w {
    gap: var(--gap);
  }

  .title-lg {
    order: 1;
    font-size: calc(var(--u) * 2.6);
  }

  .title-lg :deep(strong) {
    font-size: calc(var(--u) * 2.6);
  }

  /* Reference phone title runs on one line ("f1 career" + zero-width joiner + "since 2019"). */
  .title-lg :deep(br) {
    display: none;
  }

  .car-img-w {
    width: 100%;
    height: calc(var(--u) * 24);
    aspect-ratio: auto;
  }

  .stats-item {
    justify-content: flex-start;
    align-items: flex-start;
  }

  .win-rive {
    left: 0;
    width: calc(var(--u) * 10);
  }

  .stat-label {
    font-size: calc(var(--u) * 1.6);
  }

  .eyebrow {
    font-size: calc(var(--u) * 0.8);
  }
}
</style>
