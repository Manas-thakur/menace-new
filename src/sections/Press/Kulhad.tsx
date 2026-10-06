import { useId } from 'react';
import './Kulhad.css';

/*
 * A terracotta kulhad with chai poured into it from above, drawn by hand on a
 * 600 × 1000 board. Two stacked SVGs share one viewBox:
 *   .kulhad__art  — static cup + stream, wrapped in the die-cut sticker filter
 *   .kulhad__live — the moving parts (flow, ripples, droplets, steam), kept
 *                   outside the filter so the loops never force a filter repaint.
 */

// Cup body: rim front lip (lower half of the rim ellipse) down to a narrow base.
const BODY = 'M152 700C156 800 182 900 212 958A88 16 0 0 0 388 958C418 900 444 800 448 700A148 30 0 0 1 152 700Z';
// Rim seen from above: outer ellipse minus the mouth (even-odd).
const RIM = 'M152 700A148 30 0 1 1 448 700A148 30 0 1 1 152 700ZM170 702A130 23 0 1 0 430 702A130 23 0 1 0 170 702Z';
// Pulled-chai pour: a long S-curve that necks from 34 units at the top to 18
// where it lands, so it reads as falling liquid rather than a rod.
const STREAM =
  'M345 -20C313 140 372 300 324 450C276 600 284 620 291 702L309 702C300 620 300 600 348 450C396 300 347 140 379 -20Z';
const STREAM_CORE = 'M362 -20C330 140 384 300 336 450C288 600 292 620 300 702';
const STREAM_LIGHT = 'M354 -20C322 140 376 300 328 450C280 600 286 620 293 690';
const STREAM_DARK = 'M372 -20C340 140 393 300 345 450C297 600 299 620 306 694';
// Splash crown where the stream meets the chai: tall spikes, a lip of foam.
const CROWN =
  'M248 710C250 696 257 690 262 702C263 680 273 671 279 694C283 668 293 662 296 690L304 688C309 659 320 664 322 690C328 670 339 676 338 698C344 686 352 690 352 710Q300 722 248 710Z';
const CROWN_LIGHT = 'M256 704Q260 696 263 701M270 698Q274 681 280 694M289 692Q293 671 297 689M308 687Q313 668 320 688M328 692Q334 678 338 697';
// Droplets thrown off the splash and the falling stream.
const SPRAY = [
  { cx: 238, cy: 676, r: 6.5 },
  { cx: 362, cy: 670, r: 5.5 },
  { cx: 226, cy: 700, r: 4 },
  { cx: 376, cy: 694, r: 4.5 },
  { cx: 262, cy: 652, r: 3.6 },
  { cx: 344, cy: 648, r: 3.2 },
];
// Potter's-wheel rings following the cup's curve.
const RINGS = ['M159 774Q300 806 441 774', 'M165 812Q300 842 435 812', 'M172 845Q300 873 428 845', 'M190 907Q300 931 410 907'];
const STEAM = [
  'M222 660C196 620 252 590 224 548S198 478 230 436S250 380 226 344',
  'M390 656C416 618 360 586 392 544S414 474 384 432S360 378 386 340',
  'M244 650C232 622 266 604 250 572S236 528 254 502',
];

