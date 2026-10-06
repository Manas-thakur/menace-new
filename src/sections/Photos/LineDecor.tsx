import type { LineLayout, Rect } from './geometry';

type LineString = LineLayout['strings'][number];

/** The string's path for a given extra sag (the physics spring adds `offset`). */
export function stringPath(s: LineString, width: number, offset = 0) {
  const d = s.sag + offset;
  if (!s.pegs) return `M0 ${s.y.toFixed(1)}Q${(width / 2).toFixed(1)} ${(s.y + 2 * d).toFixed(1)} ${width.toFixed(1)} ${s.y.toFixed(1)}`;
  // a garland: the string rises to each peg and dips between them
  const xs = [0, ...s.pegs, width];
  let path = `M0 ${(s.y - d).toFixed(1)}`;
  for (let k = 1; k < xs.length; k++) {
    const a = xs[k - 1];
    const b = xs[k];
    const y = k === xs.length - 1 ? s.y - d : s.y;
    path += `Q${((a + b) / 2).toFixed(1)} ${(s.y + 2 * d).toFixed(1)} ${b.toFixed(1)} ${y.toFixed(1)}`;
  }
  return path;
}

type StringsProps = {
  layout: LineLayout;
  setPath: (line: number, el: SVGPathElement | null) => void;
};

export function Strings({ layout, setPath }: StringsProps) {
  return (
    <svg className="dr-strings" width={layout.width} height={layout.height} aria-hidden="true" focusable="false">
      {layout.strings.map((s, l) => (
        <path key={l} ref={(el) => setPath(l, el)} className="dr-strings__line" d={stringPath(s, layout.width)} />
      ))}
    </svg>
  );
}

/** A developing tray seen from above: plastic rim, a shallow bath with the safelight in it. */
export function TrayDish({ rect }: { rect: Rect }) {
  return (
    <div className="dr-tray" style={{ left: rect.x, top: rect.y, width: rect.w, height: rect.h }} aria-hidden="true">
      <div className="dr-tray__bath">
        <div className="dr-tray__sheen loop" />
      </div>
    </div>
  );
}

type TrayButtonProps = { rect: Rect; count: number; onOpen: () => void; hidden: boolean };

/** Sits over the pile: the whole tray is one button to the contact sheet. */
export function TrayButton({ rect, count, onOpen, hidden }: TrayButtonProps) {
  return (
    <button
      type="button"
      className="dr-tray__btn"
      style={{ left: rect.x, top: rect.y, width: rect.w, height: rect.h }}
      onClick={onOpen}
      tabIndex={hidden ? -1 : 0}
      aria-hidden={hidden || undefined}
    >
      <span className="dr-tray__tag">
        <span className="dr-tray__count">{count} more in the tray</span>
        <span className="dr-tray__cta">
          Contact sheet <span aria-hidden="true">→</span>
        </span>
      </span>
    </button>
  );
}

/** Scroll-snap points for pulling the line sideways on phones. */
export function SnapPoints({ xs }: { xs: number[] }) {
  return (
    <>
      {xs.map((x) => (
        <span key={x} className="dr-snap" style={{ left: x }} aria-hidden="true" />
      ))}
    </>
  );
}
