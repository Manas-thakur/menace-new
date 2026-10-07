import { useMemo, type ReactNode } from 'react';
import type { Sky, Sun } from '../../../lib/delhiSky';
import { Moon } from '../Sky';
import { lightFor, lightVars } from './light';
import { Tomb } from './Tomb';
import { FarTrees, Garden, Lawn } from './Garden';
import { Clouds } from './Clouds';
import './Painting.css';

/* The window onto Delhi, as a poster: Humayun's Tomb across its garden, drawn to the
 * building's real proportions, printed in the house inks and lit from where the sun
 * actually is over the city right now (setting behind the dome at dusk, on the facade in
 * the morning, the floodlights after dark). One view and nothing crowding it: the sky, a
 * few clouds low down, the tomb, the garden. `children` (the kite) fly between sky and land. */

/** Black kites (cheel), the birds always circling over Delhi, small and far off. */
function Soaring() {
  return (
    <div className="soaring" aria-hidden="true">
      {[0, 1].map((i) => (
        // the circle is seen from below and to one side, so it flattens into an ellipse
        <span key={i} className={`soaring__orbit soaring__orbit--${i}`}>
          <span className="soaring__spin loop">
            <svg className="soaring__bird" viewBox="-30 -8 60 22" focusable="false">
              <path d="M0-3C2-3 3-1 4 0L14-3 22-2 28 2 25 3 27 4 23 4.5 24 5.5 19 5 12 4 5 4 4 6 5.5 12.5 0 10.4-5.5 12.5-4 6-5 4-12 4-19 5-24 5.5-23 4.5-27 4-25 3-28 2-22-2-14-3-4 0C-3-1-2-3 0-3Z" />
            </svg>
          </span>
        </span>
      ))}
    </div>
  );
}

export function Painting({ sky, sun, moon, children }: { sky: Sky; sun: Sun; moon: number; children?: ReactNode }) {
  const light = useMemo(() => lightFor(sky, sun), [sky, sun]);
  return (
    <div className="painting" data-sky={sky} style={lightVars(light)}>
      <div className="painting__sky" aria-hidden="true" />
      <div className="painting__stars" aria-hidden="true" />
      <div className="painting__glow" aria-hidden="true" />
      {light.disc && <div className="painting__sun" aria-hidden="true" />}
      {sky === 'night' && (
        <div className="painting__moon" aria-hidden="true">
          <Moon phase={moon} />
        </div>
      )}
      <div className="tx tx-halftone painting__halftone" aria-hidden="true" />
      <Clouds />
      {sky !== 'night' && <Soaring />}
      {children}
      <svg className="painting__land" viewBox="0 0 1600 700" overflow="visible" aria-hidden="true" focusable="false">
        <FarTrees />
        <Lawn />
        <g transform="translate(800 413) scale(0.52)">
          <Tomb light={light} />
        </g>
        <Garden light={light} sun={sun} />
      </svg>
    </div>
  );
}
