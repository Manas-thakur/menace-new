import { useEffect, useRef } from 'react';
import { gsap } from '../../lib/gsap';
import { prefersReducedMotion } from '../../lib/motion';
import type { Sky } from '../../lib/delhiSky';
import './Sparrows.css';

/* The gauraiya — the house sparrow, Delhi's state bird, and one the city is slowly
 * losing. Three of them live on the cover. They perch on what is already there (the
 * arch's tip, the stamp, the name, the ticket), turn to look if you come slowly and
 * leave if you rush them. Tap one and it chirps: चीं-चीं in Delhi, 짹짹 in Daegu.
 * They sing most at first light, like real sparrows, and when the window shows
 * Delhi's night they sleep where they sit. */

type Perch = { id: string; x: number; y: number };
type Bird = { el: HTMLElement; perch: string | null; x: number; y: number; facing: 1 | -1; flying: boolean };

const CHIRPS = [
  { text: 'चीं-चीं', lang: 'hi' },
  { text: '짹짹', lang: 'ko' },
  { text: 'chirp!', lang: 'en' },
];
const FIRST_PERCHES = ['ticket-a', 'ticket-b', 'rosette-l', 'name', 'rosette-r'];
const COUNT = 3;

function SparrowArt() {
  return (
    <svg className="sparrow__art" viewBox="0 0 64 54" focusable="false">
      <g className="sparrow__body">
        <path className="sparrow__tail" d="M17 33L3.5 22.5Q2 20.6 4.6 20.8L20 27.5Z" />
        <path className="sparrow__legs" d="M27 44.5L26 52.5M23.5 52.5H29.5M34 44.5L35 52.5M32.5 52.5H38.5" />
        <path className="sparrow__flap sparrow__flap--down" d="M23 30C17 39 21 48 31 48C32 41 31 35 30 30Z" />
        <path className="sparrow__back" d="M14 31C14 22 24 17.5 34 18C44 19 48.5 27 46.5 35C44.5 43 36.5 47 28.5 46.5C20.5 46 14 39.5 14 31Z" />
        <path className="sparrow__belly" d="M21 40C25 46.5 37 47.5 43.5 39C45.2 35.5 44.6 32 42.5 30.5C36.5 36.5 28.5 39.5 21 40Z" />
        <path className="sparrow__wing" d="M16.5 30.5C21.5 23.5 33 23.5 38.5 30C34.5 36.5 24.5 39.5 16.5 36.5Z" />
        <path className="sparrow__streaks" d="M21.5 29.5l5 4.4M26.5 28.6l5 4.4M31.5 28.6l4 3.8" />
        <path className="sparrow__bar" d="M22 35.6Q29 37.6 35.4 33.6" />
        <path className="sparrow__flap sparrow__flap--up" d="M22 27C17 13 25 3.5 34 6C34 14 31.5 22 30.5 28Z" />
        <g className="sparrow__head">
          <circle className="sparrow__crown" cx="43" cy="19" r="10.8" />
          <path className="sparrow__nape" d="M33.4 22.5C33 15 37.5 10.4 43.2 9.8C39.8 12.6 38.6 16.8 40.6 21.4C38 21.6 35.6 22 33.4 22.5Z" />
          <ellipse className="sparrow__cheek" cx="45.6" cy="23.4" rx="5.6" ry="4.3" />
          <path className="sparrow__bib" d="M47.2 26.2C49.6 26.8 51.2 28.2 50.4 30.6C48.6 33.6 44.6 34.4 41.6 32.2C43.6 30.6 45.6 28.6 47.2 26.2Z" />
          <path className="sparrow__beak" d="M51.6 16.6L58.6 19.6L51.6 22Z" />
          <g className="sparrow__eye">
            <circle className="sparrow__pupil" cx="47.2" cy="17.4" r="2.3" />
            <circle className="sparrow__glint" cx="48" cy="16.6" r="0.75" />
          </g>
          <path className="sparrow__shut" d="M44.8 17.8Q47.2 19.8 49.6 17.8" />
        </g>
      </g>
    </svg>
  );
}

