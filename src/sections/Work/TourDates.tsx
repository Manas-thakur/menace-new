import { useEffect, useRef, useState } from 'react';
import { ScrollTrigger } from '../../lib/gsap';
import { stages, zones } from '../../data/profile';
import { splitOrg } from './PosterWall';
import './TourDates.css';

const years = stages.map((s) => Number(s.year));
const span = `${Math.min(...years)} — ${Math.max(...years)}`;
const zoneTags = zones.map((z) => z.tag).filter((tag) => stages.some((s) => s.zone === tag));

/** Tour dates, like the back of a band tee. Each row is a disclosure. */
export function TourDates({ listRef }: { listRef: React.RefObject<HTMLOListElement | null> }) {
  const [open, setOpen] = useState<Set<string>>(() => new Set([stages[0].id]));
  const refreshTimer = useRef<number | undefined>(undefined);
  const mounted = useRef(false);

  // The drawer changes height when a row opens; re-measure every trigger once the
  // panel has settled (the grid-rows transition runs for --dur-long).
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    window.clearTimeout(refreshTimer.current);
    refreshTimer.current = window.setTimeout(() => ScrollTrigger.refresh(), 480);
    return () => window.clearTimeout(refreshTimer.current);
  }, [open]);

  const toggle = (id: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <div className="tour" id="tour-dates">
      <div className="tour__head">
        <h3 className="tour__title">Tour dates</h3>
        <p className="tour__meta">
          <span>{span}</span>
          <span aria-hidden="true">·</span>
          <span className="tour__zones">
            {zoneTags.map((tag) => (
              <b key={tag} className={`zone zone--${tag}`}>
                {tag}
              </b>
            ))}
          </span>
        </p>
      </div>

      <ol className="tour__list" ref={listRef}>
        {stages.map((stage) => {
          const { name, note } = splitOrg(stage);
          const isOpen = open.has(stage.id);
          const live = /now/i.test(stage.when);
          const panelId = `tour-${stage.id}`;
          return (
            <li key={stage.id} className={`tour-row ${isOpen ? 'is-open' : ''}`}>
              <button
                type="button"
                className="tour-row__btn"
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => toggle(stage.id)}
              >
                <span className="tour-row__when">{stage.when}</span>
                <span className="tour-row__venue">
                  <span className="tour-row__org">{name}</span>
                  {note && <span className="tour-row__note">{note}</span>}
                  {live && (
                    <span className="tour-row__live">
                      <i className="tour-row__dot loop" aria-hidden="true" />
                      Now playing
                    </span>
                  )}
                </span>
                <span className="tour-row__meta">
                  <span className="tour-row__role">{stage.role}</span>
                  <span className="tour-row__where">
                    {stage.city}
                    <b className={`zone zone--${stage.zone}`}>{stage.zone}</b>
                  </span>
                </span>
                <span className="tour-row__arrow" aria-hidden="true">
                  →
                </span>
              </button>

              <div id={panelId} className="tour-row__panel" role="region" aria-label={`${stage.role}, ${name}`}>
                <div className="tour-row__clip">
                  <div className="tour-row__body">
                    <p className="tour-row__mode">{stage.mode}</p>
                    <ul className="tour-row__points">
                      {stage.points.map((p) => (
                        <li key={p}>{p}</li>
                      ))}
                    </ul>
                    <ul className="tour-row__tags" aria-label="Focus">
                      {stage.tags.map((t) => (
                        <li key={t}>{t}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
