import { useEffect, useRef } from 'react';
import { gsap, useGSAP } from '../../lib/gsap';
import { greetings } from '../../data/profile';

type GreetingProps = {
  /** Starts cycling once the drawer's entrance has finished. */
  playing: boolean;
  reduced: boolean;
};

const CYCLE_MS = 2400;

/**
 * The drawer's h2: a slot that rolls between नमस्ते, 안녕하세요 and Hello.
 * Screen readers get a stable name; the rolling words are decorative.
 * Holds while hovered, while focus is inside the contact block, and while the
 * drawer is off-screen or covered by another drawer.
 */
export function Greeting({ playing, reduced }: GreetingProps) {
  const ref = useRef<HTMLHeadingElement>(null);

  // Park every word but the first below the slot's clip line.
  useGSAP(
    () => {
      if (reduced) return;
      gsap.set(gsap.utils.toArray<HTMLElement>('.contact__word').slice(1), { yPercent: 115 });
    },
    { scope: ref, dependencies: [reduced] }
  );

  useEffect(() => {
    const root = ref.current;
    if (!playing || reduced || !root) return;
    const words = Array.from(root.querySelectorAll<HTMLElement>('.contact__word'));
    const slot = root.querySelector<HTMLElement>('.contact__slot');
    const drawer = root.closest<HTMLElement>('.drawer');
    const block = root.closest<HTMLElement>('.contact__main');
    let current = 0;

    const ctx = gsap.context(() => {}, root);
    const id = window.setInterval(() => {
      const held =
        document.hidden ||
        root.matches(':hover') ||
        Boolean(block?.matches(':focus-within')) ||
        drawer?.dataset.offscreen === 'true' ||
        drawer?.dataset.covered === 'true';
      if (held) return;
      const next = (current + 1) % words.length;
      const out = words[current];
      const inn = words[next];
      // The slot is taller than any one word (padding + the tallest script), so
      // travel by the slot's own height to clear the clip edge completely.
      const travel = slot?.offsetHeight ?? 200;
      ctx.add(() => {
        gsap
          .timeline()
          .to(out, { y: -travel, duration: 0.5, ease: 'power3.in' })
          .fromTo(inn, { y: travel, yPercent: 0 }, { y: 0, duration: 0.85, ease: 'expoOut' }, 0.22);
      });
      current = next;
    }, CYCLE_MS);

    return () => {
      window.clearInterval(id);
      ctx.kill();
    };
  }, [playing, reduced]);

  return (
    <h2 ref={ref} className={`contact__hello ${reduced ? 'is-static' : ''}`}>
      <span className="visually-hidden">Say hello</span>
      <span className="contact__slot" aria-hidden="true">
        {greetings.map((g) => (
          <span key={g.lang} lang={g.lang} className={`contact__word contact__word--${g.script}`}>
            {g.text}
          </span>
        ))}
      </span>
    </h2>
  );
}
