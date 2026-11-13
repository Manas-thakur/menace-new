import type { Sky, Sun } from '../../lib/delhiSky';
import { MOON, P, SKIES, STAR, SUN, T, type SkyInks } from './ink';
import * as F from './figures';

/* A Delhi chhat (rooftop), drawn live in pixel art on one small canvas.
 *
 * Why it stays light on a weak phone: the canvas is only a few hundred pixels across
 * (the browser scales it up with crisp edges), the sky, the city and the terrace are
 * painted once into three still layers, and each frame just stacks those and draws a
 * handful of tiny figures, twelve times a second. It stops entirely whenever the
 * cover is off screen, covered by the next drawer, or the tab is hidden. */

const TICK = 1000 / 12;

type Say = { text: string; lang: string };
const SAYS: Record<'cat' | 'dog' | 'sparrow' | 'pigeon' | 'sleepy', Say[]> = {
  cat: [
    { text: 'म्याऊँ', lang: 'hi' },
    { text: '야옹', lang: 'ko' },
    { text: 'mrrp?', lang: 'en' },
  ],
  dog: [
    { text: 'भौं भौं!', lang: 'hi' },
    { text: '멍멍!', lang: 'ko' },
    { text: 'woof!', lang: 'en' },
  ],
  sparrow: [
    { text: 'चीं-चीं', lang: 'hi' },
    { text: '짹짹', lang: 'ko' },
    { text: 'chirp!', lang: 'en' },
  ],
  pigeon: [
    { text: 'गुटरगूँ', lang: 'hi' },
    { text: '구구', lang: 'ko' },
    { text: 'coo…', lang: 'en' },
  ],
  sleepy: [
    { text: 'zz…', lang: 'en' },
    { text: 'हम्म…', lang: 'hi' },
    { text: '…5 more minutes', lang: 'en' },
  ],
};

const rng = (seed: number) => () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const pick = <T>(xs: T[], r = Math.random) => xs[Math.floor(r() * xs.length)];

type Layout = {
  S: number;
  W: number;
  H: number;
  narrow: boolean;
  floor: number; // first row of the terrace floor
  parapet: number; // top of the wall at the back of the terrace
  viaduct: number;
  bandTop: number; // where the pets walk
  bandBottom: number;
  tank: { x: number; top: number };
  charpai: { x: number; y: number; w: number };
  posts: [number, number];
  lineY: number;
  tulsi: number;
  kid: { x: number; y: number };
};

type Box = [number, number, number, number];
type Pet = {
  kind: 'cat' | 'dog';
  x: number;
  y: number;
  dir: 1 | -1;
  state: 'walk' | 'sit' | 'groom' | 'sleep' | 'chase' | 'jump' | 'bark';
  timer: number;
  f: number;
  tx: number;
  ty: number;
  jump?: { x0: number; y0: number; x1: number; y1: number; n: number; i: number; then: Pet['state'] };
  onCot: boolean;
  box: Box;
};
type Bird = {
  kind: 'sparrow' | 'pigeon';
  x: number;
  y: number;
  dir: 1 | -1;
  state: 'perch' | 'fly' | 'sleep' | 'circle';
  f: number;
  timer: number;
  peck: number;
  fly?: { x0: number; y0: number; x1: number; y1: number; n: number; i: number };
  home: { x: number; y: number };
  angle: number;
  box: Box;
};
type Bubble = { el: HTMLElement; until: number; ax: () => [number, number] };

export type RooftopOptions = {
  sky: Sky;
  sun: Sun;
  moon: number;
  still: boolean;
  /** called when someone follows the kite string down to the kid */
  onString: () => Say;
};

export class Rooftop {
  private ctx: CanvasRenderingContext2D;
  private L!: Layout;
  private ink!: SkyInks;
  private back = document.createElement('canvas');
  private city = document.createElement('canvas');
  private front = document.createElement('canvas');
  private cast = document.createElement('canvas');
  private clouds: { c: HTMLCanvasElement; x: number; y: number; v: number }[] = [];
  private stars: [number, number][] = [];
  private pets: Pet[] = [];
  private birds: Bird[] = [];
  private grains: { x: number; y: number; life: number }[] = [];
  private bits: { x: number; y: number; life: number; kind: 'heart' | 'z' }[] = [];
  private train = { x: 0, dir: 1 as 1 | -1, on: false, next: 60 };
  private flockAt = 300;
  private bubbles = new Map<object, Bubble>();
  private kidObj = {};
  private kidBox: Box = [0, 0, 0, 0];
  private kiteBoxes: Box[] = [];
  private pointer = { x: -99, y: -99, at: -1e9, speed: 0 };
  private t = 0;
  private raf = 0;
  private last = 0;
  private acc = 0;
  private active = false;
  private opts: RooftopOptions;

  constructor(
    private canvas: HTMLCanvasElement,
    private stage: HTMLElement,
    private bubbleLayer: HTMLElement,
    opts: RooftopOptions,
  ) {
    this.ctx = canvas.getContext('2d', { alpha: false })!;
    this.opts = opts;
    this.layout();
  }

  /* ── size, layers, cast ────────────────────────────────────── */

  layout() {
    const cssW = Math.max(1, this.stage.clientWidth);
    const cssH = Math.max(1, this.stage.clientHeight);
    const narrow = cssW < 600;
    const S = clamp(Math.round(cssW / (narrow ? 130 : 300)), 2, 6);
    const W = Math.ceil(cssW / S);
    const H = Math.ceil(cssH / S);
    const floor = H - Math.max(26, Math.round(H * 0.24));
    const parapet = floor - 8;
    const tankX = W - (narrow ? 20 : Math.round(W * 0.14));
    this.L = {
      S,
      W,
      H,
      narrow,
      floor,
      parapet,
      viaduct: parapet - 11,
      bandTop: floor + 21,
      bandBottom: H - 2,
      tank: { x: tankX, top: floor - 20 },
      charpai: narrow ? { x: 3, y: floor + 10, w: 26 } : { x: Math.round(W * 0.06), y: floor + 10, w: 34 },
      posts: narrow ? [58, 92] : [Math.round(W * 0.42), Math.round(W * 0.64)],
      lineY: parapet - 13,
      tulsi: tankX - 10,
      kid: { x: narrow ? 40 : Math.round(W * 0.3), y: floor + 15 },
    };
    for (const c of [this.canvas, this.back, this.city, this.front, this.cast]) {
      c.width = W;
      c.height = H;
    }
    this.canvas.style.width = `${W * S}px`;
    this.canvas.style.height = `${H * S}px`;
    this.ctx.imageSmoothingEnabled = false;
    this.paintStill();
    this.castAll();
    this.draw();
  }

