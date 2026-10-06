import { drawSky, geomFor, mulberry32, readPalette, withAlpha, type Geom, type Palette } from './scene';

// Mānasarovar. The sky is painted once (and again only while dawn breaks); the water
// mirrors it row by row, each row nudged sideways by a few slow sines that crowd
// together towards the far shore, the way waves do in perspective. Stir the water
// and the ripples grow; keep still and they settle into glass, and the loop stops
// drawing altogether.

type Ring = { x: number; y: number; age: number; life: number; strength: number };
type Glint = { x: number; y: number; len: number; phase: number; speed: number };

export type NameReflection = {
  /** The name as the page shows it: same face, size and place, so the mirror is exact. */
  latin: { text: string; font: string; cx: number };
  /** The name in its own script, which the lake shows instead once it is still. */
  deva: { text: string; family: string; cx: number; maxWidth: number };
};

type Metrics = { font: string; ascent: number; descent: number };
type TextLayout = { latin: Metrics; deva: Metrics };

const MAX_DEVICE_PX = 6e6;
/** Sky painted past both edges (CSS px), so rows pushed sideways never show a bare edge. */
const BLEED = 36;

export class Lake {
  private skyCtx: CanvasRenderingContext2D;
  private waterCtx: CanvasRenderingContext2D;
  private refl = document.createElement('canvas');
  private reflCtx: CanvasRenderingContext2D;
  private g: Geom = geomFor(1, 1, 1);
  private dpr = 1;
  private pal: Palette;
  private dawn = 1;
  private text: NameReflection | null = null;
  private layout: TextLayout | null = null;
  private rise = 1;
  /** 0 shows the name as written, 1 the name in its own script. */
  private morph = 0;
  private morphTarget = 0;
  private t = 0;
  /** Base shimmer: 1 = a breathing lake, 0 = glass. */
  private amp: number;
  /** Extra ripple from the visitor's hand, decaying. */
  private agit = 0;
  private calm: boolean;
  private rings: Ring[] = [];
  private glints: Glint[] = [];
  private raf = 0;
  private last = 0;
  private lastDraw = 0;
  private visible = true;
  private reduced: boolean;

  constructor(
    private sky: HTMLCanvasElement,
    private water: HTMLCanvasElement,
    { reduced = false, still = false } = {}
  ) {
    this.skyCtx = sky.getContext('2d')!;
    this.waterCtx = water.getContext('2d', { alpha: false })!;
    this.reflCtx = this.refl.getContext('2d')!;
    this.pal = readPalette();
    this.reduced = reduced;
    this.calm = still || reduced;
    this.amp = this.calm ? 0 : 1;
  }

  /** How far below the water line the reflected name reaches, in CSS px. */
  get reflectionDepth() {
    const l = this.layout;
    return l ? Math.max(l.latin.ascent + l.latin.descent, l.deva.ascent + l.deva.descent) : 0;
  }

  get isCalm() {
    return this.calm;
  }

  resize(W: number, H: number, horizon: number) {
    this.dpr = Math.min(window.devicePixelRatio || 1, 2, Math.sqrt(MAX_DEVICE_PX / Math.max(1, W * H)));
    this.g = geomFor(W, H, horizon);
    const d = this.dpr;
    const lakeH = Math.max(1, H - horizon);
    const size = (c: HTMLCanvasElement, w: number, h: number) => {
      c.width = Math.max(1, Math.round(w * d));
      c.height = Math.max(1, Math.round(h * d));
    };
    size(this.sky, W + BLEED * 2, horizon);
    size(this.refl, W + BLEED * 2, horizon);
    size(this.water, W, lakeH);
    // the sky canvas overhangs the painting by the bleed on both sides
    this.sky.style.left = `${-BLEED}px`;
    this.sky.style.width = `${W + BLEED * 2}px`;
    // light lying on the far water, under the shore
    const rand = mulberry32(31);
    this.glints = Array.from({ length: Math.max(6, Math.round(W / 70)) }, () => ({
      x: rand() * W,
      y: 2 + Math.pow(rand(), 2.4) * lakeH * 0.32,
      len: 10 + rand() * 54,
      phase: rand() * Math.PI * 2,
      speed: 0.5 + rand() * 1.4,
    }));
    this.measureText();
    this.paintSky();
    this.kick();
  }

  /** 0 = night, 1 = first light. */
  setDawn(p: number) {
    this.dawn = p;
    this.paintSky();
    this.kick();
  }

  setText(text: NameReflection | null) {
    this.text = text;
    this.measureText();
    this.paintRefl();
    this.kick();
  }

  /** 0 → 1: the reflected name rises with the name, from under the water line. */
  setRise(r: number) {
    this.rise = r;
    this.paintRefl();
    this.kick();
  }

