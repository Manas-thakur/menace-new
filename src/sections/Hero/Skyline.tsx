// A fused skyline, hand-drawn in one coordinate system (viewBox 1600 × 640, ground at 640):
// Delhi — Qutub Minar, Humayun's Tomb, the Lotus Temple; Daegu — 83 Tower; Palo Alto — palms.
// A Delhi Metro train crosses the viaduct. All shapes are original flat silhouettes.

function seeded(seed: number) {
  return () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
}

/** Far city blocks: deterministic rhythm of roofs, skipping the landmark plots. */
const FAR_BLOCKS = (() => {
  const r = seeded(26);
  const out: string[] = [];
  let x = -10;
  while (x < 1610) {
    const w = 34 + Math.round(r() * 46);
    const h = 30 + Math.round(r() * 70);
    const busy = (x > 1110 && x < 1190) || (x > 1300 && x < 1470);
    if (!busy) {
      const top = 430 - h;
      // occasional little dome or water tank on the roof
      const roof = r() > 0.72 ? `M${x + w * 0.3} ${top}q${w * 0.2} -${w * 0.36} ${w * 0.4} 0z` : '';
      out.push(`M${x} 430V${top}h${w}V430z${roof}`);
    }
    x += w + Math.round(r() * 6);
  }
  return out.join('');
})();

/** A drooping palm frond as a closed leaf shape. */
function frond(x: number, y: number, angle: number, len: number) {
  const a = (angle * Math.PI) / 180;
  const ex = x + Math.cos(a) * len;
  const ey = y + Math.sin(a) * len + len * 0.28; // gravity
  const mx = x + Math.cos(a) * len * 0.55;
  const my = y + Math.sin(a) * len * 0.55 - len * 0.12;
  const nx = -Math.sin(a) * len * 0.13;
  const ny = Math.cos(a) * len * 0.13;
  return `M${x} ${y}Q${mx + nx} ${my + ny} ${ex} ${ey}Q${mx - nx} ${my - ny} ${x} ${y}z`;
}
function palm(x: number, base: number, height: number, lean: number) {
  const tx = x + lean;
  const ty = base - height;
  const trunk = `M${x - 5} ${base}C${x - 2} ${base - height * 0.4} ${tx - 9} ${ty + height * 0.3} ${tx - 3} ${ty}h7C${tx - 1} ${ty + height * 0.3} ${x + 6} ${base - height * 0.4} ${x + 5} ${base}z`;
  const leaves = [-168, -140, -112, -76, -44, -14].map((ang, i) => frond(tx, ty, ang, 44 + (i % 3) * 9)).join('');
  return trunk + leaves;
}

/** One metro coach starting at x, standing on the deck (y 470). */
function Coach({ x, lead = false }: { x: number; lead?: boolean }) {
  const windows = Array.from({ length: 7 }, (_, i) => x + 22 + i * 32);
  return (
    <g>
      <rect x={x} y={410} width={254} height={54} rx={10} className="metro__body" />
      <rect x={x} y={410} width={254} height={7} rx={3} className="metro__roof" />
      <rect x={x + 10} y={421} width={234} height={17} rx={3} className="metro__glass" />
      {windows.map((wx) => (
        <rect key={wx} x={wx} y={421} width={3} height={17} className="metro__body" />
      ))}
      <rect x={x} y={445} width={254} height={6} className="metro__stripe" />
      <rect x={x + 82} y={418} width={22} height={44} rx={2} className="metro__door" />
      <rect x={x + 150} y={418} width={22} height={44} rx={2} className="metro__door" />
      <rect x={x + 6} y={462} width={242} height={6} rx={2} className="metro__bogie" />
      {lead && (
        <>
          <path d={`M${x + 236} 410h10c12 0 18 10 18 22v20c0 8-5 12-12 12h-16z`} className="metro__body" />
          <path d={`M${x + 244} 418h8c5 0 7 4 7 8v10h-15z`} className="metro__glass" />
          <circle cx={x + 258} cy={452} r={3.2} className="metro__lamp" />
        </>
      )}
    </g>
  );
}

const PILLARS = Array.from({ length: 8 }, (_, i) => 70 + i * 220);