  setSky(sky: Sky, sun: Sun, moon: number) {
    const was = this.opts.sky;
    this.opts = { ...this.opts, sky, sun, moon };
    this.paintStill();
    if ((was === 'night') !== (sky === 'night')) this.castAll();
    this.draw();
  }

  private get night() {
    return this.opts.sky === 'night';
  }

  private paintStill() {
    this.ink = SKIES[this.opts.sky];
    this.paintBack();
    this.paintCity();
    this.paintFront();
    this.makeClouds();
  }

  private paintBack() {
    const { W, H, parapet } = this.L;
    const g = this.back.getContext('2d')!;
    const bands = this.ink.bands;
    const bh = parapet / bands.length;
    for (let y = 0; y < H; y++) {
      const i = Math.min(bands.length - 1, Math.floor(y / bh));
      g.fillStyle = bands[i];
      g.fillRect(0, y, W, 1);
      // dither into the next band over its last three rows: sparse, half, dense
      const into = (i + 1) * bh - y;
      if (i < bands.length - 1 && into <= 3) {
        g.fillStyle = bands[i + 1];
        for (let x = 0; x < W; x++) {
          const on = into > 2 ? (x + 2 * (y % 2)) % 4 === 0 : into > 1 ? (x + y) % 2 === 0 : (x + y) % 4 !== 0;
          if (on) g.fillRect(x, y, 1, 1);
        }
      }
    }
    const { sun, moon } = this.opts;
    const across = clamp((sun.azimuth - 180) / 120, -1, 1);
    if (this.opts.sky === 'day') {
      // on a phone the name and the box fill the upper sky: keep the sun in the free top-right
      const sx = this.L.narrow ? Math.round(W * 0.82) : Math.round(W * (0.5 + across * 0.38));
      const sy = this.L.narrow ? 16 : Math.round(clamp(parapet - (sun.altitude / 80) * parapet, 10, parapet - 14));
      disc(g, sx, sy, 7, SUN.halo, (x, y) => (x + y) % 2 === 0);
      disc(g, sx, sy, 5, SUN.disc);
    } else if (this.opts.sky === 'dawn' || this.opts.sky === 'dusk') {
      // the house sunset: a big banded sun sitting on the city
      const sx = Math.round(W * (0.5 + across * 0.3));
      const r = this.L.narrow ? 11 : 14;
      const sy = Math.round(parapet - 6 - clamp(sun.altitude, -6, 8) * 1.5);
      disc(g, sx, sy, r, SUN.low, (_x, y) => !(y > sy + 1 && (y - sy) % 3 === 0));
      disc(g, sx, sy, r - 3, SUN.disc, (_x, y) => !(y > sy + 1 && (y - sy) % 3 === 0) && y < sy - 2);
    } else {
      const mx = Math.round(W * (this.L.narrow ? 0.84 : 0.82));
      const my = this.L.narrow ? 14 : Math.round(parapet * 0.22);
      const r = 5;
      const k = Math.cos(2 * Math.PI * moon);
      for (let dy = -r; dy <= r; dy++)
        for (let dx = -r; dx <= r; dx++) {
          if (dx * dx + dy * dy > r * r + 1) continue;
          const w = Math.sqrt(Math.max(0, r * r - dy * dy)) || 1;
          const lit = moon < 0.5 ? dx > k * w : dx < -k * w;
          g.fillStyle = lit ? MOON.lit : MOON.dark;
          g.fillRect(mx + dx, my + dy, 1, 1);
        }
    }
    const r = rng(7);
    this.stars = [];
    if (this.night) {
      const n = Math.round((W * parapet) / 500);
      for (let i = 0; i < n; i++) this.stars.push([Math.floor(r() * W), Math.floor(r() * parapet * 0.75)]);
      g.fillStyle = STAR[1];
      for (const [x, y] of this.stars) g.fillRect(x, y, 1, 1);
    }
  }

  private paintCity() {
    const { W, parapet, viaduct, narrow } = this.L;
    const k = this.ink;
    const g = this.city.getContext('2d')!;
    g.clearRect(0, 0, W, this.L.H);
    const r = rng(26);
    // far blocks
    g.fillStyle = k.far;
    for (let x = -2; x < W;) {
      const w = 5 + Math.floor(r() * 8);
      const h = 10 + Math.floor(r() * 12);
      g.fillRect(x, parapet - h, w, h);
      x += w;
    }
    // a mosque's domes and minarets, and a tower that remembers the Qutub
    const dx = Math.round(W * (narrow ? 0.3 : 0.26));
    g.fillRect(dx - 14, parapet - 18, 28, 18);
    disc(g, dx, parapet - 22, 6, k.far, (_x, y) => y <= parapet - 18);
    g.fillRect(dx, parapet - 30, 1, 3);
    disc(g, dx - 10, parapet - 19, 3, k.far, (_x, y) => y <= parapet - 18);
    disc(g, dx + 10, parapet - 19, 3, k.far, (_x, y) => y <= parapet - 18);
    for (const mx of [dx - 17, dx + 16]) {
      g.fillRect(mx, parapet - 36, 2, 36);
      g.fillRect(mx - 1, parapet - 37, 4, 2);
      g.fillRect(mx, parapet - 39, 2, 2);
    }
    const qx = Math.round(W * (narrow ? 0.78 : 0.7));
    for (let y = 0; y < 46; y++) {
      const w = Math.round(6 - (y / 46) * 3);
      g.fillStyle = y % 10 === 9 ? k.nearLight : k.far;
      g.fillRect(qx - Math.floor(w / 2) - (y % 10 === 9 ? 1 : 0), parapet - y - 1, w + (y % 10 === 9 ? 2 : 0), 1);
    }
    // neem trees
    g.fillStyle = k.tree;
    for (let i = 0; i < Math.max(3, Math.round(W / 50)); i++) {
      const tx = Math.floor(r() * W);
      disc(g, tx, parapet - 4, 4 + Math.floor(r() * 3), k.tree);
    }
    // near buildings with their windows and tanks
    for (let x = -3; x < W;) {
      const w = 7 + Math.floor(r() * 10);
      const h = 6 + Math.floor(r() * (narrow ? 10 : 15));
      const top = parapet - h;
      g.fillStyle = k.near;
      g.fillRect(x, top, w, h);
      g.fillStyle = k.nearLight;
      g.fillRect(x, top, w, 1);
      for (let wy = top + 3; wy < parapet - 1; wy += 4)
        for (let wx = x + 2; wx < x + w - 1; wx += 3) {
          const lit = this.night ? r() < 0.4 : this.opts.sky === 'day' ? false : r() < 0.15;
          g.fillStyle = lit ? k.windowLit : k.window;
          g.fillRect(wx, wy, 1, 2);
        }
      if (r() < 0.4) {
        g.fillStyle = T.tank;
        g.fillRect(x + 2, top - 3, 3, 3);
      }
      if (r() < 0.2) {
        g.fillStyle = k.near;
        g.fillRect(x + w - 3, top - 5, 1, 5);
      }
      x += w + (r() < 0.3 ? 2 : 0);
    }
    // the metro's viaduct across the city
    g.fillStyle = k.viaduct;
    g.fillRect(0, viaduct, W, 2);
    g.fillStyle = k.near;
    g.fillRect(0, viaduct + 2, W, 1);
    g.fillStyle = k.viaduct;
    for (let x = 6; x < W; x += 26) g.fillRect(x, viaduct + 3, 3, parapet - viaduct - 3);
  }

