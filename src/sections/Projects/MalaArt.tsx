import { useId } from 'react';

/* Cover for the hidden station at 108.0: a mala of 108 beads, gold on maroon,
 * with the guru bead at the top where the ring closes. Beads are numbered
 * clockwise from the guru bead so the reveal can count them in, and every 27th
 * carries a marker, as many malas do. Original drawing; decorative. */

const CX = 160;
const CY = 82;
const R = 54;
const COUNT = 108;
const HALF_GAP = 4.6; // degrees left open either side of the guru bead
const PITCH = (360 - HALF_GAP * 2) / (COUNT - 1);

const beads = Array.from({ length: COUNT }, (_, i) => {
  const a = ((-90 + HALF_GAP + i * PITCH) * Math.PI) / 180;
  return {
    x: +(CX + Math.cos(a) * R).toFixed(2),
    y: +(CY + Math.sin(a) * R).toFixed(2),
    marker: (i + 1) % 27 === 0 && i !== COUNT - 1,
  };
});

export function MalaArt() {
  const uid = useId().replace(/:/g, '');
  return (
    <svg className="art mala" viewBox="0 0 320 160" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <radialGradient id={`glow-${uid}`} cx="0.5" cy="0.51" r="0.42">
          <stop offset="0" className="mala__glow-in" />
          <stop offset="1" className="mala__glow-out" />
        </radialGradient>
        <pattern id={`ht-${uid}`} width="6" height="6" patternUnits="userSpaceOnUse">
          <circle cx="3" cy="3" r="1.1" className="mala__dot" />
        </pattern>
      </defs>
      <rect width="320" height="160" className="mala__bg" />
      <rect width="320" height="160" fill={`url(#ht-${uid})`} className="mala__ht" />
      <rect width="320" height="160" fill={`url(#glow-${uid})`} />
      <circle cx={CX} cy={CY} r={R} className="mala__thread" />
      <g className="mala__beads">
        {beads.map((b, i) => (
          <circle key={i} className={`mala__bead ${b.marker ? 'is-marker' : ''}`} cx={b.x} cy={b.y} r={b.marker ? 2.1 : 1.45} />
        ))}
      </g>
      <g className="mala__guru">
        <path className="mala__knot" d={`M${CX} ${CY - R - 4.2}v-5`} />
        <circle cx={CX} cy={CY - R - 0.4} r="3.9" />
      </g>
    </svg>
  );
}
