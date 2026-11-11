# Content inventory: Lando placeholders → Prime One

Every user-facing Lando string or image and what replaced it. **Budget** is the length or line count of the original copy. The layouts are tuned to it, so keep new copy within about ±15% and keep the same `<br>` count. **Check** = needs owner sign-off (see [facts-to-confirm.md](facts-to-confirm.md)).

Sources: **P** = owner's pasted business info, **W** = primeonenyc.com, **R** = regulator rules, **I** = what the photo shows, **D** = drafted copy.

## Page audiences

| Page | Audience | One action |
| --- | --- | --- |
| `/` | Everyone in Woodside/Queens who needs an errand done | Call (917) 745-0549 |
| `/tax-consultant` | Friends & Family Tax clients: families, self-employed, small business | Call the tax desk |
| `/nyc-insurance` | Drivers (personal + TLC), home owners, businesses | See key dates & forms |
| `/calendar` | Returning clients | Download a form / note a deadline |

## Global (nav, footer, meta)

| Where | Was | Now | Budget | Src | Check |
| --- | --- | --- | --- | --- | --- |
| `nuxt.config.ts` title | Lando Norris \| McLaren Formula 1 Driver | Insurance, TLC, DMV & Tax in Woodside, Queens \| Prime One (`titleTemplate`) | – | P | |
| `nuxt.config.ts` description | Official hub for… Lando | Insurance, TLC, DMV… 69-03 Woodside Ave… Call (917) 745-0549 | ≤160 | P | |
| `nuxt.config.ts` JSON-LD | – | 4 businesses at one address (InsuranceAgency ×2, AccountingService, TravelAgency) | – | P | ✔ emails |
| `home.json nav.store` | Store → store.landonorris.com | Call us → `tel:+19177450549` | 5→7 ch | P | |
| `home.json nav.tagline` | mclaren f1 since 2019 | 69-03 woodside ave, ny | 21 ch | P | |
| `home.json nav.business` / `footer.business` | mailto business@landonorris.com | mailto primeoneinsurance@gmail.com | – | P | ✔ |
| `home.json nav.socials`, `socials.links` | tiktok/instagram/youtube/twitch (Lando) | facebook / instagram / tiktok / google | 4 links | P | ✔ personal vs business |
| `home.json footer.copyright` | © 2026 Lando Norris. | © 2026 Prime One. | – | P | |
| `home.json footer.taglineHtml` | Always bringing the fight. | Protection meets perfection. | 26→28 ch | P (slogan) | |
| `SiteFooter.vue LOGOS` | 15 Lando partner logos | 8 Prime One wordmarks (`images/brands/*-lime.svg`) | – | P | |
| `NavMenu.vue IMAGES` | 4 Lando photos | office booth, Delowar in kurta, duo in sunglasses, family autumn | 736×900 | I | |

## Home `/`

| Section | Was | Now | Budget | Src | Check |
| --- | --- | --- | --- | --- | --- |
| Hero card `hero.nextRace` | Next Race / Sāo Paulo gp / mclaren f1 since 2019 | Next deadline / Tax Day apr 15 / 69-03 woodside ave, queens | fits 99 px card (measured) | R | |
| Impact `impact` | Redefining limits… legacy in Formula 1 | Protecting drivers, filing for families… Building trust on Woodside Ave… | 152→158 ch | D | |
| Track quote 1 | “It doesn’t matter where you start…” (Lando) | “Bring me the paperwork that worries you. Making it simple is my job.” | 75→71 ch | D | ✔ Delowar's words? |
| Track quote 2 | “Since I was 7 years old…” (Lando) | “For nearly two decades I’ve sat across this desk…” | 120→126 ch | W | ✔ “two decades” |
| Track captions/alts (10) | Qatar, 2024 … Lando alts | Real clients, DMV Express, PrimeOne TLC, Life & home, Meet us, Tax season, In the community, Always learning, One office, Auto claims | ≤16 ch | I | |
| On/Off `onOffTrack.on/off` | results, career stats… / Campaigns, shoots… | Personal and business returns, IRS letters and new LLCs. / Auto, TLC, home and life cover from your local agent. | ~60 ch, 3 lines | P | |
| On/Off images | hp-lando-helmet / hp-lando-head | `misc/kamrun-portrait.webp` / `misc/delowar-portrait.webp` (renamed, already Prime One) | – | I | |
| Feature image alt | Lando lifting helmet up | “there are real people behind that button” (now `featureImageAlt`) | – | I | |
| Hall of Fame → Services | Helmets / Hall of Fame / “From his iconic blobs…” | Services / Under one roof / “Sixteen services, one front desk…” | 138→140 ch | P | |
| 16 grid items | Season 2025, Discoball 2025… | Insurance INS … Immigration Forms IMMIG (`images/services/*`) | name ≤20, code ≤7 | P | |
| Partners | partners & campaigns, 11 brand logos | one address & seven desks, 8 Prime One wordmarks | 120→132 ch | P | |
| Store block | LANDO STORE / Champion | removed (section was not rendered) | – | – | |
| Socials images | 7 (Prime One photos, Lando filenames) | same photos, renamed `social/primeone-*.webp` | – | I | |

