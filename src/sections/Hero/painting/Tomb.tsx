import type { Light } from './light';

/* Humayun's Tomb, the west front, as seen from the garden's west gate: drawn to the
 * proportions of the building (measured off straight-on photographs), in units where the
 * main block is 1000 wide. x runs from the centre line; y from the top of the plinth's
 * parapet, downwards. Everything the light touches is worked out from `light`: which
 * faces it falls on, and how far it reaches into each arch. */

const f = (n: number) => Math.round(n * 10) / 10;

/** A Mughal four-centred arch: upright jambs from `bottom` to the springing, then two arcs meeting in a point. */
function arch(cx: number, hw: number, spring: number, apex: number, bottom: number) {
  const rise = spring - apex;
  const a = f(spring - rise * 0.6);
  const b = f(apex + rise * 0.1);
  return `M${f(cx - hw)} ${f(bottom)}V${f(spring)}C${f(cx - hw)} ${a} ${f(cx - hw * 0.4)} ${b} ${f(cx)} ${f(apex)}C${f(cx + hw * 0.4)} ${b} ${f(cx + hw)} ${a} ${f(cx + hw)} ${f(spring)}V${f(bottom)}Z`;
}
const box = (x0: number, y0: number, x1: number, y1: number) => `M${f(x0)} ${f(y0)}H${f(x1)}V${f(y1)}H${f(x0)}Z`;

/** A dome on its neck: the neck's half-width, the widest half-width and its height, and the apex height. */
function dome(cx: number, base: number, neck: number, wide: number, wideAt: number, height: number) {
  const r = (dx: number, y: number) => `${f(cx + dx)} ${f(base - y)}`;
  const up = height - wideAt;
  const right = `C${r(neck + (wide - neck) * 0.67, wideAt * 0.23)} ${r(wide + (wide - neck) * 0.07, wideAt * 0.53)} ${r(wide, wideAt)}C${r(wide * 0.995, wideAt + up * 0.48)} ${r(wide * 0.66, height - up * 0.06)} ${r(0, height)}`;
  const left = `C${r(-wide * 0.66, height - up * 0.06)} ${r(-wide * 0.995, wideAt + up * 0.48)} ${r(-wide, wideAt)}C${r(-wide - (wide - neck) * 0.07, wideAt * 0.53)} ${r(-neck - (wide - neck) * 0.67, wideAt * 0.23)} ${r(-neck, 0)}`;
  return `M${r(neck, 0)}${right}${left}Z`;
}

/** Eight-pointed star (two squares), the inlay in the plinth's piers. */
function star(cx: number, cy: number, r: number) {
  const p = (a: number) => `${f(cx + Math.cos(a) * r)} ${f(cy + Math.sin(a) * r)}`;
  const sq = (o: number) => `M${p(o)}L${p(o + Math.PI / 2)}L${p(o + Math.PI)}L${p(o + Math.PI * 1.5)}Z`;
  return sq(0) + sq(Math.PI / 4);
}

/** A finial: inverted lotus on the dome, then a brass rod threaded with bulbs. */
function finial(cx: number, base: number, s: number) {
  const y = (n: number) => f(base - n * s);
  const x = (n: number) => f(cx + n * s);
  const lotus = `M${x(-26)} ${y(0)}C${x(-24)} ${y(8)} ${x(-12)} ${y(13)} ${x(-5)} ${y(14)}H${x(5)}C${x(12)} ${y(13)} ${x(24)} ${y(8)} ${x(26)} ${y(0)}Z`;
  const rod = box(cx - 2.2 * s, base - 72 * s, cx + 2.2 * s, base - 12 * s);
  const bulb = (at: number, r: number) => `M${x(-r)} ${y(at)}a${f(r * s)} ${f(r * 1.05 * s)} 0 1 0 ${f(2 * r * s)} 0a${f(r * s)} ${f(r * 1.05 * s)} 0 1 0 ${f(-2 * r * s)} 0Z`;
  const spike = `M${x(-1.6)} ${y(64)}L${x(0)} ${y(76)}L${x(1.6)} ${y(64)}Z`;
  return { lotus, metal: rod + bulb(28, 9.5) + bulb(44, 6.5) + bulb(55, 4.2) + spike };
}

