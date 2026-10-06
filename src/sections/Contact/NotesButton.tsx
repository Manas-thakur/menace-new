import { useEffect, useRef } from 'react';
import { gsap } from '../../lib/gsap';
import { deepCuts } from '../../data/deep';
import { openLinerNotes, useDeepCuts } from '../../lib/deep';
import { prefersReducedMotion } from '../../lib/motion';

/** The way in for everyone: opens Side B's liner notes, with a live count of cuts found. */
export function NotesButton() {
  const found = useDeepCuts();
  const countRef = useRef<HTMLSpanElement>(null);
  const seen = useRef(found.length);
  const total = deepCuts.length;

  // A small tick of the counter when a new cut is found.
  useEffect(() => {
    if (found.length > seen.current && countRef.current && !prefersReducedMotion()) {
      gsap.fromTo(countRef.current, { scale: 1.45 }, { scale: 1, duration: 0.5, ease: 'riot' });
    }
    seen.current = found.length;
  }, [found.length]);

  return (
    <button type="button" className="contact__notes" onClick={() => openLinerNotes()}>
      <svg className="contact__notes-disc" viewBox="0 0 20 20" aria-hidden="true">
        <circle cx="10" cy="10" r="9" />
        <circle className="contact__notes-label" cx="10" cy="10" r="3.6" />
      </svg>
      Liner notes
      <span ref={countRef} className="contact__notes-count" aria-hidden="true">
        · {found.length}/{total}
      </span>
      <span className="visually-hidden">
        , {found.length} of {total} deep cuts found
      </span>
    </button>
  );
}
