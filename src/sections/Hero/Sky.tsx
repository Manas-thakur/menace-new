import type { CSSProperties } from 'react';

type KiteProps = { left: string; top: string; size: string; tone: 'crimson' | 'teal' | 'gold'; delay: number; tilt: number };

/** A patang: two-tone diamond, bamboo spine and bow, paper tail, and a long curved string. */
function Kite({ left, top, size, tone, delay, tilt }: KiteProps) {
  return (
    <div
      className={`kite kite--${tone}`}
      style={{ left, top, width: size, ['--kite-delay' as string]: `${delay}s`, ['--kite-tilt' as string]: `${tilt}deg` } as CSSProperties}
    >
      <svg className="kite__svg loop" viewBox="0 0 100 520" aria-hidden="true">
        <path className="kite__string" d="M50 58C26 150 84 240 40 330S70 460 30 520" />
        <g className="kite__body">
          <path className="kite__a" d="M50 4L90 50 50 96z" />
          <path className="kite__b" d="M50 4L10 50 50 96z" />
          <path className="kite__frame" d="M50 4v92M12 50Q50 28 88 50" />
          <path className="kite__tail" d="M50 96l-9 15h18zM50 111l-6 10h12z" />
        </g>
      </svg>
    </div>
  );
}

export function Kites() {
  return (
    <>
      <Kite left="9%" top="41%" size="clamp(2.4rem, 4.2vw, 7rem)" tone="crimson" delay={0} tilt={-8} />
      <Kite left="45.5%" top="4%" size="clamp(1.6rem, 2.4vw, 4rem)" tone="teal" delay={-2.2} tilt={6} />
      <Kite left="84%" top="22%" size="clamp(1.8rem, 2.6vw, 4.5rem)" tone="gold" delay={-4.1} tilt={4} />
    </>
  );
}

/** Retro flat-bottomed cloud. */
export function Cloud({ className, style }: { className?: string; style?: CSSProperties }) {
  return (
    <svg className={`cloud ${className ?? ''}`} style={style} viewBox="0 0 260 90" aria-hidden="true">
      <path d="M8 86h244c6 0 8-8 3-12-8-7-22-7-30-2 2-20-14-36-34-32-6-24-36-36-58-22-14-18-46-16-56 6-20-8-44 6-42 28-14-4-28 4-30 18-1 8 5 16 3 16z" />
    </svg>
  );
}
