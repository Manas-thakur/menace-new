// Pure layout maths for the Darkroom. Every view is a list of 36 target boxes in
// stage pixels; the same 36 print elements fly between them (transforms only).
import { photos } from '../../data/photos';

export type View = 'line' | 'sheet' | 'wheel';

export const N = photos.length;
/** Every print's image window is laid out at B×B px and scaled into place. */
export const B = 260;
/** How many frames are Manas's picks (hung on the line, ringed on the sheet). */
export const PICKS = 14;

/** Paper border around the image window, as fractions of the image size. */
export const PAPER = { side: 0.062, top: 0.062, bottom: 0.21 } as const;
export const PEG_W = 0.09;
/** From the image centre up to where the peg meets the string, in image sizes. */
export const PIVOT_Y = 0.5 + PAPER.top + 0.4 * PEG_W;

export type Target = { cx: number; cy: number; size: number; rot: number; z: number };
export type Rect = { x: number; y: number; w: number; h: number };

/** Deterministic 0–1 noise. */
export function noise(seed: number, k: number) {
  const x = Math.sin(seed * 12.9898 + k * 78.233) * 43758.5453;
  return x - Math.floor(x);
}
const clamp = (min: number, v: number, max: number) => Math.max(min, Math.min(max, v));
export const gutterFor = (W: number) => clamp(16, 0.04 * W, 104);

/* ── On the line ─────────────────────────────────────────── */

/** Where a print hangs: the peg point on the string, tilt, and peg offset. */
export type Hang = {
  px: number;
  py: number;
  tilt: number;
  /** Peg offset from the print's centre line, in image sizes. */
  shift: number;
  line: number;
  /** How much of the string's sag spring moves this peg (0 at the walls). */
  weight: number;
};

export type LineLayout = {
  width: number;
  height: number;
  p: number;
  targets: Target[];
  hangs: (Hang | null)[];
  strings: { y: number; sag: number; pegs: number[] | null }[];
  tray: Rect;
  pile: number[];
  snaps: number[];
};

/** Centre of a hanging print for total angle phi (deg), rotating about its peg. */
export function hangCenter(h: Hang, size: number, phi: number, sagOffset = 0) {
  const vx = h.shift * size;
  const vy = -PIVOT_Y * size;
  const r = (phi * Math.PI) / 180;
  const c = Math.cos(r);
  const s = Math.sin(r);
  return { cx: h.px - (c * vx - s * vy), cy: h.py + sagOffset * h.weight - (s * vx + c * vy) };
}

function hangFor(i: number, px: number, py: number, line: number, weight: number): Hang {
  return {
    px,
    py,
    line,
    weight,
    tilt: noise(i + 1, 1) * 6 - 3,
    shift: noise(i + 1, 2) * 0.24 - 0.12,
  };
}

/**
 * Desktop (H given): two strings across the room, the rest of the roll fanned in a
 * developing tray at the bottom-right. Phones (H null): one wide canvas you pull
 * sideways, with the tray at the end of the lines.
 */
