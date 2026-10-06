import { useCallback, useEffect, useRef, useState } from 'react';
import type { SectionProps } from '../../App';
import { Drawer } from '../../components/primitives/Drawer';
import { gsap, useGSAP } from '../../lib/gsap';
import { drawerOf, onDrawerEnter } from '../../lib/enter';
import { useReducedMotion } from '../../lib/motion';
import { scrollToSection } from '../../lib/scroll';
import { discover } from '../../lib/deep';
import { profile } from '../../data/profile';
import { Record } from './Record';
import { Deck } from './Deck';
import { HiddenTrack } from './HiddenTrack';
import { NotesButton } from './NotesButton';
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
 * Side A is what I show; Side B is what I mean: the run-out groove is etched, and
 * the centre hole plays a hidden track.
 */
export function Contact({ index }: SectionProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const recordRef = useRef<HTMLDivElement>(null);
  const holeRef = useRef<HTMLButtonElement>(null);
  const reduced = useReducedMotion();
  const [playing, setPlaying] = useState(false);
  const [track, setTrack] = useState(false);
  const [run, setRun] = useState(0);
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

      gsap.set('.contact__record', { xPercent: 14, yPercent: 10, opacity: 0 });
      gsap.set('.contact__word:first-child', { yPercent: 115 });
      gsap.set('[data-rise]', { y: 28, opacity: 0 });

      const trigger = onDrawerEnter(drawer, () => {
        const tl = gsap.timeline({ onComplete: () => setPlaying(true) });
        tl.to('.contact__record', { xPercent: 0, yPercent: 0, opacity: 1, duration: 1.3, ease: 'expoOut', clearProps: 'transform' }, 0)
          .to('.contact__word:first-child', { yPercent: 0, duration: 0.9, ease: 'expoOut' }, 0.12)
          .to('[data-rise]', { y: 0, opacity: 1, duration: 0.8, ease: 'expoOut', stagger: 0.07, clearProps: 'opacity,transform' }, 0.3);
        if (motors.length) tl.to(motors, { playbackRate: 1, duration: 1.4, ease: 'power2.in' }, 0);
      });

      return () => {
        trigger.kill();
        motors.forEach((a) => (a.playbackRate = 1));
      };
    },
    { scope: rootRef, dependencies: [reduced] }
  );

  const play = useCallback(() => {
    discover('hidden');
    setTrack(true);
    setRun((r) => r + 1);
  }, []);

  const stop = useCallback((returnFocus: boolean) => {
    setTrack(false);
    if (returnFocus) holeRef.current?.focus({ preventScroll: true });
  }, []);

  // While the hidden track plays: Esc or a click anywhere else ends it. The liner
  // notes dialog and the deep-cut toast can be used on top without ending it.
  useEffect(() => {
    if (!track) return;
    const overlay = (t: EventTarget | null) => t instanceof Element && Boolean(t.closest('dialog[open], .deep-toast-region'));
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || document.querySelector('dialog[open]')) return;
      e.preventDefault();
      stop(true);
    };
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (overlay(e.target) || rootRef.current?.querySelector('.contact__hidden')?.contains(t) || holeRef.current?.contains(t)) return;
      stop(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onDown);
    };
  }, [track, stop]);

  return (
    <Drawer id="contact" index={index} label="Contact" className="contact">
      <div ref={rootRef} className={`contact__wrap ${track ? 'is-track' : ''}`}>
        <div className="contact__pattern" aria-hidden="true">
          <div className="tx tx-mandala" />
        </div>

        {/* The platter: the record sits under the content, its controls above it */}
        <div className="contact__platter">
          <div ref={recordRef} className="contact__record" aria-hidden="true">
            <Record className="contact__spin loop" />
            <div className="contact__sheen" />
          </div>
          <Deck recordRef={recordRef} holeRef={holeRef} reduced={reduced} track={track} run={run} onPlay={play} />
        </div>

        <div className="contact__main" inert={track}>
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

        <HiddenTrack open={track} run={run} reduced={reduced} onClose={() => stop(true)} originRef={holeRef} />

        <footer className="contact__foot" data-rise inert={track}>
          <p className="contact__copyright">
            © {year} {profile.name} · Delhi NCR
          </p>
          <p className="contact__colophon">Set in Cormorant Garamond, Pirata One, Barlow Condensed, Dela Gothic One &amp; Newsreader. Sanskrit in Tiro Devanagari.</p>
          <div className="contact__actions">
            <NotesButton />
            <button type="button" className="contact__top" onClick={() => scrollToSection('top')}>
              Back to top <span aria-hidden="true">↑</span>
            </button>
          </div>
        </footer>
      </div>
    </Drawer>
  );
}