  /** Show the name in its own script in the water (true), or as written (false). */
  setInner(on: boolean) {
    this.morphTarget = on ? 1 : 0;
    if (this.reduced) {
      this.morph = this.morphTarget;
      this.paintRefl();
    }
    this.kick();
  }

  /** The visitor's hand moving over the lake at `speed` CSS px per second. */
  stir(speed: number) {
    if (this.reduced) return;
    this.agit = Math.max(this.agit, Math.min(1.2, speed / 1100));
    this.kick();
  }

  /** A drop: a ring spreading from (x, y), with y measured down from the water line. */
  drop(x: number, y: number, strength = 1, life = 2.6) {
    if (this.reduced) return;
    this.rings.push({ x, y, age: 0, life, strength });
    if (this.rings.length > 24) this.rings.shift();
    this.kick();
  }

  setCalm(calm: boolean) {
    this.calm = calm;
    this.kick();
  }

  setVisible(visible: boolean) {
    this.visible = visible;
    if (visible) this.kick();
    else if (this.raf) {
      cancelAnimationFrame(this.raf);
      this.raf = 0;
    }
  }

  destroy() {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.refl.width = this.refl.height = 0;
  }

  private paintSky() {
    this.skyCtx.setTransform(this.dpr, 0, 0, this.dpr, BLEED * this.dpr, 0);
    drawSky(this.skyCtx, this.g, this.pal, this.dawn, BLEED);
    this.paintRefl();
  }

  private measureText() {
    const t = this.text;
    if (!t) {
      this.layout = null;
      return;
    }
    const r = this.reflCtx;
    r.setTransform(1, 0, 0, 1, 0, 0);
    const metrics = (font: string, text: string): Metrics => {
      r.font = font;
      const m = r.measureText(text);
      return { font, ascent: m.actualBoundingBoxAscent, descent: m.actualBoundingBoxDescent };
    };
    const latin = metrics(t.latin.font, t.latin.text);
    // the script version runs a little narrower than the name and no taller than its capitals
    r.font = `400 100px ${t.deva.family}`;
    const probe = r.measureText(t.deva.text);
    const tall = probe.actualBoundingBoxAscent + probe.actualBoundingBoxDescent || 100;
    const px = Math.min((100 * t.deva.maxWidth) / (probe.width || 1), (100 * latin.ascent * 1.18) / tall);
    const deva = metrics(`400 ${px.toFixed(2)}px ${t.deva.family}`, t.deva.text);
    this.layout = { latin, deva };
  }

  /** The reflection's source: the sky, and the name standing on the water. */
  private paintRefl() {
    const r = this.reflCtx;
    r.setTransform(1, 0, 0, 1, 0, 0);
    r.clearRect(0, 0, this.refl.width, this.refl.height);
    r.drawImage(this.sky, 0, 0);
    const t = this.text;
    const l = this.layout;
    if (!t || !l || this.rise <= 0) return;
    r.setTransform(this.dpr, 0, 0, this.dpr, BLEED * this.dpr, 0);
    r.textAlign = 'center';
    r.textBaseline = 'alphabetic';
    const wl = this.g.horizon;
    // The canvas ends at the water line, so whatever has not risen yet is cut off there.
    const draw = (m: Metrics, text: string, cx: number, baseline: number, alpha: number) => {
      if (alpha <= 0.002) return;
      const sink = (1 - this.rise) * (m.ascent + m.descent + 4);
      const top = baseline + sink - m.ascent;
      const gold = r.createLinearGradient(0, top, 0, baseline + sink + m.descent);
      gold.addColorStop(0.14, this.pal.halo);
      gold.addColorStop(0.52, this.pal.gold);
      gold.addColorStop(0.96, this.pal.goldDeep);
      r.globalAlpha = alpha;
      r.font = m.font;
      r.fillStyle = gold;
      r.fillText(text, cx, baseline + sink);
    };
    const k = this.morph * this.morph * (3 - 2 * this.morph);
    draw(l.latin, t.latin.text, t.latin.cx, wl, 0.8 * (1 - k));
    // the vowel signs that hang below the letters still touch the water
    draw(l.deva, t.deva.text, t.deva.cx, wl - l.deva.descent - 1, 0.86 * k);
    r.globalAlpha = 1;
  }