/** A dome in two inks: its shaded body, and the part the light reaches, cut by the terminator
 * of a sphere centred on the dome's widest point. */
function Dome({ id, d, cx, cy, rx, ry, light, ink }: { id: string; d: string; cx: number; cy: number; rx: number; ry: number; light: Light; ink: string }) {
  return (
    <>
      <clipPath id={id}>
        <path d={d} />
      </clipPath>
      <path className={`tomb__${ink}-shade`} d={d} />
      <g clipPath={`url(#${id})`}>
        <path className={`tomb__${ink}-lit`} d={light.terminator.d} transform={`translate(${cx} ${cy}) scale(${rx} ${ry}) rotate(${f(light.terminator.angle)})`} />
      </g>
    </>
  );
}

// ── The plinth: seventeen arched cells a side, on a wide stone platform ──
const PITCH = 130.4;
const CELLS = Array.from({ length: 17 }, (_, i) => (i - 8) * PITCH);
const PIERS = Array.from({ length: 18 }, (_, i) => (i - 8.5) * PITCH);
const PLINTH = 1168;
const PLATFORM = 1505;
const FLOOR = 191; // the arcade's floor, the top of the platform
const GROUND = 245;

// ── The main block: a tall central iwan between two-storey wings ──
type Bay = { x0: number; x1: number; kind: 'stack' | 'niches' | 'iwan' };
const LEFT_BAYS: Bay[] = [
  { x0: -500, x1: -445, kind: 'stack' }, // the chamfered corner, turned away
  { x0: -440, x1: -393, kind: 'niches' },
  { x0: -388, x1: -258, kind: 'iwan' },
  { x0: -253, x1: -206, kind: 'niches' },
  { x0: -201, x1: -155, kind: 'stack' },
];
const BAYS: (Bay & { face: 'f' | 'l' | 'r' })[] = [
  ...LEFT_BAYS.map((b, i) => ({ ...b, face: (i === 0 ? 'l' : 'f') as 'f' | 'l' })),
  ...LEFT_BAYS.map((b, i) => ({ x0: -b.x1, x1: -b.x0, kind: b.kind, face: (i === 0 ? 'r' : 'f') as 'f' | 'r' })),
];

type Recess = [cx: number, hw: number, spring: number, apex: number, bottom: number];

