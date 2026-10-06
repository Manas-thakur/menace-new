/**
 * A hand on the mouse, not a page moving under it.
 *
 * When content moves beneath a cursor that isn't moving — the page loads, smooth
 * scrolling glides a drawer in, an animation slides something under it — browsers
 * send pointer events with zero movement so hover state stays in sync. Several
 * things on this site act on a lingering pointer (the deep-cut reveals, the loupe),
 * and those must answer a visitor's hand, not the scroll.
 *
 * So motionless move events are stopped before any component sees them, and every
 * linger-to-reveal on the site arms on a move, never on "entered". Enter and leave
 * events are left alone on purpose: React derives both from the same native event,
 * and leaves must still arrive so hover states clear when content moves away.
 * CSS :hover, touch, pen and keyboard are unaffected; browsers that don't report
 * movement send `undefined`, which passes through.
 */
const MOTION_TYPES = ['pointermove', 'mousemove'] as const;

function stillMouse(e: Event) {
  const p = e as PointerEvent;
  if (p.pointerType && p.pointerType !== 'mouse') return;
  if (p.movementX === 0 && p.movementY === 0 && p.buttons === 0) e.stopImmediatePropagation();
}

export function ignoreStillPointers() {
  for (const type of MOTION_TYPES) window.addEventListener(type, stillMouse, { capture: true });
}
