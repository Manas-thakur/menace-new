import type { Sun } from '../../../lib/delhiSky';
import type { Light } from './light';

/* The garden in front of the tomb, in the painting's own units (1600 × 700, the ground
 * line of the tomb's platform at y 540), drawn in perspective from a standing eye:
 * everything on the ground runs back to one vanishing point on the horizon. Painted
 * like a poster: flat inks, each clump of leaves lit on the side the light comes from. */

export const VP = { x: 800, y: 516 };
const BOTTOM = 700;
const f = (n: number) => Math.round(n * 10) / 10;

/** Seeded, so the same garden grows every time. */
function rng(seed: number) {
  return () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
}

const circle = (x: number, y: number, r: number) => `M${f(x - r)} ${f(y)}a${f(r)} ${f(r)} 0 1 0 ${f(2 * r)} 0a${f(r)} ${f(r)} 0 1 0 ${f(-2 * r)} 0Z`;

/** Where a strip of ground `half` wide (at the front edge) is at height y: its half-width there. */
const along = (half: number, y: number) => (half * (y - VP.y)) / (BOTTOM - VP.y);

/** The light's direction across the picture (x right, y down), for which side of a tree is lit. */
function lightIn2D(light: Light) {
  const l = Math.hypot(light.s.u, light.s.v) || 1;
  return { x: light.s.u / l, y: -light.s.v / l };
}

type TreeSpec = { x: number; ground: number; h: number; w: number; seed: number; lean: number };

/** A broad garden tree, printed in three greens: the whole crown as one scalloped mass in
 * the deep ink, a smaller one in the middle ink set towards the light, a smaller one again
 * in the light ink, then a scatter of leaf strokes. A trunk forks up into it. */
function tree({ x, ground, h, w, seed, lean }: TreeSpec, light: Light) {
  const r = rng(seed);
  const L = lightIn2D(light);
  // with the light behind the tree, only a rim of it catches
  const back = light.s.w < 0 || light.flood;
  const cx = x + lean;
  const cy = ground - h * 0.6;
  const rx = w / 2;
  const ry = h * 0.4;

  /** A scalloped crown: billows round the rim of an ellipse, filled in. */
  const crown = (ox: number, oy: number, k: number) => {
    let d = `M${f(ox - rx * k * 0.78)} ${f(oy)}a${f(rx * k * 0.78)} ${f(ry * k * 0.74)} 0 1 0 ${f(rx * k * 1.56)} 0a${f(rx * k * 0.78)} ${f(ry * k * 0.74)} 0 1 0 ${f(-rx * k * 1.56)} 0Z`;
    const n = 15;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + (r() - 0.5) * 0.3;
      const br = (0.2 + r() * 0.1) * rx * k;
      d += circle(ox + Math.cos(a) * rx * k * 0.78, oy + Math.sin(a) * ry * k * 0.74, br);
    }
    return d;
  };
  const shift = back ? 0.34 : 0.2;
  const deep = crown(cx, cy, 1);
  const mid = crown(cx + L.x * rx * shift, cy + L.y * ry * shift, back ? 0.86 : 0.8);
  const lit = crown(cx + L.x * rx * shift * 1.9, cy + L.y * ry * shift * 1.9, back ? 0.74 : 0.52);
  // leaf strokes: little arcs, mostly over the lit side
  let leaves = '';
  for (let i = 0; i < 46; i++) {
    const a = r() * Math.PI * 2;
    const d = Math.sqrt(r()) * 0.86;
    const px = cx + Math.cos(a) * d * rx * 0.86;
    const py = cy + Math.sin(a) * d * ry * 0.82;
    const s = rx * (0.035 + r() * 0.025);
    leaves += `M${f(px - s)} ${f(py)}q${f(s)} ${f(-s * 0.9)} ${f(2 * s)} 0`;
  }

  const tw = w * 0.05;
  const trunk =
    `M${f(x - tw)} ${ground}C${f(x - tw * 0.8)} ${f(ground - h * 0.25)} ${f(cx - tw * 0.7)} ${f(cy + ry * 0.3)} ${f(cx - tw * 0.35)} ${f(cy)}` +
    `H${f(cx + tw * 0.35)}C${f(cx + tw * 0.7)} ${f(cy + ry * 0.3)} ${f(x + tw * 0.8)} ${f(ground - h * 0.25)} ${f(x + tw)} ${ground}Z` +
    `M${f(cx - tw * 0.3)} ${f(cy + ry * 0.45)}Q${f(cx - rx * 0.3)} ${f(cy + ry * 0.1)} ${f(cx - rx * 0.55)} ${f(cy - ry * 0.25)}l${f(tw * 0.5)} ${f(tw * 0.2)}Q${f(cx - rx * 0.25)} ${f(cy + ry * 0.2)} ${f(cx)} ${f(cy + ry * 0.6)}Z` +
    `M${f(cx + tw * 0.3)} ${f(cy + ry * 0.35)}Q${f(cx + rx * 0.28)} ${f(cy)} ${f(cx + rx * 0.5)} ${f(cy - ry * 0.35)}l${f(-tw * 0.45)} ${f(tw * 0.15)}Q${f(cx + rx * 0.22)} ${f(cy + ry * 0.1)} ${f(cx)} ${f(cy + ry * 0.5)}Z`;
  // the lit side of the trunk
  const side = L.x >= 0 ? 1 : -1;
  const bark = `M${f(x + side * tw * 0.15)} ${ground}C${f(x + side * tw * 0.1)} ${f(ground - h * 0.25)} ${f(cx)} ${f(cy + ry * 0.3)} ${f(cx + side * tw * 0.05)} ${f(cy)}H${f(cx + side * tw * 0.35)}C${f(cx + side * tw * 0.7)} ${f(cy + ry * 0.3)} ${f(x + side * tw * 0.8)} ${f(ground - h * 0.25)} ${f(x + side * tw)} ${ground}Z`;
  return { deep, mid, lit, leaves, trunk, bark };
}