export function lineLayout(W: number, H: number | null, vh: number): LineLayout {
  const g = gutterFor(W);
  const targets: Target[] = new Array(N);
  const hangs: (Hang | null)[] = new Array(N).fill(null);
  let p: number;
  let width = W;
  let height: number;
  let tray: Rect;
  const strings: LineLayout['strings'] = [];
  const snaps: number[] = [];
  let perLine: number;

  if (H !== null) {
    perLine = W >= 1440 ? 7 : 5;
    const m = 0.03 * H;
    const edge = 0.5 * g;
    p = Math.min((H - 2 * m) / 4.62, (W - 2 * edge) / (perLine * 1.36));
    const extra = Math.max(0, H - 2 * m - 4.62 * p);
    const y1 = m + 0.08 * p + extra * 0.35;
    const sag = 0.3 * p;
    const y2 = y1 + 1.77 * p;
    [y1, y2].forEach((y, line) => {
      strings.push({ y, sag, pegs: null });
      for (let j = 0; j < perLine; j++) {
        const i = line * perLine + j;
        const px = edge + ((W - 2 * edge) * (j + 0.5)) / perLine;
        const t = px / W;
        const weight = 4 * t * (1 - t);
        hangs[i] = hangFor(i, px, y + sag * weight, line, weight);
      }
    });
    const trayH = 1.05 * p;
    const trayW = 2.6 * p;
    tray = { x: W - g - trayW, y: H - m - trayH - extra * 0.2, w: trayW, h: trayH };
    height = H;
  } else {
    perLine = 7;
    // phones: one big print and the next peeking in; tablets: two and a half
    p = W >= 640 ? Math.min(0.34 * W, 0.28 * vh) : Math.min(0.54 * W, 0.38 * vh);
    const slot = 1.15 * p;
    const y1 = 0.2 * p;
    const y2 = y1 + 1.62 * p;
    [y1, y2].forEach((y, line) => {
      const pegs: number[] = [];
      for (let j = 0; j < perLine; j++) {
        const i = line * perLine + j;
        const px = g + slot * (j + 0.5);
        pegs.push(px);
        hangs[i] = hangFor(i, px, y, line, 0);
        if (line === 0) snaps.push(px);
      }
      strings.push({ y, sag: 0.09 * p, pegs });
    });
    const trayW = 1.75 * p;
    const trayH = 1.95 * p;
    const lineBottom = y2 + 1.31 * p;
    tray = { x: g + perLine * slot + 0.3 * p, y: (y1 + lineBottom) / 2 - trayH / 2, w: trayW, h: trayH };
    snaps.push(tray.x + trayW / 2);
    width = tray.x + trayW + g;
    height = lineBottom + 0.22 * p;
  }

  const picksShown = perLine * 2;
  for (let i = 0; i < picksShown; i++) {
    const h = hangs[i]!;
    const c = hangCenter(h, p, h.tilt);
    targets[i] = { cx: c.cx, cy: c.cy, size: p, rot: h.tilt, z: 20 + i };
  }

  // The pile: everything not on the line, fanned like a spread hand in the tray,
  // the next frame of the roll lying on top.
  const pile: number[] = [];
  for (let i = picksShown; i < N; i++) pile.push(i);
  const n = pile.length;
  // a print with its paper is 1.27 image-heights tall; keep the fan inside the bath
  const q = Math.min(tray.h * 0.56, tray.w * 0.3);
  const left = tray.x + 0.05 * tray.w + 0.72 * q;
  const right = tray.x + tray.w - 0.05 * tray.w - 0.72 * q;
  pile.forEach((i, k) => {
    const t = n > 1 ? 1 - k / (n - 1) : 1; // the next frame of the roll: rightmost, on top
    const jitter = noise(i + 1, 5) - 0.5;
    targets[i] = {
      cx: left + (right - left) * t + jitter * q * 0.05,
      cy: tray.y + tray.h * 0.5 - q * 0.12 + Math.sin(t * Math.PI) * q * 0.04 + jitter * q * 0.05,
      size: q,
      rot: -10 + 14 * t + jitter * 5,
      z: 1 + (n - k),
    };
  });

  return { width, height, p, targets, hangs, strings, tray, pile, snaps };
}

/* ── Contact sheet ───────────────────────────────────────── */

export type Strip = { cx: number; cy: number; len: number; h: number; rot: number; first: number };
export type SheetLayout = {
  width: number;
  height: number;
  f: number;
  table: Rect;
  strips: Strip[];
  targets: Target[];
  note: { x: number; y: number; h: number; rot: number };
  /** Phones: one strip per row, the loupe dragged by a finger. */
  compact: boolean;
};

const FRAME_PITCH = 1.1;
const STRIP_LEN = 6 * FRAME_PITCH + 0.6;
const STRIP_H = 1.54;

/**
 * Six strips of six frames on a light table; strips in reading order, slightly askew.
 * On phones the frames leave room for the loupe (radius loupeR) to rest fully on the
 * table, centred over frame 01.
 */
