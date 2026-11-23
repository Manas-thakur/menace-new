/* The GPU scene renderer. Every scene is a small fragment shader that paints a full-colour picture
 * (gradients, haze, light, texture); this pass then turns it into pixel art: a dozen shades per colour
 * channel with a light ordered dither where they meet, or the nearest colours of a palette you give it. All scenes on a
 * page share one WebGL context and one small canvas; each frame is copied out to the scene's own
 * canvas, scaled up with no smoothing. If WebGL isn't there, scenes fall back to the CPU painter. */
import { HEADER, SHADERS } from './shaders.js';
import { ART, ART_HEADER, ART_MARCH } from './art.js';
import { LOOK_SHADERS, LOOK_SUB } from './looks.js';

const MAIN = `
void main() {
  /* uSub > 1 paints several samples per scene pixel (the soft, paper and crayon looks); F stays in scene pixels */
  F = gl_FragCoord.xy / max(uSub, 1.) + uJit; A = uRes.x / uRes.y; T = uT; M = uM; gT = 1e3;
  vec2 uv = F / uRes;
  vec4 s = scene(uv);
  /* into a look: full colour, and in alpha whether this is ground (1) or sky (0) */
  if (uPost > 1.5) { gl_FragColor = vec4(clamp(s.rgb, 0., 1.), s.a > .5 ? 0. : 1.); return; }
  /* into the post pipeline: colour, and depth in alpha for the focus blur */
  if (uPost > .5) { gl_FragColor = vec4(clamp(s.rgb, 0., 1.), clamp(gT / 18., 0., 1.)); return; }
  if (uSky < .5 && s.a > .5) { gl_FragColor = vec4(0.); return; }
  float a = 1.;
  if (uFade.x > 0.) a = min(a, (1. - uv.y) / uFade.x);
  if (uFade.y > 0.) a = min(a, uv.y / uFade.y);
  float b = bayer4(F);
  vec3 c = clamp(s.rgb, 0., 1.);
  if (uSmooth > .5) {
    /* smooth: full colour, a whisper of noise against banding, a soft fade */
    c += (hash(F + fract(T * 7.)) - .5) / 128.;
    gl_FragColor = vec4(c * a, a);
    return;
  }
  /* the fade steps down in four soft bands, a pixel row at a time, with a little dither where they meet */
  if (a < 1.) { a = clamp(floor(a * 4. + (b - .5) * uDither) / 4., 0., 1.); if (a <= 0.) { gl_FragColor = vec4(0.); return; } }
  if (uPalN > .5) {
    /* repaint: nearest colour of the given palette, after a dither nudge */
    c += (b - .5) * uDither * .2;
    vec3 best = c; float bd = 1e9;
    for (int i = 0; i < 32; i++) {
      if (float(i) >= uPalN) break;
      vec3 p = texture2D(uPal, vec2((float(i) + .5) / 32., .5)).rgb, d = c - p;
      float e = dot(d * d, vec3(.3, .59, .11));
      if (e < bd) { bd = e; best = p; }
    }
    c = best;
  } else {
    float L = uLevels - 1.;
    c = clamp(floor(c * L + .5 + (b - .5) * uDither), 0., L) / L;
  }
  gl_FragColor = vec4(c * a, a);
}`;

const VERT = 'attribute vec2 p; void main() { gl_Position = vec4(p, 0., 1.); }';

let gl = null, cv = null, failed = false, quad = null, palTex = null;
const progs = new Map();

function setup() {
  if (gl || failed || typeof document === 'undefined') return;
  cv = document.createElement('canvas'); cv.width = 64; cv.height = 64;
  gl = cv.getContext('webgl', { preserveDrawingBuffer: true, antialias: false, alpha: true, premultipliedAlpha: true, depth: false, stencil: false });
  if (!gl) { failed = true; return; }
  cv.addEventListener('webglcontextlost', e => { e.preventDefault(); failed = true; });
  quad = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, quad);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  palTex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, palTex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 32, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(128));
}

