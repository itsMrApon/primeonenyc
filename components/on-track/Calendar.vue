<script setup lang="ts">
/**
 * On Track calendar (reference .s.is-on-t-calendar). See .reanimate/on-track/07-on-t-calendar/spec.md.
 *   - Track card: lime frame + mask (track-mask.svg, cover), info panel, vertical circuit name
 *     + flag, F1 logo, next / previous buttons, and the GL circuit (webgl/scenes/TracksScene)
 *     drawn into [data-gl="tracks"] with its DOM corner markers.
 *   - Bundle j$: the current race = first item dated today or later; every .cal-target-wrapper
 *     reveals at "top 90%" of the card (clip 0.5 s power2.out, lime bar 0.5 s power2.inOut at
 *     −0.2 s, 15 ms stagger). Next / previous / row click: wrappers close (0.5 s power2.in),
 *     values swap, reopen; the GL circuit plays its own out/in transition.
 *   - "upcoming 2026 schedule" title, standings, CTA; upcoming list (stat-list reveal), rows
 *     scroll back to the card (lenis 1.2 s quad in-out, −8u); cursor card with the hovered
 *     row's circuit (bundle T$ + circuit hover).
 */
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import content from "~/content/on-track.json";
import { fluidUnit } from "~/utils/fluid";
import type { Experience } from "~/webgl/Experience";

const props = withDefaults(
  defineProps<{
    /** Off-white page variant (/nyc-insurance): dark-green text and frame, light GL. */
    light?: boolean;
    /** Card shown first (item `circuit` id), e.g. "bangla" on the tax page. */
    start?: string;
  }>(),
  { light: false, start: undefined }
);

const cal = content.calendar;
const e = cal.eyebrows;
/** Light variant: the frame SVGs recoloured (dark-green stroke, off-white fill). */
const svg = (src: string) => (props.light ? src.replace(/\.svg$/, "-light.svg") : src);

/** "d/m/yyyy H:MM" → local midnight of that day (bundle j$ compares dates only). */
function dayOf(s: string) {
  const [d, m, y] = s.split(/[/ :]/).map((v) => parseInt(v, 10));
  return new Date(y, m - 1, d);
}

const items = [...cal.items].sort((a, b) => +dayOf(a.dateActual) - +dayOf(b.dateActual));
const today = new Date();
today.setHours(0, 0, 0, 0);
let first = items.findIndex((it) => dayOf(it.dateActual) >= today);
if (first === -1) first = items.length - 1;
const startIndex = items.findIndex((it) => it.circuit === props.start);
if (startIndex !== -1) first = startIndex;

const current = ref(first);
const item = computed(() => items[current.value]);
/** Cursor card: outline of the last hovered office (first office before any hover). */
const hoverTrack = ref(items[0].circuit);
const hoverOutline = computed(() => items.find((it) => it.circuit === hoverTrack.value)?.outline ?? items[0].outline);

const trackWrap = ref<HTMLElement | null>(null);
const glTarget = ref<HTMLElement | null>(null);
const list = ref<HTMLElement | null>(null);
const mouse = ref<HTMLElement | null>(null);
const nextHover = ref(false);
const prevHover = ref(false);
useStatListReveal(list);

const getExperience = () => (window as unknown as { experience?: Experience }).experience ?? null;
let attached: Experience | null = null;
let raf = 0;

function attach() {
  const exp = getExperience();
  if (!exp || !glTarget.value) {
    raf = requestAnimationFrame(attach);
    return;
  }
  attached = exp;
  exp.tracks.define(items.map((it) => ({ name: it.circuit, svg: it.outline })));
  exp.tracks.setLight(props.light);
  exp.tracks.attach(glTarget.value);
  exp.tracks.setTrack(item.value.circuit, "forward", true);
}

let wrappers: HTMLElement[] = [];
let reveals: HTMLElement[] = [];
let revealTl: gsap.core.Timeline | null = null;
let switchTl: gsap.core.Timeline | null = null;

function select(index: number, direction: "forward" | "backward") {
  switchTl?.kill();
  attached?.tracks.setTrack(items[index].circuit, direction);
  const tl = gsap.timeline();
  tl.to(wrappers, { clipPath: "inset(0 100% 0 0)", duration: 0.5, stagger: 0.015, ease: "power2.in" });
  tl.call(() => {
    current.value = index;
  });
  tl.set(reveals, { scaleX: 1 });
  tl.to(wrappers, { clipPath: "inset(0 0% 0 0)", duration: 0.5, stagger: 0.015, ease: "power2.out" });
  tl.to(reveals, { scaleX: 0, duration: 0.5, stagger: 0.015, ease: "power2.inOut" }, "-=0.2");
  switchTl = tl;
}

const next = () => select(current.value < items.length - 1 ? current.value + 1 : 0, "forward");
const previous = () => select(current.value > 0 ? current.value - 1 : items.length - 1, "backward");

