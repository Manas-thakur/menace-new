import { useId, type CSSProperties, type ReactNode } from 'react';
import type { Motif } from '../../data/profile';

/* Duotone cover art for each station — original geometric drawings, two token
 * colours plus a halftone wash. Purely decorative (the card text carries the facts). */

const PALETTE: Record<Motif, { bg: string; fg: string }> = {
  shield: { bg: 'var(--color-crimson-deep)', fg: 'var(--color-gold)' },
  track: { bg: 'var(--color-ink)', fg: 'var(--color-paper-3)' },
  wave: { bg: 'var(--color-indigo-night)', fg: 'var(--color-phosphor)' },
  strata: { bg: 'var(--color-terracotta)', fg: 'var(--color-mustard)' },
  crane: { bg: 'var(--color-saffron)', fg: 'var(--color-ink)' },
  pages: { bg: 'var(--color-violet)', fg: 'var(--color-lilac)' },
  flame: { bg: 'var(--color-maroon-deep)', fg: 'var(--color-tape)' },
};

const rays = (cx: number, cy: number, n: number, r0: number, r1: number) =>
  Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2;
    return `M${(cx + Math.cos(a) * r0).toFixed(1)} ${(cy + Math.sin(a) * r0).toFixed(1)}L${(cx + Math.cos(a) * r1).toFixed(1)} ${(cy + Math.sin(a) * r1).toFixed(1)}`;
  }).join('');

const zigzag = (x0: number, x1: number, yA: number, yB: number, step: number) => {
  let d = `M${x0} ${yA}`;
  let up = false;
  for (let x = x0 + step; x <= x1 + 0.1; x += step) {
    d += `L${x} ${up ? yA : yB}`;
    up = !up;
  }
  return d;
};

const zigzagV = (y0: number, y1: number, xA: number, xB: number, step: number) => {
  let d = `M${xA} ${y0}`;
  let left = false;
  for (let y = y0 - step; y >= y1 - 0.1; y -= step) {
    d += `L${left ? xA : xB} ${y}`;
    left = !left;
  }
  return d;
};

const sparkle = (x: number, y: number, s: number) =>
  `M${x} ${y - s}Q${x} ${y} ${x + s} ${y}Q${x} ${y} ${x} ${y + s}Q${x} ${y} ${x - s} ${y}Q${x} ${y} ${x} ${y - s}Z`;

function Shield() {
  return (
    <>
      <path className="art-line art-soft" strokeWidth="3" d={rays(108, 82, 28, 58, 220)} />
      <g className="art-main">
      <path className="art-fg" d="M108 18 158 32V76Q158 118 108 146 58 118 58 76V32Z" />
      <path className="art-bg" d="M108 31 146 42V76Q146 109 108 132 70 109 70 76V42Z" />
      <path className="art-line" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" d="M88 80l14 15 26-32" />
      <g transform="translate(198 104)">
        <circle r="13" className="art-fg" />
        <text y="36" textAnchor="middle" className="art-txt">0</text>
        <circle cx="42" r="11.5" className="art-line" strokeWidth="3" />
        <path className="art-fg" d="M42 -11.5A11.5 11.5 0 0 1 42 11.5Z" />
        <text x="42" y="36" textAnchor="middle" className="art-txt">10</text>
        <circle cx="84" r="11.5" className="art-line" strokeWidth="3" />
        <path className="art-line" strokeWidth="3" d="M76 8 92 -8" />
        <text x="84" y="36" textAnchor="middle" className="art-txt">20</text>
      </g>
      </g>
    </>
  );
}

