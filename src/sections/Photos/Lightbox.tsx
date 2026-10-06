import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { Flip } from 'gsap/Flip';
import { gsap } from '../../lib/gsap';
import { lockScroll } from '../../lib/scroll';
import { photos, photoSrc } from '../../data/photos';
import { isDecoded, preloadLarge } from './large';

gsap.registerPlugin(Flip);

export type LightboxState = { index: number; from: HTMLElement | null } | null;

type LightboxProps = {
  state: LightboxState;
  reduced: boolean;
  onIndex: (index: number) => void;
  onClosed: () => void;
};

const pad = (n: number) => String(n).padStart(2, '0');

const printOf = (index: number) => document.querySelector<HTMLElement>(`.photos .pr[data-index="${index}"]`);

/**
 * What the viewer flies from (and back to): the paper print on the line, the
 * negative's image window on the light table, the chip on the colour wheel — or the
 * wheel's hub, when that is what opened the viewer and it still shows this frame.
 */
function sourceFor(index: number, preferHub = false): { box: HTMLElement; print: HTMLElement } | null {
  if (preferHub) {
    const hub = document.querySelector<HTMLElement>('.photos .dr-hub__btn');
    const frame = hub?.querySelector<HTMLElement>('.dr-hub__frame');
    if (hub && frame && hub.dataset.index === String(index) && getComputedStyle(hub).visibility === 'visible') return { box: frame, print: hub };
  }
  const print = printOf(index);
  if (!print) return null;
  const paper = print.querySelector<HTMLElement>('.pr__paper');
  const img = print.querySelector<HTMLElement>('.pr__img');
  const box = paper && Number(getComputedStyle(paper).opacity) > 0.5 ? paper : img;
  if (!box) return null;
  const r = box.getBoundingClientRect();
  if (r.width < 2 || r.bottom < 0 || r.top > window.innerHeight || r.right < 0 || r.left > window.innerWidth) return null;
  return { box, print };
}

/**
 * The enlarger: a native modal <dialog>. Opening flies the print off the line into
 * the frame (GSAP Flip); closing flies it back if that print is on screen.
 */
