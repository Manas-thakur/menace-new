import { useEffect, useMemo, useRef, useState } from 'react';
import type { SectionProps } from '../../App';
import { Drawer } from '../../components/primitives/Drawer';
import { flags, prefersReducedMotion } from '../../lib/motion';
import { scrollToSection } from '../../lib/scroll';
import { INTRO_DONE } from '../../lib/intro';
import { profile } from '../../data/profile';
import { deepCut } from '../../data/deep';
import { discover } from '../../lib/deep';
import { useDelhiSky, type Sky } from '../../lib/delhiSky';
import { useReveal } from '../Hero/useReveal';
import './PondHome.css';

/* Side A — मानस, the mind, the same word as the lake Mānasarovar: so the home page is a pond.
 * Squishkit's Lily pond (src/vendor/squishkit, MIT), full bleed, in its doodle look: koi gliding
 * under the pads, water lilies, a frog, dragonflies, ripples. Over it, a note pinned to the page:
 * a taped card with the name and the line, a sticky note for right now, pencil marks in the margin. Touch the water and an old poem surfaces. */

const SECTIONS: [string, string][] = [
  ['About', 'about'],
  ['Work', 'work'],
  ['Projects', 'projects'],
  ['Photos', 'photos'],
  ['Say hello', 'contact'],
];

const SKY_MARK: Record<Sky, string> = { night: '☾', dawn: '◐', day: '☀', dusk: '◑' };

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
  const { sky } = useDelhiSky();

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
      el.setAttribute('look', 'crayon'); // Squishkit's doodle look: wax crayon on warm paper
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

        {/* A note pinned over the pond: taped card, a sticky note, pencil marks in the margin. */}
        <div className="pondhome__note">
          <span className="pondhome__tape" aria-hidden="true" />

          <aside className="pondhome__sticky" aria-label="Right now">
            <span className="pondhome__sticky-head">right now →</span>
            <span>AI infra &amp; agent harnesses at Ocally</span>
            <span className="pondhome__sticky-time">
              Delhi {time} <span aria-hidden="true">{SKY_MARK[sky]}</span>
            </span>
          </aside>

          <div className="pondhome__name-wrap">
            <p className="pondhome__hi" aria-hidden="true">
              hi, I’m
              <svg className="pondhome__arrow" viewBox="0 0 64 40" focusable="false">
                <path d="M3 5C17 6 33 14 46 30" />
                <path d="M36 27L46 30L47 19" />
              </svg>
            </p>
            <h1 className="pondhome__name" aria-label={`${profile.first} ${profile.last}`} data-open={name.open || undefined}>
              <span className="pondhome__first" aria-hidden="true" onClick={name.toggle} {...name.pointer}>
                <svg className="pondhome__swipe" viewBox="0 0 120 30" preserveAspectRatio="none" focusable="false">
                  <path d="M3 13C31 8 76 9 117 5L118 21C79 26 39 23 5 27Z" />
                </svg>
                {/* only the word that's showing takes up room, so the swipe and "Thakur" follow it */}
                {name.open ? (
                  <span key="deva" className="pondhome__deva" lang="sa">
                    {mind.lines[0].text}
                  </span>
                ) : (
                  <span key="latin" className="pondhome__latin">
                    {profile.first}
                  </span>
                )}
              </span>{' '}
              <span aria-hidden="true">{profile.last}</span>
            </h1>
            <button type="button" className="pondhome__sr-btn" aria-expanded={name.open} aria-controls="pondhome-tag" onClick={name.toggle}>
              What does “{profile.first}” mean?
            </button>
            {/* the meaning opens in its own room under the name, pushing the line down, never over it */}
            <div className="pondhome__meaning" data-open={name.open || undefined}>
              <p id="pondhome-tag" aria-hidden={!name.open}>
                ↳ <span lang="sa">{mind.lines[0].text}</span> is Sanskrit for the mind. {mind.lines[2].text}
              </p>
            </div>
          </div>

          <p className="pondhome__line">
            I build AI that doesn’t stop at the demo: agents that think a task through, reach for the right tools, and{' '}
            <mark>finish the job</mark>.
          </p>

          <nav aria-label="Sections (cover)">
            <ul className="pondhome__links">
              {SECTIONS.slice(0, -1).map(([label, id]) => (
                <li key={id}>
                  <a href={`#${id}`} onClick={go(id)}>
                    {label}
                  </a>
                </li>
              ))}
              <li className="pondhome__hello">
                <a href="#contact" onClick={go('contact')}>
                  Say hello
                  <svg className="pondhome__ring" viewBox="0 0 120 40" preserveAspectRatio="none" aria-hidden="true" focusable="false">
                    <path d="M14 10C40 1 103 2 114 15C124 29 64 38 26 34C2 31 3 15 22 8C38 3 62 3 78 5" />
                  </svg>
                </a>
              </li>
            </ul>
          </nav>

          {/* the margin note turns into the poem when the water is touched: in the note, never over it */}
          <div className="pondhome__margin" aria-live="polite">
            {poem ? (
              <p key="poem" className="pondhome__poem">
                <span lang="ja">{oldPond.lines[0].text}</span>
                <span>{oldPond.lines[1].text.toLowerCase()}</span>
              </p>
            ) : (
              <p key="psst" className="pondhome__psst" aria-hidden="true">
                psst, the pond is real. touch it ↗
              </p>
            )}
          </div>
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
