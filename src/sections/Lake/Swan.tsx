import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { gsap, useGSAP } from '../../lib/gsap';
import { useReveal } from '../Hero/useReveal';
import { found, swanSaying } from './verses';

/* (Saved cover.) Its second message. A hamsa crosses the lake of the mind, as Kālidāsa's royal swans fly
 * north to Mānasa. Stop it (rest on it, tap it, or focus it) and it bows to drink:
 * the old saying that a swan, given milk mixed with water, takes the milk and leaves
 * the water. */

type SwanProps = {
  /** Painting width in CSS px; the swan patrols a band of it. */
  width: number;
  /** Until true the swan waits off to the west (the intro has not reached it). */
  ready: boolean;
  /** The lake has gone still: everything holds its breath. */
  still: boolean;
  reduced: boolean;
  /** A ring where the swan breaks the water: x in painting px, on the swan's lane. */
  onWake: (x: number, strength: number) => void;
  /** Its note opened or closed. */
  onNote?: (open: boolean) => void;
};

const GLIDE_S = 46; // one crossing of the patrol band
const BAND = [0.07, 0.68] as const; // turning points, as fractions of the painting width
const TURN_S = 1.9;

// The neck in its two poses; both paths share one structure so the numbers can tween.
const NECK_UP = 'M136 78 C 146 64, 150 48, 144 36 C 139 26, 140 18, 150 15';
const NECK_BOW = 'M136 78 C 148 62, 166 56, 174 64 C 178 68, 179 74, 177 80';
// The head swings from its own centre down to the water, beak first.
const HEAD_BOW = { x: 23.5, y: 67.5, rotation: 70 };
const BEAK_TIP_X = 176.7 / 200; // where the beak meets the water, as a fraction of the drawing