function Track() {
  const lane = 'M100 34H220A46 46 0 0 1 220 126H100A46 46 0 0 1 100 34Z';
  return (
    <>
      <path className="art-line art-soft" strokeWidth="1.5" d="M0 20H320M0 40H320M0 60H320M0 80H320M0 100H320M0 120H320M0 140H320" />
      <g className="art-main">
      <rect x="34" y="16" width="252" height="128" rx="64" className="art-fg" />
      <rect x="60" y="42" width="200" height="76" rx="38" className="art-bg" />
      <path className="art-line-bg" strokeWidth="2.5" strokeDasharray="9 8" d={lane} />
      {Array.from({ length: 9 }, (_, i) => (
        <rect key={i} x={148 + (i % 3) * 8} y={16 + Math.floor(i / 3) * 9} width="8" height="9" className={(i + Math.floor(i / 3)) % 2 ? 'art-fg' : 'art-bg'} />
      ))}
      <rect x="92" y="23" width="16" height="8" rx="3" className="art-bg" />
      <rect x="252" y="96" width="8" height="16" rx="3" className="art-bg" transform="rotate(-30 256 104)" />
      <rect x="196" y="129" width="16" height="8" rx="3" className="art-bg" />
      <path className="art-line" strokeWidth="3" strokeLinejoin="round" d="M84 98 104 86 120 92 138 70 156 78 176 62 196 74 216 66 236 84" />
      </g>
    </>
  );
}

function Wave() {
  const grid = [];
  for (let x = 20; x < 320; x += 20) grid.push(`M${x} 0V160`);
  for (let y = 20; y < 160; y += 20) grid.push(`M0 ${y}H320`);
  return (
    <>
      <path className="art-line art-soft" strokeWidth="1" d={grid.join('')} />
      <g className="art-main">
      <path className="art-line art-half" strokeWidth="2.5" strokeLinejoin="round" d="M12 44H32V24H52V44H72V24H92V44H112V24H132V44H152V24H172V44H192" />
      <path className="art-line" strokeWidth="5" strokeLinejoin="round" strokeLinecap="round" d="M12 116H44V72H92V116H116V72H180V116H204" />
      <path className="art-line" strokeWidth="4" strokeLinecap="round" d="M204 62H236M204 126H236M292 94H312" />
      <path className="art-bg-fill art-line" strokeWidth="5" strokeLinejoin="round" d="M236 50H258A44 44 0 0 1 258 138H236Z" />
      <circle cx="312" cy="94" r="5" className="art-fg" />
      </g>
    </>
  );
}

function Strata() {
  return (
    <>
      <path className="art-fg art-half" d="M0 30C50 18 96 40 150 30S260 14 320 28V58C262 46 214 66 160 58S56 46 0 62Z" />
      <path className="art-fg" d="M0 62C56 46 106 66 160 58S262 46 320 58V92C258 82 212 102 158 94S52 80 0 98Z" />
      <path className="art-fg art-soft-fill" d="M0 98C52 80 104 102 158 94S258 82 320 92V122C260 112 210 134 156 126S54 114 0 132Z" />
      <path className="art-fg art-half" d="M0 132C54 114 102 134 156 126S260 112 320 122V160H0Z" />
      {[
        [40, 112, 6, 4],
        [96, 140, 8, 5],
        [212, 108, 5, 3.5],
        [268, 142, 7, 4.5],
        [128, 46, 5, 3],
      ].map(([cx, cy, rx, ry], i) => (
        <ellipse key={i} cx={cx} cy={cy} rx={rx} ry={ry} className="art-bg" />
      ))}
      <rect x="92" y="54" width="122" height="74" className="art-line" strokeWidth="3" strokeDasharray="10 6" />
      <rect x="92" y="42" width="52" height="12" className="art-fg" />
      <path className="art-line" strokeWidth="5" strokeLinecap="square" d="M92 66V54H104M214 116V128H202" />
    </>
  );
}

function Crane() {
  return (
    <>
      <circle cx="292" cy="104" r="22" className="art-fg art-soft-fill" />
      <g className="art-main">
      <path className="art-line" strokeWidth="3" d="M78 152V30M94 152V30" />
      <path className="art-line" strokeWidth="2" d={zigzagV(152, 30, 78, 94, 12)} />
      <path className="art-line" strokeWidth="3" d="M40 28H300M40 40H300" />
      <path className="art-line" strokeWidth="2" d={zigzag(40, 300, 28, 40, 12)} />
      <path className="art-line" strokeWidth="2.5" d="M86 30 86 12M86 12 46 28M86 12 220 28" />
      <rect x="44" y="40" width="26" height="18" className="art-fg" />
      <rect x="96" y="44" width="16" height="14" className="art-fg" />
      <path className="art-line" strokeWidth="2" d="M232 40V96" />
      <path className="art-line" strokeWidth="3" strokeLinecap="round" d="M232 96v6a5 5 0 1 1-5-5" />
      <rect x="214" y="106" width="36" height="14" className="art-fg" />
      <path className="art-line" strokeWidth="2.5" d="M150 152V128H300V152M150 140H300M180 128V152M210 128V152M240 128V152M270 128V152" />
      <path className="art-line art-half" strokeWidth="2.5" strokeDasharray="6 5" d="M150 128V116H300V128M180 116V128M240 116V128" />
      </g>
    </>
  );
}