function pick(index: number) {
  select(index, "forward");
  const r = trackWrap.value?.getBoundingClientRect();
  if (!r) return;
  // Reference: 8rem, where its rem is the fluid unit (13.33 px at 1440).
  const y = window.scrollY + r.top - 8 * fluidUnit();
  const lenis = (window as unknown as { lenis?: { scrollTo: (y: number, o: object) => void } }).lenis;
  if (lenis) lenis.scrollTo(y, { duration: 1.2, easing: (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2) });
  else window.scrollTo({ top: y, behavior: "smooth" });
}

// Cursor card (bundle T$): open while the pointer is over the list, follow it (+20, −20).
let cardTl: gsap.core.Timeline | null = null;
let hovering = false;
let inView = false;
let pointer = { x: 0, y: 0 };
let io: IntersectionObserver | null = null;

function check() {
  if (!inView || !list.value || !cardTl) return;
  const r = list.value.getBoundingClientRect();
  const inside = pointer.x >= r.left && pointer.x <= r.right && pointer.y >= r.top && pointer.y <= r.bottom;
  if (inside && !hovering) {
    hovering = true;
    cardTl.timeScale(1).play();
  } else if (!inside && hovering) {
    hovering = false;
    cardTl.timeScale(2).reverse();
  }
  if (inside) gsap.to(mouse.value, { x: pointer.x - r.left + 20, y: pointer.y - r.top - 20, duration: 0.5, ease: "power2.out" });
}
const onPointer = (ev: MouseEvent) => {
  pointer = { x: ev.clientX, y: ev.clientY };
  check();
};
const onScroll = () => check();
// Reference also listens on the list itself (Chromium fires enter/leave when content scrolls under a still pointer).
const onEnter = () => {
  hovering = true;
  cardTl?.timeScale(1).play();
};
const onLeave = () => {
  hovering = false;
  cardTl?.timeScale(2).reverse();
};
const onMove = (ev: MouseEvent) => {
  const r = list.value?.getBoundingClientRect();
  if (!r) return;
  pointer = { x: ev.clientX, y: ev.clientY };
  gsap.to(mouse.value, { x: ev.clientX - r.left + 20, y: ev.clientY - r.top - 20, duration: 0.5, ease: "power2.out" });
};

onMounted(() => {
  gsap.registerPlugin(ScrollTrigger);
  wrappers = [...(trackWrap.value?.querySelectorAll<HTMLElement>(".cal-target-wrapper") ?? [])];
  reveals = [...(trackWrap.value?.querySelectorAll<HTMLElement>(".cal-target-reveal") ?? [])];
  gsap.set(reveals, { scaleX: 1 });
  gsap.set(wrappers, { clipPath: "inset(0 100% 0 0)" });
  revealTl = gsap.timeline({ scrollTrigger: { trigger: trackWrap.value, start: "top 90%", once: true } });
  revealTl.to(wrappers, { clipPath: "inset(0 0% 0 0)", duration: 0.5, stagger: 0.015, ease: "power2.out" });
  revealTl.to(reveals, { scaleX: 0, duration: 0.5, stagger: 0.015, ease: "power2.inOut" }, "-=0.2");

  attach();

  gsap.set(mouse.value, { clipPath: "ellipse(120% 0% at 50% 0%)", x: 0, y: 0 });
  cardTl = gsap.timeline({ paused: true });
  cardTl.to(mouse.value, { clipPath: "ellipse(120% 120% at 50% 0%)", autoAlpha: 1, duration: 0.8, ease: "power2.out" });
  io = new IntersectionObserver((en) => (inView = en[0].isIntersecting), { threshold: 0.1 });
  if (list.value) io.observe(list.value);
  document.addEventListener("mousemove", onPointer, { passive: true });
  window.addEventListener("scroll", onScroll, { passive: true });
});

onBeforeUnmount(() => {
  cancelAnimationFrame(raf);
  attached?.tracks.detach();
  revealTl?.scrollTrigger?.kill();
  revealTl?.kill();
  switchTl?.kill();
  cardTl?.kill();
  io?.disconnect();
  document.removeEventListener("mousemove", onPointer);
  window.removeEventListener("scroll", onScroll);
});
</script>