  private paintFront() {
    const { W, H, floor, parapet, tank, charpai: c, posts, lineY, tulsi } = this.L;
    const g = this.front.getContext('2d')!;
    g.clearRect(0, 0, W, H);
    const r = rng(11);
    // parapet with its jaali band
    g.fillStyle = T.plaster;
    g.fillRect(0, parapet, W, floor - parapet);
    g.fillStyle = T.plasterLight;
    g.fillRect(0, parapet, W, 1);
    g.fillStyle = T.plasterShade;
    g.fillRect(0, parapet + 1, W, 1);
    g.fillRect(0, floor - 1, W, 1);
    g.fillStyle = T.jaali;
    for (let x = 1; x < W; x += 4) {
      g.fillRect(x, parapet + 3, 2, 1);
      g.fillRect(x + (x % 8 === 1 ? 0 : 1), parapet + 4, 1, 1);
      g.fillRect(x, parapet + 5, 2, 1);
    }
    // terracotta floor tiles
    g.fillStyle = T.tile;
    g.fillRect(0, floor, W, H - floor);
    g.fillStyle = T.tileLine;
    g.fillRect(0, floor, W, 2);
    for (let y = floor + 6, row = 0; y < H; y += 7, row++) {
      g.fillRect(0, y, W, 1);
      for (let x = (row % 2) * 6; x < W; x += 12) g.fillRect(x, y + 1, 1, 6);
    }
    g.fillStyle = T.tileLight;
    for (let i = 0; i < (W * (H - floor)) / 40; i++) g.fillRect(Math.floor(r() * W), floor + 2 + Math.floor(r() * (H - floor)), 1, 1);
    // water tank on its brick stand
    g.fillStyle = T.brick;
    g.fillRect(tank.x - 1, floor - 4, 16, 6);
    g.fillStyle = T.brickLine;
    g.fillRect(tank.x - 1, floor - 2, 16, 1);
    for (let x = tank.x; x < tank.x + 15; x += 4) g.fillRect(x, floor - 4, 1, 2);
    g.fillStyle = T.tank;
    g.fillRect(tank.x, tank.top, 14, 16);
    g.fillRect(tank.x + 3, tank.top - 2, 8, 2);
    g.fillStyle = T.tankLight;
    for (let y = tank.top + 3; y < tank.top + 16; y += 4) g.fillRect(tank.x, y, 14, 1);
    g.fillRect(tank.x + 2, tank.top + 1, 1, 14);
    // tulsi in its pot
    g.fillStyle = T.pot;
    g.fillRect(tulsi, floor + 2, 7, 5);
    g.fillStyle = T.plasterLight;
    g.fillRect(tulsi, floor + 2, 7, 1);
    disc(g, tulsi + 3, floor - 1, 4, T.leaf);
    g.fillStyle = T.leafDeep;
    for (const [x, y] of [
      [1, -3],
      [4, -2],
      [2, 0],
      [5, 1],
      [0, 1],
    ])
      g.fillRect(tulsi + x, floor - 1 + y, 1, 1);
    // the charpai
    g.fillStyle = T.wood;
    g.fillRect(c.x, c.y, c.w, 1);
    g.fillRect(c.x, c.y + 4, c.w, 1);
    g.fillRect(c.x, c.y, 2, 10);
    g.fillRect(c.x + c.w - 2, c.y, 2, 10);
    for (let y = c.y + 1; y < c.y + 4; y++)
      for (let x = c.x + 2; x < c.x + c.w - 2; x++) {
        g.fillStyle = (x + y) % 2 ? T.rope : T.ropeShade;
        g.fillRect(x, y, 1, 1);
      }
    // clothesline posts and the line itself
    g.fillStyle = T.post;
    for (const p of posts) g.fillRect(p, lineY - 1, 1, floor + 4 - lineY);
    g.fillStyle = T.line;
    for (let x = posts[0]; x <= posts[1]; x++) g.fillRect(x, this.sag(x), 1, 1);
    // a bulb on the far post
    g.fillStyle = T.post;
    g.fillRect(posts[1] - 1, lineY - 3, 3, 2);
    // the hour's light over it all
    if (this.ink.tint) {
      g.globalCompositeOperation = 'source-atop';
      g.fillStyle = this.ink.tint;
      g.fillRect(0, 0, W, H);
      g.globalCompositeOperation = 'source-over';
    }
    if (this.night) {
      // the bulb's warm pool on the floor
      g.globalCompositeOperation = 'lighter';
      g.fillStyle = 'rgba(120,80,20,0.18)';
      const bx = posts[1];
      for (let y = floor; y < H; y++) {
        const half = Math.round(10 + (y - floor) * 0.9);
        g.fillRect(bx - half, y, half * 2, 1);
      }
      g.globalCompositeOperation = 'source-over';
    }
  }

  private sag(x: number) {
    const [a, b] = this.L.posts;
    return this.L.lineY + Math.round(4 * Math.sin((Math.PI * (x - a)) / (b - a)));
  }

  private makeClouds() {
    const { W, parapet } = this.L;
    const r = rng(3);
    const n = this.night ? 2 : this.L.narrow ? 3 : 4;
    this.clouds = Array.from({ length: n }, (_, i) => {
      const c = document.createElement('canvas');
      const w = 18 + Math.floor(r() * 16);
      c.width = w;
      c.height = 10;
      const g = c.getContext('2d')!;
      for (let j = 0; j < 4; j++) disc(g, 4 + Math.floor(r() * (w - 8)), 6, 3 + Math.floor(r() * 3), this.ink.cloud[0]);
      g.globalCompositeOperation = 'source-atop';
      g.fillStyle = this.ink.cloud[1];
      g.fillRect(0, 7, w, 3);
      return { c, x: Math.floor(r() * W), y: Math.floor(parapet * (0.12 + (i / n) * 0.45)), v: 0.06 + r() * 0.08 };
    });
  }

