<script setup lang="ts">
/**
 * Footer (reference `.s.is-footer`, 967 px at 1440): off-white section with a
 * lime radial glow, a dark-green panel cut to the LN4 footer mask holding the
 * contour pattern, signature Rive, "Always bringing the fight.", the 360
 * helmet portrait, page / social link columns, the partner-logo marquee and
 * the business CTA; legal row sits in the mask's bottom notches.
 * Metrics are the live layout in fluid units (1u = 13.33 px there).
 */
const content = useHomeContent();
const f = computed(() => content.footer);
const ctaHover = ref(false);

/** Marquee logos in reference order; widths in px at 1440 (height 35). */
const LOGOS = [
  { src: "logo-inline-1.svg", w: 80.8 },
  { src: "logo-inline-2.svg", w: 65 },
  { src: "logo-inline-3.svg", w: 26.7 },
  { src: "logo-inline-4.svg", w: 78.3 },
  { src: "logo-inline-5.svg", w: 66.7 },
  { src: "logo-inline-6.svg", w: 65 },
  { src: "logo-inline-7.svg", w: 55.8 },
  { src: "ln4-footer-logo-add-c.svg", w: 67.5 },
  { src: "logo-inline-8.svg", w: 34.2 },
  { src: "ln4-footer-logo-google.svg", w: 116.7 },
  { src: "ln4-footer-logo-ralph-lauren.svg", w: 140.8 },
  { src: "ln4-footer-logo-android.svg", w: 105 },
  { src: "ln4-footer-logo-pap.svg", w: 92.5 },
  { src: "ln4-footer-logo-monster.svg", w: 134.2 },
  { src: "ln4-footer-logo-hilton.svg", w: 105 }
];
const PX = 1440 / 108;
</script>

<template>
  <section class="footer" data-nav-theme-target="dark">
    <div class="footer-glow" aria-hidden="true" />
    <div class="footer-c">
      <div class="footer-panel" data-nav-theme-target="light">
        <img class="footer-pattern" src="/images/footer/blobs_footer_1.svg" alt="" aria-hidden="true" />

        <Marquee class="footer-marquee" :speed="30" direction="left" :duplicate="3" :scroll-shift="5">
          <div v-for="logo in LOGOS" :key="logo.src" class="footer-logo" :style="{ width: `calc(var(--u) * ${(logo.w / PX).toFixed(4)})` }">
            <img :src="`/images/footer/${logo.src}`" alt="" />
          </div>
        </Marquee>

        <div class="footer-helmet">
          <img :src="f.bg" alt="" />
        </div>

        <div class="footer-signature">
          <RiveCanvas file="signature" artboard="signature" state-machine="signature_play" :inputs="{ color_lime: true }" play-on-view />
        </div>

        <HighLines tag="h2" class="footer-title" :html="f.taglineHtml.replace(/<span[^>]*>([^<]*)<\/span>/g, '<strong>$1</strong>')" color="lime-off" />

        <div class="footer-links">
          <div class="footer-col">
            <div class="footer-eyebrow">pages</div>
            <div class="footer-col-links">
              <a v-for="link in content.nav.links" :key="link.href" class="footer-link" :href="link.href">
                <HighLines :html="link.label" />
              </a>
            </div>
            <a class="footer-store" :href="content.nav.store.href" target="_blank" rel="noopener">
              <HighLines :html="content.nav.store.label" color="dark-green-tint-1" />
            </a>
          </div>
          <div class="footer-col">
            <div class="footer-eyebrow">Follow On</div>
            <div class="footer-col-links">
              <a v-for="link in content.socials.links" :key="link.href" class="footer-link" :href="link.href" target="_blank" rel="noopener">
                <HighLines :html="link.label" />
              </a>
            </div>
          </div>
        </div>

        <a
          class="footer-cta"
          :href="f.business.href"
          @pointerenter="ctaHover = true"
          @pointerleave="ctaHover = false"
        >
          <span class="footer-cta-text">{{ f.business.label }}</span>
          <span class="footer-cta-icon">
            <RiveCanvas file="btn-ui" artboard="arrow" state-machine="arrow" :inputs="{ hover: ctaHover }" />
          </span>
        </a>
      </div>

      <div class="footer-legal">
        <div class="footer-legal-col">
          <span class="footer-copy"><b>{{ f.copyright.bold }}</b> {{ f.copyright.rest }}</span>
        </div>
        <div class="footer-legal-col">
          <a v-for="link in f.legal" :key="link.href" class="footer-legal-link" :href="link.href" target="_blank">{{ link.label }}</a>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.footer {
  --u: calc(clamp(992px, 100vw, 1920px) / 1728 * 16);
  position: relative;
  padding-top: calc(var(--u) * 14);
  background: #f4f4ed;
  color: #282c20;
}

