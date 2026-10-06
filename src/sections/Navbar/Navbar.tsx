import { useEffect, useRef, useState } from 'react';
import { gsap, ScrollTrigger, useGSAP } from '../../lib/gsap';
import { prefersReducedMotion } from '../../lib/motion';
import { lockScroll, naturalTop, scrollToSection } from '../../lib/scroll';
import { profile } from '../../data/profile';
import './Navbar.css';

const LINKS = [
  { id: 'about', label: 'About' },
  { id: 'press', label: 'Press' },
  { id: 'work', label: 'Work' },
  { id: 'projects', label: 'Projects' },
  { id: 'numbers', label: 'Numbers' },
  { id: 'community', label: 'Community' },
  { id: 'photos', label: 'Photos' },
  { id: 'contact', label: 'Contact' },
];

export function VinylMark({ className = '' }: { className?: string }) {
  return (
    <svg className={`vinyl-mark ${className}`} viewBox="0 0 64 64" aria-hidden="true">
      <circle cx="32" cy="32" r="31" className="vinyl-mark__disc" />
      <circle cx="32" cy="32" r="25" className="vinyl-mark__groove" />
      <circle cx="32" cy="32" r="20" className="vinyl-mark__groove" />
      <circle cx="32" cy="32" r="14" className="vinyl-mark__label" />
      <path d="M24 37V27l4 6 4-6v10M34 27h8m-4 0v10" className="vinyl-mark__mono" />
      <circle cx="32" cy="32" r="1.8" className="vinyl-mark__hole" />
    </svg>
  );
}

