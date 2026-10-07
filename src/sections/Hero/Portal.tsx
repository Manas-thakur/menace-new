import { useLayoutEffect, useRef, useState } from 'react';

/* The gateway around the window: a pishtaq, the tall rectangular portal Mughal
 * builders set an arch into — red sandstone laid in courses, white marble inlaid as
 * bands round the arch and the frame, and in each spandrel a marble lotus medallion.
 * Drawn to the window's real size so nothing stretches. */

type Geo = {
  W: number;
  H: number;
  /** the window (arch-wrap) inside the portal */
  x: number;
  y: number;
  w: number;
  h: number;
  /** spandrel medallions: centre and radius, left one (the right mirrors it) */
  sx: number;
  sy: number;
  sr: number;
};

/** Points along the arch's left half, from the springing up to the tip, in window units. */
function archLeft(steps = 48): [number, number][] {
  const pts: [number, number][] = [];
  const seg = (p0: number[], p1: number[], p2: number[], p3: number[]) => {
    for (let i = 0; i <= steps / 2; i++) {
      const t = i / (steps / 2);
      const u = 1 - t;
      pts.push([
        u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
        u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1],
      ]);
    }
  };
  seg([0, 0.44], [0, 0.27], [0.2, 0.17], [0.37, 0.1]);
  seg([0.37, 0.1], [0.45, 0.067], [0.485, 0.04], [0.5, 0]);
  return pts;
}
const LEFT = archLeft();

/** The largest medallion that fits the left spandrel: above the arch, inside the frame. */
function spandrel(x: number, y: number, w: number, h: number, inset: number) {
  const curve = LEFT.map(([u, v]) => [x + u * w, y + v * h]);
  const top = y - inset;
  const left = x - inset;
  let best = { cx: x + w * 0.14, cy: y + h * 0.12, r: 0 };
  for (let i = 1; i < 30; i++) {
    for (let j = 1; j < 30; j++) {
      const cx = left + ((x + w * 0.5 - left) * i) / 30;
      const cy = top + ((y + h * 0.44 - top) * j) / 30;
      // outside the arch: above the curve at this x
      const k = curve.findIndex(([px]) => px >= cx);
      if (k < 0 || cy >= curve[k][1]) continue;
      let r = Math.min(cy - top, cx - left);
      for (const [px, py] of curve) r = Math.min(r, Math.hypot(px - cx, py - cy));
      if (r > best.r) best = { cx, cy, r };
    }
  }
  return best;
}

/** A ring of pointed lotus petals between radii r0 and r1, centred on (cx, cy). */
const lotus = (cx: number, cy: number, r0: number, r1: number, n: number, rot = 0) => {
  let d = '';
  const w = (Math.PI / n) * 0.62;
  for (let i = 0; i < n; i++) {
    const a = rot + (i * 2 * Math.PI) / n;
    const pt = (rad: number, ang: number) => `${(cx + Math.cos(ang) * rad).toFixed(1)} ${(cy + Math.sin(ang) * rad).toFixed(1)}`;
    const mid = (r0 + r1) / 2;
    d += `M${pt(r0, a)}Q${pt(mid, a - w)} ${pt(r1, a)}Q${pt(mid, a + w)} ${pt(r0, a)}Z`;
  }
  return d;
};

function Medallion({ cx, cy, r, perch }: { cx: number; cy: number; r: number; perch: string }) {
  return (
    <g>
      <circle className="portal__ring" cx={cx} cy={cy} r={r} />
      <circle className="portal__ring portal__ring--fine" cx={cx} cy={cy} r={r * 0.88} />
      <path className="portal__petals portal__petals--back" d={lotus(cx, cy, r * 0.24, r * 0.8, 12, Math.PI / 12)} />
      <path className="portal__petals" d={lotus(cx, cy, r * 0.22, r * 0.68, 12)} />
      <circle className="portal__core" cx={cx} cy={cy} r={r * 0.2} />
      <circle className="portal__seed" cx={cx} cy={cy} r={r * 0.07} />
      <circle className="perch" data-perch={perch} cx={cx} cy={cy - r} r="1" />
    </g>
  );
}

export function Portal() {
  const ref = useRef<HTMLDivElement>(null);
  const [g, setG] = useState<Geo | null>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    const wrap = el?.parentElement;
    if (!el || !wrap) return;
    const measure = () => {
      const W = el.offsetWidth;
      const H = el.offsetHeight;
      const x = -el.offsetLeft;
      const y = -el.offsetTop;
      const w = wrap.offsetWidth;
      const h = wrap.offsetHeight;
      if (!W || !H || !w || !h) return;
      const band = Math.max(8, Math.min(16, w * 0.014));
      const s = spandrel(x, y, w, h, band * 1.2);
      setG({ W, H, x, y, w, h, sx: s.cx, sy: s.cy, sr: s.r * 0.78 });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    ro.observe(wrap);
    return () => ro.disconnect();
  }, []);

  const P = (u: number, v: number) => (g ? `${(g.x + u * g.w).toFixed(1)} ${(g.y + v * g.h).toFixed(1)}` : '0 0');
  const arch = g
    ? `M${P(0, 1)}L${P(0, 0.44)}C${P(0, 0.27)} ${P(0.2, 0.17)} ${P(0.37, 0.1)}C${P(0.45, 0.067)} ${P(0.485, 0.04)} ${P(0.5, 0)}C${P(0.515, 0.04)} ${P(0.55, 0.067)} ${P(0.63, 0.1)}C${P(0.8, 0.17)} ${P(1, 0.27)} ${P(1, 0.44)}L${P(1, 1)}`
    : '';
  const band = g ? Math.max(8, Math.min(16, g.w * 0.014)) : 10;

  return (
    <div ref={ref} className="hero__portal" aria-hidden="true">
      {g && (
        <svg className="portal" width={g.W} height={g.H} viewBox={`0 0 ${g.W} ${g.H}`} focusable="false">
          <defs>
            {/* sandstone laid in courses, each course's joints offset by half a block */}
            <pattern id="portal-courses" width="96" height="44" patternUnits="userSpaceOnUse">
              <path className="portal__joint" d="M0 0.5H96M0 22.5H96M48 0.5V22.5M0 22.5V44M96 22.5V44" />
            </pattern>
          </defs>
          <rect className="portal__stone" width={g.W} height={g.H} />
          <rect className="portal__courses" width={g.W} height={g.H} fill="url(#portal-courses)" />
          {/* the frame: marble bands with dark fillets either side */}
          <rect
            className="portal__band portal__band--edge"
            x={band * 0.9}
            y={band * 0.9}
            width={g.W - band * 1.8}
            height={g.H + band}
            style={{ strokeWidth: band * 0.5 }}
          />
          <rect
            className="portal__band"
            x={g.x - band * 1.2}
            y={g.y - band * 1.2}
            width={g.w + band * 2.4}
            height={g.h + band * 2.4}
            style={{ strokeWidth: band * 0.45 }}
          />
          <Medallion cx={g.sx} cy={g.sy} r={g.sr} perch="rosette-l" />
          <Medallion cx={g.x + g.w - (g.sx - g.x)} cy={g.sy} r={g.sr} perch="rosette-r" />
          {/* the arch's marble band, half of it hidden under the window's edge */}
          <path className="portal__fillet" d={arch} style={{ strokeWidth: band * 1.7 + 3 }} />
          <path className="portal__arch" d={arch} style={{ strokeWidth: band * 1.7 }} />
        </svg>
      )}
    </div>
  );
}
