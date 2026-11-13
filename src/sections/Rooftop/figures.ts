import { P } from './ink';

/* The cast, drawn as pixel rectangles from the feet up: (0, 0) is the ground under
 * the figure, x grows the way it faces, y grows down (so the body sits at negative y).
 * `body` parts get a one-pixel outline drawn round the whole silhouette; `detail`
 * parts (eyes, stripes, the bib) are painted on top without one. */

export type Part = readonly [x: number, y: number, w: number, h: number, color: string];
export type Figure = { body: Part[]; detail: Part[] };

const legs = (xs: number[], top: number, h: number, c: string): Part[] => xs.map((x) => [x, top, 1, h, c] as const);

/* ── Bittu, the orange tabby ── */
export const cat = {
  walk(f: number, run = false): Figure {
    const a = f % 2 === 0;
    const xs = run ? (a ? [-6, -4, 2, 4] : [-5, -3, 1, 3]) : a ? [-5, -3, 0, 2] : [-4, -2, 1, 3];
    return {
      body: [
        [-5, -6, 9, 3, P.cat],
        [2, -9, 4, 4, P.cat],
        [2, -10, 1, 1, P.cat],
        [5, -10, 1, 1, P.cat],
        ...(run
          ? ([[-7, -7, 2, 1, P.cat]] as Part[])
          : ([
              [-6, -8, 1, 3, P.cat],
              [-7, -10, 1, 2, P.cat],
            ] as Part[])),
        ...legs(xs, -3, 3, P.cat),
      ],
      detail: [
        [-3, -6, 1, 1, P.catDeep],
        [-1, -6, 1, 1, P.catDeep],
        [1, -6, 1, 1, P.catDeep],
        [-3, -4, 5, 1, P.cream],
        [4, -8, 1, 1, P.line],
        [4, -7, 1, 1, P.cream],
        [5, -7, 1, 1, P.pink],
      ],
    };
  },
  sit(f: number, eyesShut = false): Figure {
    const flick = f % 12 < 3;
    return {
      body: [
        [-3, -4, 5, 4, P.cat],
        [0, -7, 3, 7, P.cat],
        [0, -10, 4, 4, P.cat],
        [0, -11, 1, 1, P.cat],
        [3, -11, 1, 1, P.cat],
        [-6, -1, 3, 1, P.cat],
        ...(flick ? ([[-7, -2, 1, 1, P.cat]] as Part[]) : ([[-7, -1, 1, 1, P.cat]] as Part[])),
      ],
      detail: [
        [-2, -4, 1, 1, P.catDeep],
        [-1, -3, 1, 1, P.catDeep],
        [1, -6, 2, 3, P.cream],
        [2, -9, 1, 1, eyesShut ? P.catDeep : P.line],
        [2, -8, 1, 1, P.cream],
        [3, -8, 1, 1, P.pink],
      ],
    };
  },
  sleep(): Figure {
    return {
      body: [
        [-4, -4, 8, 4, P.cat],
        [2, -5, 4, 3, P.cat],
        [2, -6, 1, 1, P.cat],
        [5, -6, 1, 1, P.cat],
        [-5, -2, 1, 2, P.cat],
      ],
      detail: [
        [-2, -4, 1, 1, P.catDeep],
        [0, -4, 1, 1, P.catDeep],
        [-3, -1, 6, 1, P.cream],
        [3, -4, 2, 1, P.catDeep],
        [5, -3, 1, 1, P.pink],
      ],
    };
  },
};

/* ── Sheru, a desi dog off the lane who decided this roof was his ── */
export const dog = {
  walk(f: number): Figure {
    const a = f % 2 === 0;
    const wag = f % 4 < 2;
    return {
      body: [
        [-7, -9, 12, 4, P.dog],
        [4, -13, 5, 5, P.dog],
        [9, -11, 2, 2, P.dog],
        [5, -15, 1, 2, P.dog],
        [6, -14, 1, 1, P.dog],
        ...(wag
          ? ([
              [-8, -11, 1, 3, P.dog],
              [-7, -12, 1, 1, P.dog],
            ] as Part[])
          : ([
              [-9, -11, 1, 2, P.dog],
              [-8, -12, 1, 2, P.dog],
            ] as Part[])),
        ...legs(a ? [-7, -5, 1, 3] : [-6, -4, 2, 4], -5, 5, P.dog),
      ],
      detail: [
        [-5, -9, 6, 1, P.dogDeep],
        [-4, -6, 6, 1, P.white],
        [3, -8, 2, 2, P.white],
        [4, -11, 1, 2, P.collar],
        [5, -14, 1, 1, P.dogDeep],
        [7, -12, 1, 1, P.line],
        [9, -10, 2, 1, P.white],
        [10, -11, 1, 1, P.nose],
      ],
    };
  },
  sit(f: number, bark = false): Figure {
    const wag = f % 4 < 2;
    return {
      body: [
        [-5, -6, 6, 6, P.dog],
        [0, -11, 4, 11, P.dog],
        [1, -16, 5, 5, P.dog],
        [6, -14, 2, 2, P.dog],
        [2, -18, 1, 2, P.dog],
        [3, -17, 1, 1, P.dog],
        [-9, -1, 4, 1, P.dog],
        ...(wag ? ([[-10, -2, 1, 1, P.dog]] as Part[]) : ([[-10, -1, 1, 1, P.dog]] as Part[])),
        ...(bark ? ([[6, -12, 2, 1, P.dog]] as Part[]) : []),
      ],
      detail: [
        [1, -10, 2, 6, P.white],
        [1, -12, 4, 1, P.collar],
        [2, -17, 1, 1, P.dogDeep],
        [4, -15, 1, 1, P.line],
        [6, -13, 2, 1, bark ? P.collar : P.white],
        [7, -14, 1, 1, P.nose],
        [2, -5, 1, 5, P.dogDeep],
      ],
    };
  },
  sleep(): Figure {
    return {
      body: [
        [-7, -5, 13, 5, P.dog],
        [3, -7, 6, 4, P.dog],
        [4, -8, 2, 1, P.dog],
        [-8, -3, 1, 2, P.dog],
      ],
      detail: [
        [-3, -2, 6, 1, P.white],
        [-5, -5, 6, 1, P.dogDeep],
        [3, -5, 1, 2, P.collar],
        [6, -6, 2, 1, P.dogDeep],
        [8, -5, 1, 1, P.nose],
      ],
    };
  },
};