export function Navbar() {
  const [active, setActive] = useState<string>('');
  const [open, setOpen] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const turnRef = useRef<HTMLSpanElement>(null);

  // Track the drawer currently filling the viewport, from natural (unpinned) positions.
  useEffect(() => {
    let tops: { id: string; top: number }[] = [];
    const measure = () => {
      tops = LINKS.map(({ id }) => {
        const el = document.getElementById(id);
        return { id, top: el ? naturalTop(el) : Infinity };
      });
    };
    const update = (y: number) => {
      // Drawers below the hero load lazily; measure again until they all exist.
      if (tops.some((t) => !Number.isFinite(t.top))) measure();
      const probe = y + window.innerHeight * 0.45;
      let current = '';
      for (const t of tops) if (probe >= t.top) current = t.id;
      setActive((prev) => (prev === current ? prev : current));
    };
    const remeasure = () => {
      measure();
      update(window.scrollY);
    };
    measure();
    // the record in the bar turns as the page plays: about a third of a turn per screen
    const still = prefersReducedMotion();
    const turn = (y: number) => {
      if (!still && turnRef.current) turnRef.current.style.rotate = `${((y / window.innerHeight) * 120).toFixed(1)}deg`;
    };
    const st = ScrollTrigger.create({
      start: 0,
      end: 'max',
      onUpdate: (self) => {
        update(self.scroll());
        turn(self.scroll());
      },
    });
    ScrollTrigger.addEventListener('refresh', remeasure);
    update(window.scrollY);
    return () => {
      st.kill();
      ScrollTrigger.removeEventListener('refresh', remeasure);
    };
  }, []);

  // Sheet open/close: circular reveal from the menu button, links rise in.
  useGSAP(
    () => {
      const sheet = sheetRef.current;
      if (!sheet) return;
      const reduced = prefersReducedMotion();
      const btn = toggleRef.current?.getBoundingClientRect();
      const cx = btn ? btn.left + btn.width / 2 : window.innerWidth - 40;
      const cy = btn ? btn.top + btn.height / 2 : 30;
      const r = Math.hypot(Math.max(cx, window.innerWidth - cx), Math.max(cy, window.innerHeight - cy));
      const items = sheet.querySelectorAll('.nav-sheet__link, .nav-sheet__foot');
      if (open) {
        gsap.set(sheet, { visibility: 'visible' });
        if (reduced) {
          gsap.fromTo(sheet, { opacity: 0 }, { opacity: 1, duration: 0.15 });
          return;
        }
        gsap.fromTo(
          sheet,
          { clipPath: `circle(0px at ${cx}px ${cy}px)` },
          { clipPath: `circle(${r}px at ${cx}px ${cy}px)`, duration: 0.7, ease: 'expoOut' }
        );
        gsap.fromTo(items, { yPercent: 110, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.6, stagger: 0.045, delay: 0.12, ease: 'riot' });
      } else {
        if (reduced) {
          gsap.to(sheet, { opacity: 0, duration: 0.15, onComplete: () => gsap.set(sheet, { visibility: 'hidden' }) });
          return;
        }
        gsap.to(sheet, {
          clipPath: `circle(0px at ${cx}px ${cy}px)`,
          duration: 0.45,
          ease: 'power3.in',
          onComplete: () => gsap.set(sheet, { visibility: 'hidden' }),
        });
      }
    },
    { dependencies: [open] }
  );

  useEffect(() => {
    lockScroll(open, 'menu');
    if (!open) return;
    // the sheet is modal: everything behind it leaves the tab order until it closes
    const behind = document.querySelectorAll<HTMLElement>('.skip-link, #top, #main');
    behind.forEach((el) => (el.inert = true));
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        toggleRef.current?.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    sheetRef.current?.querySelector<HTMLElement>('a, button')?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      behind.forEach((el) => (el.inert = false));
    };
  }, [open]);

  const go = (id: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    // the open sheet holds the page still; let go before moving it, or the scroll is dropped
    lockScroll(false, 'menu');
    setOpen(false);
    scrollToSection(id);
  };

  return (
    <header className="navbar">
      <a className="navbar__brand" href="#top" onClick={go('top')} aria-label={`${profile.first} ${profile.last} — back to top`} inert={open}>
        <span ref={turnRef} className="navbar__turn">
          <VinylMark className="navbar__mark" />
        </span>
        <span className="navbar__name">
          {profile.first} {profile.last}
        </span>
      </a>

      <nav className="navbar__nav" aria-label="Sections" inert={open}>
        <ul className="navbar__list">
          {LINKS.map((l) => (
            <li key={l.id}>
              <a
                href={`#${l.id}`}
                className={`navbar__link ${active === l.id ? 'is-active' : ''}`}
                aria-current={active === l.id ? 'true' : undefined}
                onClick={go(l.id)}
              >
                {l.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <a className="navbar__cta" href={profile.links.resume} target="_blank" rel="noreferrer" inert={open}>
        Résumé <span aria-hidden="true">↗</span>
      </a>

      <button
        ref={toggleRef}
        className="navbar__toggle"
        type="button"
        aria-expanded={open}
        aria-controls="nav-sheet"
        onClick={() => setOpen((o) => !o)}
      >
        <span className="navbar__toggle-bars" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
        {open ? 'Close' : 'Menu'}
      </button>

      <div id="nav-sheet" ref={sheetRef} className="nav-sheet" role="dialog" aria-modal="true" aria-label="Menu" inert={!open}>
        <div className="nav-sheet__mandala tx tx-mandala" aria-hidden="true" />
        <ul className="nav-sheet__list">
          {LINKS.map((l) => (
            <li key={l.id} className="nav-sheet__row">
              <a href={`#${l.id}`} className="nav-sheet__link" onClick={go(l.id)} tabIndex={open ? 0 : -1}>
                {l.label}
              </a>
            </li>
          ))}
        </ul>
        <div className="nav-sheet__foot">
          <a href={`mailto:${profile.email}`} tabIndex={open ? 0 : -1}>
            {profile.email}
          </a>
          <a href={profile.links.resume} target="_blank" rel="noreferrer" tabIndex={open ? 0 : -1}>
            Résumé ↗
          </a>
        </div>
      </div>
    </header>
  );
}