<template>
  <section class="ot-calendar" :class="{ 'is-light': light }">
    <div class="c is-calendar-gl">
      <div class="spacer h4" />
      <div ref="trackWrap" class="track-w">
        <div class="track-mask" :style="{ '--mask': `url(${cal.frame.mask})` }">
          <div class="info-pos">
            <div class="info-layout">
              <div class="info-left-w">
                <div class="info-item">
                  <div class="eyebrow-w grey"><HighLines class="eyebrow" :html="e.when" /></div>
                  <div>
                    <OnTrackCalTarget><div class="stat-major lime">{{ item.dateNum }}</div></OnTrackCalTarget>
                    <OnTrackCalTarget><div class="stat-major off-white">{{ item.dateMonth }}</div></OnTrackCalTarget>
                  </div>
                </div>
                <div class="spacer cal-item" />
                <div class="info-left-group">
                  <div class="info-item">
                    <div class="eyebrow-w grey"><HighLines class="eyebrow" :html="e.length" /></div>
                    <div class="info-col">
                      <OnTrackCalTarget>
                        <div class="info-left-row">
                          <OnTrackCalTarget><div class="stat-large lime">{{ item.length }}</div></OnTrackCalTarget>
                          <OnTrackCalTarget><div class="stat-sm off-white unit">{{ item.lengthUnit }}</div></OnTrackCalTarget>
                        </div>
                      </OnTrackCalTarget>
                    </div>
                  </div>
                  <div class="info-item">
                    <div class="eyebrow-w grey"><HighLines class="eyebrow" :html="e.firstCompeted" /></div>
                    <div class="info-col">
                      <div class="info-left-row">
                        <OnTrackCalTarget><div class="stat-large lime">{{ item.firstCompeted }}</div></OnTrackCalTarget>
                      </div>
                    </div>
                  </div>
                </div>
                <div class="info-left-group">
                  <div class="info-item">
                    <div class="eyebrow-w grey"><HighLines class="eyebrow" :html="e.distance" /></div>
                    <div class="info-col">
                      <OnTrackCalTarget>
                        <div class="info-left-row">
                          <OnTrackCalTarget><div class="stat-large lime">{{ item.distance }}</div></OnTrackCalTarget>
                          <OnTrackCalTarget><div class="stat-sm off-white unit">{{ item.distanceUnit }}</div></OnTrackCalTarget>
                        </div>
                      </OnTrackCalTarget>
                    </div>
                  </div>
                  <div class="info-item">
                    <div class="eyebrow-w grey"><HighLines class="eyebrow" :html="e.laps" /></div>
                    <div class="info-col">
                      <div class="info-left-row">
                        <OnTrackCalTarget><div class="stat-large lime">{{ item.laps }}</div></OnTrackCalTarget>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div class="info-right-w">
                <div class="info-right-item">
                  <div class="eyebrow-w grey gap-quarter">
                    <HighLines class="eyebrow" :html="e.landoAt" />
                    <div class="eyebrow flex">
                      <OnTrackCalTarget><span>{{ item.name }}</span></OnTrackCalTarget>
                    </div>
                  </div>
                  <div class="info-col">
                    <div class="info-left-row is-mh">
                      <!-- eslint-disable-next-line vue/no-v-html -- trusted copy from content/on-track.json -->
                      <OnTrackCalTarget><div class="rich-text" v-html="`<p>${item.about}</p>`" /></OnTrackCalTarget>
                    </div>
                  </div>
                </div>
                <div class="info-right-item">
                  <div class="sched-row is-top">
                    <div class="eyebrow-w grey"><OnTrackCalTarget><div class="eyebrow">{{ e.schedule }}</div></OnTrackCalTarget></div>
                    <div class="eyebrow-w grey"><OnTrackCalTarget><div class="eyebrow" hidden>Result</div></OnTrackCalTarget></div>
                    <div class="eyebrow-w grey"><OnTrackCalTarget><div class="eyebrow" hidden>Time/Gap</div></OnTrackCalTarget></div>
                  </div>
                  <div class="info-col">
                    <OnTrackCalTarget v-for="(s, si) in item.schedule" :key="si">
                      <div class="sched-row" :class="{ race: si === item.schedule.length - 1 }">
                        <div class="stat-sm">{{ s.label }}</div>
                        <div><OnTrackCalTarget><div class="stat-sm">{{ s.date }}</div></OnTrackCalTarget></div>
                        <div><OnTrackCalTarget><div class="stat-sm">{{ s.time }}</div></OnTrackCalTarget></div>
                      </div>
                    </OnTrackCalTarget>
                    <div class="sched-row last">
                      <div />
                      <div />
                      <OnTrackCalTarget><div class="eyebrow">{{ e.ukTime }}</div></OnTrackCalTarget>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="frame">
            <svg width="100%" height="100%" viewBox="0 0 1688 918" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M74 12v467.986a22.999 22.999 0 0 1-12.602 20.515l-48.892 24.781A21.002 21.002 0 0 0 1 544.014V905.5c0 6.075 4.925 11 11 11h1588.5c6.08 0 11-4.925 11-11V790.173c0-8.201 4.37-15.782 11.46-19.896l53.08-30.784a21.012 21.012 0 0 0 10.46-18.166V12c0-6.075-4.92-11-11-11H85c-6.075 0-11 4.925-11 11Z"
                stroke="currentColor"
                stroke-width="2"
              />
            </svg>
          </div>
          <!-- PrimeOne PO monogram (same paths as the nav, /images/misc/ln-logo.svg) in place of the F1 logo. -->
          <div class="f1-logo">
            <svg class="po-logo" viewBox="41 106 430 300" role="img" aria-label="PrimeOne">
              <g transform="translate(256 256) skewX(-14) translate(-178 -150)" fill="currentColor" fill-rule="evenodd">
                <path d="M0 0H90C128 0 150 24 150 62V108C150 146 128 170 90 170H52V300H0Z M52 48V122H84C94 122 98 116 98 106V64C98 54 94 48 84 48Z" />
                <path d="M222 0H310C338 0 356 18 356 46V254C356 282 338 300 310 300H222C194 300 176 282 176 254V46C176 18 194 0 222 0Z M242 48C233 48 228 53 228 62V238C228 247 233 252 242 252H290C299 252 304 247 304 238V62C304 53 299 48 290 48Z" />
              </g>
            </svg>
          </div>
          <!-- Reference .calendar-mobile-frame top / middle / bottom (phones only). -->
          <img class="mobile-frame is-top" :src="svg('/images/on-track/calendar/frame-mobile-top.svg')" alt="" />
          <img class="mobile-frame is-middle" :src="svg('/images/on-track/calendar/frame-mobile-middle.svg')" alt="" />
          <img class="mobile-frame is-bottom" :src="svg('/images/on-track/calendar/frame-mobile-bottom.svg')" alt="" />
          <div ref="glTarget" data-gl="tracks" class="gl-target" />
        </div>
        <div class="title-w">
          <div class="title-layout">
            <OnTrackCalTarget><div class="title-vertical">{{ item.name }}</div></OnTrackCalTarget>
            <div class="flag-ui">
              <OnTrackCalTarget><span class="lang-badge" :lang="item.circuit === 'bangla' ? 'bn' : undefined">{{ item.code }}</span></OnTrackCalTarget>
            </div>
          </div>
          <img class="frame-segment" :src="svg(cal.frame.segment)" alt="" />
        </div>
        <div class="controls">
          <a href="#" title="next item" class="icon-btn" @click.prevent="next" @mouseenter="nextHover = true" @mouseleave="nextHover = false">
            <span class="icon-rive">
              <RiveCanvas file="btn-ui" artboard="arrow" state-machine="arrow" :inputs="{ hover: nextHover }" />
            </span>
          </a>
          <a href="#" title="previous item" class="icon-btn" @click.prevent="previous" @mouseenter="prevHover = true" @mouseleave="prevHover = false">
            <span class="icon-rive is-rotated">
              <RiveCanvas file="btn-ui" artboard="arrow" state-machine="arrow" :inputs="{ hover: prevHover }" />
            </span>
          </a>
        </div>
      </div>
      <div class="grid-main">
        <div class="headline-w">
          <HighLines tag="h2" class="title-lg" :html="cal.title" />
        </div>
        <div class="para-layout">
          <div class="para-w">
            <HighLines tag="p" class="body-reg" color="dark-green-tint-1" :html="cal.body" />
            <div class="standings-w">
              <div class="info-item">
                <div class="eyebrow-w"><HighLines class="descriptor" :html="cal.standing.label" /></div>
                <div class="info-col">
                  <div class="info-left-row">
                    <div class="text-layout">
                      <div class="stat-major">{{ cal.standing.value }}</div>
                      <div class="stat-sm grey">{{ cal.standing.suffix }}</div>
                    </div>
                  </div>
                </div>
              </div>
              <div class="info-item">
                <div class="eyebrow-w"><HighLines class="descriptor" :html="cal.round.label" /></div>
                <div class="info-col">
                  <div class="text-layout"><div class="stat-major">{{ cal.round.value }}</div></div>
                </div>
              </div>
            </div>
          </div>
          <div class="btn-outer-w">
            <BtnPrimary :label="cal.cta.label" :href="cal.cta.href" />
          </div>
        </div>
      </div>
      <div class="spacer h6" />
    </div>
    <!-- /calendar: the season's results list (reference #calendar-list) above the upcoming list. -->
    <slot name="before-list" />
    <div class="list-outer">
      <div class="hl-grid is-top">
        <div v-for="col in cal.columns" :key="col" class="eyebrow-w grey">
          <HighLines class="eyebrow" :html="col" />
        </div>
      </div>
      <div ref="list" class="collection-w" @mouseenter="onEnter" @mouseleave="onLeave" @mousemove="onMove">
        <div class="collection">
          <div class="hl-list">
            <div
              v-for="(it, i) in items"
              :key="it.circuit"
              class="hl-grid is-row"
              :class="{ 'is-active': i === current }"
              title="View this language"
              data-stat-item
              @mouseenter="hoverTrack = it.circuit"
              @click="pick(i)"
            >
              <div class="hl-item"><div class="stat-major">{{ it.round }}</div></div>
              <div class="hl-item">
                <div class="stat-major no-wrap">{{ it.country }}</div>
                <div class="flag-row"><span class="lang-badge" :lang="it.circuit === 'bangla' ? 'bn' : undefined">{{ it.code }}</span></div>
              </div>
              <div class="hl-item">
                <div class="stat-major">{{ it.dateNum }}</div>
                <div class="stat-major mob-small">{{ it.dateMonth }}</div>
              </div>
              <div class="hl-item"><div class="text-layout"><div class="stat-major">{{ it.laps }}</div></div></div>
              <div class="hl-item">
                <div class="text-layout is-gap">
                  <div class="stat-reg">{{ it.distance }}</div>
                  <div class="descriptor grey">{{ it.distanceUnit }}</div>
                </div>
              </div>
              <div class="hl-line" />
              <div class="row-reveal" />
            </div>
          </div>
        </div>
        <div class="grad">
          <div class="grad-btn"><BtnPrimary :label="cal.listCta.label" :href="cal.listCta.href" /></div>
        </div>
        <div ref="mouse" class="mouse-w" aria-hidden="true">
          <div class="eyebrow-w grey"><div class="eyebrow">{{ cal.cursor.eyebrow }}</div></div>
          <div class="circuit-rive-w">
            <div class="circuit-rive">
              <img class="outlet-img" :src="hoverOutline" alt="" />
            </div>
            <img class="circuit-rive-bg" :src="cal.cursor.bg" alt="" />
          </div>
        </div>
      </div>
    </div>
    <div class="spacer h10" />
  </section>