  /* Everyone in their places: awake by day, asleep at night. */
  private castAll() {
    const { W, bandTop, bandBottom, charpai, tank, parapet } = this.L;
    const mid = Math.round((bandTop + bandBottom) / 2);
    const night = this.night;
    const empty: Box = [0, 0, 0, 0];
    this.pets = [
      night
        ? {
            kind: 'cat',
            x: charpai.x + Math.round(charpai.w / 2),
            y: charpai.y,
            dir: 1,
            state: 'sleep',
            timer: 0,
            f: 0,
            tx: 0,
            ty: 0,
            onCot: true,
            box: empty,
          }
        : { kind: 'cat', x: Math.round(W * 0.55), y: mid, dir: -1, state: 'sit', timer: 30, f: 0, tx: 0, ty: 0, onCot: false, box: empty },
      night
        ? { kind: 'dog', x: tank.x - 6, y: bandTop + 3, dir: -1, state: 'sleep', timer: 0, f: 0, tx: 0, ty: 0, onCot: false, box: empty }
        : {
            kind: 'dog',
            x: Math.round(W * 0.25),
            y: bandBottom - 2,
            dir: 1,
            state: 'walk',
            timer: 60,
            f: 0,
            tx: Math.round(W * 0.7),
            ty: bandBottom - 3,
            onCot: false,
            box: empty,
          },
    ];
    const perches = this.perches();
    this.birds = [0, 1, 2].map((i) => {
      const p = perches[(i * 3 + 1) % perches.length];
      return {
        kind: 'sparrow',
        x: p.x,
        y: p.y,
        dir: i % 2 ? -1 : 1,
        state: night ? 'sleep' : 'perch',
        f: 0,
        timer: 40 + i * 30,
        peck: 0,
        home: p,
        angle: 0,
        box: empty,
      };
    });
    for (let i = 0; i < 3; i++) {
      const home = { x: tank.x + 2 + i * 5, y: tank.top - 2 };
      this.birds.push({
        kind: 'pigeon',
        x: home.x,
        y: home.y,
        dir: i === 1 ? -1 : 1,
        state: 'perch',
        f: i,
        timer: 0,
        peck: 0,
        home,
        angle: (i * 2 * Math.PI) / 3,
        box: empty,
      });
    }
    void parapet;
    this.grains = [];
    this.bits = [];
  }

  /** Where a sparrow can sit: along the parapet, the clothesline, the charpai's rail. */
  private perches() {
    const { W, parapet, posts, charpai, tank } = this.L;
    const out: { x: number; y: number }[] = [];
    for (let x = 8; x < W - 6; x += this.L.narrow ? 14 : 22) if (x < tank.x - 4 || x > tank.x + 18) out.push({ x, y: parapet });
    for (const f of [0.3, 0.7]) {
      const x = Math.round(posts[0] + (posts[1] - posts[0]) * f);
      out.push({ x, y: this.sag(x) });
    }
    out.push({ x: charpai.x + 4, y: charpai.y }, { x: charpai.x + charpai.w - 5, y: charpai.y });
    return out;
  }

  /* ── running ───────────────────────────────────────────────── */

  setActive(on: boolean) {
    if (this.opts.still) on = false;
    if (on === this.active) return;
    this.active = on;
    if (on) {
      this.last = performance.now();
      this.acc = 0;
      this.raf = requestAnimationFrame(this.frame);
    } else cancelAnimationFrame(this.raf);
  }

  private frame = (now: number) => {
    if (!this.active) return;
    this.acc += Math.min(now - this.last, 500);
    this.last = now;
    if (this.acc >= TICK) {
      let n = 0;
      while (this.acc >= TICK && n++ < 3) {
        this.step();
        this.acc -= TICK;
      }
      this.acc %= TICK;
      this.draw();
    }
    this.raf = requestAnimationFrame(this.frame);
  };

  destroy() {
    this.setActive(false);
    for (const b of this.bubbles.values()) b.el.remove();
    this.bubbles.clear();
  }

  /* ── the visitor ───────────────────────────────────────────── */

  /** A pointer over the cover, in CSS pixels relative to the stage. */
  point(cx: number, cy: number) {
    const now = performance.now();
    const x = cx / this.L.S;
    const y = cy / this.L.S;
    const dt = Math.max(16, now - this.pointer.at);
    this.pointer.speed = dt > 300 ? 0 : (Math.hypot(x - this.pointer.x, y - this.pointer.y) / dt) * 1000;
    this.pointer = { ...this.pointer, x, y, at: now };
    return this.hit(x, y) !== null;
  }

  /** A tap or click, in CSS pixels relative to the stage. */
  tap(cx: number, cy: number) {
    const x = cx / this.L.S;
    const y = cy / this.L.S;
    this.pointer = { x, y, at: performance.now(), speed: 0 };
    const who = this.hit(x, y);
    if (who === 'kite' || who === this.kidObj) {
      this.say(this.kidObj, this.opts.onString(), 5200, () => [this.kidBox[0] + 2, this.kidBox[1]]);
    } else if (who && 'kind' in who) {
      this.poke(who);
    } else if (y > this.L.floor + 3) {
      // scatter a few grains: the sparrows come down for them (and the cat notices)
      this.grains.push({ x: Math.round(x), y: Math.round(clamp(y, this.L.bandTop, this.L.bandBottom)), life: 12 * 9 });
      const free = this.birds.filter((b) => b.kind === 'sparrow' && b.state !== 'fly').slice(0, 2);
      free.forEach((b, i) =>
        this.flyTo(b, { x: Math.round(x) + (i ? 4 : -4), y: Math.round(clamp(y, this.L.bandTop, this.L.bandBottom)) }),
      );
    }
    if (this.opts.still) this.draw();
  }

  /** The keyboard way down the kite string. */
  followString() {
    this.say(this.kidObj, this.opts.onString(), 5200, () => [this.kidBox[0] + 2, this.kidBox[1]]);
    if (this.opts.still) this.draw();
  }

  private hit(x: number, y: number): Pet | Bird | 'kite' | object | null {
    const inBox = (b: Box, pad = 2) => x >= b[0] - pad && x <= b[0] + b[2] + pad && y >= b[1] - pad && y <= b[1] + b[3] + pad;
    for (const b of this.birds) if (inBox(b.box, 3)) return b;
    for (const p of [...this.pets].sort((a, b) => b.y - a.y)) if (inBox(p.box)) return p;
    if (inBox(this.kidBox)) return this.kidObj;
    for (const k of this.kiteBoxes) if (inBox(k, 3)) return 'kite';
    return null;
  }

