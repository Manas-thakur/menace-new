import { useRef, useState, type CSSProperties } from 'react';
import { ScrollTrigger } from '../../lib/gsap';
import { stack } from '../../data/profile';

// Hand-set sizes so the stacked words read as one poster block, not a list.
const SCALE: Record<string, number> = {
  Agents: 1.12,
  Models: 1,
  Frameworks: 0.7,
  Infra: 1.2,
  Data: 1.08,
  Languages: 0.78,
};

// Rendered width of each word in em (Barlow Condensed 900, caps), measured, plus
// ~2% for the extruded shadow. Lets narrow screens shrink a word to fit its row
// instead of breaking it mid-word.
const WIDTH_EM: Record<string, number> = {
  Agents: 2.95,
  Models: 2.92,
  Frameworks: 5.12,
  Infra: 2.26,
  Data: 1.94,
  Languages: 4.37,
};

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-');

export function StackList() {
  const [open, setOpen] = useState<Set<string>>(() => new Set(['Agents']));
  const refreshTimer = useRef<number | undefined>(undefined);

  const toggle = (group: string) => {
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(group)) next.delete(group);
      else next.add(group);
      return next;
    });
    // The drawer's height changed: re-measure every scroll position once the panel settles.
    window.clearTimeout(refreshTimer.current);
    refreshTimer.current = window.setTimeout(() => ScrollTrigger.refresh(), 520);
  };

  return (
    <div className="cstack">
      {stack.map((g, i) => {
        const isOpen = open.has(g.group);
        const id = `stack-${slug(g.group)}`;
        return (
          <div
            key={g.group}
            className={`cstack__row ${i % 2 ? 'is-cream' : 'is-ink'} ${isOpen ? 'is-open' : ''}`}
            style={{ '--s': SCALE[g.group] ?? 1, '--em': WIDTH_EM[g.group] ?? 3 } as CSSProperties}
          >
            <h4 className="cstack__heading">
              <button type="button" className="cstack__word" aria-expanded={isOpen} aria-controls={id} onClick={() => toggle(g.group)}>
                <span className="cstack__label">{g.group}</span>
                <span className="cstack__leader" aria-hidden="true" />
                <span className="cstack__meta" aria-hidden="true">
                  <span className="cstack__count">{String(g.items.length).padStart(2, '0')}</span>
                  <span className="cstack__icon">
                    <i />
                    <i />
                  </span>
                </span>
              </button>
            </h4>
            <div id={id} className="cstack__panel" role="region" aria-label={g.group} aria-hidden={!isOpen}>
              <div className="cstack__panel-inner">
                <ul className="cstack__chips">
                  {g.items.map((item, ci) => (
                    <li key={item} className="cstack__chip" style={{ '--ci': ci } as CSSProperties}>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