/* ── gauraiya, the house sparrow ── */
export const sparrow = {
  perch(peck = false): Figure {
    const h = peck ? 1 : 0;
    return {
      body: [
        [-2, -4, 5, 3, P.sparrow],
        [1 + h, -6 + h, 3, 2, P.cap],
        [-3, -5, 1, 2, P.sparrowDeep],
      ],
      detail: [
        [-1, -4, 2, 1, P.sparrowDeep],
        [-1, -2, 3, 1, P.white],
        [2 + h, -6 + h, 1, 1, P.line],
        [2 + h, -5 + h, 1, 1, P.white],
        [2, -4, 1, 1, P.bib],
        [4 + h, -5 + h, 1, 1, P.beak],
        [0, -1, 1, 1, P.beak],
        [1, -1, 1, 1, P.beak],
      ],
    };
  },
  fly(f: number): Figure {
    const up = f % 2 === 0;
    return {
      body: [
        [-2, -4, 5, 2, P.sparrow],
        [2, -5, 3, 2, P.cap],
        [-4, -4, 2, 1, P.sparrowDeep],
        up ? [-1, -7, 3, 3, P.sparrowDeep] : [-1, -2, 3, 2, P.sparrowDeep],
      ],
      detail: [
        [3, -5, 1, 1, P.line],
        [5, -4, 1, 1, P.beak],
        [-1, -3, 3, 1, P.white],
      ],
    };
  },
  sleep(): Figure {
    return {
      body: [
        [-2, -5, 5, 4, P.sparrow],
        [1, -6, 2, 2, P.cap],
        [-3, -4, 1, 2, P.sparrowDeep],
      ],
      detail: [
        [-1, -5, 2, 1, P.sparrowDeep],
        [-1, -2, 3, 1, P.white],
        [2, -4, 1, 1, P.bib],
        [0, -1, 1, 1, P.beak],
      ],
    };
  },
};

/* ── kabootar, the rooftop's pigeons ── */
export const pigeon = {
  perch(bob = false): Figure {
    const b = bob ? 1 : 0;
    return {
      body: [
        [-3, -5, 6, 4, P.pigeon],
        [2, -8 + b, 3, 3, P.pigeon],
        [-5, -4, 2, 2, P.pigeonDeep],
      ],
      detail: [
        [2, -6 + b, 2, 1, P.neck],
        [3, -7 + b, 1, 1, P.feet],
        [5, -7 + b, 1, 1, P.white],
        [-2, -3, 3, 1, P.pigeonDeep],
        [0, -1, 1, 1, P.feet],
        [1, -1, 1, 1, P.feet],
      ],
    };
  },
  fly(f: number): Figure {
    const up = f % 2 === 0;
    return {
      body: [
        [-3, -4, 6, 3, P.pigeon],
        [3, -6, 2, 2, P.pigeon],
        [-5, -3, 2, 1, P.pigeonDeep],
        up ? [-2, -8, 4, 4, P.pigeonDeep] : [-2, -2, 4, 3, P.pigeonDeep],
      ],
      detail: [
        [3, -4, 1, 1, P.neck],
        [5, -5, 1, 1, P.white],
      ],
    };
  },
};

/* ── the kid on the roof, with the charkhi (the string reel) ── */
export function kid(tug: boolean): { fig: Figure; hand: [number, number] } {
  const ay = tug ? -12 : -9;
  return {
    fig: {
      body: [
        [-1, -4, 1, 4, P.pyjama],
        [1, -4, 1, 4, P.pyjama],
        [-2, -9, 5, 5, P.kurta],
        [-1, -12, 3, 3, P.skin],
        [-1, -13, 3, 1, P.hair],
        [-2, -12, 1, 1, P.hair],
        [3, ay + 1, 1, tug ? 3 : 2, P.skin],
        [3, ay - 1, 2, 2, P.reel],
      ],
      detail: [
        [1, -11, 1, 1, P.line],
        [-2, -6, 5, 1, P.kiteC],
      ],
    },
    hand: [4, ay - 1],
  };
}