## Tax Consultant `/tax-consultant` (`content/on-track.json`)

| Section | Was | Now | Budget | Src | Check |
| --- | --- | --- | --- | --- | --- |
| Hero meta | last lap lando / 25 y. expert / Queens, US | friends & family tax / B.B.A. accounting / Woodside, NY | short | P (poster) | ✔ degree |
| Hero intro | Since his F1 debut… fight to every race | Kamrun Bithi’s Friends & Family Tax desk files… same care to every file | 116+19 → 112+23 ch | P | |
| Hero widgets | previous Mexico gp 5th / current RND 20 USA 06-08 Nov | last deadline Extension day 15 oct / Next RND 27 NYC 15 Apr | – | R | “RND.” label is hard-coded |
| Impact | Challenging the limits, winning races… | Checking every credit, filing on time… | ±0 | D | |
| Track quote | Lando quote over Kamrun signature | “Every credit you’re owed, explained in the language you think in.” | 75→70 ch | D | ✔ Kamrun's words? |
| Pre-F1 → Forms | pre-f1 career 2007-2019, 8 junior titles | forms we know by heart; 1040, 1120-S, 1065, Sch C, W-7, 941, N-400, CP2000 | 5 `<br>` kept | R | ✔ N-400 (see GBL 28-C) |
| Pre-F1 images | Lando champagne/celebrating | `social/primeone-selfie-duo`, `social/primeone-duo-sunglasses` | 5:6 | I | |
| End image | otot-end (Lando with helmet) | `misc/footer-helm.webp` (Delowar, coast) | 1.2:1 | I | |
| Socials | Follow Lando… + 7 Lando photos | Follow Prime One… + 7 Prime One photos; F&F Tax Facebook + Google | – | P | |
| Callout | 1:2 and 1:5 scale replicas / buy minis | Got an IRS letter? Bring it in… / call the tax desk | 63→58 ch | D | |

## NYC Insurance `/nyc-insurance` (`content/off-track.json` + `on-track.json podiums`)

| Section | Was | Now | Budget | Src | Check |
| --- | --- | --- | --- | --- | --- |
| Hero name/age | Lando Norris / 26 y.o | Delowar Hossain / local agent | – | P | |
| Hero intro | Since his F1 debut… fight to every race | From yellow cabs to the family car… right cover to every road | 120+19 → 117+25 ch | P | |
| Hero sub | …stay at Hilton hotels. | Auto, home, life and business cover, plus PrimeOne TLC… | 104→117 ch | P | |
| Hero logos | Ralph Lauren, Mind, PS4, Quadrant, Tumi, Hilton | 6 Prime One wordmarks | – | P | |
| Impact | Challenging the limits… | Covering the cabs, protecting homes… | ±0 | D | |
| Podiums count | 49 podiums + 10 Lando photos | 16 services + 10 Prime One photos | 2 digits | P | |
| Career stats | 13 wins / 19 poles / 6.28 avg / 18 fastest laps | 16 services / 7 businesses / 8.875 NYC sales tax % / 3 languages | digits | P, R | ✔ “3 languages” |
| Seasons table | F1 seasons 2019-2024 | TLC minimums: BI 100k person, BI 300k crash, PIP 200k person | 3 rows | P, R | ✔ verify with TLC |
| Career image | Lando in F1 car | `social/primeone-delowar-vest.webp` | 5:6 | I | |
| CTA | full schedule & results | all key dates & forms → /calendar | – | – | |

## Left as is (not Lando, or design-bound)

- **Rive "reef helmet" animations** in the hero card, Impact, nav menu and callout: these are design assets. Swap them in the Rive files if you want.
- **Hero next-race circuit** (Rive `circuits`, `sao-paulo` input): it's an abstract line drawing.
- **`SignatureDraw`** on the NYC Insurance hero draws Kamrun's signature next to Delowar's intro. Swap it for his if you prefer.
- **Internal class names and JSON keys** (`helmet-*`, `landoAt`, `f1-*`) aren't visible to visitors.
- **`public/images/on-track/highlights/hover-*`** and **`misc/lando-norris-text-mobile.svg`** were already unreferenced before this change.

## Photo shot list (still needed)

1. A storefront of 69-03 Woodside Ave by day, with the sign readable. For the nav and the end image.
2. Delowar at his desk with a client, as a candid shot.
3. Kamrun at the tax desk during filing season.
4. A wide shot of the front desk showing all 7 brand signs. For the partners section.
5. Real logo files for PrimeOne TLC, Friends & Family Tax and PrimeOne Travels, to replace the generated wordmarks.
