# Prime One

The website for Prime One, a small insurance and tax office in Queens, NYC.

I wanted it to feel more like a motion piece than a typical insurance site. You scroll past a little 3D umbrella diorama, photos slide sideways, and the text animates in as you go. Under all that it's still just a site that tells people what we do and how to book.

## What's in it

- **Home**: 3D hero (umbrella over a house and car), the horizontal photo strip, services and partners
- **Tax Consultant**: tax services, with a pile of papers and envelopes flying around in 3D
- **NYC Insurance**: auto, TLC, business and life insurance
- **Calendar**: the yearly schedule, plus services and forms pulled from the dashboard data

## Built with

- [Nuxt 3](https://nuxt.com) (client-side only, `ssr: false`)
- [Three.js](https://threejs.org) for the 3D bits
- [GSAP](https://gsap.com) + ScrollTrigger for scroll animation
- [Lenis](https://lenis.darkroom.engineering) for smooth scrolling
- [Rive](https://rive.app) for the logo, signature and button animations
- Blender (scripted) for the hero model

## Running it locally

You'll need Node 20 and pnpm.

```bash
pnpm install
pnpm dev
```

Then open http://localhost:3000.

Other commands:

```bash
pnpm build             # production build
pnpm generate          # static build
pnpm typecheck         # check types
pnpm export:services   # export services/forms to CSV + SQL for the dashboard
```

## Changing the content

Most of the copy is in `content/home.json`. Services, forms and calendar events are in `content/services.json`, so you don't have to dig through components for a typo.

Images are in `public/images/`, 3D models and textures in `public/gl/`, and Rive files in `public/rive/`.

## Where things are

| Folder | What's there |
| --- | --- |
| `pages/` | One file per page |
| `components/home/` | Homepage sections |
| `components/on-track/`, `components/calendar/` | Sections for the other pages |
| `webgl/` | Three.js renderer (`Experience.ts`) and the scenes |
| `composables/useHomeScroll.ts` | Scroll setup (Lenis + ScrollTrigger) |
| `tools/blender/build_hero_miniature.py` | Generates the hero diorama model |
| `assets/css/` | Brand colors, fonts, base styles |

### The hero model

The umbrella diorama is built by a Blender script, not modeled by hand. If you want to change it, edit `tools/blender/build_hero_miniature.py` and export it again. Don't edit the `.glb` directly or your changes will be lost the next time it's rebuilt.

## Notes

- The layout and scroll animations started from an earlier agency template I'd built. The content, 3D hero, logos and copy are all Prime One's own.
- Fonts are Mona Sans and Brier.

## Contact

Questions or want to work together? Reach out through the contact links on the site.
