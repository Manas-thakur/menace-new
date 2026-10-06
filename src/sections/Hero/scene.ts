// The painting above the water: a dawn sky over the Kailash range, drawn on canvas
// so the lake can mirror it exactly. Every colour comes from the design tokens.

export type Palette = {
  night0: string;
  night1: string;
  night2: string;
  dawn0: string;
  dawn1: string;
  dawn2: string;
  dawn3: string;
  dawn4: string;
  halo: string;
  alpenglow: string;
  snow: string;
  snowShade: string;
  ridgeFar: string;
  ridgeMid: string;
  ridgeNear: string;
  rock: string;
  star: string;
  moon: string;
  mist: string;
  lake: string;
  lakeDeep: string;
  glint: string;
  ring: string;
  gold: string;
  goldDeep: string;
};

export function readPalette(): Palette {
  const css = getComputedStyle(document.documentElement);
  const v = (n: string) => css.getPropertyValue(n).trim();
  return {
    night0: v('--color-indigo-night'),
    night1: v('--color-indigo'),
    night2: v('--color-ridge-mid'),
    dawn0: v('--color-indigo'),
    dawn1: v('--color-violet'),
    dawn2: v('--color-dawn-rose'),
    dawn3: v('--color-saffron'),
    dawn4: v('--color-dawn-gold'),
    halo: v('--color-dawn-gold'),
    alpenglow: v('--color-saffron'),
    snow: v('--color-snow'),
    snowShade: v('--color-snow-shade'),
    ridgeFar: v('--color-ridge-far'),
    ridgeMid: v('--color-ridge-mid'),
    ridgeNear: v('--color-ridge-near'),
    rock: v('--color-ridge-near'),
    star: v('--color-paper'),
    moon: v('--color-paper-2'),
    mist: v('--color-paper-3'),
    lake: v('--color-lake'),
    lakeDeep: v('--color-lake-deep'),
    glint: v('--color-dawn-gold'),
    ring: v('--color-paper-3'),
    gold: v('--color-gold'),
    goldDeep: v('--color-gold-deep'),
  };
}

/** A token colour with an alpha: oklch(L C H) → oklch(L C H / a). */
export const withAlpha = (color: string, a: number) => color.replace(/\)\s*$/, ` / ${a.toFixed(3)})`);

export function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Stage size in CSS px, where the water begins, and one "scene unit" in px. */
export type Geom = { W: number; H: number; horizon: number; s: number; cx: number };

export function geomFor(W: number, H: number, horizon: number): Geom {
  const portrait = H > W;
  const s = Math.min(W / (portrait ? 1150 : 1600), horizon / 880);
  return { W, H, horizon, s, cx: W / 2 };
}

/* ── Kailash, in scene units: x from the centre, y up from the water ──
 * Seen from the lake to its south: a rounded summit on steep faces that spread into
 * shoulders, snow down to the shoulders, ledges banding the south face, and the long
 * couloir down its middle. First light comes from the east, on the right. */
const PEAK = 514;
const SNOW_LINE = 432; // the summit dome is snow; the face below is rock, barred with snow

/** Half the mountain's width at height y. */
function halfWidth(y: number) {
  if (y >= PEAK) return 0;
  // the summit: the top of an ellipse that meets the faces at their own slope
  if (y >= 430) return 161.4 * Math.sqrt(Math.max(0, 1 - ((y - 250) / 264) ** 2));
  if (y >= 250) return 118 + (430 - y) * 0.58; // the steep faces
  if (y >= 110) return 222 + (250 - y) * 1.25; // the shoulders
  return 397 + (110 - y) * 1.5; // the foot
}

