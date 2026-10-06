import { Marquee } from './Marquee';
import { Stamp, Sticker, Tape, TornEdge } from './Print';
import './Kit.css';

/** Visual check page for the shared primitives (?only=kit). Not shipped in the main page. */
export function Kit() {
  return (
    <div className="kit">
      <section className="kit__row kit__row--crimson">
        <TornEdge className="kit__torn" seed={3} />
        <div className="tx tx-mandala" style={{ ['--tx-color' as string]: 'var(--color-maroon-deep)', ['--tx-opacity' as string]: 0.35 }} />
        <h2 className="kit__label">torn edge · mandala mask</h2>
      </section>
      <section className="kit__row kit__row--teal">
        <div className="tx tx-feather" />
        <div className="tx tx-halftone" style={{ ['--tx-color' as string]: 'var(--color-teal-night)', ['--tx-opacity' as string]: 0.8 }} />
        <h2 className="kit__label">feather tile · halftone fade</h2>
        <div className="kit__stickers">
          <Sticker rotate={-8} size="lg">
            <span className="kit__sticker-a">MENACE</span>
          </Sticker>
          <Sticker rotate={6}>
            <span className="kit__sticker-b">SIH ’23</span>
          </Sticker>
          <Sticker rotate={-3} size="sm">
            <span className="kit__sticker-c">$ cd /</span>
          </Sticker>
        </div>
      </section>
      <section className="kit__row kit__row--orange">
        <div className="tx tx-jaali" style={{ ['--tx-color' as string]: 'var(--color-orange-deep)', ['--tx-opacity' as string]: 0.4 }} />
        <h2 className="kit__label">jaali · stamp · tape</h2>
        <Stamp className="kit__stamp">
          <div className="kit__stamp-face">भारत INDIA ₹26</div>
        </Stamp>
        <div className="kit__clip">
          <Tape className="kit__tape" />
          Clipping with tape
        </div>
      </section>
      <section className="kit__row kit__row--blue">
        <Marquee items={['Delhi × Daegu × Palo Alto', 'AI infra', 'Harness engineering']} variant="tape" tilt={-3} speed={30} />
        <Marquee items={['Python', 'PyTorch', 'LangGraph', 'YOLOv8']} variant="strip" direction="right" speed={30} />
        <Marquee items={['Tune in']} variant="ghost" speed={40} decorative />
      </section>
    </div>
  );
}
