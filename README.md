# Manas Thakur — portfolio

Personal site for **Manas Kumar Thakur**, AI Engineer — *"I build AI systems that can think through a task, use tools, and finish the job."*

**Live:** [tensorman.me](https://www.tensorman.me) (also [menace-new.vercel.app](https://menace-new.vercel.app)) — deployed on Vercel from this repo's `main` branch.

Designed as a festival programme in the spirit of [Rendezvous '26](https://rendezvous-iitd.org/) (IIT Delhi's "riot of fusions"): full-screen **drawers** that pin and stack as you scroll, each in its own colour world, dressed in Indian print ephemera — vinyl, stamps, tickets, newsprint, railway boards. The fusion here is personal: **Delhi × Daegu × Palo Alto**. Every illustration is original, hand-built SVG/CSS/canvas; no reference assets are reused.

The cover is the site's own: **मानसरोवर, the lake of the mind.** *Manas* is Sanskrit for the mind, and Mānasarovar, under Mount Kailash, is the lake the mind made. The name stands on its water at first light, and the lake answers in the name's own script. The water ripples while the visitor moves. Be still, and it stills too: the reflection turns into मानस ठाकुर and Patañjali's line rises through it — *yogaś citta-vṛtti-nirodhaḥ*, the stilling of the ripples of the mind.

## Run it

```bash
npm install
npm run dev        # http://127.0.0.1:5173
npm run build      # static site in dist/
npm run preview    # serve the production build
npm run typecheck
```

Pushing to `main` redeploys the live site on Vercel (framework preset: Vite, build `npm run build`, output `dist`). `dist/` also works on any other static host; for a GitHub Pages *project* page served from a sub-path, set `base: '/<repo>/'` in `vite.config.ts`.

## Edit the content

All facts live in **`src/data/profile.ts`** — roles, projects, press clippings, numbers, stack, links. Sections read from it, so updating a job or adding a project is a data change, not a design change.

- **Portrait:** put a photo in `public/` (e.g. `public/portrait.jpg`) and set `portrait = '/portrait.jpg'` in `profile.ts`; it appears inside the commemorative stamp in a gold-and-maroon duotone. Left empty, the stamp shows an illustrated MT monogram (and no request is made for a missing file).
- **Résumé:** the nav links to the live PDF at `manas-thakur.github.io/Resume`, so it stays current when the résumé repo updates.
- **Photos (Darkroom):** the 36 photographs (a full 36-exposure roll) come from [@menace_thakur](https://www.instagram.com/menace_thakur/). To change the selection, put the originals in a folder, edit the list at the top of `scripts/photos.mjs` (slug, file, alt text, caption, place), and run `node scripts/photos.mjs <folder>`. It writes three WebP sizes per photo to `public/photos/` and regenerates `src/data/photos.ts`, including each frame's colour palette, hue and saturation for the colour wheel (measured in OKLab; an optional hue range lets you say which colour tells a frame's story, e.g. red flowers on green leaves). Captions are Manas's own words from the posts; dates are decoded from the post IDs.
- **Social card:** `public/og.jpg` (1200×630). `.env.production` sets `VITE_SITE_URL=https://www.tensorman.me` so LinkedIn and X get an absolute image URL; change it there if the site moves to another domain.

## The drawers

| # | Drawer | Idea | Signature motion |
|---|---|---|---|
| 0 | Cover — *Side A* | मानसरोवर, the lake of the mind: a page from an album — Kailash at dawn, the name on the water, a hamsa, lotus lanterns | Night turns to first light, a drop wakes the lake, the name rises out of it with its reflection; the water ripples under the visitor's hand and goes to glass when they keep still |
| — | Nav | Black slab; the cover's margin carries a second set of contents | Active section tracks scroll; circular-reveal menu on phones |
| 1 | About | Laptop-lid sticker wall + "Think. Use tools. Finish the job." | Stickers slap on; draggable |
| 2 | Press — *The Kulhad Times* | Newspaper clippings of wins and milestones | Clippings pop in, tape sticks; chai pours into a kulhad |
| 3 | Work — *On Tour* | Gig-poster wall + band-tee tour dates | Poster columns drift; rows expand |
| 4 | Projects — *Tune in* | A vintage radio; each project is a station | Drag the tuning knob (or use arrows) to lock a station |
| 5 | Numbers — *Departures* | Indian-railway split-flap board + live IST station clock | Flaps cascade into real figures |
| 6 | Community | Commemorative postage stamp + the stack + a Delhi auto-rickshaw | The postmark thunks onto the stamp |
| 7 | Photos — *Darkroom* | A 36-exposure roll of Manas's photographs, three ways: on the line, as a contact sheet under a loupe, and on a colour wheel | Prints fly between views; negatives turn positive under the loupe; brushing the line makes prints swing |
| 8 | Contact — *Side B* | Greeting in नमस्ते / 안녕하세요 / Hello, live clocks | Record spins; greeting flips |

## Deep cuts

*Side A is what I show. Side B is what I mean.* Nine messages are pressed into the record, each bound to an object already in the design and revealed by looking closely (hover and rest, focus, or tap — or, on the cover, by being still):

| # | Cut | Where | What it says |
|---|---|---|---|
| 01 | मानस | the lake on the cover — keep still | Patañjali, Yoga Sūtra 1.2, योगश्चित्तवृत्तिनिरोधः; the reflection turns to मानस ठाकुर. Manas is Sanskrit for *the mind* — he builds the other kind |
| 02 | Milk from water | the swan crossing the lake | the hamsa that drinks the milk and leaves the water — *nīra-kṣīra viveka*, discernment |
| 03 | Slowly | the kulhad in The Kulhad Times | Kabir: धीरे धीरे रे मना… |
| 04 | The quiet frequency | the radio, at 108.0 (the end of the dial) | Bhagavad Gita 2.47 |
| 05 | One step | the station clock on the departures board | Korean proverb 천 리 길도 한 걸음부터 |
| 06 | With love | the back of the auto-rickshaw | देखो मगर प्यार से — truck-art's "look, but with love" |
| 07 | Becoming | the edge of the film, under the loupe | Manas's own caption |
| 08 | Dead wax | Side B's run-out groove | etched like a mastering engineer's signature |
| 09 | Hidden track | Side B's centre hole | Manas's own caption, as the closing words |

Every line lives in **`src/data/deep.ts`** — originals in their own script with a free translation, and a source. Rewrite them there. A visitor's finds are remembered in their own browser (`localStorage`, key `tensorman:deep-cuts`); the **Liner notes** (from the cover's panel, the footer, or the "deep cut found" notice) list what they've found and hint at the rest. Developers get one more in the browser console.

## Structure

```
src/
  data/profile.ts          every fact on the site
  styles/tokens.css        the locked design tokens (OKLCH colour, type, space, motion)
  styles/base.css          reset, focus ring, reduced motion, grain
  styles/textures.css      mandala / jaali / halftone / feather / grain layers
  lib/                     GSAP setup, Lenis smooth scroll, drawer-aware scroll helpers
  components/primitives/   Drawer, Marquee, TornEdge, Tape, Stamp, Sticker, SVG filters
  sections/<Name>/         one folder per drawer, each self-contained
  sections/Hero/           the cover: scene.ts paints sky and Kailash, lake.ts the water and its
                           reflection (canvas); Hero, Swan, Lotus are the HTML/SVG laid over it
public/textures/           generated by scripts/textures.mjs
```

## Development helpers

- `?only=<id>` renders one drawer in isolation (`about`, `press`, `work`, `projects`, `numbers`, `community`, `contact`, or `top` for the hero). `?only=kit` shows the primitives.
- `?nointro` skips the cover's first light.
- `node scripts/shot.mjs <url> <out.png> [--w 2560 --h 1249 --full --reduced --frames 6 --every 250 --early]` takes headless screenshots with the system Chrome.
- `node scripts/tour.mjs <url> <dir> [--w 1440 --h 900 --reduced]` walks the real stacked page and captures every drawer pinned and every hand-off.
- `node scripts/a11y.mjs [url]` runs an axe-core audit of the whole page and prints the heading outline.
- `node scripts/textures.mjs` regenerates the texture tiles.

## Motion & accessibility

- GSAP (ScrollTrigger, SplitText, Draggable, Inertia, CustomEase) + Lenis. One signature entrance per drawer; decorative loops pause when their drawer is off-screen or covered.
- The cover's water is a 2D canvas that mirrors the sky row by row; it draws at ~30 fps while it breathes, every frame only while stirred, and stops drawing entirely once it is still or off-screen. Device pixels are capped so 4K screens don't pay for it.
- `prefers-reduced-motion: reduce` turns off smooth scroll, entrances and loops; everything renders in its final state (the lake is a still mirror, the swan rests).
- Real text everywhere (no type baked into images), one `h1`, one `h2` per drawer, a visible double focus ring on every control, keyboard-operable radio dial and disclosures.

## Credits

Visual language studied from Rendezvous '26, IIT Delhi — used as inspiration only; the cover is original. Type: Cormorant Garamond, Tiro Devanagari Sanskrit, Pirata One, Barlow Condensed, Dela Gothic One, Rye, Newsreader, Share Tech Mono, Yatra One, Black Han Sans (Google Fonts). Verses on the cover: Patañjali's *Yoga Sūtra* 1.2 and an anonymous Sanskrit *subhāṣita*, both public domain.
