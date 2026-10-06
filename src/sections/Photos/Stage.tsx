import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { gsap, ScrollTrigger } from '../../lib/gsap';
import { Draggable } from '../../lib/drag';
import { discover } from '../../lib/deep';
import {
  B,
  N,
  activeSlot,
  hangCenter,
  lineLayout,
  noise,
  sheetLayout,
  slotDeg,
  wheelLayout,
  wheelTargets,
  type LineLayout,
  type SheetLayout,
  type Target,
  type View,
  type WheelLayout,
} from './geometry';
import { Prints } from './Prints';
import { SnapPoints, Strings, TrayButton, TrayDish, stringPath } from './LineDecor';
import { GreasePencil, LightTable, Strips } from './SheetDecor';
import { WheelHub, WheelSpinner, WheelText, WheelTrack, createWheelStore } from './WheelDecor';
import { Loupe, type LoupeApi } from './Loupe';
import { EDGE_CUT, edgeCentre, edgePrints } from './edgePrint';
import { EdgeButton } from './EdgeButton';
import { swallowNextClick } from './tap';
import { Swings } from './physics';

type Layouts = { line: LineLayout; sheet: SheetLayout; wheel: WheelLayout };
type Size = { W: number; H: number | null; vh: number };

type StageProps = {
  view: View;
  reduced: boolean;
  /** The drawer has arrived: run the entrance. */
  entered: boolean;
  onView: (v: View) => void;
  onOpen: (i: number, from: HTMLElement) => void;
};

const FLY = 0.9;
const DEAL = 0.012;

/** Which skin each view wears: a print on paper, a chip with a thin border, or a negative. */
function skinFor(v: View, onLine: boolean) {
  if (v === 'sheet') return { paper: 0, card: 0, bits: 0, neg: 1 };
  if (v === 'wheel') return { paper: 0, card: 1, bits: 0, neg: 0 };
  return { paper: 1, card: 0, bits: onLine ? 1 : 0, neg: 0 };
}

/**
 * The darkroom floor. One set of 36 prints and three layouts; switching views flies
 * every print from where it is to where it belongs next, like a hand dealing prints.
 */
