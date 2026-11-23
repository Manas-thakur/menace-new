/* Scenes and hero sections.
 *
 *   <squish-scene name="meadow"></squish-scene>                 an animated pixel scene
 *   <squish-scene name="starry" px="5" fade="bottom"></squish-scene>
 *
 *   <squish-hero scene="blossom" layout="card" pal="puff">       a hero section around your content
 *     <h1>Hello</h1><p>…</p><a class="sq-btn primary" href="#">Start</a>
 *   </squish-hero>
 *
 * A scene is painted at low resolution (px = CSS pixels per scene pixel), at a calm 15 frames a
 * second, only while it's on screen; it holds still for reduced motion.
 *
 *   <squish-scene name="meadow" look="paper"></squish-scene>   pixel (default), soft, paper or crayon
 *
 * Without its own look, a scene follows the closest [data-sq-style] (clay → soft, paper → paper,
 * doodle → crayon) and redraws when Squish.style() changes it.
 *
 *   <squish-scene name="meadow" controls></squish-scene>       a full screen button in the corner
 *   scene.fullscreen()                                           or open it full screen yourself
 *
 * Full screen shows the same picture on any display: about 270 scene pixels tall at the default pixel size,
 * each one a whole number of device pixels, so it is crisp at 1080p, 1440p, 4K and everything between. */
import { Raster } from './raster.js';
import { gpuReady, drawGPU, warm } from './gl.js';
import { ART } from './art.js';
import { SCENE_LOOKS, LOOK_FOR_STYLE } from './looks.js';
import { SCENES, SCENE_NAMES, seedFor } from './scenes.js';
import { addActor, removeActor, pointer } from '../core/engine.js';
import { attrNum, clamp, isBrowser, reducedMotion, style } from '../core/util.js';

const Base = isBrowser ? HTMLElement : class {};

export class SquishScene extends Base {
  static observedAttributes = ['name', 'px', 'fade', 'still', 'levels', 'dither', 'palette', 'sky', 'look', 'controls'];

