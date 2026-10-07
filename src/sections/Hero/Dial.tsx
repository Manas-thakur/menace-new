import { useId } from 'react';
import { scrollToSection } from '../../lib/scroll';

/* The vinyl dial: concentric record rings, each one a link, each spinning at its
 * own speed and direction (studied from the reference's concentric disc nav).
 * Geometry lives in one 1000-unit space; every ring's SVG crops to its own disc. */

type Ring = {
  id: string;
  label: string;
  repeat: number;
  outer: number; // outer radius in the 1000-unit space
  inner: number; // radius where the next disc starts
  tone: 'dark' | 'light' | 'deep' | 'label';
  speed: number; // seconds per revolution
  reverse?: boolean;
};

const RINGS: Ring[] = [
  { id: 'projects', label: 'Projects', repeat: 4, outer: 500, inner: 410, tone: 'dark', speed: 110 },
  { id: 'work', label: 'Work', repeat: 6, outer: 410, inner: 322, tone: 'light', speed: 86, reverse: true },
  { id: 'press', label: 'Press', repeat: 5, outer: 322, inner: 236, tone: 'dark', speed: 68 },
  { id: 'about', label: 'About', repeat: 4, outer: 236, inner: 150, tone: 'deep', speed: 52, reverse: true },
  { id: 'contact', label: 'Say hello', repeat: 2, outer: 150, inner: 58, tone: 'label', speed: 40 },
];

function RingFace({ ring }: { ring: Ring }) {
  const uid = useId().replace(/:/g, '');
  const pathId = `dial-path-${uid}`;
  const thickness = ring.outer - ring.inner;
  const font = thickness * (ring.tone === 'label' ? 0.34 : 0.56);
  // centre the caps (≈0.7 em tall) inside the band; glyphs grow outward from the baseline
  const r = (ring.outer + ring.inner) / 2 - font * 0.35;
  const circumference = 2 * Math.PI * r;
  const text = Array.from({ length: ring.repeat }, () => `${ring.label.toUpperCase()}  •  `).join('');
  const box = `${500 - ring.outer} ${500 - ring.outer} ${ring.outer * 2} ${ring.outer * 2}`;
  const grooves = ring.tone === 'label' ? [] : [0.18, 0.5, 0.82].map((t) => ring.inner + thickness * t);

  return (
    <svg className={`dial__face loop ${ring.reverse ? 'is-reverse' : ''}`} viewBox={box} style={{ ['--spin' as string]: `${ring.speed}s` }} aria-hidden="true">
      <defs>
        <path id={pathId} d={`M${500 - r} 500a${r} ${r} 0 1 1 ${r * 2} 0a${r} ${r} 0 1 1 ${-r * 2} 0`} />
      </defs>
      <circle className="dial__bg" cx="500" cy="500" r={ring.outer} />
      {grooves.map((gr) => (
        <circle key={gr} className="dial__groove" cx="500" cy="500" r={gr} />
      ))}
      <text className="dial__text" fontSize={font}>
        <textPath href={`#${pathId}`} textLength={circumference - 1} lengthAdjust="spacing">
          {text}
        </textPath>
      </text>
    </svg>
  );
}

export function Dial() {
  return (
    <nav className="dial" aria-label="Sections (record dial)">
      {RINGS.map((ring, i) => (
        <a
          key={ring.id}
          href={`#${ring.id}`}
          className={`dial__ring dial__ring--${ring.tone}`}
          style={{ ['--size' as string]: `${(ring.outer / 500) * 100}%`, zIndex: i + 1 }}
          onClick={(e) => {
            e.preventDefault();
            scrollToSection(ring.id);
          }}
        >
          {/* named by real text; the spinning repeated label is decoration */}
          <span className="visually-hidden">{ring.label}</span>
          <RingFace ring={ring} />
        </a>
      ))}
      <i className="perch perch--record" data-perch="record" aria-hidden="true" />
      <span className="dial__spindle" aria-hidden="true">
        <i />
      </span>
      <Tonearm />
    </nav>
  );
}

/* A tonearm reaching in from beyond the top edge, drawn in the dial's own 1000-unit
 * space. Pivot (420, -20); the stylus lands on the outer band at 200° (radius 455):
 * (72.4, 344.4). The tube runs 84% of that span, the headshell carries the rest. */
const PIVOT = { x: 420, y: -20 };
const STYLUS = { x: 72.4, y: 344.4 };
const ARM_ANGLE = (Math.atan2(STYLUS.y - PIVOT.y, STYLUS.x - PIVOT.x) * 180) / Math.PI - 90; // from +y
const ARM_LEN = Math.hypot(STYLUS.x - PIVOT.x, STYLUS.y - PIVOT.y);
const JOINT = ARM_LEN * 0.84;

function Tonearm() {
  return (
    <svg className="dial__arm" viewBox="0 0 1000 1000" aria-hidden="true">
      {/* the outer group is what the intro swings; the inner one holds the resting pose */}
      <g className="dial__arm-swing">
      <g transform={`translate(${PIVOT.x} ${PIVOT.y}) rotate(${ARM_ANGLE})`}>
        {/* counterweight + pivot housing */}
        <rect className="dial__arm-weight" x={-26} y={-120} width={52} height={70} rx={10} />
        <circle className="dial__arm-base" r={44} />
        <circle className="dial__arm-ring" r={30} />
        <circle className="dial__arm-cap" r={13} />
        {/* tube */}
        <rect className="dial__arm-tube" x={-6} y={0} width={12} height={JOINT + 4} rx={6} />
        <rect className="dial__arm-collar" x={-9} y={JOINT - 10} width={18} height={14} rx={3} />
        {/* headshell, cartridge and stylus; the tip sits exactly at ARM_LEN */}
        <g transform={`translate(0 ${JOINT})`}>
          <path className="dial__arm-lift" d="M15 8l40-14 4 10-40 18z" />
          <path className="dial__arm-shell" d={`M-16 0h32l6 ${ARM_LEN - JOINT - 18}h-44z`} />
          <rect className="dial__arm-cart" x={-14} y={ARM_LEN - JOINT - 34} width={28} height={24} rx={3} />
          <path className="dial__arm-stylus" d={`M0 ${ARM_LEN - JOINT - 10}V${ARM_LEN - JOINT}`} />
        </g>
      </g>
      </g>
    </svg>
  );
}
