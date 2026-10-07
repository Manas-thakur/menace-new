/* Clouds over the garden, low on the horizon either side of the tomb (never behind the
 * name). Poster clouds: a flat-bottomed run of round billows in one ink, a shaded underside
 * in a second, a highlight along the tops. In the painting's own units, so they match it. */

type Bump = [dx: number, r: number];
type CloudSpec = { x: number; y: number; bumps: Bump[] };

const CLOUDS: CloudSpec[] = [
  {
    x: 330,
    y: 440,
    bumps: [
      [-250, 30],
      [-200, 46],
      [-130, 64],
      [-44, 84],
      [52, 74],
      [134, 58],
      [196, 44],
      [244, 28],
    ],
  },
  {
    x: 1268,
    y: 446,
    bumps: [
      [-196, 28],
      [-146, 44],
      [-78, 62],
      [8, 76],
      [92, 58],
      [156, 42],
      [202, 26],
    ],
  },
  {
    x: -330,
    y: 432,
    bumps: [
      [-130, 28],
      [-78, 46],
      [-4, 60],
      [74, 46],
      [130, 28],
    ],
  },
  {
    x: 1975,
    y: 430,
    bumps: [
      [-134, 28],
      [-80, 48],
      [0, 60],
      [78, 44],
      [132, 26],
    ],
  },
];

const f = (n: number) => Math.round(n * 10) / 10;
const circle = (x: number, y: number, r: number) => `M${f(x - r)} ${f(y)}a${f(r)} ${f(r)} 0 1 0 ${f(2 * r)} 0a${f(r)} ${f(r)} 0 1 0 ${f(-2 * r)} 0Z`;

function shape({ x, y, bumps }: CloudSpec) {
  const first = bumps[0];
  const last = bumps[bumps.length - 1];
  const x0 = x + first[0];
  const x1 = x + last[0];
  const foot = Math.min(first[1], last[1]);
  // a capsule along the base, the billows standing on it
  const base = `M${f(x0)} ${y}a${foot} ${foot} 0 0 1 0 ${-2 * foot}H${f(x1)}a${foot} ${foot} 0 0 1 0 ${2 * foot}Z`;
  const body = base + bumps.map(([dx, r]) => circle(x + dx, y - r, r)).join('');
  // the underside: lower, smaller billows, so its upper edge is scalloped too
  const under = `M${f(x0 - foot)} ${y}V${f(y - foot * 0.7)}H${f(x1 + foot)}V${y}Z` + bumps.map(([dx, r]) => circle(x + dx + r * 0.2, y - r * 0.05, r * 0.52)).join('');
  // a highlight on the upper-left of each billow
  const shine = bumps
    .map(([dx, r]) => {
      const cx = x + dx;
      const cy = y - r;
      const rr = r * 0.72;
      const a0 = (214 * Math.PI) / 180;
      const a1 = (256 * Math.PI) / 180;
      return `M${f(cx + Math.cos(a0) * rr)} ${f(cy + Math.sin(a0) * rr)}A${f(rr)} ${f(rr)} 0 0 1 ${f(cx + Math.cos(a1) * rr)} ${f(cy + Math.sin(a1) * rr)}`;
    })
    .join('');
  return { body, under, shine };
}

const SHAPES = CLOUDS.map(shape);

export function Clouds() {
  return (
    <svg className="painting__clouds loop" viewBox="0 0 1600 700" overflow="visible" aria-hidden="true" focusable="false">
      <defs>
        {SHAPES.map((s, i) => (
          <clipPath key={i} id={`cloud-${i}`}>
            <path d={s.body} />
          </clipPath>
        ))}
      </defs>
      {SHAPES.map((s, i) => (
        <g key={i}>
          <path className="cloud__body" d={s.body} />
          <path className="cloud__under" d={s.under} clipPath={`url(#cloud-${i})`} />
          <path className="cloud__shine" d={s.shine} />
        </g>
      ))}
    </svg>
  );
}
