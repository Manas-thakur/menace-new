// Builds the Darkroom photo set from Manas's Instagram originals.
//
//   node scripts/photos.mjs <folder-with-originals>
//
// Writes public/photos/<slug>-{xs,sm,lg}.webp and src/data/photos.ts.
// Captions are Manas's own words from the posts; places are only given where they
// are certain (a landmark in frame, a sign, or his caption); dates are decoded
// from the post shortcode.
import { mkdirSync, writeFileSync, existsSync, copyFileSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';

const SRC = process.argv[2];
if (!SRC || !existsSync(SRC)) {
  console.error('usage: node scripts/photos.mjs <folder-with-originals>');
  process.exit(1);
}

/* slug, original (post code + slide), alt text, his caption, place, [subject hue range] */
const PHOTOS = [
  ['crimson-sky', 'C-2w7DqyO5j_01', 'A blood-red evening sky smeared above dark rooftops', '', ''],
  ['peacock', 'C72D35USH5N_03', 'A peacock crossing a sandy garden path', '', 'Delhi'],
  ['blossom-bus', 'DWtpI8CEfkP_01', 'A yellow school bus parked beneath a cherry tree in full bloom', '', 'South Korea'],
  ['lotus-temple', 'C424cCYyeyt_01', 'The Lotus Temple rising beyond a wide green lawn', '', 'Lotus Temple, New Delhi'],
  ['rain-umbrella', 'DXPEaflEZ60_01', 'A figure under a pale umbrella on a rain-soaked night path', '', 'South Korea'],
  ['lion-capital', 'C1Ka9-_SgWC_04', 'A gilded Ashoka lion capital lit up at night', 'Aditya engineering college campus', 'SIH 2023 finale trip'],
  ['keyboard-moth', 'Dc6f2MHk4LQ_03', 'A moth resting on the keys of a cream mechanical keyboard', 'end of august', ''],
  ['river-sunset', 'DWHhmLskwQx_02', 'A pink sunset over a shallow river, mountains and apartment towers beyond', '', 'South Korea'],
  ['madhubani', 'C72FAD0SSlj_05', 'Madhubani-style elephants drawn in fine black line on a white wall', '', 'Delhi'],
  ['night-blossoms', 'DWeTlmVkXzg_01', 'Cherry blossoms glowing white against a black night sky', '', 'South Korea'],
  ['amaltas', 'C7TgRRvyNWc_01', 'Golden amaltas blossoms hanging against a pale sky', 'Yellow:)', ''],
  ['claw-machines', 'DWRn-ijk17h_02', 'A row of claw machines glowing neon green', '', 'South Korea'],
  ['butterfly-cat', 'DVlh6qFkb8f_02', 'An orange butterfly in sharp focus in front of a tabby cat', 'somewhere out there a cat has a favorite human', ''],
  ['hill-roofs', 'Dd81odsEzXd_07', 'Red roofs and green hills under a bright cloudy sky', 'September :)', ''],
  ['wing-sunrise', 'C1Kaf1gy_PC_03', 'The sun rising over cloud seen past an aircraft wing', 'Morning Sunshine...', 'SIH 2023 finale trip'],
  ['lotus-ceiling', 'C424OFFSPJk_03', 'The petalled ceiling inside the Lotus Temple', '', 'Lotus Temple, New Delhi'],
  ['marigolds', 'C424cCYyeyt_02', 'A bed of bright yellow marigolds', 'flouər for some beautiful people..', ''],
  ['brick-ruin', 'C72D35USH5N_01', 'A weathered red-brick ruin with arched niches beside a lawn', '', 'Delhi'],
  ['flyover-sun', 'C_U74epygkE_02', 'An orange sun sinking behind a flyover silhouette', '', ''],
  ['cloud-tower', 'C-2w7DqyO5j_02', 'A towering cloud lit gold from the side above the city', '', ''],
  ['petal-heart', 'DWtqesEEQIz_02', 'A heart traced in a carpet of fallen cherry petals', '', 'South Korea'],
  ['dcu', 'DWPKABuk965_04', 'The DCU sign at the Daegu Catholic University campus', '', 'Daegu Catholic University'],
  ['felt-sheep', 'DXECF7METwt_02', 'Three felt sheep lined up on a shelf', '', 'South Korea'],
  ['batmobile', 'DIc-9BNRLXs_01', 'A toy Batman riding a purple Batmobile against a red wall', '', ''],
  // …the rest of the 36-exposure roll
  ['goose', 'C1jeN7lyy9C_01', 'A white goose standing on bare earth beneath trees', 'Wanna be this chill in life🥲', ''],
  ['arched-corridor', 'C1Ka9-_SgWC_03', 'A long arched corridor lined with glowing lights, shot from floor level', 'Aditya engineering college campus', 'SIH 2023 finale trip'],
  ['gulmohar', 'C58bgw2yOUs_02', 'Red gulmohar flowers among feathery green leaves against a blue sky', 'In spring’s song, birds chirp poetry, painting the air with a melody beyond compare...', '', [0, 60]],
  ['duck', 'C72DmdQy9W9_03', 'A duck perched on a floating log in rippling green water', 'Quick quack...', 'Delhi'],
  ['violet-dusk', 'C-2w7DqyO5j_05', 'A violet storm sky glowing pink at the horizon above city rooftops', '', ''],
  ['poodle', 'DWRn-ijk17h_03', 'A small white curly-haired dog with a yellow collar, held in someone’s arms on a street', '', 'South Korea'],
  ['night-street', 'DWHjSnSE-qh_02', 'A narrow street at dusk under a purple sky, streetlights glowing beside an elevated railway', '', 'South Korea'],
  ['pink-tree', 'DXECF7METwt_03', 'A tree heavy with deep-pink blossoms above green grass', '', 'South Korea', [320, 30]],
  ['calico-cat', 'DXPEaflEZ60_03', 'A calico cat lounging on wooden boards, looking straight at the camera', '', 'South Korea'],
  ['rgb-keyboard', 'DWzEk1rE7GP_01', 'A mechanical keyboard glowing in rainbow backlight in a dark room', '', ''],
  ['misty-hills', 'Dd81odsEzXd_06', 'Mist rolling over green hills scattered with houses', 'September :)', ''],
  ['bougainvillea', 'DGiXgXET-31_01', 'Magenta bougainvillea spilling over a wall beside a residential street', '', ''],
];

/* ── Colour: k-means in OKLab, so clusters match how colours look ── */
const lin = (c) => {
  c /= 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};
function oklab(r, g, b) {
  const R = lin(r), G = lin(g), B = lin(b);
  const l = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B);
  const m = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B);
  const s = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}