export function Kulhad() {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const id = (name: string) => `${uid}-${name}`;
  const url = (name: string) => `url(#${id(name)})`;

  return (
    <div className="kulhad">
      <svg className="kulhad__art" viewBox="0 0 600 1000" preserveAspectRatio="xMidYMax slice" aria-hidden="true" focusable="false">
        <defs>
          <linearGradient id={id('clay')} x1="0" x2="1" y1="0" y2="0">
            <stop offset="0" className="kulhad__clay-light" />
            <stop offset="0.46" className="kulhad__clay-mid" />
            <stop offset="1" className="kulhad__clay-dark" />
          </linearGradient>
          <linearGradient id={id('shade')} gradientUnits="userSpaceOnUse" x1="200" y1="0" x2="452" y2="0">
            <stop offset="0" className="kulhad__mask-off" />
            <stop offset="1" className="kulhad__mask-on" />
          </linearGradient>
          <mask id={id('shadeMask')} maskUnits="userSpaceOnUse" x="140" y="660" width="320" height="320">
            <rect x="140" y="660" width="320" height="320" fill={url('shade')} />
          </mask>
          <pattern id={id('dots')} width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(18)">
            <circle cx="4.5" cy="4.5" r="2.2" className="kulhad__dot" />
          </pattern>
          <clipPath id={id('body')}>
            <path d={BODY} />
          </clipPath>
          <clipPath id={id('mouth')}>
            <ellipse cx="300" cy="702" rx="130" ry="23" />
          </clipPath>
        </defs>

        {/* The pour, behind the cup so the chai surface swallows its end */}
        <g>
          <path className="kulhad__stream" d={STREAM} />
          <path className="kulhad__stream-dark" d={STREAM_DARK} />
          <path className="kulhad__stream-light" d={STREAM_LIGHT} />
          <path className="kulhad__stream-gloss" d={STREAM_LIGHT} />
          <path className="kulhad__line kulhad__line--stream" d={STREAM} />
        </g>

        {/* Cup body */}
        <path d={BODY} fill={url('clay')} />
        <g clipPath={url('body')}>
          <rect x="140" y="660" width="320" height="320" fill={url('dots')} mask={url('shadeMask')} className="kulhad__halftone" />
          {RINGS.map((d) => (
            <path key={d} className="kulhad__ring" d={d} />
          ))}
          <path className="kulhad__shine" d="M196 718C198 792 212 880 232 944" />
          <path className="kulhad__shine kulhad__shine--thin" d="M222 726C224 790 234 862 248 918" />
        </g>
        <path className="kulhad__line" d={BODY} />

        {/* Mouth: inner wall, chai, then the rim on top */}
        <ellipse className="kulhad__inner" cx="300" cy="702" rx="130" ry="23" />
        <g clipPath={url('mouth')}>
          <ellipse className="kulhad__chai" cx="300" cy="709" rx="127" ry="20" />
          <ellipse className="kulhad__chai-light" cx="258" cy="713" rx="58" ry="6.5" />
          <ellipse className="kulhad__chai-light kulhad__chai-light--soft" cx="352" cy="716" rx="30" ry="3.5" />
        </g>
        <path className="kulhad__rim" d={RIM} fillRule="evenodd" />
        <path className="kulhad__rim-shine" d="M168 712Q214 729 266 732" />
        <path className="kulhad__line kulhad__line--rim" d={RIM} fillRule="evenodd" />

        {/* Splash crown over the landing point */}
        <path className="kulhad__crown" d={CROWN} />
        <path className="kulhad__crown-light" d={CROWN_LIGHT} />
      </svg>

      <svg className="kulhad__live" viewBox="0 0 600 1000" preserveAspectRatio="xMidYMax slice" aria-hidden="true" focusable="false">
        <g className="loop">
          <path className="kulhad__flow" d={STREAM_CORE} pathLength={100} />
          <ellipse className="kulhad__ripple" cx="300" cy="710" rx="46" ry="8" />
          <ellipse className="kulhad__ripple kulhad__ripple--late" cx="300" cy="710" rx="46" ry="8" />
          {SPRAY.map((d, i) => (
            <circle
              key={i}
              className={`kulhad__spray kulhad__spray--${i}`}
              cx={d.cx}
              cy={d.cy}
              r={d.r}
              style={{ ['--dx' as string]: `${d.cx < 300 ? -1 : 1}`, ['--delay' as string]: `${-i * 0.23}s` }}
            />
          ))}
        </g>
        <g className="loop kulhad__steam-group">
          {STEAM.map((d, i) => (
            <path key={d} className={`kulhad__steam kulhad__steam--${i}`} d={d} pathLength={100} />
          ))}
        </g>
      </svg>
    </div>
  );
}