export function sheetLayout(W: number, H: number | null, loupeR = 0): SheetLayout {
  const g = gutterFor(W);
  const gx = 0.5;
  const gy = 0.3;
  const fixed = H !== null;
  let padX = fixed ? 0.45 : 0.12;
  let padTop = fixed ? 0.85 : 0.95;
  const padBottom = fixed ? 0.45 : 0.3;
  let cols = 1;
  let f: number;
  if (fixed) {
    const m = 0.02 * H;
    f = 0;
    for (const c of [1, 2, 3]) {
      const r = 6 / c;
      const fw = (W - 2 * g) / (c * STRIP_LEN + (c - 1) * gx + 2 * padX);
      const fh = (H - 2 * m) / (r * STRIP_H + (r - 1) * gy + padTop + padBottom);
      const fc = Math.min(fw, fh);
      if (fc > f) {
        f = fc;
        cols = c;
      }
    }
  } else {
    // frame 01's centre sits padX·f + 0.85f in from the table edge; keep that ≥ loupeR + 2
    f = Math.min((W - 16) / (STRIP_LEN + 2 * padX), (W - 20 - 2 * loupeR) / 5.5);
    padX = ((W - 16) / f - STRIP_LEN) / 2;
    // and room above strip 1, so the resting lens stays on the table at the top too
    padTop = Math.max(padTop, (loupeR + 2) / f - STRIP_H / 2);
  }
  const rows = 6 / cols;
  const sheetW = (cols * STRIP_LEN + (cols - 1) * gx) * f;
  const sheetH = (rows * STRIP_H + (rows - 1) * gy) * f;
  const tw = sheetW + 2 * padX * f;
  const th = sheetH + (padTop + padBottom) * f;
  const table: Rect = { x: (W - tw) / 2, y: fixed ? (H! - th) / 2 : 0, w: tw, h: th };

  const strips: Strip[] = [];
  for (let k = 0; k < 6; k++) {
    const col = k % cols;
    const row = Math.floor(k / cols);
    strips.push({
      cx: table.x + padX * f + (col * (STRIP_LEN + gx) + STRIP_LEN / 2) * f + (noise(k + 3, 6) - 0.5) * 0.12 * f,
      cy: table.y + padTop * f + (row * (STRIP_H + gy) + STRIP_H / 2) * f + (noise(k + 3, 8) - 0.5) * 0.1 * f,
      len: STRIP_LEN * f,
      h: STRIP_H * f,
      rot: noise(k + 1, 7) * 1.2 - 0.6,
      first: k * 6,
    });
  }

  const targets: Target[] = [];
  for (let i = 0; i < N; i++) {
    const s = strips[Math.floor(i / 6)];
    const u = ((i % 6) - 2.5) * FRAME_PITCH * f;
    const a = (s.rot * Math.PI) / 180;
    targets.push({ cx: s.cx + u * Math.cos(a), cy: s.cy + u * Math.sin(a), size: f, rot: s.rot, z: 5 });
  }

  const first = targets[0];
  return {
    width: W,
    height: fixed ? H! : th,
    f,
    table,
    strips,
    targets,
    note: { x: first.cx + Math.max(0.85 * f, loupeR + 6), y: table.y + 0.08 * f, h: 0.62 * f, rot: -4 },
    compact: !fixed,
  };
}

/** Index of the frame under a point on the sheet, or -1. */
export function frameAt(sheet: SheetLayout, x: number, y: number) {
  let best = -1;
  let bestD = Infinity;
  sheet.targets.forEach((t, i) => {
    const a = (-t.rot * Math.PI) / 180;
    const dx = x - t.cx;
    const dy = y - t.cy;
    const u = dx * Math.cos(a) - dy * Math.sin(a);
    const v = dx * Math.sin(a) + dy * Math.cos(a);
    const d = Math.max(Math.abs(u), Math.abs(v));
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  });
  return bestD <= sheet.f * 0.62 ? best : -1;
}

export function hexToOklch(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  const lin = (v: number) => {
    const c = v / 255;
    return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  const r = lin((n >> 16) & 255);
  const gg = lin((n >> 8) & 255);
  const b = lin(n & 255);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * gg + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * gg + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * gg + 0.6299787005 * b);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const Bb = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  const C = Math.hypot(A, Bb);
  let h = (Math.atan2(Bb, A) * 180) / Math.PI;
  if (h < 0) h += 360;
  return { L, C, h };
}

/** The most colourful entry of a frame's palette (undefined if it has none). */
export function vividOf(palette: string[]): string | undefined {
  let best = palette[0];
  let bestC = -1;
  for (const hex of palette) {
    const { C } = hexToOklch(hex);
    if (C > bestC) {
      bestC = C;
      best = hex;
    }
  }
  return best;
}

/* ── Colour wheel: spin to browse ────────────────────────── */

/** Frames at least this colourful ride the outer ring, in hue order. */
export const VIVID = 0.3;

export type WheelLayout = {
  width: number;
  height: number;
  cx: number;
  cy: number;
  Ro: number;
  Ri: number;
  /** Image diameters of the chips on each ring. */
  dOuter: number;
  dInner: number;
  /** Outer ring, hue order: slot 0 sits under the pointer at rest, clockwise from there. */
  outer: number[];
  /** Inner ring, brightest to darkest: the grey and the night. */
  inner: number[];
  /** The colour track: centre radius, width, and one colour per outer slot. */
  track: { r: number; w: number; colors: string[] };
  /** Two little labels riding the track at these outer slots. */
  labels: { text: string; slot: number }[];
  /** Diameter of the hub's preview of the active frame. */
  hub: number;
  /** Length of the pointer notch at 12 o'clock. */
  pointer: number;
  text: Rect;
  compact: boolean;
};

