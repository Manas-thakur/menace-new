import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react';

type DrawerProps = {
  id: string;
  /** Stack order; later drawers slide over earlier ones. */
  index: number;
  /** Accessible name of the region. */
  label: string;
  className?: string;
  /** Tall drawers scroll through fully, then pin by their bottom edge. */
  children: ReactNode;
  style?: CSSProperties;
};

/**
 * A full-bleed sticky panel. Each drawer pins to the viewport and the next one
 * slides over it with a heavy upward shadow (studied from rendezvous-iitd.org).
 * Drawers taller than the viewport pin by their bottom edge so nothing is cut off.
 * `data-offscreen` pauses every `.loop` animation inside while it is not visible.
 */
export function Drawer({ id, index, label, className = '', children, style }: DrawerProps) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const ro = new ResizeObserver(([entry]) => {
      el.style.setProperty('--drawer-h', `${Math.ceil(entry.borderBoxSize?.[0]?.blockSize ?? el.offsetHeight)}px`);
    });
    ro.observe(el);

    // A pinned drawer that is fully covered still "intersects"; the stack
    // controller in App marks those as covered via data-covered.
    const io = new IntersectionObserver(
      ([entry]) => {
        el.dataset.offscreen = String(!entry.isIntersecting);
      },
      { rootMargin: '10% 0px' }
    );
    io.observe(el);

    return () => {
      ro.disconnect();
      io.disconnect();
    };
  }, []);

  return (
    <section
      ref={ref}
      id={id}
      aria-label={label}
      data-drawer={index}
      data-offscreen="true"
      className={`drawer ${className}`}
      style={{ ...style, ['--i' as string]: index }}
    >
      <div className="drawer__inner">{children}</div>
      <div className="drawer__shade" aria-hidden="true" />
    </section>
  );
}
