<script setup lang="ts">
/**
 * Reference calendar [data-cal-target] wrapper (bundle j$): the value sits above a lime
 * bar inside a clipped box. Calendar.vue animates every `.cal-target-wrapper` /
 * `.cal-target-reveal` pair in DOM order (reveal on scroll, close + reopen on track change).
 */
withDefaults(defineProps<{ tag?: string }>(), { tag: "div" });
</script>

<template>
  <component :is="tag" class="cal-target-wrapper">
    <slot />
    <span class="cal-target-reveal" />
  </component>
</template>

<style scoped>
.cal-target-wrapper {
  position: relative;
  overflow: hidden;
}

.cal-target-wrapper > :deep(:first-child) {
  position: relative;
  z-index: 10;
}

.cal-target-reveal {
  position: absolute;
  inset: 0;
  z-index: 15;
  background-color: var(--color-lime);
  transform-origin: right center;
}
</style>
