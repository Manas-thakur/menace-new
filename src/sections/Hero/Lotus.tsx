import type { CSSProperties } from 'react';

/* The near shore of the painting: lotus leaves lying on the water, one open flower,
 * a bud on its stem and another just showing. And out on the lake, three lotus lanterns still burning from
 * the night — the paper lotus of Daegu's lantern festival floated like a diya. */

/** A pointed lotus petal standing on (0, 0), tip at (0, -len). */
function petal(len: number, w: number) {
  return `M0 0 C ${w} ${-len * 0.32}, ${w * 0.62} ${-len * 0.82}, 0 ${-len} C ${-w * 0.62} ${-len * 0.82}, ${-w} ${-len * 0.32}, 0 0 Z`;
}

/** A leaf lying on the water, seen low and flat, with its notch towards us. */
function pad(cx: number, cy: number, rx: number, ry: number, notch = 0.9) {
  const a = Math.PI / 2 - 0.08 * notch;
  const b = Math.PI / 2 + 0.08 * notch;
  const p = (t: number) => `${(cx + Math.cos(t) * rx).toFixed(1)} ${(cy + Math.sin(t) * ry).toFixed(1)}`;
  return `M${cx} ${(cy + ry * 0.12).toFixed(1)} L${p(a)} A ${rx} ${ry} 0 1 0 ${p(b)} Z`;
}

/** The far rim of a leaf, where the dawn catches it. */
function rim(cx: number, cy: number, rx: number, ry: number) {
  const p = (t: number) => `${(cx + Math.cos(t) * rx).toFixed(1)} ${(cy + Math.sin(t) * ry).toFixed(1)}`;
  return `M${p(Math.PI * 1.08)} A ${rx} ${ry} 0 0 1 ${p(Math.PI * 1.92)}`;
}

function veins(cx: number, cy: number, rx: number, ry: number) {
  let d = '';
  for (let i = 0; i < 11; i++) {
    const t = Math.PI / 2 + 0.3 + (i / 10) * (Math.PI * 2 - 0.6);
    d += `M${cx} ${cy}L${(cx + Math.cos(t) * rx * 0.88).toFixed(1)} ${(cy + Math.sin(t) * ry * 0.88).toFixed(1)}`;
  }
  return d;
}

function Leaf({ cx, cy, rx, ry, notch }: { cx: number; cy: number; rx: number; ry: number; notch?: number }) {
  return (
    <g>
      <path className="lotus__pad" d={pad(cx, cy, rx, ry, notch)} />
      <path className="lotus__vein" d={veins(cx, cy, rx, ry)} />
      <path className="lotus__rim" d={rim(cx, cy, rx, ry)} />
    </g>
  );
}

function Flower({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  const back = [-58, -30, 0, 30, 58];
  const front = [-70, -42, -14, 14, 42, 70];
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      {back.map((a) => (
        <path key={`b${a}`} className="lotus__petal lotus__petal--back" d={petal(50, 14)} transform={`rotate(${a})`} />
      ))}
      <ellipse className="lotus__seed" cx="0" cy="-20" rx="13" ry="5" />
      {[-10, -5, 0, 5, 10].map((dx) => (
        <circle key={dx} className="lotus__stamen" cx={dx} cy={-24 - Math.abs(dx) * 0.2} r="1.4" />
      ))}
      {front.map((a) => (
        <path key={`f${a}`} className="lotus__petal" d={petal(38, 15)} transform={`translate(0 6) rotate(${a})`} />
      ))}
    </g>
  );
}

function Bud({ x, y, s = 1, tilt = 0 }: { x: number; y: number; s?: number; tilt?: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${tilt}) scale(${s})`}>
      <path className="lotus__petal lotus__petal--back" d={petal(44, 13)} transform="rotate(-6)" />
      <path className="lotus__petal" d={petal(38, 13)} transform="translate(-2 2) rotate(14)" />
      <path className="lotus__petal" d={petal(36, 11)} transform="translate(2 3) rotate(-18)" />
    </g>
  );
}

export function LotusShore({ className = '' }: { className?: string }) {
  return (
    <svg className={`lotus ${className}`} viewBox="0 0 420 260" preserveAspectRatio="xMaxYMax meet" aria-hidden="true" focusable="false">
      <defs>
        {/* petals: cream at the heart, rose towards the tip */}
        <linearGradient id="lotus-petal" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" className="lotus__stop-heart" />
          <stop offset="0.55" className="lotus__stop-petal" />
          <stop offset="1" className="lotus__stop-tip" />
        </linearGradient>
        <linearGradient id="lotus-leaf" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" className="lotus__stop-leaf-lit" />
          <stop offset="0.3" className="lotus__stop-leaf" />
          <stop offset="1" className="lotus__stop-leaf-deep" />
        </linearGradient>
      </defs>
      <Leaf cx={336} cy={150} rx={52} ry={10} />
      <g className="lotus__sway loop">
        <path className="lotus__stalk" d="M326 212 C 330 172, 324 128, 336 96" />
        <Bud x={336} y={98} />
      </g>
      <Leaf cx={118} cy={232} rx={70} ry={15} notch={1.2} />
      <path className="lotus__stalk" d="M152 230 C 150 220, 152 210, 150 198" />
      <Bud x={150} y={200} s={0.62} tilt={-8} />
      <Leaf cx={246} cy={210} rx={112} ry={26} />
      <Flower x={232} y={204} />
      <Leaf cx={392} cy={248} rx={122} ry={30} notch={1.1} />
    </svg>
  );
}

type LanternSpot = { left: string; depth: number; drift: number; dur: number; delay: number };

/** Where each lantern floats: left edge in % of the painting, depth 0 (far) – 1 (near). */
const LANTERNS: LanternSpot[] = [
  { left: '21%', depth: 0.1, drift: 26, dur: 38, delay: -9 },
  { left: '80%', depth: 0.3, drift: -34, dur: 46, delay: -21 },
  { left: '64%', depth: 0.62, drift: 30, dur: 52, delay: -4 },
];

export function Lanterns() {
  return (
    <div className="lanterns" aria-hidden="true">
      {LANTERNS.map((l, i) => (
        <span
          key={i}
          className="lantern loop"
          style={
            {
              left: l.left,
              ['--depth' as string]: l.depth,
              ['--drift' as string]: `${l.drift}px`,
              ['--dur' as string]: `${l.dur}s`,
              ['--delay' as string]: `${l.delay}s`,
            } as CSSProperties
          }
        >
          <span className="lantern__streak" />
          <span className="lantern__glow" />
          <svg className="lantern__art" viewBox="-30 -40 60 48" focusable="false">
            <ellipse className="lantern__leaf" cx="0" cy="3" rx="27" ry="4.5" />
            {[-48, -24, 0, 24, 48].map((a) => (
              <path key={`b${a}`} className="lantern__petal-back" d={petal(30, 9)} transform={`rotate(${a})`} />
            ))}
            <ellipse className="lantern__light" cx="0" cy="-12" rx="9" ry="7" />
            {[-60, -30, 0, 30, 60].map((a) => (
              <path key={`f${a}`} className="lantern__petal" d={petal(22, 9.5)} transform={`translate(0 3) rotate(${a})`} />
            ))}
          </svg>
        </span>
      ))}
    </div>
  );
}