export function Sparrows({ sky, ready }: { sky: Sky; ready: boolean }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const els = useRef<HTMLSpanElement[]>([]);
  const skyRef = useRef(sky);
  skyRef.current = sky;

  useEffect(() => {
    const root = rootRef.current;
    const stage = root?.parentElement;
    if (!root || !stage || !ready) return;
    const reduced = prefersReducedMotion();
    const birds: Bird[] = els.current.slice(0, COUNT).map((el) => ({ el, perch: null, x: 0, y: 0, facing: 1, flying: false }));
    const timers = new Set<number>();
    const later = (fn: () => void, ms: number) => {
      const id = window.setTimeout(() => {
        timers.delete(id);
        fn();
      }, ms);
      timers.add(id);
    };
    const away = () => document.hidden || !!root.closest('[data-offscreen="true"], [data-covered="true"]');
    const asleep = () => skyRef.current === 'night';

    /* ── perches: anything on the cover marked data-perch, wherever it is now ── */
    let perches: Perch[] = [];
    const scale = () => {
      const s = stage.getBoundingClientRect();
      return { s, k: stage.clientWidth / (s.width || 1) };
    };
    const measure = () => {
      const { s, k } = scale();
      // a perch only counts if a bird standing on it would be wholly on the cover
      const bw = birds[0]?.el.offsetWidth ?? 40;
      const bh = birds[0]?.el.offsetHeight ?? 34;
      perches = Array.from(stage.querySelectorAll<HTMLElement>('[data-perch]'))
        .filter((p) => p.getClientRects().length > 0)
        .map((p) => {
          const r = p.getBoundingClientRect();
          return { id: p.dataset.perch!, x: (r.left + r.width / 2 - s.left) * k, y: (r.top + r.height / 2 - s.top) * k };
        })
        .filter((p) => p.y > bh + 4 && p.x > bw / 2 && p.x < stage.clientWidth - bw / 2 && p.y < stage.clientHeight - 4);
    };
    const perchOf = (id: string | null) => perches.find((p) => p.id === id);
    const freePerches = (except?: string | null) => perches.filter((p) => p.id !== except && !birds.some((b) => b.perch === p.id));

    /* ── one bird ── */
    const place = (b: Bird, x: number, y: number) => {
      b.x = x;
      b.y = y;
      gsap.set(b.el, { x: x - b.el.offsetWidth * 0.47, y: y - b.el.offsetHeight * 0.97 });
    };
    const face = (b: Bird, dir: 1 | -1) => {
      if (b.facing === dir) return;
      b.facing = dir;
      gsap.set(b.el.querySelector('.sparrow__flip'), { scaleX: dir });
    };
    const faceIn = (b: Bird) => face(b, b.x < stage.clientWidth / 2 ? 1 : -1);
    const part = (b: Bird, name: string) => b.el.querySelector(`.sparrow__${name}`);

    const land = (b: Bird) => {
      b.flying = false;
      b.el.classList.remove('is-flying');
      faceIn(b);
      if (!reduced) gsap.fromTo(part(b, 'body'), { scaleX: 1.1, scaleY: 0.84 }, { scaleX: 1, scaleY: 1, duration: 0.55, ease: 'elastic.out(1, 0.5)', svgOrigin: '30 52' });
    };

    const fly = (b: Bird, to: Perch, delay = 0) => {
      b.perch = to.id;
      b.flying = true;
      const x0 = b.x;
      const y0 = b.y;
      const dx = to.x - x0;
      const cx = (x0 + to.x) / 2;
      const cy = Math.min(y0, to.y) - 70 - Math.abs(dx) * 0.12;
      const p = { t: 0 };
      gsap.to(p, {
        t: 1,
        delay,
        duration: 0.75 + Math.hypot(dx, to.y - y0) / 1100,
        ease: 'power1.inOut',
        onStart: () => {
          b.el.classList.add('is-flying');
          face(b, dx >= 0 ? 1 : -1);
        },
        onUpdate: () => {
          const t = p.t;
          const u = 1 - t;
          // a perch can move under a bird in flight (the page resizes): aim for where it is now
          const dest = perchOf(b.perch) ?? to;
          place(b, u * u * x0 + 2 * u * t * cx + t * t * dest.x, u * u * y0 + 2 * u * t * cy + t * t * dest.y);
        },
        onComplete: () => land(b),
      });
    };

    const takeOff = (b: Bird) => {
      const options = freePerches(b.perch);
      if (!options.length || b.flying) return;
      const from = b.perch;
      fly(b, options[Math.floor(Math.random() * options.length)]);
      // a neighbour on the same ticket often goes too
      for (const o of birds) {
        if (o === b || o.flying || !o.perch || !from) continue;
        if (o.perch.startsWith('ticket') && from.startsWith('ticket') && Math.random() < 0.4) {
          const rest = freePerches(o.perch);
          if (rest.length) fly(o, rest[Math.floor(Math.random() * rest.length)], 0.18);
        }
      }
    };

    /* ── a chirp, in whichever language is next ── */
    let n = 0;
    const chirp = (b: Bird) => {
      const bubble = part(b, 'bubble') as HTMLElement | null;
      if (!bubble || b.flying) return;
      const sleepy = asleep();
      const c = sleepy ? { text: 'zZ', lang: 'en' } : CHIRPS[n++ % CHIRPS.length];
      bubble.textContent = c.text;
      bubble.lang = c.lang;
      gsap.killTweensOf(bubble);
      if (reduced) {
        gsap.set(bubble, { opacity: 1 });
        gsap.set(bubble, { opacity: 0, delay: 1.8 });
        return;
      }
      gsap
        .timeline()
        .fromTo(bubble, { opacity: 0, scale: 0.4, y: 8 }, { opacity: 1, scale: 1, y: 0, duration: 0.38, ease: 'back.out(2.4)' })
        .to(bubble, { opacity: 0, y: -8, duration: 0.45, ease: 'power1.in' }, 1.35);
      if (sleepy) {
        b.el.classList.add('is-peeking');
        later(() => b.el.classList.remove('is-peeking'), 1300);
      } else {
        gsap.fromTo(
          part(b, 'head'),
          { rotation: 0 },
          { keyframes: [{ rotation: -12, duration: 0.07 }, { rotation: 4, duration: 0.07 }, { rotation: -8, duration: 0.07 }, { rotation: 0, duration: 0.14 }], svgOrigin: '40 27' }
        );
      }
    };

    /* ── small lives: blink, peck, hop, flick, look round ── */
    const idle = (b: Bird) => {
      later(() => {
        if (!away() && !b.flying && !asleep() && !reduced) {
          const r = Math.random();
          if (r < 0.3) gsap.fromTo(part(b, 'eye'), { scaleY: 1 }, { scaleY: 0.1, duration: 0.07, yoyo: true, repeat: 1, svgOrigin: '47.2 17.4' });
          else if (r < 0.55) gsap.to(part(b, 'body'), { rotation: 22, duration: 0.16, yoyo: true, repeat: Math.random() < 0.5 ? 1 : 3, ease: 'power2.inOut', svgOrigin: '30 50' });
          else if (r < 0.7) {
            gsap.to(part(b, 'body'), { y: -7, duration: 0.14, yoyo: true, repeat: 1, ease: 'power2.out' });
            if (Math.random() < 0.5) later(() => face(b, b.facing === 1 ? -1 : 1), 140);
          } else if (r < 0.85) gsap.fromTo(part(b, 'tail'), { rotation: 0 }, { rotation: -16, duration: 0.1, yoyo: true, repeat: 1, svgOrigin: '18 30' });
          else face(b, b.facing === 1 ? -1 : 1);
        }
        idle(b);
      }, 2200 + Math.random() * 4200);
    };

    /* ── the dawn chorus, and the odd chirp through the day ── */
    const sing = () => {
      const s = skyRef.current;
      later(
        () => {
          if (!away() && !asleep() && (s === 'dawn' || Math.random() < 0.5)) {
            const awake = birds.filter((b) => !b.flying);
            if (awake.length) chirp(awake[Math.floor(Math.random() * awake.length)]);
          }
          sing();
        },
        s === 'dawn' ? 3000 + Math.random() * 5000 : 16_000 + Math.random() * 24_000
      );
    };

    /* ── first arrival ── */
    measure();
    const firsts = [...FIRST_PERCHES.map((id) => perchOf(id)).filter((p): p is Perch => !!p), ...perches].filter(
      (p, i, all) => all.findIndex((q) => q.id === p.id) === i
    );
    birds.forEach((b, i) => {
      const to = firsts[i % Math.max(1, firsts.length)];
      if (!to) return;
      if (reduced || asleep()) {
        b.perch = to.id;
        place(b, to.x, to.y);
        faceIn(b);
      } else {
        place(b, -70, 60 + i * 40);
        face(b, 1);
        fly(b, to, 0.25 + i * 0.45);
      }
    });
    root.classList.add('is-ready');
    birds.forEach(idle);
    sing();

    /* ── you, coming close ── */
    let last = { x: 0, y: 0, t: 0 };
    const onMove = (e: PointerEvent) => {
      if (reduced || asleep() || away()) return;
      const { s, k } = scale();
      const px = (e.clientX - s.left) * k;
      const py = (e.clientY - s.top) * k;
      const now = performance.now();
      const speed = (Math.hypot(px - last.x, py - last.y) / Math.max(16, now - last.t)) * 1000;
      last = { x: px, y: py, t: now };
      if (e.pointerType !== 'mouse') return;
      for (const b of birds) {
        if (b.flying || !b.perch) continue;
        const d = Math.hypot(px - b.x, py - (b.y - b.el.offsetHeight * 0.5));
        if (d < 110 && speed > 700) takeOff(b);
        else if (d < 180) face(b, px >= b.x ? 1 : -1); // a slow hand: they turn and look
      }
    };
    // a finger landing near a bird (not on it) shoos it
    const onDown = (e: PointerEvent) => {
      if (e.pointerType === 'mouse' || reduced || asleep()) return;
      if ((e.target as HTMLElement).closest('.sparrow')) return;
      const { s, k } = scale();
      const px = (e.clientX - s.left) * k;
      const py = (e.clientY - s.top) * k;
      for (const b of birds) if (!b.flying && Math.hypot(px - b.x, py - (b.y - b.el.offsetHeight * 0.5)) < 70) takeOff(b);
    };
    const clicks = birds.map((b) => {
      const fn = () => chirp(b);
      b.el.addEventListener('click', fn);
      return () => b.el.removeEventListener('click', fn);
    });
    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerdown', onDown, { passive: true });

    /* ── the cover reflows (fonts, resize): everyone back on their perch ── */
    const settle = () => {
      measure();
      for (const b of birds) {
        if (b.flying) continue;
        let p = perchOf(b.perch);
        if (!p) {
          p = freePerches()[0];
          b.perch = p?.id ?? null;
        }
        if (p) place(b, p.x, p.y);
      }
    };
    const ro = new ResizeObserver(settle);
    ro.observe(stage);
    document.fonts.ready.then(settle);

    return () => {
      ro.disconnect();
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerdown', onDown);
      clicks.forEach((off) => off());
      timers.forEach((id) => window.clearTimeout(id));
      birds.forEach((b) => gsap.killTweensOf([b.el, ...b.el.querySelectorAll('*')]));
      root.classList.remove('is-ready');
    };
  }, [ready]);

  return (
    <div ref={rootRef} className="sparrows" data-sky={sky} aria-hidden="true">
      {Array.from({ length: COUNT }, (_, i) => (
        <span
          key={i}
          className="sparrow"
          ref={(el) => {
            if (el) els.current[i] = el;
          }}
        >
          <span className="sparrow__flip">
            <SparrowArt />
          </span>
          <span className="sparrow__bubble" />
          <span className="sparrow__z loop">z</span>
        </span>
      ))}
    </div>
  );
}
