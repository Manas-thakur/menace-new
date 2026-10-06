import { ScrollTrigger } from './gsap';
import { naturalTop } from './scroll';

/**
 * Fire `cb` once, when the drawer's top edge has travelled `at` (0–1) of a
 * viewport into view. Uses natural (unpinned) positions, because sticky drawers
 * mis-measure once pinned. If the page is already past that point when this is
 * set up (reload mid-page, deep link, late mount), it fires straight away — an
 * entrance must never leave content parked in its hidden start state.
 */
export function onDrawerEnter(drawer: HTMLElement, cb: () => void, at = 0.55) {
  let fired = false;
  const fire = () => {
    if (fired) return;
    fired = true;
    cb();
  };
  const st = ScrollTrigger.create({
    start: () => naturalTop(drawer) - window.innerHeight * at,
    end: 'max',
    once: true,
    invalidateOnRefresh: true,
    onEnter: fire,
  });
  if (window.scrollY >= st.start) fire();
  return st;
}

/** The drawer <section> that contains `el`. */
export function drawerOf(el: Element | null): HTMLElement | null {
  return (el?.closest('.drawer') as HTMLElement | null) ?? null;
}
