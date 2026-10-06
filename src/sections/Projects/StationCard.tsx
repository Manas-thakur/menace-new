import type { RefObject } from 'react';
import type { Station } from '../../data/profile';
import { Sticker } from '../../components/primitives/Print';
import { CoverArt } from './CoverArt';

type StationCardProps = {
  station: Station;
  tuning: boolean;
  artRef: RefObject<HTMLDivElement | null>;
  bodyRef: RefObject<HTMLDivElement | null>;
  staticRef: RefObject<HTMLDivElement | null>;
};

/** The paper "station card". It stays mounted while the station changes so the
 * aria-live header announces each new station. */
export function StationCard({ station, tuning, artRef, bodyRef, staticRef }: StationCardProps) {
  return (
    <article className={`station ${tuning ? 'is-tuning' : ''}`} id="projects-station">
      <div className="station__art" ref={artRef}>
        <CoverArt motif={station.motif} />
        {station.metric && (
          <Sticker className="station__metric" rotate={5} size="sm">
            <span className="station__metric-inner">
              <span className="station__metric-value">{station.metric.value}</span>
              <span className="station__metric-label">{station.metric.label}</span>
            </span>
          </Sticker>
        )}
      </div>

      <div className="station__body" ref={bodyRef}>
        <div className="station__head" aria-live="polite" aria-atomic="true">
          <p className="station__meta">
            <span className="station__freq">{station.freq.toFixed(1)} FM</span>
            <span aria-hidden="true">·</span>
            <span>{station.year}</span>
          </p>
          <h3 className="station__name">{station.name}</h3>
          <p className="station__kicker">{station.kicker}</p>
        </div>

        <ul className="station__points">
          {station.points.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>

        <ul className="station__stack" aria-label="Built with">
          {station.stack.map((s) => (
            <li key={s} className="station__chip">
              {s}
            </li>
          ))}
        </ul>

        {(station.credit || station.links.length > 0) && (
          <div className="station__foot">
            {station.credit && <p className="station__credit">{station.credit}</p>}
            {station.links.map((l) => (
              <a
                key={l.href}
                className="station__link"
                href={l.href}
                target="_blank"
                rel="noreferrer"
                aria-label={`${station.name} on ${l.label} (opens in a new tab)`}
              >
                {l.label} <span aria-hidden="true">↗</span>
              </a>
            ))}
          </div>
        )}
      </div>

      <div className="station__static loop" ref={staticRef} aria-hidden="true">
        <div className="station__noise loop" />
      </div>
    </article>
  );
}
