import { useId } from 'react';
import { scrollToSection } from '../../lib/scroll';

// Side view of a Delhi CNG auto-rickshaw, facing right. Drawn on a 420 × 330 grid,
// ground at y = 322. Wheels and body are separate layers so only the body rocks.
const BODY =
  'M46 292C34 286 32 246 40 222L42 208H226L232 214V256H318L330 206C350 196 370 198 384 210C398 222 400 244 392 262L376 276L374 284A37 37 0 0 0 300 284L296 276H152L150 282A39 39 0 0 0 74 282L62 290Z';

function Wheel({ cx, cy, r }: { cx: number; cy: number; r: number }) {
  const lugs = Array.from({ length: 5 }, (_, i) => {
    const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
    return <circle key={i} className="auto__lug" cx={cx + Math.cos(a) * r * 0.36} cy={cy + Math.sin(a) * r * 0.36} r={r * 0.07} />;
  });
  return (
    <g>
      <circle className="auto__tyre" cx={cx} cy={cy} r={r} />
      <circle className="auto__tread" cx={cx} cy={cy} r={r - 5} />
      <circle className="auto__rim" cx={cx} cy={cy} r={r * 0.6} />
      {lugs}
      <circle className="auto__hub" cx={cx} cy={cy} r={r * 0.2} />
    </g>
  );
}

export function AutoRickshaw() {
  const id = useId().replace(/:/g, '');
  return (
    <div className="auto">
      <svg className="auto__layer" viewBox="0 0 420 330" aria-hidden="true">
        <ellipse className="auto__shadow" cx="214" cy="322" rx="188" ry="7" />
        <Wheel cx={112} cy={290} r={32} />
        <Wheel cx={336} cy={292} r={30} />
      </svg>

      <div className="auto__body loop">
        <svg className="auto__layer" viewBox="0 0 420 330" aria-hidden="true">
          <defs>
            <pattern id={`auto-dots-${id}`} width="7" height="7" patternUnits="userSpaceOnUse">
              <circle className="auto__dot" cx="3.5" cy="3.5" r="1.7" />
            </pattern>
            <clipPath id={`auto-clip-${id}`}>
              <path d={BODY} />
            </clipPath>
          </defs>

          {/* pennant pole */}
          <path className="auto__pole" d="M58 92V16" />
          <circle className="auto__finial" cx="58" cy="13" r="5" />

          {/* cabin interior, seats, controls */}
          <rect className="auto__interior" x="86" y="112" width="222" height="118" />
          <rect className="auto__interior" x="228" y="200" width="96" height="60" />
          <rect className="auto__seat" x="100" y="146" width="104" height="42" rx="11" />
          <rect className="auto__seat" x="96" y="184" width="120" height="20" rx="7" />
          <rect className="auto__seat" x="238" y="176" width="42" height="34" rx="9" />
          <path className="auto__bar" d="M296 150L272 174" />
          <circle className="auto__grip" cx="298" cy="148" r="5" />
          <path className="auto__pillar" d="M222 118V210" />

          {/* lower body: green, with halftone shading along the sill */}
          <path className="auto__paint auto__ink" d={BODY} />
          <rect x="30" y="246" width="380" height="60" fill={`url(#auto-dots-${id})`} clipPath={`url(#auto-clip-${id})`} className="auto__shade" />
          <path className="auto__stripe" d="M46 224H226" />
          <path className="auto__stripe auto__stripe--thin" d="M236 236H318" />
          <rect className="auto__tail ink-edge" x="32" y="232" width="9" height="17" rx="2" />

          {/* canopy: rear quarter, roof, trim */}
          <path className="auto__canopy auto__ink" d="M40 210V134Q40 112 62 112H98V210Z" />
          <rect className="auto__glass auto__ink" x="52" y="124" width="34" height="36" rx="8" />
          <path className="auto__canopy auto__ink" d="M34 118Q34 90 64 90H300Q320 90 322 108V118Z" />
          <path className="auto__trim" d="M38 117H318" />

          {/* windscreen and mirror */}
          <path className="auto__glass auto__ink" d="M306 118H320L347 202L332 206Z" />
          <path className="auto__sheen" d="M314 126L332 184" />
          <path className="auto__stalk" d="M320 122L340 100" />
          <ellipse className="auto__mirror" cx="343" cy="93" rx="6.5" ry="9.5" />
          <ellipse className="auto__glass-fill" cx="343" cy="93" rx="3.5" ry="6" />

          {/* headlamp */}
          <circle className="auto__glow loop" cx="389" cy="232" r="21" />
          <circle className="auto__lamp-housing auto__ink" cx="389" cy="232" r="11" />
          <circle className="auto__lamp loop" cx="389" cy="232" r="6.5" />
        </svg>

        <button type="button" className="auto__pennant" onClick={() => scrollToSection('contact')}>
          <span className="auto__flag">
            Hop in <span aria-hidden="true">→</span>
            <span className="visually-hidden"> — jump to contact</span>
          </span>
        </button>
      </div>
    </div>
  );
}