  private poke(who: Pet | Bird) {
    const night = this.night;
    if (who.kind === 'cat' || who.kind === 'dog') {
      const p = who as Pet;
      if (p.state === 'sleep') {
        this.say(p, pick(SAYS.sleepy), 1800);
        p.timer = 12 * 2;
        return;
      }
      this.say(p, pick(SAYS[p.kind]), 1700);
      this.bits.push({ x: p.x, y: p.y - (p.kind === 'dog' ? 20 : 13), life: 14, kind: 'heart' });
      if (p.kind === 'dog') {
        p.state = 'bark';
        p.timer = 10;
      } else if (!p.onCot) {
        p.state = 'sit';
        p.timer = 12 * 4;
      }
      return;
    }
    const b = who as Bird;
    this.say(b, pick(SAYS[b.kind]), 1500);
    if (b.kind === 'sparrow' && !night && b.state === 'perch') b.timer = 8; // a chirp, then off
    if (b.kind === 'pigeon' && b.state === 'perch' && !night) this.flockAt = this.t + 10;
  }

  private say(who: object, line: Say, ms: number, anchor?: () => [number, number]) {
    let b = this.bubbles.get(who);
    if (!b) {
      const el = document.createElement('span');
      el.className = 'rooftop__bubble';
      this.bubbleLayer.appendChild(el);
      b = { el, until: 0, ax: anchor ?? (() => [0, 0]) };
      this.bubbles.set(who, b);
    }
    if (anchor) b.ax = anchor;
    else {
      const o = who as Pet | Bird;
      b.ax = () => [o.box[0] + o.box[2] / 2, o.box[1]];
    }
    b.el.textContent = line.text;
    b.el.lang = line.lang;
    b.el.classList.remove('is-on');
    void b.el.offsetWidth; // restart the pop
    b.el.classList.add('is-on');
    b.until = performance.now() + ms;
    this.placeBubble(b);
    if (this.opts.still) {
      // nothing ticks when motion is reduced: let the bubble go on a timer
      const el = b.el;
      window.setTimeout(() => {
        if (this.bubbles.get(who)?.el === el && performance.now() >= (this.bubbles.get(who)?.until ?? 0)) el.classList.remove('is-on');
      }, ms);
    }
  }

  private placeBubble(b: Bubble) {
    const [x, y] = b.ax();
    const S = this.L.S;
    b.el.style.transform = `translate(${Math.round(x * S)}px, ${Math.round((y - 1) * S)}px) translate(-50%, -100%)`;
  }

  /* ── the simulation, one tick at a time ────────────────────── */

  private step() {
    this.t++;
    const t = this.t;
    const { W } = this.L;
    for (const c of this.clouds) {
      c.x += c.v;
      if (c.x > W + 2) c.x = -c.c.width - 2;
    }
    // the metro
    const tr = this.train;
    if (!tr.on && t >= tr.next) {
      tr.on = true;
      tr.dir = Math.random() < 0.5 ? 1 : -1;
      tr.x = tr.dir > 0 ? -48 : W + 2;
    }
    if (tr.on) {
      tr.x += 2.5 * tr.dir;
      if (tr.x > W + 50 || tr.x < -52) {
        tr.on = false;
        tr.next = t + 12 * (14 + Math.floor(Math.random() * 18));
      }
    }
    for (const p of this.pets) this.stepPet(p);
    this.stepFlock();
    for (const b of this.birds) if (b.kind === 'sparrow') this.stepSparrow(b);
    for (const g of this.grains) g.life--;
    this.grains = this.grains.filter((g) => g.life > 0);
    for (const s of this.bits) {
      s.life--;
      if (t % 2 === 0) s.y--;
    }
    this.bits = this.bits.filter((s) => s.life > 0);
    const now = performance.now();
    for (const [k, b] of this.bubbles) {
      if (now > b.until) {
        b.el.classList.remove('is-on');
        if (now > b.until + 400) {
          b.el.remove();
          this.bubbles.delete(k);
        }
      } else this.placeBubble(b);
    }
  }

  private pointerRecent() {
    return performance.now() - this.pointer.at < 1600 && this.pointer.y > this.L.floor + 3;
  }

