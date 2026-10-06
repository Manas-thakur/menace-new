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

/** Freeze page scroll (menu overlays). Works with or without Lenis. */
export function lockScroll(lock: boolean) {
  if (lenis) {
    if (lock) lenis.stop();
    else lenis.start();
  }
  document.documentElement.style.overflow = lock ? 'hidden' : '';
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