</template>

<style scoped>
/* Reference metrics at 1440 px; 1u = 13.33 px. */
.ot-calendar {
  --gap: calc(var(--u) * 1.25);
  --grey: #b9bbad;
  --off-white: #dde1d2;
  position: relative;
  z-index: 15;
  color: #f4f4ed;
}

/* Light variant (/nyc-insurance, off-white page): dark-green text and lines; lime stays on fills. */
.ot-calendar.is-light {
  --grey: #535450;
  --off-white: #535450;
  color: #282c20;
}

.is-light .lime,
.is-light .sched-row.race,
.is-light .frame {
  color: #282c20;
}

.is-light .sched-row {
  border-bottom-color: #282c201f;
}

.is-light .hl-grid.is-row.is-active,
.is-light .hl-line {
  background-color: #dde1d2;
}

.is-light .hl-grid.is-row:hover {
  background-color: #282c20;
  color: var(--color-lime);
}

/* The cursor card keeps its dark tile. */
.is-light .mouse-w {
  --grey: #b9bbad;
}

.c {
  padding: 0 var(--gap);
}

.spacer.h4 {
  height: calc(var(--u) * 4);
}

.spacer.h6 {
  height: calc(var(--u) * 6);
}

.spacer.h10 {
  height: calc(var(--u) * 10);
}