/** The outline, west foot to east foot, roughened below the snow. */
function outline(): [number, number][] {
  const rand = mulberry32(514);
  const ys: number[] = [];
  for (let y = 0; y < PEAK - 8; y += y < 420 ? 14 : 8) ys.push(y);
  const rough = (y: number) => (y < 420 ? (rand() - 0.5) * (y < 250 ? 14 : 7) : 0);
  const west = ys.map((y): [number, number] => [-halfWidth(y) + rough(y), y]);
  const east = [...ys].reverse().map((y): [number, number] => [halfWidth(y) + rough(y), y]);
  return [...west, [0, PEAK], ...east];
}
const BODY = outline();

// the snow's ragged lower edge, west to east
const SNOW_EDGE: [number, number][] = (() => {
  const rand = mulberry32(77);
  const pts: [number, number][] = [];
  const x0 = -halfWidth(SNOW_LINE);
  const x1 = halfWidth(SNOW_LINE);
  for (let i = 0; i <= 16; i++) {
    const x = x0 + ((x1 - x0) * i) / 16;
    // every few steps a tongue of snow runs further down the face
    const tongue = i % 4 === 1 ? 14 + rand() * 22 : 0;
    pts.push([x, SNOW_LINE - (i % 2 ? 3 + rand() * 8 + tongue : -2 - rand() * 3)]);
  }
  pts[0] = [x0, SNOW_LINE];
  pts[pts.length - 1] = [x1, SNOW_LINE];
  return pts;
})();
// snow lying on the ledges of the south face, and in the gullies below them
const LEDGES = [416, 388, 360, 332, 304, 276];
const GULLIES = [-176, -122, -70, 64, 118, 172];

function curve(ctx: CanvasRenderingContext2D | Path2D, pts: [number, number][], map: (p: [number, number]) => [number, number], start = true) {
  const p = pts.map(map);
  if (start) ctx.moveTo(p[0][0], p[0][1]);
  else ctx.lineTo(p[0][0], p[0][1]);
  for (let i = 1; i < p.length - 1; i++) {
    const mx = (p[i][0] + p[i + 1][0]) / 2;
    const my = (p[i][1] + p[i + 1][1]) / 2;
    ctx.quadraticCurveTo(p[i][0], p[i][1], mx, my);
  }
  const last = p[p.length - 1];
  ctx.lineTo(last[0], last[1]);
}

/** A ridgeline across the whole width: layered sines plus a little seeded grit. */
function ridge(g: Geom, seed: number, minH: number, maxH: number, dip = 0, bleed = 0) {
  const rand = mulberry32(seed);
  const phases = [rand() * 6.28, rand() * 6.28, rand() * 6.28];
  const path = new Path2D();
  const step = Math.max(6, 14 * g.s);
  path.moveTo(-10 - bleed, g.horizon + 2);
  for (let x = -10 - bleed; x <= g.W + 10 + bleed; x += step) {
    const u = x / Math.max(1, g.W);
    let n = 0.5 + 0.28 * Math.sin(u * 7.1 + phases[0]) + 0.14 * Math.sin(u * 17.3 + phases[1]) + 0.08 * Math.sin(u * 41 + phases[2]);
    n += (rand() - 0.5) * 0.06;
    // lower near the centre so Kailash stands clear
    const fromCentre = Math.min(1, Math.abs(x - g.cx) / (g.W / 2));
    const h = (minH + (maxH - minH) * n) * (1 - dip * (1 - fromCentre)) * g.s;
    path.lineTo(x, g.horizon - h);
  }
  path.lineTo(g.W + 10 + bleed, g.horizon + 2);
  path.closePath();
  return path;
}

type Star = { x: number; y: number; r: number; a: number };
let starCache: { key: string; stars: Star[] } | null = null;
function starsFor(g: Geom): Star[] {
  const key = `${Math.round(g.W)}x${Math.round(g.horizon)}`;
  if (starCache?.key === key) return starCache.stars;
  const rand = mulberry32(108);
  const count = Math.round(Math.min(140, (g.W * g.horizon) / 9000));
  const stars = Array.from({ length: count }, () => ({
    x: rand() * g.W,
    y: Math.pow(rand(), 1.6) * g.horizon * 0.62,
    r: 0.5 + rand() * 1.1,
    a: 0.35 + rand() * 0.65,
  }));
  starCache = { key, stars };
  return stars;
}

