import { useEffect, useMemo, useRef, useState } from 'react';
import type { SectionProps } from '../../App';
import { Drawer } from '../../components/primitives/Drawer';
import { gsap, SplitText, useGSAP } from '../../lib/gsap';
import { flags, prefersReducedMotion } from '../../lib/motion';
import { scrollToSection } from '../../lib/scroll';
import { profile } from '../../data/profile';
import { Skyline } from './Skyline';
import { Cloud, Kites } from './Sky';
import { Dial } from './Dial';
import './Hero.css';
import './Dial.css';

// Mughal arch in object-bounding-box units (0–1), shared by the clip and the frame.
const ARCH = 'M0 1V.44C0 .27 .2 .17 .37 .1C.45 .067 .485 .04 .5 0C.515 .04 .55 .067 .63 .1C.8 .17 1 .27 1 .44V1Z';
const FRAME = 'M0 100V44C0 27 20 17 37 10C45 6.7 48.5 4 50 0C51.5 4 55 6.7 63 10C80 17 100 27 100 44V100';
const FRAME_IN = 'M2.2 100V45C2.2 28.6 21.6 18.8 37.9 12.1C45.4 9 48.6 6.5 50 2.9C51.4 6.5 54.6 9 62.1 12.1C78.4 18.8 97.8 28.6 97.8 45V100';

function useLocalTime(timeZone: string) {
  const fmt = useMemo(
    () => new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone }),
    [timeZone]
  );
  const [time, setTime] = useState(() => fmt.format(new Date()));
  useEffect(() => {
    const id = window.setInterval(() => setTime(fmt.format(new Date())), 15_000);
    return () => window.clearInterval(id);
  }, [fmt]);
  return time;
}

function Ticket() {
  const time = useLocalTime(profile.timeZone);
  const [hh, mm] = time.split(':');
  return (
    <aside className="hero__ticket" aria-label="Now playing">
      <div className="ticket">
        <div className="ticket__stub" aria-hidden="true">
          <span>Admit one</span>
        </div>
        <div className="ticket__body">
          <p className="ticket__now">
            <i className="ticket__dot loop" aria-hidden="true" /> Now playing
          </p>
          <p className="ticket__title">{profile.now}</p>
          <p className="ticket__line">{profile.tagline}</p>
          <p className="ticket__meta">
            <span>Delhi × Daegu × Palo Alto</span>
            <span>
              <time aria-label={`${time} India Standard Time`}>
                {hh}
                <b className="ticket__colon loop" aria-hidden="true">
                  :
                </b>
                {mm}
              </time>{' '}
              IST
            </span>
          </p>
        </div>
      </div>
    </aside>
  );
}

