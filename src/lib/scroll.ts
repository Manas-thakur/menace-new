import Lenis from 'lenis';
import { gsap, ScrollTrigger } from './gsap';
import { prefersReducedMotion } from './motion';

let lenis: Lenis | null = null;

export function startSmoothScroll(): () => void {
  if (prefersReducedMotion()) return () => {};
  lenis = new Lenis({ lerp: 0.11, wheelMultiplier: 0.95, smoothWheel: true });
  lenis.on('scroll', ScrollTrigger.update);
  const tick = (time: number) => lenis?.raf(time * 1000);
  gsap.ticker.add(tick);
  gsap.ticker.lagSmoothing(0);
  return () => {
    gsap.ticker.remove(tick);
    lenis?.destroy();
    lenis = null;
  };
}

/**
 * Sticky drawers report their *stuck* position from getBoundingClientRect/offsetTop
 * once pinned, so the document position is rebuilt from the flow instead:
 * the parent's natural top plus the heights of every earlier sibling.
 */
export function naturalTop(el: HTMLElement): number {
  let top = 0;
  let node: HTMLElement | null = el;
  while (node && node !== document.body) {
    const parent: HTMLElement | null = node.parentElement;
    if (!parent) break;
    for (const sib of Array.from(parent.children) as HTMLElement[]) {
      if (sib === node) break;
      const pos = getComputedStyle(sib).position;
      if (pos !== 'absolute' && pos !== 'fixed') top += sib.offsetHeight;
    }
    node = parent;
  }
  return top;
}

/* Who is holding the page still: the menu, the liner notes, the photo viewer. Each
 * lets go only of its own hold, so closing one never frees the page under another. */
const holds = new Set<string>();

/** Freeze page scroll for `owner` (overlays). Works with or without Lenis. */
export function lockScroll(lock: boolean, owner = 'page') {
  if (lock) holds.add(owner);
  else holds.delete(owner);
  const locked = holds.size > 0;
  if (lenis) {
    if (locked) lenis.stop();
    else lenis.start();
  }
  document.documentElement.style.overflow = locked ? 'hidden' : '';
}

export function scrollToSection(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  const y = id === 'top' ? 0 : naturalTop(el);
  if (lenis) {
    lenis.scrollTo(y, { duration: 1.4, easing: (t) => 1 - Math.pow(1 - t, 4) });
  } else {
    window.scrollTo({ top: y, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
  }
  // Move focus for keyboard and screen-reader users without a second scroll jump.
  el.setAttribute('tabindex', '-1');
  el.focus({ preventScroll: true });
}

/**
 * Keyboard focus in a stack of sticky drawers: the browser scrolls a focused control
 * "into view", but by then the next drawer may already be lying over it (or the bar
 * over its top). Move the page to where the control's own drawer is fully showing.
 * Clicks are left alone: whatever was clicked was already in sight.
 */
export function keepFocusVisible(): () => void {
  let pointer = false;
  const onPointer = () => (pointer = true);
  const onKey = () => (pointer = false);
  const onFocus = (e: FocusEvent) => {
    if (pointer) return;
    const el = e.target as HTMLElement;
    const drawer = el.closest<HTMLElement>('.drawer');
    if (!drawer || el === drawer || el.closest('dialog')) return;
    requestAnimationFrame(() => {
      if (document.activeElement !== el) return;
      const r = el.getBoundingClientRect();
      const x = Math.min(Math.max(r.left + r.width / 2, 1), innerWidth - 1);
      const y = Math.min(Math.max(r.top + Math.min(r.height / 2, 24), 1), innerHeight - 1);
      const top = document.elementFromPoint(x, y);
      const offscreen = r.bottom < 0 || r.top > innerHeight;
      const covered = !!top && !drawer.contains(top) && !top.contains(el);
      if (!offscreen && !covered) return;
      // the drawer moves with the page until its bottom meets the screen's; past that, the next one covers it
      const start = naturalTop(drawer);
      const span = Math.max(0, drawer.offsetHeight - innerHeight);
      const within = r.top - drawer.getBoundingClientRect().top;
      const target = Math.min(Math.max(start + within - Math.max(0, (innerHeight - r.height) / 2), start), start + span);
      if (lenis) lenis.scrollTo(target, { duration: 0.55, easing: (t) => 1 - Math.pow(1 - t, 3), force: true });
      else window.scrollTo({ top: target, behavior: 'auto' });
    });
  };
  window.addEventListener('pointerdown', onPointer, true);
  window.addEventListener('keydown', onKey, true);
  document.addEventListener('focusin', onFocus);
  return () => {
    window.removeEventListener('pointerdown', onPointer, true);
    window.removeEventListener('keydown', onKey, true);
    document.removeEventListener('focusin', onFocus);
  };
}