/* ---- type ---- */
.eyebrow {
  font-family: var(--font-mona);
  font-size: calc(var(--u) * 0.625);
  font-variation-settings: "wght" 700, "wdth" 100;
  line-height: 1;
  letter-spacing: 0;
  text-transform: uppercase;
}

.eyebrow.flex {
  display: flex;
  flex: none;
  gap: calc(var(--gap) * 0.1);
}

.eyebrow :deep(.line),
.descriptor :deep(.line),
.title-lg :deep(.line),
.body-reg :deep(.line) {
  margin-inline: 0;
}

.eyebrow-w {
  display: flex;
  gap: calc(var(--gap) * 0.5);
  overflow: clip;
}

.eyebrow-w.gap-quarter {
  gap: calc(var(--gap) * 0.25);
}

.grey {
  color: var(--grey);
}

.lime {
  color: var(--color-lime);
}

.off-white {
  color: var(--off-white);
}

.stat-major,
.stat-large,
.stat-sm,
.stat-reg {
  font-family: var(--font-mona);
  font-variation-settings: "wght" 700, "wdth" 75;
  text-transform: uppercase;
}

.stat-major {
  font-size: calc(var(--u) * 4.375);
  line-height: 0.93;
}

.stat-large {
  font-size: calc(var(--u) * 2.75);
  line-height: 0.97;
}

.stat-sm {
  font-size: calc(var(--u) * 1.5);
  line-height: 1;
}

.stat-sm.unit {
  position: relative;
  bottom: calc(var(--u) * 0.2);
}

.stat-reg {
  font-size: calc(var(--u) * 2.0625);
  line-height: 0.97;
  letter-spacing: calc(var(--u) * -0.00625);
}

