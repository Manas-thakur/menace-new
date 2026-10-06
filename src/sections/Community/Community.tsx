import { useRef, type CSSProperties } from 'react';
import type { SectionProps } from '../../App';
import { Drawer } from '../../components/primitives/Drawer';
import { gsap, useGSAP } from '../../lib/gsap';
import { prefersReducedMotion } from '../../lib/motion';
import { drawerOf, onDrawerEnter } from '../../lib/enter';
import { community, profile } from '../../data/profile';
import { CommemorativeStamp } from './CommemorativeStamp';
import { StackList } from './StackList';
import { AutoRickshaw } from './AutoRickshaw';
import { BLOB_NARROW, BLOB_WIDE, ROAD, maskUri } from './shapes';
import './Community.css';

const blobMasks = {
  '--blob-wide': maskUri(BLOB_WIDE),
  '--blob-narrow': maskUri(BLOB_NARROW),
} as CSSProperties;

export function Community({ index }: SectionProps) {
  const rootRef = useRef<HTMLDivElement>(null);

  // Signature entrance: the intro rises, the stamp slides in, then the postmark
  // thunks onto it and the stamp shudders from the impact.
  useGSAP(
    (_context, contextSafe) => {
      const root = rootRef.current;
      const drawer = drawerOf(root);
      if (!root || !drawer || prefersReducedMotion()) return;

      const q = gsap.utils.selector(root);
      const intro = q('.community__title, .community__lede, .community__item, .community__links');
      const stamp = q('.cstamp')[0];
      const postmark = q('.cstamp__postmark')[0];

      gsap.set(intro, { autoAlpha: 0, y: 28 });
      gsap.set(stamp, { autoAlpha: 0, xPercent: 16, yPercent: 6, rotation: 8 });
      gsap.set(postmark, { autoAlpha: 0, scale: 1.6, rotation: -16, transformOrigin: '30% 50%' });

      const play = contextSafe!(() => {
        gsap
          .timeline()
          .to(intro, { autoAlpha: 1, y: 0, duration: 0.8, stagger: 0.06, ease: 'expoOut' }, 0)
          .to(stamp, { autoAlpha: 1, xPercent: 0, yPercent: 0, rotation: 0, duration: 0.95, ease: 'expoOut' }, 0.12)
          .to(postmark, { autoAlpha: 0.78, scale: 1, rotation: 0, duration: 0.4, ease: 'slap' }, 0.78)
          .to(
            stamp,
            { keyframes: { x: [0, -6, 5, -2, 0], rotation: [0, -0.9, 0.7, -0.25, 0] }, duration: 0.32, ease: 'none' },
            0.86
          );
      });

      const trigger = onDrawerEnter(drawer, play);
      return () => trigger.kill();
    },
    { scope: rootRef }
  );

  return (
    <Drawer id="community" index={index} label="Community" className="community">
      <div ref={rootRef} className="community__root">
        <div className="tx tx-mandala community__mandala" aria-hidden="true" />
        <div className="tx tx-halftone community__dots" aria-hidden="true" />

        <div className="community__a">
          <div className="community__intro">
            <div className="community__blob-wrap" aria-hidden="true">
              <div className="community__blob" style={blobMasks}>
                <div className="tx tx-jaali community__jaali" />
              </div>
            </div>

            <h2 className="community__title">Community</h2>
            <p className="community__lede">Leading, mentoring, hacking.</p>

            <ul className="community__list">
              {community.map((c) => (
                <li className="community__item" key={c.role + c.org}>
                  <span className="community__role">{c.role}</span>
                  <span className="community__leader" aria-hidden="true" />
                  <span className="community__org">{c.org}</span>
                  <span className="community__when">{c.when}</span>
                </li>
              ))}
            </ul>

            <div className="community__links">
              <a className="community__pill" href={profile.links.github} target="_blank" rel="noreferrer">
                GitHub <span aria-hidden="true">↗</span>
              </a>
              <a className="community__pill" href={profile.links.linkedin} target="_blank" rel="noreferrer">
                LinkedIn <span aria-hidden="true">↗</span>
              </a>
            </div>
          </div>

          <div className="community__stamp-col">
            <CommemorativeStamp />
          </div>
        </div>

        <div className="community__b">
          <div className="community__b-head">
            <h3 className="community__stack-title">The Stack</h3>
            <p className="community__stack-lede">What I reach for, layer by layer.</p>
          </div>
          <StackList />
          <div className="community__auto">
            <AutoRickshaw />
          </div>
        </div>

        <svg className="community__road" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <path d={ROAD} />
        </svg>
      </div>
    </Drawer>
  );
}
