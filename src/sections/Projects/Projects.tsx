import { useRef, useState, type KeyboardEvent } from 'react';
import type { SectionProps } from '../../App';
import { Drawer } from '../../components/primitives/Drawer';
import { Marquee } from '../../components/primitives/Marquee';
import { stack, stations } from '../../data/profile';
import { deepCut } from '../../data/deep';
import { discover } from '../../lib/deep';
import { gsap, useGSAP, SplitText } from '../../lib/gsap';
import { Draggable } from '../../lib/drag';
import { drawerOf, onDrawerEnter } from '../../lib/enter';
import { prefersReducedMotion } from '../../lib/motion';
import { FMAX, FMIN, Radio, scaleX } from './Radio';
import { StationCard } from './StationCard';
import './Projects.css';
import './Radio.css';

/* Knob travel: two full turns sweep the whole band. */
const TURN = 720;
const rotToFreq = (r: number) => FMIN + (r / TURN) * (FMAX - FMIN);
const freqToRot = (f: number) => ((f - FMIN) / (FMAX - FMIN)) * TURN;
const needleX = (f: number) => scaleX(f) - scaleX(FMIN);
const LAST = stations.length - 1;
const pad = (n: number) => String(n).padStart(2, '0');
const WORDS = ['Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve'];
const countWord = WORDS[stations.length] ?? String(stations.length);

/* Deep cut: a hidden station at 108.0, the very end of the band (and the number
 * of beads on a mala). It has no mark, no label and no place in the prev/next
 * cycle; it answers to the knob turned all the way, End, ArrowRight past the last
 * station, or a click on the very end of the scale. */
const SECRET = stations.length;
const SECRET_FREQ = FMAX;
/** Released past this point, the knob settles on the hidden station. */
const SECRET_ZONE = 107.6;
const quietCut = deepCut('frequency');
const freqOf = (i: number) => (i === SECRET ? SECRET_FREQ : stations[i].freq);

const nearest = (f: number) => {
  let best = 0;
  stations.forEach((s, i) => {
    if (Math.abs(s.freq - f) < Math.abs(stations[best].freq - f)) best = i;
  });
  return { index: best, distance: Math.abs(stations[best].freq - f) };
};

const valueTextFor = (i: number) => `${freqOf(i).toFixed(1)} FM — ${i === SECRET ? quietCut.title : stations[i].name}`;

