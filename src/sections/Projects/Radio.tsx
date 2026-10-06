import type { KeyboardEvent, RefObject } from 'react';
import type { Station } from '../../data/profile';

/* An original line-art tabletop radio. Geometry lives in a 640 × 448 viewBox
 * (the strip below the feet holds the hand-drawn "spin the dial" note); the
 * tuning knob and station marks are HTML overlays positioned in the same
 * coordinate space (percentages), so the slider is a real focusable element. */

export const VB_W = 640;
export const VB_H = 448;
export const FMIN = 88;
export const FMAX = 108;
const SX0 = 96;
const SX1 = 544;
export const scaleX = (f: number) => SX0 + ((f - FMIN) / (FMAX - FMIN)) * (SX1 - SX0);

const KNOB = { cx: 540, cy: 300, r: 46 };
const DIAL = { x: 64, y: 132, w: 512, h: 92 };
/* hit area for the end of the band: right of the last station's mark to the bevel */
const END_HIT = { x: 549, w: 40 };

const pct = (v: number, of: number) => `${((v / of) * 100).toFixed(3)}%`;

const ticks = (() => {
  const out: { x: number; len: number; label?: string }[] = [];
  for (let i = 0; i <= (FMAX - FMIN) * 2; i++) {
    const f = FMIN + i / 2;
    const major = f % 2 === 0;
    const mid = !major && Number.isInteger(f);
    out.push({ x: scaleX(f), len: major ? 20 : mid ? 13 : 7, label: major ? String(f) : undefined });
  }
  return out;
})();

const grip = Array.from({ length: 36 }, (_, i) => {
  const a = (i / 36) * Math.PI * 2;
  return `M${(50 + Math.cos(a) * 41).toFixed(2)} ${(50 + Math.sin(a) * 41).toFixed(2)}L${(50 + Math.cos(a) * 47).toFixed(2)} ${(50 + Math.sin(a) * 47).toFixed(2)}`;
}).join('');

type RadioProps = {
  stations: Station[];
  current: number;
  valueNow: number;
  valueText: string;
  knobRef: RefObject<HTMLDivElement | null>;
  needleRef: RefObject<SVGGElement | null>;
  grilleRef: RefObject<SVGGElement | null>;
  readoutRef: RefObject<SVGTextElement | null>;
  /** Locked on a station: lamp glows, EQ dances. */
  live: boolean;
  /** Locked on the hidden end-of-band station: gold lamp, EQ silent. */
  quiet: boolean;
  onMark: (i: number) => void;
  /** Clicking the very end of the scale. */
  onEnd: () => void;
  onKnobKey: (e: KeyboardEvent<HTMLDivElement>) => void;
};

