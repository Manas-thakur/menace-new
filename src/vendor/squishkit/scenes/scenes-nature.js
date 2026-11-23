/* CPU fallbacks and titles for the nature scenes (merged into SCENES in scenes.js). Painted on a Raster
 * when WebGL isn't there; same shape as the scenes in scenes.js: title, desc, c (palette), init, draw. */
import { px, pxs, bayer, seeded } from './raster.js';

const P = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, Array.isArray(v) ? pxs(v) : px(v)]));
const wrap = (v, n) => ((v % n) + n) % n;
const drift = (x0, speed, t, w, margin = 30) => wrap(x0 + speed * t, w + margin * 2) - margin;
const frac = v => v - Math.floor(v);
/* an axis-aligned filled ellipse */
const oval = (R, cx, cy, rx, ry, c) => {
  for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++)
    if (((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 <= 1) R.set(x, y, c);
};
/* a filled rectangle; skips ones wholly off the left edge (Raster.rect would wrap those round) */
const box = (R, x, y, w, h, c) => { if (x + w >= 1 && x < R.w) R.rect(x, y, w, h, c); };
const peak = (R, cx, base, half, height, c) => { if (cx >= 0 && cx < R.w) R.tri(cx, base, half, height, c); };
/* a one-pixel line */
const line = (R, x0, y0, x1, y1, c) => {
  const n = Math.max(1, Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))));
  for (let i = 0; i <= n; i++) R.set(x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n, c);
};
/* a dithered horizontal band of colour c, densest at y0 and gone by y1 */
const haze = (R, y0, y1, c, k = 1) => {
  for (let y = Math.max(0, Math.floor(Math.min(y0, y1))); y < Math.min(R.h, Math.max(y0, y1)); y++) {
    const f = 1 - (y - y0) / (y1 - y0);
    for (let x = 0; x < R.w; x++) if (f * k > bayer(x, y)) R.set(x, y, c);
  }
};
/* a heart, its point at (cx, cy + s) */
const heartAt = (R, cx, cy, s, c) => {
  for (let y = Math.floor(cy - s); y <= cy + s; y++) for (let x = Math.floor(cx - s * 1.1); x <= cx + s * 1.1; x++) {
    const u = Math.abs(x + 0.5 - cx) / s, v = (cy - (y + 0.5)) / s;
    if ((u - 0.5) ** 2 + (v - 0.35) ** 2 < 0.28 || (v < 0.4 && v > -1 && u < (v + 1) * 0.75)) R.set(x, y, c);
  }
};

