// The words this cover carried while it was the first page (deep cuts 01 and 02 in
// commits 980053b–9241aa3). The live record has its own 01 and 02 again, so the saved
// cover keeps its verses here and does not count finds. To make it the cover again,
// move these back into data/deep.ts as ids 'mind' and 'swan' and call discover() from
// `found` below.

import type { DeepLine } from '../../data/deep';

export type Verse = { lines: DeepLine[]; source: string };

/** 01: be still over the water. */
export const stillness: Verse = {
  lines: [
    { text: 'योगश्चित्तवृत्तिनिरोधः', lang: 'sa' },
    { text: 'Yoga is the stilling of the ripples of the mind.' },
    { text: 'Manas is Sanskrit for the mind, and Mānasarovar is its lake. He builds the other kind.' },
  ],
  source: 'Patañjali, Yoga Sūtra 1.2. Vivekananda read it as a lake: you only see to the bottom once the ripples settle.',
};

/** 02: stop the swan as it crosses. */
export const swanSaying: Verse = {
  lines: [
    { text: 'हंसः श्वेतो बकः श्वेतो को भेदो बकहंसयोः।', lang: 'sa' },
    { text: 'नीरक्षीरविवेके तु हंसो हंसो बको बकः॥', lang: 'sa' },
    { text: 'The swan is white, the heron is white — so what tells them apart? Set milk and water before them: the swan is a swan, the heron a heron.' },
  ],
  source: 'A Sanskrit saying: the hamsa drinks the milk and leaves the water, nīra-kṣīra viveka, discernment. In Kālidāsa’s Meghadūta, the royal swans fly north to this lake.',
};

/** Where a find would be recorded if this were the live cover; a quiet no-op while it is saved. */
export function found(_id: 'mind' | 'swan') {}
