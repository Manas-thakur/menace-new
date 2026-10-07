import { useRef } from 'react';
import type { SectionProps } from '../../App';
import { Drawer } from '../../components/primitives/Drawer';
import { gsap, ScrollTrigger, SplitText, useGSAP } from '../../lib/gsap';
import { drawerOf, onDrawerEnter } from '../../lib/enter';
import { prefersReducedMotion } from '../../lib/motion';
import { naturalTop, scrollToSection } from '../../lib/scroll';
import { stages } from '../../data/profile';
import { PosterWall } from './PosterWall';
import { TourDates } from './TourDates';
import './Work.css';

const WORDS = ['Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve'];
const say = (n: number) => WORDS[n] ?? String(n);
const stageCount = say(stages.length);
const zoneCount = say(new Set(stages.map((s) => s.zone)).size);

/**
 * WORK — "On Tour". Studied from the reference's pronite drawer: an endless wall
 * of gig posters behind a huge outlined title, then the tour dates.
 */
export function Work({ index }: SectionProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLOListElement>(null);

  useGSAP(
    () => {
      const root = rootRef.current;
      const drawer = drawerOf(root);
      if (!root || !drawer || prefersReducedMotion()) return;

      const title = root.querySelector<HTMLElement>('.work__title')!;
      const lines = root.querySelectorAll('.work__line');
      const cue = root.querySelector('.work__cue');
      const wall = root.querySelector('.wall');
      const split = SplitText.create(title, { type: 'chars' });

      // Letters rise out of a slot at the baseline; the clip lifts once they land.
      gsap.set(title, { clipPath: 'inset(-40% -6% -6% -6%)' });
      gsap.set(split.chars, { yPercent: 105 });
      gsap.set(lines, { yPercent: 60, opacity: 0 });
      gsap.set(cue, { y: 14, opacity: 0 });
      gsap.set(wall, { opacity: 0, scale: 1.06 });

      onDrawerEnter(drawer, () => {
        gsap
          .timeline({ defaults: { ease: 'expoOut' } })
          .to(wall, { opacity: 1, scale: 1, duration: 1.35 }, 0)
          .to(split.chars, { yPercent: 0, duration: 0.95, stagger: 0.035, ease: 'riot' }, 0.08)
          .set(title, { clearProps: 'clipPath' })
          .to(lines, { yPercent: 0, opacity: 1, duration: 0.8, stagger: 0.08 }, 0.38)
          .to(cue, { y: 0, opacity: 1, duration: 0.6 }, 0.7);
      });

      // The passes drop onto the rail, one by one, when the rail comes into view.
      const list = listRef.current;
      if (list) {
        const passes = list.querySelectorAll('.pass-hang');
        gsap.set(passes, { y: -90, opacity: 0 });
        ScrollTrigger.create({
          start: () => naturalTop(list) - window.innerHeight * 0.85,
          end: 'max',
          once: true,
          invalidateOnRefresh: true,
          onEnter: () => gsap.to(passes, { y: 0, opacity: 1, duration: 1.1, stagger: 0.08, ease: 'elastic.out(1, 0.55)' }),
        });
      }

      return () => split.revert();
    },
    { scope: rootRef }
  );

  return (
    <Drawer id="work" index={index} label="Work" className="work">
      <div ref={rootRef} className="work__root">
        <div className="work__stage">
          <PosterWall />
          <div className="work__vignette" aria-hidden="true" />

          <div className="work__headline">
            <h2 className="work__title">On Tour</h2>
            <p className="work__sub">
              <span className="work__line">{stageCount} stages.</span>
              <span className="work__line work__line--gold">{zoneCount} time zones.</span>
            </p>
            <a
              className="work__cue"
              href="#tour-dates"
              onClick={(e) => {
                e.preventDefault();
                scrollToSection('tour-dates');
              }}
            >
              See the dates <span aria-hidden="true">↓</span>
            </a>
          </div>
        </div>

        <TourDates listRef={listRef} />
      </div>
    </Drawer>
  );
}
