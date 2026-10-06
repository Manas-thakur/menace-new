// Deep cuts — messages pressed into the record.
// Side A is what I show. Side B is what I mean.
//
// Each cut lives somewhere in the design and is found by looking closely. Every
// line here is either my own words (from my posts), a proverb or a public-domain
// classic in its original language with a free translation, or a plain fact about
// the object it is hidden in. Rewrite anything — the site reads it from here.

export type DeepLang = 'en' | 'hi' | 'sa' | 'ko';

export type DeepLine = { text: string; lang?: DeepLang };

export type DeepCut = {
  /** Stable key, remembered in the visitor's browser once found. */
  id: string;
  /** Track number on Side B's liner notes. */
  no: number;
  title: string;
  /** Which part of the record it is pressed into. */
  where: string;
  /** Shown in the liner notes while the cut is still hidden. */
  hint: string;
  /** The message: original language first, translation after. */
  lines: DeepLine[];
  /** Who said it, and why it lives where it does. */
  source: string;
};

export const sides = {
  a: 'Side A is what I show.',
  b: 'Side B is what I mean.',
};

export const deepCuts: DeepCut[] = [
  {
    id: 'mind',
    no: 1,
    title: 'मानस',
    where: 'Side A · the name',
    hint: 'Linger on the name.',
    lines: [{ text: 'मानस', lang: 'sa' }, { text: 'Sanskrit for the mind.' }, { text: 'He builds the other kind.' }],
    source: 'Sanskrit mānasa, “of the mind” — the same word as the lake Mānasarovar.',
  },
  {
    id: 'string',
    no: 2,
    title: 'The string',
    where: 'Side A · the kites',
    hint: 'Follow a kite down to the ground.',
    lines: [{ text: 'A kite climbs only because someone on the ground holds the string.' }],
    source: 'Every Delhi rooftop on the fifteenth of August.',
  },
  {
    id: 'slowly',
    no: 3,
    title: 'Slowly',
    where: 'The Kulhad Times · the cup',
    hint: 'Wait for the chai.',
    lines: [
      { text: 'धीरे धीरे रे मना, धीरे सब कुछ होय।', lang: 'hi' },
      { text: 'माली सींचे सौ घड़ा, ऋतु आए फल होय॥', lang: 'hi' },
      { text: 'Slowly, O mind — everything comes slowly. The gardener may pour a hundred pots; the fruit comes in its season.' },
    ],
    source: 'Kabir, fifteenth century. He calls the mind “mana”.',
  },
  {
    id: 'frequency',
    no: 4,
    title: 'The quiet frequency',
    where: 'Projects · the end of the dial',
    hint: 'Turn the dial as far as it goes.',
    lines: [
      { text: 'कर्मण्येवाधिकारस्ते मा फलेषु कदाचन।', lang: 'sa' },
      { text: 'Your right is to the work alone — never to its fruits.' },
    ],
    source: 'Bhagavad Gita 2.47, broadcast on 108.0 — where the FM band ends, and the number of beads on a mala.',
  },
  {
    id: 'step',
    no: 5,
    title: 'One step',
    where: 'Departures · the station clock',
    hint: 'Ask the station clock.',
    lines: [{ text: '천 리 길도 한 걸음부터', lang: 'ko' }, { text: 'Even a thousand-li road begins with a single step.' }],
    source: 'Korean proverb. Delhi to Daegu was walked the same way.',
  },
  {
    id: 'love',
    no: 6,
    title: 'With love',
    where: 'Community · the back of the auto',
    hint: 'Read the back of the auto.',
    lines: [{ text: 'देखो मगर प्यार से', lang: 'hi' }, { text: 'Look — but with love.' }],
    source: 'Painted on the backs of trucks and autos all over India.',
  },
  {
    id: 'becoming',
    no: 7,
    title: 'Becoming',
    where: 'Darkroom · the edge of the film',
    hint: 'Some things only show under the loupe.',
    lines: [{ text: 'somewhere between becoming and being forgotten.' }],
    source: 'Manas, on Instagram. A photograph waits on the film as a latent image until the dark develops it.',
  },
  {
    id: 'deadwax',
    no: 8,
    title: 'Dead wax',
    where: 'Side B · the run-out groove',
    hint: 'Look between the last groove and the label.',
    lines: [{ text: 'Thank you for listening this far.' }],
    source: 'Etched in the run-out groove, where mastering engineers have always signed their records.',
  },
  {
    id: 'hidden',
    no: 9,
    title: 'Hidden track',
    where: 'Side B · the centre hole',
    hint: 'Every record has a hole in the middle.',
    lines: [{ text: 'sometimes i think the sheep had it right. they wake with the sun, follow the hills, and never have to explain themselves to anyone.' }],
    source: 'Manas, on Instagram.',
  },
];

export const deepCut = (id: string) => deepCuts.find((c) => c.id === id)!;

/** The language of a cut's title, from its own script — "Slowly" is English even
 *  though its message is Hindi; "मानस" takes the language of its first line. */
export function titleLang(c: DeepCut): DeepLang | undefined {
  if (c.title === c.lines[0].text) return c.lines[0].lang === 'en' ? undefined : c.lines[0].lang;
  if (/[ऀ-ॿ]/.test(c.title)) return 'hi';
  if (/[ᄀ-ᇿ가-힯]/.test(c.title)) return 'ko';
  return undefined;
}