export const SCENES = {
  bamboo: {
    title: 'Bamboo grove', desc: 'Misty bamboo in layers, sunbeams slanting through, and a panda asleep at the foot of a stalk.',
    c: P({ sky: ['#b0d8c4', '#d6ead8', '#f8f4dc'], beam: '#fffadc', far: '#cde2cc', mid: '#9cca94', midD: '#76aa74', near: '#6eac56', nearL: '#aed678', nearD: '#46824a', node: '#386840', leaf: '#5c9c4c', leafL: '#92cc66', mist: '#e8f0de', ground: '#76a65c', groundL: '#a0cc74', W: '#faf8f0', Wd: '#d2d6de', K: '#2c2a38', blush: '#ffb8c4', fall: ['#96cc60', '#ded66e'] }),
    init(w, h, r) {
      const row = gap => Array.from({ length: Math.ceil(w / gap) + 2 }, (_, i) => ({ x: (i - 1 + 0.2 + r() * 0.6) * gap, off: r() * 20, on: r() > 0.3 }));
      return { far: row(6), mid: row(12), near: row(Math.max(18, Math.round(h * 0.45))),
        leaves: Array.from({ length: Math.max(6, Math.round(w * 0.06)) }, () => ({ x: r() * w, p: r(), v: 3 + r() * 4, c: r() < 0.6 ? 0 : 1 })) };
    },
    draw(R, t, s, m) {
      const { w, h } = R, c = this.c;
      R.vgrad(0, h, c.sky);
      for (const b of s.far) if (b.on) box(R, b.x - m.x * 0.3, 0, 2, h * 0.75, c.far);
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (wrap(x + y * 0.7 - t * 0.6, 44) < 8 && bayer(x, y) < 0.4 * (1 - y / h)) R.set(x, y, c.beam);
      for (const b of s.mid) {
        if (!b.on) continue;
        const x = Math.round(b.x - m.x * 0.6);
        box(R, x, 0, 3, h * 0.86, c.mid); box(R, x + 2, 0, 1, h * 0.86, c.midD);
        for (let y = b.off % 10; y < h * 0.86; y += 10) box(R, x, y, 3, 1, c.midD);
      }
      haze(R, h, h * 0.55, c.mist, 0.8);
      const sw = Math.max(3, Math.round(h * 0.07)), nh = Math.round(sw * 3.6);
      for (const b of s.near) {
        if (!b.on) continue;
        const x = Math.round(b.x - m.x * 1.2);
        box(R, x, 0, sw, h, c.near); box(R, x, 0, 1, h, c.nearL); box(R, x + sw - 1, 0, 1, h, c.nearD);
        for (let y = Math.round(b.off % nh); y < h; y += nh) { box(R, x, y, sw, 1, c.node); box(R, x, y - 1, sw, 1, c.nearL); }
        for (let k = 1; k < 3; k++) {
          const ly = Math.round(b.off % nh) + nh * k, dir = k % 2 ? 1 : -1, sway = Math.round(Math.sin(t * 0.9 + b.off + k));
          for (let i = 0; i < sw * 2.5; i++) {
            const xx = dir > 0 ? x + sw + i : x - 1 - i;
            R.set(xx, ly + i * 0.5 + sway * (i > sw ? 1 : 0), c.leaf); R.set(xx, ly + i * 0.9 + 1, c.leafL);
          }
        }
      }
      const gy = x => h * 0.93 + Math.sin(x * 0.08);
      R.ground(gy, c.ground, c.groundL);
      /* the panda */
      const px0 = w * 0.6 + m.x, r0 = h * 0.1, g = gy(px0) + 1, br = 1 + 0.04 * Math.sin(t * 1.1);
      box(R, px0 - r0 * 3, 0, sw, g, c.near); box(R, px0 - r0 * 3, 0, 1, g, c.nearL);
      oval(R, px0, g - r0 * 0.8 * br, r0 * 1.5, r0 * 0.75 * br, c.W);
      oval(R, px0 - r0 * 0.5, g - r0 * 0.8, r0 * 0.3, r0 * 0.75, c.K);
      R.disc(px0 + r0 * 1.1, g - r0 * 0.4, r0 * 0.5, c.K);
      oval(R, px0 - r0 * 0.8, g - r0 * 0.2, r0 * 0.75, r0 * 0.3, c.K);
      const hx = px0 - r0 * 1.4, hy = g - r0 * 0.7;
      R.disc(hx - r0 * 0.42, hy - r0 * 0.5, r0 * 0.24, c.K); R.disc(hx + r0 * 0.4, hy - r0 * 0.5, r0 * 0.24, c.K);
      R.disc(hx, hy, r0 * 0.62, c.W);
      R.disc(hx - r0 * 0.24, hy, Math.max(1, r0 * 0.17), c.K); R.disc(hx + r0 * 0.22, hy, Math.max(1, r0 * 0.17), c.K);
      R.set(hx, hy + r0 * 0.25, c.K); R.set(hx - r0 * 0.45, hy + r0 * 0.25, c.blush); R.set(hx + r0 * 0.45, hy + r0 * 0.25, c.blush);
      for (const l of s.leaves) {
        const y = wrap(t * l.v + l.p * h, h + 10) - 5, x = wrap(l.x + Math.sin(t * 0.8 + l.p * 9) * 4 + t * 2, w);
        R.set(x, y, c.fall[l.c]); R.set(x + 1, y + (Math.sin(t * 2.5 + l.p * 20) > 0 ? 1 : -1), c.fall[l.c]);
      }
    }
  },

  lavender: {
    title: 'Lavender rows', desc: 'Rows of lavender running to the horizon at golden hour, a stone farmhouse, bees bobbing in a warm low sun.',
    c: P({ sky: ['#7478c4', '#b496d2', '#ffb496', '#ffe2a0'], sun: '#fffce2', halo: '#ffc482', hill: '#c496c4', house: '#ecc6a0', roof: '#d27454', win: '#ffd882', cyp: '#405c48', lav: ['#6850a4', '#9670d0', '#c498ea'], furrow: '#96804e', furrowL: '#dcb074', far: '#ba8cc4', bee: '#ffce3c', beeD: '#40282c', wing: '#ffffff' }),
    init(w, h, r) { return { bees: Array.from({ length: 5 }, () => ({ x: r() * w, y: h * (0.75 + r() * 0.2), p: r() * 6, v: (r() - 0.5) * 6 })) }; },
    draw(R, t, s, m) {
      const { w, h } = R, c = this.c, hz = Math.round(h * 0.56);
      R.vgrad(0, hz, c.sky);
      const sx = w * 0.76 - m.x, sy = hz - h * 0.1;
      R.glow(sx, sy, h * 0.07, h * 0.24, c.halo, 0.8); R.disc(sx, sy, h * 0.07, c.sun);
      R.ground(x => hz - h * 0.02 - Math.sin((x + m.x) * 0.06) * h * 0.025 - h * 0.02, c.hill);
      const fx = w * 0.26 - m.x, fy = hz;
      box(R, fx - h * 0.075, fy - h * 0.05, h * 0.15, h * 0.05, c.house); peak(R, fx, fy - h * 0.05, h * 0.085, h * 0.025, c.roof);
      R.set(fx - h * 0.04, fy - h * 0.025, c.win); R.set(fx + h * 0.02, fy - h * 0.025, c.win);
      for (const [dx, hh] of [[-0.12, 0.115], [-0.09, 0.085], [0.135, 0.11]]) peak(R, fx + dx * h, fy, h * 0.018, h * hh, c.cyp);
      for (let y = hz; y < h; y++) {
        const d = (y - hz + 0.5) / h;
        for (let x = 0; x < w; x++) {
          const rc = (x - w * 0.42 + m.x * d * 2) / h / d / 0.55 + 0.5 + 0.04 * Math.sin(t * 1.2 + 1 / d), f = frac(rc);
          let col;
          if (d < 0.05 || (1 / d + Math.abs(x - w * 0.42) / (h * d * d)) / (0.55 * h) > 0.7) col = c.far;
          else if (Math.abs(f - 0.5) < 0.34) col = f > 0.55 ? c.lav[2] : f < 0.3 ? c.lav[0] : c.lav[1];
          else col = f > 0.5 ? c.furrowL : c.furrow;
          R.set(x, y, col);
        }
      }
      for (const b of s.bees) {
        const x = wrap(b.x + t * b.v + Math.sin(t + b.p) * 4, w), y = b.y + Math.sin(t * 2.3 + b.p) * 2;
        R.set(x, y, c.beeD); R.set(x + 1, y, c.bee); R.set(x + (Math.sin(t * 20 + b.p) > 0 ? 0 : 1), y - 1, c.wing);
      }
    }
  },

  waterfall: {
    title: 'Jungle falls', desc: 'A waterfall pouring into a jungle pool, a rainbow in the spray, ferns and vines, a parrot or two.',
    c: P({ sky: ['#96d4dc', '#eef8e4'], canopy: '#88c494', rock: '#4e6e66', rockL: '#6e8a76', moss: '#62a05e', water: ['#7ac2de', '#d6f4fa', '#ffffff'], pool: ['#5ccac4', '#1c6e86'], foam: '#ffffff', mist: '#f2fafa', vine: '#3a6a3c', leaf: '#4a9a54', leafD: '#286e42', red: '#e83a42', blue: '#4078e0', yellow: '#ffce40', rb: ['#ff7a7a', '#ffcc66', '#9ae07a', '#7ab4ff', '#b48aff'] }),
    init(w, h, r) { return { vines: Array.from({ length: 5 }, (_, i) => ({ x: i < 2.5 ? w * (0.04 + i * 0.1) : w * (0.96 - (i - 3) * 0.1), l: h * (0.28 + r() * 0.25), p: r() * 6 })) }; },
    draw(R, t, s, m) {
      const { w, h } = R, c = this.c, fx = w * 0.5 + m.x, pool = Math.round(h * 0.73), lip = Math.round(h * 0.24);
      R.vgrad(0, h * 0.2, c.sky);
      R.ground(x => h * 0.12 + Math.sin(x * 0.5) * 1.5 + Math.sin(x * 0.13) * 2, c.canopy);
      R.ground(x => h * 0.2 + Math.sin(x * 0.3) * 1.5, c.rock, c.moss, 2);
      for (let y = Math.round(h * 0.22); y < pool; y++) for (let x = 0; x < w; x++) if (((x * 5 + y * 3) % 11) === 0) R.set(x, y, c.rockL);
      for (let y = lip; y < pool; y++) {
        const hw = h * (0.09 + (y - lip) / h * 0.07);
        for (let x = Math.floor(fx - hw); x <= fx + hw; x++) R.set(x, y, c.water[(Math.sin(x * 1.7) + Math.sin(y * 0.4 - t * 9 + x)) > 1.2 ? 2 : (x + y) & 1 ? 0 : 1]);
      }
      R.vgrad(pool, h, c.pool);
      for (let i = 0; i < 6; i++) R.disc(fx + (i - 2.5) * h * 0.05, pool + Math.sin(t * 3 + i) * 0.8, h * 0.035, c.foam);
      R.glow(fx, pool - h * 0.06, h * 0.05, h * 0.2, c.mist, 0.6);
      c.rb.forEach((col, i) => { const rr = h * 0.42 - i * 2; for (let a = 0; a < Math.PI; a += 0.6 / rr) { const x = fx + h * 0.1 + Math.cos(a) * rr, y = pool + h * 0.14 - Math.sin(a) * rr; if (y < pool && bayer(x | 0, y | 0) < 0.5) R.set(x, y, col); } });
      for (const v of s.vines) {
        const x0 = v.x + m.x * 2;
        for (let y = 0; y < v.l; y++) { const x = x0 + Math.sin(t * 0.6 + v.p) * (y / v.l) ** 2 * 3; R.set(x, y, c.vine); if (y % 4 === 2) R.set(x + ((y >> 2) & 1 ? 1 : -1), y, c.leaf); }
      }
      const bx = fx - h * 0.26, by = h * 0.48;
      box(R, bx - h * 0.16, by + h * 0.005, h * 0.2, 1, c.rock);
      box(R, bx - 1, by - h * 0.08, 3, h * 0.08, c.red); R.set(bx - 1, by - h * 0.05, c.yellow); R.set(bx - 1, by - h * 0.04, c.blue); box(R, bx - 2, by, 2, h * 0.05, c.blue); R.set(bx + 2, by - h * 0.07, c.yellow);
      const qx = drift(0, w * 0.025, t, w, 10), qy = h * 0.34 + Math.sin(t * 0.5) * 2, f = Math.sin(t * 9) > 0 ? -1 : 1;
      box(R, qx - 2, qy, 5, 1, c.blue); R.set(qx + 3, qy, c.yellow); R.set(qx, qy + f, c.blue); R.set(qx + 1, qy + f * 2, c.blue); R.set(qx - 3, qy, c.blue);
      for (let i = 0; i < 3; i++) for (const sd of [1, -1]) {
        const x0 = sd > 0 ? -2 : w + 1, a = 0.35 + i * 0.4, L = h * (0.3 - i * 0.05);
        for (let k = 0; k < L; k++) { const x = x0 + sd * Math.cos(a) * k, y = h + 2 - Math.sin(a) * k + (k / L) ** 2 * 3, wd = Math.sin(Math.PI * k / L) * h * 0.04; box(R, x - wd / 2, y - wd / 2, wd + 1, wd + 1, i % 2 ? c.leafD : c.leaf); }
      }
    }
  },

  dunes: {
    title: 'Moonlit dunes', desc: 'Desert dunes at dusk under a huge moon, sand lifting off the crests, a little caravan on the ridge.',
    c: P({ sky: ['#201c4c', '#52387c', '#c4709a', '#fab08e'], star: '#fff0e6', moon: '#fff2da', mare: '#f4dac4', halo: '#e8a2a8', far: '#e2928e', farS: '#a6668e', lit: '#f29e78', shade: '#96567c', near: '#fcb47c', nearS: '#a25c72', crest: '#ffdeaa', cara: '#3c2250', lamp: '#ffe696' }),
    init(w, h, r) { return { stars: Array.from({ length: Math.round(w * h * 0.004) + 6 }, () => ({ x: r() * w, y: r() * h * 0.4, p: r() * 6 })) }; },
    draw(R, t, s, m) {
      const { w, h } = R, c = this.c;
      R.vgrad(0, h, c.sky);
      for (const st of s.stars) if (Math.sin(t * 1.5 + st.p * 9) > -0.3) R.set(st.x, st.y, c.star);
      const mx = w * 0.6 - m.x, my = h * 0.48, mr = h * 0.2;
      R.glow(mx, my, mr, mr * 1.6, c.halo, 0.5); R.disc(mx, my, mr, c.moon); R.disc(mx - mr * 0.3, my - mr * 0.2, mr * 0.25, c.mare); R.disc(mx + mr * 0.35, my + mr * 0.25, mr * 0.18, c.mare);
      const dune = (x, k) => { const sx = x + 0.3 * Math.sin(x * 0.6 + k), tt = frac(sx), a = 0.55 + 0.45 * frac(Math.sin(Math.floor(sx) * 91.7 + k) * 437.5); return { tt, p: (tt < 0.72 ? Math.sin(tt / 0.72 * Math.PI / 2) : 1 - (tt - 0.72) / 0.28) * a }; };
      const layer = (base, amp, fr, k, par, lit, sh) => {
        for (let x = 0; x < w; x++) {
          const { tt, p } = dune((x + par) / h * fr, k), top = Math.round(h * (1 - base - amp * p));
          for (let y = Math.max(0, top); y < h; y++) R.set(x, y, frac(tt - (y - top) / h * 1.4) < 0.72 ? lit : sh);
        }
      };
      layer(0.36, 0.1, 1.3, 2, m.x, c.far, c.farS);
      layer(0.25, 0.12, 0.9, 5, m.x * 2, c.lit, c.shade);
      const midTop = x => { const { p } = dune((x + m.x * 2) / h * 0.9, 5); return Math.round(h * (1 - 0.25 - 0.12 * p)); };
      const lead = frac(t * 0.004 + 0.5) * (w + 0.7 * h) - 0.35 * h, u = h * 0.09;
      for (let i = 0; i < 4; i++) {
        const x = Math.round(lead - i * h * 0.13), y = midTop(x) + 1, step = Math.sin(t * 3 + i) > 0 ? 1 : 0;
        if (i === 0) { box(R, x - 1, y - u * 0.7, 2, u * 0.7, c.cara); R.set(x, y - u * 0.8, c.cara); R.set(x + 2, y - u * 0.45, c.lamp); continue; }
        box(R, x - u * 0.4, y - u * 0.75, u * 0.8, u * 0.3, c.cara); box(R, x - u * 0.15, y - u * 0.95, u * 0.3, u * 0.25, c.cara);
        box(R, x + u * 0.35, y - u * 0.95, Math.max(1, u * 0.12), u * 0.3, c.cara); box(R, x + u * 0.4, y - u * 0.98, u * 0.25, Math.max(1, u * 0.12), c.cara);
        box(R, x - u * 0.3 + step, y - u * 0.45, 1, u * 0.45, c.cara); box(R, x + u * 0.25 - step, y - u * 0.45, 1, u * 0.45, c.cara);
      }
      layer(0.06, 0.14, 0.7, 9, m.x * 4, c.near, c.nearS);
      for (let x = 0; x < w; x++) { const { tt, p } = dune((x + m.x * 4) / h * 0.7, 9); if (tt > 0.72 && tt < 0.9 && bayer(x, 0) < 0.5) R.set(x + Math.round(t * 6) % 4, Math.round(h * (1 - 0.06 - 0.14 * p)) - 2 - (x & 1), c.crest); }
    }
  },

  volcano: {
    title: 'Heart volcano', desc: 'A sleepy little island volcano puffing heart-shaped smoke over a calm sea, palms on its beach.',
    c: P({ sky: ['#6eb2ee', '#b4d4f0', '#ffe0cc'], cloud: '#ffffff', cloudS: '#e2e6f8', rock: '#ba8c9c', rockS: '#846284', green: '#74c870', greenS: '#429862', glow: '#ff9a6e', rim: '#ffba8c', sea: ['#7eccea', '#2876c4'], foam: '#ffffff', sand: '#fadea6', trunk: '#a0704c', palm: '#4c9a50', heart: '#ffeef4', heartS: '#f4b2cc', ink: '#56324c', blush: '#ff8caa' }),
    init(w, h, r) { return { clouds: Array.from({ length: 3 }, () => ({ x: r() * w, y: h * (0.1 + r() * 0.2), s: 4 + r() * 4 })) }; },
    draw(R, t, s, m) {
      const { w, h } = R, c = this.c, hz = Math.round(h * 0.66), vx = w * 0.5 + m.x;
      R.vgrad(0, hz, c.sky);
      for (const k of s.clouds) R.cloud(drift(k.x, 1.5, t, w), k.y, k.s, c.cloud, c.cloudS);
      R.vgrad(hz, h, c.sea);
      for (let y = hz + 2; y < h; y += 3) for (let x = 0; x < w; x++) if (Math.sin(x * 0.12 + Math.sin(y * 1.7) * 3 + y - t * 1.4) > 0.94) R.set(x, y, c.foam);
      const cone = dx => Math.abs(dx) < h * 0.045 ? 0.678 : 0.34 + 0.35 * Math.max(0, 1 - (Math.abs(dx) - h * 0.055) / (h * 0.4)) ** 1.6;
      for (let x = 0; x < w; x++) {
        const dx = x + 0.5 - vx, top = Math.round(h * (1 - cone(dx)));
        if (Math.abs(dx) > h * 0.45) continue;
        for (let y = Math.max(0, top); y < hz; y++) {
          const lit = dx < 0, green = y > h * 0.53;
          R.set(x, y, green ? (lit ? c.green : c.greenS) : y < top + 2 && Math.abs(dx) < h * 0.07 ? c.rim : lit ? c.rock : c.rockS);
        }
      }
      R.glow(vx, h * 0.33, 1, h * 0.08, c.glow, 0.6);
      const ey = Math.round(h * 0.45);
      for (const sd of [-1, 1]) { R.set(vx + sd * h * 0.055 - 1, ey, c.ink); R.set(vx + sd * h * 0.055, ey + 1, c.ink); R.set(vx + sd * h * 0.055 + 1, ey, c.ink); R.set(vx + sd * h * 0.085, ey + 3, c.blush); }
      box(R, vx - h * 0.47, hz - 2, h * 0.94, 2, c.sand); box(R, vx - h * 0.47, hz, h * 0.94, 1, c.foam);
      for (const [dx, ph] of [[-0.33, 0.16], [0.29, 0.16], [0.37, 0.11]]) {
        const bx = vx + dx * h, top = hz - 2 - ph * h, lean = Math.sign(dx) * h * 0.05;
        line(R, bx, hz - 2, bx + lean, top, c.trunk);
        for (let f = 0; f < 5; f++) { const a = -0.4 + f * 0.82 + 0.06 * Math.sin(t * 1.5 + f); line(R, bx + lean, top, bx + lean + Math.cos(a) * h * 0.1, top - Math.sin(a) * h * 0.05 + h * 0.03, c.palm); }
      }
      for (let i = 0; i < 3; i++) {
        const k = frac(t * 0.07 + i / 3), sz = h * (0.035 + 0.085 * Math.sqrt(k));
        if (k > 0.85) continue;
        const cx = vx + k * 0.3 * h, cy = h * (1 - 0.69 - k * 0.36);
        heartAt(R, cx, cy, sz, c.heartS); heartAt(R, cx - 1, cy - 1, sz * 0.85, c.heart);
      }
    }
  },

  tulips: {
    title: 'Tulip fields', desc: 'Striped tulip fields in spring, a windmill turning its sails, a canal and fair-weather clouds.',
    c: P({ sky: ['#5ca2ec', '#a6d0f6', '#daf0ff'], cloud: '#ffffff', cloudS: '#d2e2f6', trees: '#628c84', canal: '#96caf2', bank: '#4c804a', stem: '#5c9c46', tul: ['#ec384a', '#ffce3c', '#ff7eac', '#faf6ec', '#a060d2'], haze: '#bacec4', mound: '#68a850', tower: '#9c6852', towerD: '#704840', cap: '#3a5048', sail: '#faf4e6', frame: '#8c6450', bird: '#3c4664' }),
    init(w, h, r) { return { clouds: Array.from({ length: 4 }, () => ({ x: r() * w, y: h * (0.08 + r() * 0.25), s: 4 + r() * 5 })) }; },
    draw(R, t, s, m) {
      const { w, h } = R, c = this.c, hz = Math.round(h * 0.5);
      R.vgrad(0, hz, c.sky);
      for (const k of s.clouds) R.cloud(drift(k.x, 2, t, w), k.y, k.s, c.cloud, c.cloudS);
      R.ground(x => hz - 1 - (Math.sin(x * 0.7) > 0.2 ? 2 : 0), c.trees);
      for (let y = hz; y < h; y++) {
        const d = (y - hz + 0.5) / h;
        for (let x = 0; x < w; x++) {
          const bc = (x - w * 0.34 + m.x * d * 2) / h / d * 0.5 + 20.5, bi = Math.floor(bc), f = bc - bi;
          let col;
          if (d < 0.04) col = c.haze;
          else if (bi === 21) col = f < 0.07 || f > 0.93 ? c.bank : c.canal;
          else if (f < 0.09 || f > 0.91) col = c.stem;
          else { const hb = frac(Math.sin(bi * 12.9898) * 43758.5); col = c.tul[Math.min(4, Math.floor(hb * 5))]; if (d > 0.15 && ((x % 4) === 3 || (Math.floor(2.4 / d) & 1))) col = c.stem; }
          R.set(x, y, col);
        }
      }
      const wx = w * 0.76 + m.x, wy = h * 0.64, th = h * 0.24;
      for (let x = Math.floor(wx - h * 0.12); x < wx + h * 0.12; x++) { const top = wy - h * 0.012 + 1.4 * ((x - wx) / h) ** 2 * h; box(R, x, top, 1, Math.max(0, wy + h * 0.02 - top), c.mound); }
      for (let y = 0; y < th; y++) { const tw = h * (0.055 - y / h * 0.08); box(R, wx - tw, wy - y, tw * 2, 1, c.tower); box(R, wx + tw * 0.25, wy - y, tw * 0.75, 1, c.towerD); }
      box(R, wx - h * 0.075, wy - h * 0.095, h * 0.15, 1, c.sail);
      R.disc(wx, wy - th, h * 0.042, c.cap);
      const hx = wx, hy = wy - h * 0.262;
      for (let k = 0; k < 4; k++) {
        const a = t * 0.5 + k * Math.PI / 2, dx = Math.cos(a), dy = -Math.sin(a), nx = dy, ny = -dx;
        for (let l = h * 0.012; l < h * 0.21; l += 0.5) {
          R.set(hx + dx * l, hy + dy * l, c.frame);
          if (l > h * 0.035) for (let a2 = 1; a2 < h * 0.046; a2++) R.set(hx + dx * l - nx * a2, hy + dy * l - ny * a2, (Math.round(l) % 4 === 0) ? c.frame : c.sail);
        }
      }
      R.disc(hx, hy, 1, c.cap);
      for (let i = 0; i < 3; i++) { const x = drift(i * 40, 4, t, w), y = h * (0.22 - i * 0.04), f = Math.sin(t * 7 + i) > 0 ? 1 : 0; R.set(x - 1, y - f, c.bird); R.set(x, y, c.bird); R.set(x + 1, y - f, c.bird); }
    }
  },

  pond: {
    title: 'Lily pond', desc: 'A lily pond from above: koi gliding under the pads, water lilies, a frog, dragonflies and ripples.',
    c: P({ water: ['#1a5260', '#2e7e78'], glint: '#6cbeaa', ring: '#bee8de', pad: '#60ae52', padL: '#88cc64', padD: '#36783e', lily: '#ffa8c8', lilyL: '#ffdeea', white: '#fff6ec', gold: '#ffd650', koi: ['#ff7432', '#ffa03c', '#fff8ee', '#2c2c38'], frog: '#7cc854', frogD: '#468c40', eye: '#1e1e24', fly: '#46a0f0', wing: '#e6f4ff' }),
    init(w, h, r) { return { rings: Array.from({ length: 3 }, () => ({ x: r() * w, y: r() * h, p: r() })) }; },
    draw(R, t, s, m) {
      const { w, h } = R, c = this.c;
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) R.set(x, y, (Math.sin(x * 0.11 + y * 0.07 + t * 0.2) + Math.sin(y * 0.13 - x * 0.05)) * 0.25 + 0.5 > bayer(x, y) ? c.water[1] : c.water[0]);
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (Math.abs(Math.sin(x * 0.3 + t * 0.5) + Math.sin(y * 0.37 - t * 0.4 + x * 0.1)) < 0.05) R.set(x, y, c.glint);
      for (let i = 0; i < 4; i++) {
        const sg = i % 2 ? -1 : 1, th = t * (0.12 + i * 0.012) * sg + i * 1.7, ox = w * (0.25 + 0.5 * frac(i * 0.37 + 0.2)), oy = h * (0.3 + 0.4 * frac(i * 0.61 + 0.1)), rx = h * (0.18 + 0.05 * i), ry = h * (0.12 + 0.02 * i);
        const x = ox + rx * Math.cos(th) + m.x, y = h - (oy + ry * Math.sin(th)), dx = -Math.sin(th) * rx * sg, dy = -Math.cos(th) * ry * sg, n = Math.hypot(dx, dy) || 1, L = h * 0.05;
        for (let k = -2; k <= 1; k++) R.disc(x + dx / n * k * L * 0.4, y + dy / n * k * L * 0.4, Math.max(1, L * (k === -2 ? 0.15 : 0.3)), k === 0 ? c.koi[i === 3 ? 3 : 2] : c.koi[i % 2]);
      }
      for (const g of s.rings) { const k = frac(t * 0.18 + g.p), rr = k * h * 0.12; for (let a = 0; a < 6.3; a += 1 / Math.max(2, rr)) if (bayer((g.x + Math.cos(a) * rr) | 0, (g.y + Math.sin(a) * rr) | 0) > k) R.set(g.x + Math.cos(a) * rr, g.y + Math.sin(a) * rr, c.ring); }
      const pads = [[0.12, 0.74, 0.11], [0.3, 0.26, 0.09], [0.56, 0.6, 0.125], [0.8, 0.28, 0.1], [0.92, 0.8, 0.08], [0.4, 0.9, 0.07], [0.68, 0.1, 0.065]];
      pads.forEach(([u, v, rr], i) => {
        const x = u * w + m.x, y = h * (1 - v), r0 = rr * h;
        R.disc(x + 1, y + 1, r0, c.water[0]); R.disc(x, y, r0, c.pad); R.disc(x - r0 * 0.2, y - r0 * 0.2, r0 * 0.6, c.padL);
        const na = i * 2.1; for (let k = 0; k < r0; k++) R.set(x + Math.cos(na) * k, y + Math.sin(na) * k, c.water[1]);
        if (i === 0 || i === 3 || i === 4) { R.disc(x - r0 * 0.2, y - r0 * 0.15, r0 * 0.4, i === 3 ? c.white : c.lily); R.disc(x - r0 * 0.2, y - r0 * 0.15, r0 * 0.2, c.lilyL); R.set(x - r0 * 0.2, y - r0 * 0.15, c.gold); }
      });
      const fx = 0.56 * w + m.x - h * 0.01, fy = h * 0.4;
      oval(R, fx - h * 0.036, fy + h * 0.02, h * 0.016, h * 0.03, c.frogD); oval(R, fx + h * 0.036, fy + h * 0.02, h * 0.016, h * 0.03, c.frogD);
      oval(R, fx, fy, h * 0.032, h * 0.04, c.frog);
      const blink = frac(t * 0.23) < 0.04;
      for (const sd of [-1, 1]) { R.disc(fx + sd * h * 0.017, fy - h * 0.036, Math.max(1, h * 0.012), c.frog); R.set(fx + sd * h * 0.017, fy - h * 0.036, blink ? c.frogD : c.eye); }
      for (let i = 0; i < 2; i++) {
        const tt = t * 0.25 + i * 3, x = w * (0.5 + 0.38 * Math.sin(tt * 0.9 + i) * Math.cos(tt * 0.37)), y = h * (0.5 - 0.32 * Math.sin(tt * 1.3 + i * 2));
        R.set(x - 2, y - 1, c.wing); R.set(x + 2, y - 1, c.wing); R.set(x - 2, y + 1, c.wing); R.set(x + 2, y + 1, c.wing);
        box(R, x, y - 2, 1, 5, c.fly);
      }
    }
  },

  canyon: {
    title: 'Sunset canyon', desc: 'Red mesas glowing at sunset, a river winding far below, a big bird circling on the warm air.',
    c: P({ sky: ['#5c5cac', '#f48c76', '#ffce8c'], sun: '#fff0be', halo: '#ffc482', far: ['#cc8c9c', '#b47890', '#dca0a4'], strata: ['#f0ba88', '#cc5c46', '#e27e4e', '#ac4842'], lit: '#ffc48c', floor: '#a85e5c', floorD: '#784054', river: '#ffc496', riverD: '#6c84c4', bank: '#68804c', near: ['#9c4a50', '#7a3a4a'], rim: '#ffb482', bird: '#3c2238', tree: '#40564a', trunk: '#503232' }),
    init() { return {}; },
    draw(R, t, s, m) {
      const { w, h } = R, c = this.c;
      R.vgrad(0, h * 0.6, c.sky); box(R, 0, h * 0.6, w, h, c.sky[2]);
      const sx = w * 0.22 - m.x, sy = h * 0.48;
      R.glow(sx, sy, h * 0.075, h * 0.25, c.halo, 0.8); R.disc(sx, sy, h * 0.075, c.sun);
      const mesa = (x, k, base, amp) => { const n = 0.5 + 0.5 * Math.sin(x * 1.7 + k) * Math.sin(x * 0.63 + k * 2.3); return base + amp * Math.max(n > 0.55 ? 0.95 : 0, Math.min(1, Math.max(0, (n - 0.3) / 0.25)) * 0.36); };
      const layer = (sc, k, base, amp, par, far) => {
        for (let x = 0; x < w; x++) {
          const u = (x + par) / h * sc, top = Math.round(h * (1 - mesa(u, k, base, amp))), litL = mesa(u - 0.05 * sc, k, base, amp) < mesa(u, k, base, amp) - 0.02;
          for (let y = Math.max(0, top); y < h; y++) R.set(x, y, far ? c.far[(Math.floor(y / 3) % 2) + (litL ? 0 : 1) * 0] : y < top + 1 || litL ? c.lit : c.strata[Math.floor((h - y) / h * 30) & 3]);
        }
      };
      layer(2.4, 1, 0.44, 0.13, m.x, true);
      layer(1.5, 7, 0.3, 0.22, m.x * 2, false);
      for (let y = Math.round(h * 0.69); y < h; y++) {
        const v = (y - h * 0.69) / (h * 0.31), xc = w * 0.5 + (0.04 + 0.22 * v) * h * Math.sin(v * 7 + 1) + m.x * v, wr = h * (0.004 + 0.06 * v * v);
        for (let x = 0; x < w; x++) { const d = Math.abs(x + 0.5 - xc); R.set(x, y, d < wr ? (Math.sin(x * 0.5 + y - t * 2) > 0.8 ? c.river : v > 0.4 ? c.riverD : c.river) : d < wr + 1 + 0.02 * h * v ? c.bank : v > 0.5 ? c.floorD : c.floor); }
      }
      for (let x = 0; x < w; x++) {
        const nx = x + m.x * 3, hl = 0.3 - Math.min(1, Math.max(0, (nx - w * 0.2) / (w * 0.16))) * 0.4, hr = 0.27 - Math.min(1, Math.max(0, (w * 0.82 - nx) / (w * 0.16))) * 0.4;
        const top = Math.round(h * (1 - Math.max(hl, hr)));
        for (let y = Math.max(0, top); y < h; y++) R.set(x, y, y < top + 1 ? c.rim : c.near[Math.floor((h - y) / h * 30) & 1]);
      }
      const jx = w * 0.1 - m.x * 3, jy = h * 0.7;
      box(R, jx, jy - h * 0.06, 1, h * 0.06, c.trunk); R.disc(jx + h * 0.02, jy - h * 0.075, h * 0.04, c.tree); R.disc(jx - h * 0.02, jy - h * 0.055, h * 0.03, c.tree);
      for (let i = 0; i < 2; i++) {
        const a = t * (0.3 + i * 0.1) + i * 2, x = w * (0.6 - i * 0.25) + h * (0.26 - i * 0.1) * Math.cos(a), y = h * (0.26 - i * 0.05 - 0.06 * Math.sin(a)), sp = Math.max(2, Math.round(h * (0.05 - i * 0.02) * 1.4));
        for (let k = -sp; k <= sp; k++) R.set(x + k, y - Math.round(Math.abs(k) * 0.35 * (1 - Math.abs(k) / sp / 2.2)), c.bird);
        R.set(x, y + 1, c.bird);
      }
    }
  },

  storm: {
    title: 'Storm lighthouse', desc: 'A lighthouse on a cliff in a cosy storm: rain, waves bursting white, its beam sweeping round, a warm window.',
    c: P({ sky: ['#1e2240', '#3a3e66', '#58608a'], cloud: '#4a4e7a', cloudL: '#7a7ca6', glow: '#9a8ce0', sea: ['#3c5870', '#14263a'], crest: '#cedcec', cliff: '#2e2e46', cliffL: '#5a5676', grass: '#466454', white: '#eeecf2', red: '#d2464e', dark: '#302c3e', lamp: '#fff0b4', beam: '#fff2c4', wall: '#c4bac0', roof: '#3e3850', win: '#ffce6e', rain: '#a0acd6' }),
    init(w, h, r) { return { drops: Array.from({ length: Math.round(w * h * 0.012) + 10 }, () => ({ x: r() * w, y: r() * h, v: 40 + r() * 30 })), puffs: Array.from({ length: 7 }, () => ({ x: r() * w, y: h * (0.08 + r() * 0.3), s: 5 + r() * 6 })) }; },
    draw(R, t, s, m) {
      const { w, h } = R, c = this.c, hz = Math.round(h * 0.66);
      R.vgrad(0, hz, c.sky);
      for (const p of s.puffs) R.cloud(drift(p.x, 1.2, t, w), p.y, p.s, c.cloudL, c.cloud);
      const li = Math.floor(t * 0.16), lph = frac(t * 0.16);
      if (lph < 0.2) R.glow(frac(Math.sin(li * 7.1) * 99) * w * 0.7, h * 0.3, 2, h * 0.25, c.glow, 0.6 * (1 - lph / 0.2));
      R.vgrad(hz, h, c.sea);
      for (let y = hz + 2; y < h; y += 3) for (let x = 0; x < w; x++) if (Math.sin(x * 0.3 + y * 0.9 - t * 1.3 + Math.sin(x * 0.07) * 3) > 0.9) R.set(x, y, c.crest);
      const ex = x => w * 0.6 + m.x;
      const ct = Math.round(h * 0.5);
      for (let x = Math.floor(ex()); x < w; x++) for (let y = ct; y < hz + h * 0.06; y++) R.set(x, y, y < ct + 1 ? c.grass : x < ex() + 1 ? c.cliffL : c.cliff);
      const lx = w * 0.78 + m.x, ly = ct, th = h * 0.27;
      const ba = t * 0.7, cb = Math.cos(ba), sb = Math.sin(ba), by = ly - h * 0.31, len = w * (0.4 * Math.abs(cb) + 0.08);
      for (let k = 0; k < len; k++) { const sp = 1 + k * (0.1 + 0.3 * (1 - Math.abs(cb))); for (let j = -sp; j <= sp; j++) if (bayer((lx + Math.sign(cb) * k) | 0, (by + j) | 0) < 0.5 * (1 - k / len) * (1 - Math.abs(j) / sp)) R.set(lx + Math.sign(cb) * k, by + j, c.beam); }
      for (let y = 0; y < th; y++) { const tw = h * (0.042 - y / h * 0.045); box(R, lx - tw, ly - y, tw * 2, 1, Math.floor(y / (h * 0.068)) % 2 ? c.red : c.white); }
      box(R, lx - h * 0.044, ly - th - h * 0.015, h * 0.088, h * 0.015, c.dark);
      box(R, lx - h * 0.026, ly - h * 0.33, h * 0.052, h * 0.045, c.lamp);
      peak(R, lx, ly - h * 0.33, h * 0.03, h * 0.03, c.red);
      R.glow(lx, by, 1, h * (0.06 + 0.06 * Math.max(0, sb)), c.lamp, 0.7);
      const hx = lx + h * 0.1;
      box(R, hx - h * 0.05, ct - h * 0.05, h * 0.1, h * 0.05, c.wall); peak(R, hx, ct - h * 0.05, h * 0.06, h * 0.035, c.roof); box(R, hx - h * 0.02, ct - h * 0.035, Math.max(2, h * 0.022), Math.max(2, h * 0.022), c.win);
      const sk = frac(t * 0.28);
      if (sk < 0.6) for (let i = 0; i < 4; i++) R.disc(ex() + 1 + i * h * 0.022, hz + h * 0.03 - sk * h * (0.1 + 0.02 * i), h * (0.016 + sk * 0.035), c.crest);
      for (const d of s.drops) { const y = wrap(d.y + t * d.v, h + 4) - 2, x = wrap(d.x + y * 0.45, w); R.set(x, y, c.rain); R.set(x - 0.45, y - 1, c.rain); }
    }
  },

  harvest: {
    title: 'Harvest field', desc: 'Golden wheat rippling in the wind, a scarecrow and its crows, a red barn under an autumn sky.',
    c: P({ sky: ['#7a9cd6', '#a4c6e6', '#ffdcac'], sun: '#fff6d6', halo: '#ffc88c', cloud: '#fffaf2', cloudS: '#f0d0c8', hills: '#bab0cc', trees: ['#e8843c', '#cc523e', '#f2c048', '#968240'], barn: '#cc3c34', barnD: '#a0302e', trim: '#faf6ec', roof: '#605060', silo: '#c4ccd6', wheat: ['#d49440', '#ecb452', '#ffe086'], bale: '#eec66c', baleD: '#c49042', post: '#78502e', shirt: '#ce403c', shirtL: '#f08860', jeans: '#5466a6', face: '#e8ca96', hat: '#deae50', straw: '#fad664', crow: '#24202e', geese: '#605a78' }),
    init(w, h, r) { return { clouds: Array.from({ length: 3 }, () => ({ x: r() * w, y: h * (0.1 + r() * 0.2), s: 4 + r() * 4 })), trees: Array.from({ length: Math.ceil(w / 5) }, (_, i) => ({ x: i * 5 + r() * 3, c: (r() * 4) | 0, s: r() })) }; },
    draw(R, t, s, m) {
      const { w, h } = R, c = this.c, hz = Math.round(h * 0.56);
      R.vgrad(0, hz, c.sky);
      R.glow(w * 0.1 - m.x, h * 0.34, h * 0.055, h * 0.2, c.halo, 0.7); R.disc(w * 0.1 - m.x, h * 0.34, h * 0.055, c.sun);
      for (const k of s.clouds) R.cloud(drift(k.x, 1.5, t, w), k.y, k.s, c.cloud, c.cloudS);
      for (let i = 0; i < 7; i++) { const kk = Math.ceil(i / 2), sd = i % 2 ? 1 : -1, x = wrap(w * 0.6 - t * w * 0.012, w + 20) - 10 + kk * 2, y = h * 0.16 + sd * kk; R.set(x, y, c.geese); R.set(x - 1, y - (Math.sin(t * 6 + i) > 0 ? 1 : 0), c.geese); R.set(x + 1, y - (Math.sin(t * 6 + i) > 0 ? 1 : 0), c.geese); }
      R.ground(x => hz - h * 0.06 - Math.sin((x + m.x) * 0.05) * h * 0.03, c.hills);
      for (const tr of s.trees) if (tr.s > 0.3) R.disc(tr.x - m.x, hz - 2, h * 0.03, c.trees[tr.c]);
      const bx = w * 0.22 - m.x, by = hz + h * 0.02;
      box(R, bx - h * 0.126, by - h * 0.14, h * 0.052, h * 0.14, c.silo); R.disc(bx - h * 0.1, by - h * 0.14, h * 0.026, c.barnD);
      box(R, bx + h * 0.06, by - h * 0.07, h * 0.09, h * 0.07, c.barnD); box(R, bx + h * 0.06, by - h * 0.1, h * 0.09, h * 0.03, c.roof);
      box(R, bx - h * 0.075, by - h * 0.1, h * 0.15, h * 0.1, c.barn); peak(R, bx, by - h * 0.1, h * 0.075, h * 0.04, c.barn);
      box(R, bx - h * 0.03, by - h * 0.048, h * 0.06, h * 0.048, c.trim); box(R, bx - h * 0.03 + 1, by - h * 0.048 + 1, h * 0.06 - 2, h * 0.048 - 1, c.barnD);
      line(R, bx - h * 0.03, by - h * 0.048, bx + h * 0.03, by, c.trim); line(R, bx + h * 0.03, by - h * 0.048, bx - h * 0.03, by, c.trim);
      for (let y = hz; y < h; y++) {
        const d = (y - hz) / h;
        for (let x = 0; x < w; x++) { const wv = Math.sin(x / h * 4.5 - t * 1.3 + 2.2 / (d + 0.12)); R.set(x, y, wv > 0.6 + bayer(x, y) * 0.3 ? c.wheat[2] : wv < -0.6 - bayer(x, y) * 0.3 ? c.wheat[0] : c.wheat[1]); }
      }
      for (let i = 0; i < 2; i++) { const x = w * (0.42 + i * 0.07) - m.x * 2, y = h * (1 - 0.44 + 0.045 + i * 0.015), rr = h * (0.028 + i * 0.004); R.disc(x, y, rr, c.baleD); R.disc(x, y, rr * 0.7, c.bale); }
      const sx = w * 0.66 - m.x * 3, sy = h * 0.9, u = h / 100, sw = Math.round(Math.sin(t * 0.9));
      box(R, sx, sy - 26 * u, Math.max(1, u * 1.2), 26 * u, c.post);
      box(R, sx - 10 * u + sw, sy - 21.5 * u, 20 * u, 3.6 * u, c.shirt); box(R, sx - 4 * u + sw, sy - 21.5 * u, 8 * u, 10 * u, c.shirtL); box(R, sx - 3 * u + sw, sy - 21.5 * u, 6 * u, 10 * u, c.shirt);
      box(R, sx - 3.2 * u + sw, sy - 12 * u, 2.8 * u, 6 * u, c.jeans); box(R, sx + 0.4 * u + sw, sy - 12 * u, 2.8 * u, 6 * u, c.jeans);
      R.disc(sx + sw, sy - 24.5 * u, 3 * u, c.face); R.set(sx + sw - u, sy - 25 * u, c.crow); R.set(sx + sw + u, sy - 25 * u, c.crow);
      box(R, sx - 5 * u + sw, sy - 27.5 * u, 10 * u, Math.max(1, u), c.hat); box(R, sx - 2.5 * u + sw, sy - 30 * u, 5 * u, 2.5 * u, c.hat);
      box(R, sx - 8.5 * u + sw, sy - 24 * u, 2 * u, 2 * u, c.crow);
      for (let i = 0; i < 2; i++) { const ph = t * 0.7 + i * 1.7, hop = Math.max(0, Math.sin(Math.PI * Math.min(1, frac(ph) / 0.3))), x = wrap(w * (i ? 0.84 : 0.3) - (i ? -1 : 1) * Math.floor(ph) * 2, w), y = h * (0.92 - i * 0.03) - hop * 2; box(R, x - 1, y - 1, 3, 2, c.crow); R.set(x + (i ? 2 : -2), y - 2, c.crow); }
      for (let x = 0; x < w; x += 3) { const top = h - h * (0.08 + 0.1 * frac(Math.sin(x * 3.7) * 99)), sw2 = Math.round(Math.sin(t * 1.6 + x * 0.12) * 2); line(R, x, h, x + sw2, top, c.wheat[0]); box(R, x + sw2, top - 4, 2, 4, c.wheat[2]); }
    }
  }
};
