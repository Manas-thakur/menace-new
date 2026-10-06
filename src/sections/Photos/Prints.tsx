import type { CSSProperties } from 'react';
import { photos, photoSrc } from '../../data/photos';
import { noise } from './geometry';
import { preloadLarge } from './large';

export const pad2 = (n: number) => String(n).padStart(2, '0');

/** A wooden clothes peg with its steel spring. */
function Peg() {
  return (
    <svg className="pr__peg" viewBox="0 0 22 58" aria-hidden="true" focusable="false">
      <rect className="peg__wood" x="1.5" y="0" width="8.5" height="58" rx="3.2" />
      <rect className="peg__wood peg__wood--shade" x="12" y="0" width="8.5" height="58" rx="3.2" />
      <path className="peg__grain" d="M5.6 6v14M16.2 6v14M5.6 36v16M16.2 36v16" />
      <rect className="peg__spring" x="0" y="22" width="22" height="8" rx="2.4" />
      <path className="peg__coil" d="M3 24.5h16M3 27.5h16" />
    </svg>
  );
}

type PrintsProps = {
  setRef: (i: number, el: HTMLButtonElement | null) => void;
  /** -1 removes a print from the tab order (the pile on the line). */
  tabIndexFor: (i: number) => number;
  hiddenFor: (i: number) => boolean;
  onActivate: (i: number, el: HTMLButtonElement) => void;
  onFocusPrint: (i: number) => void;
  /** `next` is where focus is going, when the browser says. */
  onBlurPrint: (i: number, next: HTMLElement | null) => void;
  onEnterPrint: (i: number, x: number, y: number) => void;
  onLeavePrint: (i: number) => void;
};

/**
 * The roll: 36 photographs, each one element that lives on the line, on the light
 * table and on the colour wheel. Each print is named by its own text (frame number,
 * the pencilled date and place, then a description), so the accessible name always
 * contains what is visible.
 */
export function Prints({ setRef, tabIndexFor, hiddenFor, onActivate, onFocusPrint, onBlurPrint, onEnterPrint, onLeavePrint }: PrintsProps) {
  return (
    <div className="dr-prints" role="group" aria-label={`The roll — ${photos.length} frames`}>
      {photos.map((ph, i) => {
        const hidden = hiddenFor(i);
        return (
          <button
            key={ph.slug}
            ref={(el) => setRef(i, el)}
            type="button"
            className="pr"
            data-index={i}
            tabIndex={tabIndexFor(i)}
            aria-hidden={hidden || undefined}
            aria-haspopup="dialog"
            style={{ '--shift': (noise(i + 1, 2) * 0.24 - 0.12).toFixed(3) } as CSSProperties}
            onClick={(e) => onActivate(i, e.currentTarget)}
            onFocus={() => {
              preloadLarge(ph.slug);
              onFocusPrint(i);
            }}
            onBlur={(e) => onBlurPrint(i, e.relatedTarget as HTMLElement | null)}
            onPointerDown={() => preloadLarge(ph.slug)}
            onPointerEnter={(e) => {
              if (e.pointerType === 'touch') return;
              preloadLarge(ph.slug);
              onEnterPrint(i, e.clientX, e.clientY);
            }}
            onPointerLeave={(e) => e.pointerType !== 'touch' && onLeavePrint(i)}
          >
            <span className="pr__paper" aria-hidden="true" />
            <span className="pr__card" aria-hidden="true" />
            <span className="pr__img">
              <img src={photoSrc(ph.slug, 'sm')} width={640} height={640} alt="" loading="lazy" decoding="async" />
              <span className="pr__neg" aria-hidden="true">
                <img src={photoSrc(ph.slug, 'sm')} width={640} height={640} alt="" loading="lazy" decoding="async" />
              </span>
              <span className="pr__dev" aria-hidden="true" />
            </span>
            <span className="visually-hidden">Frame {pad2(i + 1)}, </span>
            <span className="pr__bits">
              <Peg />
              <span className="pr__label">
                <span>{ph.date}</span>
                {ph.place && (
                  <>
                    {' '}
                    <span>{ph.place}</span>
                  </>
                )}
              </span>
            </span>
            <span className="visually-hidden">. {ph.alt}</span>
          </button>
        );
      })}
    </div>
  );
}
