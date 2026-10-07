import { useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import type { SectionProps } from '../../App';
import { Drawer } from '../../components/primitives/Drawer';
import { gsap, SplitText, useGSAP } from '../../lib/gsap';
import { flags, prefersReducedMotion } from '../../lib/motion';
import { scrollToSection } from '../../lib/scroll';
import { profile } from '../../data/profile';
import { deepCut } from '../../data/deep';
import { discover } from '../../lib/deep';
import { useReveal } from './useReveal';
import { Skyline } from './Skyline';
import { Cloud, Kites, Moon } from './Sky';
import { describeSky, useDelhiSky } from '../../lib/delhiSky';
import { Dial } from './Dial';
import { Ticket } from './Ticket';
import { Sparrows } from './Sparrows';
import './Hero.css';
import './Dial.css';

// Mughal arch in object-bounding-box units (0–1), shared by the clip and the frame.
const ARCH = 'M0 1V.44C0 .27 .2 .17 .37 .1C.45 .067 .485 .04 .5 0C.515 .04 .55 .067 .63 .1C.8 .17 1 .27 1 .44V1Z';
const FRAME = 'M0 100V44C0 27 20 17 37 10C45 6.7 48.5 4 50 0C51.5 4 55 6.7 63 10C80 17 100 27 100 44V100';
const FRAME_IN = 'M2.2 100V45C2.2 28.6 21.6 18.8 37.9 12.1C45.4 9 48.6 6.5 50 2.9C51.4 6.5 54.6 9 62.1 12.1C78.4 18.8 97.8 28.6 97.8 45V100';

/** Where the name tag hangs: from the top of the name's last letter, kept on screen. */
type TagPos = { x: number; y: number; threadX: number };

export function Hero({ index }: SectionProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [intro] = useState(() => !flags.noIntro && !prefersReducedMotion());
  // the hidden messages wait until the intro has landed, so a reveal never fights it
  const [introDone, setIntroDone] = useState(() => !intro);
  // the arch is a window onto Delhi: its sky is the sky over the city at this moment
  const { sky, moon } = useDelhiSky();

  /* Deep cut 01 — "मानस". Rest on the name, tap it or use the keyboard button: the
   * gothic letters flip away, the name rises in its own script, and a paper tag
   * swings down from the last letter with what it means. */
  const mind = deepCut('mind');
  const name = useReveal(() => discover('mind'), { linger: 3200, enabled: introDone });
  const [tagPos, setTagPos] = useState<TagPos | null>(null);

  useLayoutEffect(() => {
    if (!name.open) return;
    // Hang from beneath the first letter, into the open sky under the name — never
    // over the name itself, and stepping left of "Thakur" if the two would touch.
    const place = () => {
      const wrap = wrapRef.current;
      const first = wrap?.querySelector<HTMLElement>('.hero__first');
      const last = wrap?.querySelector<HTMLElement>('.hero__last');
      const card = wrap?.querySelector<HTMLElement>('.hero__name-tag');
      if (!wrap || !first) return;
      const w = wrap.getBoundingClientRect();
      const r = first.getBoundingClientRect();
      const cardW = card?.offsetWidth ?? 240;
      const cardH = card?.offsetHeight ?? 140;
      const anchorX = r.left - w.left + r.width * 0.14;
      const anchorY = r.bottom - w.top - r.height * 0.1;
      let x = Math.max(8, Math.min(anchorX - cardW * 0.3, w.width - cardW - 8));
      const t = last?.getBoundingClientRect();
      if (t) {
        const tLeft = t.left - w.left;
        const tTop = t.top - w.top;
        const tBottom = t.bottom - w.top;
        const overlapsY = anchorY < tBottom && anchorY + cardH > tTop;
        if (overlapsY && x + cardW > tLeft - 8) x = Math.max(8, tLeft - 8 - cardW);
      }
      const threadX = Math.max(16, Math.min(anchorX - x, cardW - 16));
      setTagPos({ x, y: anchorY, threadX });
    };
    place();
    window.addEventListener('resize', place);
    return () => window.removeEventListener('resize', place);
  }, [name.open]);

  const settled = useRef(false);
  // one flip at a time: a close that is still playing must not finish after a reopen
  // (its delayed "letters back" step would bring the gothic name back over मानस)
  const flip = useRef<gsap.core.Timeline | null>(null);
  useGSAP(
    () => {
      if (!settled.current) {
        settled.current = true;
        return;
      }
      flip.current?.kill();
      const q = gsap.utils.selector(rootRef);
      const chars = q('.hero__first .hero__char').length ? q('.hero__first .hero__char') : q('.hero__first');
      const deva = q('.hero__deva');
      const tag = q('.hero__name-tag');
      if (prefersReducedMotion()) {
        gsap.set(chars, { opacity: name.open ? 0 : 1, rotateX: 0 });
        gsap.set(deva, { opacity: name.open ? 1 : 0, rotateX: 0 });
        gsap.set(tag, { opacity: name.open ? 1 : 0, rotate: 0, y: 0 });
        return;
      }
      if (name.open) {
        flip.current = gsap
          .timeline()
          .to(chars, { rotateX: 90, opacity: 0, transformPerspective: 600, duration: 0.3, ease: 'power2.in', stagger: 0.035, overwrite: 'auto' })
          .fromTo(deva, { rotateX: -90, opacity: 0, transformPerspective: 600 }, { rotateX: 0, opacity: 1, duration: 0.65, ease: 'expoOut' }, '-=0.08')
          .fromTo(tag, { rotate: -18, opacity: 0, y: -14 }, { rotate: 0, opacity: 1, y: 0, duration: 1.2, ease: 'elastic.out(1, 0.45)' }, '-=0.5');
      } else {
        flip.current = gsap
          .timeline()
          .to(tag, { opacity: 0, y: -10, rotate: 8, duration: 0.3, ease: 'power2.in', overwrite: 'auto' })
          .to(deva, { rotateX: 90, opacity: 0, transformPerspective: 600, duration: 0.3, ease: 'power2.in', overwrite: 'auto' }, 0)
          .to(chars, { rotateX: 0, opacity: 1, transformPerspective: 600, duration: 0.55, ease: 'expoOut', stagger: 0.035, overwrite: 'auto' }, 0.22);
      }
    },
    { dependencies: [name.open], scope: rootRef }
  );

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
          .timeline({ defaults: { ease: 'expoOut' }, onComplete: () => setIntroDone(true) })
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

        <p className="visually-hidden">Through the arch, the sky over Delhi right now: {describeSky(sky, moon)}.</p>
        <div ref={wrapRef} className="hero__arch-wrap" data-sky={sky}>
          <i className="perch perch--finial" data-perch="finial" aria-hidden="true" />
          <div className="hero__arch">
            <div className="hero__sky" />
            <div className="hero__stars" />
            <div className="tx tx-mandala hero__mandala" />
            <div className="tx tx-halftone hero__halftone" />
            <div className="hero__glow" />
            <div className="hero__sun">{sky === 'night' && <Moon phase={moon} />}</div>
            <Cloud className="hero__cloud hero__cloud--a loop" />
            <Cloud className="hero__cloud hero__cloud--b loop" />
            <Kites ready={introDone} />
            <Skyline />
          </div>
          <svg className="hero__frame" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            <path className="hero__frame-outer" d={FRAME} />
            <path className="hero__frame-inner" d={FRAME_IN} />
          </svg>

          <h1 className="hero__name" aria-label={`${profile.first} ${profile.last}`}>
            <span className="hero__first-cell">
              <span className="hero__first" aria-hidden="true" onClick={name.toggle} {...name.pointer}>
                {profile.first}
              </span>
              <span className="hero__deva" aria-hidden="true" lang="sa">
                {mind.lines[0].text}
              </span>
            </span>
            <span className="hero__last" aria-hidden="true">
              {profile.last}
              <i className="perch perch--name" data-perch="name" />
            </span>
          </h1>
          <button type="button" className="hero__name-btn" aria-expanded={name.open} aria-controls="hero-name-tag" onClick={name.toggle}>
            What does “{profile.first}” mean?
          </button>
          <p
            id="hero-name-tag"
            className={`hero__name-tag ${tagPos ? '' : 'is-unplaced'}`}
            aria-hidden={!name.open}
            style={
              tagPos
                ? ({ ['--tag-x' as string]: `${tagPos.x}px`, ['--tag-y' as string]: `${tagPos.y}px`, ['--thread-x' as string]: `${tagPos.threadX}px` } as CSSProperties)
                : undefined
            }
          >
            <span className="hero__name-tag-thread" aria-hidden="true" />
            <span className="hero__name-tag-card">
              <span className="hero__name-tag-hole" aria-hidden="true" />
              <span className="hero__name-tag-deva" lang="sa">
                {mind.lines[0].text}
              </span>
              <span className="hero__name-tag-line">{mind.lines[1].text}</span>
              <span className="hero__name-tag-line hero__name-tag-line--b">{mind.lines[2].text}</span>
            </span>
          </p>
          <p className="hero__stamp">
            <span className="hero__stamp-small">The portfolio · Vol. 26</span>
            <strong className="hero__stamp-big">{profile.role}</strong>
            <i className="perch perch--stamp" data-perch="stamp" aria-hidden="true" />
          </p>
        </div>

        <Ticket />
        <Dial />

        <button className="hero__cue" type="button" onClick={() => scrollToSection('about')} aria-label="Scroll to About">
          <span className="loop" aria-hidden="true">
            ↓
          </span>
        </button>
        <Sparrows sky={sky} ready={introDone} />
      </div>
    </Drawer>
  );
}
