import { useSyncExternalStore } from 'react';

const query = '(prefers-reduced-motion: reduce)';

export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia(query).matches;
}

function subscribe(cb: () => void) {
  const mq = window.matchMedia(query);
  mq.addEventListener('change', cb);
  return () => mq.removeEventListener('change', cb);
}

export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, prefersReducedMotion, () => false);
}

/** URL flags used for isolated previews and screenshots: ?only=<id>, ?nointro */
export const flags = (() => {
  const p = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams();
  return {
    only: p.get('only'),
    noIntro: p.has('nointro') || p.has('only'),
  };
})();
