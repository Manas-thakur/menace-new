import { Component, lazy, Suspense, useEffect, useState, type ComponentType, type ReactNode } from 'react';
import { gsap, ScrollTrigger, useGSAP } from './lib/gsap';
import { flags, prefersReducedMotion } from './lib/motion';
import { keepFocusVisible, naturalTop, startSmoothScroll } from './lib/scroll';
import { SvgDefs } from './components/primitives/Print';
import { Kit } from './components/primitives/Kit';
import { RooftopCover } from './sections/Rooftop/RooftopCover';
import { INTRO_DONE } from './lib/intro';
import { Navbar } from './sections/Navbar/Navbar';
import { DeepToast } from './components/deep/DeepToast';
import { LinerNotes } from './components/deep/LinerNotes';

export type SectionProps = { index: number };

/* The lake cover (मानसरोवर) is saved, not shipped on the page: its own chunk, at /?only=lake. */
const LakePage = lazy(() => import('./sections/Lake/Lake').then((m) => ({ default: m.LakePage })));
/* So is the arch-window cover (Humayun's Tomb under Delhi's sky): at /?only=arch. */
const ArchCover = lazy(() => import('./sections/Hero/Hero').then((m) => ({ default: m.Hero })));
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

/**
 * How many drawers are on the page so far. Mounting all eight in one go asks a phone
 * to style and lay out the whole record in a single frame (seconds on a weak one),
 * right while the hero's intro is playing. So the intro gets the main thread to
 * itself, then the drawers arrive one per task, top first, with a frame painted in
 * between. A visitor who scrolls, taps or presses a key early starts them at once.
 */
function useMountedCount(total: number, loaded: boolean, immediate: boolean) {
  const [count, setCount] = useState(0);
  const [started, setStarted] = useState(immediate);

  useEffect(() => {
    if (started) return;
    const go = () => setStarted(true);
    const events = ['wheel', 'touchstart', 'keydown', 'pointerdown', 'scroll'] as const;
    events.forEach((e) => window.addEventListener(e, go, { once: true, passive: true }));
    window.addEventListener(INTRO_DONE, go, { once: true });
    const fallback = window.setTimeout(go, 3600);
    return () => {
      events.forEach((e) => window.removeEventListener(e, go));
      window.removeEventListener(INTRO_DONE, go);
      window.clearTimeout(fallback);
    };
  }, [started]);

  useEffect(() => {
    if (!loaded || !started || count >= total) return;
    let timer = 0;
    // after the last drawer's frame has painted, in a fresh task
    const raf = requestAnimationFrame(() => {
      timer = window.setTimeout(() => setCount((c) => c + 1), 0);
    });
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(timer);
    };
  }, [loaded, started, count, total]);

  return count;
}

/**
 * A drawer that the next one has slid over completely is out of sight, at every
 * screen size: mark it covered so its loops pause and it is not painted. (Pinned
 * drawers still "intersect" the viewport, so the IntersectionObserver can't tell.)
 */
function useCoveredDrawers(ready: boolean) {
  useGSAP(
    () => {
      if (!ready) return;
      const drawers = gsap.utils.toArray<HTMLElement>('.drawer');
      drawers.forEach((el, i) => {
        const next = drawers[i + 1];
        if (!next) return;
        ScrollTrigger.create({
          start: () => naturalTop(next),
          end: 'max',
          invalidateOnRefresh: true,
          onToggle: (self) => {
            el.dataset.covered = String(self.isActive);
          },
        });
      });
    },
    { dependencies: [ready] }
  );
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
  const mounted = useMountedCount(DRAWERS.length, sections !== null, flags.noIntro || prefersReducedMotion());
  const ready = sections !== null && mounted >= DRAWERS.length;

  useEffect(() => {
    const stop = startSmoothScroll();
    const release = keepFocusVisible();
    return () => {
      release();
      stop();
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    // Drawer heights settle once web fonts land; re-measure every trigger then.
    document.fonts.ready.then(() => ScrollTrigger.refresh());
  }, [ready]);

  useCoveredDrawers(ready);
  useStackRecede(ready);

  return (
    <>
      <SvgDefs />
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <div className="stack">
        <RooftopCover index={0} />
        <Navbar />
        {/* holds the record's length while drawers are still arriving, so the page can scroll from the start */}
        <main id="main" style={ready ? undefined : { minHeight: `${(DRAWERS.length - mounted) * 100}svh` }}>
          {sections?.slice(0, mounted).map((Section, i) => {
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
      {isHero ? <RooftopCover index={0} /> : <Navbar />}
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
  if (flags.only === 'arch') {
    return (
      <div className="is-preview">
        <SvgDefs />
        <Suspense fallback={null}>
          <ArchCover index={0} />
        </Suspense>
        <div className="grain" aria-hidden="true" />
        <DeepToast />
        <LinerNotes />
      </div>
    );
  }
  if (flags.only === 'lake') {
    return (
      <div className="is-preview">
        <SvgDefs />
        <Suspense fallback={null}>
          <LakePage />
        </Suspense>
        <div className="grain" aria-hidden="true" />
        <LinerNotes />
      </div>
    );
  }
  if (flags.only) return <Preview id={flags.only} />;
  return <FullPage />;
}