function Pages() {
  return (
    <>
      <g className="art-main">
      <g transform="rotate(-9 100 86)">
        <rect x="50" y="34" width="92" height="112" className="art-fg art-half" />
      </g>
      <g transform="rotate(5 112 80)">
        <rect x="64" y="24" width="92" height="112" className="art-fg art-soft-fill" />
      </g>
      <rect x="74" y="20" width="92" height="116" className="art-fg" />
      <path className="art-line-bg" strokeWidth="4" strokeLinecap="round" d="M88 40H150M88 54H146M88 68H152M88 82H138M88 96H150M88 110H128" />
      <path className="art-fg" d="M196 34H286A14 14 0 0 1 300 48V96A14 14 0 0 1 286 110H232L212 128 216 110H196A14 14 0 0 1 182 96V48A14 14 0 0 1 196 34Z" />
      <text x="241" y="98" textAnchor="middle" className="art-q">?</text>
      <path className="art-line" strokeWidth="3" strokeLinecap="round" d="M166 74H180" strokeDasharray="2 6" />
      </g>
    </>
  );
}

function Flame() {
  return (
    <>
      <g transform="rotate(-12 160 92)">
        <ellipse cx="160" cy="92" rx="138" ry="34" className="art-line art-soft" strokeWidth="2" />
        <ellipse cx="160" cy="92" rx="104" ry="24" className="art-line art-half" strokeWidth="2.5" />
      </g>
      <g className="art-main">
      <path className="art-fg" d="M160 18C186 50 204 72 204 100A44 44 0 0 1 116 100C116 78 132 62 144 44 148 62 154 70 160 74 162 56 160 36 160 18Z" />
      <path className="art-bg" d="M160 56C176 76 186 90 186 106A26 26 0 0 1 134 106C134 92 142 82 150 72 152 82 156 88 160 90 162 78 162 66 160 56Z" />
      <path className="art-fg art-half" d="M160 86C168 96 172 104 172 112A12 12 0 0 1 148 112C148 104 154 96 160 86Z" />
      <rect x="128" y="138" width="64" height="10" rx="5" className="art-fg" />
      </g>
      <path className="art-fg" d={`${sparkle(52, 36, 7)}${sparkle(268, 30, 9)}${sparkle(286, 128, 6)}${sparkle(34, 128, 5)}`} />
    </>
  );
}

const MOTIFS: Record<Motif, () => ReactNode> = {
  shield: Shield,
  track: Track,
  wave: Wave,
  strata: Strata,
  crane: Crane,
  pages: Pages,
  flame: Flame,
};

export function CoverArt({ motif }: { motif: Motif }) {
  const uid = useId().replace(/:/g, '');
  const { bg, fg } = PALETTE[motif];
  const Draw = MOTIFS[motif];
  return (
    <svg
      className="art"
      viewBox="0 0 320 160"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      style={{ ['--art-bg' as string]: bg, ['--art-fg' as string]: fg } as CSSProperties}
    >
      <defs>
        <pattern id={`ht-${uid}`} width="6" height="6" patternUnits="userSpaceOnUse">
          <circle cx="3" cy="3" r="1.25" className="art-fg" />
        </pattern>
        <linearGradient id={`fade-${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" style={{ stopColor: 'var(--color-paper)' }} />
          <stop offset="0.75" style={{ stopColor: 'var(--color-ink)' }} />
        </linearGradient>
        <mask id={`mask-${uid}`}>
          <rect width="320" height="160" fill={`url(#fade-${uid})`} />
        </mask>
      </defs>
      <rect width="320" height="160" className="art-bg" />
      <rect width="320" height="160" fill={`url(#ht-${uid})`} mask={`url(#mask-${uid})`} className="art-ht" />
      <Draw />
    </svg>
  );
}