  private stepPet(p: Pet) {
    const { W, bandTop, bandBottom, charpai } = this.L;
    p.f++;
    p.timer--;
    const night = this.night;
    const other = this.pets.find((q) => q !== p)!;

    if (p.state === 'jump' && p.jump) {
      const j = p.jump;
      j.i++;
      const k = j.i / j.n;
      p.x = j.x0 + (j.x1 - j.x0) * k;
      p.y = j.y0 + (j.y1 - j.y0) * k - Math.sin(Math.PI * k) * 8;
      if (j.i >= j.n) {
        p.state = j.then;
        p.y = j.y1;
        p.timer = 12 * (3 + Math.random() * 5);
        p.jump = undefined;
      }
      return;
    }

    // a pointer on the floor: the cat stalks it, the dog ambles over to see
    if (!p.onCot && p.state !== 'sleep' && p.state !== 'bark' && this.pointerRecent()) {
      const tx = clamp(this.pointer.x, 6, W - 6);
      const ty = clamp(this.pointer.y, bandTop, bandBottom);
      const d = Math.hypot(tx - p.x, ty - p.y);
      const keep = p.kind === 'dog' ? 10 : 2;
      if (d > keep) {
        p.state = 'chase';
        const v = p.kind === 'cat' ? 1.6 : 0.9;
        p.x += ((tx - p.x) / d) * Math.min(v, d - keep);
        p.y += ((ty - p.y) / d) * Math.min(v * 0.6, d - keep);
        p.dir = tx >= p.x ? 1 : -1;
        return;
      }
      if (p.state === 'chase') {
        p.state = 'sit';
        p.timer = 12 * 2;
        if (p.kind === 'cat') this.bits.push({ x: p.x, y: p.y - 13, life: 12, kind: 'heart' });
      }
    }

    if (p.state === 'chase') {
      p.state = 'sit';
      p.timer = 12;
    }
    if (p.state === 'sleep') {
      if (t12(p.f, 30)) this.bits.push({ x: p.x + p.dir * 4, y: p.y - 8, life: 18, kind: 'z' });
      if (!night && p.timer <= 0 && Math.random() < 0.01) this.wake(p);
      if (night && p.timer === 0 && !p.onCot && p.kind === 'cat') this.toCot(p);
      return;
    }
    if (p.state === 'bark') {
      if (p.timer <= 0) {
        p.state = night ? 'sleep' : 'sit';
        p.timer = 12 * 3;
      }
      return;
    }
    if (p.state === 'walk') {
      const dx = p.tx - p.x;
      const dy = p.ty - p.y;
      const d = Math.hypot(dx, dy);
      const v = p.kind === 'cat' ? 0.55 : 0.7;
      if (d < 1 || p.timer <= 0) {
        this.settle(p);
        return;
      }
      p.x += (dx / d) * v;
      p.y += (dy / d) * v * 0.6;
      p.dir = dx >= 0 ? 1 : -1;
      // the dog sometimes trots along behind the cat
      if (p.kind === 'dog' && Math.random() < 0.004 && !other.onCot) {
        p.tx = clamp(other.x - other.dir * 14, 10, W - 10);
        p.ty = clamp(other.y, bandTop, bandBottom);
      }
      return;
    }
    // sitting, grooming, or napping on the charpai
    if (p.timer <= 0) {
      if (night && p.kind === 'cat' && !p.onCot) return this.toCot(p);
      if (night) {
        p.state = 'sleep';
        return;
      }
      if (p.onCot) {
        if (Math.random() < 0.5) {
          p.onCot = false;
          p.state = 'jump';
          p.jump = { x0: p.x, y0: p.y, x1: p.x + 10, y1: bandTop + 2, n: 7, i: 0, then: 'walk' };
          p.tx = Math.round(W * (0.3 + Math.random() * 0.5));
          p.ty = bandTop + Math.random() * (bandBottom - bandTop);
        } else {
          p.state = Math.random() < 0.5 ? 'sleep' : 'groom';
          p.timer = 12 * (5 + Math.random() * 8);
        }
        return;
      }
      const roll = Math.random();
      if (p.kind === 'cat' && roll < 0.15) return this.toCot(p);
      if (roll < 0.65) {
        p.state = 'walk';
        p.tx = clamp(p.x + (Math.random() - 0.5) * W * 0.8, 10, W - 10);
        p.ty = bandTop + Math.random() * (bandBottom - bandTop);
        p.timer = 12 * 12;
      } else if (p.kind === 'cat' && roll < 0.85) {
        p.state = 'groom';
        p.timer = 12 * (3 + Math.random() * 3);
      } else {
        p.state = Math.random() < 0.3 ? 'sleep' : 'sit';
        p.timer = 12 * (3 + Math.random() * 5);
      }
    }
    void charpai;
  }

  private settle(p: Pet) {
    p.state = Math.random() < 0.6 ? 'sit' : 'groom';
    if (p.kind === 'dog' && p.state === 'groom') p.state = 'sit';
    p.timer = 12 * (2 + Math.random() * 4);
  }

  private wake(p: Pet) {
    p.state = 'sit';
    p.timer = 12 * 2;
  }

  private toCot(p: Pet) {
    const c = this.L.charpai;
    const x1 = c.x + Math.round(c.w / 2);
    if (Math.abs(p.x - x1) > 16 || p.y > this.L.bandTop + 4) {
      // walk to the foot of the charpai first
      p.state = 'walk';
      p.tx = x1 + 6;
      p.ty = this.L.bandTop + 1;
      p.timer = 12 * 14;
      if (Math.abs(p.x - p.tx) < 2 && Math.abs(p.y - p.ty) < 2) {
        p.state = 'jump';
        p.onCot = true;
        p.jump = { x0: p.x, y0: p.y, x1, y1: c.y, n: 7, i: 0, then: 'sleep' };
      }
      return;
    }
    p.state = 'jump';
    p.onCot = true;
    p.jump = { x0: p.x, y0: p.y, x1, y1: c.y, n: 7, i: 0, then: Math.random() < 0.7 ? 'sleep' : 'groom' };
  }

  private flyTo(b: Bird, to: { x: number; y: number }) {
    b.state = 'fly';
    const n = Math.round(8 + Math.hypot(to.x - b.x, to.y - b.y) / 6);
    b.fly = { x0: b.x, y0: b.y, x1: to.x, y1: to.y, n, i: 0 };
    b.dir = to.x >= b.x ? 1 : -1;
    b.home = to;
    b.timer = 12 * (6 + Math.random() * 8);
    b.peck = 0;
  }

  private stepSparrow(b: Bird) {
    b.f++;
    if (b.state === 'fly' && b.fly) {
      const j = b.fly;
      j.i++;
      const k = j.i / j.n;
      b.x = j.x0 + (j.x1 - j.x0) * k;
      b.y = j.y0 + (j.y1 - j.y0) * k - Math.sin(Math.PI * k) * (10 + Math.abs(j.x1 - j.x0) * 0.15);
      if (j.i >= j.n) {
        b.state = this.night ? 'sleep' : 'perch';
        b.x = j.x1;
        b.y = j.y1;
        b.fly = undefined;
      }
      return;
    }
    if (b.state === 'sleep') {
      if (!this.night) b.state = 'perch';
      return;
    }
    if (this.night) {
      b.state = 'sleep';
      return;
    }
    b.timer--;
    // startled: a pointer rushing past, or the cat getting close on the ground
    const cat = this.pets.find((p) => p.kind === 'cat')!;
    const rushed =
      performance.now() - this.pointer.at < 300 && this.pointer.speed > 140 && Math.hypot(this.pointer.x - b.x, this.pointer.y - b.y) < 22;
    const stalked = cat.state !== 'sleep' && !cat.onCot && Math.abs(cat.x - b.x) < 16 && Math.abs(cat.y - b.y) < 10;
    if (rushed || stalked) return this.flyTo(b, this.freePerch(b));
    const grain = this.grains.find((g) => Math.abs(g.x - b.x) < 8 && Math.abs(g.y - b.y) < 4);
    if (grain) {
      b.peck = b.f % 6 < 2 ? 1 : 0;
      return;
    }
    b.peck = b.f % 40 < 3 ? 1 : 0;
    if (b.f % 23 === 0 && Math.random() < 0.5) {
      b.dir = b.dir > 0 ? -1 : 1;
      if (b.y === this.L.parapet) b.x = clamp(b.x + b.dir * 2, 3, this.L.W - 3);
    }
    if (b.timer <= 0) this.flyTo(b, this.freePerch(b));
  }

  private freePerch(b: Bird) {
    const taken = this.birds.filter((o) => o !== b).map((o) => o.home);
    const ps = this.perches().filter((p) => !taken.some((q) => Math.abs(q.x - p.x) < 5 && q.y === p.y) && Math.abs(p.x - b.x) > 10);
    return pick(ps.length ? ps : this.perches());
  }