function compile(type, src) {
  const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { console.warn('[squishkit] scene shader:', gl.getShaderInfoLog(s)); return null; }
  return s;
}
function program(name) {
  if (progs.has(name)) return progs.get(name);
  let p = null;
  const src = SHADERS[name] ? HEADER + SHADERS[name] : ART[name] ? HEADER + ART_HEADER + ART[name].map + ART_MARCH + ART[name].render : null;
  const fs = src && compile(gl.FRAGMENT_SHADER, src + MAIN), vs = fs && compile(gl.VERTEX_SHADER, VERT);
  if (fs && vs) {
    p = gl.createProgram(); gl.attachShader(p, vs); gl.attachShader(p, fs); gl.bindAttribLocation(p, 0, 'p'); gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) { console.warn('[squishkit] scene link:', gl.getProgramInfoLog(p)); p = null; }
    else p.u = Object.fromEntries(['uRes', 'uT', 'uM', 'uLevels', 'uDither', 'uSky', 'uPalN', 'uFade', 'uPal', 'uSmooth', 'uS', 'uK', 'uO', 'uPost', 'uJit', 'uSub'].map(k => [k, gl.getUniformLocation(p, k)]));
  }
  progs.set(name, p);
  return p;
}

export function gpuReady(name) {
  setup();
  return !failed && !!program(name);
}

/* compile a shader ahead of time, while the browser is idle, one per idle moment: a scene further down the page
   is then ready when it scrolls in, without a hitch, and nothing compiles while the page is loading */
const warmQueue = new Set();
let warming = false;
export function warm(name) {
  if (progs.has(name) || typeof requestIdleCallback === 'undefined') return;
  warmQueue.add(name);
  if (warming) return;
  warming = true;
  const next = deadline => {
    const [n] = warmQueue;
    if (n === undefined) { warming = false; return; }
    if (deadline.timeRemaining() > 12 || deadline.didTimeout) { warmQueue.delete(n); gpuReady(n); }
    requestIdleCallback(next, { timeout: 4000 });
  };
  requestIdleCallback(next, { timeout: 4000 });
}

/* palette: list of '#rrggbb' (up to 32) */
let lastPal = '';
function uploadPalette(list) {
  const key = list.join(',');
  if (key === lastPal) return;
  lastPal = key;
  const data = new Uint8Array(128);
  list.slice(0, 32).forEach((h, i) => { const n = parseInt(h.slice(1), 16); data.set([n >> 16, (n >> 8) & 255, n & 255, 255], i * 4); });
  gl.bindTexture(gl.TEXTURE_2D, palTex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 32, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
}

/* paint one frame of a scene at w×h scene pixels into ctx, scaled to tw×th */
export function drawGPU(name, { w, h, t, mx, my, levels = 6, dither = 1, sky = true, fade = [0, 0], palette = null, smooth = false, scroll = 0, poke = 0, orbit = [0, 0], look = 'pixel', dpr = 1 }, ctx, tw, th) {
  const p = program(name);
  if (!p) return false;
  if (!smooth && LOOK_SHADERS[look] && drawLook(p, look, { w, h, t, mx, my, sky, fade, dpr }, ctx, tw, th)) return true;
  if (cv.width < w || cv.height < h) { cv.width = Math.max(cv.width, w); cv.height = Math.max(cv.height, h); }
  gl.viewport(0, 0, w, h);
  gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
  gl.useProgram(p);
  gl.bindBuffer(gl.ARRAY_BUFFER, quad); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  gl.uniform2f(p.u.uRes, w, h); gl.uniform1f(p.u.uT, t); gl.uniform2f(p.u.uM, mx, my);
  gl.uniform1f(p.u.uLevels, Math.max(2, Math.min(16, levels))); gl.uniform1f(p.u.uDither, dither);
  gl.uniform1f(p.u.uSky, sky ? 1 : 0); gl.uniform2f(p.u.uFade, fade[0], fade[1]);
  gl.uniform1f(p.u.uPalN, palette ? Math.min(32, palette.length) : 0);
  gl.uniform1f(p.u.uSmooth, smooth ? 1 : 0); gl.uniform1f(p.u.uS, scroll); gl.uniform1f(p.u.uK, poke); gl.uniform2f(p.u.uO, orbit[0], orbit[1]);
  gl.uniform1f(p.u.uPost, 0); gl.uniform2f(p.u.uJit, 0, 0); gl.uniform1f(p.u.uSub, 1);
  if (palette) { uploadPalette(palette); gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, palTex); gl.uniform1i(p.u.uPal, 0); }
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  ctx.imageSmoothingEnabled = smooth; ctx.imageSmoothingQuality = 'high';
  ctx.clearRect(0, 0, tw, th);
  ctx.drawImage(cv, 0, cv.height - h, w, h, 0, 0, tw, th);
  return true;
}

