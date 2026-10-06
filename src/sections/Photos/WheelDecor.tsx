import { forwardRef, useEffect, useRef, useState, useSyncExternalStore, type CSSProperties, type KeyboardEvent } from 'react';
import { photos, photoSrc } from '../../data/photos';
import { hexToOklch, slotDeg, type WheelLayout } from './geometry';
import { pad2 } from './Prints';

/* ── which frame the hub shows ───────────────────────────── */

export type WheelState = { active: number; preview: number | null };
export type WheelStore = {
  get: () => WheelState;
  subscribe: (f: () => void) => () => void;
  setActive: (slot: number) => void;
  setPreview: (i: number | null) => void;
};

/** Active = the outer slot under the pointer; preview = a frame being hovered or focused. */
export function createWheelStore(): WheelStore {
  let state: WheelState = { active: 0, preview: null };
  const subs = new Set<() => void>();
  const emit = (next: WheelState) => {
    state = next;
    subs.forEach((f) => f());
  };
  return {
    get: () => state,
    subscribe: (f) => {
      subs.add(f);
      return () => subs.delete(f);
    },
    setActive: (slot) => slot !== state.active && emit({ ...state, active: slot }),
    setPreview: (i) => i !== state.preview && emit({ ...state, preview: i }),
  };
}

const useWheel = (store: WheelStore) => useSyncExternalStore(store.subscribe, store.get, store.get);

/* ── the track: a ring painted from the outer frames' own colours ── */

type TrackProps = {
  layout: WheelLayout;
  setTrack: (el: HTMLDivElement | null) => void;
  setLabel: (k: number, el: HTMLSpanElement | null) => void;
};

export function WheelTrack({ layout, setTrack, setLabel }: TrackProps) {
  const { cx, cy, track, Ro, Ri } = layout;
  const R2 = track.r + track.w / 2;
  const step = slotDeg(layout);
  const stops = track.colors.map((c, k) => `${c} ${(k * step).toFixed(2)}deg`).join(', ');
  const groove = (r: number) => ({ left: cx - r, top: cy - r, width: 2 * r, height: 2 * r });
  const tip = cy - R2 - 3;
  return (
    <>
      <span className="dr-groove" style={groove(Ro)} aria-hidden="true" />
      <span className="dr-groove dr-groove--inner" style={groove(Ri)} aria-hidden="true" />
      <div
        ref={setTrack}
        className="dr-track"
        style={
          {
            left: cx - R2,
            top: cy - R2,
            width: 2 * R2,
            height: 2 * R2,
            background: `conic-gradient(${stops}, ${track.colors[0]} 360deg)`,
            '--hole': `${(((R2 - track.w) / R2) * 100).toFixed(2)}%`,
          } as CSSProperties
        }
        aria-hidden="true"
      />
      {layout.labels.map((l, k) => (
        <span key={l.text} ref={(el) => setLabel(k, el)} className="dr-track__label" aria-hidden="true">
          {l.text}
        </span>
      ))}
      <svg
        className="dr-pointer"
        style={{ left: cx - layout.pointer * 0.42, top: tip - layout.pointer, width: layout.pointer * 0.84, height: layout.pointer }}
        viewBox="0 0 20 24"
        aria-hidden="true"
        focusable="false"
      >
        <path d="M2 2h16L10 22z" />
      </svg>
    </>
  );
}

/* ── the spin surface: drag it, or use the arrow keys ─────── */

type SpinnerProps = { layout: WheelLayout; store: WheelStore; onKey: (e: KeyboardEvent<HTMLDivElement>) => void };

export const WheelSpinner = forwardRef<HTMLDivElement, SpinnerProps>(function WheelSpinner({ layout, store, onKey }, ref) {
  const { active } = useWheel(store);
  const i = layout.outer[active];
  const ph = photos[i];
  const R2 = layout.track.r + layout.track.w / 2;
  return (
    <div
      ref={ref}
      className="dr-spin"
      role="slider"
      tabIndex={0}
      aria-label="Colour wheel — spin to browse"
      aria-valuemin={1}
      aria-valuemax={layout.outer.length}
      aria-valuenow={active + 1}
      aria-valuetext={`Frame ${pad2(i + 1)}, ${ph.date}${ph.place ? `, ${ph.place}` : ''}`}
      style={{ left: layout.cx - R2, top: layout.cy - R2, width: 2 * R2, height: 2 * R2 }}
      onKeyDown={onKey}
    />
  );
});

