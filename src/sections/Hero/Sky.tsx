import type { CSSProperties } from 'react';
import { deepCut } from '../../data/deep';
import { discover } from '../../lib/deep';
import { useReveal } from './useReveal';

type KiteProps = { left: string; top: string; size: string; tone: 'crimson' | 'teal' | 'gold'; delay: number; tilt: number };

function KiteArt() {
  return (
    <svg className="kite__svg loop" viewBox="0 0 100 520" aria-hidden="true">
      <path className="kite__string" d="M50 58C26 150 84 240 40 330S70 460 30 520" />
      {/* after dark: a tukkal, the paper lantern tied to a kite's string on Uttarayan nights */}
      <g className="kite__tukkal" transform="translate(47 184)">
        <circle className="kite__tukkal-glow" r="26" />
        <path className="kite__tukkal-string" d="M0 -14V-6" />
        <rect className="kite__tukkal-paper" x="-7" y="-6" width="14" height="19" rx="5" />
        <path className="kite__tukkal-band" d="M-7 0.5h14M-7 6.5h14" />
      </g>
      <g className="kite__body">
        <path className="kite__a" d="M50 4L90 50 50 96z" />
        <path className="kite__b" d="M50 4L10 50 50 96z" />
        <path className="kite__frame" d="M50 4v92M12 50Q50 28 88 50" />
        <path className="kite__tail" d="M50 96l-9 15h18zM50 111l-6 10h12z" />
      </g>
    </svg>
  );
}

const kiteStyle = ({ left, top, size, delay, tilt }: KiteProps) =>
  ({ left, top, width: size, ['--kite-delay' as string]: `${delay}s`, ['--kite-tilt' as string]: `${tilt}deg` }) as CSSProperties;

/** A patang: two-tone diamond, bamboo spine and bow, paper tail, and a long curved string. */
function Kite(props: KiteProps) {
  return (
    <div className={`kite kite--${props.tone}`} style={kiteStyle(props)}>
      <KiteArt />
    </div>
  );
}

const CRIMSON: KiteProps = { left: '9%', top: '41%', size: 'clamp(2.4rem, 4.2vw, 7rem)', tone: 'crimson', delay: 0, tilt: -8 };

/**
 * Deep cut 02 — "The string". The big kite is a button: rest on it, focus it or tap
 * it and a paper messenger climbs its string with the message, the way children send
 * notes up a kite line.
 */
function MessengerKite({ ready }: { ready: boolean }) {
  const cut = deepCut('string');
  const reveal = useReveal(() => discover('string'), { enabled: ready });
  return (
    <>
      <button
        type="button"
        className={`kite kite--crimson kite--btn ${reveal.open ? 'is-open' : ''}`}
        style={kiteStyle(CRIMSON)}
        aria-label="Follow the kite’s string"
        aria-expanded={reveal.open}
        aria-controls="kite-note"
        onClick={reveal.toggle}
        {...reveal.pointer}
      >
        <KiteArt />
      </button>
      <p
        id="kite-note"
        aria-hidden={!reveal.open}
        className={`kite-note ${reveal.open ? 'is-open' : ''}`}
        style={{ ['--kx' as string]: CRIMSON.left, ['--ky' as string]: CRIMSON.top, ['--ks' as string]: CRIMSON.size } as CSSProperties}
      >
        <span className="kite-note__ring" aria-hidden="true" />
        {cut.lines[0].text}
      </p>
    </>
  );
}

export function Kites({ ready = true }: { ready?: boolean }) {
  return (
    <>
      <MessengerKite ready={ready} />
      <Kite left="45.5%" top="4%" size="clamp(1.6rem, 2.4vw, 4rem)" tone="teal" delay={-2.2} tilt={6} />
      <Kite left="84%" top="22%" size="clamp(1.8rem, 2.6vw, 4.5rem)" tone="gold" delay={-4.1} tilt={4} />
    </>
  );
}

/** Tonight's moon over Delhi, lit on the sun's side: the right while it waxes, the left as it wanes. */
export function Moon({ phase }: { phase: number }) {
  const r = 50;
  const c = Math.cos(2 * Math.PI * phase); // 1 at new moon, -1 at full
  const waxing = phase < 0.5;
  const rx = (Math.abs(c) * r).toFixed(2);
  // the limb is half the disc; the terminator is half an ellipse, bulging into the dark while
  // it is a crescent and into the light once it is gibbous
  const d = `M0 ${-r}A${r} ${r} 0 0 ${waxing ? 1 : 0} 0 ${r}A${rx} ${r} 0 0 ${waxing === c > 0 ? 0 : 1} 0 ${-r}Z`;
  return (
    <svg className="moon" viewBox="-50 -50 100 100" aria-hidden="true">
      <circle className="moon__dark" r="49.5" />
      <path className="moon__lit" d={d} />
    </svg>
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
