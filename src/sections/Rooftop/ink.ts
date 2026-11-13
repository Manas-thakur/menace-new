/* The rooftop's inks. A canvas can't read the site's CSS tokens per pixel, so the
 * house inks are restated here in the same OKLCH terms and converted once to sRGB
 * hex (cheap to hand to fillStyle sixty times a frame, and safe on older browsers). */

/** OKLCH (L 0–1, C, H degrees) → '#rrggbb'. */
export function ink(L: number, C: number, H: number): string {
  const h = (H * Math.PI) / 180;
  const a = C * Math.cos(h);
  const b = C * Math.sin(h);
  const l_ = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m_ = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s_ = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const lin = [
    4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_,
    -1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_,
    -0.0041960863 * l_ - 0.7034186147 * m_ + 1.707614701 * s_,
  ];
  return (
    '#' +
    lin
      .map((x) => {
        const v = x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(Math.max(x, 0), 1 / 2.4) - 0.055;
        return Math.round(Math.min(1, Math.max(0, v)) * 255)
          .toString(16)
          .padStart(2, '0');
      })
      .join('')
  );
}

/** Same, with alpha, for tints. */
export function inkA(L: number, C: number, H: number, alpha: number): string {
  const hex = ink(L, C, H);
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}

/* ── The cast, in the site's inks ─────────────────────────────── */
export const P = {
  line: ink(0.2, 0.025, 55), // outline
  // cat — an orange tabby
  cat: ink(0.72, 0.14, 58),
  catDeep: ink(0.6, 0.14, 46),
  cream: ink(0.94, 0.03, 88),
  pink: ink(0.76, 0.1, 10),
  // dog — a desi pariah, tan with a white chest, and a red collar
  dog: ink(0.66, 0.085, 62),
  dogDeep: ink(0.54, 0.08, 55),
  white: ink(0.95, 0.015, 90),
  collar: ink(0.6, 0.22, 26),
  nose: ink(0.22, 0.02, 40),
  // gauraiya — the house sparrow
  sparrow: ink(0.55, 0.075, 58),
  sparrowDeep: ink(0.38, 0.06, 50),
  cap: ink(0.62, 0.012, 80),
  bib: ink(0.2, 0.01, 60),
  beak: ink(0.35, 0.03, 60),
  // kabootar — the rock pigeon
  pigeon: ink(0.68, 0.02, 270),
  pigeonDeep: ink(0.5, 0.025, 270),
  neck: ink(0.55, 0.1, 175),
  feet: ink(0.6, 0.16, 22),
  // the kid with the charkhi
  skin: ink(0.62, 0.08, 55),
  hair: ink(0.2, 0.015, 60),
  kurta: ink(0.837, 0.166, 88.4),
  pyjama: ink(0.92, 0.02, 90),
  reel: ink(0.6, 0.22, 26),
  // kites
  kiteA: ink(0.64, 0.245, 24),
  kiteB: ink(0.85, 0.166, 92),
  kiteC: ink(0.56, 0.12, 155),
  kiteD: ink(0.5, 0.17, 260),
  manjha: ink(0.92, 0.02, 90),
  lantern: ink(0.9, 0.17, 85),
  heart: ink(0.64, 0.245, 24),
  zz: ink(0.95, 0.01, 90),
  grain: ink(0.86, 0.11, 85),
};

/* ── The terrace (drawn in daylight; other hours are tinted over it) ── */
export const T = {
  plaster: ink(0.8, 0.055, 75),
  plasterLight: ink(0.88, 0.05, 82),
  plasterShade: ink(0.66, 0.06, 62),
  jaali: ink(0.48, 0.06, 50),
  tile: ink(0.66, 0.1, 42),
  tileLight: ink(0.72, 0.095, 46),
  tileLine: ink(0.55, 0.09, 38),
  tank: ink(0.25, 0.012, 250),
  tankLight: ink(0.36, 0.015, 250),
  brick: ink(0.5, 0.13, 35),
  brickLine: ink(0.4, 0.1, 30),
  wood: ink(0.45, 0.07, 55),
  rope: ink(0.86, 0.05, 85),
  ropeShade: ink(0.74, 0.06, 80),
  pot: ink(0.56, 0.14, 40),
  leaf: ink(0.575, 0.151, 145.1),
  leafDeep: ink(0.42, 0.11, 150),
  post: ink(0.3, 0.02, 60),
  line: ink(0.25, 0.01, 60),
  bulb: ink(0.95, 0.12, 95),
  clothes: [ink(0.517, 0.198, 24.8), ink(0.804, 0.155, 68.7), ink(0.569, 0.119, 154.9), ink(0.499, 0.174, 260.5), ink(0.94, 0.03, 88)],
};

