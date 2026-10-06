import {
  useEffect,
  useRef,
  useState,
  type FocusEvent as ReactFocusEvent,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from 'react';

/**
 * Hover-intent / focus / tap reveal, the same contract as the other deep cuts:
 * a mouse rests ~½ s on the trigger, keyboard focus opens at once, a tap or click
 * toggles (and pins), Escape or a press elsewhere closes, and leaving lets the
 * reveal linger a moment so the pointer can travel onto the revealed panel.
 */
export function useHoverReveal(rootRef: RefObject<HTMLElement | null>, { intent = 500, linger = 700 } = {}) {
  const [open, setOpen] = useState(false);
  const pinned = useRef(false);
  const hovering = useRef({ trigger: false, panel: false });
  const focused = useRef(false);
  const lastPointer = useRef('mouse');
  const timers = useRef<{ intent?: number; linger?: number }>({});

  const clear = (key: 'intent' | 'linger') => {
    window.clearTimeout(timers.current[key]);
    timers.current[key] = undefined;
  };

  /** Close once nothing (hover, focus, a pin) is holding it open. */
  const settle = () => {
    clear('linger');
    timers.current.linger = window.setTimeout(() => {
      const held = pinned.current || hovering.current.trigger || hovering.current.panel || focused.current;
      if (!held) setOpen(false);
    }, linger);
  };

  const close = () => {
    clear('intent');
    clear('linger');
    pinned.current = false;
    setOpen(false);
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    const onDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) close();
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(
    () => () => {
      window.clearTimeout(timers.current.intent);
      window.clearTimeout(timers.current.linger);
    },
    []
  );

  const trigger = {
    onPointerDown: (e: ReactPointerEvent) => {
      lastPointer.current = e.pointerType;
    },
    // Entering only marks the hover; the half-second rest starts on a real movement
    // (motionless pointer events are filtered site-wide), so the auto never opens
    // because the page scrolled it under a resting cursor.
    onPointerEnter: (e: ReactPointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      hovering.current.trigger = true;
      clear('linger');
    },
    onPointerMove: (e: ReactPointerEvent) => {
      if (e.pointerType !== 'mouse' || open || timers.current.intent !== undefined) return;
      hovering.current.trigger = true;
      clear('linger');
      timers.current.intent = window.setTimeout(() => {
        timers.current.intent = undefined;
        setOpen(true);
      }, intent);
    },
    onPointerLeave: (e: ReactPointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      hovering.current.trigger = false;
      clear('intent');
      settle();
    },
    // Keyboard focus opens it; focus that comes from a press is handled by the click.
    onFocus: (e: ReactFocusEvent<HTMLElement>) => {
      if (!e.currentTarget.matches(':focus-visible')) return;
      focused.current = true;
      clear('linger');
      setOpen(true);
    },
    onBlur: () => {
      focused.current = false;
      settle();
    },
    onClick: (e: ReactMouseEvent) => {
      clear('intent');
      const fromKeyboard = e.detail === 0;
      // A hover already opened it: a mouse click keeps it open instead of closing it.
      if (!fromKeyboard && lastPointer.current === 'mouse' && open && !pinned.current) {
        pinned.current = true;
        return;
      }
      pinned.current = !open;
      setOpen(!open);
    },
  };

  const panel = {
    onPointerEnter: (e: ReactPointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      hovering.current.panel = true;
      clear('linger');
    },
    onPointerLeave: (e: ReactPointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      hovering.current.panel = false;
      settle();
    },
  };

  return { open, close, trigger, panel };
}
