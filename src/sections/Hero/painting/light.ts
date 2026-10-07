import type { CSSProperties } from 'react';
import type { Sky, Sun } from '../../../lib/delhiSky';

/* How the painting is lit. The window looks west across the garden at the tomb, so the
 * sun sets behind the dome, and the light is worked out from where the sun really is over
 * Delhi: on the facade from behind you in the morning, behind the building by evening,
 * and after dark the floodlights on the lawn, aimed up at the stone. It is painted the
 * way a poster is printed: every face in one of three flat tones, shadows with hard edges. */

const RAD = Math.PI / 180;

/** A direction in the picture: u to the right (north), v up, w out towards the viewer (east). */
export type Vec = { u: number; v: number; w: number };

export type Light = {
  /** towards the light (a unit vector) */
  s: Vec;
  /** how strong the direct light is, 0–1 (none while the sun is under the horizon) */
  direct: number;
  /** 0 white daylight … 1 the gold of a low sun (or the floodlights) */
  warm: number;
  /** the tone of each kind of face: 1 lit, 0.55 half, 0.12 in shade */
  front: number;
  left: number;
  right: number;
  /** and of the ground, which faces the sky */
  up: number;
  /** floodlit from the lawn (night) */
  flood: boolean;
  /** the sun, when it is in the window: x 0–1 across, degrees above the horizon */
  disc: { x: number; alt: number } | null;
  /** where the light comes through a recess this deep: the opening's image on its back wall, or null if it is all shade */
  through: (depth: number) => [number, number] | null;
  /** the lit part of a dome (a sphere seen side-on), as a path in a unit circle, and its rotation */
  terminator: { d: string; angle: number };
};

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const norm = (s: Vec): Vec => {
  const l = Math.hypot(s.u, s.v, s.w) || 1;
  return { u: s.u / l, v: s.v / l, w: s.w / l };
};
const dot = (a: Vec, b: Vec) => a.u * b.u + a.v * b.v + a.w * b.w;

const FRONT: Vec = { u: 0, v: 0, w: 1 };
const LEFT: Vec = { u: -Math.SQRT1_2, v: 0, w: Math.SQRT1_2 }; // the south-west chamfer, turned to the left
const RIGHT: Vec = { u: Math.SQRT1_2, v: 0, w: Math.SQRT1_2 }; // the north-west one
const UP: Vec = { u: 0, v: 1, w: 0 };

/** Degrees of view across the window (the sun's place in it is measured to this scale). */
export const FIELD = 64;

/** Three inks: lit, half-lit, shade. */
const tone = (n: number) => (n >= 0.64 ? 1 : n >= 0.42 ? 0.55 : 0.12);

export function lightFor(sky: Sky, sun: Sun): Light {
  let s: Vec;
  let direct: number;
  let warm: number;
  let ambient: number;
  const flood = sky === 'night';

  if (flood) {
    // lamps in the grass, a little to the right of the path, throwing light up the stone
    s = norm({ u: 0.16, v: -0.38, w: 0.91 });
    direct = 0.85;
    warm = 1;
    ambient = 0.06;
  } else {
    const alt = sun.altitude * RAD;
    const az = sun.azimuth * RAD;
    // west is into the picture: north to the right, east towards the viewer
    s = { u: Math.cos(alt) * Math.cos(az), v: Math.sin(alt), w: Math.cos(alt) * Math.sin(az) };
    // a low sun is weak only in its last degrees; in golden hour it still lights the stone hard
    direct = smooth(-1.5, 3.5, sun.altitude);
    warm = 1 - smooth(4, 26, sun.altitude);
    // with the sun behind the building its face sees only the sky: by day that is still
    // a bright sky (the middle ink); at sunrise and sunset it falls to silhouette
    ambient = sky === 'day' ? 0.45 : 0.27 * (s.w < 0 ? 0.72 : 1);
  }

  const face = (n: Vec) => tone(Math.min(1, ambient + direct * Math.max(0, dot(n, s)) * (1 - ambient)));

  // the sun is in the window only near sunset, ahead and low
  const ahead = !flood && Math.abs(sun.azimuth - 270) < FIELD / 2 + 6;
  const disc = ahead && sun.altitude > -5 && sun.altitude < 15 ? { x: Math.min(0.86, Math.max(0.14, 0.5 + (sun.azimuth - 270) / FIELD)), alt: sun.altitude } : null;

  const through = (depth: number): [number, number] | null => {
    if (direct < 0.04 || s.w < 0.06) return null;
    const dx = (-depth * s.u) / s.w;
    const dy = (depth * s.v) / s.w;
    const cap = depth * 2.4;
    return [Math.max(-cap, Math.min(cap, dx)), Math.max(-cap, Math.min(cap, dy))];
  };

  // a sphere lit from s: the limb on the light's side, closed by the terminator, a
  // half-ellipse |w| wide (past the middle when the light is in front, a crescent when
  // behind; a poster keeps that crescent as a rim of light even when the sun is right behind)
  const w = Math.max(-1, Math.min(1, s.w));
  const half = w > 0 ? w : Math.min(-w, direct > 0.05 ? 0.86 : 1);
  const terminator = {
    d: `M0 -1A1 1 0 0 1 0 1A${half.toFixed(3)} 1 0 0 ${w > 0 ? 1 : 0} 0 -1Z`,
    angle: (Math.atan2(-s.v, s.u) * 180) / Math.PI,
  };

  return { s, direct, warm, front: face(FRONT), left: face(LEFT), right: face(RIGHT), up: face(UP), flood, disc, through, terminator };
}

const pct = (n: number) => `${Math.round(n * 1000) / 10}%`;

/** The light as custom properties: the stylesheet mixes each material's two inks with them. */
export function lightVars(light: Light): CSSProperties {
  return {
    ['--lf' as string]: pct(light.front),
    ['--ll' as string]: pct(light.left),
    ['--lr' as string]: pct(light.right),
    ['--lu' as string]: pct(light.up),
    ['--warm' as string]: pct(light.warm),
    ['--direct' as string]: pct(light.direct),
    ['--sun-x' as string]: pct(light.disc?.x ?? 0.5),
    ['--sun-alt' as string]: (light.disc?.alt ?? 0).toFixed(2),
  };
}
