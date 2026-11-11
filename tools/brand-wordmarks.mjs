// Generates the Prime One brand wordmarks used by the partners strip, the NYC Insurance hero
// marquee and the footer marquee: public/images/brands/<slug>.svg (dark) and <slug>-lime.svg.
// Two-line marks (small label over a heavy word). textLength pins each line to a fixed width,
// so the mark keeps its size whichever system font renders it.
// Run: node tools/brand-wordmarks.mjs
import { mkdirSync, writeFileSync } from "node:fs";

export const BRANDS = [
  { slug: "dh-agency", top: "DELOWAR HOSSAIN", bottom: "AGENCY" },
  { slug: "primeone-tlc", top: "PRIMEONE", bottom: "TLC" },
  { slug: "primeone-tlc-express", top: "PRIMEONE TLC", bottom: "EXPRESS" },
  { slug: "dh-dmv", top: "DELOWAR HOSSAIN", bottom: "DMV" },
  { slug: "ff-tax", top: "FRIENDS & FAMILY", bottom: "TAX" },
  { slug: "primeone-travels", top: "PRIMEONE", bottom: "TRAVELS" },
  { slug: "dh-institution", top: "DELOWAR HOSSAIN", bottom: "INSTITUTION" },
  { slug: "dh-notary", top: "DH AGENCY", bottom: "NOTARY" }
];

const COLORS = { "": "#111112", "-lime": "#d2ff00" };
const FONT = "'Arial Black', 'Helvetica Neue', Arial, sans-serif";
const H = 50;
const MIN_W = 170;
// Average advance per uppercase glyph (em) for a heavy sans; only sets proportions.
const topW = (s) => s.length * 14 * 0.66;
const bottomW = (s) => s.length * 32 * 0.74;

const esc = (s) => s.replaceAll("&", "&amp;");
const out = new URL("../public/images/brands/", import.meta.url);
mkdirSync(out, { recursive: true });

for (const b of BRANDS) {
  const wb = Math.round(bottomW(b.bottom));
  const wt = Math.round(topW(b.top));
  // Pad short marks to a common box so the fixed-width marquee cells show them at one height.
  const w = Math.max(wt, wb, MIN_W);
  const x = Math.round((w - Math.max(wt, wb)) / 2);
  for (const [suffix, fill] of Object.entries(COLORS)) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${H}" viewBox="0 0 ${w} ${H}" role="img" aria-label="${esc(b.top)} ${b.bottom}">
  <g fill="${fill}" font-family="${FONT}" font-weight="900">
    <text x="${x}" y="13" font-size="13" letter-spacing="1" textLength="${wt}" lengthAdjust="spacing">${esc(b.top)}</text>
    <text x="${x}" y="47" font-size="34" textLength="${wb}" lengthAdjust="spacingAndGlyphs">${b.bottom}</text>
  </g>
</svg>
`;
    writeFileSync(new URL(`${b.slug}${suffix}.svg`, out), svg);
  }
  console.log(b.slug, `${w}x${H}`);
}
