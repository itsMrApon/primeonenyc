# Lando Norris homepage — editable copy map

Source of truth for rebuild overlays. Machine-readable twin: `content/home.json`.

Layout reference: the boilerplate clone (`~/Dev/web/crawl/boilerplate_agency`, `boilerplate` config on port 3002).

## Brand

| Token | Value |
| --- | --- |
| Lime | `#d2ff00` |
| Dark green | `#282c20` |
| White | `#f4f4ed` |
| Black | `#111112` |
| Fonts | Mona Sans Variable, Brier Bold |

## Nav

- Logo → `/`
- Store CTA → `https://store.landonorris.com/`
- Links: Home `/`, On Track `/on-track`, Off Track `/off-track`, Calendar `/calendar`
- Business → `mailto:business@landonorris.com`
- Socials: TikTok, Instagram, YouTube, Twitch

## Hero

- Eyebrow: `2025 McLaren Formula 1 Driver`
- Title feel: **LANDO NORRIS** (WebGL head/helmet on lime)
- Next Race card: `Next Race` / `Sāo Paulo` / `gp` → `/calendar` (circuit Rive input `sao-paulo`; the macron typo is on the live site)

## Impact

- Eyebrow: `mclaren f1 since 2019`
- Quote: **Redefining** limits, fighting for **wins**, bringing it all in all ways. Defining a **legacy** in Formula 1 on and off the track.

## Horizontal track (10)

| # | Caption | Image |
| --- | --- | --- |
| 1 | Qatar, 2024 | `/images/horiz/01.webp` |
| 2 | FIA Prize Giving, 2024 | `/images/horiz/02.webp` |
| 3 | Miami GP, 2024 | `/images/horiz/03.webp` |
| 4 | Monaco, 2023 | `/images/horiz/04.webp` |
| 5 | Britain, 2025 | `/images/horiz/05.webp` |
| 6 | Battersea, 2024 | `/images/horiz/06.webp` |
| 7 | High Performance Gala, 2024 | `/images/horiz/07.webp` |
| 8 | Barcelona, 2024 | `/images/horiz/08.webp` |
| 9 | austria, 2020 | `/images/horiz/09.webp` |
| 10 | US, 2024 | `/images/horiz/10.webp` |

Quotes in track:

- “It doesn’t matter where you start, it’s how you progress from there.”
- “Since I was 7 years old and had my first experience with kart racing, I’ve worked tirelessly to make that dream come true.”

## On / Off Track

- **ON TRACK** — Most recent results, career stats and photos from trackside. → `/on-track`
- **OFF TRACK** — Campaigns, shoots and other such promotional materials for fans. → `/off-track`

## Helmets Hall of Fame

- Title: Helmets / Hall of Fame
- Body: From his iconic blobs to innovative one-off designs, Lando has always been passionate about designing innovative and memorable helmets.
- Grid: see `home.json` → `helmets`

## Store / Champion

- Eyebrow: `LANDO STORE`
- Headline: World Drivers' **Champion**
- Body: Celebrate this incredible moment with a collection designed for the fans who never stopped believing. Wear it, frame it, treasure it forever.
- CTA: Visit the store → `https://landonorris.store/`

## Partners

- Title: partners & campaigns
- Body: Lando is proud to collaborate with a range of partners, who share his passion for performance across a range of industries.
- CTA: view partnerships → `/partnerships` (live 404 — linked as original)

## Socials

- Title: what’s up / On Socials
- Follow Lando on social media
- Links: TikTok, Instagram, YouTube, Twitch

## Footer

- Tagline: Always **bringing** the **fight**.
- Business enquiries → `mailto:business@landonorris.com`
- Legal: Privacy Policy, Terms & Conditions

## Approximated vs pixel-perfect

| Area | Status |
| --- | --- |
| Brand colors, Mona/Brier, lime hero, dark body | Close |
| Horizontal ScrollTrigger pin + scrub | Behavioral match |
| Helmet GLB + lime studio lighting + mouse parallax | Approximated (no custom OFF+BRAND shaders) |
| Rive circuits / helmet morphs / page transitions | Not ported (static placeholders) |
| MSDF text / fluid cursor / track carousel WebGL | Not ported |
