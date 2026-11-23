import { useEffect, useMemo, useRef, useState } from 'react';
import type { SectionProps } from '../../App';
import { Drawer } from '../../components/primitives/Drawer';
import { flags, prefersReducedMotion } from '../../lib/motion';
import { scrollToSection } from '../../lib/scroll';
import { INTRO_DONE } from '../../lib/intro';
import { profile } from '../../data/profile';
import { deepCut } from '../../data/deep';
import { discover } from '../../lib/deep';
import { useReveal } from '../Hero/useReveal';
import './PondHome.css';

/* Side A — मानस, the mind, the same word as the lake Mānasarovar: so the home page is a pond.
 * Squishkit's Lily pond (src/vendor/squishkit, MIT), full bleed, in its paper look: koi gliding
 * under the pads, water lilies, a frog, dragonflies, ripples. Over it, one quiet plate: the name,
 * the line, the way in. Touch the water and an old poem surfaces. */

const SECTIONS: [string, string][] = [
  ['About', 'about'],
  ['Work', 'work'],
  ['Projects', 'projects'],
  ['Photos', 'photos'],
  ['Say hello', 'contact'],
];

function useLocalTime(timeZone: string) {
  const fmt = useMemo(() => new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone }), [timeZone]);
  const [time, setTime] = useState(() => fmt.format(new Date()));
  useEffect(() => {
    const id = window.setInterval(() => setTime(fmt.format(new Date())), 15_000);
    return () => window.clearInterval(id);
  }, [fmt]);
  return time;
}

export function PondHome({ index }: SectionProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const sceneEl = useRef<HTMLElement | null>(null);
  const [intro] = useState(() => !flags.noIntro && !prefersReducedMotion());
  const [introDone, setIntroDone] = useState(() => !intro);
  const [ready, setReady] = useState(false);
  const [poem, setPoem] = useState(false);
  const time = useLocalTime(profile.timeZone);

  // Deep cut 01 — rest on the name (or tap it): Manas turns to मानस and says what it means.
  const mind = deepCut('mind');
  const name = useReveal(() => discover('mind'), { linger: 3200, enabled: introDone });
  const oldPond = deepCut('pond');

  useEffect(() => {
    if (!intro) return;
    const id = window.setTimeout(() => {
      setIntroDone(true);
      window.dispatchEvent(new Event(INTRO_DONE));
    }, 900);
    return () => window.clearTimeout(id);
  }, [intro]);

  // The pond loads after the first paint, in its own chunk, and holds still whenever it can't be seen.
  useEffect(() => {
    let alive = true;
    const stage = stageRef.current;
    if (!stage) return;
    let mo: MutationObserver | null = null;
    const sync = () => {
      const drawer = stage.closest<HTMLElement>('.drawer');
      // pinned under the next drawer it still "intersects": tell it to hold still
      sceneEl.current?.toggleAttribute(
        'still',
        document.hidden || drawer?.dataset.offscreen === 'true' || drawer?.dataset.covered === 'true',
      );
    };
    import('../../vendor/squishkit/scenes/index.js').then(() => {
      if (!alive || !hostRef.current) return;
      const el = document.createElement('squish-scene');
      el.setAttribute('name', 'pond');
      el.setAttribute('look', 'paper');
      el.setAttribute('px', window.innerWidth < 600 ? '3' : '4');
      el.setAttribute('aria-hidden', 'true');
      hostRef.current.appendChild(el);
      sceneEl.current = el;
      const drawer = stage.closest<HTMLElement>('.drawer');
      mo = new MutationObserver(sync);
      if (drawer) mo.observe(drawer, { attributes: true, attributeFilter: ['data-offscreen', 'data-covered'] });
      document.addEventListener('visibilitychange', sync);
      sync();
      requestAnimationFrame(() => alive && setReady(true));
    });
    return () => {
      alive = false;
      mo?.disconnect();
      document.removeEventListener('visibilitychange', sync);
      sceneEl.current?.remove();
      sceneEl.current = null;
    };
  }, []);

  // Deep cut 02 — touch the water: Bashō's old pond.
  useEffect(() => {
    if (!poem) return;
    const id = window.setTimeout(() => setPoem(false), 7000);
    return () => window.clearTimeout(id);
  }, [poem]);
  const touch = () => {
    discover('pond');
    setPoem(true);
  };

  const go = (id: string) => (e: { preventDefault: () => void }) => {
    e.preventDefault();
    scrollToSection(id);
  };

  return (
    <Drawer id="top" index={index} label="Introduction" className="pondhome">
      <div ref={stageRef} className={`pondhome__stage ${intro ? 'is-intro' : ''} ${ready ? 'is-ready' : ''}`}>
        <div ref={hostRef} className="pondhome__water" aria-hidden="true" onClick={touch} />
        <p className="visually-hidden">A lily pond seen from above: koi gliding under the pads, water lilies, a frog and dragonflies.</p>

        <p className="pondhome__poem" aria-live="polite" data-on={poem || undefined}>
          {poem && (
            <>
              <span lang="ja">{oldPond.lines[0].text}</span>
              <span>{oldPond.lines[1].text}</span>
            </>
          )}
        </p>

        <div className="pondhome__plate">
          <p className="pondhome__now">
            <span className="pondhome__dot loop" aria-hidden="true" />
            {profile.now} · Delhi {time}
          </p>
          <div className="pondhome__name-wrap">
            <h1 className="pondhome__name" aria-label={`${profile.first} ${profile.last}`} data-open={name.open || undefined}>
              <span className="pondhome__first" aria-hidden="true" onClick={name.toggle} {...name.pointer}>
                <span className="pondhome__latin">{profile.first}</span>
                <span className="pondhome__deva" lang="sa">
                  {mind.lines[0].text}
                </span>
              </span>{' '}
              <span aria-hidden="true">{profile.last}</span>
            </h1>
            <button type="button" className="pondhome__sr-btn" aria-expanded={name.open} aria-controls="pondhome-tag" onClick={name.toggle}>
              What does “{profile.first}” mean?
            </button>
            <p id="pondhome-tag" className="pondhome__tag" aria-hidden={!name.open} data-open={name.open || undefined}>
              <span lang="sa">{mind.lines[0].text}</span> · {mind.lines[1].text} {mind.lines[2].text}
            </p>
          </div>
          <p className="pondhome__line">{profile.tagline}</p>
          <nav aria-label="Sections (cover)">
            <ul className="pondhome__links">
              {SECTIONS.map(([label, id]) => (
                <li key={id}>
                  <a href={`#${id}`} onClick={go(id)}>
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
          <button type="button" className="pondhome__sr-btn" onClick={touch}>
            Touch the water
          </button>
        </div>

        <a className="pondhome__credit" href="https://squishkit.vercel.app/site/scenes.html#pond" target="_blank" rel="noreferrer">
          pond: squishkit
        </a>
      </div>
    </Drawer>
  );
}