// ring proportions, all in units of the outer ring's radius
const RING = { inner: 0.66, gap: 0.035, track: 0.03, pointer: 0.075, card: 1.09, fill: 0.88, hub: 0.84 } as const;

/**
 * Two rings and a hub. Chips are sized from each ring's circumference (0.88 of the
 * slot, paper ring included) so nothing overlaps at any angle of spin.
 */
export function wheelLayout(W: number, H: number | null): WheelLayout {
  const fixed = H !== null;
  const g = gutterFor(W);
  const ids = photos.map((_, i) => i);
  const outer = ids.filter((i) => photos[i].sat >= VIVID).sort((a, b) => photos[a].hue - photos[b].hue);
  const inner = ids.filter((i) => photos[i].sat < VIVID).sort((a, b) => photos[b].light - photos[a].light);
  const cardO = RING.fill * 2 * Math.sin(Math.PI / outer.length);
  const cardI = RING.fill * 2 * Math.sin(Math.PI / inner.length) * RING.inner;
  const trackR = 1 + cardO / 2 + RING.gap + RING.track / 2;
  const up = trackR + RING.track / 2 + RING.pointer;
  const down = trackR + RING.track / 2 + 0.02;
  let Ro: number;
  let cx: number;
  let cy: number;
  let text: Rect;
  let height: number;
  if (fixed) {
    const m = 0.02 * H;
    Ro = Math.min((H - 2 * m) / (up + down), ((W - 2 * g) / (2 * down)) * 0.62);
    cy = m + up * Ro + (H - 2 * m - (up + down) * Ro) / 2;
    const reach = down * Ro;
    const free = W / 2 - reach - g;
    if (free >= 300) {
      // the wheel centred, the words centred in the free space beside it
      cx = W / 2;
      const tw = Math.min(free * 0.82, 34 * 16);
      text = { x: g + (free - tw) / 2, y: cy, w: tw, h: 0 };
    } else {
      // narrow desktops: words and wheel centred together as one group
      const gap = 32;
      const tw = Math.min(300, W - 2 * g - 2 * reach - gap);
      const left = (W - (tw + gap + 2 * reach)) / 2;
      cx = left + tw + gap + reach;
      text = { x: left, y: cy, w: tw, h: 0 };
    }
    height = H;
  } else {
    const edge = Math.min(g, 12);
    Ro = (W - 2 * edge) / (2 * down);
    cx = W / 2;
    cy = up * Ro + 8;
    text = { x: g, y: cy + down * Ro + 20, w: W - 2 * g, h: 150 };
    height = text.y + text.h + g;
  }
  const colors = outer.map((i) => vividOf(photos[i].palette) ?? photos[i].palette[0]);
  const near = (hue: number) =>
    outer.reduce((best, i, k) => (Math.abs(photos[i].hue - hue) < Math.abs(photos[outer[best]].hue - hue) ? k : best), 0);
  return {
    width: W,
    height,
    cx,
    cy,
    Ro,
    Ri: RING.inner * Ro,
    dOuter: (cardO * Ro) / RING.card,
    dInner: (cardI * Ro) / RING.card,
    outer,
    inner,
    track: { r: trackR * Ro, w: RING.track * Ro, colors },
    labels: [
      { text: 'Red', slot: near(25) },
      { text: 'Violet', slot: near(290) },
    ],
    hub: RING.hub * Ro,
    pointer: RING.pointer * Ro,
    text,
    compact: !fixed,
  };
}

export const slotDeg = (L: WheelLayout) => 360 / L.outer.length;

/** The outer slot under the pointer for a spin of theta degrees. */
export function activeSlot(L: WheelLayout, theta: number) {
  const n = L.outer.length;
  return (((Math.round(-theta / slotDeg(L)) % n) + n) % n);
}

/** Where every chip sits for a spin of theta degrees (12 o'clock = 0, clockwise); always upright. */
export function wheelTargets(L: WheelLayout, theta: number): Target[] {
  const t: Target[] = new Array(N);
  const ring = (ids: number[], R: number, d: number, z: number) =>
    ids.forEach((i, k) => {
      const a = (((k * 360) / ids.length + theta) * Math.PI) / 180;
      t[i] = { cx: L.cx + R * Math.sin(a), cy: L.cy - R * Math.cos(a), size: d, rot: 0, z };
    });
  ring(L.outer, L.Ro, L.dOuter, 20);
  ring(L.inner, L.Ri, L.dInner, 16);
  return t;
}
