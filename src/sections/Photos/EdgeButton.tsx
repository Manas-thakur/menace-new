import type { SheetLayout } from './geometry';
import { edgeCentre, type EdgePrint } from './edgePrint';

type EdgeButtonProps = {
  layout: SheetLayout;
  edge: EdgePrint;
  hidden: boolean;
  /** Bring the loupe to rest on the edge printing. */
  onReach: () => void;
};

/**
 * The edge printing, reachable without steering the loupe by hand: focus it, or tap
 * the rebate, and the lens comes to rest over the words. It covers the strip's top
 * rebate around the line and sits under the frames, so it never takes their clicks.
 */
export function EdgeButton({ layout, edge, hidden, onReach }: EdgeButtonProps) {
  const c = edgeCentre(layout, edge);
  const w = edge.w + 0.2 * layout.f;
  const h = 0.27 * layout.f;
  return (
    <button
      type="button"
      className="dr-edge-btn"
      tabIndex={hidden ? -1 : 0}
      aria-hidden={hidden || undefined}
      style={{ left: c.x - w / 2, top: c.y - h / 2, width: w, height: h, transform: `rotate(${c.rot.toFixed(3)}deg)` }}
      onFocus={onReach}
      onClick={onReach}
    >
      <span className="visually-hidden">Edge printing on the film — read it under the loupe</span>
    </button>
  );
}