export function Projects({ index }: SectionProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const knobRef = useRef<HTMLDivElement>(null);
  const needleRef = useRef<SVGGElement>(null);
  const grilleRef = useRef<SVGGElement>(null);
  const readoutRef = useRef<SVGTextElement>(null);
  const artRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const staticRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const dragRef = useRef<Draggable | null>(null);
  const tuneTl = useRef<gsap.core.Timeline | null>(null);

  const [current, setCurrent] = useState(0);
  const [tuning, setTuning] = useState(false);
  const [live, setLive] = useState(() => prefersReducedMotion());
  const currentRef = useRef(0);
  const freqRef = useRef(stations[0].freq);

  const show = (i: number) => {
    currentRef.current = i;
    setCurrent(i);
  };

  /** Needle, readout and slider value follow a frequency (knob optional: Draggable owns it mid-drag). */
  const paint = (f: number, moveKnob: boolean) => {
    freqRef.current = f;
    gsap.set(needleRef.current, { x: needleX(f) });
    if (moveKnob) gsap.set(knobRef.current, { rotation: freqToRot(f) });
    if (readoutRef.current) readoutRef.current.textContent = f.toFixed(1);
    knobRef.current?.setAttribute('aria-valuenow', f.toFixed(1));
  };

  const pump = () => {
    if (prefersReducedMotion()) return;
    gsap.to(grilleRef.current, {
      keyframes: { scale: [1, 1.05, 1.01, 1.035, 1] },
      transformOrigin: '50% 50%',
      duration: 0.65,
      ease: 'none',
    });
  };

  const { contextSafe } = useGSAP(
    () => {
      const reduced = prefersReducedMotion();
      paint(stations[0].freq, true);

      // ── Tuning knob: drag passes through stations like a real dial; release snaps.
      const [drag] = Draggable.create(knobRef.current, {
        type: 'rotation',
        bounds: { minRotation: 0, maxRotation: TURN },
        onPress() {
          // Draggable cancels the pointer's default, which would otherwise focus the
          // knob; focus it ourselves so the arrow, Home and End keys work after a click.
          knobRef.current?.focus({ preventScroll: true });
          tuneTl.current?.kill();
          setTuning(true);
          setLive(false);
        },
        onDrag() {
          const f = rotToFreq(this.rotation);
          paint(f, false);
          const { index: n, distance } = nearest(f);
          if (distance < 0.35 && n !== currentRef.current) show(n);
          // detuned → static; on a station → clear
          const noise = gsap.utils.clamp(0, 1, (distance - 0.15) / 0.75);
          gsap.set(staticRef.current, { opacity: noise * 0.9 });
        },
        onRelease() {
          const f = freqRef.current;
          settle(f > SECRET_ZONE ? SECRET : nearest(f).index);
        },
      });
      dragRef.current = drag;

      if (reduced) return () => drag.kill();

      // ── Entrance: outline draws, needle seeks across the band and locks, title lands.
      const root = rootRef.current!;
      const draws = root.querySelectorAll<SVGGeometryElement>('.radio .draw');
      const fades = root.querySelectorAll('.radio__scale, .radio__slat, .radio__knob, .radio__eq, .radio__live-text, .radio__readout, .radio__tiny, .radio__brand');
      const split = SplitText.create(titleRef.current, { type: 'chars' });
      const lower = root.querySelectorAll('.projects__sub, .projects__controls, .radio__note');
      const cardWrap = root.querySelector('.station-wrap');

      gsap.set(draws, { strokeDasharray: 1, strokeDashoffset: 1 });
      gsap.set(fades, { opacity: 0 });
      gsap.set(split.chars, { yPercent: -120, opacity: 0 });
      gsap.set(lower, { opacity: 0, y: 18 });
      gsap.set(cardWrap, { clipPath: 'inset(100% 0% 0% 0%)', y: 40 });
      paint(FMIN, true);

      const trigger = onDrawerEnter(drawerOf(root)!, () => {
        const seek = { f: FMIN };
        gsap
          .timeline({ defaults: { ease: 'expoOut' }, onComplete: () => setLive(true) })
          .to(draws, { strokeDashoffset: 0, duration: 1.0, ease: 'power2.inOut', stagger: 0.015 }, 0)
          .to(fades, { opacity: 1, duration: 0.5, stagger: 0.03 }, 0.45)
          .to(split.chars, { yPercent: 0, opacity: 1, duration: 0.7, stagger: 0.045, ease: 'riot' }, 0.05)
          .to(lower, { opacity: 1, y: 0, duration: 0.7, stagger: 0.06 }, 0.35)
          .to(cardWrap, { clipPath: 'inset(0% 0% 0% 0%)', y: 0, duration: 0.95, clearProps: 'clipPath' }, 0.25)
          .to(seek, { f: 105.6, duration: 0.55, ease: 'power2.inOut', onUpdate: () => paint(seek.f, true) }, 0.2)
          .to(seek, { f: stations[0].freq, duration: 0.6, onUpdate: () => paint(seek.f, true) }, 0.75)
          .add(() => {
            drag.update();
            pump();
          }, 1.3);
      });

      return () => {
        trigger.kill();
        drag.kill();
        split.revert();
      };
    },
    { scope: rootRef }
  );

  /** The hidden station's cover counts its 108 beads in from the guru bead; the verse writes itself in. */
  const revealQuiet = contextSafe(() => {
    const root = rootRef.current;
    if (!root) return;
    const beads = root.querySelectorAll('.mala__bead');
    gsap.fromTo(beads, { scale: 0, opacity: 0, transformOrigin: '50% 50%' }, { scale: 1, opacity: 1, duration: 0.24, ease: 'expoOut', stagger: 0.005 });
    gsap.fromTo(root.querySelector('.mala__guru'), { scale: 0, opacity: 0, transformOrigin: '50% 50%' }, { scale: 1, opacity: 1, duration: 0.4, ease: 'riot', delay: 0.52 });
    gsap.fromTo(
      root.querySelectorAll('.station__verse-orig'),
      { clipPath: 'inset(0% 100% 0% 0%)' },
      { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.7, ease: 'riot', delay: 0.16, clearProps: 'clipPath' }
    );
    gsap.fromTo(
      root.querySelectorAll('.station__verse-trans, .station__verse .station__foot'),
      { opacity: 0, y: 8 },
      { opacity: 1, y: 0, duration: 0.5, ease: 'expoOut', stagger: 0.06, delay: 0.4, clearProps: 'transform,opacity' }
    );
  });

  /** Glide needle + knob to station `n`; static flickers while the card swaps.
   * Tuned to the hidden station, the static clears into silence instead. */
  const settle = contextSafe((n: number) => {
    const reduced = prefersReducedMotion();
    const secret = n === SECRET;
    const from = freqRef.current;
    const to = freqOf(n);
    const swap = n !== currentRef.current || gsap.getProperty(staticRef.current, 'opacity') !== 0;
    tuneTl.current?.kill();

    if (reduced) {
      paint(to, true);
      show(n);
      gsap.set(staticRef.current, { opacity: 0 });
      dragRef.current?.update();
      setTuning(false);
      setLive(true);
      if (secret) discover(quietCut.id);
      return;
    }

    setTuning(true);
    setLive(false);
    const proxy = { f: from };
    const tl = gsap.timeline({
      onComplete: () => {
        dragRef.current?.update();
        setTuning(false);
        setLive(true);
        // found only once it locks on — never on load, never mid-drag
        if (secret) discover(quietCut.id);
        else pump();
      },
    });
    tl.to(proxy, { f: to, duration: 0.7, ease: 'expoOut', onUpdate: () => paint(proxy.f, true) }, 0);
    if (secret && swap) {
      tl.to(staticRef.current, { opacity: 1, duration: 0.08, ease: 'none' }, 0)
        .add(() => show(n), 0.12)
        .add(revealQuiet, 0.2)
        .fromTo(
          [artRef.current, bodyRef.current],
          { clipPath: 'inset(0% 0% 100% 0%)' },
          { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.6, ease: 'expoOut', stagger: 0.06, clearProps: 'clipPath' },
          0.24
        )
        .to(staticRef.current, { opacity: 0, duration: 0.7, ease: 'power1.out' }, 0.24);
    } else if (swap) {
      tl.to(staticRef.current, { opacity: 1, duration: 0.08, ease: 'none' }, 0)
        .add(() => show(n), 0.12)
        .fromTo(
          [artRef.current, bodyRef.current],
          { clipPath: 'inset(0% 0% 100% 0%)' },
          { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.55, ease: 'expoOut', stagger: 0.06, clearProps: 'clipPath' },
          0.26
        )
        .to(staticRef.current, { opacity: 0, duration: 0.3, ease: 'power2.out' }, 0.26);
    }
    tuneTl.current = tl;
  });

  /** Prev/next cycle the seven public stations only; from the hidden one they step back into the cycle. */
  const step = (dir: 1 | -1) => {
    const i = currentRef.current;
    if (i === SECRET) return settle(dir > 0 ? 0 : LAST);
    settle((i + dir + stations.length) % stations.length);
  };

  /** Slider keys. Past the last station lies the end of the band. */
  const onKnobKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const i = currentRef.current;
    const up = i >= LAST ? SECRET : i + 1;
    const down = i === SECRET ? LAST : Math.max(0, i - 1);
    const map: Record<string, number> = {
      ArrowRight: up,
      ArrowUp: up,
      PageUp: up,
      ArrowLeft: down,
      ArrowDown: down,
      PageDown: down,
      Home: 0,
      End: SECRET,
    };
    if (!(e.key in map)) return;
    e.preventDefault();
    const n = map[e.key];
    if (n !== i) settle(n);
  };

  const onAir = current === SECRET;
  const station = onAir ? null : stations[current];
  const tickerItems = stack.flatMap((g) => g.items);

  return (
    <Drawer id="projects" index={index} label="Projects" className="projects">
      <div className="projects__root" ref={rootRef}>
        <div className="tx tx-halftone projects__ht" aria-hidden="true" />
        <div className="projects__ghosts" aria-hidden="true">
          {[0, 1, 2].map((row) => (
            <Marquee
              key={row}
              items={['Tune in', `${countWord} stations`, 'All signal, no noise']}
              variant="ghost"
              direction={row % 2 ? 'right' : 'left'}
              speed={70 + row * 12}
              repeat={2}
              decorative
            />
          ))}
        </div>

        <div className="projects__stage">
          <header className="projects__head">
            <h2 className="projects__title" ref={titleRef}>
              Projects
            </h2>
            <p className="projects__sub">Tune into the builds.</p>
          </header>

          <div className="projects__radio">
            <Radio
              stations={stations}
              current={current}
              valueNow={freqOf(current)}
              valueText={valueTextFor(current)}
              knobRef={knobRef}
              needleRef={needleRef}
              grilleRef={grilleRef}
              readoutRef={readoutRef}
              live={live}
              quiet={onAir}
              onMark={(i) => settle(i)}
              onEnd={() => settle(SECRET)}
              onKnobKey={onKnobKey}
            />
          </div>

          <div className="station-wrap">
            <StationCard
              station={station}
              secret={onAir ? { cut: quietCut, freq: SECRET_FREQ } : null}
              tuning={tuning}
              artRef={artRef}
              bodyRef={bodyRef}
              staticRef={staticRef}
            />
            <div className="projects__controls">
              <button type="button" className="projects__step" aria-label="Previous station" aria-controls="projects-station" onClick={() => step(-1)}>
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M15 5 8 12l7 7" />
                </svg>
              </button>
              <p className={`projects__count ${onAir ? 'is-off-air' : ''}`} aria-hidden="true">
                {onAir ? (
                  <span>Off air</span>
                ) : (
                  <>
                    <span>{pad(current + 1)}</span> / {pad(stations.length)}
                  </>
                )}
              </p>
              <button type="button" className="projects__step" aria-label="Next station" aria-controls="projects-station" onClick={() => step(1)}>
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="m9 5 7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        <div className="projects__tickers">
          <Marquee items={tickerItems} variant="strip" speed={140} repeat={1} />
          <Marquee items={tickerItems.slice().reverse()} variant="strip" direction="right" speed={160} repeat={1} className="projects__ticker--ink" decorative />
        </div>
      </div>
    </Drawer>
  );
}
