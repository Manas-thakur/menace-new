import type { CSSProperties } from 'react';
import { stages, type Stage } from '../../data/profile';
import './PosterWall.css';

const COLUMNS = 5;
const PER_COLUMN = 4;
// Calm, slightly different speeds so the wall never moves in lockstep.
const SPEEDS = [54, 66, 58, 70, 62];

/** "Octalucent (OSS & Consulting)" → ["Octalucent", "OSS & Consulting"] */
export function splitOrg(stage: Stage): { name: string; note?: string } {
  const m = stage.org.match(/^(.*?)\s*\((.+)\)\s*$/);
  if (m) return { name: m[1], note: stage.orgNote ?? m[2] };
  return { name: stage.org, note: stage.orgNote };
}

function Poster({ stage, variant }: { stage: Stage; variant: number }) {
  const { name, note } = splitOrg(stage);
  const long = name.length > 14;
  return (
    <div className={`poster poster--v${variant}`}>
      <div className="poster__inner">
        <span className="poster__bill">Manas Thakur · Live</span>
        <span className="poster__year">{stage.year}</span>
        <span className={`poster__org ${long ? 'is-long' : ''}`}>{name}</span>
        {note ? <span className="poster__note">{note}</span> : <span className="poster__note" />}
        <span className="poster__role">{stage.role}</span>
        <span className="poster__where">
          {stage.city}
          <b className={`zone zone--${stage.zone}`}>{stage.zone}</b>
        </span>
      </div>
    </div>
  );
}

/**
 * The gig-poster wall behind "ON TOUR" (studied from the reference's pronite
 * columns). Each column holds two identical halves, so translating by -50%
 * loops seamlessly. Decorative: the tour-dates list below carries the content.
 */
export function PosterWall() {
  return (
    <div className="wall" aria-hidden="true">
      {Array.from({ length: COLUMNS }, (_, ci) => {
        const picks = Array.from({ length: PER_COLUMN }, (_, k) => stages[(ci * 3 + k) % stages.length]);
        const style = {
          '--col-speed': `${SPEEDS[ci % SPEEDS.length]}s`,
          '--col-delay': `${-ci * 9}s`,
        } as CSSProperties;
        return (
          <div key={ci} className={`wall__col ${ci % 2 ? 'wall__col--down' : 'wall__col--up'}`} style={style}>
            <div className="wall__track loop">
              {[0, 1].map((half) =>
                picks.map((stage, k) => <Poster key={`${half}-${k}`} stage={stage} variant={(ci + k) % 4} />)
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