  connectedCallback() {
    if (!this.shadowRoot) {
      const root = this.attachShadow({ mode: 'open' });
      root.innerHTML = `<style>:host{display:block;position:relative;height:260px;overflow:hidden;contain:paint}
        canvas{position:absolute;inset:0;width:100%;height:100%;image-rendering:pixelated;image-rendering:crisp-edges}
        :host([fullscreen]){position:fixed!important;inset:0!important;width:100%!important;height:100vh!important;height:100dvh!important;
          margin:0!important;max-width:none!important;max-height:none!important;transform:none!important;z-index:2147483647!important;background:var(--squish-fullscreen-bg,#120d1a)}
        .fs{position:absolute;top:max(8px,env(safe-area-inset-top));right:max(8px,env(safe-area-inset-right));z-index:1;width:34px;height:34px;display:grid;place-items:center;
          padding:0;border:0;color:#fff;background:rgba(29,22,38,.72);cursor:pointer;opacity:0;transition:opacity .2s;
          clip-path:polygon(0 3px,3px 3px,3px 0,calc(100% - 3px) 0,calc(100% - 3px) 3px,100% 3px,100% calc(100% - 3px),calc(100% - 3px) calc(100% - 3px),calc(100% - 3px) 100%,3px 100%,3px calc(100% - 3px),0 calc(100% - 3px))}
        .fs[hidden]{display:none}
        .fs:hover{background:rgba(29,22,38,.9)}
        .fs:focus-visible{opacity:1;box-shadow:inset 0 0 0 2px #fff;outline:none}
        :host(:hover) .fs{opacity:1}
        @media (hover:none){.fs{opacity:.85}}
        /* full screen: the button and the cursor rest once the pointer does */
        :host([fullscreen]) .fs{opacity:0} :host([fullscreen]) .fs.awake,:host([fullscreen]) .fs:focus-visible{opacity:1}
        :host([fullscreen]) canvas.rest{cursor:none}</style><canvas></canvas>
        <button class="fs" type="button" hidden><svg viewBox="0 0 9 9" width="14" height="14" fill="currentColor" shape-rendering="crispEdges" aria-hidden="true"><path></path></svg></button>`;
      this.cv = root.querySelector('canvas'); this.ctx = this.cv.getContext('2d');
      this.fsBtn = root.querySelector('.fs');
      this.fsBtn.addEventListener('click', e => { e.stopPropagation(); this.fullscreen(); });
      this.addEventListener('dblclick', e => { if (this.hasAttribute('controls') && !e.composedPath().includes(this.fsBtn)) this.fullscreen(); });
      this.addEventListener('pointermove', () => this.wake());
      this.onFsChange = () => {
        const el = document.fullscreenElement || document.webkitFullscreenElement;
        if (el === this && this.full !== 'native') this.setFull('native');
        else if (el !== this && this.full === 'native') this.setFull(null);
      };
      this.onFsKey = e => { if (e.key === 'Escape' && this.full === 'page') this.fullscreen(false); };
      this.autoLabel = !this.hasAttribute('aria-label');
      this.low = document.createElement('canvas'); this.lctx = this.low.getContext('2d');
      this.R = new Raster(); this.t = 0; this.acc = 1; this.m = { x: 0, y: 0 };
    }
    this.ro = new ResizeObserver(() => this.layout()); this.ro.observe(this);
    this.io = new IntersectionObserver(es => { this.visible = es[es.length - 1].isIntersecting; }); this.io.observe(this);
    addActor(this);
    this.onStyle ??= () => { if (!SCENE_LOOKS.includes(this.getAttribute('look'))) this.layout(); };
    addEventListener('squish:style', this.onStyle);
    document.addEventListener('fullscreenchange', this.onFsChange); document.addEventListener('webkitfullscreenchange', this.onFsChange);
    this.layout();
  }
  disconnectedCallback() {
    removeActor(this); removeEventListener('squish:style', this.onStyle); this.ro && this.ro.disconnect(); this.io && this.io.disconnect();
    document.removeEventListener('fullscreenchange', this.onFsChange); document.removeEventListener('webkitfullscreenchange', this.onFsChange);
    if (this.full === 'page') this.setFull(null);
  }
  attributeChangedCallback() { if (this.R) this.layout(); }

  /* its own look, else the one that goes with the closest design system, else pixel */
  currentLook() {
    const own = this.getAttribute('look');
    if (SCENE_LOOKS.includes(own)) return own;
    for (let n = this; n; n = n.parentElement || n.getRootNode().host) {
      const s = n.dataset && n.dataset.sqStyle;
      if (s) return LOOK_FOR_STYLE[s] || 'pixel';
    }
    return 'pixel';
  }

