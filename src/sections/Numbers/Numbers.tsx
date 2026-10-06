import type { SectionProps } from '../../App';
import { Drawer } from '../../components/primitives/Drawer';
import { figures, profile } from '../../data/profile';
import { FlapBoard } from './FlapBoard';
import { StationClock } from './StationClock';
import './Numbers.css';

/* Studied from the reference's stats drawer ("RIOT BY THE / NUMBERS" on paper):
 * the counters become an Indian-railway split-flap departures board,
 * and the illustration becomes a hanging platform clock on Manas's time. */
export function Numbers({ index }: SectionProps) {
  const station = profile.base.split(',')[0];

  return (
    <Drawer id="numbers" index={index} label="Numbers" className="numbers">
      <div className="tx tx-grain" aria-hidden="true" />
      <div className="numbers__layout">
        <h2 className="numbers__title">
          <span className="numbers__title-a">By the</span>{' '}
          <span className="numbers__title-b">Numbers</span>
        </h2>
        <div className="numbers__board">
          <FlapBoard rows={figures} station={station} />
        </div>
        <div className="numbers__clock">
          <StationClock timeZone={profile.timeZone} owner={profile.first} />
        </div>
      </div>
    </Drawer>
  );
}
