import {
  useEffect,
  useId,
  useRef,
  useState,
  type FocusEvent as ReactFocusEvent,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { Tape } from '../../components/primitives/Print';
import { deepCut } from '../../data/deep';
import { discover } from '../../lib/deep';
import { gsap, useGSAP } from '../../lib/gsap';
import { prefersReducedMotion } from '../../lib/motion';
import { Kulhad } from './Kulhad';
import './DohaCut.css';

/*
 * Deep cut · "Slowly". The kulhad is a button: wait on it (hover ~½ s), focus it,
 * or tap it, and the steam gathers to write the doha's first word, then Kabir's
 * couplet turns up pencilled on a scrap tucked against the cup. Every string comes
 * from src/data/deep.ts.
 */
const CUT = deepCut('slowly');
const VERSE = CUT.lines.filter((l) => l.lang === 'hi');
const PROSE = CUT.lines.filter((l) => !l.lang || l.lang === 'en');
/** The doha's first word (धीरे), written in steam. */
const STEAM_WORD = VERSE[0]?.text.split(/\s+/)[0] ?? '';
const LABEL = CUT.hint.replace(/\.\s*$/, '');
const HOVER_INTENT = 500;
const LINGER = 700;
/** Where the steam gathers, in units of the 600 × 1000 kulhad board: right of the pour. */
const STEAM_ORIGIN = '456 560';

/** A doha line split at its caesura, so on a narrow scrap it breaks there and only there. */
const halves = (text: string) => text.split(/(?<=,)\s+/);

export function DohaCut() {
  const rootRef = useRef<HTMLDivElement>(null);
  const noteId = useId();
  const [open, setOpen] = useState(false);
  const pinned = useRef(false);
  const hovering = useRef({ cup: false, note: false });
  const focused = useRef(false);
  const lastPointer = useRef('mouse');
  const timers = useRef<{ intent?: number; linger?: number }>({});
  const tl = useRef<gsap.core.Timeline | null>(null);
  const mounted = useRef(false);

  const { contextSafe } = useGSAP({ scope: rootRef });

  const parts = () => {
    const root = rootRef.current!;
    return {
      note: root.querySelector<HTMLElement>('.doha__note'),
      tape: root.querySelector<HTMLElement>('.doha__tape'),
      word: root.querySelector<HTMLElement>('.doha__steam'),
      curls: root.querySelector<SVGGElement>('.kulhad__steam-group'),
    };
  };

  /**
   * Stacked layouts (phones, tablets): the scrap hangs below the cup, so it can open
   * under the fold or beneath the "deep cut found" toast in the bottom corner. Scroll
   * just enough to show all of it, never pushing its top under the nav. Desktop needs
   * none of this: there the note lives in the pinned art column, always in view.
   */
  const bringIntoView = (note: HTMLElement | null) => {
    if (!note || !window.matchMedia('(max-width: 63.99rem)').matches) return;
    const r = note.getBoundingClientRect();
    const navBottom = document.querySelector('.navbar')?.getBoundingClientRect().bottom ?? 0;
    const floor = window.innerHeight - Math.min(170, window.innerHeight * 0.22);
    let dy = r.bottom > floor ? r.bottom - floor : 0;
    if (r.top - dy < navBottom + 12) dy = r.top - navBottom - 12;
    if (Math.abs(dy) < 4) return;
    window.scrollBy({ top: dy, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
  };

  const reveal = contextSafe(() => {
    const { note, tape, word, curls } = parts();
    tl.current?.kill();
    bringIntoView(note);
    if (prefersReducedMotion()) {
      // No motion: the note is simply there.
      gsap.set(note, { autoAlpha: 1, x: 0, rotate: 0 });
      gsap.set(tape, { scaleX: 1 });
      discover(CUT.id);
      return;
    }
    tl.current = gsap
      .timeline({ defaults: { ease: 'expoOut' } })
      // the curls draw together and thin out…
      .to(curls, { scale: 0.32, opacity: 0, svgOrigin: STEAM_ORIGIN, duration: 0.45 }, 0)
      // …and rise as one pale word
      .fromTo(
        word,
        { autoAlpha: 0, yPercent: 32, scale: 0.86, clipPath: 'inset(100% -25% -25% -25%)' },
        { autoAlpha: 0.92, yPercent: 0, scale: 1, clipPath: 'inset(-25% -25% -25% -25%)', duration: 0.5 },
        0.12
      )
      // which dissolves back into curls
      .to(word, { autoAlpha: 0, yPercent: -36, scale: 1.06, duration: 0.45, ease: 'riot' }, 0.72)
      .to(curls, { scale: 1, opacity: 1, duration: 0.5 }, 0.7)
      // the scrap slides out from behind the cup; its tape presses down
      .fromTo(note, { autoAlpha: 0, x: 36, rotate: 3 }, { autoAlpha: 1, x: 0, rotate: 0, duration: 0.55 }, 0.58)
      .fromTo(tape, { scaleX: 0, transformOrigin: '0% 50%' }, { scaleX: 1, duration: 0.28, ease: 'riot' }, 0.86)
      .call(() => discover(CUT.id), [], 0.8);
  });

  const conceal = contextSafe(() => {
    const { note, word, curls } = parts();
    tl.current?.kill();
    tl.current = null;
    if (prefersReducedMotion()) {
      gsap.set(note, { autoAlpha: 0 });
      gsap.set(word, { autoAlpha: 0 });
      gsap.set(curls, { scale: 1, opacity: 1 });
      return;
    }
    gsap.to(note, { autoAlpha: 0, x: 24, duration: 0.35, ease: 'riot' });
    gsap.to(word, { autoAlpha: 0, duration: 0.25, ease: 'riot' });
    gsap.to(curls, { scale: 1, opacity: 1, duration: 0.45, ease: 'expoOut' });
  });

  // Play only when `open` flips (contextSafe wrappers get a new identity every render).
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    if (open) reveal();
    else conceal();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const clear = (key: 'intent' | 'linger') => {
    window.clearTimeout(timers.current[key]);
    timers.current[key] = undefined;
  };

  /** Close once nothing (hover, focus, a pin) is holding the note open. */
  const settle = () => {
    clear('linger');
    timers.current.linger = window.setTimeout(() => {
      const held = pinned.current || hovering.current.cup || hovering.current.note || focused.current;
      if (!held) setOpen(false);
    }, LINGER);
  };

  const close = () => {
    clear('intent');
    clear('linger');
    pinned.current = false;
    setOpen(false);
  };

  // While open: Escape closes, and a press anywhere else puts the note away.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    const onDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) close();
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onDown);
    };
  }, [open]);

  useEffect(
    () => () => {
      window.clearTimeout(timers.current.intent);
      window.clearTimeout(timers.current.linger);
    },
    []
  );

  // Entering only marks the hover; the wait for the chai starts on a real movement
  // over the cup (motionless pointer events are filtered site-wide), so a page that
  // scrolls the cup under a resting cursor never opens it.
  const onCupEnter = (e: ReactPointerEvent) => {
    if (e.pointerType !== 'mouse') return;
    hovering.current.cup = true;
    clear('linger');
  };
  const onCupMove = (e: ReactPointerEvent) => {
    if (e.pointerType !== 'mouse' || open || timers.current.intent !== undefined) return;
    hovering.current.cup = true;
    clear('linger');
    timers.current.intent = window.setTimeout(() => {
      timers.current.intent = undefined;
      setOpen(true);
    }, HOVER_INTENT);
  };
  const onCupLeave = (e: ReactPointerEvent) => {
    if (e.pointerType !== 'mouse') return;
    hovering.current.cup = false;
    clear('intent');
    settle();
  };
  const onNoteEnter = (e: ReactPointerEvent) => {
    if (e.pointerType !== 'mouse') return;
    hovering.current.note = true;
    clear('linger');
  };
  const onNoteLeave = (e: ReactPointerEvent) => {
    if (e.pointerType !== 'mouse') return;
    hovering.current.note = false;
    settle();
  };
  // Keyboard focus opens it; focus that comes from a press is handled by the click.
  const onFocus = (e: ReactFocusEvent<HTMLButtonElement>) => {
    if (!e.currentTarget.matches(':focus-visible')) return;
    focused.current = true;
    clear('linger');
    setOpen(true);
  };
  const onBlur = () => {
    focused.current = false;
    settle();
  };
  const onClick = (e: ReactMouseEvent) => {
    clear('intent');
    const fromKeyboard = e.detail === 0;
    // A hover already opened it: a mouse click keeps it open instead of closing it.
    if (!fromKeyboard && lastPointer.current === 'mouse' && open && !pinned.current) {
      pinned.current = true;
      return;
    }
    pinned.current = !open;
    setOpen(!open);
  };

  return (
    <div ref={rootRef} className={`doha ${open ? 'is-open' : ''}`}>
      <Kulhad />

      <span className="doha__steam" lang="hi" aria-hidden="true">
        {STEAM_WORD}
      </span>

      <button
        type="button"
        className="doha__cup"
        aria-expanded={open}
        aria-controls={noteId}
        onPointerDown={(e) => (lastPointer.current = e.pointerType)}
        onPointerEnter={onCupEnter}
        onPointerMove={onCupMove}
        onPointerLeave={onCupLeave}
        onFocus={onFocus}
        onBlur={onBlur}
        onClick={onClick}
      >
        <span className="visually-hidden">{LABEL}</span>
      </button>

      <figure id={noteId} className="doha__note" onPointerEnter={onNoteEnter} onPointerLeave={onNoteLeave}>
        <span className="doha__paper" aria-hidden="true" />
        <Tape className="doha__tape" rotate={-5} />
        <blockquote className="doha__verse">
          {VERSE.map((line) => (
            <p key={line.text} lang={line.lang}>
              {halves(line.text).map((half, i) => (
                <span key={i}>{half}</span>
              ))}
            </p>
          ))}
        </blockquote>
        {PROSE.map((line) => (
          <p key={line.text} className="doha__translation">
            {line.text}
          </p>
        ))}
        <figcaption className="doha__source">— {CUT.source}</figcaption>
      </figure>
    </div>
  );
}
