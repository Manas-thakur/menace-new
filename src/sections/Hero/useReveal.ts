import { useCallback, useEffect, useRef, useState, type PointerEvent } from 'react';

/**
 * Hover-intent, tap and keyboard reveal for the hero's hidden messages.
 * A mouse has to actually move onto the target and rest ~0.45 s (a cursor that is
 * merely sitting there while the page loads or scrolls doesn't count), touch toggles,
 * Escape closes, and leaving lets the message linger a moment before it goes.
 * Nothing reveals while `enabled` is false (the hero's intro is still playing).
 * `onOpen` runs every time it opens — `discover()` itself only counts the first.
 */
export function useReveal(onOpen: () => void, { delay = 450, linger = 2600, enabled = true } = {}) {
  const [open, setOpen] = useState(false);
  const enterT = useRef<number | undefined>(undefined);
  const leaveT = useRef<number | undefined>(undefined);
  const armed = useRef(false);
  const onOpenRef = useRef(onOpen);
  onOpenRef.current = onOpen;
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  const clear = () => {
    window.clearTimeout(enterT.current);
    window.clearTimeout(leaveT.current);
    armed.current = false;
  };
  const show = useCallback(() => {
    clear();
    if (enabledRef.current) setOpen(true);
  }, []);
  const hide = useCallback(() => {
    clear();
    setOpen(false);
  }, []);

  useEffect(() => {
    if (open) onOpenRef.current();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') hide();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, hide]);

  useEffect(() => clear, []);

  return {
    open,
    show,
    hide,
    toggle: () => {
      if (!enabledRef.current) return;
      if (open) hide();
      else show();
    },
    pointer: {
      onPointerMove: (e: PointerEvent) => {
        if (e.pointerType === 'touch' || !enabledRef.current) return;
        window.clearTimeout(leaveT.current);
        if (open || armed.current) return;
        // Browsers send motionless pointer events when content moves under a resting
        // cursor (load, scroll, animation). Only a hand on the mouse is intent.
        // (Browsers that don't report movement send undefined, which still counts.)
        if (e.movementX === 0 && e.movementY === 0) return;
        armed.current = true;
        enterT.current = window.setTimeout(show, delay);
      },
      onPointerLeave: (e: PointerEvent) => {
        if (e.pointerType === 'touch') return;
        window.clearTimeout(enterT.current);
        armed.current = false;
        if (open) leaveT.current = window.setTimeout(hide, linger);
      },
    },
  };
}
