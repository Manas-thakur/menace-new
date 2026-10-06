import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type PointerEvent } from 'react';
import type { SectionProps } from '../../App';
import { Drawer } from '../../components/primitives/Drawer';
import { gsap, useGSAP } from '../../lib/gsap';
import { flags, prefersReducedMotion } from '../../lib/motion';
import { scrollToSection } from '../../lib/scroll';
import { profile } from '../../data/profile';
import { deepCut, deepCuts } from '../../data/deep';
import { discover, openLinerNotes } from '../../lib/deep';
import { Lake } from './lake';
import { Swan } from './Swan';
import { Lanterns, LotusShore } from './Lotus';
import './Hero.css';

/* Side A, the cover: मानसरोवर, the lake of the mind.
 *
 * Manas is Sanskrit for the mind, and Mānasarovar, under Kailash, is the lake the mind
 * made. The name stands on its water at first light; the water answers in the name's
 * own script. The lake breathes while the visitor moves. Be still, and it stills too —
 * and, as Patañjali says of the mind, shows what lies beneath (deep cut 01). */

const STILL_MS = 2600; // how long a visitor has to be still before the lake follows
const SETTLE_MS = 1300; // the water settling before the verse comes up through it
const REFLECTION_WIDTH = 0.9; // the name in its own script, as a share of the written name's width

const CONTENTS = [
  { id: 'about', label: 'About' },
  { id: 'work', label: 'Work' },
  { id: 'projects', label: 'Projects' },
  { id: 'photos', label: 'Photos' },
  { id: 'contact', label: 'Contact' },
];

/** Where the water begins, as a share of the painting's height: lower on tall screens. */
function horizonFor(W: number, H: number) {
  const wide = Math.min(1, Math.max(0, (W / H - 0.75) / 0.6));
  return Math.round(H * (0.47 + 0.1 * wide));
}

/** The swan's lane, as a share of the water's depth. */
const laneFor = (W: number, H: number) => (W / H > 1 ? 0.2 : 0.16);

function useLocalTime(timeZone: string) {
  const fmt = useMemo(
    () => new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone }),
    [timeZone]
  );
  const [time, setTime] = useState(() => fmt.format(new Date()));
  useEffect(() => {
    const id = window.setInterval(() => setTime(fmt.format(new Date())), 15_000);
    return () => window.clearInterval(id);
  }, [fmt]);
  return time;
}

type Geo = { W: number; H: number; horizon: number; lane: number };