  private stepFlock() {
    const flock = this.birds.filter((b) => b.kind === 'pigeon');
    const { tank, W } = this.L;
    const t = this.t;
    if (flock[0].state === 'perch' && !this.night && t >= this.flockAt) flock.forEach((b) => ((b.state = 'circle'), (b.timer = 12 * 9)));
    const cx = tank.x + 7;
    const cy = tank.top - 26;
    const rx = Math.min(70, W * 0.3);
    for (const b of flock) {
      b.f++;
      if (b.state === 'perch') {
        b.peck = b.f % 50 < 4 ? 1 : 0;
        continue;
      }
      b.timer--;
      if (b.timer > 14) {
        b.angle += 0.11;
        const nx = cx + Math.cos(b.angle) * rx;
        b.dir = nx >= b.x ? 1 : -1;
        b.x = nx;
        b.y = cy + Math.sin(b.angle) * 12;
      } else {
        // home again
        const k = 1 - Math.max(0, b.timer) / 14;
        b.x += (b.home.x - b.x) * k * 0.5;
        b.y += (b.home.y - b.y) * k * 0.5;
        if (b.timer <= 0) {
          b.state = 'perch';
          b.x = b.home.x;
          b.y = b.home.y;
          this.flockAt = t + 12 * (25 + Math.floor(Math.random() * 20));
        }
      }
    }
  }

  /* ── drawing ───────────────────────────────────────────────── */

  draw() {
    const { W, H, viaduct, posts, lineY } = this.L;
    const g = this.ctx;
    const t = this.t;
    g.drawImage(this.back, 0, 0);
    if (this.night) {
      g.fillStyle = STAR[0];
      this.stars.forEach(([x, y], i) => {
        if ((t + i * 7) % 41 > 4) g.fillRect(x, y, 1, 1);
      });
    }
    for (const c of this.clouds) g.drawImage(c.c, Math.round(c.x), c.y);
    g.drawImage(this.city, 0, 0);
    if (this.train.on) this.drawTrain(g, Math.round(this.train.x), viaduct - 5);
    g.drawImage(this.front, 0, 0);

    // the cast, drawn on its own layer so the hour's tint falls on them too
    const c = this.cast.getContext('2d')!;
    c.clearRect(0, 0, W, H);
    this.drawClothes(c);
    this.drawKites(c);
    const kid = F.kid(this.t % 40 < 6);
    const kx = this.L.kid.x;
    const ky = this.L.kid.y;
    figure(c, kid.fig, kx, ky, 1);
    this.kidBox = [kx - 3, ky - 14, 9, 14];
    this.drawString(c, this.kites()[0], [kx + kid.hand[0], ky + kid.hand[1]]);
    for (const gr of this.grains) {
      c.fillStyle = P.grain;
      c.fillRect(gr.x - 1, gr.y, 1, 1);
      c.fillRect(gr.x + 1, gr.y + 1, 1, 1);
      c.fillRect(gr.x, gr.y - 1, 1, 1);
    }
    const drawables: { y: number; draw: () => void }[] = [];
    for (const p of this.pets) drawables.push({ y: p.onCot ? this.L.charpai.y + 11 : p.y, draw: () => this.drawPet(c, p) });
    for (const b of this.birds)
      drawables.push({ y: b.state === 'fly' || b.state === 'circle' ? 9999 : b.y - 100, draw: () => this.drawBird(c, b) });
    drawables.sort((a, b) => a.y - b.y).forEach((d) => d.draw());
    if (this.ink.tint) {
      c.globalCompositeOperation = 'source-atop';
      c.fillStyle = this.ink.tint;
      c.fillRect(0, 0, W, H);
      c.globalCompositeOperation = 'source-over';
    }
    g.drawImage(this.cast, 0, 0);

    // lights stay bright after dark: the bulb, the kite lantern
    if (this.night) {
      g.fillStyle = T.bulb;
      g.fillRect(posts[1], lineY - 1, 1, 1);
      const k = this.kites()[0];
      g.fillStyle = P.lantern;
      g.fillRect(k.x, k.y + 7, 2, 2);
      g.fillStyle = 'rgba(255,214,120,0.35)';
      g.fillRect(k.x - 1, k.y + 6, 4, 4);
    }
    for (const s of this.bits) (s.kind === 'heart' ? heart : zee)(g, Math.round(s.x), Math.round(s.y), s.life);
  }

  private kites() {
    const { W, parapet, narrow } = this.L;
    const t = this.t;
    return [
      {
        x: Math.round(W * 0.52 + 3 * Math.sin(t * 0.05)),
        y: Math.round(parapet * (narrow ? 0.76 : 0.3) + 2 * Math.sin(t * 0.09)),
        a: P.kiteA,
        b: P.kiteB,
      },
      {
        x: Math.round(W * (narrow ? 0.84 : 0.66) + 2 * Math.sin(t * 0.04 + 2)),
        y: Math.round(parapet * (narrow ? 0.84 : 0.6) + 2 * Math.sin(t * 0.07 + 1)),
        a: P.kiteD,
        b: P.kiteC,
      },
    ];
  }

  private drawKites(c: CanvasRenderingContext2D) {
    const ks = this.kites();
    this.kiteBoxes = [];
    ks.forEach((k, i) => {
      for (let dy = -3; dy <= 3; dy++) {
        const half = 3 - Math.abs(dy);
        c.fillStyle = k.a;
        c.fillRect(k.x - half, k.y + dy, half + 1, 1);
        c.fillStyle = k.b;
        c.fillRect(k.x + 1, k.y + dy, half, 1);
      }
      c.fillStyle = P.line;
      c.fillRect(k.x, k.y - 3, 1, 7);
      const sway = (this.t >> 2) % 2 ? 1 : -1;
      c.fillStyle = k.a;
      c.fillRect(k.x + sway, k.y + 4, 1, 1);
      c.fillRect(k.x, k.y + 5, 1, 1);
      c.fillRect(k.x - sway, k.y + 6, 1, 1);
      this.kiteBoxes.push([k.x - 3, k.y - 3, 7, 10]);
      if (i === 1) this.drawString(c, k, [this.L.W + 30, this.L.viaduct + 6]);
    });
  }

