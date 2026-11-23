/* Small helpers shared by everything: maths, colour, motion preference, hashing. */

export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, k) => a + (b - a) * k;
export const rnd = (a, b) => a + Math.random() * (b - a);
export const pick = a => a[(Math.random() * a.length) | 0];
export const TAU = Math.PI * 2;
export const now = () => performance.now() / 1000;

export const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';
const motionMQ = isBrowser && window.matchMedia ? matchMedia('(prefers-reduced-motion: reduce)') : null;
export const reducedMotion = () => !!(motionMQ && motionMQ.matches);

/* ---------- colour: everything is derived from one brand colour ---------- */
export function rgb(c) {
  let h = String(c || '').trim();
  const m = /^rgba?\(([^)]+)\)/.exec(h);
  if (m) return m[1].split(',').slice(0, 3).map(v => parseFloat(v));
  h = h.replace('#', '');
  if (h.length === 3) h = [...h].map(x => x + x).join('');
  const n = parseInt(h.slice(0, 6), 16);
  return h.length < 6 || isNaN(n) ? [255, 190, 200] : [n >> 16 & 255, n >> 8 & 255, n & 255];
}
export const css = ([r, g, b], a = 1) => a < 1 ? `rgba(${r | 0},${g | 0},${b | 0},${a})` : `rgb(${r | 0},${g | 0},${b | 0})`;
export const mix = (a, b, k) => { const x = rgb(a), y = rgb(b); return css(x.map((v, i) => v + (y[i] - v) * k)); };
export const luma = c => { const [r, g, b] = rgb(c); return (0.299 * r + 0.587 * g + 0.114 * b) / 255; };

/* a soft, lit palette from one colour: highlight, base, edge, shade, plus the darker ink for faces */
export function palette(color) {
  const base = css(rgb(color));
  return {
    base,
    light: mix(base, '#ffffff', 0.62),
    edge: mix(base, '#3a1f2a', 0.22),
    shade: mix(base, '#2a1630', 0.34),
    deep: mix(base, '#1d1020', 0.5),
    belly: mix(base, '#fffaf2', 0.7),
    inner: mix(base, '#ff9fb4', 0.55),
    ink: '#2b2033',
    cheek: '#ff7f97'
  };
}

/* deterministic numbers from a string, for avatars and seeds */
export function hash(str) {
  let h = 2166136261 >>> 0;
  for (const ch of String(str)) { h ^= ch.codePointAt(0); h = Math.imul(h, 16777619) >>> 0; }
  return () => { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return ((h >>> 0) % 100000) / 100000; };
}

/* inject a stylesheet once per document (light DOM pieces: layer, bubbles, toasts) */
const injected = new Set();
export function style(id, cssText) {
  if (!isBrowser || injected.has(id)) return;
  injected.add(id);
  const s = document.createElement('style');
  s.dataset.squish = id;
  s.textContent = cssText;
  document.head.appendChild(s);
}

export const attrNum = (el, name, d) => { const v = parseFloat(el.getAttribute(name)); return Number.isFinite(v) ? v : d; };