  private kick() {
    if (this.raf || !this.visible) return;
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.frame);
  }

  private frame = (now: number) => {
    this.raf = 0;
    const dt = Math.min(0.05, Math.max(0, (now - this.last) / 1000));
    this.last = now;
    this.t += dt;
    const target = this.calm || this.reduced ? 0 : 1;
    this.amp += (target - this.amp) * (1 - Math.exp(-dt / (this.calm ? 0.55 : 0.9)));
    if (Math.abs(this.amp - target) < 0.003) this.amp = target;
    this.agit *= Math.exp(-dt / (this.calm ? 0.35 : 1.1));
    if (this.agit < 0.003) this.agit = 0;
    for (const ring of this.rings) ring.age += dt;
    this.rings = this.rings.filter((ring) => ring.age < ring.life);
    const morphing = this.morph !== this.morphTarget;
    if (morphing) {
      this.morph += (this.morphTarget - this.morph) * (1 - Math.exp(-dt / (this.morphTarget ? 0.62 : 0.3)));
      if (Math.abs(this.morph - this.morphTarget) < 0.004) this.morph = this.morphTarget;
      this.paintRefl();
    }

    const busy = this.agit > 0 || this.rings.length > 0 || this.amp !== target || morphing;
    const breathing = this.amp > 0;
    // a breathing lake draws at ~30 fps, a stirred one every frame; glass draws once and stops
    if (busy || !breathing || now - this.lastDraw > 30) {
      this.drawWater();
      this.lastDraw = now;
    }
    if ((busy || breathing) && this.visible) this.raf = requestAnimationFrame(this.frame);
  };

  private drawWater() {
    const c = this.waterCtx;
    const { dpr, g, pal, t } = this;
    const W = this.water.width;
    const H = this.water.height;
    const lakeCss = Math.max(1, g.H - g.horizon);

    c.setTransform(1, 0, 0, 1, 0, 0);
    c.globalAlpha = 1;
    const base = c.createLinearGradient(0, 0, 0, H);
    base.addColorStop(0, pal.lake);
    base.addColorStop(1, pal.lakeDeep);
    c.fillStyle = base;
    c.fillRect(0, 0, W, H);

    // the mirrored sky, row by row
    const src = this.refl;
    const srcH = src.height;
    const step = Math.max(1, Math.round(dpr));
    const bleed = BLEED * dpr;
    const srcW = src.width;
    const calmish = this.amp + this.agit;
    for (let y = 0; y < H; y += step) {
      const yc = y / dpr;
      const depth = yc / lakeCss;
      let dx = 0;
      let dy = 0;
      if (calmish > 0.002) {
        // distance across the water: large near the far shore, ~1 at our feet
        const z = lakeCss / (yc + 10);
        const a = this.amp * (0.6 + depth * 7.5) + this.agit * (1.5 + depth * 15);
        dx =
          a *
          (0.55 * Math.sin(z * 9.3 + t * 1.25) +
            0.3 * Math.sin(z * 23.1 - t * 1.9 + 1.3) +
            0.15 * Math.sin(yc * 0.31 + t * 2.6));
        dy = a * 0.22 * Math.sin(z * 15.7 + t * 1.7);
      }
      const sy = Math.round(srcH - step - y - dy * dpr);
      if (sy < 0) break;
      c.globalAlpha = 0.95 - depth * 0.55;
      c.drawImage(src, 0, Math.min(sy, srcH - step), srcW, step, dx * dpr - bleed, y, srcW, step);
    }

    // looking down, the lake shows itself more than the sky
    c.globalAlpha = 1;
    const tint = c.createLinearGradient(0, 0, 0, H);
    tint.addColorStop(0, withAlpha(pal.lakeDeep, 0.05));
    tint.addColorStop(0.5, withAlpha(pal.lakeDeep, 0.3));
    tint.addColorStop(1, withAlpha(pal.lakeDeep, 0.62));
    c.fillStyle = tint;
    c.fillRect(0, 0, W, H);

    c.setTransform(dpr, 0, 0, dpr, 0, 0);

    c.lineCap = 'round';
    c.strokeStyle = pal.glint;
    c.lineWidth = 1.1;
    for (const gl of this.glints) {
      const twinkle = this.amp > 0 ? 0.5 + 0.5 * Math.sin(t * gl.speed + gl.phase) : 0.5;
      c.globalAlpha = (0.05 + 0.32 * twinkle * Math.max(this.amp, 0.35)) * this.dawn;
      const drift = this.amp * 3 * Math.sin(t * 0.6 + gl.phase);
      c.beginPath();
      c.moveTo(gl.x + drift, gl.y);
      c.lineTo(gl.x + drift + gl.len, gl.y);
      c.stroke();
    }

    for (const ring of this.rings) {
      const k = ring.age / ring.life;
      const depth = Math.min(1, ring.y / lakeCss);
      const rad = (5 + ring.age * 64) * (0.45 + depth * 1.05);
      const squash = 0.16 + depth * 0.2;
      const a = ring.strength * Math.pow(1 - k, 1.7);
      for (const [f, color, alpha, width] of [
        [1, pal.ring, 0.5, 1.3],
        [0.93, pal.lakeDeep, 0.45, 1.6],
        [0.62, pal.ring, 0.32, 1],
      ] as const) {
        c.globalAlpha = a * alpha;
        c.strokeStyle = color;
        c.lineWidth = width;
        c.beginPath();
        c.ellipse(ring.x, ring.y, rad * f, rad * f * squash, 0, 0, Math.PI * 2);
        c.stroke();
      }
    }
    c.globalAlpha = 1;
  }
}
