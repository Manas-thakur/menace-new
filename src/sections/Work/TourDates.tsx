import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react';
import { gsap, ScrollTrigger } from '../../lib/gsap';
import { prefersReducedMotion } from '../../lib/motion';
import { stages, zones, type Stage } from '../../data/profile';
import { splitOrg } from './PosterWall';
import './TourDates.css';

const years = stages.map((s) => Number(s.year));
const span = `${Math.min(...years)} — ${Math.max(...years)}`;
const zoneTags = zones.map((z) => z.tag).filter((tag) => stages.some((s) => s.zone === tag));

/* Tour dates, as the passes collected along the way: one laminated backstage pass per
 * stage, each on its own printed lanyard. Choosing a pass turns it over — the panel
 * under the rail is the back of the pass, with the full story. */

type Tone = 'crimson' | 'royal' | 'leaf' | 'gold' | 'violet' | 'terracotta' | 'peacock';
const PASS: Record<string, { tone: Tone; kind: string }> = {
  ocally: { tone: 'crimson', kind: 'All access' },
  daegu: { tone: 'royal', kind: 'Crew' },
  gdg: { tone: 'leaf', kind: 'Community' },
  magicapi: { tone: 'gold', kind: 'Crew' },
  octalucent: { tone: 'violet', kind: 'Crew' },
  deviators: { tone: 'terracotta', kind: 'Community' },
  freelance: { tone: 'peacock', kind: 'Session' },
};
const passFor = (s: Stage) => PASS[s.id] ?? { tone: 'peacock' as Tone, kind: 'Crew' };

/** How far each pass hangs below the rail (rem): a little untidy, like real lanyards. */
const DROPS = [3.4, 5.8, 4.4, 6.9, 3.8, 6.2, 5];
/** A short barcode, different for every pass. */
const bars = (seed: string) =>
  Array.from(seed + seed.length, (c, i) => {
    const w = 1 + ((c.charCodeAt(0) + i * 7) % 3);
    return `${w}px`;
  }).join(' ');

export function TourDates({ listRef }: { listRef: React.RefObject<HTMLOListElement | null> }) {
  const [selected, setSelected] = useState(stages[0].id);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const panelRef = useRef<HTMLDivElement>(null);
  const first = useRef(true);
  const refreshTimer = useRef<number | undefined>(undefined);

  const index = Math.max(0, stages.findIndex((s) => s.id === selected));
  const stage = stages[index];
  const pass = passFor(stage);
  const { name, note } = splitOrg(stage);

  // Turning a pass over: the back slides in, and the drawer (whose height just changed)
  // has its scroll positions measured again once it settles.
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const panel = panelRef.current;
    if (panel && !prefersReducedMotion()) {
      gsap.fromTo(panel.querySelectorAll('[data-flip]'), { y: 14, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, stagger: 0.04, ease: 'expoOut', overwrite: true });
    }
    window.clearTimeout(refreshTimer.current);
    refreshTimer.current = window.setTimeout(() => ScrollTrigger.refresh(), 450);
    return () => window.clearTimeout(refreshTimer.current);
  }, [selected]);

  const choose = (i: number, focus = false) => {
    const s = stages[(i + stages.length) % stages.length];
    setSelected(s.id);
    if (focus) {
      const tab = tabs.current[(i + stages.length) % stages.length];
      tab?.focus({ preventScroll: true });
      tab?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
    }
  };

  const onKey = (e: KeyboardEvent, i: number) => {
    const to = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: stages.length - 1 }[e.key];
    if (to === undefined) return;
    e.preventDefault();
    choose(to, true);
  };

  // A pass you brush past swings on its lanyard.
  const swing = (el: HTMLElement | null) => {
    if (!el || prefersReducedMotion()) return;
    gsap.fromTo(
      el,
      { rotation: 0 },
      { keyframes: [{ rotation: 3.2, duration: 0.18 }, { rotation: -2.2, duration: 0.26 }, { rotation: 1, duration: 0.3 }, { rotation: 0, duration: 0.4 }], ease: 'sine.inOut', overwrite: true }
    );
  };

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

      <div className="passes">
        <div className="passes__rail" aria-hidden="true" />
        <ol className="passes__list" role="tablist" aria-label="Tour dates — one pass per stage" ref={listRef}>
          {stages.map((s, i) => {
            const p = passFor(s);
            const org = splitOrg(s);
            const live = /now/i.test(s.when);
            const on = s.id === selected;
            return (
              <li
                key={s.id}
                className={`pass-hang pass--${p.tone} ${on ? 'is-on' : ''}`}
                role="presentation"
                style={{ ['--drop' as string]: `${DROPS[i % DROPS.length]}rem`, ['--sway' as string]: `${4.2 + (i % 3) * 0.9}s`, ['--sway-delay' as string]: `${-i * 0.7}s` } as CSSProperties}
                onPointerEnter={(e) => e.pointerType === 'mouse' && swing(e.currentTarget.querySelector('.pass-hang__swing'))}
              >
                <div className="pass-hang__swing loop">
                  <span className="pass-hang__strap" aria-hidden="true">
                    <span>On tour · Manas Thakur · On tour · Manas Thakur ·</span>
                  </span>
                  <span className="pass-hang__clip" aria-hidden="true" />
                  <button
                    ref={(el) => {
                      tabs.current[i] = el;
                    }}
                    type="button"
                    role="tab"
                    id={`pass-${s.id}`}
                    className="pass"
                    aria-selected={on}
                    aria-controls="tour-pass"
                    tabIndex={on ? 0 : -1}
                    onClick={() => choose(i)}
                    onKeyDown={(e) => onKey(e, i)}
                  >
                    <span className="pass__slot" aria-hidden="true" />
                    <span className="pass__band">
                      <span className="pass__kind">{p.kind}</span>
                      {live && (
                        <span className="pass__live">
                          <i className="pass__dot loop" aria-hidden="true" />
                          Now
                        </span>
                      )}
                    </span>
                    <span className="pass__org">{org.name}</span>
                    <span className="pass__card">
                      <span className="pass__role">{s.role}</span>
                      <span className="pass__when">{s.when}</span>
                      <span className="pass__where">
                        {s.city.split(',')[0]} <b className={`zone zone--${s.zone}`}>{s.zone}</b>
                      </span>
                      <span className="pass__barcode" aria-hidden="true" style={{ ['--bars' as string]: bars(s.id) } as CSSProperties} />
                    </span>
                    <span className="pass__holo" aria-hidden="true">
                      {s.year}
                    </span>
                  </button>
                </div>
              </li>
            );
          })}
        </ol>
      </div>

      <div ref={panelRef} id="tour-pass" className={`pass-back pass--${pass.tone}`} role="tabpanel" aria-labelledby={`pass-${stage.id}`}>
        <div className="pass-back__face">
          <p className="pass-back__kicker" data-flip>
            {pass.kind} · {stage.when}
          </p>
          <h4 className="pass-back__org" data-flip>
            {name}
            {note && <small>{note}</small>}
          </h4>
          <p className="pass-back__role" data-flip>
            {stage.role}
          </p>
          <p className="pass-back__where" data-flip>
            {stage.city} <b className={`zone zone--${stage.zone}`}>{stage.zone}</b> <span aria-hidden="true">·</span> {stage.mode}
          </p>
        </div>
        <div className="pass-back__story">
          <ul className="pass-back__points" data-flip>
            {stage.points.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
          <ul className="pass-back__tags" aria-label="Focus" data-flip>
            {stage.tags.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
