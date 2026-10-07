import type { CSSProperties } from 'react';
import { deepCut } from '../../data/deep';
import { discover } from '../../lib/deep';
import { useReveal } from './useReveal';

type KiteProps = { left: string; top: string; size: string; tone: 'crimson'; delay: number; tilt: number };

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

// flying low on the left, clear of the name; its string runs down into the big tree
const CRIMSON: KiteProps = { left: '7%', top: '49%', size: 'clamp(2.2rem, 3.6vw, 6rem)', tone: 'crimson', delay: 0, tilt: -8 };

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
  return <MessengerKite ready={ready} />;
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
