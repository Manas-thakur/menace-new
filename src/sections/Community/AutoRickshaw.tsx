import { useEffect, useId, useRef } from 'react';
import { deepCut } from '../../data/deep';
import { discover } from '../../lib/deep';
import { gsap, useGSAP } from '../../lib/gsap';
import { prefersReducedMotion } from '../../lib/motion';
import { scrollToSection } from '../../lib/scroll';
import { useHoverReveal } from './useHoverReveal';

// Side view of a Delhi CNG auto-rickshaw, facing right. Drawn on a 420 × 330 grid,
// ground at y = 322. Wheels and body are separate layers so only the body rocks.
const BODY =
  'M46 292C34 286 32 246 40 222L42 208H226L232 214V256H318L330 206C350 196 370 198 384 210C398 222 400 244 392 262L376 276L374 284A37 37 0 0 0 300 284L296 276H152L150 282A39 39 0 0 0 74 282L62 290Z';

/*
 * Deep cut · "With love". The line painted on the backs of trucks and autos all
 * over India is lettered on the auto's rear panel. Rest on the auto (~½ s), focus
 * it or tap it: it turns its back to us, the plate grows readable, and a painted
 * roof board gives the translation. Every string comes from src/data/deep.ts.
 */
const CUT = deepCut('love');
const LINE = CUT.lines.find((l) => l.lang === 'hi') ?? CUT.lines[0];
const WORDS = LINE.text.split(/\s+/);
const HALF = Math.ceil(WORDS.length / 2);
/** The painted plate, lettered on two lines like the real thing. */
const PLATE = [WORDS.slice(0, HALF).join(' '), WORDS.slice(HALF).join(' ')];
const PROSE = CUT.lines.filter((l) => l.lang !== 'hi');
const LABEL = CUT.hint.replace(/\.\s*$/, '');
/** Where the charm's thread is tied, in auto units (it swings from here). */
const CHARM_TIE = '31 114';

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

/** Nimbu-mirchi: a lemon under a string of green chillies, against the evil eye. */
function Charm() {
  const chillies = [124, 131, 138, 145, 152].map((y, i) => {
    const side = i % 2 ? 1 : -1;
    return (
      <path
        key={y}
        className="auto__chilli"
        d={`M31 ${y}c${side * 2} 1 ${side * 6} 4 ${side * 7} 10c${side * -2} -2 ${side * -5} -6 ${side * -7} -7z`}
      />
    );
  });
  return (
    <g className="auto__charm">
      <path className="auto__thread" d="M31 114V160" />
      {chillies}
      <ellipse className="auto__lemon" cx="31" cy="166" rx="5.2" ry="6.2" />
    </g>
  );
}