export function Swan({ width, ready, still, reduced, onWake, onNote }: SwanProps) {
  const cut = swanSaying;
  const rootRef = useRef<HTMLDivElement>(null);
  const flipRef = useRef<SVGGElement>(null);
  const neckRef = useRef<SVGPathElement>(null);
  const headRef = useRef<SVGGElement>(null);
  const tl = useRef<gsap.core.Timeline | null>(null);
  const pos = useRef({ u: reduced ? 0.12 : -0.2 }); // reduced motion: at rest in open water, west of the name
  const widthRef = useRef(width);
  widthRef.current = width;
  const [focused, setFocused] = useState(false);
  const note = useReveal(() => found('swan'), { linger: 3800, enabled: ready });
  const [noteX, setNoteX] = useState(0);

  const place = () => {
    const el = rootRef.current;
    if (el) el.style.transform = `translate3d(${(pos.current.u * widthRef.current).toFixed(1)}px, 0, 0)`;
  };
  useLayoutEffect(place, [width]);

  const facing = () => ((gsap.getProperty(flipRef.current, 'scaleX') as number) >= 0 ? 1 : -1);
  /** Painting x of a point at fraction `f` across the drawing, allowing for which way it faces. */
  const xAt = (f: number) => {
    const el = rootRef.current;
    const w = el?.offsetWidth ?? 0;
    return pos.current.u * widthRef.current + w * (facing() > 0 ? f : 1 - f);
  };

  // The patrol: in from the west during the intro, then back and forth, turning slowly at each end.
  useGSAP(
    () => {
      if (reduced || !ready || !flipRef.current) return;
      const p = pos.current;
      const flip = flipRef.current;
      const turn = (to: 1 | -1) => gsap.to(flip, { scaleX: to, svgOrigin: '100 100', duration: TURN_S, ease: 'sine.inOut' });
      const loop = gsap
        .timeline({ repeat: -1 })
        .fromTo(p, { u: BAND[0] }, { u: BAND[1], duration: GLIDE_S, ease: 'sine.inOut', onUpdate: place })
        .add(turn(-1), `-=${TURN_S * 0.6}`)
        .fromTo(p, { u: BAND[1] }, { u: BAND[0], duration: GLIDE_S, ease: 'sine.inOut', onUpdate: place }, `-=${TURN_S * 0.15}`)
        .add(turn(1), `-=${TURN_S * 0.6}`);
      const t = gsap.timeline();
      if (p.u < BAND[0]) t.to(p, { u: BAND[0], duration: 6, ease: 'power1.out', onUpdate: place });
      t.add(loop);
      tl.current = t;
      return () => {
        tl.current = null;
      };
    },
    { dependencies: [ready, reduced] }
  );

  const onNoteRef = useRef(onNote);
  onNoteRef.current = onNote;
  useEffect(() => onNoteRef.current?.(note.open), [note.open]);

  // Hold still while someone is looking at it, while it drinks, and while the lake is glass.
  const holding = note.open || focused || still;
  useEffect(() => {
    const t = tl.current;
    if (!t) return;
    if (holding) t.pause();
    else t.resume();
  }, [holding, ready]);

  // A ring at the breast every so often while it moves.
  useEffect(() => {
    if (reduced || !ready || holding) return;
    const id = window.setInterval(() => {
      if (!document.hidden) onWake(xAt(0.76), 0.2);
    }, 1600);
    return () => window.clearInterval(id);
    // xAt reads refs only
  }, [reduced, ready, holding, onWake]);

  // The bow: the neck arches, the head goes down beak first, a ring where it meets the water.
  const bowed = useRef(false);
  useGSAP(
    () => {
      const neck = neckRef.current;
      const head = headRef.current;
      if (!neck || !head || bowed.current === note.open) return;
      bowed.current = note.open;
      const down = note.open;
      const neckTo = { attr: { d: down ? NECK_BOW : NECK_UP } };
      const headTo = { ...(down ? HEAD_BOW : { x: 0, y: 0, rotation: 0 }), svgOrigin: '153.5 16.5' };
      if (reduced) {
        gsap.set(neck, neckTo);
        gsap.set(head, headTo);
        return;
      }
      const ease = down ? 'power2.inOut' : 'expoOut';
      const duration = down ? 1.2 : 0.9;
      gsap.to(neck, { ...neckTo, duration, ease });
      gsap.to(head, {
        ...headTo,
        duration,
        ease,
        onComplete: () => {
          if (down) onWake(xAt(BEAK_TIP_X), 0.75);
        },
      });
    },
    { dependencies: [note.open, reduced] }
  );

  // Keep the note on the painting: it hangs above the swan, sliding in from either edge.
  useLayoutEffect(() => {
    if (!note.open) return;
    const el = rootRef.current;
    const card = el?.querySelector<HTMLElement>('.swan__note');
    if (!el || !card) return;
    const left = pos.current.u * widthRef.current;
    const want = el.offsetWidth / 2 - card.offsetWidth / 2;
    const min = 12 - left;
    const max = widthRef.current - 12 - card.offsetWidth - left;
    setNoteX(Math.round(Math.max(min, Math.min(want, max))));
  }, [note.open]);

  return (
    <div ref={rootRef} className={`swan ${note.open ? 'is-drinking' : ''}`} style={{ ['--note-x' as string]: `${noteX}px` } as CSSProperties}>
      <button
        type="button"
        className="swan__btn"
        aria-label="The swan"
        aria-expanded={note.open}
        aria-controls="swan-note"
        onClick={note.toggle}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        {...note.pointer}
      >
        <svg className="swan__art" viewBox="0 0 200 150" aria-hidden="true" focusable="false">
          <defs>
            <linearGradient id="swan-plumage" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0.3" className="swan__stop-lit" />
              <stop offset="1" className="swan__stop-shade" />
            </linearGradient>
            <linearGradient id="swan-fade" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#000" stopOpacity="0.5" />
              <stop offset="0.75" stopColor="#000" stopOpacity="0" />
            </linearGradient>
            <mask id="swan-mirror" maskUnits="userSpaceOnUse" x="0" y="100" width="200" height="50" style={{ maskType: 'alpha' }}>
              <rect x="0" y="100" width="200" height="50" fill="url(#swan-fade)" />
            </mask>
          </defs>
          <g ref={flipRef}>
            {/* the wake, opening out behind */}
            <path className="swan__wake" d="M44 99 C 30 98, 16 96, 2 93 M62 101.5 C 44 103.5, 26 106.5, 6 110" />
            {/* the reflection is the swan itself, mirrored live, so it bows too */}
            <g mask="url(#swan-mirror)">
              <use href="#swan-self" transform="translate(0 200) scale(1 -1)" />
            </g>
            <g id="swan-self">
              {/* body: raised tail at the back, folded wings, a full breast */}
              <path
                className="swan__fill"
                d="M38 76 C 46 84, 56 92, 72 97 C 92 101, 120 101, 140 98 C 152 96, 158 88, 154 79 C 150 71, 140 68, 128 70 C 116 72, 104 67, 90 66 C 74 65, 58 70, 38 76 Z"
              />
              <path className="swan__wing" d="M128 74 C 112 70, 92 70, 76 74 C 66 77, 56 79, 46 79 C 58 82, 70 86, 86 88 C 104 90, 122 86, 132 80" />
              <path className="swan__feather" d="M118 80 q -9 5 -18 3 M104 83 q -9 4 -18 2 M90 84 q -9 3 -17 1 M76 83 q -8 2 -15 0" />
              <path ref={neckRef} className="swan__neck" d={NECK_UP} />
              <g ref={headRef}>
                <ellipse className="swan__fill" cx="153.5" cy="16.5" rx="8" ry="6" transform="rotate(14 153.5 16.5)" />
                <path className="swan__beak" d="M158 14.5 C 164 15.5, 170 19, 172 23.5 C 167 23, 161 21.5, 157.5 20 Z" />
                <path className="swan__knob" d="M156.5 12.8 C 159.5 12.4, 161 14, 160 16.4 C 158.6 16.2, 157 15.2, 156.5 12.8 Z" />
                <circle className="swan__eye" cx="152.8" cy="15.4" r="1.25" />
              </g>
            </g>
            <path className="swan__waterline" d="M42 100.5 H 160" />
          </g>
        </svg>
      </button>
      <p id="swan-note" className="swan__note" aria-hidden={!note.open}>
        <span className="swan__note-deva" lang="sa">
          {cut.lines[0].text}
        </span>
        <span className="swan__note-deva" lang="sa">
          {cut.lines[1].text}
        </span>
        <span className="swan__note-line">{cut.lines[2].text}</span>
      </p>
    </div>
  );
}
