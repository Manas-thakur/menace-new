import { useCallback, useRef, useState } from 'react';
import type { SectionProps } from '../../App';
import { Drawer } from '../../components/primitives/Drawer';
import { gsap, useGSAP } from '../../lib/gsap';
import { drawerOf, onDrawerEnter } from '../../lib/enter';
import { useReducedMotion } from '../../lib/motion';
import { instagram, photos } from '../../data/photos';
import type { View } from './geometry';
import { ViewSwitch } from './ViewSwitch';
import { Stage } from './Stage';
import { Lightbox, type LightboxState } from './Lightbox';
import './Photos.css';
import './Stage.css';
import './Lightbox.css';

const byDate = [...photos].sort((a, b) => a.iso.localeCompare(b.iso));
const SPAN = `${byDate[0].date} — ${byDate[byDate.length - 1].date}`;
const HANDLE = `@${instagram.replace(/\/$/, '').split('/').pop()}`;

const ANNOUNCE: Record<View, string> = {
  line: 'On the line: the picks hang up to dry; the rest of the roll is in the developing tray.',
  sheet: `Contact sheet: all ${photos.length} frames as negatives on a light table. Move the loupe, or focus a frame, to see it in positive.`,
  wheel: 'Colour wheel: every frame placed by its colour — hue around the wheel, saturation out from the grey centre.',
};

/**
 * The Darkroom — Manas's photographs, three ways: hung on the line, laid out as a
 * contact sheet under a loupe, and sorted round a colour wheel. Every print is the
 * same element in all three, so switching views deals the whole roll across the room.
 */
export function Photos({ index }: SectionProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const [view, setView] = useState<View>('line');
  const [announce, setAnnounce] = useState('');
  const [entered, setEntered] = useState(false);
  const [viewer, setViewer] = useState<LightboxState>(null);

  const viewRef = useRef<View>('line');
  const changeView = useCallback((v: View) => {
    if (viewRef.current === v) return;
    viewRef.current = v;
    setView(v);
    setAnnounce(ANNOUNCE[v]);
  }, []);
  const open = useCallback((i: number, from: HTMLElement) => setViewer({ index: i, from }), []);

  useGSAP(
    () => {
      const root = rootRef.current;
      const drawer = drawerOf(root);
      if (!root || !drawer) return;
      if (reduced) {
        setEntered(true);
        return;
      }
      gsap.set('[data-rise]', { y: 26, opacity: 0 });
      const trigger = onDrawerEnter(drawer, () => {
        gsap.to('[data-rise]', { y: 0, opacity: 1, duration: 0.8, ease: 'expoOut', stagger: 0.07 });
        setEntered(true);
      });
      return () => trigger.kill();
    },
    { scope: rootRef, dependencies: [reduced] }
  );

  return (
    <Drawer id="photos" index={index} label="Photos" className="photos">
      <div ref={rootRef} className="photos__room" data-view={view}>
        <div className="photos__safelight" aria-hidden="true" />
        <div className="tx tx-grain photos__grain" aria-hidden="true" />

        <header className="photos__head">
          <div className="photos__title-block">
            <p className="photos__lamp" data-rise>
              <i className="photos__bulb loop" aria-hidden="true" />
              <span>{view === 'sheet' ? 'Lightbox on' : 'Safelight on'}</span>
            </p>
            <h2 className="photos__title" data-rise>
              Darkroom
            </h2>
            <p className="photos__meta" data-rise>
              {photos.length} frames · {SPAN}
            </p>
          </div>
          <div className="photos__intro" data-rise>
            <p className="photos__lede">Things I stopped to photograph — Delhi, Daegu and the road between.</p>
            <div className="photos__controls">
              <ViewSwitch view={view} onChange={changeView} />
              <a className="photos__insta" href={instagram} target="_blank" rel="noreferrer">
                More on Instagram <span aria-hidden="true">↗</span>
                <span className="photos__handle">{HANDLE}</span>
                <span className="visually-hidden"> (opens in a new tab)</span>
              </a>
            </div>
          </div>
        </header>
        <p className="visually-hidden" aria-live="polite">
          {announce}
        </p>

        <Stage view={view} reduced={reduced} entered={entered} onView={changeView} onOpen={open} />

        <Lightbox
          state={viewer}
          reduced={reduced}
          onIndex={(i) => setViewer((v) => (v ? { ...v, index: i } : v))}
          onClosed={() => setViewer(null)}
        />
      </div>
    </Drawer>
  );
}
