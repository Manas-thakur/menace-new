import type { CSSProperties, ReactNode } from 'react';

/** Deterministic PRNG so torn edges are identical on every render. */
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function tornPath(seed: number, teeth: number, depth: number) {
  const rand = mulberry32(seed);
  const W = 1000;
  const step = W / teeth;
  let d = 'M0 0H1000V';
  const pts: [number, number][] = [];
  for (let i = teeth; i >= 0; i--) {
    const x = Math.min(W, Math.max(0, i * step + (rand() - 0.5) * step * 0.7));
    const y = 100 - depth + rand() * depth;
    pts.push([x, y]);
    // a smaller tooth in between for a fibrous, hand-torn feel
    if (i > 0) pts.push([x - step * (0.35 + rand() * 0.3), 100 - depth * (0.2 + rand() * 0.9)]);
  }
  d += `${pts[0][1].toFixed(1)}`;
  for (const [x, y] of pts) d += `L${x.toFixed(1)} ${y.toFixed(1)}`;
  return `${d}L0 ${(100 - depth / 2).toFixed(1)}Z`;
}

type TornEdgeProps = {
  /** Which edge of the parent the strip hangs from. */
  side?: 'top' | 'bottom';
  seed?: number;
  teeth?: number;
  /** Tooth depth as a percentage of the strip height (0–100). */
  depth?: number;
  className?: string;
  style?: CSSProperties;
};

/** A torn strip of paper. Colour comes from `color` (currentColor fill). */
export function TornEdge({ side = 'top', seed = 7, teeth = 46, depth = 55, className = '', style }: TornEdgeProps) {
  const d = tornPath(seed, teeth, depth);
  return (
    <svg
      className={`torn torn--${side} ${className}`}
      viewBox="0 0 1000 100"
      preserveAspectRatio="none"
      aria-hidden="true"
      style={style}
    >
      <path className="torn__shadow" d={d} />
      <path className="torn__paper" d={d} />
    </svg>
  );
}

type TapeProps = { rotate?: number; className?: string; style?: CSSProperties };

/** A strip of translucent paper tape with torn ends. */
export function Tape({ rotate = -3, className = '', style }: TapeProps) {
  return <span className={`tape ${className}`} aria-hidden="true" style={{ ...style, ['--tape-rot' as string]: `${rotate}deg` }} />;
}

type StampProps = {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  /** Hole radius in px. */
  hole?: number;
};

/**
 * Postage-stamp frame with real perforations (masked holes, not painted dots).
 * The shadow sits on an outer wrapper because `mask` would clip a filter on the same element.
 */
export function Stamp({ children, className = '', style, hole = 7 }: StampProps) {
  return (
    <div className={`stamp-wrap ${className}`} style={{ ...style, ['--hole' as string]: `${hole}px` }}>
      <div className="stamp">
        <div className="stamp__face">{children}</div>
      </div>
    </div>
  );
}

type StickerProps = {
  children: ReactNode;
  rotate?: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  style?: CSSProperties;
  as?: 'div' | 'span' | 'li';
};

/** Die-cut sticker: a white border traced around the content's silhouette. */
export function Sticker({ children, rotate = 0, size = 'md', className = '', style, as: Tag = 'div' }: StickerProps) {
  return (
    <Tag className={`sticker sticker--${size} ${className}`} style={{ ...style, ['--rot' as string]: `${rotate}deg` }}>
      {children}
    </Tag>
  );
}

/** Shared SVG filters, mounted once at the root. */
export function SvgDefs() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true" focusable="false">
      <defs>
        {[
          ['sticker-sm', 3],
          ['sticker-md', 5],
          ['sticker-lg', 8],
        ].map(([id, r]) => (
          <filter key={id} id={String(id)} x="-25%" y="-25%" width="150%" height="150%" colorInterpolationFilters="sRGB">
            <feMorphology in="SourceAlpha" operator="dilate" radius={r} result="grown" />
            <feFlood className="sticker-flood" result="paper" />
            <feComposite in="paper" in2="grown" operator="in" result="outline" />
            <feMerge>
              <feMergeNode in="outline" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        ))}

        {/* Hand-cut wobble for edges */}
        <filter id="rough" x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="4" result="warp" />
          <feDisplacementMap in="SourceGraphic" in2="warp" scale="5" xChannelSelector="R" yChannelSelector="G" />
        </filter>

        {/* Worn letterpress: solid ink with sparse speckled loss, plus a slight wobble */}
        <filter id="distress" x="-4%" y="-4%" width="108%" height="108%">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="11" result="speck" />
          <feColorMatrix in="speck" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -20 13.2" result="mask" />
          <feComposite in="SourceGraphic" in2="mask" operator="in" result="worn" />
          <feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves="2" seed="5" result="warp" />
          <feDisplacementMap in="worn" in2="warp" scale="4" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </defs>
    </svg>
  );
}