export function Lightbox({ state, reduced, onIndex, onClosed }: LightboxProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const printRef = useRef<HTMLDivElement>(null);
  const infoRef = useRef<HTMLElement>(null);
  const shown = useRef<number | null>(null);
  const closing = useRef(false);
  // opened from the colour wheel's hub: fly from (and back to) the hub
  const fromHub = useRef(false);
  const [loaded, setLoaded] = useState('');

  const total = photos.length;
  const index = state?.index ?? 0;
  const photo = photos[index];

  const chrome = () => Array.from(dialogRef.current?.querySelectorAll<HTMLElement>('.lb__chrome') ?? []);

  // Open, or move to another photo while open.
  useLayoutEffect(() => {
    const dlg = dialogRef.current;
    const print = printRef.current;
    const info = infoRef.current;
    if (!dlg || !print || !info || !state) return;

    if (!dlg.open) {
      dlg.showModal();
      lockScroll(true);
      shown.current = state.index;
      dlg.querySelector<HTMLElement>('.lb__close')?.focus({ preventScroll: true });
      if (reduced) return;
      fromHub.current = !!state.from?.classList.contains('dr-hub__btn');
      const src = sourceFor(state.index, fromHub.current);
      if (src) {
        src.print.style.visibility = 'hidden';
        Flip.fit(print, src.box, { scale: true });
        gsap.to(print, {
          x: 0,
          y: 0,
          scaleX: 1,
          scaleY: 1,
          rotation: 0,
          duration: 0.8,
          ease: 'expoOut',
          // Drop the transform entirely once it lands: the photo was rasterised while
          // small mid-flight, and an identity matrix can keep that soft raster alive.
          clearProps: 'transform',
          onComplete: () => {
            src.print.style.visibility = '';
          },
        });
      } else {
        gsap.from(print, { scale: 0.94, opacity: 0, duration: 0.5, ease: 'expoOut', clearProps: 'transform,opacity' });
      }
      gsap.from(info.children, { y: 16, opacity: 0, duration: 0.6, ease: 'expoOut', stagger: 0.05, delay: 0.25 });
      gsap.from(chrome(), { opacity: 0, duration: 0.4, delay: 0.3 });
      return;
    }

    const prev = shown.current;
    if (prev === null || prev === state.index) return;
    const dir = state.index === (prev + 1) % total ? 1 : -1;
    shown.current = state.index;
    if (reduced) return;
    gsap.fromTo(print, { xPercent: dir * 5, opacity: 0 }, { xPercent: 0, opacity: 1, duration: 0.5, ease: 'expoOut', clearProps: 'transform,opacity' });
    gsap.fromTo(info.children, { y: 10, opacity: 0 }, { y: 0, opacity: 1, duration: 0.45, ease: 'expoOut', stagger: 0.04 });
  }, [state, reduced, total]);

  // Decode this frame's full-size image (usually already done on hover), then pull the
  // neighbours in so the arrow keys land on sharp photos too.
  useEffect(() => {
    if (!state) return;
    const slug = photos[state.index].slug;
    let alive = true;
    preloadLarge(slug).then(() => alive && setLoaded(slug));
    for (const d of [1, -1]) preloadLarge(photos[(state.index + d + total) % total].slug);
    return () => {
      alive = false;
    };
  }, [state, total]);

  const close = useCallback(() => {
    const dlg = dialogRef.current;
    const print = printRef.current;
    const info = infoRef.current;
    if (!dlg || !print || !info || !dlg.open || closing.current) return;
    closing.current = true;
    const finish = () => dlg.close();
    if (reduced) return finish();
    dlg.classList.add('is-closing');
    gsap.to([info, ...chrome()], { opacity: 0, duration: 0.2, ease: 'power1.out' });
    const src = sourceFor(shown.current ?? 0, fromHub.current);
    if (src) {
      src.print.style.visibility = 'hidden';
      Flip.fit(print, src.box, {
        scale: true,
        duration: 0.55,
        ease: 'power3.inOut',
        onComplete: () => {
          src.print.style.visibility = '';
          finish();
        },
      });
    } else {
      gsap.to(print, { opacity: 0, scale: 0.95, duration: 0.25, ease: 'power2.in', onComplete: finish });
    }
  }, [reduced]);

  // Runs after the dialog has actually closed (button, Esc, backdrop).
  const handleClose = () => {
    const dlg = dialogRef.current;
    dlg?.classList.remove('is-closing');
    gsap.killTweensOf([printRef.current, infoRef.current, ...chrome()]);
    gsap.set([printRef.current, infoRef.current, ...chrome()], { clearProps: 'transform,opacity' });
    closing.current = false;
    lockScroll(false);
    // Return focus to the print of the photo being viewed if it can take focus in
    // this view (not buried in the tray); otherwise to whatever opened the viewer.
    const current = printOf(shown.current ?? -1);
    const usable = current && current.tabIndex >= 0 && !current.hasAttribute('aria-hidden');
    const opener = fromHub.current ? state?.from : usable ? current : state?.from;
    shown.current = null;
    opener?.focus({ preventScroll: true });
    onClosed();
  };

  const go = (d: number) => onIndex((index + d + total) % total);

  return (
    <dialog
      ref={dialogRef}
      className="lb"
      aria-label="Photo viewer"
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
      onClose={handleClose}
      onClick={(e) => {
        const t = e.target as HTMLElement;
        if (t === e.currentTarget || t.classList.contains('lb__stage')) close();
      }}
      onKeyDown={(e) => {
        if (e.key === 'ArrowRight') {
          e.preventDefault();
          go(1);
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault();
          go(-1);
        }
      }}
    >
      {state && (
        <div className="lb__stage">
          <button type="button" className="lb__chrome lb__close" onClick={close}>
            Close <span aria-hidden="true">×</span>
          </button>
          <button type="button" className="lb__chrome lb__nav lb__nav--prev" aria-label="Previous photo" onClick={() => go(-1)}>
            <span aria-hidden="true">←</span>
          </button>
          <button type="button" className="lb__chrome lb__nav lb__nav--next" aria-label="Next photo" onClick={() => go(1)}>
            <span aria-hidden="true">→</span>
          </button>

          <figure className="lb__figure">
            <div ref={printRef} className="lb__print" style={{ '--w': photo.w, '--h': photo.h } as CSSProperties}>
              <div className="lb__img">
                <img key={`ph-${photo.slug}`} className="lb__ph" src={photoSrc(photo.slug, 'sm')} alt="" aria-hidden="true" />
                <img
                  key={photo.slug}
                  className={`lb__full ${loaded === photo.slug || isDecoded(photo.slug) ? 'is-loaded' : ''}`}
                  src={photoSrc(photo.slug, 'lg')}
                  alt={photo.alt}
                  width={photo.w}
                  height={photo.h}
                  decoding="async"
                  onLoad={() => setLoaded(photo.slug)}
                />
              </div>
              <span className="lb__pencil" aria-hidden="true">
                MT · {pad(index + 1)}
              </span>
            </div>
            <figcaption ref={infoRef} className="lb__info" aria-live="polite">
              <p className="lb__count">
                Frame {pad(index + 1)} <span>/ {pad(total)}</span>
              </p>
              {photo.caption && <p className="lb__caption">“{photo.caption}”</p>}
              <p className="lb__meta">{[photo.place, photo.date].filter(Boolean).join(' · ')}</p>
              {photo.palette.length > 0 && (
                <div className="lb__palette">
                  <p className="lb__palette-title">Colours in this frame</p>
                  <ul className="lb__swatches">
                    {photo.palette.map((hex, k) => (
                      <li key={hex + k} className="lb__swatch">
                        <span className="lb__chip" style={{ background: hex }} aria-hidden="true" />
                        <code>{hex}</code>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <a className="lb__post" href={photo.post} target="_blank" rel="noreferrer">
                View on Instagram <span aria-hidden="true">↗</span>
                <span className="visually-hidden"> (opens in a new tab)</span>
              </a>
            </figcaption>
          </figure>
        </div>
      )}
    </dialog>
  );
}
