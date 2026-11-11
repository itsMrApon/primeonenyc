<script setup lang="ts">
/**
 * Calendar page "Services / & forms" (layout of the reference /calendar "All Results"
 * accordion, the .s after .is-on-t-calendar). Data: useServices (bundled
 * content/services.json or the dashboard URL) via the `data` prop.
 *   - Title: oval reveal at "top 95%" (bundle e0: per line clip ellipse(20% 0%) → (100% 120%)
 *     at top centre, 1.5 s power2.inOut, 0.15 s stagger).
 *   - Paragraph highlighter (dark-green-tint-1), header eyebrows (lime).
 *   - One row per service ([data-calendar-history] behaviour): click / Enter / Space toggles
 *     it; opening one closes the others; when the opened row's top is above the viewport or
 *     below 30 % of it, lenis scrolls it to −100 px (0.5 s).
 *   - Service head: name, docs count (lime laurel Rive for featured services).
 *   - Open: headline, details + turnaround, then the downloadable docs (no., name + code
 *     chip, issuer, format, download link).
 */
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type Lenis from "lenis";

import type { ServiceDoc, ServicesData } from "~/composables/useServices";

const props = defineProps<{ data: ServicesData }>();
const r = computed(() => props.data.formsSection);
const col = computed(() => r.value.columns);

const services = computed(() => {
  const byService = new Map<string, ServiceDoc[]>();
  for (const doc of props.data.docs) byService.set(doc.service, [...(byService.get(doc.service) ?? []), doc]);
  return [...props.data.services]
    .sort((a, b) => a.no - b.no)
    .map((sv) => ({ ...sv, docs: (byService.get(sv.id) ?? []).sort((a, b) => a.sort - b.sort) }));
});

const open = ref<number | null>(null);
const items = ref<HTMLElement[]>([]);
const title = ref<HTMLElement | null>(null);
let titleTl: gsap.core.Timeline | null = null;
let titleTrigger: ScrollTrigger | null = null;

