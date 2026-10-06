import { useEffect, useState } from 'react';
import { zones } from '../../data/profile';

/** Re-renders on every minute boundary. */
function useMinute() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    let t = 0;
    const schedule = () => {
      t = window.setTimeout(() => {
        setNow(new Date());
        schedule();
      }, 60_000 - (Date.now() % 60_000) + 40);
    };
    schedule();
    return () => window.clearTimeout(t);
  }, []);
  return now;
}

const formatters = new Map<string, { time: Intl.DateTimeFormat; day: Intl.DateTimeFormat; offset: Intl.DateTimeFormat }>();

function formatFor(timeZone: string) {
  let f = formatters.get(timeZone);
  if (!f) {
    f = {
      time: new Intl.DateTimeFormat('en-GB', { timeZone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }),
      day: new Intl.DateTimeFormat('en-GB', { timeZone, weekday: 'short' }),
      offset: new Intl.DateTimeFormat('en-US', { timeZone, timeZoneName: 'shortOffset' }),
    };
    formatters.set(timeZone, f);
  }
  return f;
}

export function Clocks() {
  const now = useMinute();
  return (
    <ul className="contact__clocks" aria-label="Local times" data-rise>
      {zones.map((z) => {
        const f = formatFor(z.tz);
        const offset = f.offset.formatToParts(now).find((p) => p.type === 'timeZoneName')?.value ?? '';
        const here = z.tag === 'IST';
        return (
          <li key={z.tag} className={`contact__clock ${here ? 'is-here' : ''}`}>
            <span className="contact__clock-zone">
              {z.tag} · {z.city}
            </span>
            <time className="contact__clock-time" dateTime={now.toISOString()}>
              {f.time.format(now)}
            </time>
            <span className="contact__clock-meta">
              {f.day.format(now)} · {offset}
            </span>
            {here && (
              <span className="contact__here">
                <i className="contact__dot loop" aria-hidden="true" />
                Manas is here
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
