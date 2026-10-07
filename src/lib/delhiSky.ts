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

export type Sun = {
  /** degrees above the horizon */
  altitude: number;
  /** degrees clockwise from north */
  azimuth: number;
  /** still climbing (morning) */
  rising: boolean;
};

/** Where the sun is over Delhi: its altitude, its bearing, and whether it is still climbing. */
export function sunOverDelhi(date = new Date()): Sun {
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
  // bearing from the south, turning west; a half-turn makes it a compass bearing
  const fromSouth = Math.atan2(Math.sin(ha), Math.cos(ha) * Math.sin(lat) - Math.tan(dec) * Math.cos(lat)) / RAD;
  return { altitude, azimuth: (fromSouth + 540) % 360, rising: ha < 0 };
}

export type Sky = 'night' | 'dawn' | 'day' | 'dusk';

/** Night below civil twilight; dawn and dusk while the sun is low; day above that. */
export function skyOverDelhi(date = new Date()): Sky {
  return skyFor(sunOverDelhi(date));
}
function skyFor({ altitude, rising }: Sun): Sky {
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

/** A typical sun for each sky, for previews: a clear morning, and the sun low at either end of the day. */
const TYPICAL: Record<Sky, Sun> = {
  night: { altitude: -35, azimuth: 330, rising: false },
  dawn: { altitude: 4, azimuth: 100, rising: true },
  day: { altitude: 38, azimuth: 128, rising: true },
  dusk: { altitude: 3, azimuth: 262, rising: false },
};

/** `?sky=night` (dawn, day, dusk) shows a given sky; `?sun=20,120` puts the sun at an altitude and
 * bearing. For previews and screenshots. */
function forced(): Sun | null {
  if (typeof window === 'undefined') return null;
  const q = new URLSearchParams(window.location.search);
  const [alt, az] = (q.get('sun') ?? '').split(',').map(Number);
  if (Number.isFinite(alt) && Number.isFinite(az)) return { altitude: alt, azimuth: az, rising: az < 180 };
  const v = q.get('sky') as Sky;
  return v in TYPICAL ? TYPICAL[v] : null;
}

/** The sky over Delhi, the sun's place in it and tonight's moon, kept current minute by minute. */
export function useDelhiSky() {
  const read = () => {
    const sun = forced() ?? sunOverDelhi();
    return { sky: skyFor(sun), sun, moon: moonPhase() };
  };
  const [state, setState] = useState(read);
  useEffect(() => {
    const id = window.setInterval(() => {
      const next = read();
      setState((prev) =>
        prev.sky === next.sky &&
        Math.abs(prev.moon - next.moon) < 0.002 &&
        Math.abs(prev.sun.altitude - next.sun.altitude) < 0.5 &&
        Math.abs(prev.sun.azimuth - next.sun.azimuth) < 0.75
          ? prev
          : next
      );
    }, 60_000);
    return () => window.clearInterval(id);
  }, []);
  return state;
}