export function Hero({ index }: SectionProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const paintRef = useRef<HTMLDivElement>(null);
  const skyRef = useRef<HTMLCanvasElement>(null);
  const waterRef = useRef<HTMLCanvasElement>(null);
  const nameRef = useRef<HTMLHeadingElement>(null);
  const lineRef = useRef<HTMLSpanElement>(null);
  const probeRef = useRef<HTMLSpanElement>(null);
  const verseElRef = useRef<HTMLDivElement>(null);
  const lakeRef = useRef<Lake | null>(null);
  const geoRef = useRef<Geo | null>(null);

  const [reduced] = useState(prefersReducedMotion);
  const [intro] = useState(() => !flags.noIntro && !reduced);
  // the hidden messages wait for the intro to land, so a reveal never fights it
  const [introDone, setIntroDone] = useState(() => !intro);
  const [swanReady, setSwanReady] = useState(() => !intro);
  const [geo, setGeo] = useState<Geo | null>(null);
  const [visible, setVisible] = useState(true);
  const [still, setStill] = useState(false);
  const [verse, setVerse] = useState(false);

  const mind = deepCut('mind');
  const time = useLocalTime(profile.timeZone);
  const [hh, mm] = time.split(':');

  /* ── Layout: the painting's size, the water line, the name standing on it ── */
  const layout = useCallback(() => {
    const paint = paintRef.current;
    const lake = lakeRef.current;
    const name = nameRef.current;
    const line = lineRef.current;
    const probe = probeRef.current;
    if (!paint || !lake || !name || !line || !probe) return;
    const W = paint.clientWidth;
    const H = paint.clientHeight;
    if (!W || !H) return;
    const horizon = horizonFor(W, H);
    const lane = laneFor(W, H);
    paint.style.setProperty('--horizon', `${horizon}px`);
    paint.style.setProperty('--water', `${H - horizon}px`);
    paint.style.setProperty('--lane', String(lane));
    lake.resize(W, H, horizon);
    // the probe is an empty inline box sitting on the baseline: lift the name until
    // that baseline is the water line
    name.style.setProperty('--name-base', `${line.offsetTop + probe.offsetTop}px`);
    const width = line.offsetWidth;
    const cx = name.offsetLeft + line.offsetLeft + width / 2;
    const cs = getComputedStyle(line);
    const family = getComputedStyle(paint).getPropertyValue('--font-sanskrit').trim();
    lake.setText({
      latin: { text: `${profile.first} ${profile.last}`, font: `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`, cx },
      deva: { text: profile.devanagari, family, cx, maxWidth: width * REFLECTION_WIDTH },
    });
    paint.style.setProperty('--refl', `${Math.round(lake.reflectionDepth)}px`);
    const next = { W, H, horizon, lane };
    geoRef.current = next;
    setGeo((prev) => (prev && prev.W === W && prev.H === H && prev.horizon === horizon ? prev : next));
  }, []);

  useLayoutEffect(() => {
    const sky = skyRef.current;
    const water = waterRef.current;
    const paint = paintRef.current;
    if (!sky || !water || !paint) return;
    const lake = new Lake(sky, water, { reduced, still: intro });
    lakeRef.current = lake;
    if (intro) {
      lake.setDawn(0);
      lake.setRise(0);
    }
    layout();
    const ro = new ResizeObserver(() => layout());
    ro.observe(paint);
    // the hint steps down below the verse when it rises: keep its height to hand
    const verseEl = verseElRef.current;
    const vo = new ResizeObserver(() => verseEl && paint.style.setProperty('--verse-h', `${verseEl.offsetHeight}px`));
    if (verseEl) vo.observe(verseEl);
    // the reflection is drawn in the name's own script: wait for that face, then measure again
    const deva = getComputedStyle(paint).getPropertyValue('--font-sanskrit').trim();
    Promise.all([document.fonts.load(`400 100px ${deva}`, profile.devanagari), document.fonts.ready])
      .then(() => lakeRef.current === lake && layout())
      .catch(() => {});
    return () => {
      ro.disconnect();
      vo.disconnect();
      lake.destroy();
      lakeRef.current = null;
    };
  }, [intro, reduced, layout]);

  /* ── Is the cover on screen? The drawer marks itself offscreen or covered. ── */
  useEffect(() => {
    const section = stageRef.current?.closest<HTMLElement>('.drawer');
    if (!section) return;
    const check = () => setVisible(section.dataset.offscreen !== 'true' && section.dataset.covered !== 'true');
    const mo = new MutationObserver(check);
    mo.observe(section, { attributes: true, attributeFilter: ['data-offscreen', 'data-covered'] });
    check();
    return () => mo.disconnect();
  }, []);
  useEffect(() => {
    lakeRef.current?.setVisible(visible);
  }, [visible]);

  /* ── Stillness ─────────────────────────────────────────────────────── */
  const stillTimer = useRef<number | undefined>(undefined);
  const settleTimer = useRef<number | undefined>(undefined);
  const autoSettle = useRef(false);
  const dismissed = useRef(false);
  const stillRef = useRef(still);
  stillRef.current = still;
  const verseRef = useRef(verse);
  verseRef.current = verse;
  const armedRef = useRef(false);
  armedRef.current = introDone && visible;

  const becomeStill = useCallback((reveal: boolean, auto: boolean) => {
    lakeRef.current?.setCalm(true);
    setStill(true);
    window.clearTimeout(settleTimer.current);
    settleTimer.current = undefined;
    if (!reveal) return;
    autoSettle.current = auto;
    settleTimer.current = window.setTimeout(() => {
      settleTimer.current = undefined;
      setVerse(true);
    }, reduced ? 200 : SETTLE_MS);
  }, [reduced]);

  // while the swan's note is open the lake may still settle, but keeps its verse back
  const swanOpen = useRef(false);
  const arm = useCallback(() => {
    window.clearTimeout(stillTimer.current);
    // stillness only counts while someone can see the lake (not in a background tab)
    if (!armedRef.current || document.hidden) return;
    stillTimer.current = window.setTimeout(
      () => becomeStill(!dismissed.current && !swanOpen.current && !verseRef.current, true),
      STILL_MS
    );
  }, [becomeStill]);

  /** Anything that moves the visitor's hand (or the page) stirs the water again. */
  const unsettle = useCallback(() => {
    if (settleTimer.current !== undefined && autoSettle.current) {
      window.clearTimeout(settleTimer.current);
      settleTimer.current = undefined;
    }
    if (stillRef.current) {
      lakeRef.current?.setCalm(false);
      setStill(false);
    }
    arm();
  }, [arm]);

  useEffect(() => {
    if (!introDone || !visible) {
      window.clearTimeout(stillTimer.current);
      return;
    }
    arm();
    const onScroll = () => unsettle();
    // a tab sent to the background stops counting; a pending reveal waits for the visitor
    const onVisibility = () => {
      if (!document.hidden) return arm();
      window.clearTimeout(stillTimer.current);
      if (settleTimer.current !== undefined && autoSettle.current) {
        window.clearTimeout(settleTimer.current);
        settleTimer.current = undefined;
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('scroll', onScroll);
      document.removeEventListener('visibilitychange', onVisibility);
      window.clearTimeout(stillTimer.current);
    };
  }, [introDone, visible, arm, unsettle]);

  // Leaving the cover lets the lake forget: come back, and be still again.
  useEffect(() => {
    if (visible) return;
    window.clearTimeout(settleTimer.current);
    settleTimer.current = undefined;
    dismissed.current = false;
    setVerse(false);
    if (stillRef.current) {
      lakeRef.current?.setCalm(false);
      setStill(false);
    }
  }, [visible]);

  useEffect(() => {
    lakeRef.current?.setInner(verse);
    if (verse) discover('mind');
  }, [verse]);

  useEffect(
    () => () => {
      window.clearTimeout(stillTimer.current);
      window.clearTimeout(settleTimer.current);
    },
    []
  );

  /* ── The visitor's hand on the water ───────────────────────────────── */
  const hand = useRef({ x: 0, y: 0, t: 0, rx: 0, ry: 0, rt: 0 });
  const toPaint = (e: PointerEvent) => {
    const paint = paintRef.current!;
    const r = paint.getBoundingClientRect();
    const k = paint.clientWidth / (r.width || 1); // the drawer may be scaled while it recedes
    return { x: (e.clientX - r.left) * k, y: (e.clientY - r.top) * k };
  };

  const onPointerMove = (e: PointerEvent) => {
    if (e.pointerType === 'touch') return; // a finger moving is a scroll, not a stir
    const lake = lakeRef.current;
    const g = geoRef.current;
    if (!lake || !g) return;
    const { x, y } = toPaint(e);
    const h = hand.current;
    const now = performance.now();
    const dt = Math.max(8, now - h.t);
    const speed = (Math.hypot(x - h.x, y - h.y) / dt) * 1000;
    Object.assign(h, { x, y, t: now });
    lake.stir(speed);
    if (y > g.horizon + 2 && (Math.hypot(x - h.rx, y - h.ry) > 38 || now - h.rt > 140)) {
      lake.drop(x, y - g.horizon, Math.min(0.6, Math.max(0.14, speed / 1800)), 2.2);
      Object.assign(h, { rx: x, ry: y, rt: now });
    }
    unsettle();
  };

  const onPointerDown = (e: PointerEvent) => {
    const lake = lakeRef.current;
    const g = geoRef.current;
    if (!lake || !g) return;
    const { x, y } = toPaint(e);
    if (y > g.horizon + 2 && !(e.target as HTMLElement).closest('button, a')) lake.drop(x, y - g.horizon, 1);
    unsettle();
  };

  const onWake = useCallback((x: number, strength: number) => {
    const g = geoRef.current;
    if (g) lakeRef.current?.drop(x, (g.H - g.horizon) * g.lane, strength, 2.4);
  }, []);

  const onHint = () => {
    if (verse) {
      // Stir the water: the verse sinks, a pebble goes in, and the lake won't offer
      // it again until the visitor comes back to it.
      dismissed.current = true;
      window.clearTimeout(settleTimer.current);
      settleTimer.current = undefined;
      setVerse(false);
      const g = geoRef.current;
      if (g) lakeRef.current?.drop(g.W / 2, Math.max(24, (g.H - g.horizon) * 0.45), 1.2, 3);
      if (stillRef.current) {
        lakeRef.current?.setCalm(false);
        setStill(false);
      }
      arm();
    } else {
      dismissed.current = false;
      becomeStill(true, false);
    }
  };

  /* ── The verse comes up through the still water ─────────────────────── */
  const verseShown = useRef(false);
  useGSAP(
    () => {
      if (verseShown.current === verse) return;
      verseShown.current = verse;
      const lines = gsap.utils.toArray<HTMLElement>('.lake__verse > *', stageRef.current);
      if (reduced) {
        gsap.set(lines, { opacity: verse ? 1 : 0, y: 0, filter: 'none' });
        return;
      }
      if (verse) {
        gsap.fromTo(
          lines,
          { opacity: 0, y: 16, filter: 'blur(6px)' },
          { opacity: 1, y: 0, filter: 'blur(0px)', duration: 1.6, stagger: 0.32, ease: 'power2.out', overwrite: 'auto', clearProps: 'filter' }
        );
      } else {
        gsap.to(lines, { opacity: 0, y: 10, duration: 0.5, stagger: 0.05, ease: 'power2.in', overwrite: 'auto' });
      }
    },
    { dependencies: [verse], scope: stageRef }
  );

  /* ── First light ───────────────────────────────────────────────────── */
  useGSAP(
    (_ctx, contextSafe) => {
      if (!intro || !contextSafe) return;
      const stage = stageRef.current!;
      let started = false;
      let cancelled = false;

      const play = contextSafe(() => {
        // A stale run (StrictMode re-mount, fast unmount) must never start a second timeline.
        if (started || cancelled) return;
        const lake = lakeRef.current;
        if (!lake) return;
        started = true;
        layout();
        gsap.set(stage, { visibility: 'visible' });
        const dawn = { p: 0 };
        const rise = { r: 0 };
        const g = () => geoRef.current;

        gsap
          .timeline({ defaults: { ease: 'expoOut' }, onComplete: () => setIntroDone(true) })
          .from('.lake__margin > *', { opacity: 0, y: (i) => (i < 3 ? -8 : 8), duration: 1.1, stagger: 0.06, ease: 'power2.out' }, 0.1)
          .to(dawn, { p: 1, duration: 3.8, ease: 'power1.inOut', onUpdate: () => lake.setDawn(dawn.p) }, 0.1)
          // the first drop: a thought, and the lake wakes
          .call(
            () => {
              const geo = g();
              lake.setCalm(false);
              if (geo) lake.drop(geo.W / 2, (geo.H - geo.horizon) * 0.42, 1.25, 3.4);
            },
            [],
            0.75
          )
          .fromTo('.lake__name-line', { yPercent: 108 }, { yPercent: 0, duration: 2.6, ease: 'power3.out' }, 1.05)
          .to(rise, { r: 1, duration: 2.6, ease: 'power3.out', onUpdate: () => lake.setRise(rise.r) }, 1.05)
          .call(() => setSwanReady(true), [], 1.6)
          .from('.lantern', { opacity: 0, duration: 2, stagger: 0.35, ease: 'power1.out' }, 1.6)
          .from('.lake__shore', { yPercent: 12, opacity: 0, duration: 2 }, 1.3)
          .from('.lake__plaque', { y: 28, opacity: 0, duration: 1.3 }, 2.5)
          .from('.lake__hint', { opacity: 0, duration: 1.4, ease: 'power1.out' }, 3.1);
      });

      // First light waits for someone to see it: a tab opened in the background keeps its
      // night until it is brought forward.
      let ready = false; // fonts are in, or we've waited long enough for them
      const start = () => {
        ready = true;
        if (!document.hidden) play();
      };
      const onVisible = () => ready && !document.hidden && play();
      document.addEventListener('visibilitychange', onVisible);
      document.fonts.ready.then(start);
      const fallback = window.setTimeout(start, 1800);
      return () => {
        cancelled = true;
        window.clearTimeout(fallback);
        document.removeEventListener('visibilitychange', onVisible);
      };
    },
    { scope: stageRef }
  );

  const g = geo;
  return (
    <Drawer id="top" index={index} label="Introduction" className="hero">
      <div ref={stageRef} className={`lake ${intro ? 'is-intro' : ''}`} data-still={still || undefined} data-verse={verse || undefined}>
        <div className="lake__margin lake__margin--top">
          <p className="lake__folio">Side A · Vol. 26</p>
          <p className="lake__cartouche">
            <span className="lake__cartouche-deva" lang="sa">
              मानसरोवर
            </span>
            <span className="lake__cartouche-en">
              <span className="lake__cartouche-name">Mānasarovar, </span>the lake of the mind
            </span>
          </p>
          <nav className="lake__nav" aria-label="Contents">
            <ul>
              {CONTENTS.map((c) => (
                <li key={c.id}>
                  <a
                    href={`#${c.id}`}
                    onClick={(e) => {
                      e.preventDefault();
                      scrollToSection(c.id);
                    }}
                  >
                    {c.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="lake__frame">
          <div ref={paintRef} className="lake__painting" onPointerMove={onPointerMove} onPointerDown={onPointerDown}>
            <canvas ref={skyRef} className="lake__sky" aria-hidden="true" />
            <canvas ref={waterRef} className="lake__water" aria-hidden="true" />
            <Lanterns />

            <h1 ref={nameRef} className="lake__name">
              <span ref={lineRef} className="lake__name-line">
                {profile.first} {profile.last}
                <span ref={probeRef} className="lake__probe" aria-hidden="true" />
              </span>
            </h1>
            <p className="visually-hidden">
              A painting at first light: Lake Mānasarovar below Mount Kailash. In the water the name is reflected in its own script, {profile.devanagari}.
            </p>

            {g && (
              <Swan
                width={g.W}
                ready={swanReady}
                still={still || !visible}
                reduced={reduced}
                onWake={onWake}
                onNote={(open) => {
                  swanOpen.current = open;
                  if (!open) arm();
                }}
              />
            )}
            <LotusShore className="lake__shore" />

            <div ref={verseElRef} id="lake-verse" className="lake__verse" aria-hidden={!verse}>
              <p className="lake__verse-deva" lang="sa">
                {mind.lines[0].text}
              </p>
              <p className="lake__verse-en">{mind.lines[1].text}</p>
              <p className="lake__verse-src">Patañjali, Yoga Sūtra 1.2</p>
              <p className="lake__verse-name">{mind.lines[2].text}</p>
            </div>
            <button type="button" className="lake__hint" aria-expanded={verse} aria-controls="lake-verse" onClick={onHint}>
              {verse ? 'Stir the water' : 'Be still, and the lake will show you.'}
            </button>

            <div className="lake__plaque">
              <p className="lake__role">{profile.now}</p>
              <p className="lake__tagline">{profile.tagline}</p>
              <button type="button" className="lake__cuts" onClick={() => openLinerNotes()}>
                {deepCuts.length} deep cuts inside <span aria-hidden="true">→</span>
              </button>
            </div>
          </div>
        </div>

        <div className="lake__margin lake__margin--bottom">
          <p className="lake__places">Delhi × Daegu × Palo Alto</p>
          <button className="lake__cue" type="button" onClick={() => scrollToSection('about')} aria-label="Scroll to About">
            <span className="loop" aria-hidden="true">
              ↓
            </span>
          </button>
          <p className="lake__time">
            <time aria-label={`${time} India Standard Time`}>
              {hh}
              <b className="lake__colon loop" aria-hidden="true">
                :
              </b>
              {mm}
            </time>{' '}
            IST
          </p>
        </div>
      </div>
    </Drawer>
  );
}

