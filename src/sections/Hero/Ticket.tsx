import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { gsap } from '../../lib/gsap';
import { prefersReducedMotion } from '../../lib/motion';
import { profile } from '../../data/profile';
import { deepCuts } from '../../data/deep';
import { onDiscover, openLinerNotes, useDeepCuts } from '../../lib/deep';
import { describeSky, useDelhiSky, type Sky } from '../../lib/delhiSky';
import './Ticket.css';

/* The ticket: admit one to Side A. Printed like an old cinema stub — crimson tear-off,
 * perforated tear line, security-print paper — and punched like a Delhi bus ticket:
 * a conductor's hole for every deep cut the visitor has found. */

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

/** Where `el` sits inside `ancestor`, untouched by the ticket's own tilt. */
function offsetIn(el: HTMLElement, ancestor: HTMLElement) {
  let x = 0;
  let y = 0;
  let node: HTMLElement | null = el;
  while (node && node !== ancestor) {
    x += node.offsetLeft;
    y += node.offsetTop;
    node = node.offsetParent as HTMLElement | null;
  }
  return { x, y };
}

const circle = (x: number, y: number, r: number) =>
  `M${(x - r).toFixed(2)} ${y.toFixed(2)}a${r.toFixed(2)} ${r.toFixed(2)} 0 1 0 ${(2 * r).toFixed(2)} 0a${r.toFixed(2)} ${r.toFixed(2)} 0 1 0 ${(-2 * r).toFixed(2)} 0Z`;

/** The paper itself: rounded corners, a notch top and bottom at the tear line, the tear
 *  line's perforations, and a hole for every punch. Drawn as one even-odd path. */
function paper(W: number, H: number, tear: number, holes: { x: number; y: number; r: number }[]) {
  const r = 7;
  const n = Math.min(12, Math.max(8, H * 0.04));
  let d = `M${r} 0H${tear - n}A${n} ${n} 0 0 0 ${tear + n} 0H${W - r}Q${W} 0 ${W} ${r}V${H - r}Q${W} ${H} ${W - r} ${H}H${tear + n}A${n} ${n} 0 0 0 ${tear - n} ${H}H${r}Q0 ${H} 0 ${H - r}V${r}Q0 0 ${r} 0Z`;
  for (let y = n + 9; y <= H - n - 9; y += 9) d += circle(tear, y, 2.1);
  for (const h of holes) d += circle(h.x, h.y, h.r);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><path fill-rule="evenodd" d="${d}"/></svg>`;
}

const SKY_MARK: Record<Sky, string> = { night: '☾', dawn: '◐', day: '☀', dusk: '◑' };

export function Ticket() {
  const time = useLocalTime(profile.timeZone);
  const { sky, moon } = useDelhiSky();
  const [hh, mm] = time.split(':');
  const found = useDeepCuts();
  const wrapRef = useRef<HTMLElement>(null);
  const paperRef = useRef<HTMLDivElement>(null);
  const stubRef = useRef<HTMLDivElement>(null);
  const total = deepCuts.length;
  const count = found.length;

  // Cut the paper again whenever its size changes or another hole is punched.
  useLayoutEffect(() => {
    const el = paperRef.current;
    const stub = stubRef.current;
    if (!el || !stub) return;
    const cut = () => {
      const holes = Array.from(el.querySelectorAll<HTMLElement>('.ticket__stage.is-punched'), (stage) => {
        const { x, y } = offsetIn(stage, el);
        const size = stage.offsetWidth;
        return { x: x + size / 2, y: y + stage.offsetHeight / 2, r: Math.max(2, size / 2 - 1.5) };
      });
      const url = `url("data:image/svg+xml,${encodeURIComponent(paper(el.offsetWidth, el.offsetHeight, stub.offsetWidth, holes))}")`;
      el.style.setProperty('-webkit-mask-image', url);
      el.style.setProperty('mask-image', url);
    };
    cut();
    const ro = new ResizeObserver(cut);
    ro.observe(el);
    return () => ro.disconnect();
  }, [found]);

  // A new find while the ticket is in sight: the punch goes through and the chad drops out.
  useEffect(
    () =>
      onDiscover((id) => {
        const wrap = wrapRef.current;
        if (!wrap || prefersReducedMotion() || wrap.closest('[data-offscreen="true"], [data-covered="true"]')) return;
        window.setTimeout(() => {
          const el = paperRef.current;
          const stage = el?.querySelector<HTMLElement>(`.ticket__stage[data-cut="${id}"]`);
          if (!el || !stage) return;
          const { x, y } = offsetIn(stage, el);
          const chad = document.createElement('span');
          chad.className = 'ticket__chad';
          Object.assign(chad.style, { left: `${x}px`, top: `${y}px`, width: `${stage.offsetWidth}px`, height: `${stage.offsetHeight}px` });
          wrap.appendChild(chad);
          gsap
            .timeline({ onComplete: () => chad.remove() })
            .fromTo(el, { y: 0 }, { y: 2.5, duration: 0.06, ease: 'power2.out', yoyo: true, repeat: 1 }, 0)
            .to(
              chad,
              { y: 110, x: gsap.utils.random(-28, 28), rotation: gsap.utils.random(-220, 220), opacity: 0, duration: 1.15, ease: 'power2.in' },
              0.06
            );
        }, 60);
      }),
    []
  );

  const cta = count === 0 ? `${total} deep cuts inside` : count === total ? `All ${total} found · liner notes` : `${count} of ${total} found · liner notes`;

  return (
    <aside ref={wrapRef} className="hero__ticket" aria-label="Ticket — admit one">
      <div ref={paperRef} className="ticket">
        <i className="perch perch--ticket-a" data-perch="ticket-a" aria-hidden="true" />
        <i className="perch perch--ticket-b" data-perch="ticket-b" aria-hidden="true" />
        <div ref={stubRef} className="ticket__stub" aria-hidden="true">
          <div className="ticket__stub-print">
            <span className="ticket__alt">
              <span lang="hi">प्रवेश</span> · <span lang="ko">입장</span>
            </span>
            <span className="ticket__admit">Admit one</span>
            <span className="ticket__serial">№ 0026</span>
          </div>
        </div>

        <div className="ticket__body">
          <p className="ticket__head">
            <span className="ticket__now">
              <i className="ticket__dot loop" aria-hidden="true" /> Now playing
            </span>
            <span className="ticket__side">Side A · Vol. 26</span>
          </p>
          <p className="ticket__title">{profile.now}</p>
          <p className="ticket__line">{profile.tagline}</p>
          <p className="ticket__meta">
            <span>Delhi × Daegu × Palo Alto</span>
            <span>
              <span className="ticket__sky" aria-hidden="true">
                {SKY_MARK[sky]}
              </span>{' '}
              <time aria-label={`${time} India Standard Time — ${describeSky(sky, moon)} in Delhi`}>
                {hh}
                <b className="ticket__colon loop" aria-hidden="true">
                  :
                </b>
                {mm}
              </time>{' '}
              IST
            </span>
          </p>
          <div className="ticket__punch">
            <span className="ticket__punch-label" aria-hidden="true">
              Deep cuts
            </span>
            <ol className="ticket__stages" aria-hidden="true">
              {deepCuts.map((c) => (
                <li key={c.id} data-cut={c.id} className={`ticket__stage ${found.includes(c.id) ? 'is-punched' : ''}`}>
                  {c.no}
                </li>
              ))}
            </ol>
          </div>
          <button type="button" className="ticket__cuts" onClick={() => openLinerNotes()}>
            {cta} <span aria-hidden="true">→</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