export function Hero({ index }: SectionProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [intro] = useState(() => !flags.noIntro && !prefersReducedMotion());

  useGSAP(
    (_ctx, contextSafe) => {
      if (!intro || !contextSafe) return;
      const stage = rootRef.current!;
      let started = false;
      let cancelled = false;

      const play = contextSafe(() => {
        // A stale run (StrictMode re-mount, fast unmount) must never start a second
        // timeline: overlapping from() tweens would freeze elements mid-animation.
        if (started || cancelled) return;
        started = true;
        const split = SplitText.create('.hero__first', { type: 'chars', charsClass: 'hero__char' });
        gsap.set(stage, { visibility: 'visible' });

        gsap
          .timeline({ defaults: { ease: 'expoOut' } })
          .from('.hero__arch', { scaleY: 0, transformOrigin: '50% 100%', duration: 1.15 }, 0.05)
          .from('.hero__frame', { opacity: 0, duration: 0.6 }, 0.55)
          .from('.hero__sun', { yPercent: 45, duration: 1.7 }, 0.1)
          .from('.dial__ring', { rotate: -110, scale: 0.86, opacity: 0, duration: 1.25, stagger: 0.07 }, 0.2)
          // needle drop: the arm swings in from its rest beside the platter, then lowers
          .from('.dial__arm-swing', { rotation: -18, svgOrigin: '420 -20', duration: 1.1, ease: 'expoOut' }, 0.95)
          .from('.dial__arm', { scale: 1.03, transformOrigin: '42% 0%', duration: 0.4, ease: 'power2.out' }, 1.85)
          .from('.skyline__far', { yPercent: 18, opacity: 0, duration: 1.4 }, 0.45)
          .from('.skyline__mid .landmark', { yPercent: 105, duration: 1.5, stagger: 0.11 }, 0.5)
          .from('.skyline__bridge, .skyline__front', { yPercent: 30, opacity: 0, duration: 1.2 }, 0.62)
          .from('.hero__cloud', { xPercent: (i) => (i ? 30 : -30), opacity: 0, duration: 1.6 }, 0.7)
          .from(split.chars, { yPercent: -80, rotate: () => gsap.utils.random(-12, 12), opacity: 0, duration: 0.95, ease: 'slap', stagger: 0.065 }, 0.78)
          .from('.hero__last', { clipPath: 'inset(0% 100% 0% 0%)', duration: 0.9 }, 1.08)
          .from('.hero__stamp', { scale: 1.9, rotate: -24, opacity: 0, duration: 0.65, ease: 'slap' }, 1.25)
          .from('.kite', { yPercent: 25, opacity: 0, duration: 1.3, stagger: 0.14 }, 1.0)
          .from('.hero__ticket', { y: 48, rotate: 4, opacity: 0, duration: 0.95 }, 1.32)
          .from('.hero__cue', { opacity: 0, y: -10, duration: 0.6 }, 1.65);
      });

      // Split only once the wordmark face has loaded, or the glyph boxes come out wrong.
      document.fonts.ready.then(play);
      const fallback = window.setTimeout(play, 1600);
      return () => {
        cancelled = true;
        window.clearTimeout(fallback);
      };
    },
    { scope: rootRef }
  );

  return (
    <Drawer id="top" index={index} label="Introduction" className="hero">
      <div ref={rootRef} className={`hero__stage ${intro ? 'is-intro' : ''}`}>
        <svg width="0" height="0" className="hero__defs" aria-hidden="true" focusable="false">
          <clipPath id="hero-arch" clipPathUnits="objectBoundingBox">
            <path d={ARCH} />
          </clipPath>
          {/* rubber-stamp ink: light speckle so small type survives, slight wobble */}
          <filter id="hero-ink" x="-5%" y="-10%" width="110%" height="120%">
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="21" result="speck" />
            <feColorMatrix in="speck" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -1.5 1.45" result="mask" />
            <feComposite in="SourceGraphic" in2="mask" operator="in" result="inked" />
            <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="1" seed="2" result="warp" />
            <feDisplacementMap in="inked" in2="warp" scale="2.5" xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </svg>

        <div className="hero__arch-wrap">
          <div className="hero__arch">
            <div className="hero__sky" />
            <div className="tx tx-mandala hero__mandala" />
            <div className="tx tx-halftone hero__halftone" />
            <div className="hero__sun" />
            <Cloud className="hero__cloud hero__cloud--a loop" />
            <Cloud className="hero__cloud hero__cloud--b loop" />
            <Kites />
            <Skyline />
          </div>
          <svg className="hero__frame" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            <path className="hero__frame-outer" d={FRAME} />
            <path className="hero__frame-inner" d={FRAME_IN} />
          </svg>

          <h1 className="hero__name" aria-label={`${profile.first} ${profile.last}`}>
            <span className="hero__first" aria-hidden="true">
              {profile.first}
            </span>
            <span className="hero__last" aria-hidden="true">
              {profile.last}
            </span>
          </h1>
          <p className="hero__stamp">
            <span className="hero__stamp-small">The portfolio · Vol. 26</span>
            <strong className="hero__stamp-big">{profile.role}</strong>
          </p>
        </div>

        <Ticket />
        <Dial />

        <button className="hero__cue" type="button" onClick={() => scrollToSection('about')} aria-label="Scroll to About">
          <span className="loop" aria-hidden="true">
            ↓
          </span>
        </button>
      </div>
    </Drawer>
  );
}