  /* open or close full screen (no argument: toggle). Where the browser can't (iPhone Safari), the scene fills the page */
  async fullscreen(on = !this.full) {
    if (!on) {
      if (this.full === 'native') { const ex = document.exitFullscreen || document.webkitExitFullscreen; if (ex) await ex.call(document)?.catch?.(() => {}); }
      if (this.full === 'page') this.setFull(null);
      return;
    }
    if (this.full) return;
    const req = this.requestFullscreen || this.webkitRequestFullscreen;
    if (req) {
      try { await req.call(this, { navigationUI: 'hide' }); if ((document.fullscreenElement || document.webkitFullscreenElement) === this) { this.setFull('native'); return; } } catch { /* not allowed here: fill the page instead */ }
    }
    this.setFull('page');
  }
  get isFullscreen() { return !!this.full; }
  setFull(mode) {
    if ((this.full || null) === mode) return;
    if (this.full === 'page') { document.documentElement.style.overflow = this.prevOverflow || ''; removeEventListener('keydown', this.onFsKey); }
    this.full = mode;
    this.toggleAttribute('fullscreen', !!mode);
    if (mode === 'page') { this.prevOverflow = document.documentElement.style.overflow; document.documentElement.style.overflow = 'hidden'; addEventListener('keydown', this.onFsKey); }
    this.paintButton(); this.wake();
    this.layout();
    this.dispatchEvent(new CustomEvent('squish:fullscreen', { bubbles: true, detail: { fullscreen: !!mode } }));
  }
  paintButton() {
    const b = this.fsBtn, on = !!this.full;
    b.hidden = !this.hasAttribute('controls') && !on;
    b.setAttribute('aria-label', on ? 'Exit full screen' : 'Full screen'); b.title = on ? 'Exit full screen' : 'Full screen';
    b.querySelector('path').setAttribute('d', on ? 'M2 0h1v3H0V2h2zM6 0h1v2h2v1H6zM0 6h3v3H2V7H0zM6 6h3v1H7v2H6z' : 'M0 0h3v1H1v2H0zM6 0h3v3H8V1H6zM0 6h1v2h2v1H0zM8 6h1v3H6V8h2z');
  }
  /* in full screen the button and cursor show while the pointer moves, then rest */
  wake() {
    this.cv.classList.remove('rest');
    if (!this.full) return;
    this.fsBtn.classList.add('awake');
    clearTimeout(this.restT);
    this.restT = setTimeout(() => { this.fsBtn.classList.remove('awake'); if (this.full) this.cv.classList.add('rest'); }, 2500);
  }

  layout() {
    const key = SCENES[this.getAttribute('name')] ? this.getAttribute('name') : 'meadow';
    this.scene = SCENES[key];
    if (this.autoLabel) { this.setAttribute('role', this.hasAttribute('controls') ? 'group' : 'img'); this.setAttribute('aria-label', this.scene.title); }
    this.paintButton();
    let p = clamp(attrNum(this, 'px', 4), 1, 16), w, h;
    const r = this.getBoundingClientRect();
    if (!r.width || !r.height) return;
    const full = !!this.full, dpr = Math.min(full ? 3 : 2, devicePixelRatio || 1);
    if (full) {
      /* the same picture on any screen: about 270 rows at the default pixel size, each scene pixel a whole number of device pixels */
      const d = Math.max(1, Math.round(r.height * dpr / (270 * 4 / p)));
      p = d / dpr; w = Math.ceil(r.width / p); h = Math.ceil(r.height / p);
    } else { w = Math.max(16, Math.round(r.width / p)); h = Math.max(12, Math.round(r.height / p)); }
    if (w !== this.R.w || h !== this.R.h || key !== this.key) {
      this.R.resize(w, h); this.low.width = w; this.low.height = h;
      this.state = this.scene.init(w, h, seedFor(key, w, h)); this.key = key;
    }
    this.lk = this.currentLook();
    if (full) {
      /* pixel: the scene's own pixels, scaled up by the browser a whole number of times; a look: painted at screen
         resolution, up to about 4 megapixels (a 4K screen is painted a little under and smoothed up) */
      const cw = w * p, ch = h * p;
      let k = this.lk === 'pixel' ? 1 / (p * dpr) : 1;
      if (this.lk !== 'pixel') k = Math.min(1, Math.sqrt(4.2e6 / (cw * ch * dpr * dpr)));
      this.cv.width = Math.round(cw * dpr * k); this.cv.height = Math.round(ch * dpr * k);
      this.cv.style.width = cw + 'px'; this.cv.style.height = ch + 'px';
      this.dpr = dpr * k;
    } else {
      this.cv.width = Math.round(r.width * dpr); this.cv.height = Math.round(r.height * dpr);
      this.cv.style.width = this.cv.style.height = '';
      this.dpr = dpr;
    }
    /* the looks are painted at screen resolution: no pixelated scaling */
    this.cv.style.imageRendering = this.lk === 'pixel' ? '' : 'auto';
    /* only draw what's on screen; the rest paint when they scroll in */
    if (this.visible) { this.drawFrame(); this.drawn = true; } else { this.drawn = false; this.acc = 1; if (this.getAttribute('render') !== 'cpu') warm(key); }
  }

