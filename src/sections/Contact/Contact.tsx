import { useRef, useState } from 'react';
import type { SectionProps } from '../../App';
import { Drawer } from '../../components/primitives/Drawer';
import { gsap, useGSAP } from '../../lib/gsap';
import { drawerOf, onDrawerEnter } from '../../lib/enter';
import { useReducedMotion } from '../../lib/motion';
import { scrollToSection } from '../../lib/scroll';
import { profile } from '../../data/profile';
import { Record } from './Record';
import { Greeting } from './Greeting';
import { CopyEmail } from './CopyEmail';
import { Clocks } from './Clocks';
import './Contact.css';

const LINKS: { label: string; note?: string; href: string; primary?: boolean }[] = [
  { label: 'GitHub', href: profile.links.github },
  { label: 'LinkedIn', href: profile.links.linkedin },
  { label: 'X', note: profile.handle, href: profile.links.x },
  { label: 'Résumé', href: profile.links.resume, primary: true },
];

/**
 * Side B — the bookend to the hero's Side A dial. A huge record spins up at the
 * bottom-right while the greeting rolls through Delhi, Daegu and Palo Alto.
 */
export function Contact({ index }: SectionProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const [playing, setPlaying] = useState(false);
  const year = new Date().getFullYear();

  useGSAP(
    () => {
      const root = rootRef.current;
      const drawer = drawerOf(root);
      if (reduced || !root || !drawer) return;

      // The record's CSS spin starts at a standstill and is brought up to speed
      // on entrance, like a turntable motor.
      const spin = root.querySelector<SVGSVGElement>('.contact__spin');
      const motors = spin?.getAnimations?.() ?? [];
      motors.forEach((a) => (a.playbackRate = 0));

      gsap.set('.contact__record-move', { xPercent: 14, yPercent: 10, opacity: 0 });
      gsap.set('.contact__word:first-child', { yPercent: 115 });
      gsap.set('[data-rise]', { y: 28, opacity: 0 });

      const trigger = onDrawerEnter(drawer, () => {
        const tl = gsap.timeline({ onComplete: () => setPlaying(true) });
        tl.to('.contact__record-move', { xPercent: 0, yPercent: 0, opacity: 1, duration: 1.3, ease: 'expoOut' }, 0)
          .to('.contact__word:first-child', { yPercent: 0, duration: 0.9, ease: 'expoOut' }, 0.12)
          .to('[data-rise]', { y: 0, opacity: 1, duration: 0.8, ease: 'expoOut', stagger: 0.07 }, 0.3);
        if (motors.length) tl.to(motors, { playbackRate: 1, duration: 1.4, ease: 'power2.in' }, 0);
      });

      return () => {
        trigger.kill();
        motors.forEach((a) => (a.playbackRate = 1));
      };
    },
    { scope: rootRef, dependencies: [reduced] }
  );

  return (
    <Drawer id="contact" index={index} label="Contact" className="contact">
      <div ref={rootRef} className="contact__wrap">
        <div className="contact__pattern" aria-hidden="true">
          <div className="tx tx-mandala" />
        </div>

        <div className="contact__record" aria-hidden="true">
          <div className="contact__record-move">
            <Record className="contact__spin loop" />
            <div className="contact__sheen" />
          </div>
        </div>

        <div className="contact__main">
          <Greeting playing={playing} reduced={reduced} />
          <p className="contact__lede" data-rise>
            Got a hard problem? Send it over.
          </p>
          <CopyEmail />
          <ul className="contact__links" data-rise>
            {LINKS.map((l) => (
              <li key={l.href}>
                <a className={`contact__pill ${l.primary ? 'contact__pill--primary' : ''}`} href={l.href} target="_blank" rel="noreferrer">
                  {l.label}
                  {l.note && <span className="contact__pill-note">· {l.note}</span>}
                  <span aria-hidden="true">↗</span>
                  <span className="visually-hidden"> (opens in a new tab)</span>
                </a>
              </li>
            ))}
          </ul>
          <Clocks />
        </div>

        <footer className="contact__foot" data-rise>
          <p className="contact__copyright">
            © {year} {profile.name} · Delhi NCR
          </p>
          <p className="contact__colophon">Set in Pirata One, Barlow Condensed, Dela Gothic One &amp; Newsreader.</p>
          <button type="button" className="contact__top" onClick={() => scrollToSection('top')}>
            Back to top <span aria-hidden="true">↑</span>
          </button>
        </footer>
      </div>
    </Drawer>
  );
}
