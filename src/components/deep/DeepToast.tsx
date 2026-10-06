import { useEffect, useRef, useState } from 'react';
import { deepCut, deepCuts, titleLang } from '../../data/deep';
import { onDiscover, openLinerNotes } from '../../lib/deep';
import './DeepToast.css';

const pad = (n: number) => String(n).padStart(2, '0');
const SHOW_MS = 4200;

/**
 * "Deep cut found": a record sleeve that slides up from the corner the first time a
 * hidden message is found. Holds while hovered or focused; queues if two arrive at once.
 */
export function DeepToast() {
  const [queue, setQueue] = useState<string[]>([]);
  const [leaving, setLeaving] = useState(false);
  const held = useRef(false);
  const timer = useRef<number | undefined>(undefined);
  const current = queue[0];

  // a beat after the find, so the reveal itself is seen first
  useEffect(
    () =>
      onDiscover((id) => {
        window.setTimeout(() => setQueue((q) => [...q, id]), 600);
      }),
    []
  );

  useEffect(() => {
    if (!current) return;
    setLeaving(false);
    const start = () => {
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => {
        if (held.current) return start();
        setLeaving(true);
        timer.current = window.setTimeout(() => setQueue((q) => q.slice(1)), 320);
      }, SHOW_MS);
    };
    start();
    return () => window.clearTimeout(timer.current);
  }, [current]);

  const cut = current ? deepCut(current) : null;

  return (
    <div className="deep-toast-region" aria-live="polite">
      {cut && (
        <div
          key={cut.id}
          className={`deep-toast ${leaving ? 'is-leaving' : ''}`}
          onPointerEnter={() => (held.current = true)}
          onPointerLeave={() => (held.current = false)}
          onFocus={() => (held.current = true)}
          onBlur={() => (held.current = false)}
        >
          <span className="deep-toast__disc loop" aria-hidden="true" />
          <span className="deep-toast__sleeve">
            <span className="deep-toast__kicker">
              Deep cut {pad(cut.no)} <span>/ {pad(deepCuts.length)}</span>
            </span>
            <span className="deep-toast__title" lang={titleLang(cut)}>
              {cut.title}
            </span>
            <button type="button" className="deep-toast__open" onClick={() => openLinerNotes(cut.id)}>
              Liner notes <span aria-hidden="true">→</span>
            </button>
          </span>
        </div>
      )}
    </div>
  );
}
