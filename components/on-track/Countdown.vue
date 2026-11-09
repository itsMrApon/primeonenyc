<script setup lang="ts">
/**
 * On Track "next race" countdown (reference section[data-countdown-wrap]).
 * See .reanimate/on-track/06-on-track-countdown/spec.md.
 *   - Office outline (OutletIcon, lime) over the eyebrow (reference: circuits.riv track, color_lime).
 *   - Digits (bundle S$): target is an ISO date with offset (New York tax deadline, ET);
 *     days/hours/minutes/seconds zero-padded, refreshed every second; "00" once it has passed.
 *   - "Tax Day" brush phrase (BrushPhrase, rebuilt from the phrases.riv race-day strokes) centred
 *     over the digits, plays at "top 80%".
 */
import content from "~/content/on-track.json";

const cd = content.countdown;

const target = Date.parse(cd.date);
const digits = ref(["00", "00", "00", "00"]);
let timer: ReturnType<typeof setInterval> | undefined;

function tick() {
  const left = target - Date.now();
  if (left < 0) {
    digits.value = ["00", "00", "00", "00"];
    return;
  }
  digits.value = [
    Math.floor(left / 86400000),
    Math.floor((left % 86400000) / 3600000),
    Math.floor((left % 3600000) / 60000),
    Math.floor((left % 60000) / 1000)
  ].map((n) => n.toString().padStart(2, "0"));
}

onMounted(() => {
  tick();
  timer = setInterval(tick, 1000);
});

onBeforeUnmount(() => clearInterval(timer));
</script>

<template>
  <section class="ot-countdown">
    <div class="c">
      <div class="spacer h10" />
      <div class="inner">
        <div class="eyebrow-layout">
          <div class="circuit-rive">
            <OutletIcon :src="cd.outline" color="#d2ff00" />
          </div>
          <div class="eyebrow-w">
            <HighLines class="eyebrow" :html="cd.eyebrow" />
          </div>
        </div>
        <div class="digits-w">
          <div class="phrase-rive-w">
            <div class="phrase-rive">
              <BrushPhrase play-at="top 80%" />
            </div>
          </div>
          <div v-for="(unit, i) in cd.units" :key="unit" class="digits-item">
            <div class="large-number" :class="{ seconds: i === 3 }">{{ digits[i] }}</div>
            <div class="large-number unit">{{ unit }}</div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
/* Reference metrics at 1440 px; 1u = 13.33 px. */
.ot-countdown {
  --gap: calc(var(--u) * 1.25);
  position: relative;
  color: #f4f4ed;
}

.c {
  padding: 0 var(--gap) calc(var(--u) * 26);
}

.spacer.h10 {
  height: calc(var(--u) * 10);
}

.inner {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.eyebrow-layout {
  position: relative;
  z-index: 5;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--gap);
}

.circuit-rive {
  position: relative;
  display: flex;
  width: calc(var(--u) * 5.5);
  height: calc(var(--u) * 4.7);
  margin-inline: auto;
}

.eyebrow-w {
  display: flex;
  gap: calc(var(--gap) * 0.5);
  color: #b9bbad;
}

.eyebrow {
  letter-spacing: 0; /* global .eyebrow adds 0.08em; reference .text-eyebrow is 0 */
  font-family: var(--font-mona);
  font-size: calc(var(--u) * 0.625);
  font-variation-settings: "wdth" 100, "wght" 700;
  line-height: 1;
  text-transform: uppercase;
}

.eyebrow :deep(.line) {
  margin-inline: 0;
}

.digits-w {
  position: relative;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  gap: var(--gap);
  width: 100%;
  margin-top: calc(var(--u) * 4);
}

.phrase-rive-w {
  position: absolute;
  inset: 0;
  z-index: 5;
  display: flex;
  justify-content: center;
  align-items: center;
}

.phrase-rive {
  position: relative;
  flex: none;
  width: calc(var(--u) * 57);
  height: calc(var(--u) * 35.125);
  pointer-events: none;
}

.digits-item {
  display: flex;
  color: #dde1d2;
}

.large-number {
  font-family: var(--font-mona);
  font-size: calc(var(--u) * 17.5);
  font-variation-settings: "wght" 700, "wdth" 75;
  line-height: 0.8;
  letter-spacing: calc(var(--u) * -0.1);
  text-transform: uppercase;
}

.large-number.unit {
  color: #535450;
}

.large-number.seconds {
  width: calc(var(--u) * 16);
}
/* Reference ≤479 (live at 375 px; 1u = the phone rem): digits wrap to two rows. */
@media (max-width: 767px) {
  .c {
    padding-bottom: calc(var(--u) * 10);
  }

  .eyebrow {
    font-size: calc(var(--u) * 0.8);
  }

  .digits-w {
    flex-wrap: wrap;
  }

  .large-number {
    font-size: calc(var(--u) * 10);
  }

  .large-number.seconds {
    width: calc(var(--u) * 9.1);
  }

  .phrase-rive {
    width: calc(var(--u) * 28);
    height: auto;
    aspect-ratio: 57 / 35.125;
  }
}
</style>