/** A clipped cypress (thuja), the dark flame-shaped shrubs dotted over Mughal lawns: lit on
 * one half, with the chevrons of its sprays. */
function cypress(x: number, ground: number, h: number, light: Light) {
  const w = h * 0.36;
  const L = lightIn2D(light);
  const side = L.x >= 0 ? 1 : -1;
  const top = ground - h;
  const body = `M${f(x - w * 0.42)} ${f(ground)}C${f(x - w * 0.62)} ${f(ground - h * 0.3)} ${f(x - w * 0.42)} ${f(top + h * 0.35)} ${f(x)} ${f(top)}C${f(x + w * 0.42)} ${f(top + h * 0.35)} ${f(x + w * 0.62)} ${f(ground - h * 0.3)} ${f(x + w * 0.42)} ${f(ground)}Z`;
  const half = `M${f(x)} ${f(ground)}V${f(top)}C${f(x + side * w * 0.42)} ${f(top + h * 0.35)} ${f(x + side * w * 0.62)} ${f(ground - h * 0.3)} ${f(x + side * w * 0.42)} ${f(ground)}Z`;
  const marks = Array.from({ length: 5 }, (_, i) => {
    const y = top + h * (0.24 + i * 0.15);
    const s = w * (0.12 + i * 0.03);
    return `M${f(x - s)} ${f(y + s * 0.6)}L${f(x)} ${f(y)}L${f(x + s)} ${f(y + s * 0.6)}`;
  }).join('');
  return { body, half, marks };
}

/** Where a tree's shadow falls on the grass: away from the sun, flattened by the view. */
function shadowOf(x: number, ground: number, w: number, sun: Sun, light: Light) {
  if (light.flood || light.direct < 0.05) return '';
  const az = (sun.azimuth * Math.PI) / 180;
  const reach = Math.min(3, 1 / Math.tan(Math.max(0.14, (sun.altitude * Math.PI) / 180)));
  const depth = (ground - VP.y) / (BOTTOM - VP.y); // nearer things' shadows look longer
  // looking west: a shadow pointing north runs right, one pointing east runs towards us
  const dx = -Math.cos(az) * reach * w * 0.5;
  const dy = -Math.sin(az) * reach * w * 0.14 * depth;
  const rx = w * 0.5 + Math.abs(dx) * 0.5;
  const ry = w * 0.07 * (0.6 + depth) + Math.abs(dy) * 0.5;
  return `M${f(x + dx / 2 - rx)} ${f(ground + dy / 2)}a${f(rx)} ${f(ry)} 0 1 0 ${f(2 * rx)} 0a${f(rx)} ${f(ry)} 0 1 0 ${f(-2 * rx)} 0Z`;
}

