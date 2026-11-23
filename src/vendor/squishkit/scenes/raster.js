/* A tiny pixel raster for scenes: a buffer of 32-bit pixels at low resolution, painted with
 * dithered gradients, discs, glows, hills and clouds, then scaled up crisp. Dithering uses a 4×4
 * Bayer matrix, so blends between palette colours stay pixel art instead of smooth gradients. */
const B4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => (v + 0.5) / 16);
export const bayer = (x, y) => B4[(y & 3) * 4 + (x & 3)];

/* '#rrggbb' → a pixel (ABGR, little-endian) */
const cache = new Map();
export function px(hex) {
  let c = cache.get(hex);
  if (c === undefined) { const n = parseInt(hex.slice(1), 16); c = (0xff000000 | ((n & 255) << 16) | (n & 0xff00) | (n >> 16)) >>> 0; cache.set(hex, c); }
  return c;
}
export const pxs = list => list.map(px);

export class Raster {
  constructor(w = 1, h = 1) { this.resize(w, h); }
  resize(w, h) {
    this.w = w; this.h = h;
    this.img = new ImageData(w, h);
    this.buf = new Uint32Array(this.img.data.buffer);
  }
  set(x, y, c) { x |= 0; y |= 0; if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.buf[y * this.w + x] = c; }
  get(x, y) { return this.buf[(y | 0) * this.w + (x | 0)]; }
  rect(x, y, w, h, c) {
    const x0 = Math.max(0, x | 0), y0 = Math.max(0, y | 0), x1 = Math.min(this.w, (x + w) | 0), y1 = Math.min(this.h, (y + h) | 0);
    /* wholly off an edge: nothing to fill (a negative end would count back from the end of the row buffer) */
    if (x1 <= x0 || y1 <= y0) return;
    for (let j = y0; j < y1; j++) this.buf.fill(c, j * this.w + x0, j * this.w + x1);
  }
  /* a vertical gradient through several colours, dithered between neighbours */
  vgrad(y0, y1, cols) {
    const n = cols.length - 1, span = Math.max(1, y1 - y0);
    for (let y = Math.max(0, y0 | 0); y < Math.min(this.h, y1); y++) {
      const t = (y - y0) / span * n, i = Math.min(n - 1, Math.floor(t)), f = t - i, row = y * this.w;
      for (let x = 0; x < this.w; x++) this.buf[row + x] = f > bayer(x, y) ? cols[i + 1] : cols[i];
    }
  }
  disc(cx, cy, r, c) {
    const r2 = r * r;
    for (let y = Math.floor(cy - r); y <= cy + r; y++) for (let x = Math.floor(cx - r); x <= cx + r; x++) if ((x + 0.5 - cx) ** 2 + (y + 0.5 - cy) ** 2 <= r2) this.set(x, y, c);
  }
  /* a soft dithered glow: dense at r0, gone by r1 */
  glow(cx, cy, r0, r1, c, k = 1) {
    for (let y = Math.floor(cy - r1); y <= cy + r1; y++) for (let x = Math.floor(cx - r1); x <= cx + r1; x++) {
      const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
      if (d > r1) continue;
      const f = d <= r0 ? 1 : 1 - (d - r0) / (r1 - r0);
      if (f * k > bayer(x, y)) this.set(x, y, c);
    }
  }
  /* everything below a curve: fill, with an optional lighter rim on top */
  ground(fn, c, rim, rimH = 1) {
    for (let x = 0; x < this.w; x++) {
      const top = Math.round(fn(x));
      for (let y = Math.max(0, top); y < this.h; y++) this.buf[y * this.w + x] = rim && y < top + rimH ? rim : c;
    }
  }
  /* a fluffy cloud: three or four puffs and a flat base, shaded underneath */
  cloud(x, y, s, c, shade) {
    const puffs = [[0, 0, s * 0.62], [s * 0.7, -s * 0.32, s * 0.72], [s * 1.45, 0, s * 0.58], [s * 0.75, s * 0.1, s * 0.6]];
    if (shade) for (const [dx, dy, r] of puffs) this.disc(x + dx, y + dy + 1, r, shade);
    for (const [dx, dy, r] of puffs) this.disc(x + dx, y + dy, r, c);
  }
  tri(cx, base, half, height, c) {
    for (let j = 0; j < height; j++) { const w = half * (j + 1) / height; this.rect(cx - w, base - height + j, w * 2 + 1, 1, c); }
  }
  /* a stepped fade to transparent at the edges, so a scene melts into the page */
  fade(top, bottom) {
    const h = this.h;
    for (let y = 0; y < h; y++) {
      let f = 1;
      if (top) f = Math.min(f, y / (h * top));
      if (bottom) f = Math.min(f, (h - 1 - y) / (h * bottom));
      if (f >= 1) continue;
      /* four soft bands, like the GPU path */
      const row = y * this.w, a = Math.max(0, Math.floor(f * 4)) * 63.75;
      for (let x = 0; x < this.w; x++) if (this.buf[row + x]) this.buf[row + x] = a ? ((this.buf[row + x] & 0xffffff) | (a << 24)) >>> 0 : 0;
    }
  }
}

/* a stable random generator, so a scene looks the same each time at a given size */
export function seeded(seed = 1) {
  let s = seed >>> 0 || 1;
  return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) % 100000) / 100000; };
}
