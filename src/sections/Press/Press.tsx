import { useRef } from 'react';
import type { SectionProps } from '../../App';
import { Drawer } from '../../components/primitives/Drawer';
import { Tape, TornEdge } from '../../components/primitives/Print';
import { briefs, clippings, type Clipping } from '../../data/profile';
import { gsap, useGSAP } from '../../lib/gsap';
import { drawerOf, onDrawerEnter } from '../../lib/enter';
import { prefersReducedMotion } from '../../lib/motion';
import { Kulhad } from './Kulhad';
import './Press.css';

// Hand-placed collage: each cut-out sits a little askew, tape laid at its own angle.
const TILT = [-1.4, 2.1, -2.4, 1.6, -1.1, 2.4];
const TAPE = [-4, 3, -2.5, 5, -3.5, 2];
const TAG_TONE: Record<string, string> = {
  Exclusive: 'crimson',
  Research: 'ink',
  Hackathon: 'gold',
  Community: 'crimson',
  Industry: 'ink',
};

function ClippingCard({ item, lead, order }: { item: Clipping; lead: boolean; order: number }) {
  return (
    <article
      className={`clip ${lead ? 'clip--lead' : ''} clip--${item.id}`}
      style={{ ['--tilt' as string]: `${TILT[order]}deg` }}
      aria-labelledby={`clip-${item.id}`}
    >
      <Tape className="clip__tape" rotate={TAPE[order]} />
      <span className="tx tx-grain" aria-hidden="true" />
      <p className="clip__meta">
        <span className={`clip__tag clip__tag--${TAG_TONE[item.tag] ?? 'ink'}`}>{item.tag}</span>
        <span className="clip__date">{item.date}</span>
      </p>
      <h3 className="clip__headline" id={`clip-${item.id}`}>
        {item.headline}
      </h3>
      <p className="clip__body">{item.body}</p>
      <p className="clip__source">— {item.source}</p>
    </article>
  );
}

/** "In brief" exists twice: pinned beside the pour on wide screens, in the collage
 * flow elsewhere. CSS shows exactly one; display:none keeps the other out of the a11y tree. */
function BriefCard({ order, placement }: { order: number; placement: 'pinned' | 'flow' }) {
  const titleId = `clip-brief-${placement}`;
  return (
    <aside
      className={`clip clip--brief clip--${placement}`}
      style={{ ['--tilt' as string]: `${TILT[order]}deg` }}
      aria-labelledby={titleId}
    >
      <Tape className="clip__tape" rotate={TAPE[order]} />
      <span className="tx tx-grain" aria-hidden="true" />
      <h3 className="clip__brief-title" id={titleId}>
        In brief
      </h3>
      <ul className="clip__brief-list">
        {briefs.map((b) => {
          const cut = b.indexOf(': ');
          return (
            <li key={b}>
              {cut > 0 ? (
                <>
                  <strong>{b.slice(0, cut + 1)}</strong> {b.slice(cut + 2)}
                </>
              ) : (
                b
              )}
            </li>
          );
        })}
      </ul>
    </aside>
  );
}

export function Press({ index }: SectionProps) {
  const rootRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const root = rootRef.current;
      const drawer = drawerOf(root);
      if (!root || !drawer || prefersReducedMotion()) return;

      const title = root.querySelector('.press__title-text');
      const lines = root.querySelectorAll('.press__hindi, .press__dateline, .press__tagline');
      const art = root.querySelector('.press__art-figure');
      // Only the clippings rendered at this width join the stagger; lead lands first, "In brief" last
      // (the pinned brief sits earlier in the DOM, inside the art column).
      const clips = gsap.utils
        .toArray<HTMLElement>('.clip', root)
        .filter((c) => c.offsetParent !== null)
        .sort((a, b) => Number(a.classList.contains('clip--brief')) - Number(b.classList.contains('clip--brief')));
      const tapes = clips.map((c) => c.querySelector('.clip__tape'));

      gsap.set(title, { clipPath: 'inset(100% -6% -20% -6%)', yPercent: 28 });
      gsap.set(lines, { opacity: 0, y: 14 });
      gsap.set(art, { opacity: 0, scale: 1.05, rotate: -2.5, y: 30, transformOrigin: '50% 85%' });
      gsap.set(clips, { opacity: 0, scale: 0.92, y: 8 });
      gsap.set(tapes, { scaleX: 0, transformOrigin: '0% 50%' });

      const tl = gsap.timeline({ paused: true, defaults: { ease: 'expoOut' } });
      tl.to(title, { clipPath: 'inset(-20% -6% -20% -6%)', yPercent: 0, duration: 0.85, clearProps: 'clipPath,transform' }, 0)
        .to(lines, { opacity: 1, y: 0, duration: 0.6, stagger: 0.06, clearProps: 'transform,opacity' }, 0.18)
        .to(art, { opacity: 1, scale: 1, rotate: 0, y: 0, duration: 0.8, ease: 'slap', clearProps: 'transform,opacity' }, 0.12);

      clips.forEach((clip, i) => {
        const at = 0.32 + i * 0.07;
        tl.to(clip, { opacity: 1, scale: 1, y: 0, duration: 0.55, ease: 'riot', clearProps: 'transform,opacity' }, at);
        if (tapes[i]) tl.to(tapes[i], { scaleX: 1, duration: 0.28, ease: 'riot', clearProps: 'transform' }, at + 0.22);
      });

      const st = onDrawerEnter(drawer, () => tl.play());
      return () => st.kill();
    },
    { scope: rootRef }
  );

  const [lead, ...rest] = clippings;

  return (
    <Drawer id="press" index={index} label="Press" className="press">
      <div ref={rootRef} className="press__root">
        <div className="tx tx-mandala press__mandala" aria-hidden="true" />
        <TornEdge className="press__torn" seed={23} teeth={54} depth={34} />

        <header className="press__masthead">
          <div className="press__title-row">
            <h2 className="press__title">
              <span className="press__title-text">The Kulhad Times</span>
            </h2>
            <p className="press__hindi" lang="hi" aria-hidden="true">
              कुल्हड़ टाइम्स
            </p>
          </div>
          <p className="press__dateline">
            <span>Vol. 26</span>
            <span>Delhi NCR</span>
            <span>October 2026</span>
            <span>Price: one cutting chai</span>
          </p>
          <p className="press__tagline">All the builds that are fit to print</p>
        </header>

        <div className="press__art">
          <div className="press__art-figure" aria-hidden="true">
            <Kulhad />
          </div>
          <BriefCard order={rest.length + 1} placement="pinned" />
        </div>

        <div className="press__collage">
          <ClippingCard item={lead} lead order={0} />
          {rest.map((item, i) => (
            <ClippingCard key={item.id} item={item} lead={false} order={i + 1} />
          ))}
          <BriefCard order={rest.length + 1} placement="flow" />
        </div>
      </div>
    </Drawer>
  );
}