export function AutoRickshaw() {
  const id = useId().replace(/:/g, '');
  const figId = `love-${id}`;
  const rootRef = useRef<HTMLDivElement>(null);
  const tl = useRef<gsap.core.Timeline | null>(null);
  const mounted = useRef(false);
  const { open, trigger, panel } = useHoverReveal(rootRef);
  const { contextSafe } = useGSAP({ scope: rootRef });

  const parts = () => {
    const root = rootRef.current!;
    return {
      turn: root.querySelector<HTMLElement>('.auto__turn'),
      art: root.querySelector<SVGGElement>('.auto__art'),
      charm: root.querySelector<SVGGElement>('.auto__charm'),
      plate: root.querySelector<HTMLElement>('.auto__plate'),
      board: root.querySelector<HTMLElement>('.auto__board'),
    };
  };

  /** The painted plate's size relative to its close-up, so the close-up grows out of it. */
  const plateScale = (art: SVGGElement | null, plate: HTMLElement | null) => {
    const small = art?.getBoundingClientRect().width ?? 0;
    const big = plate?.offsetWidth ?? 0;
    return small > 0 && big > 0 ? Math.min(1, small / big) : 0.4;
  };

  /**
   * Stacked layouts: the auto sits near the end of a long drawer, so make sure the
   * roof board is not under the nav and the plate is not under the toast corner.
   */
  const bringIntoView = (board: HTMLElement | null, plate: HTMLElement | null) => {
    if (!board || !plate || !window.matchMedia('(max-width: 63.99rem)').matches) return;
    const top = board.getBoundingClientRect().top;
    const bottom = plate.getBoundingClientRect().bottom;
    const navBottom = document.querySelector('.navbar')?.getBoundingClientRect().bottom ?? 0;
    const floor = window.innerHeight - Math.min(170, window.innerHeight * 0.22);
    let dy = bottom > floor ? bottom - floor : 0;
    if (top - dy < navBottom + 12) dy = top - navBottom - 12;
    if (Math.abs(dy) < 4) return;
    window.scrollBy({ top: dy, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
  };

  const reveal = contextSafe(() => {
    const { turn, art, charm, plate, board } = parts();
    tl.current?.kill();
    bringIntoView(board, plate);
    if (prefersReducedMotion()) {
      // No motion: the plate and the board are simply there.
      gsap.set(plate, { autoAlpha: 1, scale: 1 });
      gsap.set(board, { autoAlpha: 1, rotationX: 0 });
      discover(CUT.id);
      return;
    }
    tl.current = gsap
      .timeline({ defaults: { ease: 'expoOut' } })
      // the auto swings its back towards us, hinged at the nose…
      .to(turn, { rotationY: 11, transformPerspective: 1800, transformOrigin: '90% 85%', duration: 0.75 }, 0)
      // …the painted plate lifts off the panel and grows readable…
      .fromTo(plate, { autoAlpha: 0, scale: plateScale(art, plate) }, { autoAlpha: 1, scale: 1, duration: 0.65 }, 0.08)
      // …the charm swings on its thread…
      .fromTo(
        charm,
        { rotation: 0 },
        { keyframes: { rotation: [0, 16, -11, 6, -2, 0] }, svgOrigin: CHARM_TIE, duration: 0.95, ease: 'none' },
        0.06
      )
      // …and the painted roof board flips up with the translation.
      .fromTo(
        board,
        { autoAlpha: 0, rotationX: -86, transformPerspective: 700, transformOrigin: '50% 100%' },
        { autoAlpha: 1, rotationX: 0, duration: 0.62, ease: 'riot' },
        0.34
      )
      .call(() => discover(CUT.id), [], 0.55);
  });

  const conceal = contextSafe(() => {
    const { turn, art, plate, board } = parts();
    tl.current?.kill();
    tl.current = null;
    if (prefersReducedMotion()) {
      gsap.set([plate, board], { autoAlpha: 0 });
      gsap.set(turn, { rotationY: 0 });
      return;
    }
    gsap.to(board, { autoAlpha: 0, rotationX: -70, duration: 0.3, ease: 'riot' });
    gsap.to(plate, { autoAlpha: 0, scale: plateScale(art, plate), duration: 0.32, ease: 'riot' });
    gsap.to(turn, { rotationY: 0, duration: 0.6, ease: 'expoOut' });
  });

  // Play only when `open` flips (contextSafe wrappers get a new identity every render).
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    if (open) reveal();
    else conceal();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <div ref={rootRef} className={`auto ${open ? 'is-open' : ''}`}>
      <button type="button" className="auto__read" aria-expanded={open} aria-controls={figId} {...trigger}>
        <span className="visually-hidden">{LABEL}</span>
      </button>

      <div className="auto__turn">
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
            <rect className="auto__tail" x="32" y="232" width="9" height="17" rx="2" />
            {/* painted vine on the rear body */}
            <path className="auto__vine" d="M54 252c6-8 14-8 18 0s12 8 18 0M60 252h0M78 252h0" />

            {/* canopy: rear quarter, roof, trim */}
            <path className="auto__canopy auto__ink" d="M40 210V134Q40 112 62 112H98V210Z" />
            <path className="auto__canopy auto__ink" d="M34 118Q34 90 64 90H300Q320 90 322 108V118Z" />
            <path className="auto__trim" d="M38 117H318" />

            {/* truck-art plate on the rear panel: देखो मगर प्यार से */}
            <g className="auto__art">
              <rect className="auto__art-plate" x="44.5" y="124" width="51" height="52" rx="4" />
              <rect className="auto__art-rule" x="48" y="127.5" width="44" height="45" rx="2" />
              {[
                [51.5, 131],
                [88.5, 131],
                [51.5, 169],
                [88.5, 169],
              ].map(([cx, cy]) => (
                <circle key={`${cx}-${cy}`} className="auto__art-dot" cx={cx} cy={cy} r="1.5" />
              ))}
              <text className="auto__art-text" x="70" y="147.5" textAnchor="middle" lang="hi">
                {PLATE[0]}
              </text>
              <text className="auto__art-text" x="70" y="164.5" textAnchor="middle" lang="hi">
                {PLATE[1]}
              </text>
              <path className="auto__art-curl" d="M47 190c2.5-3.5 5.5-3.5 7.5 0s5 3.5 7.5 0M78 190c2.5-3.5 5.5-3.5 7.5 0s5 3.5 7.5 0" />
              <circle className="auto__art-bead" cx="70" cy="190" r="3.2" />
              <circle className="auto__art-pupil" cx="70" cy="190" r="1.3" />
            </g>

            <Charm />

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

      <figure id={figId} className="auto__cut">
        <blockquote className="auto__plate" lang={LINE.lang} {...panel}>
          {PLATE.map((line) => (
            <span key={line}>{line}</span>
          ))}
        </blockquote>
        <figcaption className="auto__board" {...panel}>
          {PROSE.map((line) => (
            <span key={line.text} className="auto__translation">
              {line.text}
            </span>
          ))}
          <span className="auto__source">{CUT.source}</span>
        </figcaption>
      </figure>
    </div>
  );
}