  update(dt) {
    if (!this.visible || !this.state) return;
    const still = this.hasAttribute('still') || reducedMotion();
    if (!this.drawn) { this.drawn = true; this.acc = 0; this.drawFrame(); return; }
    if (this.getAttribute('interactive') !== 'false' && pointer.x > -1e4) {
      const r = this.getBoundingClientRect(), tx = clamp((pointer.x - r.left - r.width / 2) / (r.width / 2), -1, 1) * 2;
      this.m.x += (tx - this.m.x) * Math.min(1, dt * 3);
    }
    if (still) return;
    this.t += dt * attrNum(this, 'speed', 1);
    this.acc += dt;
    if (this.acc < 1 / 20) return;
    this.acc = 0;
    this.drawFrame();
  }

  /* named so it can't collide with the render="…" attribute (Vue and React 19 set same-named props as properties) */
  drawFrame() {
    const f = this.full ? null : this.getAttribute('fade');
    /* the GPU paints the full scene; the CPU painter is the fallback */
    if (this.getAttribute('render') !== 'cpu' && gpuReady(this.key)) {
      const pal = this.getAttribute('palette');
      const ok = drawGPU(this.key, {
        w: this.R.w, h: this.R.h, t: this.t, mx: this.m.x, my: 0,
        levels: attrNum(this, 'levels', 12), dither: clamp(attrNum(this, 'dither', .3), 0, 1), sky: this.getAttribute('sky') !== 'none',
        fade: [f === 'top' || f === 'both' ? 0.4 : 0, f === 'bottom' || f === 'both' ? 0.4 : 0],
        palette: pal ? pal.split(/[\s,]+/).filter(c => /^#[0-9a-f]{6}$/i.test(c)) : null,
        look: this.lk, dpr: this.dpr
      }, this.ctx, this.cv.width, this.cv.height);
      if (ok) return;
    }
    const R = this.R;
    R.buf.fill(0);
    this.scene.draw(R, this.t, this.state, { x: Math.round(this.m.x), y: 0 });
    if (f) R.fade(f === 'top' || f === 'both' ? 0.4 : 0, f === 'bottom' || f === 'both' ? 0.4 : 0);
    this.lctx.putImageData(R.img, 0, 0);
    const g = this.ctx;
    g.imageSmoothingEnabled = false;
    g.clearRect(0, 0, this.cv.width, this.cv.height);
    g.drawImage(this.low, 0, 0, this.cv.width, this.cv.height);
  }
}

/* ---------- hero sections ---------- */
const RING = '0 -4px 0 0 #2b2033, 0 4px 0 0 #2b2033, -4px 0 0 0 #2b2033, 4px 0 0 0 #2b2033';
const HERO_CSS = `
squish-hero { display: block; position: relative; overflow: hidden; isolation: isolate; }
squish-hero .sh-bg { position: absolute; inset: 0; height: auto; z-index: -1; }
squish-hero .sh-in { position: relative; padding: clamp(40px, 7vw, 88px) clamp(20px, 5vw, 56px); min-height: var(--squish-hero-h, 440px); box-sizing: border-box; }
squish-hero .sh-panel > h1, squish-hero .sh-panel > h2 { position: relative; font: 700 clamp(34px, 6vw, 62px)/1.04 var(--squish-hero-font, "Pixelify Sans", ui-monospace, monospace); margin: 0 0 14px; letter-spacing: 0; }
squish-hero .sh-panel > p { font-size: clamp(16px, 1.6vw, 19px); line-height: 1.55; max-width: 52ch; margin: 0 0 24px; }
squish-hero .sh-panel > :last-child { margin-bottom: 0; }
/* hero buttons are a size up from the everyday ones */
squish-hero .sh-panel .sq-btn:not(.small) { font-size: 16px; padding: calc(var(--u, 3px) * 3.5) calc(var(--u, 3px) * 6); }
/* banner: the scene fills it, the words sit on top with a pixel outline */
squish-hero.sh-banner .sh-in { display: flex; align-items: center; justify-content: center; text-align: center; color: #fff;
  text-shadow: 3px 0 0 #2b2033, -3px 0 0 #2b2033, 0 3px 0 #2b2033, 0 -3px 0 #2b2033, 3px 3px 0 #2b2033, -3px 3px 0 #2b2033, 3px -3px 0 #2b2033, -3px -3px 0 #2b2033, 0 7px 0 rgba(20,10,30,.3); }
/* the words under the heading sit on a dark pixel plate, so they read over any scene */
squish-hero.sh-banner .sh-panel > p { width: fit-content; margin-left: auto; margin-right: auto; padding: 8px 16px; text-shadow: none; background: rgba(29,22,38,.72);
  clip-path: polygon(0 4px, 4px 4px, 4px 0, calc(100% - 4px) 0, calc(100% - 4px) 4px, 100% 4px, 100% calc(100% - 4px), calc(100% - 4px) calc(100% - 4px), calc(100% - 4px) 100%, 4px 100%, 4px calc(100% - 4px), 0 calc(100% - 4px)); }
squish-hero.sh-banner .sh-panel :is(a, button) { text-shadow: none; }
/* card: the scene fills it, the words sit on a little pixel card */
squish-hero.sh-card .sh-in { display: grid; place-items: center; }
squish-hero.sh-card .sh-panel { max-width: 520px; padding: 30px 34px; text-align: center; background: var(--squish-hero-card, #fffaf2); color: var(--squish-hero-card-ink, #2b2033); box-shadow: ${RING}, 10px 12px 0 4px rgba(20,10,30,.22); }
squish-hero.sh-card .sh-panel > p { margin-left: auto; margin-right: auto; }
/* horizon: words centred on the page, the scene rising underneath them as a band */
squish-hero.sh-horizon .sh-in { display: flex; justify-content: center; text-align: center; min-height: 0; padding-bottom: 8px; }
squish-hero.sh-horizon .sh-panel > p { margin-left: auto; margin-right: auto; }
squish-hero.sh-horizon .sh-bg { position: relative; inset: auto; z-index: 0; height: var(--squish-hero-band, clamp(170px, 24vw, 300px)); }
/* split and portrait: words on one side, the scene framed on the other */
squish-hero.sh-split .sh-in, squish-hero.sh-portrait .sh-in { display: grid; grid-template-columns: minmax(0, 1.05fr) minmax(0, 1fr); gap: clamp(24px, 5vw, 64px); align-items: center; }
squish-hero .sh-art { position: relative; min-width: 0; }
squish-hero.sh-split .sh-art :is(squish-scene, squish-diorama) { height: 340px; box-shadow: ${RING}, 10px 12px 0 4px rgba(20,10,30,.18); margin: 4px; }
/* portrait: the character stands in its own framed scene */
squish-hero.sh-portrait .sh-art { height: 360px; margin: 4px; box-shadow: ${RING}, 10px 12px 0 4px rgba(20,10,30,.18); }
squish-hero.sh-portrait .sh-art :is(squish-scene, squish-diorama) { position: absolute; inset: 0; height: auto; }
squish-hero.sh-portrait .sh-art squish-big { position: absolute; z-index: 1; left: 28%; bottom: 7%; transform: translateX(-50%); }
@media (max-width: 720px) {
  squish-hero.sh-split .sh-in, squish-hero.sh-portrait .sh-in { grid-template-columns: 1fr; }
  squish-hero.sh-split .sh-art :is(squish-scene, squish-diorama), squish-hero.sh-portrait .sh-art { height: 260px; }
}`;

export const HERO_LAYOUTS = ['banner', 'card', 'horizon', 'split', 'portrait'];

export class SquishHero extends Base {
  static observedAttributes = ['layout', 'scene', 'pal', 'px', 'look'];
  connectedCallback() {
    style('hero', HERO_CSS);
    if (document.readyState === 'loading') addEventListener('DOMContentLoaded', () => this.build(), { once: true }); else queueMicrotask(() => this.build());
  }
  attributeChangedCallback() { if (this.inner) this.build(); }

