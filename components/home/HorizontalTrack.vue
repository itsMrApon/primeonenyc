<script setup lang="ts">
const content = useHomeContent();

type Slot =
  | { type: "photo"; item: (typeof content.horizontal.items)[number] }
  | { type: "quote"; text: string; signatureSrc?: string };

const slots = computed<Slot[]>(() => {
  const out: Slot[] = [];
  content.horizontal.items.forEach((item, i) => {
    out.push({ type: "photo", item });
    const quote = content.horizontal.quotes.find((q) => q.after === i + 1);
    if (quote) {
      out.push({
        type: "quote",
        text: quote.text,
        signatureSrc: quote.signatureSrc
      });
    }
  });
  return out;
});
</script>

<template>
  <section class="horizontal-section" data-horizontal-pin>
    <div class="horizontal-pin">
      <div class="horizontal-track" data-horizontal-track>
        <article
          v-for="(slot, i) in slots"
          :key="i"
          class="horizontal-item"
          :class="slot.type === 'quote' ? 'is-quote' : 'is-photo'"
        >
          <template v-if="slot.type === 'photo'">
            <p class="eyebrow">{{ slot.item.caption }}</p>
            <div class="horizontal-item__media">
              <img :src="slot.item.src" :alt="slot.item.alt" loading="lazy" />
            </div>
          </template>
          <template v-else>
            <p class="horizontal-item__quote text-impact">{{ slot.text }}</p>
            <img
              v-if="slot.signatureSrc"
              class="horizontal-item__sig"
              :src="slot.signatureSrc"
              alt=""
              loading="lazy"
            />
          </template>
        </article>
      </div>
    </div>
  </section>
</template>

<style scoped>
.horizontal-section {
  background: var(--color-dark-green);
  color: var(--color-white);
}

.horizontal-pin {
  height: 100svh;
  overflow: hidden;
  display: flex;
  align-items: center;
}

.horizontal-track {
  display: flex;
  align-items: stretch;
  gap: clamp(1.25rem, 3vw, 2.5rem);
  padding-inline: var(--pad-x);
  will-change: transform;
  width: max-content;
}

.horizontal-item {
  flex: 0 0 auto;
  width: min(72vw, 520px);
  display: grid;
  gap: 0.85rem;
  align-content: start;
}

.horizontal-item.is-quote {
  width: min(70vw, 480px);
  align-content: center;
  padding-inline: 1rem;
}

.horizontal-item__media {
  aspect-ratio: 4 / 5;
  overflow: hidden;
  background: var(--color-dark-green-tint-1);
}

.horizontal-item__media img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.horizontal-item__quote {
  font-size: clamp(1.6rem, 3.5vw, 2.6rem);
  font-weight: 550;
  max-width: 16ch;
}

.horizontal-item__sig {
  width: min(160px, 40%);
  height: auto;
  margin-top: 1rem;
}
</style>
