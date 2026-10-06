import type { View } from './geometry';

const OPTIONS: { id: View; long: string; short: string }[] = [
  { id: 'line', long: 'On the line', short: 'Line' },
  { id: 'sheet', long: 'Contact sheet', short: 'Sheet' },
  { id: 'wheel', long: 'Colour wheel', short: 'Wheel' },
];

/**
 * Three ways to see the roll, on a bakelite enlarger-timer plate: engraved labels,
 * a red lamp lit above whichever is on.
 */
export function ViewSwitch({ view, onChange }: { view: View; onChange: (v: View) => void }) {
  return (
    <div className="vs" role="group" aria-label="Ways to see the roll">
      <span className="vs__screw vs__screw--l" aria-hidden="true" />
      {OPTIONS.map((o) => (
        <button key={o.id} type="button" className="vs__btn" aria-pressed={view === o.id} onClick={() => onChange(o.id)}>
          <span className="vs__lamp" aria-hidden="true" />
          <span className="vs__long">{o.long}</span>
          <span className="vs__short">{o.short}</span>
        </button>
      ))}
      <span className="vs__screw vs__screw--r" aria-hidden="true" />
    </div>
  );
}
