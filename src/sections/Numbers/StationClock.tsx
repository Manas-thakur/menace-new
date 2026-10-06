import { useEffect, useMemo, useRef, useState } from 'react';
import { prefersReducedMotion } from '../../lib/motion';
import './StationClock.css';

const C = { x: 110, y: 160 }; // dial centre in viewBox units
const DEVA = ['१२', '३', '६', '९']; // quarter numerals, Devanagari

type Hm = { h: number; m: number; s: number };

function useFormatter(timeZone: string) {
  return useMemo(
    () => new Intl.DateTimeFormat('en-GB', { timeZone, hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }),
    [timeZone]
  );
}

function read(fmt: Intl.DateTimeFormat, d = new Date()): Hm {
  const p: Record<string, string> = {};
  for (const part of fmt.formatToParts(d)) p[part.type] = part.value;
  return { h: Number(p.hour) % 24, m: Number(p.minute), s: Number(p.second) };
}

const pad = (n: number) => String(n).padStart(2, '0');

/** Keeps a hand turning forward across the 12/60 wrap instead of spinning back. */
function forward(prev: number | null, target: number) {
  if (prev === null) return target;
  return prev + ((((target - prev) % 360) + 360) % 360);
}

function ticks() {
  const out: string[] = [];
  for (let i = 0; i < 60; i++) {
    const hour = i % 5 === 0;
    const a = (i / 60) * Math.PI * 2;
    const r0 = hour ? 70 : 79;
    const r1 = 85;
    const x0 = C.x + Math.sin(a) * r0;
    const y0 = C.y - Math.cos(a) * r0;
    const x1 = C.x + Math.sin(a) * r1;
    const y1 = C.y - Math.cos(a) * r1;
    out.push(`${hour ? 'H' : 'M'}${x0.toFixed(2)},${y0.toFixed(2)},${x1.toFixed(2)},${y1.toFixed(2)}`);
  }
  return out;
}
const TICKS = ticks();

type StationClockProps = { timeZone: string; owner: string };

/** A hanging platform clock (original drawing) running on the owner's local time. */
export function StationClock({ timeZone, owner }: StationClockProps) {
  const fmt = useFormatter(timeZone);
  const hourRef = useRef<SVGGElement>(null);
  const minuteRef = useRef<SVGGElement>(null);
  const secondRef = useRef<SVGGElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [now, setNow] = useState<Hm>(() => read(fmt));

  useEffect(() => {
    const reduced = prefersReducedMotion();
    const last: Record<'h' | 'm' | 's', number | null> = { h: null, m: null, s: null };
    const turn = (el: SVGGElement | null, key: 'h' | 'm' | 's', deg: number) => {
      if (!el) return;
      last[key] = forward(last[key], deg);
      el.style.transform = `rotate(${last[key]}deg)`;
    };
    const tick = () => {
      if (document.hidden) return;
      const t = read(fmt);
      turn(secondRef.current, 's', t.s * 6);
      turn(minuteRef.current, 'm', t.m * 6 + (reduced ? 0 : t.s * 0.1));
      turn(hourRef.current, 'h', (t.h % 12) * 30 + t.m * 0.5);
      setNow((prev) => (prev.h === t.h && prev.m === t.m ? prev : t));
    };

    tick();
    // Transitions switch on only after the first placement, so the hands never spin in on load.
    const raf = requestAnimationFrame(() => svgRef.current?.classList.add('is-running'));
    const step = reduced ? 60_000 : 1000;
    let interval = 0;
    const timeout = window.setTimeout(() => {
      tick();
      interval = window.setInterval(tick, step);
    }, step - (Date.now() % step));
    document.addEventListener('visibilitychange', tick);

    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(timeout);
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [fmt]);

  const hhmm = `${pad(now.h)}:${pad(now.m)}`;

  return (
    <figure className="clock">
      <div className="clock__dial">
        <div className="clock__sun" aria-hidden="true" />
        <svg ref={svgRef} className="clock__svg" viewBox="0 0 220 270" role="img" aria-label={`Station clock showing ${hhmm} in Delhi`}>
          <defs>
            <radialGradient id="clock-face" cx="50%" cy="42%" r="62%">
              <stop offset="0" className="clock__stop-hi" />
              <stop offset="1" className="clock__stop-lo" />
            </radialGradient>
          </defs>

          {/* cast-iron hanger; the rod runs up past the viewBox to the drawer's top edge */}
          <g className="clock__bracket">
            <rect x="106" y="-600" width="8" height="648" rx="2" />
            <path d="M106 26c-14-2-26 4-27 14-1 8 7 12 12 8 4-3 2-9-3-8M114 26c14-2 26 4 27 14 1 8-7 12-12 8-4-3-2-9 3-8" className="clock__scroll" />
            <rect x="92" y="44" width="36" height="11" rx="3" />
            <rect x="100" y="52" width="20" height="10" rx="2" />
          </g>

          {/* case */}
          <circle cx={C.x} cy={C.y} r="100" className="clock__bezel" />
          <circle cx={C.x} cy={C.y} r="95" className="clock__brass" />
          <circle cx={C.x} cy={C.y} r="91" className="clock__bezel" />
          <circle cx={C.x} cy={C.y} r="89" fill="url(#clock-face)" />
          <circle cx={C.x} cy={C.y} r="66" className="clock__chapter" />

          {/* minute and hour marks */}
          <g className="clock__ticks">
            {TICKS.map((t, i) => {
              const [x0, y0, x1, y1] = t.slice(1).split(',');
              return <line key={i} x1={x0} y1={y0} x2={x1} y2={y1} className={t[0] === 'H' ? 'is-hour' : 'is-minute'} />;
            })}
          </g>

          {/* Devanagari quarter numerals */}
          <g className="clock__numerals">
            <text x={C.x} y={C.y - 46}>
              {DEVA[0]}
            </text>
            <text x={C.x + 50} y={C.y + 6}>
              {DEVA[1]}
            </text>
            <text x={C.x} y={C.y + 58}>
              {DEVA[2]}
            </text>
            <text x={C.x - 50} y={C.y + 6}>
              {DEVA[3]}
            </text>
          </g>
          <text x={C.x} y={C.y - 22} className="clock__zone">
            IST
          </text>

          {/* hands */}
          <g ref={hourRef} className="clock__hand">
            <path d="M106.2 172 L107.4 160 L106 128 L110 104 L114 128 L112.6 160 L113.8 172 Z" className="clock__hand-ink" />
          </g>
          <g ref={minuteRef} className="clock__hand">
            <path d="M107.2 176 L108.2 160 L108.9 86 L110 76 L111.1 86 L111.8 160 L112.8 176 Z" className="clock__hand-ink" />
          </g>
          <g ref={secondRef} className="clock__hand clock__hand--second">
            <line x1={C.x} y1="184" x2={C.x} y2="80" className="clock__second-line" />
            <path d="M110 74 L113 82 L107 82 Z" className="clock__second-fill" />
            <circle cx={C.x} cy="178" r="4.8" className="clock__second-fill" />
          </g>
          <circle cx={C.x} cy={C.y} r="6.2" className="clock__cap" />
          <circle cx={C.x} cy={C.y} r="2.2" className="clock__pin" />

          {/* glass */}
          <path d="M48 128 A 66 66 0 0 1 104 78" className="clock__glare" />
        </svg>
      </div>
      <figcaption className="clock__caption">
        <time className="clock__digital" dateTime={hhmm}>
          {hhmm}
        </time>
        <span className="clock__note">{owner}’s local time — IST (UTC+5:30)</span>
      </figcaption>
    </figure>
  );
}