/* ---------- looks: soft, paper, crayon ----------
 * the scene paints full colour into one shared texture, a couple of samples per scene pixel (sky or ground in
 * alpha), then the look's pass finishes it at screen resolution: smoothed and glowing, cut from card, or
 * coloured in with crayon. */
const lookProgs = {};
let lookFB = null;
function lookProgram(look) {
  if (look in lookProgs) return lookProgs[look];
  return (lookProgs[look] = aux(LOOK_SHADERS[look], ['uTex', 'uTexRes', 'uSrc', 'uOut', 'uFade', 'uSky', 'uT', 'uDpr', 'uSub']));
}
function drawLook(p, look, o, ctx, tw, th) {
  const lp = lookProgram(look);
  if (!lp) return false;
  const k = LOOK_SUB[look] || 1, sw = Math.max(1, Math.round(o.w * k)), sh = Math.max(1, Math.round(o.h * k));
  /* one texture for every scene on the page; it only ever grows */
  if (!lookFB || lookFB.w < sw || lookFB.h < sh) {
    if (lookFB) { gl.deleteTexture(lookFB.tex); gl.deleteFramebuffer(lookFB.fb); }
    const W = Math.max(sw, lookFB ? lookFB.w : 0), H = Math.max(sh, lookFB ? lookFB.h : 0);
    lookFB = { ...target(W, H, true), w: W, h: H };
  }
  /* 1. the scene, in full colour */
  gl.bindFramebuffer(gl.FRAMEBUFFER, lookFB.fb); gl.viewport(0, 0, sw, sh);
  gl.useProgram(p);
  gl.bindBuffer(gl.ARRAY_BUFFER, quad); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  gl.uniform2f(p.u.uRes, sw / k, sh / k); gl.uniform1f(p.u.uT, o.t); gl.uniform2f(p.u.uM, o.mx, o.my);
  gl.uniform1f(p.u.uLevels, 6); gl.uniform1f(p.u.uDither, 0); gl.uniform1f(p.u.uSky, 1); gl.uniform2f(p.u.uFade, 0, 0); gl.uniform1f(p.u.uPalN, 0);
  gl.uniform1f(p.u.uSmooth, 0); gl.uniform1f(p.u.uS, 0); gl.uniform1f(p.u.uK, 0); gl.uniform2f(p.u.uO, 0, 0);
  gl.uniform1f(p.u.uPost, 2); gl.uniform2f(p.u.uJit, 0, 0); gl.uniform1f(p.u.uSub, k);
  /* the scene's sampler must not see the texture it is painting into */
  gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, palTex);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  /* 2. the look, at screen resolution */
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  if (cv.width < tw || cv.height < th) { cv.width = Math.max(cv.width, tw); cv.height = Math.max(cv.height, th); }
  gl.viewport(0, 0, tw, th);
  gl.useProgram(lp);
  gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, lookFB.tex); gl.uniform1i(lp.u.uTex, 0);
  gl.uniform2f(lp.u.uTexRes, lookFB.w, lookFB.h); gl.uniform2f(lp.u.uSrc, sw, sh); gl.uniform2f(lp.u.uOut, tw, th);
  gl.uniform2f(lp.u.uFade, o.fade[0], o.fade[1]); gl.uniform1f(lp.u.uSky, o.sky ? 1 : 0); gl.uniform1f(lp.u.uT, o.t);
  gl.uniform1f(lp.u.uDpr, o.dpr); gl.uniform1f(lp.u.uSub, k);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  ctx.clearRect(0, 0, tw, th);
  ctx.drawImage(cv, 0, cv.height - th, tw, th, 0, 0, tw, th);
  return true;
}