async function toggle(i: number) {
  open.value = open.value === i ? null : i;
  await nextTick();
  ScrollTrigger.refresh();
  if (open.value !== i) return;
  setTimeout(() => {
    const el = items.value[i];
    if (!el) return;
    const top = el.getBoundingClientRect().top;
    if (top >= 0 && top <= window.innerHeight * 0.3) return;
    const lenis = (window as unknown as { lenis?: Lenis }).lenis;
    if (lenis) lenis.scrollTo(el, { offset: -100, duration: 0.5 });
    else el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, 10);
}

onMounted(() => {
  gsap.registerPlugin(ScrollTrigger);
  const wraps = [...(title.value?.querySelectorAll<HTMLElement>(".oval-wrap") ?? [])];
  gsap.set(wraps, { clipPath: "ellipse(20% 0% at 50% 0%)" });
  titleTl = gsap.timeline({ paused: true });
  titleTl.to(wraps, { clipPath: "ellipse(100% 120% at 50% 0%)", duration: 1.5, ease: "power2.inOut", stagger: 0.15 });
  titleTrigger = ScrollTrigger.create({ trigger: title.value, start: "top 95%", once: true, onEnter: () => titleTl?.play() });
});

onBeforeUnmount(() => {
  titleTrigger?.kill();
  titleTl?.kill();
});
</script>

<template>
  <section class="cal-results">
    <div class="c">
      <div class="title-layout grid-main">
        <div class="headline-w">
          <h2 class="sr-only">{{ r.titleTop }} {{ r.titleBottom }}</h2>
          <div ref="title" class="title-lg" aria-hidden="true">
            <div class="oval-outer">
              <span class="oval-wrap"><span class="oval-line">{{ r.titleTop }}</span></span>
              <span class="oval-wrap"><span class="oval-line is-brier">{{ r.titleBottom }}</span></span>
            </div>
          </div>
        </div>
        <div class="para-w">
          <HighLines tag="p" class="body-reg" color="dark-green-tint-1" :html="r.body" />
        </div>
      </div>
    </div>
    <div class="spacer h10" />
    <div class="collection-w">
      <div class="res-grid is-top is-dd-top">
        <div class="eyebrow-w"><HighLines class="eyebrow" :html="col.open" /></div>
        <div class="eyebrow-w is-span3"><HighLines class="eyebrow" :html="col.service" /></div>
        <div class="eyebrow-w"><HighLines class="eyebrow" :html="col.docs" /></div>
      </div>
      <div class="dd-list">
        <div
          v-for="(sv, i) in services"
          :key="sv.id"
          ref="items"
          class="dd-item"
          :class="{ 'is-open': open === i }"
        >
          <div
            class="dd-trigger"
            role="button"
            tabindex="0"
            :aria-expanded="open === i"
            :aria-controls="`svc-forms-${sv.id}`"
            @click="toggle(i)"
            @keydown.enter.space.prevent="toggle(i)"
          >
            <div class="res-grid is-head">
              <div class="chev-w">
                <div class="chev">
                  <svg width="100%" height="100%" viewBox="0 0 28 19" fill="none" aria-hidden="true">
                    <path d="M25 16.422 13.61 5 2.188 16.422" stroke="currentColor" stroke-width="6.03" />
                  </svg>
                </div>
              </div>
              <h3 class="label-major is-span3">{{ sv.name }}</h3>
              <div class="res-item">
                <div class="item-text">
                  <div v-if="sv.docs.length" class="label-major is-flex">
                    {{ sv.docs.length }}<span class="label-sm" :class="{ 'is-lime': sv.featured }">{{
                      sv.docs.length === 1 ? "doc" : "docs"
                    }}</span>
                  </div>
                  <div v-else class="label-major is-muted">–</div>
                </div>
                <div v-if="sv.featured && sv.docs.length" class="trophy-w">
                  <div class="reef">
                    <RiveCanvas
                      file="reef"
                      artboard="reef"
                      state-machine="reef_play"
                      :inputs="{ color_lime: true }"
                      play-at="top 80%"
                    />
                  </div>
                </div>
              </div>
              <div class="head-line" />
            </div>
          </div>
          <div
            v-show="open === i"
            :id="`svc-forms-${sv.id}`"
            class="dd-content"
            role="region"
            :aria-hidden="open !== i"
          >
            <div class="res-grid is-detail">
              <div class="detail-w is-head-w"><p class="detail-headline">{{ sv.headline }}</p></div>
              <div class="detail-w is-body-w"><p class="body-reg">{{ sv.details }}</p></div>
              <div v-if="sv.ready" class="detail-w is-ready-w">
                <div class="eyebrow">{{ col.ready }}</div>
                <div class="label-major is-flex">
                  {{ sv.ready }}<span v-if="sv.readyUnit" class="label-sm">{{ sv.readyUnit }}</span>
                </div>
              </div>
            </div>
            <template v-if="sv.docs.length">
              <div class="res-grid is-top is-dd-item">
                <div class="eyebrow-w"><div class="eyebrow">{{ col.no }}</div></div>
                <div class="eyebrow-w"><div class="eyebrow">{{ col.doc }}</div></div>
                <div class="eyebrow-w hide-m"><div class="eyebrow">{{ col.from }}</div></div>
                <div class="eyebrow-w"><div class="eyebrow">{{ col.format }}</div></div>
                <div class="eyebrow-w"><div class="eyebrow">{{ col.download }}</div></div>
              </div>
              <div class="collection">
                <div class="res-list" role="list">
                  <div v-for="(doc, j) in sv.docs" :key="doc.id" class="res-grid is-row" role="listitem">
                    <div class="res-item">
                      <div class="round-w"><div class="label-major">{{ String(j + 1).padStart(2, "0") }}</div></div>
                    </div>
                    <div class="res-item">
                      <h4 class="label-major">{{ doc.name }}</h4>
                      <div class="flag"><span class="code-chip">{{ doc.code }}</span></div>
                    </div>
                    <div class="res-item hide-m">
                      <div class="label-major">{{ doc.issuer }}</div>
                    </div>
                    <div class="res-item">
                      <div class="label-major">{{ doc.format }}</div>
                    </div>
                    <div class="res-item">
                      <a
                        class="item-text is-gap is-link"
                        :href="doc.url"
                        target="_blank"
                        rel="noopener"
                        download
                        :aria-label="`Download ${doc.name} (${doc.code})`"
                      >
                        <span class="label-reg">Get</span><span class="descriptor">{{ doc.code }} ↓</span>
                      </a>
                    </div>
                    <div class="row-line" />
                  </div>
                </div>
              </div>
            </template>
            <div v-else class="res-grid is-empty">
              <div class="descriptor">{{ col.noDocs }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="spacer h10" />
  </section>
</template>

<style scoped>
/* Reference metrics at 1440 px; 1u = 13.33 px (the reference rem). */
.cal-results {
  --gap: calc(var(--u) * 1.25);
  --grey: #b9bbad;
  position: relative;
  color: #f4f4ed;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}

.spacer.h10 {
  height: calc(var(--u) * 10);
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

.oval-outer {
  overflow: clip;
}

.oval-wrap {
  display: block;
}

.oval-line {
  display: inline-block;
}

/* .text-title-lg-brier.c-grey-on-track */
.oval-line.is-brier {
  font-family: var(--font-brier);
  font-size: calc(var(--u) * 4.6875);
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
  letter-spacing: 0;
  font-family: var(--font-mona);
  font-size: calc(var(--u) * 0.625);
  font-variation-settings: "wght" 700, "wdth" 100;
  line-height: 1;
  text-transform: uppercase;
}

.eyebrow.mob-only {
  display: none;
}

.is-span {
  grid-column: span 2;
}

.is-span3 {
  grid-column: span 3;
}

.label-major.is-muted {
  color: var(--grey);
}

/* .f1-highlight-grid */
.res-grid {
  position: relative;
  display: grid;
  grid-template-columns: 11.775% 35.325% 23.55% 1fr 1fr;
  gap: var(--gap);
  padding: calc(var(--gap) * 0.5) var(--gap);
}

.res-grid.is-dd-top {
  margin-bottom: var(--gap);
}

.res-grid.is-dd-item {
  padding-top: calc(var(--gap) * 1.5);
}

.collection-w {
  position: relative;
  pointer-events: none;
}

.dd-list {
  pointer-events: auto;
}

.dd-trigger {
  cursor: pointer;
  outline-offset: -2px;
}

.dd-content {
  position: relative;
  overflow: clip;
}

.chev-w {
  align-self: center;
}

.chev {
  display: flex;
  justify-content: center;
  align-items: center;
  width: calc(var(--u) * 1.4375);
  height: calc(var(--u) * 1.4375);
  color: var(--color-lime);
  transform: rotate(180deg);
}

.dd-item.is-open .dd-trigger {
  background: var(--color-lime);
  color: #111112;
}

.dd-item.is-open .chev {
  color: #111112;
  transform: rotate(0deg);
}

.head-line {
  position: absolute;
  left: var(--gap);
  right: var(--gap);
  bottom: 0;
  height: 1px;
  background-color: #282c20;
}

.collection {
  position: relative;
  margin-top: calc(var(--gap) * 2);
}

.res-list {
  position: relative;
  display: flex;
  flex-direction: column;
}

.res-item {
  position: relative;
  display: flex;
  justify-content: flex-start;
  align-items: flex-start;
  gap: calc(var(--gap) * 0.5);
}

.label-major {
  margin: 0;
  font-family: var(--font-mona);
  font-size: calc(var(--u) * 4.375);
  font-weight: inherit;
  font-variation-settings: "wght" 700, "wdth" 75;
  line-height: 0.93;
  text-transform: uppercase;
}

.label-major.is-flex {
  display: flex;
}

/* data-text-format="position": suffix lime after a "1", grey otherwise; 1.5u, raised .4u. */
.label-sm {
  position: relative;
  top: calc(var(--u) * 0.4);
  right: calc(var(--u) * -0.2);
  font-size: calc(var(--u) * 1.5);
  line-height: 1;
  color: var(--grey);
}

.label-sm.is-lime {
  color: var(--color-lime);
}

.label-reg {
  font-family: var(--font-mona);
  font-size: calc(var(--u) * 2.0625);
  font-variation-settings: "wght" 700, "wdth" 75;
  line-height: 0.97;
  letter-spacing: calc(var(--u) * -0.00625);
  text-transform: uppercase;
}

.descriptor {
  font-family: var(--font-mona);
  font-size: var(--u);
  font-variation-settings: "wght" 800, "wdth" 87.5;
  line-height: 0.97;
  text-transform: uppercase;
  color: var(--grey);
}

.round-w {
  display: flex;
  justify-content: flex-start;
  align-items: center;
  min-width: calc(var(--u) * 3.4);
  color: var(--grey);
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

.flag {
  flex: none;
  width: auto;
  min-width: calc(var(--u) * 2.12438);
}

/* Form code in the flag slot: lime chip, dark text (as the calendar list). */
.code-chip {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  padding-inline: calc(var(--u) * 0.3);
  background-color: var(--color-lime);
  color: #111112;
  font-family: var(--font-mona);
  font-size: calc(var(--u) * 0.65);
  font-variation-settings: "wght" 800, "wdth" 87.5;
  line-height: 1;
  white-space: nowrap;
}

.res-grid.is-detail {
  padding-top: calc(var(--gap) * 2);
}

/* Open service: headline (brier) over details in cols 2–4, turnaround in col 5. */
.detail-w.is-head-w {
  grid-column: 2 / span 3;
  grid-row: 1;
}

.detail-w.is-body-w {
  grid-column: 2 / span 3;
  grid-row: 2;
  max-width: 44em;
  color: var(--grey);
}

.detail-w.is-ready-w {
  grid-column: 5;
  grid-row: 1 / span 2;
  display: flex;
  flex-direction: column;
  gap: calc(var(--gap) * 0.5);
}

.detail-w.is-ready-w .eyebrow {
  color: var(--grey);
}

.res-grid.is-empty {
  padding-block: calc(var(--gap) * 2);
}

.res-grid.is-empty .descriptor {
  grid-column: 2 / -1;
}

.detail-headline {
  margin: 0;
  font-family: var(--font-brier);
  font-size: calc(var(--u) * 2.6);
  line-height: 0.95;
}

/* Form rows: smaller than the season rows (names run longer than race locations). */
.res-grid.is-row .label-major {
  font-size: calc(var(--u) * 2.6);
}

.item-text.is-link {
  color: var(--color-lime);
  text-decoration: none;
}

.item-text.is-link .descriptor {
  color: inherit;
}

@media (hover: hover) {
  .item-text.is-link:hover .label-reg {
    text-decoration: underline;
  }
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

/* .f1-highlight-trophy-w: square as tall as the row item, pulled 5.6u left of the finish. */
.trophy-w {
  position: absolute;
  inset: 0 auto auto calc(var(--u) * -5.6);
  display: flex;
  justify-content: flex-end;
  align-items: center;
  height: 100%;
  aspect-ratio: 1;
}

/* .icon-svg-closed-reef.pre-f1-car.is-2nd.is-history */
.reef {
  display: block;
  height: calc(var(--u) * 3.75);
  aspect-ratio: 1;
}

.row-line {
  position: absolute;
  inset: 0 0 auto;
  width: calc(100% - var(--gap) * 2);
  height: 1px;
  margin-inline: auto;
  background-color: #282c20;
}

@media (min-width: 992px) {
  .res-grid.is-head:hover {
    background-color: var(--color-lime);
    color: #111112;
  }

  .res-grid.is-head:hover .label-sm {
    color: inherit;
  }

  .dd-item:hover .chev {
    color: #111112;
  }
}

/* Reference ≤479 (phone rem): five narrow columns, the date column hidden; smaller type. */
@media (max-width: 767px) {
  .title-layout.grid-main {
    grid-template-columns: 1fr 1fr;
    gap: calc(var(--gap) * 2);
  }

  .headline-w {
    grid-column: 1 / span 1;
  }

  .para-w {
    grid-column: 2 / span 1;
  }

  .title-lg,
  .oval-line.is-brier {
    font-size: calc(var(--u) * 2.6);
  }

  .body-reg {
    font-size: calc(var(--u) * 1.3);
  }

  .body-reg :deep(br) {
    display: none;
  }

  .eyebrow {
    font-size: calc(var(--u) * 0.8);
  }

  .eyebrow.dt-only {
    display: none;
  }

  .eyebrow.mob-only {
    display: block;
  }

  .res-grid.is-top.is-dd-top,
  .res-grid.is-head {
    grid-template-columns: minmax(0, 0.5fr) minmax(0, 1fr) minmax(0, 2fr) minmax(0, 1fr) minmax(0, 0.75fr);
  }

  .res-grid.is-top.is-dd-item,
  .res-grid.is-row {
    grid-template-columns: minmax(0, 0.5fr) minmax(0, 1fr) minmax(0, 2fr) minmax(0, 1fr) minmax(0, 1fr);
  }

  .hide-m {
    display: none;
  }

  /* Location takes the date column's place (reference w-node span 2 at ≤479). */
  .res-grid.is-row > .res-item:nth-child(2),
  .res-grid.is-dd-item > .eyebrow-w:nth-child(2) {
    grid-column: span 2;
  }

  .label-major {
    font-size: calc(var(--u) * 2.2);
  }

  .label-sm {
    top: 0;
    font-size: calc(var(--u) * 1.3);
  }

  .label-sm.is-lime {
    top: calc(var(--u) * 0.1);
  }

  .label-reg {
    font-size: calc(var(--u) * 1.6);
  }

  .round-w {
    justify-content: center;
    min-width: auto;
  }

  .flag {
    flex: none;
    top: calc(var(--u) * 0.2);
    width: calc(var(--u) * 1.4);
    height: calc(var(--u) * 0.9);
    border-radius: calc(var(--u) * 0.1);
  }

  .trophy-w {
    left: calc(var(--u) * -2.6);
  }

  .reef {
    position: relative;
    height: calc(var(--u) * 2);
  }

  .res-grid.is-detail {
    row-gap: var(--gap);
  }

  .detail-w.is-head-w,
  .detail-w.is-body-w,
  .detail-w.is-ready-w {
    grid-column: 2 / -1;
    grid-row: auto;
  }

  .detail-headline {
    font-size: calc(var(--u) * 2);
  }

  .res-grid.is-row .label-major {
    font-size: calc(var(--u) * 1.6);
  }

  .code-chip {
    font-size: calc(var(--u) * 0.5);
  }

  .item-text.is-gap {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
