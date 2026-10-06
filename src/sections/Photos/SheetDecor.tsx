import type { CSSProperties } from 'react';
import { photos, photoSrc } from '../../data/photos';
import { B, PICKS, noise, type Rect, type SheetLayout, type Target } from './geometry';

/** The light table: a cool diffuser in a dark bezel. */
export function LightTable({ rect, flicker }: { rect: Rect; flicker?: number }) {
  return (
    <div className="dr-table" style={{ left: rect.x, top: rect.y, width: rect.w, height: rect.h }} aria-hidden="true">
      <div key={flicker} className={`dr-table__light ${flicker ? 'is-flicker' : ''}`} />
    </div>
  );
}

/** Six cut strips of colour-negative film: orange base, sprockets, edge printing. */
export function Strips({ layout }: { layout: SheetLayout }) {
  const { f } = layout;
  return (
    <div className="dr-strips" style={{ '--f': `${f}px` } as CSSProperties} aria-hidden="true">
      {layout.strips.map((s, k) => (
        <div
          key={k}
          className="dr-strip"
          style={
            {
              width: s.len,
              height: s.h,
              transform: `translate(${(s.cx - s.len / 2).toFixed(2)}px, ${(s.cy - s.h / 2).toFixed(2)}px) rotate(${s.rot.toFixed(3)}deg)`,
              '--k': k,
            } as CSSProperties
          }
        >
          <span className="dr-strip__edge dr-strip__edge--top">
            {[1, 4].map((j) => (
              <span key={j} className="dr-strip__brand" style={{ left: `${(0.3 + j * 1.1) * f}px` }}>
                MENACE 400
              </span>
            ))}
          </span>
          <span className="dr-strip__edge dr-strip__edge--bottom">
            {Array.from({ length: 6 }, (_, j) => {
              const n = s.first + j + 1;
              return (
                <span key={j}>
                  <span className="dr-strip__num" style={{ left: `${(0.3 + j * 1.1 + 0.08) * f}px` }}>
                    ▸ {n}
                  </span>
                  <span className="dr-strip__num" style={{ left: `${(0.3 + j * 1.1 + 0.68) * f}px` }}>
                    {n}A
                  </span>
                </span>
              );
            })}
          </span>
        </div>
      ))}
    </div>
  );
}

/** Positive copies of every frame, registered exactly over the negatives (for the loupe). */
export function Positives({ layout }: { layout: SheetLayout }) {
  return (
    <div className="dr-positives" aria-hidden="true">
      {layout.targets.map((t, i) => (
        <img
          key={photos[i].slug}
          className="dr-positive"
          src={photoSrc(photos[i].slug, 'sm')}
          width={640}
          height={640}
          alt=""
          decoding="async"
          style={{
            transform: `translate(${(t.cx - B / 2).toFixed(2)}px, ${(t.cy - B / 2).toFixed(2)}px) rotate(${t.rot.toFixed(3)}deg) scale(${(t.size / B).toFixed(5)})`,
          }}
        />
      ))}
    </div>
  );
}

type Pt = [number, number];