export function Stage({ view, reduced, entered, onView, onOpen }: StageProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const stringsSvgRef = useRef<SVGSVGElement | null>(null);
  const prints = useRef<HTMLButtonElement[]>([]);
  const parts = useRef<{ paper: HTMLElement[]; card: HTMLElement[]; bits: HTMLElement[]; neg: HTMLElement[]; dev: HTMLElement[] }>({
    paper: [],
    card: [],
    bits: [],
    neg: [],
    dev: [],
  });
  const setters = useRef<{ x: (v: number) => void; y: (v: number) => void; r: (v: number) => void }[]>([]);
  const stringPaths = useRef<(SVGPathElement | null)[]>([]);
  const greasePaths = useRef<(SVGPathElement | null)[]>([]);
  const loupe = useRef<LoupeApi>(null);
  const tl = useRef<gsap.core.Timeline | null>(null);
  const shown = useRef<View | null>(null);
  const revealed = useRef(false);
  const landedRef = useRef(false);
  const lastScroll = useRef(0);
  const lastPointer = useRef('mouse');
  const [size, setSize] = useState<Size | null>(null);
  const [landed, setLanded] = useState(false);
  const [flicker, setFlicker] = useState(0);
  const [sheetSeen, setSheetSeen] = useState(false);
  // the colour wheel: its spin (degrees), the hub's frame, and the drag that turns it
  const theta = useRef(0);
  const wheel = useMemo(createWheelStore, []);
  const trackEl = useRef<HTMLDivElement | null>(null);
  const labelEls = useRef<(HTMLSpanElement | null)[]>([]);
  const spinner = useRef<HTMLDivElement>(null);
  const spinDrag = useRef<Draggable | null>(null);
  const spinning = useRef(false);
  const activeEl = useRef<HTMLElement | null>(null);

  /* ── measure ─────────────────────────────────────────── */
  useLayoutEffect(() => {
    const el = stageRef.current!;
    const desktop = window.matchMedia('(min-width: 64rem)');
    const measure = () => {
      const W = Math.round(el.clientWidth);
      // a stage this narrow is a passing measurement (mid-resize, a capture), not a layout:
      // the phone sheet keeps a loupe's width clear, so frames would come out negative
      if (W < 240) return;
      const H = desktop.matches ? Math.round(el.clientHeight) : null;
      setSize((prev) => (prev && prev.W === W && prev.H === H ? prev : { W, H, vh: window.innerHeight }));
    };
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    measure();
    desktop.addEventListener('change', measure);
    return () => {
      ro.disconnect();
      desktop.removeEventListener('change', measure);
    };
  }, []);

  const desktop = size?.H !== null;
  // phones: a smaller loupe, and the sheet leaves room for it to rest over frame 01
  const loupeD = desktop ? 220 : (size?.W ?? 390) >= 360 ? 132 : 116;
  const layouts = useMemo<Layouts | null>(
    () =>
      size && size.W > 0 && (size.H === null || size.H > 0)
        ? {
            line: lineLayout(size.W, size.H, size.vh),
            // the reserved radius includes the metal rim
            sheet: sheetLayout(size.W, size.H, size.H === null ? (loupeD / 2) * 1.07 + 4 : 0),
            wheel: wheelLayout(size.W, size.H),
          }
        : null,
    [size, loupeD]
  );
  const layoutsRef = useRef(layouts);
  layoutsRef.current = layouts;
  const edges = useMemo(() => (layouts ? edgePrints(layouts.sheet) : []), [layouts]);

  /* ── physics ─────────────────────────────────────────── */
  const drawerVisible = useCallback(() => {
    const d = stageRef.current?.closest<HTMLElement>('.drawer');
    return !d || (d.dataset.offscreen !== 'true' && d.dataset.covered !== 'true');
  }, []);

  const swings = useMemo(
    () =>
      new Swings(
        N,
        2,
        (i, theta) => {
          const L = layoutsRef.current?.line;
          const h = L?.hangs[i];
          const set = setters.current[i];
          if (!L || !h || !set || shown.current !== 'line') return;
          const t = L.targets[i];
          const c = hangCenter(h, t.size, h.tilt + theta, swingsRef.current?.sag[h.line] ?? 0);
          set.x(c.cx - B / 2);
          set.y(c.cy - B / 2);
          set.r(h.tilt + theta);
        },
        (line, offset) => {
          const L = layoutsRef.current?.line;
          const path = stringPaths.current[line];
          if (!L || shown.current !== 'line') return;
          path?.setAttribute('d', stringPath(L.strings[line], L.width, offset));
          // pegs on this string ride the spring too
          L.hangs.forEach((h, i) => {
            if (!h || h.line !== line || !h.weight) return;
            const set = setters.current[i];
            const theta = swingsRef.current?.theta[i] ?? 0;
            const c = hangCenter(h, L.targets[i].size, h.tilt + theta, offset);
            set?.x(c.cx - B / 2);
            set?.y(c.cy - B / 2);
          });
        },
        () => !reducedRef.current && shown.current === 'line' && landedRef.current && drawerVisible()
      ),
    [drawerVisible]
  );
  const swingsRef = useRef(swings);
  swingsRef.current = swings;
  const reducedRef = useRef(reduced);
  reducedRef.current = reduced;
  useEffect(() => () => swings.destroy(), [swings]);

  /* Layers only while moving: promote the prints while any of them is tweening or
   * swinging, and release them ~200 ms after everything settles so Chrome redraws
   * each print sharp at the size it actually came to rest at. */
  useEffect(() => {
    let moving = false;
    let quietSince = 0;
    const tick = () => {
      const box = stageRef.current?.querySelector<HTMLElement>('.dr-prints');
      if (!box) return;
      const now = swings.running || prints.current.some((el) => el && gsap.isTweening(el));
      if (now) {
        quietSince = 0;
        if (!moving) {
          moving = true;
          box.classList.add('is-moving');
        }
      } else if (moving) {
        quietSince ||= performance.now();
        if (performance.now() - quietSince > 200) {
          moving = false;
          box.classList.remove('is-moving');
        }
      }
    };
    gsap.ticker.add(tick);
    return () => gsap.ticker.remove(tick);
  }, [swings]);
  useEffect(() => {
    if (reduced) {
      swings.settle();
      swings.enabled = false;
    } else if (shown.current === 'line' && landedRef.current) swings.enabled = true;
  }, [reduced, swings]);

  /* ── placing prints ──────────────────────────────────── */
  const setPrintRef = useCallback((i: number, el: HTMLButtonElement | null) => {
    if (!el) return;
    prints.current[i] = el;
    parts.current.paper[i] = el.querySelector('.pr__paper')!;
    parts.current.card[i] = el.querySelector('.pr__card')!;
    parts.current.bits[i] = el.querySelector('.pr__bits')!;
    parts.current.neg[i] = el.querySelector('.pr__neg')!;
    parts.current.dev[i] = el.querySelector('.pr__dev')!;
    setters.current[i] = {
      x: gsap.quickSetter(el, 'x', 'px') as (v: number) => void,
      y: gsap.quickSetter(el, 'y', 'px') as (v: number) => void,
      r: gsap.quickSetter(el, 'rotation', 'deg') as (v: number) => void,
    };
  }, []);

  const placeProps = (t: Target) => ({ x: t.cx - B / 2, y: t.cy - B / 2, scale: t.size / B, rotation: t.rot, zIndex: t.z, '--s': t.size / B });

  /** Where each print belongs in a view (on the wheel, that depends on how far it has been spun). */
  const targetsFor = (v: View, L: Layouts) => (v === 'wheel' ? wheelTargets(L.wheel, theta.current) : L[v].targets);

  /* ── the colour wheel ────────────────────────────────── */
  /** Track, riding labels and the active frame for a spin of `deg`. */
  const decorateWheel = (L: WheelLayout, deg: number) => {
    if (trackEl.current) trackEl.current.style.transform = `rotate(${deg.toFixed(3)}deg)`;
    const step = slotDeg(L);
    L.labels.forEach((l, k) => {
      const el = labelEls.current[k];
      if (!el) return;
      const a = ((l.slot * step + deg) * Math.PI) / 180;
      el.style.transform = `translate(${(L.cx + L.track.r * Math.sin(a)).toFixed(1)}px, ${(L.cy - L.track.r * Math.cos(a)).toFixed(1)}px) translate(-50%, -50%)`;
    });
    const slot = activeSlot(L, deg);
    wheel.setActive(slot);
    const el = shown.current === 'wheel' ? prints.current[L.outer[slot]] ?? null : null;
    if (el !== activeEl.current) {
      activeEl.current?.classList.remove('is-active');
      el?.classList.add('is-active');
      activeEl.current = el;
    }
  };

  /** Turn the wheel to `deg`: both rings together, chips upright, the hub following the pointer. */
  const spinTo = (deg: number) => {
    const L = layoutsRef.current?.wheel;
    if (!L) return;
    theta.current = deg;
    if (shown.current === 'wheel') {
      wheelTargets(L, deg).forEach((t, i) => {
        setters.current[i]?.x(t.cx - B / 2);
        setters.current[i]?.y(t.cy - B / 2);
      });
    }
    decorateWheel(L, deg);
  };

  /** A keyboard (or programmatic) turn to `to` degrees. */
  /** Keep the drag in step with a spin made some other way (keys, a resize). */
  const syncDrag = (deg: number) => {
    const d = spinDrag.current;
    if (!d) return;
    if (d.vars.type === 'x') gsap.set(d.target, { x: deg * spinPx.current });
    else gsap.set(d.target, { rotation: deg });
    d.update();
  };

  const turnTo = (to: number) => {
    wheel.setPreview(null);
    const done = () => syncDrag(to);
    if (reducedRef.current) {
      spinTo(to);
      return done();
    }
    const proxy = { r: theta.current };
    spinning.current = true;
    gsap.to(proxy, {
      r: to,
      duration: 0.5,
      ease: 'expoOut',
      onUpdate: () => spinTo(proxy.r),
      onComplete: () => {
        spinning.current = false;
        done();
      },
    });
  };

  const onSpinKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const L = layoutsRef.current?.wheel;
    if (!L) return;
    const step = slotDeg(L);
    const cur = Math.round(theta.current / step) * step;
    const a = activeSlot(L, cur);
    let to: number | null = null;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') to = cur - step;
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') to = cur + step;
    else if (e.key === 'Home') to = cur + a * step;
    else if (e.key === 'End') to = cur + (a - (L.outer.length - 1)) * step;
    else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      const i = L.outer[a];
      onOpen(i, prints.current[i]);
      return;
    }
    if (to === null) return;
    e.preventDefault();
    turnTo(to);
  };

  // A touch tap on a chip may be swallowed by the drag; Draggable reports it instead.
  const wheelTapAt = useRef(0);
  // Mouse and pen grab the wheel and turn it. On touch-first screens a sideways swipe
  // spins it instead (a proxy dragged on x), so a vertical swipe still scrolls the page.
  const spinProxy = useRef<HTMLDivElement | null>(null);
  const spinPx = useRef(1); // proxy pixels per degree of spin
  const startSpin = () => {
    const L = layoutsRef.current?.wheel;
    const el = spinner.current;
    if (!L || !el || spinDrag.current) return;
    const step = slotDeg(L);
    const still = reducedRef.current;
    const touch = window.matchMedia('(hover: none) and (pointer: coarse)').matches;
    spinPx.current = (Math.PI * L.Ro) / 180; // a swipe moves the outer ring's top edge under the finger
    if (touch && !spinProxy.current) spinProxy.current = document.createElement('div');
    const target = touch ? spinProxy.current! : el;
    const toDeg = (v: number) => (touch ? v / spinPx.current : v);
    const unit = touch ? step * spinPx.current : step;
    const snap = (v: number) => Math.round(v / unit) * unit;
    gsap.set(target, touch ? { x: theta.current * spinPx.current } : { rotation: theta.current });
    let settleCheck = 0;
    spinDrag.current = Draggable.create(target, {
      type: touch ? 'x' : 'rotation',
      trigger: [el, ...prints.current],
      dragClickables: true,
      minimumMovement: touch ? 6 : 4,
      inertia: !still,
      snap: still ? undefined : snap,
      onDragStart() {
        spinning.current = true;
        wheel.setPreview(null);
      },
      onDrag() {
        spinTo(toDeg(touch ? this.x : this.rotation));
      },
      onThrowUpdate() {
        spinTo(toDeg(touch ? this.x : this.rotation));
      },
      onThrowComplete() {
        spinning.current = false;
      },
      onRelease() {
        if (still) {
          // reduced motion: no inertia, an instant snap
          const v = snap(touch ? this.x : this.rotation);
          gsap.set(target, touch ? { x: v } : { rotation: v });
          this.update();
          spinTo(toDeg(v));
          spinning.current = false;
          return;
        }
        // a release with no throw ends the spin here
        cancelAnimationFrame(settleCheck);
        settleCheck = requestAnimationFrame(() => {
          if (!this.isThrowing) spinning.current = false;
        });
      },
      onClick(e: Event) {
        if ((e as PointerEvent).pointerType !== 'touch') return;
        const pr = (e.target as Element | null)?.closest<HTMLElement>('.pr');
        if (!pr) return;
        wheelTapAt.current = performance.now();
        const i = Number(pr.dataset.index);
        onOpen(i, prints.current[i]);
        swallowNextClick();
      },
    })[0];
  };
  const stopSpin = () => {
    spinDrag.current?.kill();
    spinDrag.current = null;
    spinning.current = false;
    if (spinner.current) gsap.set(spinner.current, { clearProps: 'transform' });
  };
  /** A resize changes the ring's size, and with it how far a swipe turns it. */
  const restartSpin = () => {
    if (!spinDrag.current) return;
    stopSpin();
    startSpin();
  };
  useEffect(() => () => stopSpin(), []); // stop the spin on unmount

  const resetStrings = () => {
    const L = layoutsRef.current?.line;
    if (!L) return;
    L.strings.forEach((s, l) => stringPaths.current[l]?.setAttribute('d', stringPath(s, L.width)));
  };

  const showGreaseNow = () => gsap.set(greasePaths.current.filter(Boolean), { clearProps: 'strokeDasharray,strokeDashoffset' });

  const placeAll = (v: View) => {
    const L = layoutsRef.current;
    if (!L) return;
    swings.settle(true);
    const targets = targetsFor(v, L);
    prints.current.forEach((el, i) => {
      const t = targets[i];
      gsap.set(el, placeProps(t));
      const s = skinFor(v, !!L.line.hangs[i]);
      gsap.set(parts.current.paper[i], { opacity: s.paper });
      gsap.set(parts.current.card[i], { opacity: s.card });
      gsap.set(parts.current.bits[i], { opacity: s.bits });
      gsap.set(parts.current.neg[i], { opacity: s.neg });
    });
    resetStrings();
    if (v === 'sheet') showGreaseNow();
    if (v === 'wheel') {
      decorateWheel(L.wheel, theta.current);
      restartSpin();
    }
  };
  const applyNow = (v: View) => {
    tl.current?.kill();
    tl.current = null;
    placeAll(v);
    if (revealed.current) finishEntrance();
  };

  const land = (v: View) => {
    tl.current = null;
    landedRef.current = true;
    setLanded(true);
    swings.enabled = v === 'line' && !reducedRef.current;
    if (v === 'wheel') startSpin();
    // phones: the drawer's height follows the view, so re-measure the page
    if (stageRef.current && !stageRef.current.hasAttribute('data-desktop')) ScrollTrigger.refresh();
  };

  /** Everything in its developed, resting state (also used when a resize interrupts the entrance). */
  const finishEntrance = () => {
    gsap.set(prints.current, { opacity: 1 });
    gsap.set(parts.current.dev, { opacity: 0 });
    if (stringsSvgRef.current) gsap.set(stringsSvgRef.current, { clearProps: 'clipPath' });
    const tray = stageRef.current?.querySelector('.dr-tray');
    if (tray) gsap.set(tray, { clearProps: 'opacity,transform' });
  };

  const revealAll = () => {
    if (revealed.current) return;
    revealed.current = true;
    finishEntrance();
  };

  /** Deal order: reading order on the sheet, round the wheel, along the lines. */
  const orderFor = (v: View, L: Layouts) => {
    const idx = Array.from({ length: N }, (_, i) => i);
    if (v === 'wheel') return [...L.wheel.outer, ...L.wheel.inner];
    if (v === 'line') return idx.sort((a, b) => Number(!L.line.hangs[a]) - Number(!L.line.hangs[b]) || a - b);
    return idx;
  };

  const flyTo = (to: View, from: View) => {
    const L = layoutsRef.current;
    if (!L) return;
    tl.current?.kill();
    swings.settle(true);
    swings.enabled = false;
    landedRef.current = false;
    setLanded(false);
    stopSpin();
    wheel.setPreview(null);
    activeEl.current?.classList.remove('is-active');
    activeEl.current = null;
    revealAll();
    finishEntrance(); // a switch mid-entrance lands everything developed

    // phones: the line is a wide canvas; keep what's on screen where it is as it shrinks
    const sl = lastScroll.current;
    if (from === 'line' && sl > 0) {
      prints.current.forEach((el) => gsap.set(el, { x: `-=${sl}` }));
      if (stageRef.current) stageRef.current.scrollLeft = 0;
      lastScroll.current = 0;
    }

    if (reducedRef.current) {
      const canvas = canvasRef.current;
      tl.current = gsap
        .timeline({ onComplete: () => land(to) })
        .to(canvas, { opacity: 0, duration: 0.075, ease: 'none' })
        .add(() => placeAll(to))
        .to(canvas, { opacity: 1, duration: 0.075, ease: 'none' });
      return;
    }

    const t2 = gsap.timeline({ onComplete: () => land(to) });
    const salt = Math.random() * 100;
    const targets = targetsFor(to, L);
    if (to === 'wheel') decorateWheel(L.wheel, theta.current);
    orderFor(to, L).forEach((i, k) => {
      const el = prints.current[i];
      const T = targets[i];
      const at = k * DEAL;
      const now = Number(gsap.getProperty(el, 'rotation')) || 0;
      const jitter = (noise(i + 1, salt) - 0.5) * 2 * (5 + noise(i + 2, salt) * 7);
      t2.set(el, { zIndex: T.z }, at)
        .to(el, { x: T.cx - B / 2, y: T.cy - B / 2, scale: T.size / B, duration: FLY, ease: 'expoOut' }, at)
        .to(el, { rotation: now + jitter, duration: 0.22, ease: 'power2.out' }, at)
        .to(el, { rotation: T.rot, duration: FLY - 0.22, ease: 'expoOut' }, at + 0.22)
        .set(el, { '--s': T.size / B }, at + 0.55);
      const s = skinFor(to, !!L.line.hangs[i]);
      const { paper, card, bits, neg } = parts.current;
      if (to === 'sheet') {
        t2.to([paper[i], card[i]], { opacity: 0, duration: 0.28, ease: 'power1.out' }, at)
          .to(bits[i], { opacity: 0, duration: 0.18, ease: 'power1.out' }, at)
          .to(neg[i], { opacity: 1, duration: 0.4, ease: 'power1.inOut' }, at + 0.42);
      } else {
        t2.to(neg[i], { opacity: 0, duration: 0.25, ease: 'power1.out' }, at)
          .to(paper[i], { opacity: s.paper, duration: 0.32, ease: 'power1.out' }, at + 0.04)
          .to(card[i], { opacity: s.card, duration: 0.32, ease: 'power1.out' }, at + 0.04)
          .to(bits[i], { opacity: s.bits, duration: s.bits ? 0.3 : 0.18 }, s.bits ? at + 0.6 : at);
      }
    });

    if (to === 'line') resetStrings();
    if (to === 'sheet') {
      setFlicker((n) => n + 1);
      setSheetSeen(true);
      const paths = greasePaths.current.filter(Boolean) as SVGPathElement[];
      paths.forEach((p) => {
        const len = p.getTotalLength() + 2;
        gsap.set(p, { strokeDasharray: len, strokeDashoffset: len });
      });
      t2.to(paths.slice(0, -10), { strokeDashoffset: 0, duration: 0.42, ease: 'power1.inOut', stagger: 0.03 }, 0.82)
        .to(paths.slice(-10), { strokeDashoffset: 0, duration: 0.16, ease: 'none', stagger: 0.07 }, 1.2);
      loupe.current?.moveTo(L.sheet.targets[0].cx, L.sheet.targets[0].cy, { immediate: true });
    }
    tl.current = t2;
  };

  /* ── view changes and resizes ────────────────────────── */
  useLayoutEffect(() => {
    if (!layouts || prints.current.length < N) return;
    const prev = shown.current;
    if (prev === null) {
      shown.current = view;
      applyNow(view);
      if (!reducedRef.current && !revealed.current) {
        gsap.set(prints.current, { opacity: 0 });
        gsap.set(parts.current.dev, { opacity: (i: number) => (layouts.line.hangs[i] ? 1 : 0) });
        if (stringsSvgRef.current) gsap.set(stringsSvgRef.current, { clipPath: 'inset(0% 100% 0% 0%)' });
        const tray = stageRef.current?.querySelector('.dr-tray');
        if (tray) gsap.set(tray, { opacity: 0, y: 14 });
      } else revealAll();
      landedRef.current = true;
      setLanded(true);
      swings.enabled = view === 'line' && !reducedRef.current;
      stageRef.current?.setAttribute('data-ready', '');
      return;
    }
    if (prev === view) {
      applyNow(view);
      if (!landedRef.current) land(view);
      return;
    }
    shown.current = view;
    flyTo(view, prev);
  }, [layouts, view]); // everything else is read through refs

  /* ── entrance: the prints drop onto the line and develop ─ */
  useEffect(() => {
    if (!entered || !layouts || revealed.current || prints.current.length < N) return;
    if (reducedRef.current || shown.current !== 'line') {
      revealAll();
      return;
    }
    revealed.current = true;
    const L = layouts.line;
    tl.current?.kill();
    const t = gsap.timeline({ onComplete: () => tl.current === t && (tl.current = null) });
    tl.current = t;
    if (stringsSvgRef.current) t.to(stringsSvgRef.current, { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.85, ease: 'power2.inOut' }, 0.05);
    const picks = L.hangs.map((h, i) => (h ? i : -1)).filter((i) => i >= 0);
    picks.forEach((i, k) => {
      const T = L.targets[i];
      const at = 0.2 + k * 0.035;
      t.fromTo(
        prints.current[i],
        { y: T.cy - B / 2 - 0.55 * T.size, opacity: 0 },
        {
          y: T.cy - B / 2,
          opacity: 1,
          duration: 0.5,
          ease: 'power3.out',
          onComplete: () => swings.kick(i, (k % 2 ? -1 : 1) * gsap.utils.random(70, 110)),
        },
        at
      ).to(parts.current.dev[i], { opacity: 0, duration: 0.8, ease: 'power2.inOut' }, at + gsap.utils.random(0.2, 0.5));
    });
    const tray = stageRef.current?.querySelector('.dr-tray');
    if (tray) t.to(tray, { opacity: 1, y: 0, duration: 0.6, ease: 'expoOut' }, 0.35);
    L.pile.forEach((i, k) => {
      const T = L.targets[i];
      t.fromTo(prints.current[i], { y: T.cy - B / 2 - 26, opacity: 0 }, { y: T.cy - B / 2, opacity: 1, duration: 0.42, ease: 'power2.out' }, 0.5 + k * 0.012);
    });
  }, [entered, layouts]); // runs once: when the drawer has arrived and the layout exists

  /* ── pointer: sweep the lines, steer the loupe ──────────── */
  const local = (e: { clientX: number; clientY: number }) => {
    const st = stageRef.current!;
    const r = st.getBoundingClientRect();
    return { x: e.clientX - r.left + st.scrollLeft, y: e.clientY - r.top + st.scrollTop };
  };
  const sweep = useRef({ x: 0, y: 0, t: 0, vx: 0, vy: 0, has: false, inside: new Uint8Array(N) });

  const lastXY = useRef({ x: -1, y: -1 });
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const moved = e.clientX !== lastXY.current.x || e.clientY !== lastXY.current.y;
    lastXY.current = { x: e.clientX, y: e.clientY };
    const all = layoutsRef.current;
    if (!all) return;
    const L = all.line;
    const pt = local(e);
    if (shown.current === 'sheet') {
      if (e.pointerType !== 'touch' && landedRef.current) loupe.current?.moveTo(pt.x, pt.y, { user: moved });
      return;
    }
    if (shown.current !== 'line' || !landedRef.current || reducedRef.current) return;
    const s = sweep.current;
    if (s.has) {
      const dt = Math.max(1, e.timeStamp - s.t);
      s.vx = s.vx * 0.45 + ((pt.x - s.x) / dt) * 0.55;
      s.vy = s.vy * 0.45 + ((pt.y - s.y) / dt) * 0.55;
    }
    L.hangs.forEach((h, i) => {
      if (!h) return;
      const p = L.targets[i].size;
      const inside = Math.abs(pt.x - (h.px - h.shift * p)) < 0.62 * p && pt.y > h.py - 0.15 * p && pt.y < h.py + 1.42 * p ? 1 : 0;
      if (inside && !s.inside[i] && s.has) {
        swings.kick(i, -s.vx * 32);
        if (h.weight) swings.kickSag(h.line, Math.abs(s.vx) * 22);
      }
      s.inside[i] = inside;
    });
    if (s.has && L.strings[0].pegs === null) {
      L.strings.forEach((str, l) => {
        const yAt = (x: number) => {
          const t = Math.min(1, Math.max(0, x / L.width));
          return str.y + str.sag * 4 * t * (1 - t);
        };
        if ((s.y - yAt(s.x)) * (pt.y - yAt(pt.x)) < 0) swings.kickSag(l, s.vy * 80);
      });
    }
    s.x = pt.x;
    s.y = pt.y;
    s.t = e.timeStamp;
    s.has = true;
  };
  const onPointerLeave = () => {
    sweep.current.has = false;
    sweep.current.inside.fill(0);
  };

  // phones: pulling the line sideways swings the prints (the pegs accelerate, the prints lag)
  const scrollState = useRef({ x: 0, t: 0, v: 0, timer: 0 });
  const onScroll = () => {
    const st = stageRef.current;
    if (!st) return;
    const S = scrollState.current;
    const now = performance.now();
    lastScroll.current = st.scrollLeft;
    const L = layoutsRef.current?.line;
    if (shown.current !== 'line' || !L || reducedRef.current || !landedRef.current) {
      S.x = st.scrollLeft;
      S.t = now;
      return;
    }
    const dt = Math.max(8, now - S.t);
    const v = now - S.t > 120 ? 0 : -(st.scrollLeft - S.x) / dt;
    const kickAll = (dv: number) => L.hangs.forEach((h, i) => h && swings.kick(i, dv * 30 * (0.8 + noise(i, 4) * 0.4)));
    kickAll(v - S.v);
    S.v = v;
    S.x = st.scrollLeft;
    S.t = now;
    window.clearTimeout(S.timer);
    S.timer = window.setTimeout(() => {
      kickAll(-S.v);
      S.v = 0;
    }, 90);
  };

  /* ── prints: open, focus, hover ──────────────────────── */
  const isPile = (i: number) => view === 'line' && !!layouts && !layouts.line.hangs[i];

  /** On the light table a finger first brings the loupe to a frame, then opens it. */
  const sheetTap = (i: number) => {
    const L = layoutsRef.current;
    if (!L) return;
    if (loupe.current?.frame() !== i) {
      const t = L.sheet.targets[i];
      loupe.current?.moveTo(t.cx, t.cy, { user: true });
    } else onOpen(i, prints.current[i]);
  };
  // Touch taps on the sheet are read from pointer events: a quick second tap after
  // dragging the loupe can fall inside the browser's double-tap window and never click.
  const touchTap = useRef<{ id: number; x: number; y: number; t: number; i: number } | null>(null);
  const tapHandledAt = useRef(0);
  const onPointerDownCapture = (e: React.PointerEvent<HTMLDivElement>) => {
    lastPointer.current = e.pointerType;
    const pr = (e.target as Element).closest<HTMLElement>('.pr');
    touchTap.current =
      e.pointerType === 'touch' && shown.current === 'sheet' && landedRef.current && pr
        ? { id: e.pointerId, x: e.clientX, y: e.clientY, t: e.timeStamp, i: Number(pr.dataset.index) }
        : null;
  };
  const onPointerUpCapture = (e: React.PointerEvent<HTMLDivElement>) => {
    const tp = touchTap.current;
    touchTap.current = null;
    if (!tp || tp.id !== e.pointerId) return;
    if (Math.hypot(e.clientX - tp.x, e.clientY - tp.y) > 10 || e.timeStamp - tp.t > 600) return;
    tapHandledAt.current = performance.now();
    sheetTap(tp.i);
    swallowNextClick();
  };

  const onActivate = (i: number, el: HTMLButtonElement) => {
    const L = layoutsRef.current;
    if (!L) return;
    if (shown.current === 'line' && !L.line.hangs[i]) {
      onView('sheet');
      return;
    }
    if (shown.current === 'sheet' && lastPointer.current === 'touch') {
      // the pointer handler already dealt with this tap
      if (performance.now() - tapHandledAt.current < 800) return;
      sheetTap(i);
      return;
    }
    if (shown.current === 'wheel' && performance.now() - wheelTapAt.current < 800) return;
    onOpen(i, el);
  };

  /** On the wheel, a hovered or focused chip lifts a little and shows in the hub. */
  const lift = (i: number, up: boolean) => {
    const L = layoutsRef.current;
    const el = prints.current[i];
    if (!L || !el || shown.current !== 'wheel' || !landedRef.current) return;
    const t = wheelTargets(L.wheel, theta.current)[i];
    gsap.to(el, { scale: (t.size / B) * (up ? 1.14 : 1), duration: reducedRef.current ? 0 : 0.24, ease: 'expoOut', overwrite: 'auto' });
    gsap.set(el, { zIndex: up ? 90 : t.z });
  };
  const previewPrint = (i: number) => {
    if (shown.current !== 'wheel' || !landedRef.current || spinning.current) return;
    const prev = wheel.get().preview;
    if (prev !== null && prev !== i) lift(prev, false);
    lift(i, true);
    wheel.setPreview(i);
  };
  /** A chip that slides under a resting cursor (the wheel turned) is not a hover. */
  const onEnterPrint = (i: number, x: number, y: number) => {
    if (Math.abs(x - lastXY.current.x) < 1 && Math.abs(y - lastXY.current.y) < 1) return;
    previewPrint(i);
  };
  const onLeavePrint = (i: number) => {
    lift(i, false);
    if (wheel.get().preview === i) wheel.setPreview(null);
  };
  const onFocusPrint = (i: number) => {
    const L = layoutsRef.current;
    if (!L) return;
    if (shown.current === 'sheet') {
      const t = L.sheet.targets[i];
      loupe.current?.moveTo(t.cx, t.cy, { user: true });
    } else if (shown.current === 'wheel') previewPrint(i);
    else if (shown.current === 'line') {
      // On a phone the line scrolls sideways and snaps print by print; the browser only
      // nudges a focused print part-way in, and the snap pulls it back out. Centre it.
      const st = stageRef.current;
      const t = L.line.targets[i];
      if (st && t && st.scrollWidth > st.clientWidth + 1) {
        st.scrollTo({ left: Math.max(0, t.cx - st.clientWidth / 2), behavior: reducedRef.current ? 'auto' : 'smooth' });
      }
    }
  };
  /** The edge printing, for keyboards and fingers: bring the loupe to rest on it. */
  const toEdge = () => {
    const L = layoutsRef.current;
    const e = edges[0];
    if (!L || !e || shown.current !== 'sheet') return;
    const c = edgeCentre(L.sheet, e);
    loupe.current?.moveTo(c.x, c.y, { user: true });
  };

  const cur = layouts?.[view];
  const L = layouts;
  return (
    <div
      ref={stageRef}
      className="dr-stage"
      data-view={view}
      data-landed={landed || undefined}
      data-desktop={desktop || undefined}
      style={!desktop && cur ? { height: cur.height } : undefined}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      onPointerDownCapture={onPointerDownCapture}
      onPointerUpCapture={onPointerUpCapture}
      onScroll={onScroll}
    >
      {L && cur && (
        <div ref={canvasRef} className="dr-canvas" style={{ width: cur.width, height: cur.height }}>
          <div className="dr-layer dr-layer--line" aria-hidden="true">
            <Strings
              layout={L.line}
              setPath={(l, el) => {
                stringPaths.current[l] = el;
                stringsSvgRef.current = (el?.ownerSVGElement as SVGSVGElement | null) ?? stringsSvgRef.current;
              }}
            />
            <TrayDish rect={L.line.tray} />
            {!desktop && <SnapPoints xs={L.line.snaps} />}
          </div>
          <div className="dr-layer dr-layer--sheet" aria-hidden="true">
            <LightTable rect={L.sheet.table} flicker={flicker} />
            <Strips layout={L.sheet} edges={edges} />
          </div>
          <div className="dr-layer dr-layer--wheel">
            <WheelText layout={L.wheel} />
            <WheelTrack layout={L.wheel} setTrack={(el) => (trackEl.current = el)} setLabel={(k, el) => (labelEls.current[k] = el)} />
            <WheelSpinner ref={spinner} layout={L.wheel} store={wheel} onKey={onSpinKey} />
            <WheelHub layout={L.wheel} store={wheel} reduced={reduced} onOpen={onOpen} />
          </div>
          <p className="dr-hint" aria-hidden="true">
            {desktop ? 'Sweep a hand across the lines' : 'Pull the line sideways →'}
          </p>

          <Prints
            setRef={setPrintRef}
            tabIndexFor={(i) => (isPile(i) ? -1 : 0)}
            hiddenFor={isPile}
            onActivate={onActivate}
            onFocusPrint={onFocusPrint}
            onBlurPrint={(i, next) => shown.current === 'wheel' && !next?.classList.contains('dr-hub__btn') && onLeavePrint(i)}
            onEnterPrint={onEnterPrint}
            onLeavePrint={onLeavePrint}
          />

          <div className="dr-layer dr-layer--grease" aria-hidden="true">
            <GreasePencil layout={L.sheet} setPath={(k, el) => (greasePaths.current[k] = el)} />
          </div>
          <TrayButton rect={L.line.tray} count={L.line.pile.length} onOpen={() => onView('sheet')} hidden={view !== 'line'} />
          {edges[0] && <EdgeButton layout={L.sheet} edge={edges[0]} hidden={view !== 'sheet'} onReach={toEdge} />}
          <Loupe
            ref={loupe}
            layout={L.sheet}
            edges={edges}
            diameter={loupeD}
            magnify={2.4}
            reduced={reduced}
            on={view === 'sheet' && landed}
            ready={sheetSeen || view === 'sheet'}
            onTap={(i) => onOpen(i, prints.current[i])}
            onEdgePrint={() => discover(EDGE_CUT.id)}
          />
        </div>
      )}
    </div>
  );
}

