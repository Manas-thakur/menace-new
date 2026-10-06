// Edge printing: a line pressed into the film's rebate, beside the MENACE 400 marks.
// At normal size it is texture; under the loupe it reads. Deep cut "becoming".
import { deepCut } from '../../data/deep';
import type { SheetLayout } from './geometry';

export const EDGE_CUT = deepCut('becoming');

/** Share Tech Mono's advance (em) plus the edge print's tracking; one line height. */
const ADV = 0.54;
const TRACK = 0.04;
export const EDGE_LH = 1.08;

/** Which strips carry the line, and above which of their frames (desktop). Strips
 *  four and five: no picks there, so no grease-pencil rings across the rebate. */
const SPOTS = [
  { strip: 3, slot: 2 },
  { strip: 4, slot: 2 },
];

export type EdgePrint = {
  strip: number;
  /** The block in its strip's own frame: px from the strip's top-left, before rotation. */
  x: number;
  y: number;
  w: number;
  h: number;
  /** Font size, px. */
  fs: number;
  rows: string[];
  /** On narrow strips the line takes the place of the second MENACE 400. */
  dropsBrand: boolean;
};

/** Two rows broken at the word that keeps them most even. */
function twoRows(text: string): string[] {
  const words = text.split(' ');
  let best = [text];
  let bestLen = Infinity;
  for (let k = 1; k < words.length; k++) {
    const rows = [words.slice(0, k).join(' '), words.slice(k).join(' ')];
    const len = Math.max(rows[0].length, rows[1].length);
    if (len < bestLen) {
      bestLen = len;
      best = rows;
    }
  }
  return best;
}

/**
 * Where the line sits on this sheet. The top rebate runs 0.27 of a frame: sprocket
 * holes to 0.135, then a band up to the image where the edge marks print. Desktop:
 * two rows, so the whole sentence fits inside the lens. Phones: one row, read by
 * sliding the loupe along it. Sizes keep it at 9–13px under a 2.4× lens.
 */
export function edgePrints(L: SheetLayout): EdgePrint[] {
  const text = EDGE_CUT.lines[0].text;
  const { f } = L;
  const band = 0.135 * f;
  if (!L.compact) {
    const fs = Math.min(Math.max(0.055 * f, 3.75), 5.5);
    const rows = twoRows(text);
    const w = Math.max(...rows.map((r) => r.length)) * (ADV + TRACK) * fs;
    const h = rows.length * fs * EDGE_LH;
    const y = band + Math.max(0, (band - h) / 2);
    return SPOTS.map(({ strip, slot }) => ({ strip, x: (0.3 + slot * 1.1 + 0.08) * f, y, w, h, fs, rows, dropsBrand: false }));
  }
  const fs = Math.max(0.09 * f, 3.4);
  const w = text.length * (ADV + TRACK) * fs;
  const h = fs * EDGE_LH;
  const x = 2.05 * f; // just after the first MENACE 400
  const y = band + Math.max(0, (band - h) / 2);
  return SPOTS.map(({ strip }) => ({ strip, x, y, w, h, fs, rows: [text], dropsBrand: x + w > 4.62 * f }));
}

/** A point on the sheet in a strip's own (unrotated) frame. */
function toStrip(L: SheetLayout, strip: number, x: number, y: number) {
  const s = L.strips[strip];
  const a = (-s.rot * Math.PI) / 180;
  const dx = x - s.cx;
  const dy = y - s.cy;
  return { u: dx * Math.cos(a) - dy * Math.sin(a) + s.len / 2, v: dx * Math.sin(a) + dy * Math.cos(a) + s.h / 2 };
}

/** Index of the edge print under a point on the sheet (with a little give), or -1. */
export function edgeAt(L: SheetLayout, prints: EdgePrint[], x: number, y: number) {
  const px = 0.1 * L.f;
  const py = 0.14 * L.f;
  return prints.findIndex((e) => {
    const { u, v } = toStrip(L, e.strip, x, y);
    return u >= e.x - px && u <= e.x + e.w + px && v >= e.y - py && v <= e.y + e.h + py;
  });
}

/** The centre of an edge print, on the sheet. */
export function edgeCentre(L: SheetLayout, e: EdgePrint) {
  const s = L.strips[e.strip];
  const a = (s.rot * Math.PI) / 180;
  const lx = e.x + e.w / 2 - s.len / 2;
  const ly = e.y + e.h / 2 - s.h / 2;
  return { x: s.cx + lx * Math.cos(a) - ly * Math.sin(a), y: s.cy + lx * Math.sin(a) + ly * Math.cos(a), rot: s.rot };
}