.descriptor {
  font-family: var(--font-mona);
  font-size: var(--u);
  font-variation-settings: "wght" 800, "wdth" 87.5;
  line-height: 0.97;
  letter-spacing: 0;
  text-transform: uppercase;
}

.no-wrap {
  white-space: nowrap;
}

/* ---- track card ---- */
.track-w {
  position: relative;
  z-index: 5;
  margin-bottom: calc(var(--gap) * 2);
}

.track-mask {
  position: relative;
  width: 100%;
  aspect-ratio: 1867.5 / 917.5;
  mask-image: var(--mask);
  mask-size: cover;
  mask-repeat: no-repeat;
  mask-position: center;
}

.info-pos {
  position: absolute;
  inset: 0 0 auto auto;
  z-index: 10;
  width: calc(100% - var(--u) * 4.6);
  padding: var(--gap) var(--gap) 0;
}

.info-layout {
  display: flex;
  justify-content: space-between;
  pointer-events: none;
}

.info-left-w {
  display: flex;
  pointer-events: none;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: calc(var(--gap) * 0.5);
  min-width: calc(var(--u) * 11);
  pointer-events: auto;
}

.spacer.cal-item {
  width: calc(var(--u) * 9);
}

.info-left-group {
  display: flex;
  flex-direction: column;
  gap: var(--gap);
  min-width: calc(var(--u) * 10);
  margin-right: var(--gap);
}

.info-col {
  display: flex;
  flex-direction: column;
}

.info-left-row {
  display: flex;
  justify-content: flex-start;
  align-items: flex-end;
  gap: calc(var(--gap) * 0.5);
}

.info-left-row.is-mh {
  align-items: flex-start;
  min-height: calc(var(--u) * 4);
}

.info-right-w {
  display: flex;
  flex-direction: column;
  gap: calc(var(--gap) * 2);
  width: 100%;
  max-width: calc(var(--u) * 21.0625);
}

.info-right-item {
  display: flex;
  flex-direction: column;
  gap: calc(var(--gap) * 0.5);
  pointer-events: auto;
}

.rich-text :deep(p) {
  margin: 0;
  font-family: var(--font-mona);
  font-size: var(--u);
  font-weight: 500;
  font-variation-settings: "wght" 500, "wdth" 100;
  line-height: 1.3;
  letter-spacing: calc(var(--u) * -0.0125);
}

.sched-row {
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(0, 1fr) minmax(0, 1fr);
  gap: 16px;
  margin-bottom: calc(var(--u) * 0.3);
  padding-bottom: calc(var(--u) * 0.3);
  border-bottom: 1px solid #f4f4ed17;
}

.sched-row.is-top {
  margin-bottom: 0;
}

.sched-row.race {
  color: var(--color-lime);
}

.sched-row.last {
  padding-top: calc(var(--gap) * 0.5);
  border-bottom-style: none;
}

.frame {
  position: relative;
  z-index: 5;
  color: var(--color-lime);
  pointer-events: none;
}

.frame svg {
  display: block;
  width: 100%;
  height: auto;
}

.f1-logo {
  position: absolute;
  left: var(--gap);
  bottom: var(--gap);
  z-index: 5;
}

.po-logo {
  display: block;
  width: auto;
  height: calc(var(--u) * 2.25);
}

.mobile-frame {
  display: none;
}

.gl-target {
  position: absolute;
  inset: 20% 5% 0;
  z-index: 0;
}

.title-w {
  position: absolute;
  inset: 0 auto auto 0;
  z-index: 5;
  width: calc(var(--u) * 4.7);
  min-height: calc(var(--u) * 29.3);
}

.title-layout {
  position: relative;
  z-index: 5;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--gap);
}

.title-vertical {
  font-family: var(--font-mona);
  font-size: calc(var(--u) * 4.5);
  font-weight: 700;
  font-variation-settings: "wght" 750, "wdth" 93;
  line-height: 0.886;
  letter-spacing: calc(var(--u) * -0.125);
  text-transform: uppercase;
  writing-mode: vertical-lr;
  transform: rotate(180deg);
}

.flag-ui {
  position: relative;
  top: calc(var(--u) * -1);
  left: calc(var(--u) * 0.4);
  display: flex;
  width: calc(var(--u) * 2.12438);
  height: calc(var(--u) * 1.27438);
  border-radius: calc(var(--u) * 0.2);
  overflow: clip;
}

.flag-ui .cal-target-wrapper,
.lang-badge {
  width: 100%;
  height: 100%;
}

/* Language badge (EN / বাং / ALL) in the flag slots: lime chip, dark text. */
.lang-badge {
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: var(--color-lime);
  color: #111112;
  font-family: var(--font-mona);
  font-size: calc(var(--u) * 0.6);
  font-variation-settings: "wght" 800, "wdth" 87.5;
  line-height: 1;
  white-space: nowrap;
}