.footer-glow {
  position: absolute;
  inset: 0;
  background-image: radial-gradient(circle at 50% -190%, rgba(210, 255, 0, 0) 68%, #d2ff00 83%);
  pointer-events: none;
}

.footer-c {
  position: relative;
  z-index: 5;
  padding: calc(var(--u) * 1.25);
}

.footer-panel {
  position: relative;
  isolation: isolate;
  height: calc(var(--u) * 56);
  overflow: hidden;
  background: #282c20;
  color: #f4f4ed;
  mask-image: url("/images/footer/ln4-footer-mask-desktop.svg");
  mask-size: cover;
  mask-position: 50% 50%;
  mask-repeat: no-repeat;
  -webkit-mask-image: url("/images/footer/ln4-footer-mask-desktop.svg");
  -webkit-mask-size: cover;
  -webkit-mask-position: 50% 50%;
  -webkit-mask-repeat: no-repeat;
}

.footer-pattern {
  position: absolute;
  inset: 0;
  z-index: -1;
  width: 100%;
  max-width: none;
  height: 100%;
  object-fit: cover;
  opacity: 0.12;
}

.footer-marquee {
  position: absolute;
  top: calc(var(--u) * 49.62);
  left: 0;
  right: 0;
  z-index: -1;
  height: calc(var(--u) * 2.625);
}

.footer-logo {
  display: flex;
  align-items: center;
  justify-content: center;
  height: calc(var(--u) * 2.625);
  margin-right: calc(var(--u) * 2.5);
}

.footer-logo img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.footer-helmet {
  position: absolute;
  top: calc(var(--u) * 19.125);
  left: 50%;
  width: calc(var(--u) * 48.75);
  height: calc(var(--u) * 39.88);
  transform: translateX(-50%);
}

.footer-helmet img {
  display: block;
  width: 100%;
  max-width: none;
  height: 100%;
}

.footer-signature {
  position: absolute;
  top: calc(var(--u) * 5.2);
  left: calc(var(--u) * 46.215);
  z-index: 5;
  width: calc(var(--u) * 13.065);
  height: calc(var(--u) * 8.5);
}

.footer-title {
  position: absolute;
  top: calc(var(--u) * 12);
  left: 50%;
  width: calc(var(--u) * 48);
  margin: 0;
  transform: translateX(-50%);
  font-family: var(--font-mona);
  font-size: calc(var(--u) * 5.25);
  font-variation-settings: "wdth" 93, "wght" 660;
  line-height: 0.856;
  letter-spacing: -0.0625px;
  text-align: center;
  text-transform: uppercase;
}

.footer-title :deep(strong) {
  font-family: "Brier", serif;
  font-size: calc(var(--u) * 5.4375);
  font-weight: 700;
  line-height: 0.856;
  letter-spacing: calc(var(--u) * -0.125);
  color: #b2c73a;
}

.footer-links {
  position: absolute;
  top: calc(var(--u) * 28.875);
  left: 0;
  right: 0;
  display: flex;
  justify-content: space-between;
  padding: 0 calc(var(--u) * 12.8);
}

.footer-col {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.footer-eyebrow {
  color: #b4b8a5;
  font-family: var(--font-mona);
  font-size: calc(var(--u) * 0.625);
  font-variation-settings: "wdth" 100, "wght" 700;
  line-height: 1;
  text-transform: uppercase;
}

.footer-col-links {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: calc(var(--u) * 0.25);
  margin-top: var(--u);
}

.footer-link,
.footer-store {
  font-family: var(--font-mona);
  font-weight: 800;
  font-variation-settings: "wdth" 86;
  line-height: 1;
  text-transform: uppercase;
}

.footer-link {
  font-size: calc(var(--u) * 1.875);
}

.footer-store {
  margin-top: calc(var(--u) * 2);
  font-size: calc(var(--u) * 1.25);
  color: #d2ff00;
}

.footer-cta {
  position: absolute;
  top: calc(var(--u) * 51.25);
  left: 50%;
  z-index: 6;
  display: inline-flex;
  align-items: center;
  gap: calc(var(--u) * 0.84);
  height: calc(var(--u) * 3);
  padding: 0 var(--u);
  transform: translateX(-50%);
  border-radius: calc(var(--u) * 0.54);
  background: #d2ff00;
  color: #282c20;
}

.footer-cta-text {
  font-family: var(--font-mona);
  font-size: var(--u);
  font-weight: 800;
  font-variation-settings: "wdth" 86;
  line-height: 1;
  text-transform: uppercase;
  white-space: nowrap;
}

.footer-cta-icon {
  display: block;
  width: calc(var(--u) * 0.78);
  height: calc(var(--u) * 0.78);
}

.footer-legal {
  position: absolute;
  left: calc(var(--u) * 1.25);
  right: calc(var(--u) * 1.25);
  bottom: calc(var(--u) * 1.25);
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
}

.footer-legal-col {
  display: flex;
  gap: calc(var(--u) * 1.25);
}

.footer-copy {
  font-family: var(--font-mona);
  font-size: calc(var(--u) * 0.75);
  font-weight: 600;
  line-height: 1.25;
}

.footer-copy b {
  font-weight: 800;
}

.footer-legal-link {
  font-family: var(--font-mona);
  font-size: var(--u);
  font-weight: 800;
  font-variation-settings: "wdth" 86;
  line-height: 1;
  text-transform: uppercase;
}

.footer-links :deep(.line) {
  margin-inline: auto;
}
</style>
