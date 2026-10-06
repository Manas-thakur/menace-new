import { memo } from 'react';
import { deepCut } from '../../data/deep';

/* Side B — an original vinyl record, drawn on a 1000-unit board centred at 500,500.
 * From the rim in: music grooves, then the smooth dead wax (the run-out groove,
 * where an etched message turns with the disc), the lock groove, and the label. */

const C = 500;

// Deterministic irregularity so the grooves read as pressed vinyl, not a target.
function lcg(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
}

const LAST_GROOVE = 240;
const LOCK_GROOVE = 182;
const TRACK_GAPS = [292, 364, 430];

const grooves = (() => {
  const rand = lcg(42);
  const rings: { r: number; o: number; w: number }[] = [];
  for (let r = LAST_GROOVE; r < 482; r += 4.4) {
    if (TRACK_GAPS.some((g) => Math.abs(r - g) < 5.5)) continue;
    rings.push({ r: +r.toFixed(1), o: +(0.45 + rand() * 0.55).toFixed(2), w: +(0.7 + rand() * 1.1).toFixed(2) });
  }
  return rings;
})();

// Light catching the grooves; these arcs travel with the disc so the spin reads.
const glints = [
  { r: 256, a0: 196, a1: 248, w: 2.4 },
  { r: 268, a0: 18, a1: 64, w: 1.8 },
  { r: 318, a0: 228, a1: 300, w: 2.6 },
  { r: 344, a0: 96, a1: 132, w: 1.6 },
  { r: 398, a0: 300, a1: 352, w: 2.2 },
  { r: 452, a0: 150, a1: 214, w: 2.8 },
  { r: 470, a0: 24, a1: 52, w: 1.6 },
];

const pt = (r: number, deg: number) => {
  const t = (deg * Math.PI) / 180;
  return `${(C + r * Math.cos(t)).toFixed(1)} ${(C + r * Math.sin(t)).toFixed(1)}`;
};

function arc(r: number, a0: number, a1: number) {
  return `M${pt(r, a0)}A${r} ${r} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${pt(r, a1)}`;
}

// The lead-out: the stylus' last spiral from the music into the lock groove.
const leadOut = (() => {
  const steps = 72;
  let d = '';
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    d += `${i ? 'L' : 'M'}${pt(LAST_GROOVE - 3 - t * (LAST_GROOVE - 3 - LOCK_GROOVE), -30 + t * 400)}`;
  }
  return d;
})();

/**
 * The run-out etching: the message repeats around the dead wax so that wherever
 * the disc comes to rest, one copy sits within half a slot of the top.
 * Angles are SVG degrees (clockwise from +x); copy 0 is centred at the top at rest.
 */
export const ETCH = { copies: 6, r: 204, slot: 60, fill: 0.88 } as const;
const ETCH_START = -90 - (ETCH.fill / 2) * ETCH.slot;
export const etchMid = (k: number) => ETCH_START + (k + ETCH.fill / 2) * ETCH.slot;
export const ETCH_HALF = (ETCH.fill / 2) * ETCH.slot;
const ETCH_SLOT_LEN = (2 * Math.PI * ETCH.r) / ETCH.copies;
const etchRing = `M${pt(ETCH.r, ETCH_START)}A${ETCH.r} ${ETCH.r} 0 1 1 ${pt(ETCH.r, ETCH_START + 180)}A${ETCH.r} ${ETCH.r} 0 1 1 ${pt(ETCH.r, ETCH_START + 360)}`;

export const Record = memo(function Record({ className = '' }: { className?: string }) {
  const etching = deepCut('deadwax').lines[0].text;
  const copies = Array.from({ length: ETCH.copies }, (_, k) => k);

  return (
    <svg className={`record ${className}`} viewBox="0 0 1000 1000" aria-hidden="true" focusable="false">
      <defs>
        {/* Label text runs over the top, left to right… */}
        <path id="record-arc-top" d={`M${C - 138} ${C}A138 138 0 0 1 ${C + 138} ${C}`} />
        {/* …and upright along the bottom. */}
        <path id="record-arc-bottom" d={`M${C - 146} ${C}A146 146 0 0 0 ${C + 146} ${C}`} />
        <path id="record-etch-ring" d={etchRing} />
        <radialGradient id="record-etch-light">
          <stop offset="0" className="record__light-core" />
          <stop offset="1" className="record__light-edge" />
        </radialGradient>
      </defs>

      <circle className="record__vinyl" cx={C} cy={C} r={498} />
      <circle className="record__lead" cx={C} cy={C} r={489} />

      <g className="record__grooves">
        {grooves.map((g) => (
          <circle key={g.r} cx={C} cy={C} r={g.r} strokeOpacity={g.o} strokeWidth={g.w} />
        ))}
      </g>
      {TRACK_GAPS.map((r) => (
        <circle key={r} className="record__gap" cx={C} cy={C} r={r} />
      ))}
      <g className="record__glints">
        {glints.map((g) => (
          <path key={`${g.r}-${g.a0}`} d={arc(g.r, g.a0, g.a1)} strokeWidth={g.w} />
        ))}
      </g>

      {/* Dead wax: smooth, glossier vinyl between the last groove and the label */}
      <circle className="record__deadwax" cx={C} cy={C} r={(LAST_GROOVE + LOCK_GROOVE) / 2} strokeWidth={LAST_GROOVE - LOCK_GROOVE - 4} />
      <path className="record__leadout" d={leadOut} />
      <circle className="record__lock" cx={C} cy={C} r={LOCK_GROOVE} />

      {/* The etching, incised: a dark lip under a pale scratch */}
      <g className="record__etching">
        {copies.map((k) => (
          <text key={`s${k}`} className="record__etch-lip" dx="0.7" dy="0.7">
            <textPath href="#record-etch-ring" startOffset={`${(k / ETCH.copies) * 100}%`} textLength={ETCH_SLOT_LEN * ETCH.fill} lengthAdjust="spacing">
              {etching}
            </textPath>
          </text>
        ))}
        {copies.map((k) => (
          <text key={k} className="record__etch" data-etch={k}>
            <textPath href="#record-etch-ring" startOffset={`${(k / ETCH.copies) * 100}%`} textLength={ETCH_SLOT_LEN * ETCH.fill} lengthAdjust="spacing">
              {etching}
            </textPath>
          </text>
        ))}
      </g>
      {/* A small light that travels along the etching while it is being read */}
      <g className="record__etch-glint">
        <ellipse cx={C + ETCH.r + 4} cy={C} rx={11} ry={30} fill="url(#record-etch-light)" />
      </g>

      <g className="record__label">
        <circle className="record__label-disc" cx={C} cy={C} r={172} />
        <circle className="record__label-ring" cx={C} cy={C} r={162} />
        <circle className="record__label-ring record__label-ring--inner" cx={C} cy={C} r={58} />
        <text className="record__arc">
          <textPath href="#record-arc-top" startOffset="50%" textAnchor="middle">
            Manas Thakur — Vol. 26
          </textPath>
        </text>
        <text className="record__side" x={C} y={C - 66} textAnchor="middle">
          Side B
        </text>
        <text className="record__stereo" x={C} y={C + 96} textAnchor="middle">
          Stereo
        </text>
        <text className="record__arc record__arc--small">
          <textPath href="#record-arc-bottom" startOffset="50%" textAnchor="middle">
            33⅓ rpm · Delhi × Daegu × Palo Alto
          </textPath>
        </text>
      </g>
      <circle className="record__hole" cx={C} cy={C} r={9} />
    </svg>
  );
});