  private drawString(c: CanvasRenderingContext2D, k: { x: number; y: number }, to: [number, number]) {
    const [x1, y1] = to;
    const x0 = k.x;
    const y0 = k.y + 3;
    const mx = (x0 + x1) / 2 + 6;
    const my = (y0 + y1) / 2 + 8;
    const n = Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) * 1.2);
    c.fillStyle = P.manjha;
    for (let i = 0; i <= n; i++) {
      const s = i / n;
      const x = (1 - s) * (1 - s) * x0 + 2 * (1 - s) * s * mx + s * s * x1;
      const y = (1 - s) * (1 - s) * y0 + 2 * (1 - s) * s * my + s * s * y1;
      if (i % 2 === 0 || s > 0.5) c.fillRect(Math.round(x), Math.round(y), 1, 1);
    }
  }

  private drawClothes(c: CanvasRenderingContext2D) {
    const [a, b] = this.L.posts;
    const span = b - a;
    const items = [
      { f: 0.15, w: 5, h: 7, c: T.clothes[0] },
      { f: 0.35, w: 2, h: 11, c: T.clothes[1] },
      { f: 0.55, w: 6, h: 5, c: T.clothes[2] },
      { f: 0.78, w: 4, h: 9, c: T.clothes[3] },
    ];
    items.forEach((it, i) => {
      const x = Math.round(a + span * it.f);
      const y = this.sag(x) + 1;
      const sway = ((this.t >> 3) + i) % 3 === 0 ? 1 : 0;
      c.fillStyle = it.c;
      c.fillRect(x, y, it.w, Math.ceil(it.h / 2));
      c.fillRect(x + sway, y + Math.ceil(it.h / 2), it.w, Math.floor(it.h / 2));
      if (i === 3) {
        c.fillStyle = T.line;
        c.fillRect(x + 1 + sway, y + 4, 2, it.h - 4); // the gap between jeans legs
        c.fillStyle = it.c;
      }
      c.fillStyle = P.line;
      c.fillRect(x + 1, y - 1, 1, 1);
    });
  }

  private drawTrain(g: CanvasRenderingContext2D, x: number, y: number) {
    for (let i = 0; i < 3; i++) {
      const cx = x + i * 16;
      g.fillStyle = T.plasterLight;
      g.fillRect(cx, y, 15, 5);
      g.fillStyle = T.clothes[0];
      g.fillRect(cx, y + 3, 15, 1);
      g.fillStyle = this.night ? P.lantern : T.tank;
      for (let w = cx + 2; w < cx + 14; w += 3) g.fillRect(w, y + 1, 2, 1);
    }
  }

  private drawPet(c: CanvasRenderingContext2D, p: Pet) {
    const x = Math.round(p.x);
    const y = Math.round(p.y);
    const slow = p.f >> 1;
    let fig: F.Figure;
    if (p.kind === 'cat') {
      fig =
        p.state === 'walk' || p.state === 'chase' || p.state === 'jump'
          ? F.cat.walk(p.state === 'chase' ? p.f : slow, p.state === 'chase')
          : p.state === 'sleep'
            ? F.cat.sleep()
            : F.cat.sit(slow, p.state === 'groom' && p.f % 16 < 10);
    } else {
      fig =
        p.state === 'walk' || p.state === 'chase'
          ? F.dog.walk(slow)
          : p.state === 'sleep'
            ? F.dog.sleep()
            : F.dog.sit(slow, p.state === 'bark' && p.f % 4 < 2);
    }
    const hop = p.state === 'bark' && p.f % 6 < 2 ? -1 : 0;
    figure(c, fig, x, y + hop, p.dir);
    p.box = bounds(fig, x, y + hop, p.dir);
  }

  private drawBird(c: CanvasRenderingContext2D, b: Bird) {
    const x = Math.round(b.x);
    const y = Math.round(b.y);
    let fig: F.Figure;
    if (b.kind === 'sparrow')
      fig = b.state === 'fly' ? F.sparrow.fly(b.f) : b.state === 'sleep' ? F.sparrow.sleep() : F.sparrow.perch(b.peck === 1);
    else fig = b.state === 'circle' ? F.pigeon.fly(b.f >> 1) : F.pigeon.perch(b.peck === 1);
    figure(c, fig, x, y, b.dir);
    b.box = bounds(fig, x, y, b.dir);
  }
}

/* ── little drawing helpers ──────────────────────────────────── */

function figure(c: CanvasRenderingContext2D, f: F.Figure, ox: number, oy: number, dir: number) {
  const X = (x: number, w: number) => (dir > 0 ? ox + x : ox - x - w);
  c.fillStyle = P.line;
  for (const [x, y, w, h] of f.body) c.fillRect(X(x, w) - 1, oy + y - 1, w + 2, h + 2);
  for (const [x, y, w, h, col] of f.body) {
    c.fillStyle = col;
    c.fillRect(X(x, w), oy + y, w, h);
  }
  for (const [x, y, w, h, col] of f.detail) {
    c.fillStyle = col;
    c.fillRect(X(x, w), oy + y, w, h);
  }
}

function bounds(f: F.Figure, ox: number, oy: number, dir: number): Box {
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const [x, y, w, h] of f.body) {
    const bx = dir > 0 ? ox + x : ox - x - w;
    x0 = Math.min(x0, bx);
    y0 = Math.min(y0, oy + y);
    x1 = Math.max(x1, bx + w);
    y1 = Math.max(y1, oy + y + h);
  }
  return [x0, y0, x1 - x0, y1 - y0];
}

function disc(g: CanvasRenderingContext2D, cx: number, cy: number, r: number, color: string, keep?: (x: number, y: number) => boolean) {
  g.fillStyle = color;
  for (let dy = -r; dy <= r; dy++) {
    const half = Math.floor(Math.sqrt(r * r - dy * dy + r * 0.8));
    if (!keep) {
      g.fillRect(cx - half, cy + dy, half * 2 + 1, 1);
      continue;
    }
    for (let dx = -half; dx <= half; dx++) if (keep(cx + dx, cy + dy)) g.fillRect(cx + dx, cy + dy, 1, 1);
  }
}

function heart(g: CanvasRenderingContext2D, x: number, y: number, life: number) {
  if (life < 4 && life % 2) return;
  g.fillStyle = P.heart;
  g.fillRect(x - 2, y, 2, 1);
  g.fillRect(x + 1, y, 2, 1);
  g.fillRect(x - 2, y + 1, 5, 1);
  g.fillRect(x - 1, y + 2, 3, 1);
  g.fillRect(x, y + 3, 1, 1);
}

function zee(g: CanvasRenderingContext2D, x: number, y: number, life: number) {
  if (life < 5 && life % 2) return;
  g.fillStyle = P.zz;
  g.fillRect(x, y, 3, 1);
  g.fillRect(x + 1, y + 1, 1, 1);
  g.fillRect(x, y + 2, 3, 1);
}

const t12 = (f: number, every: number) => f % every === 0;
