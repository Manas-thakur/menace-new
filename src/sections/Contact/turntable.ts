import { gsap } from '../../lib/gsap';
import { ETCH, etchMid } from './Record';

/* The record's spin is a single CSS animation on its SVG. Everything here steers it
 * through playbackRate only — never pause()/play(), which would permanently override
 * animation-play-state and stop the drawer's off-screen pause from working. */

export function motorsOf(svg: Element | null | undefined): Animation[] {
  return svg?.getAnimations?.() ?? [];
}

/** Ease the platter to a speed (1 = normal play, 0 = stopped). */
export function setSpeed(motors: Animation[], rate: number, duration: number, ease: string) {
  if (!motors.length) return null;
  return gsap.to(motors, { playbackRate: rate, duration, ease, overwrite: true });
}

/** Where the disc is now, in degrees 0–360 (clockwise), read from the animation clock. */
export function discAngle(motors: Animation[]): number {
  const a = motors[0];
  if (!a) return 0;
  const period = Number(a.effect?.getComputedTiming().duration) || 9000;
  const t = Number(a.currentTime ?? 0);
  return ((((t / period) * 360) % 360) + 360) % 360;
}

const wrap = (deg: number) => ((((deg + 180) % 360) + 360) % 360) - 180;

/** The copy of the etching that currently sits closest to `screenAngle` (−90 = top). */
export function nearestEtch(motors: Animation[], screenAngle = -90): number {
  const rotation = discAngle(motors);
  let best = 0;
  let bestGap = Infinity;
  for (let k = 0; k < ETCH.copies; k++) {
    const gap = Math.abs(wrap(etchMid(k) + rotation - screenAngle));
    if (gap < bestGap) {
      bestGap = gap;
      best = k;
    }
  }
  return best;
}