.flag-row .lang-badge {
  font-size: calc(var(--u) * 0.65);
}

.frame-segment {
  position: absolute;
  inset: auto 0 calc(var(--u) * -7.4) auto;
}

.controls {
  position: absolute;
  inset: auto 0 0 auto;
  display: flex;
  flex-direction: column;
  gap: calc(var(--gap) * 0.5);
}

.icon-btn {
  display: flex;
  justify-content: center;
  align-items: center;
  width: calc(var(--u) * 3.75);
  height: calc(var(--u) * 3.75);
  border-radius: calc(var(--u) * 0.54);
  background-color: var(--color-lime);
}

.icon-rive {
  display: flex;
  width: var(--u);
  height: var(--u);
  pointer-events: none;
}

.icon-rive.is-rotated {
  transform: rotate(180deg);
}

/* ---- title ---- */
.grid-main {
  display: grid;
  grid-template-columns: 23.55% 23.55% 23.55% 23.55%;
  column-gap: var(--gap);
  width: 100%;
}

.headline-w {
  grid-column: 1 / span 2;
  display: flex;
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

.para-layout {
  grid-column: 3 / span 2;
  display: flex;
  gap: calc(var(--gap) * 2);
}

.para-w {
  display: flex;
  flex-direction: column;
  gap: calc(var(--gap) * 2);
  max-width: calc(var(--u) * 25);
}

.body-reg {
  margin: 0;
  font-family: var(--font-mona);
  font-size: calc(var(--u) * 1.25);
  font-variation-settings: "wght" 500, "wdth" 100;
  line-height: 1.25;
  letter-spacing: calc(var(--u) * -0.0125);
}

.standings-w {
  display: flex;
  gap: calc(var(--u) * 6);
}

.text-layout {
  position: relative;
  display: flex;
  gap: calc(var(--gap) * 0.25);
}

.text-layout.is-gap {
  align-items: flex-end;
}

/* ---- upcoming list ---- */
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
  cursor: pointer;
}

.hl-grid.is-row.is-active {
  background-color: #282c20;
}

.hl-grid.is-row:hover {
  background-color: #282c20;
  color: var(--color-lime);
}

.hl-item {
  position: relative;
  display: flex;
  justify-content: flex-start;
  align-items: flex-start;
  gap: calc(var(--gap) * 0.5);
}

.flag-row {
  position: relative;
  top: calc(var(--u) * 0.4);
  display: flex;
  width: calc(var(--u) * 2.12438);
  height: calc(var(--u) * 1.4125);
  border-radius: calc(var(--u) * 0.2);
  overflow: clip;
}



.hl-line {
  position: absolute;
  inset: 0 0 auto;
  width: calc(100% - var(--gap) * 2);
  height: 1px;
  margin-inline: auto;
  background-color: #282c20;
}

.row-reveal {
  position: absolute;
  inset: 0;
  z-index: 5;
  background-color: var(--color-lime);
}

/* Only three languages, so every row stays visible: the CTA sits under the list, no fade over it. */
.grad {
  position: relative;
  display: flex;
  justify-content: center;
  padding-top: calc(var(--gap) * 2);
  pointer-events: none;
}

.grad-btn {
  pointer-events: auto;
}

.mouse-w {
  position: absolute;
  inset: 0 auto auto 0;
  z-index: 10;
  width: calc(var(--u) * 16.6875);
  height: calc(var(--u) * 16);
  overflow: hidden;
  pointer-events: none;
}

.circuit-rive-w {
  display: flex;
  justify-content: center;
  align-items: center;
  width: calc(var(--u) * 16.6875);
  height: calc(var(--u) * 16);
}

.circuit-rive {
  position: relative;
  z-index: 10;
  display: flex;
  width: calc(var(--u) * 11.5);
  height: calc(var(--u) * 11.5);
  margin-inline: auto;
}

