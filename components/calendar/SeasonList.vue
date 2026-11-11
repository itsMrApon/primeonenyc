<script setup lang="ts">
/**
 * Calendar page: Prime One services calendar (layout of the reference /calendar
 * #calendar-list results list). Data comes from useServices (bundled
 * content/services.json or the dashboard URL) via the `data` prop.
 *   - Header eyebrows (lime highlighters): No. / Key date / When / Your perk / Gov says.
 *   - Rows sorted by date and numbered; past dates get the lime brush strike on the
 *     number, the next upcoming date gets the tinted row.
 *   - Service code chip sits in the reference flag slot; a gift icon marks rows with a gift.
 *   - Rows reveal with useStatListReveal; hover (>=992) as the reference.
 */
import type { ServicesData } from "~/composables/useServices";

const props = defineProps<{ data: ServicesData }>();
const col = computed(() => props.data.calendar.columns);
const list = ref<HTMLElement | null>(null);
useStatListReveal(list);

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const toDate = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
};

const rows = computed(() => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const services = new Map(props.data.services.map((sv) => [sv.id, sv]));
  const sorted = [...props.data.calendar.events].sort((a, b) => a.date.localeCompare(b.date));
  const nextIdx = sorted.findIndex((it) => toDate(it.date) >= today);
  return sorted.map((it, i) => {
    const d = toDate(it.date);
    const sv = services.get(it.service);
    return {
      ...it,
      code: sv?.code ?? it.service.toUpperCase(),
      serviceName: sv?.name ?? it.service,
      no: String(i + 1).padStart(2, "0"),
      day: `${d.getDate()} ${MONTHS[d.getMonth()]}`,
      year: String(d.getFullYear()).slice(2),
      past: d < today,
      next: i === nextIdx
    };
  });
});

const STRIKE =
  "M37.077 15.373c-.147.013-.301-.005-.437.04-1.109.361-2.239.673-3.31 1.114-1.437.59-2.833 1.286-4.246 1.931-1.547.708-3.046 1.509-4.618 2.165-.715.298-1.399.686-2.072 1.068-2.285 1.29-4.52 2.683-6.863 3.865-1.486.752-2.85 1.657-4.238 2.557a159.791 159.791 0 0 1-5.47 3.357c-.71.418-1.46.777-2.224 1.088-.8.326-1.203.164-1.512-.616a63.493 63.493 0 0 1-1.234-3.426c-.09-.266-.076-.578-.057-.863.039-.622.306-1.086.895-1.397.991-.518 1.953-1.088 2.925-1.648.969-.56 1.944-1.111 2.896-1.7a120.543 120.543 0 0 1 7.084-4.065c2.798-1.479 5.56-3.019 8.38-4.45 2.125-1.077 4.302-2.059 6.483-3.018C31.282 10.57 33.141 9.83 35 9.113a66.936 66.936 0 0 1 4.134-1.45c2.554-.802 5.11-1.608 7.688-2.326 4.03-1.119 8.04-2.339 12.141-3.203 1.859-.39 3.695-.875 5.537-1.34.564-.142 1.111-.354 1.666-.539 1.065-.353 2.127.233 2.3 1.328.099.62.113 1.26.098 1.89-.018.677-.059 1.362-.185 2.028-.162.843-.51 1.586-1.504 1.747-.193.03-.381.088-.56.16-1.928.798-3.876 1.565-5.777 2.424-1.683.76-3.31 1.633-5.025 2.329-.585.235-1.138.556-1.688.861-.897.492-1.795.967-2.768 1.306-.453.156-.857.456-1.274.703-1.166.696-2.27 1.5-3.557 1.981-.727.275-1.079.835-.989 1.602.09.814-.145 1.542-.476 2.254-.605 1.298-1.504 2.202-2.995 2.507-2.248.455-4.367 1.345-6.485 2.206-.535.218-1.023.555-1.548.813-1.221.598-2.46 1.171-3.68 1.778-1.045.517-2.076 1.067-3.118 1.589-.434.219-.874.428-1.328.597-.41.154-.804-.002-.978-.402-.29-.665-.597-1.338-.774-2.04-.181-.706-.318-1.421-.63-2.086-.063-.13-.088-.279-.129-.417-.146-.514-.051-.965.378-1.312.302-.245.61-.481.93-.703 1.038-.722 2.067-1.463 3.13-2.148a181.95 181.95 0 0 1 4.465-2.764c1.417-.848 2.862-1.654 4.283-2.498.289-.171.536-.418.801-.627.112-.079.224-.162.335-.24l.01.014c-.111.079-.227.157-.338.236l-.013.002Z";