/* ── Each hour of the sky over Delhi ─────────────────────────── */
export type SkyInks = {
  bands: string[]; // top → horizon
  far: string;
  near: string;
  nearLight: string;
  window: string;
  windowLit: string;
  viaduct: string;
  tree: string;
  cloud: [string, string];
  tint: string | null; // laid over the terrace and the cast
};

export const SKIES: Record<'night' | 'dawn' | 'day' | 'dusk', SkyInks> = {
  night: {
    bands: [ink(0.15, 0.08, 294), ink(0.2, 0.095, 292), ink(0.248, 0.107, 291), ink(0.3, 0.13, 292), ink(0.36, 0.14, 300)],
    far: ink(0.27, 0.07, 290),
    near: ink(0.19, 0.04, 285),
    nearLight: ink(0.23, 0.045, 285),
    window: ink(0.26, 0.04, 285),
    windowLit: ink(0.85, 0.16, 88),
    viaduct: ink(0.28, 0.035, 280),
    tree: ink(0.2, 0.05, 200),
    cloud: [ink(0.34, 0.07, 290), ink(0.28, 0.07, 290)],
    tint: inkA(0.18, 0.1, 290, 0.5),
  },
  dawn: {
    bands: [ink(0.33, 0.13, 292), ink(0.45, 0.13, 330), ink(0.6, 0.12, 15), ink(0.74, 0.1, 50), ink(0.86, 0.11, 78)],
    far: ink(0.52, 0.07, 320),
    near: ink(0.36, 0.06, 310),
    nearLight: ink(0.42, 0.06, 310),
    window: ink(0.3, 0.05, 310),
    windowLit: ink(0.86, 0.12, 80),
    viaduct: ink(0.44, 0.05, 320),
    tree: ink(0.33, 0.06, 250),
    cloud: [ink(0.85, 0.08, 50), ink(0.72, 0.1, 20)],
    tint: inkA(0.62, 0.12, 340, 0.16),
  },
  day: {
    bands: [ink(0.56, 0.14, 252), ink(0.63, 0.12, 245), ink(0.71, 0.095, 240), ink(0.8, 0.065, 235), ink(0.88, 0.04, 220)],
    far: ink(0.76, 0.035, 235),
    near: ink(0.66, 0.05, 70),
    nearLight: ink(0.74, 0.05, 75),
    window: ink(0.45, 0.04, 240),
    windowLit: ink(0.45, 0.04, 240),
    viaduct: ink(0.78, 0.015, 80),
    tree: ink(0.5, 0.12, 145),
    cloud: [ink(0.98, 0.01, 90), ink(0.88, 0.025, 240)],
    tint: null,
  },
  dusk: {
    bands: [ink(0.25, 0.107, 291), ink(0.38, 0.15, 330), ink(0.52, 0.18, 12), ink(0.66, 0.19, 38), ink(0.82, 0.155, 72)],
    far: ink(0.4, 0.1, 15),
    near: ink(0.27, 0.093, 18),
    nearLight: ink(0.32, 0.095, 20),
    window: ink(0.22, 0.07, 18),
    windowLit: ink(0.86, 0.15, 80),
    viaduct: ink(0.33, 0.09, 18),
    tree: ink(0.25, 0.07, 10),
    cloud: [ink(0.75, 0.15, 45), ink(0.58, 0.18, 20)],
    tint: inkA(0.45, 0.15, 25, 0.26),
  },
};

export const SUN = { disc: ink(0.97, 0.06, 95), halo: ink(0.92, 0.1, 92), low: ink(0.8, 0.155, 60), lowBand: ink(0.66, 0.2, 35) };
export const MOON = { lit: ink(0.95, 0.03, 95), dark: ink(0.3, 0.06, 290) };
export const STAR = [ink(0.96, 0.03, 95), ink(0.78, 0.06, 290)];
