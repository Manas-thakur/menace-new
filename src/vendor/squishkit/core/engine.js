/* The engine: one animation loop for every character on the page (it measures first, then
 * draws, so layout is never thrashed, and it sleeps when nothing needs it), one shared pointer,
 * one overlay layer for pals that live on the page, and a tiny event bus so pals notice each other. */
import { isBrowser, reducedMotion, now, style } from './util.js';

/* ---------- loop ---------- */
const actors = new Set();
let raf = 0, last = 0;
function frame(ts) {
  const t = ts / 1000, dt = Math.min(0.05, last ? t - last : 1 / 60);
  last = t;
  scroll.v = scroll.v * 0.75 + (scrollY - scroll.y) / Math.max(dt, 0.001) * 0.25;
  scroll.y = scrollY;
  if (layerEl) { const r = layerEl.getBoundingClientRect(); origin.x = r.left + scrollX; origin.y = r.top + scrollY; }
  const list = [...actors];
  for (const a of list) a.measure && a.measure();
  for (const a of list) a.update(dt, t);
  raf = actors.size ? requestAnimationFrame(frame) : (last = 0, 0);
}
export function addActor(a) { actors.add(a); if (!raf && isBrowser) raf = requestAnimationFrame(frame); }
export function removeActor(a) { actors.delete(a); }

/* ---------- pointer (client coords, velocity in px/s) ---------- */
export const pointer = { x: -1e5, y: -1e5, vx: 0, vy: 0, seen: false, moved: 0, down: false };
if (isBrowser) {
  addEventListener('pointermove', e => {
    const t = now(), dt = Math.max(0.008, t - (pointer.moved || t));
    if (pointer.seen) { pointer.vx = pointer.vx * 0.6 + (e.clientX - pointer.x) / dt * 0.4; pointer.vy = pointer.vy * 0.6 + (e.clientY - pointer.y) / dt * 0.4; }
    pointer.x = e.clientX; pointer.y = e.clientY; pointer.seen = true; pointer.moved = t;
  }, { passive: true });
  addEventListener('pointerdown', () => { pointer.down = true; }, { passive: true });
  addEventListener('pointerup', () => { pointer.down = false; }, { passive: true });
  document.addEventListener('pointerleave', () => { pointer.x = pointer.y = -1e5; }, { passive: true });
}

/* ---------- scroll velocity (updated by the loop) ---------- */
export const scroll = { y: isBrowser ? scrollY : 0, v: 0 };

/* ---------- the overlay layer, positioned in document coordinates ---------- */
let layerEl = null;
export function layer() {
  if (layerEl || !isBrowser) return layerEl;
  style('layer', `
    .squish-layer { position: absolute; left: 0; top: 0; width: 0; height: 0; z-index: var(--squish-z, 2147483000); pointer-events: none; }
    .squish-layer canvas, .squish-layer img { position: absolute; left: 0; top: 0; pointer-events: none; will-change: transform; }
    .squish-hit { position: absolute; left: 0; top: 0; border-radius: 50%; pointer-events: auto; cursor: grab; touch-action: none; -webkit-tap-highlight-color: transparent; }
    .squish-hit:active { cursor: grabbing; }
    .squish-hit:focus-visible { outline: 2px dashed var(--squish-focus, #ff7f97); outline-offset: 3px; }
    squish-pal { display: none; }
    .squish-thread { position: absolute; left: 0; top: 0; width: 1.5px; margin-left: -0.75px; background: var(--squish-thread, rgba(70,50,80,.45)); transform-origin: 50% 0; pointer-events: none; }
    /* pixel frame: stepped corners drawn with hard box-shadows (set --squish-frame / --squish-bubble to theme) */
    .squish-pixel { --pf: var(--squish-frame, #2b2033); --pb: var(--squish-bubble, #fff); border-radius: 0; box-shadow: 0 -3px 0 0 var(--pb), 0 3px 0 0 var(--pb), -3px 0 0 0 var(--pb), 3px 0 0 0 var(--pb), 0 -6px 0 0 var(--pf), 0 6px 0 0 var(--pf), -6px 0 0 0 var(--pf), 6px 0 0 0 var(--pf), -3px -3px 0 0 var(--pf), 3px -3px 0 0 var(--pf), -3px 3px 0 0 var(--pf), 3px 3px 0 0 var(--pf), 0 9px 0 0 rgba(43,32,51,.18); }
    .squish-bubble { position: absolute; left: 0; top: 0; max-width: 220px; width: max-content; padding: 6px 10px; margin-top: -6px;
      background: var(--squish-bubble, #fff); color: var(--squish-bubble-ink, #2b2033); font: 600 13px/1.3 var(--squish-font, ui-rounded, "SF Pro Rounded", system-ui, sans-serif);
      pointer-events: none; transform-origin: 50% 100%; --pf: var(--squish-frame, #2b2033); --pb: var(--squish-bubble, #fff); border-radius: 0; box-shadow: 0 -3px 0 0 var(--pb), 0 3px 0 0 var(--pb), -3px 0 0 0 var(--pb), 3px 0 0 0 var(--pb), 0 -6px 0 0 var(--pf), 0 6px 0 0 var(--pf), -6px 0 0 0 var(--pf), 6px 0 0 0 var(--pf), -3px -3px 0 0 var(--pf), 3px -3px 0 0 var(--pf), -3px 3px 0 0 var(--pf), 3px 3px 0 0 var(--pf), 0 9px 0 0 rgba(43,32,51,.18); }
    .squish-bubble::after { content: ""; position: absolute; left: var(--tail, 50%); bottom: -12px; width: 9px; height: 6px; margin-left: -4px; background: var(--squish-frame, #2b2033);
      clip-path: polygon(0 0, 100% 0, 100% 33%, 66% 33%, 66% 66%, 33% 66%, 33% 100%, 0 100%); }
    .squish-bubble.in { animation: squish-pop .3s steps(4); }
    @keyframes squish-pop { from { opacity: 0; scale: .6; } to { opacity: 1; scale: 1; } }
    @media (prefers-reduced-motion: reduce) { .squish-bubble.in { animation: none; } }
  `);
  layerEl = document.createElement('div');
  layerEl.className = 'squish-layer';
  layerEl.setAttribute('aria-hidden', 'true');
  document.body.appendChild(layerEl);
  return layerEl;
}
/* where the layer's (0,0) is in document coordinates (non-zero when <body> is positioned);
 * measured once per frame, before any actor measures */
export const origin = { x: 0, y: 0 };

/* ---------- bus: pals react to each other ---------- */
const listeners = new Set();
export const bus = {
  on(fn) { listeners.add(fn); return () => listeners.delete(fn); },
  emit(ev) { for (const fn of listeners) fn(ev); if (isBrowser) dispatchEvent(new CustomEvent('squish:bus', { detail: ev })); }
};

export const motion = { get reduced() { return reducedMotion(); } };