export function Skyline() {
  return (
    <svg className="skyline" viewBox="0 0 1600 640" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      {/* far: city blocks, Daegu's 83 Tower, Palo Alto palms */}
      <g className="skyline__far">
        <path d={FAR_BLOCKS} />
        <g className="landmark landmark--tower">
          <path d="M1141 430l4-262h10l4 262z" />
          <ellipse cx="1150" cy="196" rx="31" ry="13" />
          <ellipse cx="1150" cy="179" rx="21" ry="8" />
          <rect x="1146.5" y="124" width="7" height="56" />
          <rect x="1149" y="74" width="2" height="52" />
          <circle cx="1150" cy="73" r="3.5" />
        </g>
        <path className="landmark landmark--palms" d={palm(1330, 432, 168, 16) + palm(1398, 432, 196, -10) + palm(1452, 432, 132, 12)} />
      </g>

      {/* mid: Delhi */}
      <g className="skyline__mid">
        {/* Qutub Minar */}
        <g className="landmark landmark--minar">
          <path d="M232 472l18-377h40l18 377z" />
          <rect x="230" y="391" width="80" height="9" rx="2" />
          <rect x="234" y="306" width="72" height="8" rx="2" />
          <rect x="238" y="222" width="64" height="8" rx="2" />
          <rect x="242" y="146" width="56" height="7" rx="2" />
          <rect x="257" y="80" width="26" height="16" />
          <path d="M256 81q14-26 28 0z" />
          <rect x="269" y="44" width="2" height="22" />
          <path className="skyline__flute" d="M258 470l8-374M282 470l-8-374M270 470V96" />
        </g>
        {/* Humayun's Tomb */}
        <g className="landmark landmark--tomb">
          <rect x="430" y="430" width="340" height="42" />
          <rect x="490" y="342" width="220" height="90" />
          <rect x="560" y="300" width="80" height="44" />
          <path d="M552 304c-12-44 16-74 48-82 32 8 60 38 48 82z" />
          <rect x="598" y="190" width="4" height="34" />
          <circle cx="600" cy="196" r="5" />
          <circle cx="600" cy="208" r="4" />
          <rect x="506" y="322" width="28" height="22" />
          <path d="M503 324q17-28 34 0z" />
          <rect x="666" y="322" width="28" height="22" />
          <path d="M663 324q17-28 34 0z" />
          <path className="skyline__recess" d="M578 432v-46q22-30 44 0v46zM512 432v-34q14-20 28 0v34zM660 432v-34q14-20 28 0v34z" />
        </g>
        {/* Lotus Temple */}
        <g className="landmark landmark--lotus">
          <rect x="820" y="462" width="230" height="10" />
          <path d="M840 466q8-70 66-98-16 52-6 98z" />
          <path d="M1030 466q-8-70-66-98 16 52 6 98z" />
          <path d="M868 466q-2-76 46-120-8 62 2 120z" />
          <path d="M1002 466q2-76-46-120 8 62-2 120z" />
          <path className="skyline__petal" d="M903 466q-6-92 32-150 38 58 32 150z" />
        </g>
        {/* low old-city fabric between landmarks */}
        <path d="M330 472v-40h40v-12h34v52zM760 472v-30h30q10-16 20 0h20v30zM1060 472v-46h44v18h30v28zM1180 472v-24h60v24z" />
      </g>

      {/* viaduct + metro */}
      <g className="skyline__bridge">
        <rect x="0" y="470" width="1600" height="22" />
        {PILLARS.map((x) => (
          <g key={x}>
            <rect x={x - 36} y={490} width={72} height={12} />
            <path d={`M${x - 18} 500h36l-6 140h-24z`} />
          </g>
        ))}
      </g>
      <g className="metro loop">
        <Coach x={0} />
        <Coach x={262} />
        <Coach x={524} />
        <Coach x={786} lead />
      </g>

      {/* front: trees */}
      <g className="skyline__front">
        <g className="trees">
          <circle cx="40" cy="560" r="82" />
          <circle cx="132" cy="592" r="70" />
          <circle cx="-6" cy="604" r="64" />
          <circle cx="206" cy="622" r="56" />
          <circle cx="92" cy="498" r="56" />
          <circle cx="1560" cy="560" r="82" />
          <circle cx="1468" cy="592" r="70" />
          <circle cx="1606" cy="604" r="64" />
          <circle cx="1394" cy="622" r="56" />
          <circle cx="1508" cy="498" r="56" />
        </g>
        <g className="trees__light">
          <circle cx="24" cy="538" r="44" />
          <circle cx="78" cy="480" r="30" />
          <circle cx="118" cy="570" r="34" />
          <circle cx="1576" cy="538" r="44" />
          <circle cx="1522" cy="480" r="30" />
          <circle cx="1452" cy="570" r="34" />
        </g>
      </g>
    </svg>
  );
}