let moonCache: { key: string; canvas: HTMLCanvasElement } | null = null;
/** A crescent on its own small canvas (3r square), at 2× for sharp edges. */
function moonSprite(r: number, color: string) {
  const key = `${r.toFixed(1)}|${color}`;
  if (moonCache?.key === key) return moonCache.canvas;
  const canvas = document.createElement('canvas');
  const k = 2;
  canvas.width = canvas.height = Math.ceil(r * 3 * k);
  const c = canvas.getContext('2d')!;
  c.scale(k, k);
  c.fillStyle = color;
  c.beginPath();
  c.arc(r * 1.5, r * 1.5, r, 0, Math.PI * 2);
  c.fill();
  c.globalCompositeOperation = 'destination-out';
  c.beginPath();
  c.arc(r * 1.5 - r * 0.42, r * 1.5 - r * 0.1, r * 0.93, 0, Math.PI * 2);
  c.fill();
  moonCache = { key, canvas };
  return canvas;
}

/**
 * Paint the sky and mountains for a dawn progress p (0 = night, 1 = first light).
 * Coordinates are CSS px; the caller sets the device-pixel transform.
 */
export function drawSky(ctx: CanvasRenderingContext2D, g: Geom, pal: Palette, p: number, bleed = 0) {
  const { W, horizon: hz, s, cx } = g;
  // `bleed` paints past both edges, for the water to borrow when it pushes rows sideways
  const x0 = -bleed;
  const span = W + bleed * 2;
  ctx.clearRect(x0, 0, span, hz);

  // night, then dawn laid over it
  const night = ctx.createLinearGradient(0, 0, 0, hz);
  night.addColorStop(0, pal.night0);
  night.addColorStop(0.65, pal.night1);
  night.addColorStop(1, pal.night2);
  ctx.fillStyle = night;
  ctx.fillRect(x0, 0, span, hz);

  if (p > 0) {
    ctx.globalAlpha = p;
    const dawn = ctx.createLinearGradient(0, 0, 0, hz);
    dawn.addColorStop(0, pal.dawn0);
    dawn.addColorStop(0.32, pal.dawn1);
    dawn.addColorStop(0.62, pal.dawn2);
    dawn.addColorStop(0.84, pal.dawn3);
    dawn.addColorStop(1, pal.dawn4);
    ctx.fillStyle = dawn;
    ctx.fillRect(x0, 0, span, hz);
    ctx.globalAlpha = 1;
  }

  // stars fade as the light comes, the highest last
  {
    ctx.fillStyle = pal.star;
    for (const st of starsFor(g)) {
      const high = 1 - st.y / (hz * 0.62);
      const starA = Math.max(0, 1 - p * 1.35) + p * 0.32 * high * high;
      if (starA < 0.01) continue;
      ctx.globalAlpha = st.a * starA;
      ctx.beginPath();
      ctx.arc(st.x, st.y, st.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // a thin old moon, high in the west
  {
    const mr = Math.max(9, 22 * s);
    const sprite = moonSprite(mr, pal.moon);
    ctx.globalAlpha = 0.6 + 0.35 * (1 - p);
    ctx.drawImage(sprite, W * 0.84 - mr * 1.5, hz * 0.17 - mr * 1.5, mr * 3, mr * 3);
    ctx.globalAlpha = 1;
  }

  // the halo behind the peak: first light gathering
  if (p > 0) {
    const peakY = hz - 514 * s;
    const halo = ctx.createRadialGradient(cx, peakY + 140 * s, 10 * s, cx, peakY + 140 * s, Math.max(W, hz) * 0.62);
    halo.addColorStop(0, withAlpha(pal.halo, 0.75 * p));
    halo.addColorStop(0.35, withAlpha(pal.halo, 0.28 * p));
    halo.addColorStop(1, withAlpha(pal.halo, 0));
    ctx.fillStyle = halo;
    ctx.fillRect(x0, 0, span, hz);
  }

  // the far range, hazed
  ctx.fillStyle = pal.ridgeFar;
  ctx.globalAlpha = 0.75;
  ctx.fill(ridge(g, 7, 150, 300, 0.25, bleed));
  ctx.globalAlpha = 1;

  // Kailash
  const map = ([x, y]: [number, number]): [number, number] => [cx + x * s, hz - y * s];
  const top = hz - PEAK * s;
  const body = new Path2D();
  curve(body, BODY, map);
  body.closePath();
  const rockGrad = ctx.createLinearGradient(0, top, 0, hz);
  rockGrad.addColorStop(0, pal.ridgeMid);
  rockGrad.addColorStop(1, pal.ridgeNear);
  ctx.fillStyle = rockGrad;
  ctx.fill(body);

  ctx.save();
  ctx.clip(body);
  // the west half keeps the night; the east half warms
  const shade = ctx.createLinearGradient(cx - 40 * s, 0, cx + 16 * s, 0);
  shade.addColorStop(0, withAlpha(pal.night0, 0.34));
  shade.addColorStop(1, withAlpha(pal.night0, 0));
  ctx.fillStyle = shade;
  ctx.fillRect(cx - 600 * s, top, 616 * s, PEAK * s);
  if (p > 0) {
    const warm = ctx.createLinearGradient(cx, 0, cx + 420 * s, 0);
    warm.addColorStop(0, withAlpha(pal.dawn2, 0));
    warm.addColorStop(1, withAlpha(pal.dawn2, 0.18 * p));
    ctx.fillStyle = warm;
    ctx.fillRect(cx, top, 600 * s, PEAK * s);
  }
  // snow left lying in the gullies, low on the faces
  ctx.lineCap = 'round';
  ctx.strokeStyle = pal.snowShade;
  ctx.lineWidth = 2.4 * s;
  for (const gx of GULLIES) {
    const y0 = 262 - Math.abs(gx) * 0.25;
    const [x0, py0] = map([gx, y0]);
    const [x1, py1] = map([gx * 1.25, y0 - 60 - Math.abs(gx) * 0.2]);
    ctx.globalAlpha = gx < 0 ? 0.2 : 0.34;
    ctx.beginPath();
    ctx.moveTo(x0, py0);
    ctx.quadraticCurveTo(x0 + (x1 - x0) * 0.25, (py0 + py1) / 2, x1, py1);
    ctx.stroke();
  }

  // a dusting of snow over the upper face, thinning as it goes down
  const dust = ctx.createLinearGradient(0, hz - SNOW_LINE * s, 0, hz - 280 * s);
  dust.addColorStop(0, withAlpha(pal.snowShade, 0.3));
  dust.addColorStop(1, withAlpha(pal.snowShade, 0));
  ctx.globalAlpha = 1;
  ctx.fillStyle = dust;
  ctx.fillRect(cx - 260 * s, hz - SNOW_LINE * s, 520 * s, (SNOW_LINE - 280) * s);

  // the south face: snow on each ledge, bowed by the dome, brighter where the light reaches
  const ledgeSnow = ctx.createLinearGradient(cx - 200 * s, 0, cx + 200 * s, 0);
  ledgeSnow.addColorStop(0, pal.snowShade);
  ledgeSnow.addColorStop(0.5, pal.snowShade);
  ledgeSnow.addColorStop(0.62, pal.snow);
  ledgeSnow.addColorStop(1, pal.snow);
  ctx.strokeStyle = ledgeSnow;
  const rand = mulberry32(9);
  for (const [i, ly] of LEDGES.entries()) {
    const w = halfWidth(ly) - 10;
    const yAt = (x: number) => ly - (x / 200) ** 2 * 18 + Math.sin(x * 0.07 + i * 2.3) * 2;
    // each ledge breaks where rock stands proud of the snow
    let x = -w + rand() * 14;
    while (x < w) {
      const run = 18 + rand() * 80;
      const end = Math.min(w, x + run);
      const thick = (1.4 + rand() * 1.8 - i * 0.12) * s;
      const stroke = (dy: number) => {
        ctx.beginPath();
        for (let xx = x; xx <= end; xx += 5) {
          const [px, py] = map([xx, yAt(xx) - dy]);
          if (xx === x) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.stroke();
      };
      // the rock step under the snow throws a little shadow
      ctx.strokeStyle = pal.rock;
      ctx.globalAlpha = 0.45;
      ctx.lineWidth = thick * 1.3;
      stroke(thick / s + 1.2);
      ctx.strokeStyle = ledgeSnow;
      ctx.globalAlpha = 0.9 - i * 0.08;
      ctx.lineWidth = thick;
      stroke(0);
      x = end + 4 + rand() * 22;
    }
  }
  // the couloir: a stripe of snow straight down the middle, crossing every ledge
  const couloir = new Path2D();
  curve(couloir, [[-1.5, 440], [-3, 404], [-1, 372], [-5, 336], [-3, 300], [-8, 262]], map);
  curve(couloir, [[7, 262], [3, 300], [4, 336], [2, 372], [3, 404], [1.5, 440]], map, false);
  couloir.closePath();
  ctx.globalAlpha = 0.6;
  ctx.fillStyle = ledgeSnow;
  ctx.fill(couloir);
  ctx.globalAlpha = 1;

  // the snow dome: shaded west, lit east
  const snow = new Path2D();
  curve(snow, [[SNOW_EDGE[0][0], SNOW_LINE], ...BODY.filter(([, y]) => y > SNOW_LINE), [SNOW_EDGE[SNOW_EDGE.length - 1][0], SNOW_LINE]], map);
  curve(snow, [...SNOW_EDGE].reverse(), map, false);
  snow.closePath();
  const lit = ctx.createLinearGradient(cx - 30 * s, 0, cx + 30 * s, 0);
  lit.addColorStop(0, pal.snowShade);
  lit.addColorStop(1, pal.snow);
  ctx.fillStyle = lit;
  ctx.fill(snow);
  if (p > 0) {
    // alpenglow: the summit turns to gold before anything else does
    ctx.clip(snow);
    const glow = ctx.createRadialGradient(cx + 40 * s, top, 0, cx + 40 * s, top, 170 * s);
    glow.addColorStop(0, withAlpha(pal.alpenglow, 0.95 * p));
    glow.addColorStop(0.5, withAlpha(pal.dawn2, 0.42 * p));
    glow.addColorStop(1, withAlpha(pal.dawn2, 0));
    ctx.fillStyle = glow;
    ctx.fillRect(cx - 200 * s, top, 400 * s, 120 * s);
  }
  ctx.restore();

  // nearer ranges either side, then the far shore of the lake
  ctx.fillStyle = pal.ridgeMid;
  ctx.globalAlpha = 0.92;
  ctx.fill(ridge(g, 23, 60, 170, 0.7, bleed));
  ctx.globalAlpha = 1;
  ctx.fillStyle = pal.ridgeNear;
  ctx.fill(ridge(g, 41, 16, 58, 0.35, bleed));

  // morning mist on the water line
  const mist = ctx.createLinearGradient(0, hz - 90 * s, 0, hz);
  mist.addColorStop(0, withAlpha(pal.mist, 0));
  mist.addColorStop(1, withAlpha(pal.mist, 0.16 + 0.1 * p));
  ctx.fillStyle = mist;
  ctx.fillRect(x0, hz - 90 * s, span, 90 * s);
}