/** The line of trees beyond the garden wall, paled by the distance. */
const FAR = (() => {
  const r = rng(91);
  let back = '';
  let front = '';
  for (let x = -980; x < 2600; ) {
    const big = r() > 0.82;
    const rad = big ? 44 + r() * 26 : 22 + r() * 20;
    back += circle(x, 522 - rad * (0.6 + r() * 0.4) - (big ? 22 : 0), rad);
    x += rad * (1 + r() * 0.5);
  }
  for (let x = -960; x < 2600; ) {
    const rad = 16 + r() * 16;
    front += circle(x, 528 - rad * 0.5, rad);
    x += rad * (1.1 + r() * 0.6);
  }
  return { back: back + 'M-1000 516H2620V545H-1000Z', front: front + 'M-1000 524H2620V545H-1000Z' };
})();

/** Two big trees framing the view, and two further off that only wide windows show. */
const TREES: TreeSpec[] = [
  { x: -330, ground: 600, h: 420, w: 380, seed: 33, lean: 10 },
  { x: 1940, ground: 604, h: 430, w: 390, seed: 45, lean: -8 },
  { x: 118, ground: 672, h: 500, w: 400, seed: 7, lean: 22 },
  { x: 1484, ground: 680, h: 520, w: 420, seed: 19, lean: -26 },
];
const SHRUBS = [
  { x: 548, y: 562, h: 54 },
  { x: 1052, y: 562, h: 54 },
  { x: 330, y: 598, h: 94 },
  { x: 1270, y: 598, h: 94 },
];

export function FarTrees() {
  return (
    <g className="garden__far">
      <path className="garden__far-back" d={FAR.back} />
      <path className="garden__far-front" d={FAR.front} />
    </g>
  );
}

export function Lawn() {
  return (
    <>
      <rect className="garden__grass-far" x="-1000" y={VP.y} width="3620" height={BOTTOM - VP.y + 4} />
      <rect className="garden__grass" x="-1000" y="556" width="3620" height={BOTTOM - 556 + 4} />
    </>
  );
}

export function Garden({ light, sun }: { light: Light; sun: Sun }) {
  const path = along(200, BOTTOM);
  const at = (y: number, half: number) => along(half, y);
  const cross = 549;
  const strip = (half: number) => `M${f(VP.x - at(cross, half))} ${cross}L${VP.x - half} ${BOTTOM + 4}H${VP.x + half}L${f(VP.x + at(cross, half))} ${cross}Z`;
  const edges = `M${f(VP.x - at(cross, path))} ${cross}L${VP.x - path} ${BOTTOM + 4}M${f(VP.x + at(cross, path))} ${cross}L${VP.x + path} ${BOTTOM + 4}`;
  const trees = TREES.map((t) => tree(t, light));
  const shrubs = SHRUBS.map((s) => cypress(s.x, s.y, s.h, light));
  const shadows =
    TREES.map((t) => shadowOf(t.x + t.lean * 0.5, t.ground, t.w * 0.8, sun, light)).join('') +
    SHRUBS.map((s) => shadowOf(s.x, s.y, s.h * 0.4, sun, light)).join('');

  return (
    <g className="garden">
      {/* the walk across the front of the platform, and the long walk to the gate */}
      <path className="garden__walk" d={`M-1000 540.5H2620V${cross + 1}H-1000Z`} />
      <path className="garden__walk" d={strip(path)} />
      <path className="garden__walk-edge" d={edges + `M-1000 ${cross}H${f(VP.x - at(cross, path))}M${f(VP.x + at(cross, path))} ${cross}H2620`} />
      {/* the water channel down its middle, holding the sky */}
      <path className="garden__coping" d={strip(26)} />
      <path className="garden__water" d={strip(17)} />
      <path className="garden__glint" d={strip(5)} />
      <path className="garden__shadow" d={shadows} />
      {shrubs.map((s, i) => (
        <g key={i}>
          <path className="garden__shrub" d={s.body} />
          <path className="garden__shrub-lit" d={s.half} />
          <path className="garden__shrub-marks" d={s.marks} />
        </g>
      ))}
      {trees.map((t, i) => (
        <g key={i} className={`garden__tree ${i < 2 ? 'garden__tree--back' : ''}`}>
          <path className="garden__trunk" d={t.trunk} />
          <path className="garden__bark" d={t.bark} />
          <clipPath id={`crown-${i}`}>
            <path d={t.deep} />
          </clipPath>
          <path className="garden__leaves" d={t.deep} />
          <g clipPath={`url(#crown-${i})`}>
            <path className="garden__leaves-mid" d={t.mid} />
            <path className="garden__leaves-lit" d={t.lit} />
          </g>
          <path className="garden__leaf-marks" d={t.leaves} />
        </g>
      ))}
    </g>
  );
}
