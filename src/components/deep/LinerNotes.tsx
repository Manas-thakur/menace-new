import { useEffect, useRef, useState } from 'react';
import { deepCuts, sides, titleLang, type DeepLang } from '../../data/deep';
import { registerLinerNotes, useDeepCuts } from '../../lib/deep';
import { lockScroll } from '../../lib/scroll';
import { prefersReducedMotion } from '../../lib/motion';
import { gsap } from '../../lib/gsap';
import './LinerNotes.css';

const pad = (n: number) => String(n).padStart(2, '0');
const langAttr = (l?: DeepLang) => (l && l !== 'en' ? l : undefined);

/**
 * Liner notes: the back of Side B's sleeve. Lists the nine deep cuts — the ones this
 * visitor has found in full, the rest as a hint and a place to look.
 */
export function LinerNotes() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const sleeveRef = useRef<HTMLDivElement>(null);
  const opener = useRef<Element | null>(null);
  const [focusId, setFocusId] = useState<string | undefined>();
  const found = useDeepCuts();

  useEffect(() => {
    registerLinerNotes((id) => {
      const dlg = dialogRef.current;
      if (!dlg) return;
      setFocusId(id);
      if (dlg.open) return;
      opener.current = document.activeElement;
      dlg.showModal();
      lockScroll(true);
      dlg.querySelector<HTMLElement>('.ln__close')?.focus({ preventScroll: true });
      if (!prefersReducedMotion() && sleeveRef.current) {
        gsap.fromTo(sleeveRef.current, { y: 60, rotate: -1.5, opacity: 0 }, { y: 0, rotate: 0, opacity: 1, duration: 0.6, ease: 'expoOut', clearProps: 'transform,opacity' });
      }
    });
    return () => registerLinerNotes(null);
  }, []);

  // bring the cut that was just found into view
  useEffect(() => {
    if (!focusId || !dialogRef.current?.open) return;
    const el = dialogRef.current.querySelector<HTMLElement>(`[data-cut="${focusId}"]`);
    el?.scrollIntoView({ block: 'center', behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
  }, [focusId]);

  const close = () => dialogRef.current?.close();
  const onClose = () => {
    lockScroll(false);
    setFocusId(undefined);
    (opener.current as HTMLElement | null)?.focus?.({ preventScroll: true });
  };

  const count = found.length;

  return (
    <dialog
      ref={dialogRef}
      className="ln"
      aria-labelledby="ln-title"
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div ref={sleeveRef} className="ln__sleeve" data-lenis-prevent>
        <div className="tx tx-grain" aria-hidden="true" />
        <header className="ln__head">
          <p className="ln__band">Manas Thakur — Vol. 26 · Side B</p>
          <h2 id="ln-title" className="ln__title">
            Liner notes
          </h2>
          <p className="ln__sides">
            <span>{sides.a}</span> <span className="ln__sides-b">{sides.b}</span>
          </p>
          <p className="ln__count">
            <b>{count}</b> of {deepCuts.length} deep cuts found
          </p>
          <ol className="ln__grooves" aria-hidden="true">
            {deepCuts.map((c) => (
              <li key={c.id} className={found.includes(c.id) ? 'is-found' : ''} />
            ))}
          </ol>
          <button type="button" className="ln__close" onClick={close}>
            Close <span aria-hidden="true">×</span>
          </button>
        </header>

        <ol className="ln__tracks">
          {deepCuts.map((cut) => {
            const isFound = found.includes(cut.id);
            return (
              <li key={cut.id} data-cut={cut.id} className={`ln__track ${isFound ? 'is-found' : 'is-hidden'} ${focusId === cut.id ? 'is-new' : ''}`}>
                <span className="ln__no" aria-hidden="true">
                  {pad(cut.no)}
                </span>
                <div className="ln__body">
                  {isFound ? (
                    <>
                      <h3 className="ln__name" lang={titleLang(cut)}>
                        <span className="visually-hidden">Track {cut.no}: </span>
                        {cut.title}
                      </h3>
                      <p className="ln__where">{cut.where}</p>
                      <blockquote className="ln__lines">
                        {/* a first line that is the title itself (मानस) isn't repeated */}
                        {cut.lines.slice(cut.lines[0].text === cut.title ? 1 : 0).map((l, k) => (
                          <p key={k} lang={langAttr(l.lang)} className={l.lang && l.lang !== 'en' ? 'is-original' : ''}>
                            {l.text}
                          </p>
                        ))}
                      </blockquote>
                      <p className="ln__source">{cut.source}</p>
                    </>
                  ) : (
                    <>
                      <h3 className="ln__name ln__name--hidden">
                        <span className="visually-hidden">Track {cut.no}, still hidden</span>
                        <span aria-hidden="true">— — —</span>
                      </h3>
                      <p className="ln__where">{cut.where}</p>
                      <p className="ln__hint">{cut.hint}</p>
                    </>
                  )}
                </div>
              </li>
            );
          })}
        </ol>

        <footer className="ln__foot">
          <span>Pressed in Delhi NCR · 2026</span>
          <span>{count === deepCuts.length ? 'Every groove played. Thank you.' : 'Look closely.'}</span>
        </footer>
      </div>
    </dialog>
  );
}