/** Smooth a polyline into cubic Béziers (Catmull–Rom). */
function smooth(pts: Pt[]) {
  const f = (n: number) => n.toFixed(1);
  let d = `M${f(pts[0][0])} ${f(pts[0][1])}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    d += `C${f(p1[0] + (p2[0] - p0[0]) / 6)} ${f(p1[1] + (p2[1] - p0[1]) / 6)} ${f(p2[0] - (p3[0] - p1[0]) / 6)} ${f(p2[1] - (p3[1] - p1[1]) / 6)} ${f(p2[0])} ${f(p2[1])}`;
  }
  return d;
}

/**
 * A china-marker loop drawn by hand around a frame: a little lopsided, starting
 * inside the line it ends on, and running on past where it closed.
 */
function loopPath(t: Target, seed: number) {
  const f = t.size;
  const rot = ((t.rot + (noise(seed, 21) - 0.5) * 14) * Math.PI) / 180;
  const rx = 0.56 * f;
  const ry = 0.64 * f;
  const start = noise(seed, 22) * Math.PI * 2;
  const sweep = Math.PI * 2 + 0.38 + noise(seed, 23) * 0.42;
  const n = 30;
  const pts: Pt[] = [];
  for (let k = 0; k <= n; k++) {
    const u = k / n;
    const a = start + sweep * u;
    const wob = 1 + 0.045 * Math.sin(3 * a + seed) + (noise(seed, 30 + k) - 0.5) * 0.04;
    const spiral = 0.95 + 0.11 * u;
    const x = Math.cos(a) * rx * wob * spiral;
    const y = Math.sin(a) * ry * wob * spiral;
    pts.push([t.cx + x * Math.cos(rot) - y * Math.sin(rot), t.cy + x * Math.sin(rot) + y * Math.cos(rot)]);
  }
  return smooth(pts);
}

/** "picks", hand-lettered in one or two strokes per letter, in a 120 × 56 box. */
const PICKS_WORD = [
  'M5 16C5 28 4 40 3 54',
  'M5 22C10 12 23 13 22 25C21 35 10 38 4 31',
  'M31 17C31 24 30 30 32 35C33 37 35 37 37 34',
  'M31.5 6.5l1.2 1.2',
  'M53 20C47 14 38 18 39 27C40 35 48 37 54 32',
  'M60 3C60 15 59 27 60 37',
  'M73 15C69 20 64 24 60 26C65 28 70 33 74 37',
  'M93 18C89 13 81 15 83 21C85 26 93 26 92 32C91 38 83 38 79 34',
];

type GreaseProps = { layout: SheetLayout; setPath?: (k: number, el: SVGPathElement | null) => void };

/** Red china-marker loops around the picks, and a note in the margin. */
export function GreasePencil({ layout, setPath }: GreaseProps) {
  const { f, note } = layout;
  const first = layout.targets[0];
  const k = note.h / 56;
  // an arrow from the note down to the first ring
  const s: Pt = [note.x - 0.1 * f, note.y + 0.5 * note.h];
  const e: Pt = [first.cx + 0.24 * f, first.cy - 0.74 * f];
  const c1: Pt = [s[0] - 0.42 * f, s[1] + 0.02 * f];
  const c2: Pt = [e[0] + 0.1 * f, e[1] - 0.32 * f];
  const ang = Math.atan2(e[1] - c2[1], e[0] - c2[0]);
  const head = (da: number): Pt => [e[0] - Math.cos(ang + da) * 0.2 * f, e[1] - Math.sin(ang + da) * 0.2 * f];
  const h1 = head(0.55);
  const h2 = head(-0.55);
  // stroke order for drawing on: loops, then the word, then the arrow
  const W0 = PICKS;
  const A0 = PICKS + PICKS_WORD.length;
  return (
    <svg className="dr-grease" width={layout.width} height={layout.height} aria-hidden="true" focusable="false">
      <g className="dr-grease__ink" style={{ '--wax-w': `${Math.max(2, 0.05 * f)}px` } as CSSProperties}>
        {layout.targets.slice(0, PICKS).map((t, i) => (
          <path key={i} ref={(el) => setPath?.(i, el)} className="dr-grease__loop" d={loopPath(t, i + 7)} />
        ))}
        <g transform={`translate(${note.x.toFixed(1)} ${note.y.toFixed(1)}) rotate(${note.rot}) scale(${k.toFixed(4)})`}>
          {PICKS_WORD.map((d, j) => (
            <path key={j} ref={(el) => setPath?.(W0 + j, el)} className="dr-grease__note" d={d} />
          ))}
        </g>
        <path
          ref={(el) => setPath?.(A0, el)}
          className="dr-grease__arrow"
          d={`M${s[0].toFixed(1)} ${s[1].toFixed(1)}C${c1[0].toFixed(1)} ${c1[1].toFixed(1)} ${c2[0].toFixed(1)} ${c2[1].toFixed(1)} ${e[0].toFixed(1)} ${e[1].toFixed(1)}`}
        />
        <path
          ref={(el) => setPath?.(A0 + 1, el)}
          className="dr-grease__arrow"
          d={`M${h1[0].toFixed(1)} ${h1[1].toFixed(1)}L${e[0].toFixed(1)} ${e[1].toFixed(1)}L${h2[0].toFixed(1)} ${h2[1].toFixed(1)}`}
        />
      </g>
    </svg>
  );
}

