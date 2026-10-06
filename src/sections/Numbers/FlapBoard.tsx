import { useRef } from 'react';
import { gsap, useGSAP } from '../../lib/gsap';
import { drawerOf, onDrawerEnter } from '../../lib/enter';
import { prefersReducedMotion } from '../../lib/motion';
import type { Figure } from '../../data/profile';
import './FlapBoard.css';

const POOL = {
  digit: '0123456789',
  letter: 'ABCDEFGHJKLMNPRSTUVWXYZ',
  mark: '0123456789%+.,-',
};

const FLIP = 0.06; // one flutter, seconds
const LAND = 0.13; // the final, slower flip
const ROW_GAP = 0.12; // cascade between rows
const CELL_GAP = 0.035; // ripple across a row

function cellsFor(value: string, count: number) {
  return value.toUpperCase().padEnd(count, ' ').slice(0, count).split('');
}

function randomFor(target: string) {
  const pool = /\d/.test(target) ? POOL.digit : /[A-Z]/.test(target) ? POOL.letter : POOL.mark;
  return pool[Math.floor(Math.random() * pool.length)];
}

const glyph = (part: Element, ch: string) => {
  (part.firstElementChild as HTMLElement).textContent = ch === ' ' ? '' : ch;
};

/**
 * Append one mechanical flip of `cell` from `from` to `to` at time `at`.
 * The old top half falls (hinged at the split), revealing the new top half;
 * the new bottom half then swings down over the old bottom half.
 */
function addFlip(tl: gsap.core.Timeline, cell: Element, from: string, to: string, at: number, dur: number) {
  const [top, bottom, leafTop, leafBottom] = Array.from(cell.children);
  tl.call(
    () => {
      glyph(top, to);
      glyph(leafTop, from);
      glyph(leafBottom, to);
      gsap.set(leafTop, { rotationX: 0, autoAlpha: 1 });
      gsap.set(leafBottom, { rotationX: 90, autoAlpha: 1 });
    },
    [],
    at
  )
    .to(leafTop, { rotationX: -90, duration: dur * 0.5, ease: 'power1.in' }, at)
    .to(leafBottom, { rotationX: 0, duration: dur * 0.5, ease: 'power2.out' }, at + dur * 0.5)
    .call(
      () => {
        glyph(bottom, to);
        gsap.set([leafTop, leafBottom], { autoAlpha: 0 });
      },
      [],
      at + dur
    );
}

/** Flutter every cell of a row through a few random characters, then land on the value. */
function addRowFlips(tl: gsap.core.Timeline, row: Element, finals: string[], start: number, flutters: [number, number]) {
  row.querySelectorAll('.flap').forEach((cell, c) => {
    let t = start + c * CELL_GAP;
    let prev = (cell.firstElementChild?.textContent || ' ') as string;
    const blank = finals[c] === ' ';
    const [min, max] = blank ? [1, 2] : flutters;
    const n = min + Math.floor(Math.random() * (max - min + 1));
    for (let k = 0; k < n; k++) {
      const ch = randomFor(finals[c]);
      addFlip(tl, cell, prev, ch, t, FLIP);
      prev = ch;
      t += FLIP;
    }
    addFlip(tl, cell, prev, finals[c], t, LAND);
  });
}

function Flap({ ch }: { ch: string }) {
  const c = ch === ' ' ? '' : ch;
  return (
    <span className="flap" aria-hidden="true">
      <span className="flap__half flap__half--top">
        <b>{c}</b>
      </span>
      <span className="flap__half flap__half--bottom">
        <b>{c}</b>
      </span>
      <span className="flap__leaf flap__leaf--top">
        <b>{c}</b>
      </span>
      <span className="flap__leaf flap__leaf--bottom">
        <b>{c}</b>
      </span>
    </span>
  );
}

type FlapBoardProps = {
  rows: Figure[];
  station: string;
};

export function FlapBoard({ rows, station }: FlapBoardProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const count = Math.max(...rows.map((r) => r.value.length));
  const finals = rows.map((r) => cellsFor(r.value, count));

  const { contextSafe } = useGSAP(
    (_ctx, contextSafe) => {
      const root = rootRef.current;
      const drawer = drawerOf(root);
      if (!root || !drawer || prefersReducedMotion()) return;

      const rowEls = Array.from(root.querySelectorAll('.board__row'));
      const plates = rowEls.map((r) => Array.from(r.querySelectorAll('.board__what, .board__where')));

      // The board waits blank, name plates folded up, until the drawer arrives.
      root.querySelectorAll('.flap b').forEach((b) => (b.textContent = ''));
      gsap.set(plates.flat(), { rotationX: -90, autoAlpha: 0, transformOrigin: '50% 0%', transformPerspective: 600 });
      rowEls.forEach((r) => ((r as HTMLElement).dataset.busy = 'true'));

      onDrawerEnter(
        drawer,
        contextSafe!(() => {
          const tl = gsap.timeline({
            onComplete: () => rowEls.forEach((r) => ((r as HTMLElement).dataset.busy = 'false')),
          });
          rowEls.forEach((row, r) => {
            const start = r * ROW_GAP;
            addRowFlips(tl, row, finals[r], start, [3, 6]);
            tl.to(
              plates[r],
              { rotationX: 0, autoAlpha: 1, duration: 0.7, ease: 'expoOut', stagger: 0.08 },
              start + 0.25
            );
          });
        }),
        0.7
      );
    },
    { scope: rootRef }
  );

  const reflip = contextSafe((row: HTMLElement, r: number) => {
    if (prefersReducedMotion() || row.dataset.busy === 'true') return;
    row.dataset.busy = 'true';
    const tl = gsap.timeline({ onComplete: () => (row.dataset.busy = 'false') });
    addRowFlips(tl, row, finals[r], 0, [2, 4]);
  });

  return (
    <div className="board" ref={rootRef} style={{ ['--cells' as string]: count }}>
      <div className="board__rivets" aria-hidden="true" />
      <div className="board__head">
        <p className="board__title">
          Departures <span className="board__dot" aria-hidden="true">·</span>{' '}
          <span className="board__hi" lang="hi">
            प्रस्थान
          </span>
        </p>
        <p className="board__station">{station}</p>
      </div>

      <div className="board__labels" aria-hidden="true">
        <span>Figure</span>
        <span>What</span>
        <span>Where</span>
      </div>

      <ol className="board__rows">
        {rows.map((row, r) => (
          <li
            key={row.value + row.what}
            className="board__row"
            tabIndex={0}
            onPointerEnter={(e) => e.pointerType === 'mouse' && reflip(e.currentTarget, r)}
            onFocus={(e) => reflip(e.currentTarget, r)}
            onClick={(e) => reflip(e.currentTarget, r)}
          >
            <span className="board__cells">
              {finals[r].map((ch, c) => (
                <Flap key={c} ch={ch} />
              ))}
              <span className="visually-hidden">{row.value}</span>
            </span>
            <span className="board__what">{row.what}</span>
            <span className="board__where">{row.where}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
