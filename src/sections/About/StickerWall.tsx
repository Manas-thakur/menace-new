import type { ComponentType, CSSProperties } from 'react';
import { Sticker } from '../../components/primitives/Print';
import {
  BtechSticker,
  DaeguSticker,
  DelhiSticker,
  DymoSticker,
  MenaceSticker,
  PaloAltoSticker,
  SihSticker,
  TerminalSticker,
  TicketSticker,
} from './stickers';

type Slot = {
  id: string;
  Art: ComponentType;
  /** Position of the slot's top-left corner, % of the wall. */
  x: number;
  y: number;
  /** Resting tilt of the sticker, degrees. */
  rot: number;
  size: 'sm' | 'md' | 'lg';
  /** Stacking order at rest (later = on top). */
  z: number;
};

// Hand-placed collage, applied bottom layer first — the array order is the
// order they slap on, so later stickers overlap earlier ones like a real lid.
const SLOTS: Slot[] = [
  { id: 'menace', Art: MenaceSticker, x: 1, y: 11, rot: -6, size: 'lg', z: 2 },
  { id: 'sih', Art: SihSticker, x: 60, y: 3, rot: 9, size: 'md', z: 3 },
  { id: 'delhi', Art: DelhiSticker, x: 3, y: 36, rot: 5, size: 'md', z: 3 },
  { id: 'palo', Art: PaloAltoSticker, x: 64, y: 43, rot: 8, size: 'md', z: 4 },
  { id: 'btech', Art: BtechSticker, x: 47, y: 25, rot: -12, size: 'md', z: 5 },
  { id: 'daegu', Art: DaeguSticker, x: 29, y: 55, rot: -5, size: 'md', z: 6 },
  { id: 'dymo', Art: DymoSticker, x: 19, y: 43, rot: 3, size: 'sm', z: 7 },
  { id: 'ticket', Art: TicketSticker, x: 5, y: 76, rot: -3, size: 'md', z: 8 },
  { id: 'term', Art: TerminalSticker, x: 66, y: 77, rot: -5, size: 'sm', z: 9 },
];

export function StickerWall() {
  return (
    <div className="about__wall" role="group" aria-label="Sticker wall — drag the stickers around">
      {SLOTS.map(({ id, Art, x, y, rot, size, z }) => (
        <div
          key={id}
          className={`about__slot about__slot--${id}`}
          style={{ ['--x' as string]: `${x}%`, ['--y' as string]: `${y}%`, ['--z' as string]: z } as CSSProperties}
        >
          <div className="about__slap">
            <Sticker rotate={rot} size={size}>
              <Art />
            </Sticker>
          </div>
        </div>
      ))}
    </div>
  );
}
