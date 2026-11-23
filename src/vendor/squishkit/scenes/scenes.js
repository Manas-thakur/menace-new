/* The scenes: small animated pixel worlds for backgrounds, heroes and cards. Each one sets up its
 * state for a size (init), then paints a frame for a time (draw). m is the pointer, -1..1 from the
 * scene's centre, for a little parallax. Everything is painted in scene pixels and scaled up. */
import { px, pxs, bayer, seeded } from './raster.js';
import { SCENES as NATURE } from './scenes-nature.js';
const DREAMY = {}; // trimmed for this site: category not used
const PLACES = {}; // trimmed for this site: category not used
const OCEAN = {}; // trimmed for this site: category not used
const COSMOS = {}; // trimmed for this site: category not used
const COZY = {}; // trimmed for this site: category not used
const SWEETS = {}; // trimmed for this site: category not used
const ARTSY = {}; // trimmed for this site: category not used

const P = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, Array.isArray(v) ? pxs(v) : px(v)]));
const wrap = (v, n) => ((v % n) + n) % n;

/* things that drift across: clouds, birds, boats */
const drift = (x0, speed, t, w, margin = 30) => wrap(x0 + speed * t, w + margin * 2) - margin;

export const SCENES = {
  meadow: {
    title: 'Sunny meadow', desc: 'Rolling green hills, wildflowers swaying, clouds and a butterfly or two.',
    c: P({ sky: ['#6fc0ff', '#9bd5ff', '#cdeeff'], sun: '#fff3b0', halo: '#ffe27a', cloud: '#ffffff', cloudS: '#dcecff', far: '#a6dd8f', farRim: '#c4ebb0', near: '#5fb653', nearRim: '#7fcc6a', stem: '#3f8f3a', fl: ['#ff8fab', '#ffd23f', '#ffffff', '#c9a4ff'], bf: ['#ff7a9a', '#ffd23f'] }),
    init(w, h, r) {
      return { clouds: Array.from({ length: 4 }, (_, i) => ({ x: r() * w, y: h * (0.12 + r() * 0.22), s: 5 + r() * 5, v: 2 + r() * 2.5 })),
        flowers: Array.from({ length: Math.round(w * 0.35) }, () => ({ x: r() * w, d: r(), c: (r() * 4) | 0, p: r() * 6 })),
        flies: Array.from({ length: 2 }, () => ({ x: r() * w, y: h * (0.55 + r() * 0.15), p: r() * 6 })) };
    },
    draw(R, t, s, m) {
      const { w, h } = R, c = this.c;
      R.vgrad(0, h * 0.72, c.sky); R.rect(0, h * 0.72, w, h, c.sky[2]);
      R.glow(w * 0.8 - m.x, h * 0.2, h * 0.07, h * 0.16, c.halo, 0.75); R.disc(w * 0.8 - m.x, h * 0.2, h * 0.07, c.sun);
      for (const k of s.clouds) R.cloud(drift(k.x, k.v, t, w) - m.x * 1.5, k.y, k.s, c.cloud, c.cloudS);
      R.ground(x => h * 0.56 + Math.sin((x + m.x * 2) * 0.035 + 1) * h * 0.05 + Math.sin(x * 0.09) * h * 0.015, c.far, c.farRim);
      const near = x => h * 0.7 + Math.sin((x + m.x * 4) * 0.045 + 3) * h * 0.05;
      R.ground(near, c.near, c.nearRim, 1);
      for (const f of s.flowers) {
        const gy = near(f.x) + 2 + f.d * (h - near(f.x) - 3), sway = Math.sin(t * 2 + f.p) > 0.55 ? 1 : 0;
        R.set(f.x, gy, c.stem); R.set(f.x + sway, gy - 1, c.fl[f.c]);
      }
      for (const b of s.flies) {
        const x = wrap(b.x + t * 6, w), y = b.y + Math.sin(t * 2 + b.p) * 4, up = Math.sin(t * 16 + b.p) > 0;
        R.set(x - 1, y - (up ? 1 : 0), c.bf[0]); R.set(x + 1, y - (up ? 1 : 0), c.bf[0]); R.set(x, y, c.bf[1]);
      }
    }
  },

  blossom: {
    title: 'Blossom hill', desc: 'A cherry tree in full bloom on a pastel hill, petals drifting down.',
    c: P({ sky: ['#ffc9de', '#ffe3ee', '#fff4e6'], mtn: '#e6c9f0', mtnRim: '#f2dcf7', hill: '#9bd38a', hillRim: '#b7e3a5', trunk: '#7a4a5a', trunkD: '#5a3444', bloom: ['#ff8fb3', '#ffb3cd', '#ffd6e5'], petal: ['#ffb3cd', '#ffffff'], lamp: '#ffe08a', post: '#5a3444' }),
    init(w, h, r) {
      return { petals: Array.from({ length: Math.round(w * 0.12) }, () => ({ x: r() * w, y: r() * h, v: 4 + r() * 6, p: r() * 6, c: (r() * 2) | 0 })),
        blobs: Array.from({ length: 9 }, () => ({ dx: (r() - 0.5) * 2, dy: (r() - 0.5) * 1.2, r: 0.5 + r() * 0.5 })) };
    },
    draw(R, t, s, m) {
      const { w, h } = R, c = this.c;
      R.vgrad(0, h, c.sky);
      R.ground(x => h * 0.5 + Math.abs(Math.sin((x - m.x) * 0.025)) * -h * 0.1 + Math.sin(x * 0.07) * h * 0.02, c.mtn, c.mtnRim);
      const hill = x => h * 0.72 - Math.max(0, h * 0.12 - Math.abs(x - w * 0.35) * 0.25);
      R.ground(hill, c.hill, c.hillRim, 1);
      const tx = w * 0.35 + m.x, ty = hill(w * 0.35), cr = h * 0.17;
      R.rect(tx - 2, ty - h * 0.24, 4, h * 0.24, c.trunk); R.rect(tx + 1, ty - h * 0.24, 1, h * 0.24, c.trunkD);
      R.rect(tx - 6, ty - h * 0.24 - 1, 4, 2, c.trunk); R.rect(tx + 2, ty - h * 0.28, 5, 2, c.trunk);
      const cy = ty - h * 0.33;
      for (const b of s.blobs) R.disc(tx + b.dx * cr * 1.3, cy + b.dy * cr + 1, cr * b.r, c.bloom[0]);
      for (const b of s.blobs) R.disc(tx + b.dx * cr * 1.3 - 1, cy + b.dy * cr - 1, cr * b.r * 0.75, c.bloom[1]);
      for (const b of s.blobs.slice(0, 4)) R.glow(tx + b.dx * cr * 1.3 - 2, cy + b.dy * cr - 2, 1, cr * 0.4, c.bloom[2], 0.6);
      const lx = w * 0.62, ly = hill(lx);
      R.rect(lx, ly - h * 0.16, 1, h * 0.16, c.post); R.glow(lx, ly - h * 0.17, 1.5, h * 0.06, c.lamp, 0.55 + Math.sin(t * 3) * 0.1); R.rect(lx - 1, ly - h * 0.18, 3, 2, c.lamp);
      for (const p of s.petals) {
        const y = wrap(p.y + t * p.v, h + 10) - 5, x = wrap(p.x + Math.sin(t + p.p) * 6 - t * 3, w);
        R.set(x, y, c.petal[p.c]);
      }
    }
  },

  starry: {
    title: 'Starry night', desc: 'Twinkling stars, a big moon and fireflies over sleepy hills.',
    c: P({ sky: ['#0b0f2e', '#1b2156', '#3a2f6b'], star: '#ffffff', dim: '#8a90c8', moon: '#fff3c4', crater: '#e6d9a6', moonGlow: '#3d3f7a', hill: '#1a2150', hillRim: '#262e66', near: '#0e1336', fly: '#fff27a', flyGlow: '#6b6a3a' }),
    init(w, h, r) {
      return { stars: Array.from({ length: Math.round(w * h * 0.004) + 10 }, () => ({ x: r() * w, y: r() * h * 0.6, p: r() * 6, s: 1 + r() * 2, big: r() < 0.12 })),
        flies: Array.from({ length: Math.max(5, Math.round(w * 0.04)) }, () => ({ x: r() * w, y: h * (0.62 + r() * 0.3), p: r() * 6, s: 0.5 + r() })) };
    },
    draw(R, t, s, m) {
      const { w, h } = R, c = this.c;
      R.vgrad(0, h, c.sky);
      for (const st of s.stars) {
        const on = Math.sin(t * st.s + st.p) > -0.2, col = on ? c.star : c.dim, x = st.x - m.x * 0.5;
        R.set(x, st.y, col);
        if (st.big && on) { R.set(x - 1, st.y, c.dim); R.set(x + 1, st.y, c.dim); R.set(x, st.y - 1, c.dim); R.set(x, st.y + 1, c.dim); }
      }
      const mx = w * 0.22 - m.x, my = h * 0.24, mr = h * 0.1;
      R.glow(mx, my, mr, mr * 2.2, c.moonGlow, 0.7); R.disc(mx, my, mr, c.moon);
      R.disc(mx - mr * 0.3, my - mr * 0.2, mr * 0.22, c.crater); R.disc(mx + mr * 0.35, my + mr * 0.3, mr * 0.15, c.crater);
      R.ground(x => h * 0.66 + Math.sin((x + m.x * 2) * 0.03 + 2) * h * 0.06, c.hill, c.hillRim);
      R.ground(x => h * 0.8 + Math.sin((x + m.x * 4) * 0.05) * h * 0.04, c.near);
      for (const f of s.flies) {
        const x = wrap(f.x + Math.sin(t * 0.4 * f.s + f.p) * 12, w), y = f.y + Math.sin(t * 0.7 + f.p * 2) * 4, on = Math.sin(t * 2.2 * f.s + f.p) > 0;
        if (on) { R.glow(x, y, 0.5, 2.5, c.flyGlow, 0.8); R.set(x, y, c.fly); }
      }
    }
  },

  sunset: {
    title: 'Sunset lake', desc: 'A big warm sun sinking into a still lake, a little boat drifting by.',
    c: P({ sky: ['#2d1b4e', '#7a3b7a', '#ff7a6b', '#ffb36b'], sun: '#ffe08a', sunD: '#ffc25a', hill: '#4a2a5e', hillRim: '#5e356f', water: ['#5a2f6a', '#3a2560', '#24183f'], glint: '#ffcf7a', glint2: '#ff9a6b', boat: '#1b1030', bird: '#2a1840' }),
    init(w, h, r) { return { bx: r() * w, birds: Array.from({ length: 3 }, () => ({ x: r() * w, y: h * (0.15 + r() * 0.2), p: r() * 6 })) }; },
    draw(R, t, s, m) {
      const { w, h } = R, c = this.c, hz = Math.round(h * 0.58);
      R.vgrad(0, hz, c.sky);
      const sx = w * 0.5 - m.x, sr = h * 0.17;
      for (let y = Math.floor(hz - sr); y < hz; y++) for (let x = Math.floor(sx - sr); x <= sx + sr; x++) {
        if ((x + 0.5 - sx) ** 2 + (y + 0.5 - hz) ** 2 > sr * sr) continue;
        R.set(x, y, (y - hz + sr) / sr > 0.55 && ((y & 1) || (y - hz + sr) / sr > 0.8) ? c.sunD : c.sun);
      }
      R.ground(x => hz - Math.max(0, Math.sin(x * 0.04 + 0.6) * h * 0.06) - (x > w * 0.7 ? (x - w * 0.7) * 0.25 : 0), c.hill, c.hillRim);
      R.vgrad(hz, h, c.water);
      for (let y = hz + 1; y < h; y += 2) {
        const k = (y - hz) / (h - hz), half = sr * (1 - k * 0.5), off = Math.sin(t * 2 + y * 0.7) * 2;
        for (let x = Math.floor(sx - half); x <= sx + half; x++) if (bayer(x, y) < 0.55 - k * 0.3) R.set(x + off, y, (x + y) & 2 ? c.glint : c.glint2);
      }
      const bx = drift(s.bx, 3, t, w), by = hz + (h - hz) * 0.35 + Math.sin(t * 1.5);
      R.rect(bx - 4, by, 9, 2, c.boat); R.rect(bx - 3, by + 2, 7, 1, c.boat); R.rect(bx, by - 5, 1, 5, c.boat); R.tri(bx + 2, by - 1, 2, 4, c.boat);
      for (const b of s.birds) { const x = drift(b.x, 5, t, w), y = b.y + Math.sin(t + b.p) * 2, f = Math.sin(t * 8 + b.p) > 0 ? 1 : 0; R.set(x - 1, y - f, c.bird); R.set(x, y, c.bird); R.set(x + 1, y - f, c.bird); }
    }
  },

  snowy: {
    title: 'Snowy village', desc: 'Little houses with warm windows, chimney smoke and soft snowfall at dusk.',
    c: P({ sky: ['#1e2a5a', '#3a4a8a', '#7a86c0'], pine: '#2a3566', snow: '#eef4ff', snowS: '#c9d6f2', wall: ['#c86b5a', '#7a8ac8', '#d9a35a'], roof: '#eef4ff', roofS: '#b8c6e6', win: '#ffd36e', winD: '#e0a53a', door: '#5a3a3a', smoke: '#9aa6cc', flake: '#ffffff' }),
    init(w, h, r) {
      return { flakes: Array.from({ length: Math.round(w * 0.25) }, () => ({ x: r() * w, y: r() * h, v: 5 + r() * 8, p: r() * 6 })),
        houses: [0.18, 0.46, 0.76].map((f, i) => ({ x: f * w, s: 0.9 + r() * 0.3, c: i, lit: r() * 6 })),
        pines: Array.from({ length: Math.round(w / 9) }, () => ({ x: r() * w, s: 0.7 + r() * 0.5 })) };
    },
    draw(R, t, s, m) {
      const { w, h } = R, c = this.c, gy = h * 0.74;
      R.vgrad(0, h, c.sky);
      for (const p of s.pines) R.tri(p.x - m.x, h * 0.66, 4 * p.s, 14 * p.s, c.pine);
      R.ground(x => gy + Math.sin(x * 0.05) * 1.5, c.snow, c.snow);
      for (const ho of s.houses) {
        const bw = Math.round(h * 0.2 * ho.s), bh = Math.round(h * 0.14 * ho.s), x = Math.round(ho.x - bw / 2 - m.x * 2), y = Math.round(gy - bh);
        R.rect(x + bw - 5, y - bh * 0.7, 3, bh * 0.5, c.wall[ho.c]);
        R.rect(x, y, bw, bh, c.wall[ho.c]);
        R.tri(x + bw / 2, y + 1, bw / 2 + 2, Math.round(bw * 0.45), c.roofS); R.tri(x + bw / 2, y, bw / 2 + 2, Math.round(bw * 0.45), c.roof);
        const flick = Math.sin(t * 3 + ho.lit) > -0.6;
        R.rect(x + 3, y + 3, 4, 4, flick ? c.win : c.winD); R.rect(x + bw - 7, y + 3, 4, 4, c.win);
        R.rect(x + bw / 2 - 2, y + bh - 6, 4, 6, c.door);
        for (let i = 0; i < 4; i++) { const k = wrap(t * 0.6 + i * 0.25 + ho.lit, 1); R.set(x + bw - 4 + Math.sin(k * 6 + i) * 2, y - bh * 0.7 - k * h * 0.2, c.smoke); }
      }
      R.ground(x => h * 0.9 + Math.sin(x * 0.08 + 1) * 1.5, c.snowS, c.snow);
      for (const f of s.flakes) R.set(wrap(f.x + Math.sin(t + f.p) * 4, w), wrap(f.y + t * f.v, h), c.flake);
    }
  },

  campfire: {
    title: 'Campfire', desc: 'A crackling fire in a pine forest at night, embers drifting up to the stars.',
    c: P({ sky: ['#0a0f24', '#151f3d', '#24305a'], star: '#c8d0ff', pineF: '#1f2e52', pine: '#15213f', ground: '#222c40', lit: '#4a3428', lit2: '#33282c', log: '#6b4226', logD: '#4a2c18', fire: ['#ff4a2a', '#ff8a2a', '#ffd23f', '#fff3b0'], ember: '#ffb04a', rock: '#3a3f52' }),
    init(w, h, r) {
      return { stars: Array.from({ length: Math.round(w * 0.3) }, () => ({ x: r() * w, y: r() * h * 0.45, p: r() * 6 })),
        embers: Array.from({ length: 14 }, () => ({ p: r(), x: (r() - 0.5) * 8, s: 0.6 + r() * 0.6 })),
        pines: Array.from({ length: Math.round(w / 7) }, () => ({ x: r() * w, s: 0.8 + r() * 0.7, front: r() < 0.4 })) };
    },
    draw(R, t, s, m) {
      const { w, h } = R, c = this.c, gy = h * 0.74, fx = w * 0.5 - m.x * 2, fy = gy + h * 0.1;
      R.vgrad(0, h, c.sky);
      for (const st of s.stars) if (Math.sin(t * 1.5 + st.p) > -0.4) R.set(st.x, st.y, c.star);
      for (const p of s.pines) if (!p.front) R.tri(p.x - m.x * 0.5, gy + 2, 5 * p.s, 22 * p.s, c.pineF);
      for (const p of s.pines) if (p.front && Math.abs(p.x - w / 2) > w * 0.18) R.tri(p.x - m.x * 1.5, gy + 6, 6 * p.s, 28 * p.s, c.pine);
      R.rect(0, gy, w, h, c.ground);
      R.glow(fx, fy, h * 0.06, h * 0.3, c.lit2, 0.9); R.glow(fx, fy, h * 0.04, h * 0.18, c.lit, 0.9);
      for (const dx of [-7, 6, -2]) R.rect(fx + dx - 2, fy + 1, 4, 3, c.rock);
      R.rect(fx - 7, fy - 1, 14, 3, c.log); R.rect(fx - 6, fy, 12, 1, c.logD);
      for (let i = -5; i <= 5; i++) {
        const hgt = (h * 0.13) * (1 - Math.abs(i) / 6) * (0.65 + 0.35 * Math.sin(t * 9 + i * 1.7));
        for (let j = 0; j < hgt; j++) { const k = j / hgt, col = k < 0.3 ? c.fire[0] : k < 0.55 ? c.fire[1] : k < 0.8 ? c.fire[2] : c.fire[3]; R.set(fx + i, fy - 1 - j, Math.abs(i) > 3 && k > 0.5 ? c.fire[1] : col); }
      }
      for (const e of s.embers) { const k = wrap(t * 0.35 * e.s + e.p, 1); if (k > 0.15) R.set(fx + e.x + Math.sin(k * 10 + e.p * 6) * 4, fy - h * 0.12 - k * h * 0.45, c.ember); }
    }
  },

  rainy: {
    title: 'Rainy window', desc: 'Inside, warm and cosy: rain on the glass, city lights outside, a plant and a mug.',
    c: P({ wall: '#3a2a3a', wallL: '#5a3e4a', lamp: '#ffd9a0', out: ['#141c38', '#22305a', '#3a3a6a'], bokeh: ['#ffcf6b', '#ff8fab', '#7fd6ff', '#c9a4ff'], rain: '#8fa8e0', drop: '#c6d6ff', frame: '#8a5a3a', frameD: '#5e3a24', sill: '#a8704a', pot: '#d9734a', leaf: '#5fb653', leafD: '#3f8f3a', mug: '#f2f4fa', mugD: '#c4cad8', coffee: '#6b4226', steam: '#e6dce8' }),
    init(w, h, r) {
      return { lights: Array.from({ length: 16 }, () => ({ x: r(), y: 0.4 + r() * 0.55, c: (r() * 4) | 0, s: 1 + r() * 2.5, p: r() * 6 })),
        rain: Array.from({ length: Math.round(w * 0.35) }, () => ({ x: r(), y: r(), v: 0.6 + r() * 0.5 })),
        drops: Array.from({ length: 10 }, () => ({ x: r(), y: r(), v: 0.03 + r() * 0.08 })) };
    },
    draw(R, t, s, m) {
      const { w, h } = R, c = this.c;
      R.rect(0, 0, w, h, c.wall);
      R.glow(w * 0.08, h * 0.35, h * 0.05, h * 0.45, c.wallL, 0.8);
      const wx = Math.round(w * 0.24), wy = Math.round(h * 0.1), ww = Math.round(w * 0.52), wh = Math.round(h * 0.62);
      for (let y = wy; y < wy + wh; y++) { const k = (y - wy) / wh * 2, i = Math.min(1, Math.floor(k)); for (let x = wx; x < wx + ww; x++) R.set(x, y, k - i > bayer(x, y) ? c.out[i + 1] : c.out[i]); }
      for (const l of s.lights) {
        const x = wx + l.x * ww - m.x * 2, y = wy + l.y * wh, r = l.s + Math.sin(t + l.p) * 0.4;
        if (x > wx + r && x < wx + ww - r && y < wy + wh - r) R.glow(x, y, r * 0.4, r, c.bokeh[l.c], 0.55);
      }
      for (const d of s.rain) { const x = wx + d.x * ww, y = wy + wrap(d.y + t * d.v, 1) * wh; for (let j = 0; j < 3; j++) if (y + j < wy + wh) R.set(x - j * 0.3, y + j, c.rain); }
      for (const d of s.drops) { const x = wx + d.x * ww, y = wy + wrap(d.y + t * d.v, 1) * wh; R.set(x, y, c.drop); R.set(x, y - 1, c.drop); }
      R.rect(wx - 3, wy - 3, ww + 6, 3, c.frame); R.rect(wx - 3, wy + wh, ww + 6, 3, c.frameD);
      R.rect(wx - 3, wy, 3, wh, c.frame); R.rect(wx + ww, wy, 3, wh, c.frameD);
      R.rect(wx + ww / 2 - 1, wy, 2, wh, c.frame); R.rect(wx, wy + wh / 2 - 1, ww, 2, c.frame);
      R.rect(wx - 8, wy + wh + 3, ww + 16, 4, c.sill);
      const px0 = wx + 6, py0 = wy + wh + 3;
      R.rect(px0, py0 - 7, 8, 7, c.pot);
      for (const [dx, dy, col] of [[1, -12, c.leaf], [5, -14, c.leaf], [3, -10, c.leafD], [7, -11, c.leafD], [-1, -9, c.leaf]]) R.disc(px0 + dx + 1, py0 + dy + Math.sin(t + dx) * 0.4, 2.4, col);
      const mx = wx + ww - 16, my = py0;
      R.rect(mx, my - 7, 8, 7, c.mug); R.rect(mx + 7, my - 6, 2, 1, c.mugD); R.rect(mx + 8, my - 6, 1, 4, c.mugD); R.rect(mx + 7, my - 3, 2, 1, c.mugD); R.rect(mx + 1, my - 7, 6, 1, c.coffee);
      for (let i = 0; i < 6; i++) { const k = wrap(t * 0.5 + i / 6, 1); R.set(mx + 4 + Math.sin(k * 8 + i) * 1.5, my - 9 - k * 10, c.steam); }
    }
  },

  beach: {
    title: 'Beach day', desc: 'Bright sky, rolling waves, warm sand and a striped umbrella.',
    c: P({ sky: ['#5ab8ff', '#93d3ff', '#d6f2ff'], sun: '#fff6c2', halo: '#fff0a0', cloud: '#ffffff', cloudS: '#e0f0ff', sea: ['#2a86d0', '#3fa6e6', '#6ac6f0'], foam: '#ffffff', sand: '#f5dca0', sandS: '#e6c47e', wet: '#d9b97a', pole: '#8a5a3a', um: ['#ff5a6a', '#ffffff'], ball: ['#ff5a6a', '#ffd23f', '#4fb0ff'], gull: '#ffffff' }),
    init(w, h, r) { return { clouds: Array.from({ length: 3 }, () => ({ x: r() * w, y: h * (0.1 + r() * 0.2), s: 4 + r() * 4, v: 3 + r() * 2 })), gulls: Array.from({ length: 2 }, () => ({ x: r() * w, y: h * (0.2 + r() * 0.15), p: r() * 6 })) }; },
    draw(R, t, s, m) {
      const { w, h } = R, c = this.c, hz = Math.round(h * 0.5);
      R.vgrad(0, hz, c.sky);
      R.glow(w * 0.15 - m.x, h * 0.18, h * 0.06, h * 0.13, c.halo, 0.7); R.disc(w * 0.15 - m.x, h * 0.18, h * 0.06, c.sun);
      for (const k of s.clouds) R.cloud(drift(k.x, k.v, t, w) - m.x, k.y, k.s, c.cloud, c.cloudS);
      R.vgrad(hz, h * 0.78, c.sea);
      for (let y = hz + 2; y < h * 0.76; y += 3) { const k = (y - hz) / (h * 0.3); for (let x = 0; x < w; x++) if (Math.sin(x * (0.3 - k * 0.15) + t * (1 + k) + y) > 0.92 - k * 0.1) R.set(x, y, c.foam); }
      const shore = x => h * 0.76 + Math.sin(x * 0.06 + t * 0.8) * 1.5 + Math.sin(t * 0.8) * 1.2;
      R.ground(x => shore(x) - 1, c.foam);
      R.ground(shore, c.wet); R.ground(x => shore(x) + 3, c.sand, c.sand);
      const ux = w * 0.72 + m.x, uy = h * 0.95;
      R.rect(ux, uy - h * 0.3, 1, h * 0.3, c.pole);
      for (let j = 0; j < h * 0.1; j++) { const half = Math.sqrt(1 - ((h * 0.1 - j) / (h * 0.1)) ** 2) * h * 0.16; for (let x = Math.floor(ux - half); x <= ux + half; x++) R.set(x, uy - h * 0.3 + j - h * 0.1 + 2, c.um[Math.floor((x - ux + 40) / 4) % 2]); }
      const bx = w * 0.4, by = h * 0.9 - Math.abs(Math.sin(t * 2.5)) * 3;
      R.disc(bx, by, 3, c.ball[0]); R.rect(bx - 3, by - 1, 6, 1, c.ball[1]); R.rect(bx - 1, by - 3, 1, 6, c.ball[2]);
      for (const g of s.gulls) { const x = drift(g.x, 7, t, w), y = g.y + Math.sin(t + g.p) * 2, f = Math.sin(t * 6 + g.p) > 0 ? 1 : 0; R.set(x - 2, y - f, c.gull); R.set(x - 1, y, c.gull); R.set(x + 1, y, c.gull); R.set(x + 2, y - f, c.gull); }
    }
  },

  aurora: {
    title: 'Aurora peaks', desc: 'Northern lights rippling over snowy mountains, under a sky full of stars.',
    c: P({ sky: ['#05081a', '#0d1838', '#1a2a50'], star: '#dfe6ff', a1: '#5dff9a', a2: '#3fd6a8', a3: '#a07aff', mtn: '#34406e', mtnRim: '#eef4ff', mtnS: '#232c55', snow: '#eef4ff', lake: '#0d1838', lakeG: '#2f8f6a' }),
    init(w, h, r) { return { stars: Array.from({ length: Math.round(w * 0.35) }, () => ({ x: r() * w, y: r() * h * 0.7, p: r() * 6 })) }; },
    draw(R, t, s, m) {
      const { w, h } = R, c = this.c;
      R.vgrad(0, h, c.sky);
      for (const st of s.stars) if (Math.sin(t * 1.3 + st.p) > -0.3) R.set(st.x - m.x * 0.5, st.y, c.star);
      for (const band of [0, 1]) for (let x = 0; x < w; x++) {
        const cy = h * (0.26 + band * 0.1) + Math.sin(x * 0.03 + t * 0.6 + band * 2) * h * 0.08 + Math.sin(x * 0.011 - t * 0.3) * h * 0.05, th = h * (0.16 - band * 0.05) * (0.7 + 0.3 * Math.sin(x * 0.05 + t));
        for (let j = 0; j < th; j++) { const f = 1 - j / th; if (f * (band ? 0.55 : 0.85) > bayer(x, Math.round(cy - j))) R.set(x, cy - j, j < th * 0.25 ? c.a1 : j < th * 0.6 ? c.a2 : c.a3); }
      }
      /* a range of peaks; snow only near the tops */
      const tri = (x, p) => 1 - Math.abs((((x / p) % 2) + 2) % 2 - 1);
      const peaks = x => { const X = x + m.x * 2; return h * 0.8 - Math.max(tri(X + 14, 34) * h * 0.3, tri(X + 47, 23) * h * 0.2, tri(X + 3, 51) * h * 0.36); };
      for (let x = 0; x < w; x++) {
        const top = Math.round(peaks(x)), cap = top < h * 0.58 ? 2 + Math.round((h * 0.58 - top) * 0.25) : 0, lit = peaks(x - 1) > peaks(x);
        for (let y = top; y < h * 0.8; y++) R.set(x, y, y < top + cap && (y < top + cap - 1 || (x & 1)) ? c.snow : lit ? c.mtn : c.mtnS);
      }
      R.rect(0, h * 0.8, w, h, c.lake);
      for (let y = Math.round(h * 0.82); y < h; y += 2) for (let x = 0; x < w; x++) if (Math.sin(x * 0.23 + t * 1.2 + y * 1.7) * Math.sin(x * 0.05 - t * 0.4) > 0.8) R.set(x, y, (x + y) % 3 ? c.lakeG : c.a3);
    }
  },

  clouds: {
    title: 'Cloud kingdom', desc: 'Pastel skies, a soft rainbow and a hot-air balloon bobbing between the clouds.',
    c: P({ sky: ['#ffd1e8', '#e6d9ff', '#cfe9ff'], rb: ['#ff9aa8', '#ffc38a', '#fff09a', '#a8e6a3', '#9fd0ff', '#c9a4ff'], cloud: '#ffffff', cloudS: '#f0e6ff', cloudP: '#ffe6f0', bal: ['#ff8fb3', '#ffd23f'], basket: '#a8704a', rope: '#7a5a5a' }),
    init(w, h, r) { return { layers: [0, 1, 2].map(l => Array.from({ length: 5 }, () => ({ x: r() * w, y: h * (0.45 + l * 0.18 + r() * 0.08), s: 6 + l * 3 + r() * 4 }))) }; },
    draw(R, t, s, m) {
      const { w, h } = R, c = this.c;
      R.vgrad(0, h, c.sky);
      const rx = w * 0.3 - m.x, ry = h * 0.85, rr = h * 0.62;
      c.rb.forEach((col, i) => { const r0 = rr - i * 2.2, r1 = r0 - 2.2; for (let y = Math.floor(ry - r0); y < ry; y++) for (let x = Math.floor(rx - r0); x <= rx + r0; x++) { const d = Math.hypot(x - rx, y - ry); if (d <= r0 && d > r1 && 0.55 > bayer(x, y)) R.set(x, y, col); } });
      s.layers.forEach((L, li) => { for (const k of L) R.cloud(drift(k.x, 2 + li * 2, t, w, 40) - m.x * (li + 1), k.y, k.s, li === 2 ? c.cloud : li ? c.cloudP : c.cloudS, li === 2 ? c.cloudS : null); if (li === 0) {
        const bx = w * 0.68 + Math.sin(t * 0.4) * 6 - m.x * 1.5, by = h * 0.3 + Math.sin(t * 0.9) * 3, br = h * 0.1;
        for (let y = Math.floor(by - br); y <= by + br; y++) for (let x = Math.floor(bx - br); x <= bx + br; x++) if ((x + 0.5 - bx) ** 2 + (y + 0.5 - by) ** 2 * 0.8 <= br * br) R.set(x, y, c.bal[Math.floor((x - bx + br * 2) / (br * 0.5)) % 2]);
        R.set(bx - br * 0.5, by + br + 1, c.rope); R.set(bx + br * 0.5, by + br + 1, c.rope); R.rect(bx - 2, by + br + 2, 5, 3, c.basket);
      } });
    }
  },

  city: {
    title: 'Neon city', desc: 'A city at dusk: lit windows, neon signs, a wet street and a little train rattling past.',
    c: P({ sky: ['#16103a', '#4a2a78', '#9a4a8a', '#ec7890'], moon: '#ffeece', far: '#5c3a80', mid: '#34225a', near: '#181030', win: ['#ffd478', '#96ecff'], neon: ['#ff60b2', '#5af0ff'], street: '#1e1438', train: '#d6dcf0', rail: '#281a40' }),
    init(w, h, r) { return { b: [0, 1, 2].map(L => Array.from({ length: Math.ceil(w / (7 + L * 4)) + 4 }, () => ({ h: r(), lit: Array.from({ length: 40 }, () => r()) }))) }; },
    draw(R, t, s, m) {
      const { w, h } = R, c = this.c, base = Math.round(h * 0.8);
      R.vgrad(0, base, c.sky);
      R.disc(w * 0.8 - m.x, h * 0.2, h * 0.07, c.moon); R.disc(w * 0.8 - m.x + 2, h * 0.2 - 1, h * 0.065, c.sky[0]);
      s.b.forEach((row, L) => {
        const cw = 7 + L * 4, col = [c.far, c.mid, c.near][L];
        row.forEach((b, i) => {
          const x0 = i * cw - ((m.x * (L + 1) * 2) | 0) - cw, top = Math.round(base - h * (0.16 + 0.26 * b.h) + L * h * 0.07);
          R.rect(x0, top, cw - 1, base - top, col);
          for (let y = top + 2, k = 0; y < base - 2; y += 3) for (let x = x0 + 1; x < x0 + cw - 2; x += 2, k++) if (b.lit[k % 40] > 0.5 + L * 0.1) R.set(x, y, c.win[b.lit[(k + 7) % 40] > 0.85 ? 1 : 0]);
          if (L && b.h < 0.2) R.rect(x0 + cw - 3, top + 3, 2, 8, c.neon[b.h < 0.1 ? 0 : 1]);
        });
      });
      R.rect(0, base, w, h - base, c.street); R.rect(0, base, w, 1, c.rail);
      const tx = ((t * 28) % (w + 260)) - 130 - m.x * 6;
      for (let k = 0; k < 4; k++) R.rect(tx + k * 24, base - 5, 23, 5, c.train);
      for (let x = 0; x < w; x += 7) if (Math.sin(x * 0.7 + t) > 0.6) R.rect(x, base + 2 + ((x * 3) % Math.max(1, h - base - 3)), 3, 1, c.neon[(x >> 3) & 1]);
    }
  },

  autumn: {
    title: 'Autumn woods', desc: 'Round trees in orange, red and gold under a low sun, leaves twirling down on the breeze.',
    c: P({ sky: ['#96b8ec', '#d8c4c8', '#ffce96'], sun: '#fff0c4', halo: '#ffbe78', hill: '#de968c', leaf: ['#e8703a', '#f4a83a', '#c8403a', '#f0ce58'], dark: '#8a3a34', trunk: '#4a2c28', grass: '#b0964a', grassD: '#806834', grassL: '#ceb860' }),
    init(w, h, r) { return { trees: [0, 1].map(L => Array.from({ length: 12 }, () => ({ x: r() * w, s: r(), c: (r() * 4) | 0 }))), leaves: Array.from({ length: 16 }, () => ({ x: r() * w, p: r(), v: 4 + r() * 4, c: (r() * 2) | 0 })) }; },
    draw(R, t, s, m) {
      const { w, h } = R, c = this.c;
      R.vgrad(0, h, c.sky);
      R.glow(w * 0.72 - m.x, h * 0.48, h * 0.07, h * 0.18, c.halo, 0.7); R.disc(w * 0.72 - m.x, h * 0.48, h * 0.07, c.sun);
      R.ground(x => h * 0.58 - Math.sin((x + m.x) * 0.04) * h * 0.04, c.hill);
      s.trees.forEach((row, L) => {
        const base = h * (L ? 0.83 : 0.7), rr = h * (L ? 0.1 : 0.06);
        if (L) R.ground(x => h * 0.83 + Math.sin(x * 0.05) * h * 0.02, c.grass, c.grassL);
        for (const tr of row) {
          const x = tr.x - m.x * (L + 1) * 2, r0 = rr * (0.7 + 0.5 * tr.s), cy = base - r0 * 1.5;
          R.rect(x - 1, cy, 2, base - cy, c.trunk);
          R.disc(x + 1, cy + 1, r0, c.dark); R.disc(x, cy, r0, c.leaf[tr.c]);
        }
      });
      for (let y = Math.round(h * 0.86); y < h; y++) for (let x = 0; x < w; x++) if (((x * 7 + y * 13) % 29) === 0) R.set(x, y, c.leaf[(x + y) & 1]);
      for (const l of s.leaves) { const y = ((t * l.v + l.p * h) % (h + 10)) - 5, x = l.x + Math.sin(t + l.p * 9) * 4 + (m.x + 1) * y * 0.1; R.set(x, y, c.leaf[l.c]); R.set(x + (Math.sin(t * 5 + l.p) > 0 ? 1 : -1), y, c.leaf[l.c]); }
    }
  },

  whale: {
    title: 'Sky whale', desc: 'A gentle whale and its calf swimming through a sunset sky, over a sea of pink cloud.',
    c: P({ sky: ['#46489e', '#c4a4e8', '#ffc8aa'], star: '#fff6e0', back: '#606ec4', belly: '#dee2fc', fin: '#4e58ac', eye: '#1e1c40', cloud: '#fff4f6', cloudS: '#f0c8dc' }),
    init(w, h, r) { return { puffs: Array.from({ length: 9 }, () => ({ x: r() * w, s: 5 + r() * 6 })), stars: Array.from({ length: Math.round(w * 0.2) }, () => ({ x: r() * w, y: r() * h * 0.35 })) }; },
    draw(R, t, s, m) {
      const { w, h } = R, c = this.c;
      R.vgrad(0, h, c.sky);
      for (const st of s.stars) R.set(st.x, st.y, c.star);
      [[1, 0.42, 0.17], [0.45, 0.3, 0.075]].forEach(([k, dy, sz], i) => {
        const S = h * sz, wx = ((t * 0.008 + 0.35) % 1) * (w + 3.6 * h * 0.17) - 1.8 * h * 0.17 - (i ? h * 0.33 : 0) - m.x, wy = h * (dy + 0.04 * Math.sin(t * 0.5 + i));
        for (let y = -S * 0.5; y <= S * 0.5; y++) for (let x = -S * 1.2; x <= S; x++) {
          const px = x / S, py = y / S, taper = px < -0.6 ? 0.3 * (1 + (px + 0.6) / 0.6) : 0;
          if (px * px + (py * py) / 0.18 < 1 || (px < -0.6 && Math.abs(py) < Math.max(0.06, taper))) R.set(wx + x, wy + y, py > 0.12 ? c.belly : c.back);
        }
        R.set(wx + S * 0.62, wy - S * 0.04, c.eye);
      });
      for (const p of s.puffs) R.cloud(((p.x + t * 3) % (w + 30)) - 15 - m.x * 2, h * 0.86, p.s, c.cloud, c.cloudS);
    }
  },

  lanterns: {
    title: 'Lantern lake', desc: 'Paper lanterns drifting up into a night sky, glowing twice over in the still lake below.',
    c: P({ sky: ['#0a0c26', '#242056', '#623460'], star: '#fff0dc', hill: '#1a1434', lake: ['#462a56', '#0e0e2c'], lan: '#ff9a5c', top: '#c4463c', glow: '#ffc06e' }),
    init(w, h, r) { return { l: Array.from({ length: 24 }, () => ({ x: r() * w, p: r(), v: 0.008 + r() * 0.012, s: r() })), stars: Array.from({ length: Math.round(w * 0.3) }, () => ({ x: r() * w, y: r() * h * 0.5 })) }; },
    draw(R, t, s, m) {
      const { w, h } = R, c = this.c, hz = Math.round(h * 0.68);
      R.vgrad(0, hz, c.sky);
      for (const st of s.stars) R.set(st.x, st.y, c.star);
      R.ground(x => hz - 3 - Math.sin((x + m.x) * 0.06) * 3, c.hill);
      R.vgrad(hz, h, c.lake);
      for (const l of s.l) {
        const y = hz - ((t * l.v + l.p) % 1) * hz * 1.1, x = l.x - m.x * 2, big = 1 + Math.round(l.s * 1.5);
        R.glow(x, y, big, big * 3, c.glow, 0.45); R.rect(x - big / 2, y - big, big + 1, big * 2, c.lan); R.rect(x - big / 2, y - big, big + 1, 1, c.top);
        const ry = 2 * hz - y; if (ry < h && Math.round(ry) % 2) R.rect(x - big / 2, ry - big, big + 1, big * 2, c.lan);
      }
    }
  },

  mushrooms: {
    title: 'Glow forest', desc: 'Giant mushrooms glowing in a misty night forest, spores drifting up like tiny stars.',
    c: P({ sky: ['#0a0c20', '#182e46'], trunk: '#22344a', trunkD: '#101628', ground: '#162e32', rim: '#38706a', caps: ['#5aece6', '#ff78ce', '#be8cff'], stem: '#d2e2ec', spot: '#fffff0', spore: '#c8fff0' }),
    init(w, h, r) { return { m: Array.from({ length: 8 }, (_, i) => ({ x: (i + 0.5) / 8 * w + (r() - 0.5) * 8, s: r(), c: (r() * 3) | 0 })), sp: Array.from({ length: 20 }, () => ({ x: r() * w, p: r() })) }; },
    draw(R, t, s, m) {
      const { w, h } = R, c = this.c, g = Math.round(h * 0.84);
      R.vgrad(0, h, c.sky);
      for (let x = 0; x < w; x += 9) R.rect(x - m.x + (x % 4), 0, 2 + (x % 3), g, x % 18 ? c.trunk : c.trunkD);
      R.ground(x => g + Math.sin(x * 0.08) * 2, c.ground, c.rim);
      for (const k of s.m) {
        const r0 = 3 + k.s * 7, x = k.x - m.x * (1 + k.s), top = g - r0 * 1.4, col = c.caps[k.c];
        R.glow(x, top, r0, r0 * 2.4, col, 0.3); R.rect(x - r0 * 0.2, top, r0 * 0.4 + 1, g - top, c.stem);
        for (let y = -r0 * 0.6; y <= 0; y++) for (let xx = -r0; xx <= r0; xx++) if (xx * xx / (r0 * r0) + y * y / (r0 * r0 * 0.36) <= 1) R.set(x + xx, top + y, (xx * 3 + y * 5) % 7 === 0 ? c.spot : col);
      }
      for (const p of s.sp) R.set(p.x + Math.sin(t + p.p * 9) * 2, g - ((t * 6 + p.p * h) % h), c.spore);
    }
  },

  space: {
    title: 'Little cosmos', desc: 'A ringed planet and its moon, a tiny rocket puttering by, nebulae and shooting stars.',
    c: P({ sky: ['#06061a', '#16103a', '#2a1650'], star: '#ffffff', neb: '#5a2a78', p: ['#ffba96', '#f08ca0', '#ffdcb0'], dark: '#5a2e6e', ring: '#ffd6aa', moon: '#e6e2f0', rocket: '#f0f0fa', nose: '#ff5a6e', flame: '#ffec78' }),
    init(w, h, r) { return { stars: Array.from({ length: Math.round(w * 0.4) }, () => ({ x: r() * w, y: r() * h, p: r() * 6 })) }; },
    draw(R, t, s, m) {
      const { w, h } = R, c = this.c;
      R.vgrad(0, h, c.sky);
      R.glow(w * 0.3, h * 0.4, h * 0.05, h * 0.3, c.neb, 0.5);
      for (const st of s.stars) if (Math.sin(t * 1.5 + st.p) > -0.4) R.set(st.x, st.y, c.star);
      const px = w * 0.66 - m.x, py = h * 0.5, pr = h * 0.19;
      for (let y = -pr; y <= pr; y++) for (let x = -pr; x <= pr; x++) if (x * x + y * y <= pr * pr) R.set(px + x, py + y, x + y > pr * 0.6 ? c.dark : c.p[Math.floor((y / pr + 1) * 4) % 3]);
      for (let a = 0; a < 6.283; a += 0.01) { const rx = Math.cos(a) * pr * 1.7, ry = Math.sin(a) * pr * 0.45; if (Math.sin(a) > 0 || rx * rx + ry * ry > pr * pr) R.set(px + rx, py + ry + rx * 0.3, c.ring); }
      R.disc(px + Math.cos(t * 0.14) * pr * 2.5, py + Math.sin(t * 0.14) * pr * 0.8, h * 0.03, c.moon);
      const rx = ((t * 0.018 + 0.1) % 1) * (w + 40) - 20, ry = h * 0.78 + Math.sin(t * 0.5) * 3;
      R.rect(rx - 4, ry - 1, 7, 3, c.rocket); R.rect(rx + 3, ry, 2, 1, c.nose); R.rect(rx - 6 - ((t * 20) & 1), ry, 2, 1, c.flame);
    }
  },

  reef: {
    title: 'Coral reef', desc: 'Sunbeams through blue water, swaying seaweed, coral, little fish and bubbles going up.',
    c: P({ sea: ['#46c4d6', '#2884b4', '#103874'], ray: '#aaf6f0', sand: '#ecd6a0', sandD: '#c8aa78', coral: ['#ff708c', '#ffa850', '#b078e6'], weed: '#46a05a', fish: ['#ffd646', '#ff8246', '#6ec8ff'], bubble: '#dcffff' }),
    init(w, h, r) { return { fish: Array.from({ length: 8 }, () => ({ y: h * (0.2 + r() * 0.5), p: r(), v: 4 + r() * 6, d: r() < 0.5 ? 1 : -1, c: (r() * 3) | 0 })), b: Array.from({ length: 10 }, () => ({ x: r() * w, p: r() })) }; },
    draw(R, t, s, m) {
      const { w, h } = R, c = this.c, g = Math.round(h * 0.85);
      R.vgrad(0, h, c.sea);
      for (let x = 0; x < w; x += 13) for (let y = 0; y < g; y += 2) if (((x + y * 0.5 + t * 3) | 0) % 26 < 3) R.set(x + y * 0.4 - m.x, y, c.ray);
      R.ground(x => g + Math.sin(x * 0.07) * 2, c.sand, c.sandD);
      for (let i = 0; i < 7; i++) { const x = (i + 0.5) / 7 * w - m.x * 2; for (let k = 0; k < 8; k++) R.rect(x + Math.sin(k * 1.7 + i) * 3, g - k * 2, 2, 2, c.coral[i % 3]); }
      for (let i = 0; i < 6; i++) { const x = (i + 0.8) / 6 * w - m.x * 3; for (let y = 0; y < h * 0.25; y++) R.set(x + Math.sin(t * 1.4 + i + y * 0.2) * y * 0.08, g - y, c.weed); }
      for (const f of s.fish) { const x = (((f.p * w + t * f.v * f.d) % (w + 20)) + w + 20) % (w + 20) - 10; R.rect(x - 2, f.y - 1, 4, 3, c.fish[f.c]); R.set(x - 3 * f.d, f.y, c.fish[f.c]); }
      for (const b of s.b) R.set(b.x, g - ((t * 8 + b.p * g) % g), c.bubble);
    }
  },

  ducks: {
    title: 'Duck bath', desc: 'Bath time: giant rubber ducks bobbing in the foam, soap bubbles floating up the tiled wall.',
    c: P({ tile: '#b0dcf4', tile2: '#ccEAfa', grout: '#ecf6fc', rim: '#ffffff', rimS: '#e2e8f6', water: ['#8cceF4', '#5496dc'], foam: '#ffffff', foamS: '#c4dcf6', duck: '#ffd638', duckL: '#fff08c', beak: '#ff8c32', eye: '#28203a', bubble: '#ffbee6' }),
    init(w, h, r) { return { d: Array.from({ length: 4 }, () => ({ x: r() * w, s: r(), p: r() * 6 })), b: Array.from({ length: 8 }, () => ({ x: r() * w, p: r() })) }; },
    draw(R, t, s, m) {
      const { w, h } = R, c = this.c, rim = Math.round(h * 0.44);
      for (let y = 0; y < rim; y++) for (let x = 0; x < w; x++) R.set(x, y, x % 7 === 0 || y % 7 === 0 ? c.grout : ((x / 7 | 0) + (y / 7 | 0)) % 2 ? c.tile2 : c.tile);
      R.rect(0, rim, w, 3, c.rim); R.rect(0, rim + 3, w, 1, c.rimS); R.vgrad(rim + 4, h, c.water);
      for (let x = 0; x < w; x += 6) R.cloud(x - m.x, rim + 6, 3, c.foam, c.foamS);
      for (const d of s.d) {
        const S = 4 + d.s * 6, x = ((d.x + t * 2) % (w + 30)) - 15 - m.x * 2, y = rim + 10 + d.s * (h - rim - 18) + Math.sin(t * 1.6 + d.p) * 1.5;
        R.disc(x, y, S, c.duck); R.disc(x + S * 0.6, y - S * 0.9, S * 0.55, c.duck); R.disc(x + S * 0.5, y - S * 1.1, S * 0.2, c.duckL);
        R.rect(x + S * 1.05, y - S * 0.85, S * 0.45 + 1, 2, c.beak); R.set(x + S * 0.8, y - S * 1.05, c.eye);
      }
      for (const b of s.b) { const y = rim - ((t * 5 + b.p * rim) % rim); R.set(b.x - 1, y, c.bubble); R.set(b.x + 1, y, c.bubble); R.set(b.x, y - 1, c.bubble); R.set(b.x, y + 1, c.bubble); }
    }
  },

  breakfast: {
    title: 'Breakfast hills', desc: 'Pancake mountains dripping with syrup, a sunny-side-up sun, whipped-cream clouds and toast for ground.',
    c: P({ sky: ['#96d2ff', '#cde9ff', '#ffecc8'], white: '#fffcf4', yolk: '#ffba28', cake: '#e8a050', cakeL: '#fad696', syrup: '#b05624', butter: '#ffe66e', cream: '#fffffa', creamS: '#f0dcc4', toast: '#f4cc84', crust: '#aa602c', berry: ['#4650aa', '#e63246'] }),
    init(w, h, r) { return { cl: Array.from({ length: 4 }, () => ({ x: r() * w, y: h * (0.15 + r() * 0.2), s: 5 + r() * 4 })), b: Array.from({ length: Math.round(w / 10) }, () => ({ x: r() * w, y: r(), c: (r() * 2) | 0 })) }; },
    draw(R, t, s, m) {
      const { w, h } = R, c = this.c, g = Math.round(h * 0.8);
      R.vgrad(0, h, c.sky);
      const ex = w * 0.78 - m.x, ey = h * 0.22; R.disc(ex, ey, h * 0.1, c.white); R.disc(ex + 1, ey, h * 0.045, c.yolk);
      for (const k of s.cl) R.cloud(((k.x + t * 2) % (w + 30)) - 15 - m.x, k.y, k.s, c.cream, c.creamS);
      for (let j = 0; j < 3; j++) {
        const cx = w * (0.18 + j * 0.3) - m.x, cw = h * (0.13 + j * 0.03), n = 4 + j, lh = Math.max(2, Math.round(h * 0.032));
        for (let k = 0; k < n; k++) { const y = g - (k + 1) * lh; R.rect(cx - cw, y, cw * 2, lh, c.cake); R.rect(cx - cw, y, cw * 2, 1, c.cakeL); }
        const top = g - n * lh; R.rect(cx - cw, top - 2, cw * 2, 2, c.syrup);
        for (let x = -cw; x < cw; x += 5) R.rect(cx + x, top, 1, 2 + ((x * 7) & 3), c.syrup);
        R.rect(cx - 3, top - 5, 6, 3, c.butter);
      }
      R.rect(0, g, w, h - g, c.toast); R.rect(0, g, w, 2, c.crust);
      for (let x = 0; x < w; x += Math.round(h * 0.33)) R.rect(x, g, 1, h - g, c.crust);
      for (const b of s.b) R.disc(b.x, g + 4 + b.y * (h - g - 6), 1, c.berry[b.c]);
    }
  },

  catnap: {
    title: 'Sleepy giant', desc: 'A huge tabby curled up asleep at dusk, a little village on its back, Zs floating up.',
    c: P({ sky: ['#46428c', '#b096dc', '#ffc4a0'], moon: '#fff0c8', hill: '#a68cc4', fur: '#f49c54', furL: '#ffc47e', furD: '#ce7442', pink: '#ffaaaa', ink: '#46283a', house: '#fff8ec', roof: '#e24c50', tree: '#68aa60', z: '#ffffff' }),
    init() { return {}; },
    draw(R, t, s, m) {
      const { w, h } = R, c = this.c, g = h * 0.94, cx = w * 0.44 - m.x, rx = w * 0.34, ry = h * 0.44 * (1 + 0.02 * Math.sin(t * 0.7));
      R.vgrad(0, h, c.sky);
      R.disc(w * 0.12, h * 0.18, h * 0.05, c.moon); R.disc(w * 0.12 + 2, h * 0.17, h * 0.045, c.sky[0]);
      R.ground(x => h * 0.7 - Math.sin(x * 0.05) * h * 0.05, c.hill);
      for (let y = 0; y < ry; y++) { const half = rx * Math.sqrt(1 - (y / ry) ** 2); R.rect(cx - half, g - y, half * 2, 1, y > ry * 0.7 ? c.furL : c.fur); }
      for (let x = -rx; x < rx; x += 7) for (let y = ry * 0.4; y < ry * 0.9; y++) if (Math.abs(x) < rx * Math.sqrt(1 - (y / ry) ** 2) - 2) R.set(cx + x, g - y, c.furD);
      const hx = cx + rx * 0.86, hy = h * 0.78, hr = h * 0.15;
      R.disc(hx, hy, hr, c.fur); R.tri(hx - hr * 0.55, hy - hr * 0.6, hr * 0.3, hr * 0.6, c.fur); R.tri(hx + hr * 0.55, hy - hr * 0.6, hr * 0.3, hr * 0.6, c.fur);
      R.rect(hx - hr * 0.55, hy, hr * 0.3, 1, c.ink); R.rect(hx + hr * 0.25, hy, hr * 0.3, 1, c.ink); R.set(hx, hy + hr * 0.15, c.pink);
      for (let i = 0; i < 6; i++) { const bx = (i - 2.5) / 3.4 * 0.82, sy = g - ry * Math.sqrt(1 - bx * bx), x = cx + bx * rx; if (i % 2) R.disc(x, sy - 3, 2.5, c.tree); else { R.rect(x - 2, sy - 3, 5, 3, c.house); R.tri(x, sy - 3, 3, 3, c.roof); } }
      for (let i = 0; i < 3; i++) { const k = (t * 0.12 + i / 3) % 1, x = hx + h * (0.06 + k * 0.14), y = hy - hr - h * k * 0.3; R.rect(x, y, 3, 1, c.z); R.set(x + 1, y + 1, c.z); R.rect(x, y + 2, 3, 1, c.z); }
    }
  }
};

Object.assign(SCENES, NATURE, DREAMY, PLACES, OCEAN, COSMOS, COZY, SWEETS, ARTSY);
export const SCENE_NAMES = Object.keys(SCENES);
export const seedFor = (name, w, h) => seeded([...name].reduce((a, ch) => a * 31 + ch.charCodeAt(0), 7) + w * 13 + h);