/* ---------- the post pipeline, for smooth dioramas ----------
 * 1. the scene renders into a texture with a sub-pixel jitter (depth goes in alpha);
 * 2. it blends into a history texture, clamped to its neighbours so moving things don't ghost;
 *    over a few frames the edges come out clean;
 * 3. the history is drawn at full screen resolution with a tilt-shift focus blur, a glow on
 *    bright things, colour grading, a vignette and a little grain. */
const BLEND = `precision highp float;
uniform sampler2D uCur, uHist; uniform vec2 uRes; uniform float uAlpha;
void main() {
  vec2 px = 1. / uRes, uv = gl_FragCoord.xy * px;
  vec4 c = texture2D(uCur, uv), h = texture2D(uHist, uv);
  vec3 mn = c.rgb, mx = c.rgb;
  for (int i = 0; i < 4; i++) {
    vec2 o = i == 0 ? vec2(px.x, 0.) : i == 1 ? vec2(-px.x, 0.) : i == 2 ? vec2(0., px.y) : vec2(0., -px.y);
    vec3 s = texture2D(uCur, uv + o).rgb; mn = min(mn, s); mx = max(mx, s);
  }
  h.rgb = clamp(h.rgb, mn - .015, mx + .015);
  gl_FragColor = mix(h, c, uAlpha);
}`;
const POST = `precision highp float;
uniform sampler2D uTex; uniform vec2 uOut; uniform float uTilt, uBloom, uT, uGrain, uFocusY;
float hash(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
void main() {
  vec2 uv = gl_FragCoord.xy / uOut;
  float asp = uOut.x / uOut.y;
  vec4 c0 = texture2D(uTex, uv);
  float fd = texture2D(uTex, vec2(.5, uFocusY)).a;
  float coc = clamp(abs(c0.a - fd) * 4.5 + pow(max(abs(uv.y - uFocusY) - .14, 0.) * 2.4, 2.) * uTilt, 0., 1.);
  vec3 acc = c0.rgb, bl = vec3(0.); float ws = 1.;
  for (int i = 0; i < 16; i++) {
    float fi = float(i), r = sqrt((fi + .5) / 16.), a = fi * 2.39996;
    vec2 d = vec2(cos(a), sin(a)) * r * vec2(1. / asp, 1.);
    /* in focus, the blur would be under a pixel: skip those taps */
    if (coc > .02) {
      vec4 s = texture2D(uTex, uv + d * coc * .011);
      float w = .5 + .5 * smoothstep(0., .2, abs(s.a - fd) * 7. + coc);
      acc += s.rgb * w; ws += w;
    }
    bl += max(texture2D(uTex, uv + d * .045).rgb - .8, 0.);
  }
  vec3 col = acc / ws + bl / 16. * uBloom;
  float l = dot(col, vec3(.299, .587, .114));
  col = mix(vec3(l), col, 1.22);
  col = mix(col, col * col * (3. - 2. * col), .32);
  vec2 v = (uv - .5) * vec2(asp * .7, 1.);
  col *= 1. - dot(v, v) * .38;
  col += (hash(gl_FragCoord.xy + fract(uT) * 100.) - .5) * uGrain;
  gl_FragColor = vec4(clamp(col, 0., 1.), 1.);
}`;

let blendProg = null, postProg = null;
function aux(src, names) {
  const fs = compile(gl.FRAGMENT_SHADER, src), vs = compile(gl.VERTEX_SHADER, VERT);
  if (!fs || !vs) return null;
  const p = gl.createProgram(); gl.attachShader(p, vs); gl.attachShader(p, fs); gl.bindAttribLocation(p, 0, 'p'); gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) return null;
  p.u = Object.fromEntries(names.map(k => [k, gl.getUniformLocation(p, k)]));
  return p;
}
function target(w, h, linear) {
  const tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex);
  const f = linear ? gl.LINEAR : gl.NEAREST;
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, f); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, f);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  const fb = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
  return { tex, fb };
}
function release(st) { for (const k of ['cur', 'a', 'b']) if (st[k]) { gl.deleteTexture(st[k].tex); gl.deleteFramebuffer(st[k].fb); st[k] = null; } }
const halton = (i, b) => { let f = 1, r = 0; while (i > 0) { f /= b; r += f * (i % b); i = Math.floor(i / b); } return r; };