.outlet-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.circuit-rive-bg {
  position: absolute;
  inset: 0;
}
/* Reference ≤479 (live at 375 px; 1u = the phone rem): stacked card, 4-column list. */
@media (max-width: 767px) {
  .mouse-w,
  .frame,
  .f1-logo,
  .frame-segment,
  .btn-outer-w,
  .hl-grid.is-top > :nth-child(5),
  .hl-grid.is-row > .hl-item:nth-child(5) {
    display: none;
  }

  .track-mask {
    display: flex;
    flex-direction: column;
    min-height: calc(var(--u) * 40);
    aspect-ratio: auto;
    padding: 0 var(--gap) var(--gap);
  }

  .mobile-frame {
    position: absolute;
    display: flex;
    width: 100%;
    pointer-events: none;
  }

  .mobile-frame.is-top {
    inset: auto 0;
    top: 0;
  }

  .mobile-frame.is-middle {
    inset: 30% 0 auto;
  }

  .mobile-frame.is-bottom {
    inset: auto 0 0;
  }

  .title-w {
    top: var(--gap);
    left: var(--gap);
    width: auto;
    min-height: auto;
  }

  .title-layout {
    flex-direction: row;
  }

  .title-vertical {
    font-size: calc(var(--u) * 2.6);
    writing-mode: inherit;
    transform: rotate(0);
  }

  .flag-ui {
    top: 0;
    left: calc(var(--u) * -0.7);
    width: calc(var(--u) * 1.7);
    height: auto;
    aspect-ratio: 2.12438 / 1.27438;
  }

  .controls {
    inset: 0 0 auto auto;
  }

  .icon-btn {
    width: calc(var(--u) * 3.3);
    height: calc(var(--u) * 3.3);
  }

  .gl-target {
    inset: calc(var(--u) * 3) 0 auto;
    height: calc(var(--u) * 23);
  }

  .info-pos {
    position: relative;
    width: 100%;
    margin-top: calc(var(--u) * 25);
    padding: 0;
  }

  .info-layout {
    flex-direction: column;
    margin-top: auto;
  }

  .info-item {
    flex: none;
    min-width: auto;
  }

  .info-left-group {
    min-width: auto;
  }

  .info-right-w {
    flex: none;
    max-width: none;
  }

  .info-left-row.is-mh {
    min-height: calc(var(--u) * 3);
  }

  .sched-row.last {
    padding-top: calc(var(--gap) * 0.2);
  }

  .eyebrow {
    font-size: calc(var(--u) * 0.8);
  }

  .stat-major {
    font-size: calc(var(--u) * 2.2);
  }

  .stat-major.mob-small {
    position: relative;
    top: calc(var(--u) * 0.2);
    font-size: var(--u);
  }

  .stat-major.no-wrap {
    flex: none;
  }

  .stat-sm {
    position: relative;
    top: calc(var(--u) * 0.1);
    font-size: calc(var(--u) * 1.3);
  }

  .stat-reg {
    font-size: calc(var(--u) * 1.6);
  }

  .grid-main {
    grid-template-columns: 1fr 1fr;
    gap: calc(var(--gap) * 2);
    margin-bottom: calc(var(--gap) * 2);
  }

  .headline-w {
    grid-column: 1 / span 1;
  }

  .para-layout {
    grid-column: 2 / span 1;
  }

  .para-w {
    max-width: none;
  }

  .title-lg,
  .title-lg :deep(strong) {
    font-size: calc(var(--u) * 2.6);
  }

  .body-reg :deep(br) {
    display: none;
  }

  .hl-grid {
    grid-template-columns: minmax(0, 0.4fr) minmax(0, 2fr) minmax(0, 1fr) minmax(0, 0.6fr);
  }

  .flag-row {
    flex: none;
    top: calc(var(--u) * 0.2);
    width: calc(var(--u) * 1.4);
    height: calc(var(--u) * 0.9);
    border-radius: calc(var(--u) * 0.1);
  }
}
</style>

<style>
/* GL markers (created by webgl/scenes/TracksScene inside [data-gl="tracks"]); reference .css-tracks embed. */
.lando-gl__point {
  position: absolute;
  top: 50%;
  left: 50%;
  z-index: 9;
}

.lando-gl__point__content {
  position: absolute;
  bottom: 0;
  left: 0;
  height: calc(var(--u) * 4);
}

.lando-gl__point__content p {
  margin: 0 0 0 calc(var(--u) * 0.8);
  font-family: inherit;
  font-size: calc(var(--u) * 0.57);
  line-height: 1.2;
  text-transform: uppercase;
  white-space: nowrap;
  user-select: none;
}

.lando-gl__point__content p:nth-child(1) {
  color: #b2c73a;
}

.lando-gl__point__content p:nth-child(2) {
  color: #f5fbce;
}

.lando-gl__point__content::before {
  content: "";
  position: absolute;
  bottom: 0;
  left: 0;
  width: calc(var(--u) * 0.4);
  height: calc(var(--u) * 0.4);
  border-radius: 50%;
  background-color: #b2c73a;
  transform: translate(-50%, 50%);
}

.lando-gl__point__content::after {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  width: 1px;
  height: 100%;
  background-color: #b2c73a;
  transform: translate(-50%);
}

.lando-gl__point__content--drs p:nth-child(1),
.lando-gl__point__content--drs p:nth-child(2) {
  color: #f5fbce;
}

.lando-gl__point__content--drs::before,
.lando-gl__point__content--drs::after {
  background-color: #f5fbce;
}

/* Reference nests this under .lando-gl__point__start, which never contains a content node: no effect. */
.lando-gl__point__start .lando-gl__point__content {
  height: calc(var(--u) * 3);
}

.lando-gl__point__start svg {
  margin-left: calc(var(--u) * 0.75);
}
</style>