</script>

<template>
  <div id="calendar-list" class="season-list">
    <div class="res-grid is-top">
      <div class="eyebrow-w">
        <HighLines class="eyebrow dt-only" :html="col.no" />
        <div class="eyebrow mob-only">{{ col.noMobile }}</div>
      </div>
      <div class="eyebrow-w"><HighLines class="eyebrow" :html="col.event" /></div>
      <div class="eyebrow-w hide-m"><HighLines class="eyebrow" :html="col.when" /></div>
      <div class="eyebrow-w">
        <HighLines class="eyebrow dt-only" :html="col.perk" />
        <div class="eyebrow mob-only">{{ col.perkMobile }}</div>
      </div>
      <div class="eyebrow-w">
        <HighLines class="eyebrow dt-only" :html="col.gov" />
        <div class="eyebrow mob-only">{{ col.govMobile }}</div>
      </div>
    </div>
    <div ref="list" class="collection" role="list">
      <div
        v-for="row in rows"
        :key="row.id"
        class="res-grid is-row"
        :class="{ 'is-past': row.past, 'is-next': row.next }"
        :title="row.note"
        role="listitem"
        data-stat-item
      >
        <div class="res-item">
          <div class="round-w">
            <div class="label-major">{{ row.no }}</div>
            <svg v-if="row.past" class="strike" viewBox="0 0 69 33" fill="none" aria-hidden="true">
              <path :d="STRIKE" fill="currentColor" />
            </svg>
          </div>
        </div>
        <div class="res-item is-event">
          <div class="event-title">
            <div class="label-major">{{ row.title }}</div>
            <div class="flag"><span class="code-chip" :aria-label="row.serviceName">{{ row.code }}</span></div>
          </div>
          <div class="descriptor mob-only">{{ row.day }} {{ row.year }}<template v-if="row.next"> · next</template></div>
        </div>
        <div class="res-item hide-m">
          <div class="label-major">{{ row.day }}</div>
          <div class="label-major">{{ row.year }}</div>
        </div>
        <div class="res-item">
          <div class="item-text">
            <div class="label-major is-flex">
              {{ row.perk }}<span v-if="row.perkSuffix" class="label-sm" :class="{ 'is-lime': row.gift }">{{
                row.perkSuffix
              }}</span>
            </div>
          </div>
          <svg v-if="row.gift" class="gift" viewBox="0 0 24 24" fill="none" aria-label="gift">
            <path
              d="M3 9h18v4H3zM5 13v8h14v-8M12 9v12M12 9S10.5 4 8 4a2.5 2.5 0 0 0 0 5h4Zm0 0s1.5-5 4-5a2.5 2.5 0 0 1 0 5h-4Z"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linejoin="round"
            />
          </svg>
        </div>
        <div class="res-item">
          <div class="item-text is-gov">
            <div class="label-reg">{{ row.gov }}</div>
            <div v-if="row.govUnit" class="descriptor">{{ row.govUnit }}</div>
          </div>
        </div>
        <div class="row-line" />
        <div class="row-reveal" />
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Reference metrics at 1440 px; 1u = 13.33 px (the reference rem). */
.season-list {
  --gap: calc(var(--u) * 1.25);
  --grey: #b9bbad;
  position: relative;
  color: #f4f4ed;
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

.eyebrow :deep(.line) {
  margin-inline: 0;
}

.eyebrow.mob-only {
  display: none;
}

.res-grid {
  position: relative;
  display: grid;
  grid-template-columns: 11.775% 35.325% 23.55% 1fr 1fr;
  gap: var(--gap);
  padding: calc(var(--gap) * 0.5) var(--gap);
}

.res-grid.is-top {
  pointer-events: none;
}

.collection {
  position: relative;
  display: flex;
  flex-direction: column;
  margin-top: calc(var(--gap) * 2);
}

.res-grid.is-row {
  overflow: hidden;
}

.res-item {
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
  white-space: nowrap;
}

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

/* The perk value stays on one line; its suffix may wrap (narrow mobile column). */
.label-major.is-flex .label-sm {
  white-space: normal;
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

/* .f1-highlight-item-round-w.cal-previous + .f1-highlight-round-svg */
.round-w {
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  min-width: calc(var(--u) * 3.4);
  color: var(--grey);
}

.strike {
  position: absolute;
  width: 110%;
  max-width: none; /* the base reset caps svgs at 100 % */
  height: auto;
  color: var(--color-lime);
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

/* Service code in the flag slot: lime chip, dark text (as the language badges). */
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

.res-item.is-event {
  flex-direction: column;
}

.event-title {
  display: flex;
  align-items: flex-start;
  gap: calc(var(--gap) * 0.5);
}

.descriptor.mob-only {
  display: none;
}

.item-text {
  position: relative;
  display: flex;
  gap: calc(var(--gap) * 0.25);
}

.item-text.is-gov {
  flex-direction: column;
  gap: calc(var(--gap) * 0.2);
}

.gift {
  flex: none;
  position: relative;
  top: calc(var(--u) * 0.4);
  width: calc(var(--u) * 1.6);
  height: auto;
  color: var(--color-lime);
}

/* Next upcoming date: the tinted "selected" row of the language list. */
.res-grid.is-row.is-next {
  background-color: #282c20;
}

.res-grid.is-row.is-next .round-w {
  color: var(--color-lime);
}

.row-line {
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

@media (min-width: 992px) {
  .res-grid.is-row:hover {
    background-color: var(--color-lime);
    color: #111112;
  }

  .res-grid.is-row:hover .row-line {
    display: none;
  }

  .res-grid.is-row:hover .label-sm,
  .res-grid.is-row:hover .descriptor,
  .res-grid.is-row:hover .round-w,
  .res-grid.is-row:hover .strike,
  .res-grid.is-row:hover .gift {
    color: inherit;
  }

  .res-grid.is-row:hover .code-chip {
    background-color: #111112;
    color: var(--color-lime);
  }
}

/* Reference ≤479 (phone rem): four columns, the "when" column hidden. */
@media (max-width: 767px) {
  .eyebrow {
    font-size: calc(var(--u) * 0.8);
  }

  .eyebrow.dt-only {
    display: none;
  }

  .eyebrow.mob-only {
    display: block;
  }

  .res-grid {
    grid-template-columns: minmax(0, 0.4fr) minmax(0, 2fr) minmax(0, 1fr) minmax(0, 0.6fr);
  }

  .hide-m {
    display: none;
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
    min-width: auto;
  }

  .strike {
    width: 150%;
  }

  .flag {
    top: calc(var(--u) * 0.2);
    min-width: calc(var(--u) * 1.4);
    height: calc(var(--u) * 0.9);
    border-radius: calc(var(--u) * 0.1);
  }

  .code-chip {
    font-size: calc(var(--u) * 0.5);
  }

  .descriptor.mob-only {
    display: block;
    color: var(--color-lime);
  }

  .gift {
    top: 0;
    width: calc(var(--u) * 1.1);
  }
}
</style>
