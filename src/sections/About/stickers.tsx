import { useId } from 'react';

/* Each sticker is its own small piece of original artwork. Sizes are in `em`,
 * so the whole wall scales from one font-size set on the slot (container units). */

/** The handle: @Menace_thakur on X, "menace" on GitHub. */
export function MenaceSticker() {
  return (
    <span className="stk-menace">
      <span className="stk-menace__word">Menace</span>
      <span className="stk-menace__handle">@Menace_thakur</span>
    </span>
  );
}

/** Round seal for the Smart India Hackathon 2023 win. */
export function SihSticker() {
  const arcId = useId();
  const leaves = (side: 1 | -1) =>
    Array.from({ length: 7 }, (_, i) => {
      // walk up the circle from the bottom, one branch per side
      const deg = 90 + side * (14 + i * 17);
      const rad = (deg * Math.PI) / 180;
      const r = 67 + (i % 2 ? 4 : -3);
      const x = Math.cos(rad) * r;
      const y = Math.sin(rad) * r;
      return (
        <ellipse
          key={`${side}-${i}`}
          className="sih__leaf"
          rx="4.6"
          ry="10.5"
          transform={`translate(${x.toFixed(2)} ${y.toFixed(2)}) rotate(${(deg + side * 28).toFixed(1)})`}
        />
      );
    });

  return (
    <span className="stk-sih">
      <svg viewBox="-100 -100 200 200" role="img" aria-label="Smart India Hackathon 2023 — winner">
        <circle className="sih__disc" r="98" />
        <circle className="sih__ring" r="93" />
        <circle className="sih__ring sih__ring--dash" r="74" />
        <path id={arcId} d="M0 -83a83 83 0 1 1 0 166a83 83 0 1 1 0 -166" fill="none" />
        <text className="sih__arc">
          <textPath href={`#${arcId}`} textLength="510" lengthAdjust="spacing">
            Smart India Hackathon • 2023 • Smart India Hackathon • 2023 •
          </textPath>
        </text>
        {leaves(1)}
        {leaves(-1)}
        <path
          className="sih__star"
          d="M0 -58l5.3 10.8 11.9 1.7-8.6 8.4 2 11.8L0 -30.9l-10.6 5.6 2-11.8-8.6-8.4 11.9-1.7z"
        />
        <text className="sih__big" y="14" textAnchor="middle">
          SIH
        </text>
        <text className="sih__small" y="36" textAnchor="middle">
          Winner
        </text>
      </svg>
    </span>
  );
}

/** His X location, a terminal joke: "$ cd /". */
export function TerminalSticker() {
  return (
    <span className="stk-term">
      $ cd /<span className="stk-term__cursor loop" aria-hidden="true" />
    </span>
  );
}

/** Delhi, set under a Mughal-style arch. */
export function DelhiSticker() {
  return (
    <span className="stk-delhi" lang="hi">
      <span className="stk-delhi__jaali tx tx-jaali" aria-hidden="true" />
      <span className="stk-delhi__deva">दिल्ली</span>
      <span className="stk-delhi__ncr" lang="en">
        NCR
      </span>
    </span>
  );
}

/** Daegu, with a generic split-circle motif. */
export function DaeguSticker() {
  return (
    <span className="stk-daegu">
      <svg viewBox="-50 -50 100 100" aria-hidden="true">
        <g transform="rotate(-24)">
          <path className="dg__top" d="M-46 0C-23 -17 23 17 46 0A46 46 0 0 0 -46 0Z" />
          <path className="dg__bottom" d="M-46 0C-23 -17 23 17 46 0A46 46 0 0 1 -46 0Z" />
        </g>
        <circle className="dg__rim" r="46" />
      </svg>
      <span className="stk-daegu__words">
        <span className="stk-daegu__ko" lang="ko">
          대구
        </span>
        <span className="stk-daegu__en">Daegu</span>
      </span>
    </span>
  );
}

/** Palo Alto postcard: sun, palm, horizon. */
export function PaloAltoSticker() {
  const fronds = [-150, -118, -88, -58, -28, 4];
  return (
    <span className="stk-palo">
      <svg viewBox="0 0 160 104" aria-hidden="true">
        <rect className="palo__sky" width="160" height="104" />
        <circle className="palo__sun" cx="114" cy="42" r="21" />
        <path className="palo__hill" d="M0 86C34 74 70 80 100 76S146 70 160 74V104H0Z" />
        <path className="palo__trunk" d="M50 104C54 86 56 66 66 46" />
        <path className="palo__rings" d="M50.6 98h5M52.4 90h5M54.6 82h5M57.2 74h5M60.2 66h5M63.4 58h4.6" />
        <g transform="translate(66 44)">
          {fronds.map((a) => (
            <path key={a} className="palo__frond" transform={`rotate(${a})`} d="M0 0C10 -10 26 -10 38 -2C26 -4 12 -2 0 0Z" />
          ))}
          <circle className="palo__nut" cx="-2" cy="4" r="3.2" />
          <circle className="palo__nut" cx="3" cy="5" r="3" />
        </g>
      </svg>
      <span className="stk-palo__label">Palo Alto, CA</span>
    </span>
  );
}

/** Ticket stub carrying his one-line method. */
export function TicketSticker() {
  return (
    <span className="stk-ticket">
      <span className="stk-ticket__main">
        Think <i aria-hidden="true">·</i> Use tools <i aria-hidden="true">·</i> Ship
      </span>
      <span className="stk-ticket__stub">Admit one</span>
    </span>
  );
}

/** Embossed label-maker tape. */
export function DymoSticker() {
  return <span className="stk-dymo">GDG on Campus · Lead</span>;
}

/** Class of 2027. */
export function BtechSticker() {
  return (
    <span className="stk-btech">
      <span className="stk-btech__deg">B.Tech</span>
      <span className="stk-btech__yr">’27</span>
    </span>
  );
}