  build() {
    if (!this.isConnected) return;
    const layout = HERO_LAYOUTS.includes(this.getAttribute('layout')) ? this.getAttribute('layout') : 'banner';
    const scene = this.getAttribute('scene') || 'meadow', framed = layout === 'split' || layout === 'portrait';
    if (!this.inner) {
      /* the author's content moves into a panel; the scene and any art are ours */
      this.inner = document.createElement('div'); this.inner.className = 'sh-in';
      this.panel = document.createElement('div'); this.panel.className = 'sh-panel';
      this.panel.append(...this.childNodes);
      this.inner.append(this.panel); this.append(this.inner);
    }
    /* the backdrop: a pixel scene, or a 3D diorama */
    const tag = ART[scene] ? 'squish-diorama' : 'squish-scene';
    if (!this.bg || this.bg.localName !== tag) {
      const bg = document.createElement(tag); bg.setAttribute('aria-hidden', 'true');
      if (this.bg) this.bg.replaceWith(bg);
      this.bg = bg;
    }
    HERO_LAYOUTS.forEach(l => this.classList.toggle('sh-' + l, l === layout));
    this.bg.setAttribute('name', scene);
    this.bg.setAttribute('px', this.getAttribute('px') || '4');
    /* a look of its own for the scene; without one it follows the page's design system */
    if (tag === 'squish-scene' && this.hasAttribute('look')) this.bg.setAttribute('look', this.getAttribute('look')); else this.bg.removeAttribute('look');
    this.bg.className = framed ? '' : 'sh-bg';
    if (layout === 'horizon') this.bg.setAttribute('fade', 'top'); else this.bg.removeAttribute('fade');
    /* where the scene lives: behind everything, or framed beside the words */
    let art = this.inner.querySelector(':scope > .sh-art');
    if (framed) {
      if (!art) { art = document.createElement('div'); art.className = 'sh-art'; this.inner.append(art); }
      art.querySelector('squish-big')?.remove();
      if (layout === 'portrait') { const big = document.createElement('squish-big'); big.setAttribute('pal', this.getAttribute('pal') || 'puff'); big.setAttribute('size', '190'); art.append(big); }
      art.append(this.bg);
    } else {
      art && art.remove();
      /* behind everything, or for a horizon, the band under the words */
      if (layout === 'horizon') this.append(this.bg); else this.prepend(this.bg);
    }
    /* a character lives on the heading */
    this.panel.querySelector(':scope > :is(h1, h2) > squish-pal[data-hero]')?.remove();
    const pal = this.getAttribute('pal'), heading = this.panel.querySelector(':scope > :is(h1, h2)');
    if (pal && heading && layout !== 'portrait') {
      const el = document.createElement('squish-pal');
      el.dataset.hero = ''; el.setAttribute('pal', pal); el.setAttribute('size', '40');
      heading.append(el);
    }
  }
}

if (isBrowser) {
  if (!customElements.get('squish-scene')) customElements.define('squish-scene', SquishScene);
  if (!customElements.get('squish-hero')) customElements.define('squish-hero', SquishHero);
}
export { SCENES, SCENE_NAMES };
// trimmed for this site: the 3D dioramas and fly-bys aren't used
// export { SquishDiorama, ART, ART_NAMES } from './diorama.js';
// export { SquishFlyby } from './flyby.js';
