import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react';
import { gsap, SplitText } from '../../lib/gsap';
import { deepCut } from '../../data/deep';

type HiddenTrackProps = {
  open: boolean;
  /** Bumps on every play, so pressing the hole again replays the words. */
  run: number;
  reduced: boolean;
  onClose: () => void;
  /** The record's centre hole — the words rise from its direction. */
  originRef: RefObject<HTMLElement | null>;
};

/**
 * The hidden track: after the silence, the site's closing words rise out of the
 * label like liner text. A non-modal dialog — Esc, a click away or Close ends it.
 */
export function HiddenTrack({ open, run, reduced, onClose, originRef }: HiddenTrackProps) {
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [shown, setShown] = useState(false);
  const cut = deepCut('hidden');

  useEffect(() => {
    if (open) setShown(true);
  }, [open]);

  // Rise in (every run).
  useLayoutEffect(() => {
    const el = ref.current;
    if (!open || !shown || !el) return;
    // On short screens the words may open under the sticky nav: nudge the page just enough.
    const navBottom = document.querySelector('.navbar')?.getBoundingClientRect().bottom ?? 0;
    const overlap = navBottom + 12 - el.getBoundingClientRect().top;
    if (overlap > 0) window.scrollBy({ top: -overlap, behavior: reduced ? 'auto' : 'smooth' });
    if (reduced) {
      gsap.set(el, { autoAlpha: 1, x: 0, y: 0 });
      closeRef.current?.focus({ preventScroll: true });
      return;
    }
    const o = originRef.current?.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    const dx = o ? (o.left + o.width / 2 - (r.left + r.width / 2)) * 0.12 : 0;
    const dy = o ? (o.top + o.height / 2 - (r.top + r.height / 2)) * 0.12 : 24;
    const split = SplitText.create(el.querySelectorAll('.contact__hidden-lines p'), { type: 'lines', mask: 'lines' });
    const tl = gsap.timeline({ onComplete: () => split.revert() });
    // opacity only (not autoAlpha): the panel must stay focusable from the first frame
    gsap.set(el, { visibility: 'visible', opacity: 0 });
    closeRef.current?.focus({ preventScroll: true });
    tl.fromTo(el, { opacity: 0, x: dx, y: dy }, { opacity: 1, x: 0, y: 0, duration: 0.95, ease: 'expoOut' }, 0.22)
      .from(split.lines, { yPercent: 105, duration: 0.65, ease: 'expoOut', stagger: 0.06 }, 0.28)
      .from(el.querySelectorAll('.contact__hidden-credit, .contact__hidden-close'), { opacity: 0, y: 8, duration: 0.3, ease: 'expoOut', stagger: 0.05 }, 0.82);
    return () => {
      tl.kill();
      split.revert();
    };
  }, [open, shown, run, reduced, originRef]);

  // Fade out, then unmount from view.
  useEffect(() => {
    const el = ref.current;
    if (open || !shown || !el) return;
    if (reduced) {
      setShown(false);
      return;
    }
    const t = gsap.to(el, { autoAlpha: 0, y: 12, duration: 0.3, ease: 'power2.in', onComplete: () => setShown(false) });
    return () => {
      t.kill();
    };
  }, [open, shown, reduced]);

  return (
    <div
      ref={ref}
      id="contact-hidden"
      className="contact__hidden"
      role="dialog"
      aria-modal="false"
      aria-labelledby="contact-hidden-title"
      aria-describedby="contact-hidden-lines"
      hidden={!shown}
    >
      <div id="contact-hidden-lines" className="contact__hidden-lines">
        {cut.lines.map((l, i) => (
          <p key={i} lang={l.lang && l.lang !== 'en' ? l.lang : undefined}>
            {l.text}
          </p>
        ))}
      </div>
      <p id="contact-hidden-title" className="contact__hidden-credit">
        Hidden track · {cut.source}
      </p>
      <button ref={closeRef} type="button" className="contact__hidden-close" aria-label="Close the hidden track" onClick={onClose}>
        Close <span aria-hidden="true">×</span>
      </button>
    </div>
  );
}
