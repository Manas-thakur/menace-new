import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type RefObject } from 'react';
import { gsap } from '../../lib/gsap';
import { deepCut } from '../../data/deep';
import { discover } from '../../lib/deep';
import { ETCH_HALF, etchMid } from './Record';
import { motorsOf, nearestEtch, setSpeed } from './turntable';

type DeckProps = {
  /** The layer holding the spinning SVG. */
  recordRef: RefObject<HTMLDivElement | null>;
  holeRef: RefObject<HTMLButtonElement | null>;
  reduced: boolean;
  /** The hidden track is playing. */
  track: boolean;
  /** Bumps every time the hidden track is (re)played. */
  run: number;
  onPlay: () => void;
};

const HOVER_INTENT_MS = 500;
const ETCH_REST = 0.16;

/**
 * The controls laid over Side B's record. Lingering on the label (or focusing /
 * tapping it) eases the disc to a stop so the run-out etching can be read under a
 * travelling glint; the centre hole plays the hidden track.
 */
export function Deck({ recordRef, holeRef, reduced, track, run, onPlay }: DeckProps) {
  const deckRef = useRef<HTMLDivElement>(null);
  const hitRef = useRef<HTMLDivElement>(null);
  const intent = useRef<number | undefined>(undefined);
  const wasReading = useRef(false);
  const [hover, setHover] = useState(false);
  const [focus, setFocus] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [announce, setAnnounce] = useState('');
  const etching = deepCut('deadwax').lines[0].text;
  const reading = !track && (hover || focus || pinned);

  useEffect(() => () => window.clearTimeout(intent.current), []);

  // A pinned reading (tap / click) lets go when you touch anything else.
  useEffect(() => {
    if (!pinned) return;
    const away = (e: PointerEvent) => {
      if (!hitRef.current?.contains(e.target as Node)) setPinned(false);
    };
    document.addEventListener('pointerdown', away);
    return () => document.removeEventListener('pointerdown', away);
  }, [pinned]);

  // Reading the run-out groove.
  useEffect(() => {
    const svg = recordRef.current?.querySelector('svg');
    const deck = deckRef.current;
    if (!svg || !deck) return;
    const motors = motorsOf(svg);
    const etches = Array.from(svg.querySelectorAll<SVGTextElement>('.record__etch'));
    const glint = svg.querySelector<SVGGElement>('.record__etch-glint');
    const caption = deck.querySelector<HTMLElement>('.contact__etching');
    const words = deck.querySelector<HTMLElement>('.contact__etching-text');
    const leader = deck.querySelector<HTMLElement>('.contact__etching-leader');
    const ctx = gsap.context(() => {}, deck);

    if (reading) {
      wasReading.current = true;
      discover('deadwax');
      setAnnounce(`Run-out groove: ${etching}`);

      if (reduced) {
        const k = nearestEtch(motors);
        gsap.set(etches, { opacity: ETCH_REST });
        gsap.set(etches[k], { opacity: 0.92 });
        gsap.set([caption, leader], { autoAlpha: 1, scaleY: 1 });
        gsap.set(words, { clipPath: 'inset(0 0% 0 0)' });
        return () => ctx.revert();
      }

      ctx.add(() => {
        const tl = gsap.timeline();
        // 1 · the platter glides to a stop (rate, not position: a real deceleration)
        if (motors.length) tl.to(motors, { playbackRate: 0, duration: 0.7, ease: 'power2.out', overwrite: true }, 0);
        // 2 · once still, light the copy nearest the top and draw the glint across it,
        //     revealing the caption's words in step with the light
        tl.add(() => {
          const k = nearestEtch(motors);
          const mid = etchMid(k);
          ctx.add(() => {
            gsap.to(etches.filter((_, i) => i !== k), { opacity: ETCH_REST, duration: 0.3, overwrite: true });
            gsap.to(etches[k], { opacity: 0.92, duration: 0.45, ease: 'expoOut', overwrite: true });
            gsap
              .timeline()
              .set(glint, { rotation: mid - ETCH_HALF, svgOrigin: '500 500', opacity: 0 })
              .to(glint, { opacity: 1, duration: 0.1 }, 0)
              .to(glint, { rotation: mid + ETCH_HALF, svgOrigin: '500 500', duration: 0.5, ease: 'power1.inOut' }, 0)
              .to(glint, { opacity: 0, duration: 0.15 }, 0.4);
          });
        }, 0.68);
        tl.fromTo(leader, { autoAlpha: 0, scaleY: 0 }, { autoAlpha: 1, scaleY: 1, duration: 0.3, ease: 'riot' }, 0.55)
          .fromTo(caption, { autoAlpha: 0, y: 10 }, { autoAlpha: 1, y: 0, duration: 0.4, ease: 'expoOut' }, 0.6)
          .fromTo(words, { clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0% 0 0)', duration: 0.5, ease: 'power1.inOut' }, 0.7);
      });
    } else if (wasReading.current) {
      wasReading.current = false;
      setAnnounce('');
      if (reduced) {
        gsap.set(etches, { opacity: ETCH_REST });
        gsap.set([caption, leader], { autoAlpha: 0 });
        return () => ctx.revert();
      }
      ctx.add(() => {
        gsap.to([caption, leader], { autoAlpha: 0, duration: 0.25, ease: 'power2.in' });
        gsap.to(etches, { opacity: ETCH_REST, duration: 0.5, overwrite: true });
        // back up to speed, like a motor — unless the hidden track has taken over
        if (!track) setSpeed(motors, 1, 0.9, 'power2.in');
      });
    }
    return () => ctx.kill();
    // `track` is only read for the hand-off to the hidden track; `reading` already changes with it.
  }, [reading, reduced]);

  // The hidden track: a beat of silence, then the record spins back up and the
  // label throws out a ring of light as the words rise.
  useEffect(() => {
    if (!track || run === 0) return;
    setHover(false);
    setPinned(false);
    window.clearTimeout(intent.current);
    armed.current = false;
    if (reduced) return;
    const motors = motorsOf(recordRef.current?.querySelector('svg'));
    const pulse = deckRef.current?.querySelector<HTMLElement>('.contact__pulse');
    const tl = gsap.timeline();
    if (motors.length) {
      tl.to(motors, { playbackRate: 0, duration: 0.25, ease: 'power2.out', overwrite: true }, 0).to(
        motors,
        { playbackRate: 1, duration: 0.9, ease: 'power2.in' },
        0.42
      );
    }
    if (pulse) tl.fromTo(pulse, { scale: 0.75, opacity: 0.85 }, { scale: 1.9, opacity: 0, duration: 0.8, ease: 'expoOut' }, 0.38);
    return () => {
      tl.kill();
      if (motors.length) setSpeed(motors, 1, 0.4, 'power1.out');
    };
  }, [track, run, reduced, recordRef]);

  // Hover intent arms on a real movement across the record (motionless pointer events
  // are filtered site-wide, and React derives "enter" from the event that scrolling
  // also sends) — so the groove is read by a hand, never because the page slid the
  // record under a resting cursor, and a pointer already inside can still read it.
  const armed = useRef(false);
  const arm = () => {
    window.clearTimeout(intent.current);
    armed.current = true;
    intent.current = window.setTimeout(() => {
      armed.current = false;
      setHover(true);
    }, HOVER_INTENT_MS);
  };
  const isHand = (e: ReactPointerEvent) => e.pointerType === 'mouse' || e.pointerType === 'pen';
  const onMove = (e: ReactPointerEvent) => {
    if (!isHand(e) || track || hover || armed.current) return;
    arm();
  };
  const onLeave = (e: ReactPointerEvent) => {
    if (!isHand(e)) return;
    window.clearTimeout(intent.current);
    armed.current = false;
    setHover(false);
  };

  return (
    <div ref={deckRef} className={`contact__deck ${reading ? 'is-reading' : ''}`}>
      <span className="contact__deck-ring" aria-hidden="true" />
      <span className="contact__pulse" aria-hidden="true" />

      <div ref={hitRef} className="contact__deck-hit" onPointerMove={onMove} onPointerLeave={onLeave}>
        <button
          type="button"
          className="contact__runout"
          aria-label="Read the run-out groove"
          aria-expanded={reading}
          aria-controls="contact-etching"
          onFocus={(e) => e.currentTarget.matches(':focus-visible') && setFocus(true)}
          onBlur={() => setFocus(false)}
          onClick={() => setPinned((p) => !p)}
        />
        <button
          ref={holeRef}
          type="button"
          className="contact__hole"
          aria-label="Play the hidden track"
          aria-haspopup="dialog"
          aria-expanded={track}
          aria-controls="contact-hidden"
          onClick={onPlay}
        />
      </div>

      <span className="contact__etching-leader" aria-hidden="true" />
      <p id="contact-etching" className="contact__etching" aria-hidden="true">
        <span className="contact__etching-kicker">Run-out groove</span>
        <span className="contact__etching-text">{etching}</span>
      </p>
      <span className="visually-hidden" aria-live="polite">
        {announce}
      </span>
    </div>
  );
}
