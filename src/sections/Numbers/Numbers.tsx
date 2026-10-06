import { useState } from 'react';
import type { SectionProps } from '../../App';
import { Drawer } from '../../components/primitives/Drawer';
import { figures, profile } from '../../data/profile';
import { deepCut } from '../../data/deep';
import { discover } from '../../lib/deep';
import { FlapBoard } from './FlapBoard';
import { StationClock } from './StationClock';
import './Numbers.css';

const STEP = deepCut('step');

/* Studied from the reference's stats drawer ("RIOT BY THE / NUMBERS" on paper):
 * the counters become an Indian-railway split-flap departures board,
 * and the illustration becomes a hanging platform clock on Manas's time.
 * Deep cut: ask the clock, and platform 0 flaps onto the board. */
export function Numbers({ index }: SectionProps) {
  const station = profile.base.split(',')[0];
  const [asked, setAsked] = useState(false);
  // The proverb's text stays mounted while its row folds away.
  const [stepVisible, setStepVisible] = useState(false);

  const ask = (next: boolean) => {
    setAsked(next);
    if (next) setStepVisible(true);
  };

  return (
    <Drawer id="numbers" index={index} label="Numbers" className="numbers">
      <div className="tx tx-grain" aria-hidden="true" />
      <div className="numbers__layout">
        <h2 className="numbers__title">
          <span className="numbers__title-a">By the</span>{' '}
          <span className="numbers__title-b">Numbers</span>
        </h2>
        <div className="numbers__board">
          <FlapBoard
            rows={figures}
            station={station}
            step={{
              open: asked,
              visible: stepVisible,
              value: '1 step',
              line: STEP.lines[0],
              translation: STEP.lines[1].text,
              source: `Platform 0 · ${STEP.source}`,
              onLanded: () => discover(STEP.id),
              onHidden: () => setStepVisible(false),
            }}
          />
        </div>
        <div className="numbers__clock">
          <StationClock timeZone={profile.timeZone} owner={profile.first} asked={asked} onAsk={ask} />
        </div>
      </div>
    </Drawer>
  );
}