export function Radio({ stations, current, valueNow, valueText, knobRef, needleRef, grilleRef, readoutRef, live, quiet, onMark, onEnd, onKnobKey }: RadioProps) {
  return (
    <div className={`radio ${live ? 'is-live' : ''} ${quiet ? 'is-quiet' : ''}`}>
      <svg className="radio__svg" viewBox={`0 0 ${VB_W} ${VB_H}`} aria-hidden="true">
        {/* antenna + handle */}
        <path className="radio__line draw" pathLength={1} d="M552 98 584 38" strokeWidth="3.5" />
        <path className="radio__line draw" pathLength={1} d="M584 38 606 8" strokeWidth="2.2" />
        <circle className="radio__line draw" pathLength={1} cx="606" cy="8" r="4.5" />
        <path className="radio__line draw" pathLength={1} d="M214 96V74Q214 52 236 52H404Q426 52 426 74V96" />
        <path className="radio__line radio__line--thin draw" pathLength={1} d="M228 96V80Q228 66 242 66H398Q412 66 412 80V96" />

        {/* body */}
        <rect className="radio__line radio__body draw" pathLength={1} x="24" y="96" width="592" height="296" rx="44" />
        <rect className="radio__line radio__line--thin draw" pathLength={1} x="40" y="112" width="560" height="264" rx="32" />
        <rect className="radio__line draw" pathLength={1} x="92" y="392" width="56" height="14" rx="5" />
        <rect className="radio__line draw" pathLength={1} x="492" y="392" width="56" height="14" rx="5" />
        <text className="radio__brand" x="320" y="127" textAnchor="middle">
          TENSORMAN · FM · STEREO
        </text>

        {/* dial window */}
        <rect className="radio__line radio__window draw" pathLength={1} x={DIAL.x} y={DIAL.y} width={DIAL.w} height={DIAL.h} rx="14" />
        <g className="radio__scale">
          <path className="radio__line radio__line--thin" d={`M${SX0} 192H${SX1}`} />
          {ticks.map((t) => (
            <path key={t.x} className="radio__tick" d={`M${t.x} ${192 - t.len}V192`} />
          ))}
          {ticks
            .filter((t) => t.label)
            .map((t) => (
              <text key={t.label} className="radio__num" x={t.x} y="211" textAnchor="middle">
                {t.label}
              </text>
            ))}
          <text className="radio__unit" x="80" y="196" textAnchor="middle">
            FM
          </text>
          <text className="radio__unit" x="560" y="196" textAnchor="middle">
            MHz
          </text>
          {stations.map((s, i) => (
            <g key={s.id} className={`radio__mark ${i === current ? 'is-on' : ''}`}>
              <path d={`M${scaleX(s.freq)} 166l-5-8h10z`} />
              <text className="radio__mark-label" x={scaleX(s.freq)} y="153" textAnchor="middle">
                {s.freq.toFixed(1)}
              </text>
            </g>
          ))}
        </g>
        <g className="radio__needle" ref={needleRef}>
          <path d={`M${SX0} 157V221`} />
          <circle cx={SX0} cy="221" r="3.5" />
        </g>

        {/* speaker */}
        <g className="radio__grille" ref={grilleRef}>
          <rect className="radio__line draw" pathLength={1} x="64" y="244" width="296" height="116" rx="18" />
          {Array.from({ length: 8 }, (_, i) => (
            <path key={i} className="radio__slat" d={`M84 ${262 + i * 12}H340`} />
          ))}
        </g>

        {/* live lamp + EQ */}
        <rect className="radio__line draw" pathLength={1} x="378" y="244" width="110" height="58" rx="9" />
        <circle className="radio__live-glow loop" cx="394" cy="261" r="10" />
        <circle className="radio__live-dot loop" cx="394" cy="261" r="5" />
        <text className="radio__live-text" x="405" y="265">
          LIVE
        </text>
        <text className="radio__readout" ref={readoutRef} x="478" y="265" textAnchor="end">
          {valueNow.toFixed(1)}
        </text>
        <g className="radio__eq">
          {[10, 18, 8, 22, 14, 17].map((h, i) => (
            <rect key={i} className="radio__eq-bar loop" x={392 + i * 14} y={294 - h} width="8" height={h} rx="1.5" style={{ animationDelay: `${-i * 0.17}s` }} />
          ))}
        </g>

        {/* volume knob (decorative) */}
        <circle className="radio__line draw" pathLength={1} cx="432" cy="338" r="20" />
        <path className="radio__line radio__line--thin" d="M432 338 444 324" />
        <text className="radio__tiny" x="432" y="371" textAnchor="middle">
          VOL
        </text>
        <text className="radio__tiny" x={KNOB.cx} y="371" textAnchor="middle">
          TUNING
        </text>

        {/* hand-drawn note pointing at the tuning knob */}
        <g className="radio__note">
          <path className="radio__note-arrow" d="M626 424C640 396 628 366 591 351" />
          <path className="radio__note-arrow" d="M603 348 590 351 597 362" />
          <text className="radio__note-text" x="604" y="441" textAnchor="end">
            SPIN THE DIAL
          </text>
        </g>
      </svg>

      {/* station marks: pointer shortcuts (keyboard users have the slider + buttons) */}
      <div
        className="radio__marks"
        style={{ left: pct(DIAL.x, VB_W), top: pct(DIAL.y, VB_H), width: pct(DIAL.w, VB_W), height: pct(DIAL.h * 0.48, VB_H) }}
      >
        {stations.map((s, i) => (
          <button
            key={s.id}
            type="button"
            tabIndex={-1}
            className="radio__hit"
            style={{ left: pct(scaleX(s.freq) - DIAL.x, DIAL.w) }}
            aria-label={`Tune to ${s.freq.toFixed(1)} FM — ${s.name}`}
            onClick={() => onMark(i)}
          />
        ))}
      </div>

      {/* the very end of the band: no mark, no label, just the edge of the scale */}
      <button
        type="button"
        tabIndex={-1}
        className="radio__hit radio__hit--end"
        style={{ left: pct(END_HIT.x, VB_W), top: pct(DIAL.y, VB_H), width: pct(END_HIT.w, VB_W), height: pct(DIAL.h, VB_H) }}
        aria-label="Tune to the end of the band"
        onClick={onEnd}
      />

      <div
        ref={knobRef}
        className="radio__knob"
        role="slider"
        tabIndex={0}
        aria-label="Tuning dial"
        aria-orientation="horizontal"
        aria-valuemin={FMIN}
        aria-valuemax={FMAX}
        aria-valuenow={Number(valueNow.toFixed(1))}
        aria-valuetext={valueText}
        onKeyDown={onKnobKey}
        style={{
          left: pct(KNOB.cx - KNOB.r, VB_W),
          top: pct(KNOB.cy - KNOB.r, VB_H),
          width: pct(KNOB.r * 2, VB_W),
        }}
      >
        <svg viewBox="0 0 100 100" aria-hidden="true">
          <circle className="knob__face" cx="50" cy="50" r="48" />
          <path className="knob__grip" d={grip} />
          <circle className="knob__cap" cx="50" cy="50" r="30" />
          <path className="knob__pointer" d="M50 50V13" />
          <circle className="knob__hub" cx="50" cy="50" r="5" />
        </svg>
      </div>
    </div>
  );
}