/* state is per element: its textures, its frame count; moving lowers how much history is kept */
export function drawPost(name, opts, ctx, tw, th, st) {
  const p = program(name);
  if (!p) return false;
  if (!blendProg) blendProg = aux(BLEND, ['uCur', 'uHist', 'uRes', 'uAlpha']);
  if (!postProg) postProg = aux(POST, ['uTex', 'uOut', 'uTilt', 'uBloom', 'uT', 'uGrain', 'uFocusY']);
  if (!blendProg || !postProg) return false;
  const { w, h } = opts;
  if (st.w !== w || st.h !== h) { release(st); st.cur = target(w, h, false); st.a = target(w, h, true); st.b = target(w, h, true); st.w = w; st.h = h; st.frame = 0; }
  st.frame = (st.frame || 0) + 1;
  /* 1. the scene, jittered */
  gl.bindFramebuffer(gl.FRAMEBUFFER, st.cur.fb); gl.viewport(0, 0, w, h);
  gl.useProgram(p);
  gl.bindBuffer(gl.ARRAY_BUFFER, quad); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  gl.uniform2f(p.u.uRes, w, h); gl.uniform1f(p.u.uT, opts.t); gl.uniform2f(p.u.uM, opts.mx, opts.my);
  gl.uniform1f(p.u.uLevels, 6); gl.uniform1f(p.u.uDither, 1); gl.uniform1f(p.u.uSky, 1); gl.uniform2f(p.u.uFade, 0, 0); gl.uniform1f(p.u.uPalN, 0);
  gl.uniform1f(p.u.uSmooth, 1); gl.uniform1f(p.u.uS, opts.scroll || 0); gl.uniform1f(p.u.uK, opts.poke || 0); gl.uniform2f(p.u.uO, opts.orbit[0], opts.orbit[1]);
  gl.uniform1f(p.u.uPost, 1); gl.uniform1f(p.u.uSub, 1); gl.uniform2f(p.u.uJit, halton(st.frame % 16 + 1, 2) - .5, halton(st.frame % 16 + 1, 3) - .5);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  /* 2. into the history */
  const prev = st.frame % 2 ? st.a : st.b, next = st.frame % 2 ? st.b : st.a;
  gl.bindFramebuffer(gl.FRAMEBUFFER, next.fb); gl.viewport(0, 0, w, h);
  gl.useProgram(blendProg);
  gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, st.cur.tex); gl.uniform1i(blendProg.u.uCur, 0);
  gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, prev.tex); gl.uniform1i(blendProg.u.uHist, 1);
  gl.uniform2f(blendProg.u.uRes, w, h); gl.uniform1f(blendProg.u.uAlpha, st.frame < 2 ? 1 : opts.moving ? .5 : .14);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  /* 3. out to the screen, finished */
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  if (cv.width < tw || cv.height < th) { cv.width = Math.max(cv.width, tw); cv.height = Math.max(cv.height, th); }
  gl.viewport(0, 0, tw, th);
  gl.useProgram(postProg);
  gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, next.tex); gl.uniform1i(postProg.u.uTex, 0);
  gl.uniform2f(postProg.u.uOut, tw, th); gl.uniform1f(postProg.u.uTilt, opts.tilt ?? 1); gl.uniform1f(postProg.u.uBloom, opts.bloom ?? 1.4);
  gl.uniform1f(postProg.u.uT, opts.t); gl.uniform1f(postProg.u.uGrain, .025); gl.uniform1f(postProg.u.uFocusY, opts.focusY ?? .42);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  gl.activeTexture(gl.TEXTURE0);
  ctx.clearRect(0, 0, tw, th);
  ctx.drawImage(cv, 0, cv.height - th, tw, th, 0, 0, tw, th);
  return true;
}
export function freePost(st) { if (gl && st) release(st); }
