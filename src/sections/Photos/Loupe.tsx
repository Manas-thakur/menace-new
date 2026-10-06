import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { gsap } from '../../lib/gsap';
import { photos } from '../../data/photos';
import { frameAt, type SheetLayout } from './geometry';
import { GreasePencil, LightTable, Positives, Strips } from './SheetDecor';
import { pad2 } from './Prints';

export type LoupeApi = {
  /** Glide (or jump) the lens centre to a point on the sheet, in stage pixels. */
  moveTo: (x: number, y: number, immediate?: boolean) => void;
  /** Index of the frame under the lens centre, or -1. */
  frame: () => number;
};

type LoupeProps = {
  layout: SheetLayout;
  diameter: number;
  magnify: number;
  reduced: boolean;
  on: boolean;
  /** Render the positive clone (once the sheet has been opened). */
  ready: boolean;
  /** A tap on the lens (no drag) opens the frame under it. */
  onTap: (i: number) => void;
};

/**
 * A photographer's loupe on the light table. Inside the glass is a positive clone of
 * the whole sheet, scaled about the lens centre and clipped to the circle, so what
 * you see is exactly the frame underneath — printed the right way round.
 */
export const Loupe = forwardRef<LoupeApi, LoupeProps>(function Loupe({ layout, diameter, magnify, reduced, on, ready, onTap }, ref) {
  const lensRef = useRef<HTMLDivElement>(null);
  const cloneRef = useRef<HTMLDivElement>(null);
  const chipRef = useRef<HTMLSpanElement>(null);
  const pos = useRef({ x: layout.targets[0].cx, y: layout.targets[0].cy });
  const under = useRef(-1);
  const chipHalf = useRef(0);
  /** Springs toward a goal; passing the goal as the start too makes them jump. Never killed. */
  const movers = useRef<{ x: gsap.QuickToFunc; y: gsap.QuickToFunc } | null>(null);
  const r = diameter / 2;

  const render = () => {
    const { x, y } = pos.current;
    if (lensRef.current) lensRef.current.style.transform = `translate(${(x - r).toFixed(2)}px, ${(y - r).toFixed(2)}px)`;
    if (cloneRef.current)
      cloneRef.current.style.transform = `translate(${(r - magnify * x).toFixed(2)}px, ${(r - magnify * y).toFixed(2)}px) scale(${magnify})`;
    const i = frameAt(layout, x, y);
    const chip = chipRef.current;
    if (i !== under.current && chip) {
      under.current = i;
      chip.textContent = i >= 0 ? `Frame ${pad2(i + 1)} · ${photos[i].date}` : 'Film base';
      chipHalf.current = chip.offsetWidth / 2;
    }
    // keep the chip on screen when the lens hangs over the table's edge
    if (chip) {
      const h = chipHalf.current;
      const dx = Math.max(6 - (x - h), 0) + Math.min(layout.width - 6 - (x + h), 0);
      chip.style.translate = `calc(-50% + ${dx.toFixed(1)}px) 0`;
    }
  };
  const renderRef = useRef(render);
  renderRef.current = render;

  useEffect(() => {
    const proxy = pos.current;
    const opts = { duration: reduced ? 0.001 : 0.42, ease: 'power3', onUpdate: () => renderRef.current() };
    movers.current = { x: gsap.quickTo(proxy, 'x', opts), y: gsap.quickTo(proxy, 'y', opts) };
    renderRef.current();
    return () => {
      gsap.killTweensOf(proxy);
      movers.current = null;
    };
  }, [reduced]);

  // keep the lens on the table when the layout changes
  useEffect(() => {
    const { table } = layout;
    const p = pos.current;
    p.x = Math.min(Math.max(p.x, table.x), table.x + table.w);
    p.y = Math.min(Math.max(p.y, table.y), table.y + table.h);
    under.current = -2;
    renderRef.current();
  }, [layout]);

  /** Clamp to the table, and never more than a quarter of the lens off the stage's edge. */
  const clampToTable = (x: number, y: number) => {
    const { table } = layout;
    return {
      x: Math.min(Math.max(x, table.x + 0.2 * r, 0.75 * r), table.x + table.w - 0.2 * r, layout.width - 0.75 * r),
      y: Math.min(Math.max(y, table.y + 0.2 * r), table.y + table.h - 0.2 * r),
    };
  };
  const jump = (x: number, y: number) => {
    pos.current.x = x;
    pos.current.y = y;
    if (movers.current) {
      movers.current.x(x, x);
      movers.current.y(y, y);
    }
    renderRef.current();
  };

  useImperativeHandle(
    ref,
    () => ({
      moveTo: (x, y, immediate) => {
        const t = clampToTable(x, y);
        if (immediate || reduced || !movers.current) return jump(t.x, t.y);
        movers.current.x(t.x);
        movers.current.y(t.y);
      },
      frame: () => under.current,
    }),
    // the handle closes over the layout; rebuilt whenever it changes
    [layout, r, reduced]
  );

  // touch: drag the lens; a tap without a drag opens the frame under it
  const drag = useRef<{ id: number; sx: number; sy: number; ox: number; oy: number; moved: boolean } | null>(null);
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse') return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { id: e.pointerId, sx: e.clientX, sy: e.clientY, ox: pos.current.x, oy: pos.current.y, moved: false };
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    const dx = e.clientX - d.sx;
    const dy = e.clientY - d.sy;
    if (!d.moved && Math.hypot(dx, dy) > 7) d.moved = true;
    if (d.moved) {
      const t = clampToTable(d.ox + dx, d.oy + dy);
      jump(t.x, t.y);
    }
  };
  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    drag.current = null;
    if (!d.moved && under.current >= 0) onTap(under.current);
  };

  return (
    <div
      ref={lensRef}
      className={`dr-loupe ${on ? 'is-on' : ''}`}
      style={{ width: diameter, height: diameter }}
      aria-hidden="true"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={() => (drag.current = null)}
    >
      <span className="dr-loupe__shadow" />
      <span className="dr-loupe__glass">
        <span ref={cloneRef} className="dr-loupe__clone" style={{ width: layout.width, height: layout.height }}>
          <LightTable rect={layout.table} />
          <Strips layout={layout} />
          {ready && <Positives layout={layout} />}
          <GreasePencil layout={layout} />
        </span>
        <span className="dr-loupe__glare" />
      </span>
      <span className="dr-loupe__rim" />
      <span ref={chipRef} className="dr-loupe__chip">
        Frame 01
      </span>
    </div>
  );
});
