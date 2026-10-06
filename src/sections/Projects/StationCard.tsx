import type { RefObject } from 'react';
import type { Station } from '../../data/profile';
import type { DeepCut } from '../../data/deep';
import { openLinerNotes } from '../../lib/deep';
import { Sticker } from '../../components/primitives/Print';
import { CoverArt } from './CoverArt';
import { MalaArt } from './MalaArt';

type StationCardProps = {
  /** A regular station, or `null` while the hidden one is on air. */
  station: Station | null;
  /** The hidden station's deep cut, when tuned to it. */
  secret: { cut: DeepCut; freq: number } | null;
  tuning: boolean;
  artRef: RefObject<HTMLDivElement | null>;
  bodyRef: RefObject<HTMLDivElement | null>;
  staticRef: RefObject<HTMLDivElement | null>;
};

const pad = (n: number) => String(n).padStart(2, '0');

/** The paper "station card". The article, art, body and the aria-live header stay
 * mounted while the station changes, so each new station is announced. */
export function StationCard({ station, secret, tuning, artRef, bodyRef, staticRef }: StationCardProps) {
  const cut = secret?.cut;
  return (
    <article className={`station ${tuning ? 'is-tuning' : ''} ${cut ? 'is-secret' : ''}`} id="projects-station">
      <div className="station__art" ref={artRef}>
        {cut ? <MalaArt /> : station && <CoverArt motif={station.motif} />}
        {station?.metric && (
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
            <span className="station__freq">{(secret?.freq ?? station?.freq ?? 0).toFixed(1)} FM</span>
            <span aria-hidden="true">·</span>
            <span>{cut ? `Deep cut ${pad(cut.no)}` : station?.year}</span>
          </p>
          <h3 className="station__name">{cut ? cut.title : station?.name}</h3>
          {station && <p className="station__kicker">{station.kicker}</p>}
        </div>

        {cut ? (
          <figure className="station__verse">
            <blockquote>
              {cut.lines.map((line) =>
                line.lang && line.lang !== 'en' ? (
                  <p key={line.text} className="station__verse-orig" lang={line.lang}>
                    {line.text}
                  </p>
                ) : (
                  <p key={line.text} className="station__verse-trans">
                    {line.text}
                  </p>
                )
              )}
            </blockquote>
            <figcaption className="station__foot">
              <span className="station__source">{cut.source}</span>
              <button type="button" className="station__link" onClick={() => openLinerNotes(cut.id)}>
                Liner notes <span aria-hidden="true">→</span>
              </button>
            </figcaption>
          </figure>
        ) : (
          station && (
            <>
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
            </>
          )
        )}
      </div>

      <div className="station__static loop" ref={staticRef} aria-hidden="true">
        <div className="station__noise loop" />
      </div>
    </article>
  );
}
