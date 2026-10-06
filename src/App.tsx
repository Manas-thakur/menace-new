import { Component, useEffect, useState, type ComponentType, type ReactNode } from 'react';
import { gsap, ScrollTrigger, useGSAP } from './lib/gsap';
import { flags, prefersReducedMotion } from './lib/motion';
import { naturalTop, startSmoothScroll } from './lib/scroll';
import { SvgDefs } from './components/primitives/Print';
import { Kit } from './components/primitives/Kit';
import { Hero } from './sections/Hero/Hero';
import { Navbar } from './sections/Navbar/Navbar';
import { DeepToast } from './components/deep/DeepToast';
import { LinerNotes } from './components/deep/LinerNotes';

export type SectionProps = { index: number };
type Section = ComponentType<SectionProps>;

/* The hero ships in the main bundle for a fast first paint; the drawers below the
 * fold are code-split and fetched in parallel. A drawer that fails to load renders
 * a quiet placeholder instead of taking the whole page down. */
const DRAWERS: { id: string; label: string; load: () => Promise<Section> }[] = [
  { id: 'about', label: 'About', load: () => import('./sections/About/About').then((m) => m.About) },
  { id: 'press', label: 'Press', load: () => import('./sections/Press/Press').then((m) => m.Press) },
  { id: 'work', label: 'Work', load: () => import('./sections/Work/Work').then((m) => m.Work) },
  { id: 'projects', label: 'Projects', load: () => import('./sections/Projects/Projects').then((m) => m.Projects) },
  { id: 'numbers', label: 'Numbers', load: () => import('./sections/Numbers/Numbers').then((m) => m.Numbers) },
  { id: 'community', label: 'Community', load: () => import('./sections/Community/Community').then((m) => m.Community) },
  { id: 'photos', label: 'Photos', load: () => import('./sections/Photos/Photos').then((m) => m.Photos) },
  { id: 'contact', label: 'Contact', load: () => import('./sections/Contact/Contact').then((m) => m.Contact) },
];

/** A drawer that throws while rendering is swapped for its placeholder, so one
 * broken section never takes the rest of the record down with it. */
class DrawerBoundary extends Component<{ id: string; label: string; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: unknown) {
    console.error(`[drawer:${this.props.id}]`, error);
  }
  render() {
    return this.state.failed ? <Unavailable id={this.props.id} label={this.props.label} /> : this.props.children;
  }
}

function Unavailable({ id, label }: { id: string; label: string }) {
  return (
    <section id={id} className="drawer drawer--unavailable" aria-label={label}>
      <p>{label} could not load.</p>
    </section>
  );
}

function useSections(ids: string[]) {
  const [sections, setSections] = useState<(Section | null)[] | null>(null);
  const key = ids.join(',');
  useEffect(() => {
    let alive = true;
    const wanted = DRAWERS.filter((d) => ids.includes(d.id));
    Promise.allSettled(wanted.map((d) => d.load())).then((results) => {
      if (!alive) return;
      results.forEach((r, i) => r.status === 'rejected' && console.error(`[drawer:${wanted[i].id}]`, r.reason));
      setSections(results.map((r) => (r.status === 'fulfilled' ? r.value : null)));
    });
    return () => {
      alive = false;
    };
  }, [key]); // `ids` is keyed by its joined value
  return sections;
}

/** Each covered drawer recedes (scales back, dims) while the next slides over it. */
function useStackRecede(ready: boolean) {
  useGSAP(
    () => {
      if (!ready) return;
      ScrollTrigger.refresh();
      if (prefersReducedMotion()) return;
      const mm = gsap.matchMedia();
      mm.add('(min-width: 48rem)', () => {
        const drawers = gsap.utils.toArray<HTMLElement>('.drawer');
        drawers.forEach((el, i) => {
          const next = drawers[i + 1];
          if (!next) return;
          const inner = el.querySelector<HTMLElement>(':scope > .drawer__inner');
          const shade = el.querySelector<HTMLElement>(':scope > .drawer__shade');
          if (!inner || !shade) return;
          // Scale around the middle of the part that is actually on screen when pinned.
          const origin = () => `50% ${Math.max(el.offsetHeight - window.innerHeight / 2, window.innerHeight / 2)}px`;
          // Promote to compositor layers only while receding, so the drawer's content
          // (SVG filters, text shadows) is rasterised once instead of every frame.
          const promote = (on: boolean) => {
            inner.style.willChange = on ? 'transform' : '';
            shade.style.willChange = on ? 'opacity' : '';
          };
          gsap
            .timeline({
              scrollTrigger: {
                start: () => naturalTop(next) - window.innerHeight,
                end: () => naturalTop(next),
                scrub: true,
                invalidateOnRefresh: true,
                onToggle: (self) => promote(self.isActive),
                onLeave: () => (el.dataset.covered = 'true'),
                onEnterBack: () => (el.dataset.covered = 'false'),
              },
            })
            .fromTo(inner, { scale: 1, transformOrigin: origin }, { scale: 0.93, ease: 'none' }, 0)
            .fromTo(shade, { opacity: 0 }, { opacity: 0.5, ease: 'none' }, 0);
        });
      });
      return () => mm.revert();
    },
    { dependencies: [ready] }
  );
}

function FullPage() {
  const sections = useSections(DRAWERS.map((d) => d.id));
  const ready = sections !== null;

  useEffect(() => {
    const stop = startSmoothScroll();
    return stop;
  }, []);

  useEffect(() => {
    if (!ready) return;
    // Drawer heights settle once web fonts land; re-measure every trigger then.
    document.fonts.ready.then(() => ScrollTrigger.refresh());
  }, [ready]);

  useStackRecede(ready);

  return (
    <>
      <SvgDefs />
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <div className="stack">
        <Hero index={0} />
        <Navbar />
        <main id="main">
          {sections?.map((Section, i) => {
            const d = DRAWERS[i];
            return Section ? (
              <DrawerBoundary key={d.id} id={d.id} label={d.label}>
                <Section index={i + 1} />
              </DrawerBoundary>
            ) : (
              <Unavailable key={d.id} id={d.id} label={d.label} />
            );
          })}
        </main>
      </div>
      <div className="grain" aria-hidden="true" />
      <DeepToast />
      <LinerNotes />
    </>
  );
}

function Preview({ id }: { id: string }) {
  const isHero = id === 'top';
  const sections = useSections(isHero ? [] : [id]);
  const Section = sections?.[0];
  const index = DRAWERS.findIndex((d) => d.id === id) + 1;
  useEffect(() => {
    if (sections) document.fonts.ready.then(() => ScrollTrigger.refresh());
  }, [sections]);
  return (
    <div className="is-preview">
      <SvgDefs />
      {isHero ? <Hero index={0} /> : <Navbar />}
      {!isHero && Section && (
        <DrawerBoundary id={id} label={id}>
          <Section index={index} />
        </DrawerBoundary>
      )}
      {!isHero && sections && !Section && <Unavailable id={id} label={id} />}
      <div className="grain" aria-hidden="true" />
      <DeepToast />
      <LinerNotes />
    </div>
  );
}

export default function App() {
  if (flags.only === 'kit') {
    return (
      <>
        <SvgDefs />
        <Kit />
      </>
    );
  }
  if (flags.only) return <Preview id={flags.only} />;
  return <FullPage />;
}