export function Tomb({ light }: { light: Light }) {
  // recesses, grouped by how deep they are (light reaches less far into a deep one)
  const cells: Recess[] = CELLS.filter((x) => x !== 0).map((x) => [x, 45, 93, 60, FLOOR]);
  const iwan: Recess[] = [[0, 101, -143, -218, 12]];
  const sides: Recess[] = [];
  const niches: Recess[] = [];
  const chamferNiches: Recess[] = [];

  // marble: outlines (stroked) and solid inlay (filled), per face
  const line = { f: [] as string[], l: [] as string[], r: [] as string[] };
  const fine = { f: [] as string[], l: [] as string[], r: [] as string[] };
  const inlay = { f: [] as string[], l: [] as string[], r: [] as string[] };
  const buff: string[] = []; // the paler stone of the spandrels
  const after = { inlay: [] as string[], fine: [] as string[] }; // set on the back walls of the iwans
  const dark: string[] = []; // doors and window openings, in the main block
  const jali: string[] = []; // the lattice screens in its windows

  for (const b of BAYS) {
    const mid = (b.x0 + b.x1) / 2;
    const w = b.x1 - b.x0;
    const into = b.face === 'f' ? niches : chamferNiches;
    if (b.kind === 'stack') {
      const hw = w / 2 - 9;
      line[b.face].push(box(b.x0 + 4, -168, b.x1 - 4, -72), box(b.x0 + 4, -44, b.x1 - 4, 12));
      fine[b.face].push(box(b.x0 + 6, -64, b.x1 - 6, -50));
      inlay[b.face].push(arch(mid, hw + 3, -122, -155, -76), arch(mid, hw + 3, -22, -40, 12));
      into.push([mid, hw, -122, -150, -76], [mid, hw, -22, -36, 12]);
    } else if (b.kind === 'niches') {
      const hw = w / 2 - 9;
      line[b.face].push(box(b.x0 + 3, -166, b.x1 - 3, -102), box(b.x0 + 3, -44, b.x1 - 3, 12));
      fine[b.face].push(box(b.x0 + 5, -96, b.x1 - 5, -76), box(b.x0 + 5, -68, b.x1 - 5, -50));
      into.push([mid, hw, -128, -152, -106], [mid, hw, -20, -34, 12]);
    } else {
      line.f.push(box(b.x0 + 4, -174, b.x1 - 4, 12));
      buff.push(box(b.x0 + 6, -172, b.x1 - 6, -112));
      inlay.f.push(arch(mid, 55, -112, -155, 12));
      sides.push([mid, 50, -112, -149, 12]);
      inlay.f.push(star(mid - 43, -160, 6.5), star(mid + 43, -160, 6.5));
      after.inlay.push(box(mid - 21, -114, mid + 21, -56));
      after.fine.push(box(mid - 17, -50, mid + 17, -38));
      dark.push(arch(mid, 16, -92, -106, -60), arch(mid, 15, -20, -31, 12));
      jali.push(arch(mid, 16, -92, -106, -60));
    }
  }

  // the plinth's arcade
  const plinthLine: string[] = [];
  const plinthFine: string[] = [];
  const plinthInlay: string[] = [];
  const vault: string[] = []; // the ribs in each cell's half-dome
  const blind: string[] = []; // the blind niches either side of each cell's window
  const cellFrames: string[] = [];
  const cellDark: string[] = [];
  const cellJali: string[] = [];
  for (const x of CELLS) {
    plinthLine.push(`M${f(x - 52)} ${FLOOR}V52H${f(x + 52)}V${FLOOR}`);
    plinthInlay.push(arch(x, 49, 93, 55, FLOOR));
    if (x === 0) continue;
    vault.push(
      `M${f(x - 45)} 93L${x} 99L${f(x + 45)} 93M${f(x - 39)} 74L${x} 99L${f(x + 39)} 74M${f(x - 21)} 63L${x} 99L${f(x + 21)} 63M${x} 61V99`,
      arch(x, 31, 93, 70, 93)
    );
    blind.push(arch(x - 27, 9, 112, 103, 140), arch(x + 27, 9, 112, 103, 140));
    cellFrames.push(arch(x, 13, 106, 94, 131));
    cellDark.push(arch(x, 10, 106, 97, 128), box(x - 12, 146, x + 12, FLOOR));
    cellJali.push(arch(x, 10, 106, 97, 128));
  }
  for (const x of PIERS) {
    plinthFine.push(box(x - 10, 54, x + 10, 160), box(x - 5.5, 60, x + 5.5, 154), box(x - 10, 165, x + 10, 187));
    plinthInlay.push(star(x, 176, 6.5));
  }

  // the light through each recess: the opening's image on the back wall
  const lit = (list: Recess[], depth: number) => {
    const o = light.through(depth);
    return o ? list.map(([cx, hw, s, a, b]) => arch(cx + o[0], hw, s + o[1], a + o[1], b + o[1])).join('') : '';
  };
  const path = (list: Recess[]) => list.map((r) => arch(...r)).join('');

  // the main dome's marble courses: level joints at even steps up the curve, upright
  // joints staggered course by course, closer together as the dome narrows
  const courses = (() => {
    const pts: [number, number][] = [];
    const P0 = [168, -310];
    const segs = [
      [P0, [178, -318.7], [184, -330.1], [183, -348]],
      [[183, -348], [182.1, -410.4], [120.8, -470.2], [0, -478]],
    ];
    for (const [a, b, c, d] of segs)
      for (let i = 0; i <= 40; i++) {
        const t = i / 40;
        const u = 1 - t;
        pts.push([
          u * u * u * a[0] + 3 * u * u * t * b[0] + 3 * u * t * t * c[0] + t * t * t * d[0],
          u * u * u * a[1] + 3 * u * u * t * b[1] + 3 * u * t * t * c[1] + t * t * t * d[1],
        ]);
      }
    const len = [0];
    for (let i = 1; i < pts.length; i++) len.push(len[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    const total = len[len.length - 1];
    const at = (s: number) => {
      const i = Math.max(1, len.findIndex((l) => l >= s));
      const t = (s - len[i - 1]) / (len[i] - len[i - 1] || 1);
      return [pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * t, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * t];
    };
    const rows: [number, number][] = [];
    for (let s = 17; s < total - 26; s += 17.5) rows.push(at(s) as [number, number]);
    let d = '';
    rows.forEach(([r, y], k) => {
      d += `M${f(-r)} ${f(y)}H${f(r)}`;
      const below = k === 0 ? [168, -310] : rows[k - 1];
      const step = 27 / ((r + below[0]) / 2);
      for (let a = -Math.PI / 2 + (k % 2 ? step / 2 : step); a < Math.PI / 2; a += step) {
        d += `M${f(Math.sin(a) * below[0])} ${f(below[1])}L${f(Math.sin(a) * r)} ${f(y)}`;
      }
    });
    return d;
  })();

  const main = finial(0, -478, 1);
  const corner = (cx: number) => finial(cx, -338, 0.25);
  const small = (cx: number) => finial(cx, -374, 0.18);

  const cylinder = 'url(#tomb-cyl)';
  const shade = light.flood ? 'tomb__flood' : '';

  return (
    <g className={`tomb ${shade}`}>
      <defs>
        {/* round things: one ink on the side the light reaches, another on the far side */}
        <linearGradient id="tomb-cyl" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" className="tomb__cyl-l" />
          <stop offset="0.5" className="tomb__cyl-l" />
          <stop offset="0.5" className="tomb__cyl-r" />
          <stop offset="1" className="tomb__cyl-r" />
        </linearGradient>
        <linearGradient id="tomb-passage" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" className="tomb__passage-top" />
          <stop offset="1" className="tomb__passage-low" />
        </linearGradient>
        {/* the parapet bands: a row of marble lozenges */}
        <pattern id="tomb-diamonds" width="12" height="21" patternUnits="userSpaceOnUse" x="-6" y="0">
          <path className="tomb__diamond" d="M6 3.5L10.2 10.5L6 17.5L1.8 10.5Z" />
        </pattern>
        {/* the plinth frieze: marble stars on a lattice */}
        <pattern id="tomb-lattice" width={PITCH / 2} height="34" patternUnits="userSpaceOnUse" x={-PITCH / 4} y="14">
          <path className="tomb__lattice" d={`${star(PITCH / 4, 17, 9.5)}M0 17H${f(PITCH / 4 - 9.5)}M${f(PITCH / 4 + 9.5)} 17H${f(PITCH / 2)}M0 0L${f(PITCH / 4 - 6.7)} 10.3M${f(PITCH / 2)} 0L${f(PITCH / 4 + 6.7)} 10.3M0 34L${f(PITCH / 4 - 6.7)} 23.7M${f(PITCH / 2)} 34L${f(PITCH / 4 + 6.7)} 23.7`} />
        </pattern>
        {/* the openwork railing along the plinth's edge */}
        <pattern id="tomb-rail" width="14" height="12" patternUnits="userSpaceOnUse" x="0" y="0">
          <rect className="tomb__rail-gap" x="4.5" y="3" width="5" height="7.5" rx="1" />
        </pattern>
        {/* the jali: a stone lattice in each window */}
        <pattern id="tomb-jali" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <path className="tomb__jali-bar" d="M0 0H5M0 0V5" />
        </pattern>
        {/* after dark the floodlights are on the lawn: the stone dims as it rises from them */}
        <linearGradient id="tomb-falloff" gradientUnits="userSpaceOnUse" x1="0" y1="-480" x2="0" y2={GROUND}>
          <stop offset="0" className="tomb__falloff-top" />
          <stop offset="0.55" className="tomb__falloff-mid" />
          <stop offset="1" className="tomb__falloff-low" />
        </linearGradient>
        <clipPath id="tomb-mass">
          <path d={box(-PLATFORM, FLOOR, PLATFORM, GROUND) + box(-PLINTH, 0, PLINTH, FLOOR) + box(-500, -235, 500, 0) + box(-155, -295, 155, 0) + box(-172, -310, 172, -212)} />
          <path d={dome(0, -310, 168, 183, 38, 168)} />
        </clipPath>
        <clipPath id="tomb-clip-cells">
          <path d={path(cells)} />
        </clipPath>
        <clipPath id="tomb-clip-iwan">
          <path d={path(iwan)} />
        </clipPath>
        <clipPath id="tomb-clip-sides">
          <path d={path(sides)} />
        </clipPath>
        <clipPath id="tomb-clip-niches">
          <path d={path(niches)} />
        </clipPath>
      </defs>

      {/* ── the dome on its drum, and the small blue-tiled kiosks in front of it ── */}
      <rect x="-172" y="-310" width="344" height="98" fill={cylinder} />
      <path className="tomb__inlay-f" d={[-60, -40, -20, 0, 20, 40, 60].map((a) => box(Math.sin((a * Math.PI) / 180) * 172 - 1.6, -298, Math.sin((a * Math.PI) / 180) * 172 + 1.6, -212)).join('')} />
      <path className="tomb__zigzag" d={`M-172 -302${Array.from({ length: 43 }, (_, i) => `L${f(-172 + (i + 0.5) * 8)} ${i % 2 ? -302 : -308}`).join('')}L172 -302`} />
      <Dome id="tomb-dome-main" d={dome(0, -310, 168, 183, 38, 168)} cx={0} cy={-348} rx={183} ry={136} light={light} ink="marble" />
      <path className="tomb__courses" d={courses} />
      <path className="tomb__lotus" d={main.lotus} />
      <path className="tomb__brass" d={main.metal} />

      {[-88, 88].map((cx) => {
        const fin = small(cx);
        return (
          <g key={cx}>
            <rect className="tomb__dark" x={cx - 21} y={-323} width={42} height={28} />
            <rect x={cx - 20} y={-323} width={6} height={28} fill={cylinder} />
            <rect x={cx + 14} y={-323} width={6} height={28} fill={cylinder} />
            <rect x={cx - 22} y={-350} width={44} height={17} fill={cylinder} />
            <path className="tomb__inlay-f" d={box(cx - 22, -351, cx + 22, -348) + box(cx - 22, -336, cx + 22, -334)} />
            <path className="tomb__stone-top" d={`M${cx - 31} -323L${cx - 25} -333H${cx + 25}L${cx + 31} -323Z`} />
            <rect className="tomb__under" x={cx - 31} y={-323} width={62} height={2.5} />
            <Dome id={`tomb-dome-${cx}`} d={dome(cx, -350, 18, 21, 8, 24)} cx={cx} cy={-358} rx={21} ry={17} light={light} ink="tile" />
            <path className="tomb__chevron" d={`M${cx - 20} -360${[...Array(8)].map((_, i) => `L${f(cx - 20 + (i + 0.5) * 5)} ${i % 2 ? -360 : -365}`).join('')}L${cx + 20} -360`} />
            <path className="tomb__brass" d={fin.lotus + fin.metal} />
          </g>
        );
      })}

      {/* ── the four corner kiosks (two seen), domes weathered grey ── */}
      {[-292, 292].map((cx) => {
        const fin = corner(cx);
        return (
          <g key={cx}>
            <rect className="tomb__dark" x={cx - 58} y={-262} width={116} height={30} />
            {[-52, -22, 22, 52].map((dx) => (
              <rect key={dx} x={cx + dx - 3.6} y={-262} width={7.2} height={30} fill={cylinder} />
            ))}
            <rect x={cx - 48} y={-292} width={96} height={16} fill={cylinder} />
            <path className="tomb__petals" d={Array.from({ length: 12 }, (_, i) => `M${f(cx - 46 + i * 8)} -292q4 -7 8 0z`).join('')} />
            <path className="tomb__stone-top" d={`M${cx - 74} -262L${cx - 60} -276H${cx + 60}L${cx + 74} -262Z`} />
            <rect className="tomb__under" x={cx - 74} y={-262} width={148} height={3.5} />
            <Dome id={`tomb-dome-${cx}`} d={dome(cx, -292, 45, 52, 14, 46)} cx={cx} cy={-306} rx={52} ry={34} light={light} ink="marble" />
            <path className="tomb__lotus" d={fin.lotus} />
            <path className="tomb__brass" d={fin.metal} />
          </g>
        );
      })}

      {/* ── slender pinnacles (guldastas) along the wings' parapet ── */}
      {[
        [-497, -261],
        [-443, -274],
        [-390, -287],
        [-203, -268],
      ].flatMap(([x, top]) => [
        [x, top],
        [-x, top],
      ]).map(([x, top]) => (
        <g key={`${x}`}>
          <rect x={x - 3.4} y={top + 9} width={6.8} height={-235 - top - 9} fill={cylinder} />
          <path d={`M${x - 5.5} ${top + 10}C${x - 6.5} ${top + 4} ${x - 2} ${top + 1} ${x} ${top}C${x + 2} ${top + 1} ${x + 6.5} ${top + 4} ${x + 5.5} ${top + 10}Z`} fill={cylinder} />
          <path className="tomb__brass" d={`M${x - 0.8} ${top + 1}V${top - 5}h1.6V${top + 1}Z`} />
        </g>
      ))}

      {/* ── the wings ── */}
      <rect className="tomb__stone-f" x="-445" y="-235" width="890" height="247" />
      <rect className="tomb__stone-l" x="-500" y="-235" width="55" height="247" />
      <rect className="tomb__stone-r" x="445" y="-235" width="55" height="247" />
      {/* parapet: a band of lozenges, a cornice, a frieze of long panels */}
      <rect fill="url(#tomb-diamonds)" x="-500" y="-235" width="1000" height="21" />
      <path className="tomb__inlay-f" d={box(-445, -236, 445, -233.5) + box(-445, -213, 445, -210) + box(-445, -181, 445, -178.5)} />
      <path className="tomb__inlay-l" d={box(-500, -236, -445, -233.5) + box(-500, -213, -445, -210) + box(-500, -181, -445, -178.5)} />
      <path className="tomb__inlay-r" d={box(445, -236, 500, -233.5) + box(445, -213, 500, -210) + box(445, -181, 500, -178.5)} />
      <rect className="tomb__crease" x="-500" y="-210" width="1000" height="3" />
      <path
        className="tomb__fine-f"
        d={BAYS.filter((b) => b.face === 'f')
          .map((b) => box(b.x0 + 4, -205, b.x1 - 4, -186))
          .join('')}
      />
      <path className="tomb__fine-l" d={box(-496, -205, -449, -186)} />
      <path className="tomb__fine-r" d={box(449, -205, 496, -186)} />
      {/* the strips of marble between the bays */}
      <path className="tomb__inlay-f" d={[-445, -393, -258, -206, 201, 253, 388, 440].map((x) => box(x, -178, x + 5, 12)).join('')} />
      <path className="tomb__inlay-l" d={box(-500, -235, -497.5, 12)} />
      <path className="tomb__inlay-r" d={box(497.5, -235, 500, 12)} />

      {/* the side iwans: pale spandrels, then the openings */}
      <path className="tomb__buff" d={buff.join('')} />
      <path className="tomb__inlay-f" d={inlay.f.join('')} />
      <path className="tomb__inlay-l" d={inlay.l.join('')} />
      <path className="tomb__inlay-r" d={inlay.r.join('')} />
      <path className="tomb__line-f" d={line.f.join('')} />
      <path className="tomb__line-l" d={line.l.join('')} />
      <path className="tomb__line-r" d={line.r.join('')} />
      <path className="tomb__fine-f" d={fine.f.join('')} />
      <path className="tomb__fine-l" d={fine.l.join('')} />
      <path className="tomb__fine-r" d={fine.r.join('')} />

      <path className="tomb__recess" d={path(sides) + path(niches)} />
      <path className="tomb__recess-lit" d={lit(sides, 44)} clipPath="url(#tomb-clip-sides)" />
      <path className="tomb__recess-lit" d={lit(niches, 13)} clipPath="url(#tomb-clip-niches)" />
      <path className="tomb__recess tomb__recess--turned" d={path(chamferNiches)} />
      <path className="tomb__inlay-f" d={after.inlay.join('')} />
      <path className="tomb__fine-f" d={after.fine.join('')} />

      {/* ── the central iwan, standing forward of the wings ── */}
      <rect className="tomb__stone-f" x="-155" y="-295" width="310" height="307" />
      <rect fill="url(#tomb-diamonds)" x="-155" y="-295" width="310" height="21" />
      <path className="tomb__inlay-f" d={box(-155, -296, 155, -293.5) + box(-155, -275, 155, -270) + box(-155, -270, -150, 12) + box(150, -270, 155, 12)} />
      <path className="tomb__buff" d={box(-110, -226, 110, -143) + box(-111, -260, 111, -236)} />
      <path className="tomb__inlay-f" d={arch(0, 108, -143, -226, 12) + star(-86, -206, 8) + star(86, -206, 8)} />
      <path className="tomb__line-f" d={box(-113, -228, 113, 12) + box(-113, -262, 113, -234)} />
      <path className="tomb__fine-f" d={'M5 -248a5 5 0 1 0 -10 0a5 5 0 1 0 10 0Z'} />
      <path className="tomb__recess" d={path(iwan)} />
      <path className="tomb__recess-lit" d={lit(iwan, 72)} clipPath="url(#tomb-clip-iwan)" />
      {/* inside the iwan: ribs of the half-dome, and the tall window over the door */}
      <path className="tomb__ribs" d="M-101 -143L0 -150L101 -143M-88 -186L0 -150L88 -186M-50 -210L0 -150L50 -210M0 -218V-150" clipPath="url(#tomb-clip-iwan)" />
      <path className="tomb__inlay-f" d={box(-36, -176, -32, 12) + box(32, -176, 36, 12) + box(-31, -146, 31, -72)} />
      <path className="tomb__fine-f" d={box(-26, -172, 26, -152) + box(-24, -64, 24, -48)} />
      <path className="tomb__dark" d={arch(0, 26, -116, -138, -78) + arch(0, 22, -24, -38, 12)} />
      <path fill="url(#tomb-jali)" d={arch(0, 26, -116, -138, -78)} />

      {/* the side iwans' windows and doors, and the cells' */}
      <path className="tomb__dark" d={dark.join('')} />
      <path fill="url(#tomb-jali)" d={jali.join('')} />

      {/* the tall pinnacles at the central iwan's corners */}
      {[-153, 153].map((x) => (
        <g key={x}>
          <rect x={x - 5} y={-342} width={10} height={47} fill={cylinder} />
          <rect className="tomb__inlay-f" x={x - 7} y={-343} width={14} height={3} />
          <path d={`M${x - 8} -342C${x - 9.5} -352 ${x - 3} -358 ${x} -360C${x + 3} -358 ${x + 9.5} -352 ${x + 8} -342Z`} fill={cylinder} />
          <path className="tomb__brass" d={`M${x - 1} -359V-368h2V-359Z`} />
        </g>
      ))}

      {/* ── the plinth ── */}
      <rect className="tomb__stone-f" x={-PLINTH + 45} y="0" width={(PLINTH - 45) * 2} height={FLOOR} />
      <rect className="tomb__stone-l" x={-PLINTH} y="0" width="45" height={FLOOR} />
      <rect className="tomb__stone-r" x={PLINTH - 45} y="0" width="45" height={FLOOR} />
      {/* the parapet rail, and the frieze of stars under it */}
      <rect fill="url(#tomb-rail)" x={-PLINTH} y="0" width={PLINTH * 2} height="12" />
      <path className="tomb__inlay-f" d={box(-PLINTH + 45, -1, PLINTH - 45, 1.6) + box(-PLINTH + 45, 11.5, PLINTH - 45, 13.5) + box(-PLINTH + 45, 48, PLINTH - 45, 50)} />
      <path className="tomb__inlay-l" d={box(-PLINTH, -1, -PLINTH + 45, 1.6) + box(-PLINTH, 48, -PLINTH + 45, 50)} />
      <path className="tomb__inlay-r" d={box(PLINTH - 45, -1, PLINTH, 1.6) + box(PLINTH - 45, 48, PLINTH, 50)} />
      <rect fill="url(#tomb-lattice)" x={-PLINTH + 45} y="14" width={(PLINTH - 45) * 2} height="34" />
      <rect className="tomb__crease" x={-PLINTH} y="13.5" width={PLINTH * 2} height="2" />
      {/* the turned corners of the plinth: a narrow arch each, seen edge-on */}
      <path className="tomb__inlay-l" d={arch(-PLINTH + 22, 15, 96, 62, FLOOR)} />
      <path className="tomb__inlay-r" d={arch(PLINTH - 22, 15, 96, 62, FLOOR)} />
      <path className="tomb__recess tomb__recess--turned" d={arch(-PLINTH + 22, 12, 96, 66, FLOOR) + arch(PLINTH - 22, 12, 96, 66, FLOOR)} />
      {/* the cells: marble arch, white plaster inside, a jali window and a low door */}
      <path className="tomb__inlay-f" d={plinthInlay.join('')} />
      <path className="tomb__plaster" d={path(cells)} />
      <path className="tomb__plaster-lit" d={lit(cells, 46)} clipPath="url(#tomb-clip-cells)" />
      <path className="tomb__vault" d={vault.join('')} clipPath="url(#tomb-clip-cells)" />
      <path className="tomb__blind" d={blind.join('')} />
      <path className="tomb__inlay-f" d={cellFrames.join('')} />
      <path className="tomb__dark" d={cellDark.join('')} />
      <path fill="url(#tomb-jali)" d={cellJali.join('')} />
      <path className="tomb__line-f" d={plinthLine.join('')} />
      <path className="tomb__fine-f" d={plinthFine.join('')} />
      {/* the central bay: an open passage, the stair up to the terrace */}
      <path fill="url(#tomb-passage)" d={arch(0, 45, 93, 60, FLOOR)} />

      {/* ── the platform it all stands on ── */}
      <rect className="tomb__buff-f" x={-PLATFORM} y={FLOOR} width={PLATFORM * 2} height={GROUND - FLOOR} />
      <rect className="tomb__buff-top" x={-PLATFORM} y={FLOOR - 1} width={PLATFORM * 2} height="6" />
      <path
        className="tomb__joints"
        d={`M${-PLATFORM} 219H${PLATFORM}` + Array.from({ length: 25 }, (_, i) => `M${f(-PLATFORM + 62 + i * 120.4)} ${FLOOR + 5}V219M${f(-PLATFORM + 2 + i * 120.4)} 219V${GROUND}`).join('')}
      />
      <rect className="tomb__stair" x="-50" y={FLOOR} width="100" height={GROUND - FLOOR} />
      <path className="tomb__treads" d={Array.from({ length: 9 }, (_, i) => `M-50 ${FLOOR + 3 + i * 6}H50`).join('')} />
      <rect className="tomb__crease" x={-PLATFORM} y={GROUND - 3} width={PLATFORM * 2} height="3" />
      {light.flood && <rect x={-PLATFORM} y="-480" width={PLATFORM * 2} height={GROUND + 480} fill="url(#tomb-falloff)" clipPath="url(#tomb-mass)" />}
    </g>
  );
}