/* ── the hub: a large preview of the active frame ─────────── */

type HubProps = { layout: WheelLayout; store: WheelStore; reduced: boolean; onOpen: (i: number, from: HTMLElement) => void };

export function WheelHub({ layout, store, reduced, onOpen }: HubProps) {
  const { active, preview } = useWheel(store);
  const i = preview ?? layout.outer[active];
  const [prev, setPrev] = useState<number | null>(null);
  const shown = useRef(i);
  const btn = useRef<HTMLButtonElement>(null);
  // open the frame that was showing when the press began, whatever the hub does meanwhile
  const pressed = useRef<number | null>(null);
  useEffect(() => {
    if (i === shown.current) return;
    if (!reduced) setPrev(shown.current);
    shown.current = i;
  }, [i, reduced]);

  const ph = photos[i];
  const d = layout.hub;
  const chip = Math.max(10, 0.055 * layout.Ro);
  const ringR = d / 2 + chip * 0.95;
  const n = ph.palette.length;
  return (
    <div className="dr-hub" style={{ left: layout.cx, top: layout.cy } as CSSProperties}>
      <button
        ref={btn}
        type="button"
        className="dr-hub__btn"
        data-index={i}
        style={{ width: d, height: d }}
        onPointerDown={() => (pressed.current = i)}
        onClick={() => {
          const at = pressed.current ?? i;
          pressed.current = null;
          if (btn.current) onOpen(at, btn.current);
        }}
      >
        <span className="dr-hub__frame">
          {prev !== null && prev !== i && <img key={`p${prev}`} className="dr-hub__img" src={photoSrc(photos[prev].slug, 'sm')} alt="" />}
          <img
            key={i}
            className={`dr-hub__img ${prev !== null ? 'is-new' : ''}`}
            src={photoSrc(ph.slug, 'sm')}
            alt={ph.alt}
            onAnimationEnd={() => setPrev(null)}
          />
        </span>
        <span className="dr-hub__caption" style={{ fontSize: Math.max(10, 0.042 * layout.Ro) }}>
          {ph.date}
          {ph.place ? ` · ${ph.place}` : ''}
        </span>
        <span className="visually-hidden"> — open frame {pad2(i + 1)}</span>
      </button>
      <span key={i} className="dr-hub__chips" aria-hidden="true">
        {ph.palette.map((hex, k) => {
          const a = ((k - (n - 1) / 2) * 24 * Math.PI) / 180;
          return (
            <span
              key={hex + k}
              className={`dr-hub__chip ${hexToOklch(hex).L > 0.62 ? 'is-light' : ''}`}
              style={
                {
                  width: chip,
                  height: chip,
                  left: Math.sin(a) * ringR - chip / 2,
                  top: -Math.cos(a) * ringR - chip / 2,
                  background: hex,
                  '--d': `${k * 35}ms`,
                } as CSSProperties
              }
            />
          );
        })}
      </span>
    </div>
  );
}

/* ── the words beside (desktop) or below (phones) ─────────── */

export function WheelText({ layout }: { layout: WheelLayout }) {
  const t = layout.text;
  return (
    <div className={`dr-wheel__text ${layout.compact ? 'is-compact' : ''}`} style={{ left: t.x, top: t.y, width: t.w }}>
      <p className="dr-wheel__lede">
        Every frame placed by its colour — the vivid ones around the outside in hue order, grey and night on the inner ring. Spin it.
      </p>
      <p className="dr-wheel__note">
        <span className="dr-wheel__how dr-wheel__how--mouse">Drag the rings · ← → turns one frame</span>
        <span className="dr-wheel__how dr-wheel__how--touch">Swipe sideways to spin · tap a frame</span>
      </p>
    </div>
  );
}