const hex = (r, g, b) => '#' + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');

/**
 * Five-colour palette plus the hue/chroma of the frame's most telling colour.
 * `subject` ([fromDeg, toDeg], optional) is a curator's call for frames whose story
 * isn't their largest colour — red gulmohar flowers on mostly green leaves. The
 * exact hue is still measured from that frame's own pixels inside the range.
 */
async function colour(input, subject) {
  const { data } = await sharp(input).rotate().resize(64, 64, { fit: 'inside' }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const px = [];
  for (let i = 0; i < data.length; i += 3) px.push({ lab: oklab(data[i], data[i + 1], data[i + 2]), rgb: [data[i], data[i + 1], data[i + 2]] });

  const K = 5;
  const byL = [...px].sort((p, q) => p.lab[0] - q.lab[0]);
  let cents = Array.from({ length: K }, (_, k) => [...byL[Math.floor(((k + 0.5) / K) * byL.length)].lab]);
  const assign = new Uint8Array(px.length);
  for (let it = 0; it < 14; it++) {
    px.forEach((p, i) => {
      let best = 0, bd = Infinity;
      cents.forEach((c, k) => {
        const d = (p.lab[0] - c[0]) ** 2 + (p.lab[1] - c[1]) ** 2 + (p.lab[2] - c[2]) ** 2;
        if (d < bd) (bd = d), (best = k);
      });
      assign[i] = best;
    });
    const sums = Array.from({ length: K }, () => [0, 0, 0, 0]);
    px.forEach((p, i) => {
      const s = sums[assign[i]];
      s[0] += p.lab[0], s[1] += p.lab[1], s[2] += p.lab[2], s[3]++;
    });
    cents = cents.map((c, k) => (sums[k][3] ? sums[k].slice(0, 3).map((v) => v / sums[k][3]) : c));
  }

  const clusters = cents.map(() => ({ n: 0, r: 0, g: 0, b: 0 }));
  px.forEach((p, i) => {
    const c = clusters[assign[i]];
    c.n++, (c.r += p.rgb[0]), (c.g += p.rgb[1]), (c.b += p.rgb[2]);
  });
  const stats = clusters
    .map((c, k) => {
      const [L, A, B] = cents[k];
      return { share: c.n / px.length, hex: c.n ? hex(c.r / c.n, c.g / c.n, c.b / c.n) : null, L, C: Math.hypot(A, B), H: ((Math.atan2(B, A) * 180) / Math.PI + 360) % 360 };
    })
    .filter((c) => c.hex && c.share > 0.01)
    .sort((a, b) => b.share - a.share);

  // The frame's hue comes from a chroma-weighted hue histogram over its vivid
  // pixels (not from the biggest cluster, which is usually a dull background).
  const BINS = 36;
  const hist = new Float64Array(BINS);
  let vividWeight = 0;
  const vividPx = [];
  for (const p of px) {
    const [L, A, B] = p.lab;
    const C = Math.hypot(A, B);
    if (C < 0.05 || L < 0.18 || L > 0.96) continue;
    const H = ((Math.atan2(B, A) * 180) / Math.PI + 360) % 360;
    const w = C ** 2;
    hist[Math.floor(H / (360 / BINS)) % BINS] += w;
    vividWeight += w;
    vividPx.push({ H, C, w, rgb: p.rgb });
  }
  const smooth = hist.map((v, i) => hist[(i + BINS - 1) % BINS] + 2 * v + hist[(i + 1) % BINS]);
  const inSubject = (i) => {
    if (!subject) return true;
    const mid = (i + 0.5) * (360 / BINS);
    const [from, to] = subject;
    return from <= to ? mid >= from && mid <= to : mid >= from || mid <= to;
  };
  const peak = smooth.reduce((best, v, i) => (inSubject(i) && (best < 0 || v > smooth[best]) ? i : best), -1);
  const near = (H) => {
    const d = Math.abs(H - (peak + 0.5) * (360 / BINS));
    return Math.min(d, 360 - d) <= 15;
  };
  const inPeak = vividPx.filter((p) => near(p.H));
  let sx = 0, sy = 0, sw = 0, sc = 0, r = 0, g = 0, b = 0;
  for (const p of inPeak) {
    sx += Math.cos((p.H * Math.PI) / 180) * p.w;
    sy += Math.sin((p.H * Math.PI) / 180) * p.w;
    sw += p.w;
    sc += p.C * p.w;
    r += p.rgb[0] * p.w, g += p.rgb[1] * p.w, b += p.rgb[2] * p.w;
  }
  const colourfulness = vividWeight / px.length;
  const hue = sw ? Math.round(((Math.atan2(sy, sx) * 180) / Math.PI + 360) % 360) : 0;
  const chroma = sw ? sc / sw : 0;
  const accent = sw ? hex(r / sw, g / sw, b / sw) : null;
  const light = px.reduce((n, p) => n + p.lab[0], 0) / px.length;

  // Swatches: the four largest areas plus the accent, if the accent isn't already there.
  let palette = stats.map((c) => c.hex);
  if (accent) {
    const [aL, aA, aB] = oklab(...accent.match(/\w\w/g).map((h) => parseInt(h, 16)));
    const deltaE = (c) => {
      const rad = (c.H * Math.PI) / 180;
      return Math.hypot(c.L - aL, c.C * Math.cos(rad) - aA, c.C * Math.sin(rad) - aB);
    };
    if (!stats.some((c) => deltaE(c) < 0.06)) palette = [...palette.slice(0, 4), accent];
  }

  return {
    palette,
    hue,
    chroma: Number(chroma.toFixed(3)),
    light: Number(light.toFixed(3)),
    colourfulness: Number(colourfulness.toFixed(4)),
  };
}

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
function shotDate(code) {
  let id = 0n;
  for (const ch of code.slice(0, 11)) id = id * 64n + BigInt(ALPHABET.indexOf(ch));
  return new Date(Number(id >> 23n) + 1314220021721);
}
const monthYear = (d) => d.toLocaleString('en-GB', { month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' });

const out = new URL('../public/photos/', import.meta.url);
mkdirSync(out, { recursive: true });

const SIZES = [
  ['xs', 220, 70],
  ['sm', 640, 84],
  ['lg', 1600, 92],
];

const entries = [];
for (const [slug, file, alt, caption, place, subject] of PHOTOS) {
  const input = join(SRC, `${file}.webp`);
  const img = sharp(input).rotate();
  const meta = await img.metadata();
  for (const [size, width, quality] of SIZES) {
    const dest = new URL(`${slug}-${size}.webp`, out).pathname.replace(/^\/([A-Za-z]:)/, '$1');
    // Instagram has already compressed these once; re-encoding a web-sized original
    // only throws more detail away, so the full-size file is the original, untouched.
    if (size === 'lg' && meta.width <= width && meta.format === 'webp') {
      copyFileSync(input, dest);
      continue;
    }
    await sharp(input)
      .rotate()
      .resize({ width: Math.min(width, meta.width), withoutEnlargement: true })
      .webp({ quality, effort: 5 })
      .toFile(dest);
  }
  const code = file.replace(/_\d+$/, '');
  const date = shotDate(code);
  entries.push({
    slug,
    w: meta.width,
    h: meta.height,
    alt,
    caption,
    place,
    date: monthYear(date),
    iso: date.toISOString().slice(0, 10),
    post: `https://www.instagram.com/p/${code}/`,
    ...(await colour(input, subject)),
  });
  process.stdout.write('.');
}

// Saturation for the colour wheel: radius 0 (grey centre) to 1 (rim), relative to
// the most colourful frame on the roll, on a square-root scale so quiet frames
// still separate from the centre.
const most = Math.max(...entries.map((e) => e.colourfulness));
for (const e of entries) {
  e.sat = Number(Math.sqrt(e.colourfulness / most).toFixed(3));
  delete e.colourfulness;
}

const ts = `// Generated by scripts/photos.mjs — edit the selection there and re-run.
// Photographs by Manas Thakur (@menace_thakur on Instagram).

export type Photo = {
  slug: string;
  w: number;
  h: number;
  alt: string;
  /** Manas's own caption from the post, when he wrote one. */
  caption: string;
  place: string;
  date: string;
  iso: string;
  post: string;
  /** Up to five colours sampled from the frame, most area first (content, not design tokens). */
  palette: string[];
  /** OKLCH hue (0–360) and chroma of the frame's most telling colour. */
  hue: number;
  chroma: number;
  /** Mean OKLab lightness, 0–1. */
  light: number;
  /** How colourful the frame is relative to the roll: 0 (grey) to 1 (most vivid). */
  sat: number;
};

export const instagram = 'https://www.instagram.com/menace_thakur/';

export const photoSrc = (slug: string, size: 'xs' | 'sm' | 'lg') => \`/photos/\${slug}-\${size}.webp\`;

export const photos: Photo[] = ${JSON.stringify(entries, null, 2)};
`;
writeFileSync(new URL('../src/data/photos.ts', import.meta.url), ts);
console.log(`\n${entries.length} photos → public/photos/, src/data/photos.ts`);
