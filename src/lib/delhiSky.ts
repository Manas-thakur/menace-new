import { useEffect, useState } from 'react';

/* The sky over Delhi, right now — computed, not guessed: the sun's height above the
 * city's horizon (so dawn and dusk follow the real sunrise and sunset for the date),
 * and the phase of tonight's moon. Low-precision formulas (a minute or so for the sun,
 * under a day for the moon), which is all a painted window needs. */

const DELHI = { lat: 28.6139, lon: 77.209 };
const RAD = Math.PI / 180;
const DAY = 86_400_000;

/** Days since J2000.0 (2000-01-01 12:00 UTC). */
const sinceJ2000 = (t: number) => t / DAY - 10_957.5;

/** The sun's altitude above Delhi's horizon (degrees), and whether it is still climbing. */
export function sunOverDelhi(date = new Date()) {
  const d = sinceJ2000(date.getTime());
  const g = (357.529 + 0.98560028 * d) * RAD; // mean anomaly
  const q = 280.459 + 0.98564736 * d; // mean longitude
  const L = (q + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)) * RAD; // ecliptic longitude
  const e = (23.439 - 0.00000036 * d) * RAD; // obliquity of the ecliptic
  const ra = Math.atan2(Math.cos(e) * Math.sin(L), Math.cos(L));
  const dec = Math.asin(Math.sin(e) * Math.sin(L));
  const gmst = (280.46061837 + 360.98564736629 * d) * RAD;
  let ha = (gmst + DELHI.lon * RAD - ra) % (2 * Math.PI); // hour angle
  if (ha > Math.PI) ha -= 2 * Math.PI;
  if (ha < -Math.PI) ha += 2 * Math.PI;
  const lat = DELHI.lat * RAD;
  const altitude = Math.asin(Math.sin(lat) * Math.sin(dec) + Math.cos(lat) * Math.cos(dec) * Math.cos(ha)) / RAD;
  return { altitude, rising: ha < 0 };
}

export type Sky = 'night' | 'dawn' | 'day' | 'dusk';

/** Night below civil twilight; dawn and dusk while the sun is low; day above that. */
export function skyOverDelhi(date = new Date()): Sky {
  const { altitude, rising } = sunOverDelhi(date);
  if (altitude < -6) return 'night';
  if (altitude < 8) return rising ? 'dawn' : 'dusk';
  return 'day';
}

/** The moon's age as a fraction of its cycle: 0 new, 0.5 full, back to 1. */
export function moonPhase(date = new Date()) {
  const synodic = 29.530588853;
  const days = (date.getTime() - Date.UTC(2000, 0, 6, 18, 14)) / DAY; // from a known new moon
  return (((days % synodic) + synodic) % synodic) / synodic;
}

/** What the moon is called tonight. */
export function moonName(phase: number) {
  const names: [number, string][] = [
    [0.03, 'a new moon'],
    [0.22, 'a waxing crescent'],
    [0.28, 'a first-quarter moon'],
    [0.47, 'a waxing gibbous moon'],
    [0.53, 'a full moon'],
    [0.72, 'a waning gibbous moon'],
    [0.78, 'a last-quarter moon'],
    [0.97, 'a waning crescent'],
  ];
  return names.find(([upTo]) => phase < upTo)?.[1] ?? 'a new moon';
}

/** The sky in words, for whoever can't see the window. */
export function describeSky(sky: Sky, phase: number) {
  if (sky === 'night') return `night, under ${moonName(phase)}`;
  if (sky === 'dawn') return 'first light';
  if (sky === 'day') return 'a clear day';
  return 'sunset';
}

const SKIES: Sky[] = ['night', 'dawn', 'day', 'dusk'];

/** `?sky=night` (dawn, day, dusk) shows a given sky, for previews and screenshots. */
function forced(): Sky | null {
  if (typeof window === 'undefined') return null;
  const v = new URLSearchParams(window.location.search).get('sky');
  return SKIES.includes(v as Sky) ? (v as Sky) : null;
}

/** The sky over Delhi and tonight's moon, kept current minute by minute. */
export function useDelhiSky() {
  const read = () => ({ sky: forced() ?? skyOverDelhi(), moon: moonPhase() });
  const [state, setState] = useState(read);
  useEffect(() => {
    const id = window.setInterval(() => {
      const next = read();
      setState((prev) => (prev.sky === next.sky && Math.abs(prev.moon - next.moon) < 0.002 ? prev : next));
    }, 60_000);
    return () => window.clearInterval(id);
  }, []);
  return state;
}
