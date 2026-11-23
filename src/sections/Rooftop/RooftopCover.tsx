import { useEffect, useMemo, useRef, useState } from 'react';
import type { SectionProps } from '../../App';
import { Drawer } from '../../components/primitives/Drawer';
import { flags, prefersReducedMotion } from '../../lib/motion';
import { scrollToSection } from '../../lib/scroll';
import { INTRO_DONE } from '../../lib/intro';
import { profile } from '../../data/profile';
import { deepCut, deepCuts } from '../../data/deep';
import { discover, openLinerNotes, useDeepCuts } from '../../lib/deep';
import { describeSky, useDelhiSky, type Sky } from '../../lib/delhiSky';
import { useReveal } from '../Hero/useReveal';
import { Rooftop } from './rooftop';
import './Rooftop.css';

/* Side A — the cover. A Delhi chhat, live in pixel art, under the sky over the city
 * right now. Bittu the cat and Sheru the dog live up here with the gauraiya and the
 * pigeons on the tank; a kid flies a kite off the edge. Tap any of them. */

const MENU = [
  { id: 'about', label: 'About' },
  { id: 'work', label: 'Work' },
  { id: 'projects', label: 'Projects' },
  { id: 'photos', label: 'Photos' },
  { id: 'contact', label: 'Say hello' },
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

export function RooftopCover({ index }: SectionProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bubblesRef = useRef<HTMLDivElement>(null);
  const engine = useRef<Rooftop | null>(null);
  const [intro] = useState(() => !flags.noIntro && !prefersReducedMotion());
  const [introDone, setIntroDone] = useState(() => !intro);
  const { sky, sun, moon } = useDelhiSky();
  const time = useLocalTime(profile.timeZone);
  const found = useDeepCuts();

  // Deep cut 01 — rest on the name (or tap it): MANAS turns to मानस and says what it means.
  const mind = deepCut('mind');
  const name = useReveal(() => discover('mind'), { linger: 3200, enabled: introDone });

  useEffect(() => {
    if (!intro) return;
    const id = window.setTimeout(() => {
      setIntroDone(true);
      window.dispatchEvent(new Event(INTRO_DONE));
    }, 1300);
    return () => window.clearTimeout(id);
  }, [intro]);

  // the scene: made once, resized with the stage, and run only while it can be seen
  useEffect(() => {
    const stage = stageRef.current;
    const canvas = canvasRef.current;
    const bubbles = bubblesRef.current;
    if (!stage || !canvas || !bubbles) return;
    const roof = new Rooftop(canvas, stage, bubbles, {
      sky,
      sun,
      moon,
      still: prefersReducedMotion(),
      // the kite line was a deep cut while this was the cover; saved now, it is just said
      onString: () => ({ text: 'A kite climbs only because someone on the ground holds the string.', lang: 'en' }),
    });
    engine.current = roof;

    const drawer = stage.closest<HTMLElement>('.drawer');
    const sync = () => roof.setActive(!document.hidden && drawer?.dataset.offscreen !== 'true' && drawer?.dataset.covered !== 'true');
    const mo = new MutationObserver(sync);
    if (drawer) mo.observe(drawer, { attributes: true, attributeFilter: ['data-offscreen', 'data-covered'] });
    document.addEventListener('visibilitychange', sync);
    sync();

    let size = `${stage.clientWidth}x${stage.clientHeight}`;
    let raf = 0;
    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const next = `${stage.clientWidth}x${stage.clientHeight}`;
        if (next === size) return;
        size = next;
        roof.layout();
      });
    });
    ro.observe(stage);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      mo.disconnect();
      document.removeEventListener('visibilitychange', sync);
      roof.destroy();
      engine.current = null;
    };
    // the sky is handed over separately below; the scene is built once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    engine.current?.setSky(sky, sun, moon);
  }, [sky, sun, moon]);

  const local = (e: { clientX: number; clientY: number }) => {
    const r = canvasRef.current!.getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top] as const;
  };

  return (
    <Drawer id="top" index={index} label="Introduction" className="roof">
      <div ref={stageRef} className={`roof__stage ${intro ? 'is-intro' : ''}`} data-sky={sky}>
        <canvas
          ref={canvasRef}
          className="roof__canvas"
          aria-hidden="true"
          onPointerMove={(e) => {
            if (e.pointerType !== 'mouse') return;
            const over = engine.current?.point(...local(e));
            e.currentTarget.style.cursor = over ? 'pointer' : '';
          }}
          onPointerDown={(e) => {
            if (e.pointerType !== 'mouse') engine.current?.point(...local(e));
          }}
          onClick={(e) => engine.current?.tap(...local(e))}
        />
        <div ref={bubblesRef} className="roof__bubbles" aria-hidden="true" />
        <p className="visually-hidden">
          A pixel-art Delhi rooftop under the sky over the city right now: {describeSky(sky, moon)}. A cat, a dog, sparrows and pigeons live
          on it, and a kid is flying a kite.
        </p>

        <div className="roof__hud">
          <div className="roof__title">
            <div className="roof__name-wrap">
              <h1 className="roof__name" aria-label={`${profile.first} ${profile.last}`} data-open={name.open || undefined}>
                <span className="roof__first" aria-hidden="true" onClick={name.toggle} {...name.pointer}>
                  <span className="roof__latin">{profile.first}</span>
                  <span className="roof__deva" lang="sa">
                    {mind.lines[0].text}
                  </span>
                </span>
                <span className="roof__last" aria-hidden="true">
                  {profile.last}
                </span>
              </h1>
              <button type="button" className="roof__sr-btn" aria-expanded={name.open} aria-controls="roof-name-tag" onClick={name.toggle}>
                What does “{profile.first}” mean?
              </button>
              <p id="roof-name-tag" className="roof__tag" aria-hidden={!name.open} data-open={name.open || undefined}>
                <span lang="sa" className="roof__tag-deva">
                  {mind.lines[0].text}
                </span>
                <span>{mind.lines[1].text}</span>
                <span>{mind.lines[2].text}</span>
              </p>
            </div>
            <p className="roof__tagline">{profile.tagline}</p>
          </div>

          <div className="roof__box">
            <p className="roof__now">
              <span className="roof__dot loop" aria-hidden="true" /> Now playing
            </p>
            <p className="roof__now-what">{profile.now}</p>
            <p className="roof__clock">
              Delhi {time} <span aria-hidden="true">{SKY_MARK[sky]}</span>
            </p>
            <nav className="roof__menu" aria-label="Sections (cover menu)">
              <ul>
                {MENU.map((m) => (
                  <li key={m.id}>
                    <a
                      href={`#${m.id}`}
                      onClick={(e) => {
                        e.preventDefault();
                        scrollToSection(m.id);
                      }}
                    >
                      {m.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
            <button type="button" className="roof__cuts" onClick={() => openLinerNotes()}>
              Deep cuts {found.length}/{deepCuts.length}
            </button>
            <button type="button" className="roof__sr-btn" onClick={() => engine.current?.followString()}>
              Follow a kite down to the ground
            </button>
          </div>
        </div>

        <p className="roof__hint" aria-hidden="true">
          tap the pets · tap the floor to scatter grain
        </p>
        <button className="roof__cue" type="button" onClick={() => scrollToSection('about')} aria-label="Scroll to About">
          <span className="loop" aria-hidden="true">
            ▼
          </span>
        </button>
      </div>
    </Drawer>
  );
}
