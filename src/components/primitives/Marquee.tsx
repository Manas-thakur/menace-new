import type { CSSProperties } from 'react';

type MarqueeProps = {
  items: readonly string[];
  /** Seconds for one full cycle. */
  speed?: number;
  direction?: 'left' | 'right';
  variant?: 'tape' | 'strip' | 'ghost';
  /** Degrees; tapes are usually laid slightly askew. */
  tilt?: number;
  /** How many times the item list repeats inside one half of the loop. */
  repeat?: number;
  separator?: string;
  className?: string;
  /** Decorative tickers stay out of the accessibility tree. */
  decorative?: boolean;
  style?: CSSProperties;
};

export function Marquee({
  items,
  speed = 40,
  direction = 'left',
  variant = 'strip',
  tilt = 0,
  repeat = 3,
  separator = '•',
  className = '',
  decorative = false,
  style,
}: MarqueeProps) {
  const run = Array.from({ length: repeat }, () => items).flat();
  const half = (key: string) => (
    <div className="marquee__half" key={key} aria-hidden="true">
      {run.map((item, i) => (
        <span className="marquee__item" key={i}>
          {item}
          <span className="marquee__sep">{separator}</span>
        </span>
      ))}
    </div>
  );

  return (
    <div
      className={`marquee marquee--${variant} ${className}`}
      style={{ ...style, ['--mq-speed' as string]: `${speed}s`, ['--mq-tilt' as string]: `${tilt}deg` }}
      aria-hidden={decorative || undefined}
    >
      {!decorative && <p className="visually-hidden">{items.join(', ')}</p>}
      <div className={`marquee__track loop ${direction === 'right' ? 'is-reverse' : ''}`}>
        {half('a')}
        {half('b')}
      </div>
    </div>
  );
}
