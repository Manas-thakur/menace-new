/* The scenes, as shaders. Each scene paints a full-colour picture in scene(uv) and returns
 * vec4(colour, isSky); the pixel-art pass (levels, dither, palette, fade) happens afterwards.
 * uv is 0..1 with y up; q = (uv.x * A, uv.y) keeps shapes round at any aspect ratio.
 * F is the pixel, T the time in seconds, M the pointer (-2..2, used for parallax and wind). */

import { SHADERS as NATURE } from './shaders-nature.js';
const DREAMY = {}; // trimmed for this site: category not used
const PLACES = {}; // trimmed for this site: category not used
const OCEAN = {}; // trimmed for this site: category not used
const COSMOS = {}; // trimmed for this site: category not used
const COZY = {}; // trimmed for this site: category not used
const SWEETS = {}; // trimmed for this site: category not used
const ARTSY = {}; // trimmed for this site: category not used

export const HEADER = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform vec2 uRes; uniform float uT; uniform vec2 uM;
uniform float uLevels, uDither, uSky, uPalN; uniform vec2 uFade; uniform sampler2D uPal;
uniform float uSmooth, uS, uK; uniform vec2 uO;
uniform float uPost, uSub; uniform vec2 uJit;
float gT;
vec2 F; float A; float T; vec2 M;
#define C(r, g, b) (vec3(r, g, b) / 255.)
float sat(float x) { return clamp(x, 0., 1.); }
float hash(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float h1(float n) { return hash(vec2(n, n * 1.618 + 3.1)); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
  return mix(mix(hash(i), hash(i + vec2(1., 0.)), f.x), mix(hash(i + vec2(0., 1.)), hash(i + vec2(1., 1.)), f.x), f.y);
}
float fbm(vec2 p) { float v = 0., a = .5; for (int i = 0; i < 5; i++) { v += a * noise(p); p = mat2(1.6, 1.2, -1.2, 1.6) * p; a *= .5; } return v; }
float fbm3(vec2 p) { float v = 0., a = .5; for (int i = 0; i < 3; i++) { v += a * noise(p); p = mat2(1.6, 1.2, -1.2, 1.6) * p; a *= .5; } return v / .875; }
float bayer2(vec2 a) { a = floor(a); return fract(dot(a, vec2(.5, a.y * .75))); }
float bayer4(vec2 a) { return bayer2(.5 * a) * .25 + bayer2(a); }
/* one pixel, in scene units (y) */
float PX() { return 1. / uRes.y; }
/* a pixel-sized particle at position p (in uv), with its own colour */
bool dot1(vec2 p) { vec2 d = floor(F) - floor(p * uRes); return d.x == 0. && d.y == 0.; }
/* twinkling single-pixel stars, plus a few bigger ones with arms */
vec3 stars(vec3 col, float dens, vec3 c) {
  float h = hash(floor(F));
  if (h > 1. - dens) col = mix(col, c, .35 + .65 * (.5 + .5 * sin(T * (1. + h * 4.) + h * 90.)));
  vec2 cell = floor(F / 13.), o = floor(vec2(hash(cell + 1.), hash(cell + 2.)) * 9.) + 2.;
  vec2 d = abs(F - (cell * 13. + o) - .5);
  float tw = .5 + .5 * sin(T * 1.7 + hash(cell) * 40.);
  if (hash(cell + 9.) < .22) {
    if (d.x + d.y < .6) col = mix(col, c, .7 + .3 * tw);
    else if ((d.x < .6 && d.y < 1.6) || (d.y < .6 && d.x < 1.6)) col = mix(col, c, .55 * tw);
  }
  return col;
}
/* a band of fluffy clouds: lit from above, shaded underneath, brighter at the rims */
vec3 clouds(vec3 col, vec2 q, float sc, float yc, float spread, float th, float spd, vec3 lit, vec3 sh, float seed) {
  vec2 p = vec2(q.x * sc + T * spd + M.x * .01 + seed, q.y * sc * 1.5);
  float band = exp(-pow((q.y - yc) / spread, 2.));
  float n = (fbm(p) + .18 * (noise(p * 3.1) - .5)) * band;
  float m = smoothstep(th, th + .03, n);
  if (m <= 0.) return col;
  float dy = .5 / (sc * 1.5);
  float up = fbm(p + vec2(-.12, .5)) * exp(-pow((q.y + dy - yc) / spread, 2.));
  float s = sat(.62 + (n - up) * 7.) * sat(.5 + (q.y - yc) / spread * .7);
  float rim = smoothstep(th + .06, th + .005, n);
  return mix(col, mix(sh, lit, sat(s + rim * .35)), m);
}
/* pixel-art cumulus: clusters of round puffs with flat bottoms, lit from the top left in three tones */
vec3 puffs(vec3 col, vec2 q, float yc, float size, float spd, float seed, vec3 lit, vec3 mid, vec3 sh) {
  float x = q.x + T * spd + M.x * .01 * (1. + size * 4.) + seed;
  float cw = size * 1.25, best = -1.;
  vec2 nrm = vec2(0., 1.);
  for (int j = -3; j <= 3; j++) {
    float cell = floor(x / cw) + float(j);
    float cluster = hash(vec2(floor(cell / 4.), seed + 7.));
    if (cluster < .48) continue;
    float r = size * (.55 + .65 * hash(vec2(cell, seed + 1.))) * (1. - abs(fract(cell / 4.) - .4) * .7);
    float cy = yc + (hash(vec2(floor(cell / 4.), seed + 5.)) - .5) * size * 1.6;
    vec2 c = vec2((cell + .5) * cw + (hash(vec2(cell, seed + 2.)) - .5) * cw * .4, cy + r * .3);
    vec2 d = vec2(x, q.y) - c;
    float k = 1. - length(d * vec2(1., 1.08)) / r;
    if (q.y < cy - size * .12) k = -1.;
    if (k > best) { best = k; nrm = d / r; }
  }
  if (best < 0.) return col;
  float l = dot(normalize(nrm + vec2(0., .001)), normalize(vec2(-.45, .9)));
  float bottom = 0.;
  vec3 c = l > .35 ? lit : l > -.25 ? mid : sh;
  if (nrm.y < -.15 && l < .6) c = sh;
  if (best < .08 && l > .2) c = lit;
  return c;
}
/* a row of pine trees; k tells where in a tier the pixel is (for snow) */
float pines(vec2 q, float spacing, float base, float hmin, float hmax, float seed, out float k) {
  float c = floor(q.x / spacing), m = 0.; k = 0.;
  for (int i = -1; i <= 1; i++) {
    float ci = c + float(i), r = hash(vec2(ci, seed));
    float x0 = (ci + .5 + (r - .5) * .7) * spacing, h = mix(hmin, hmax, hash(vec2(ci, seed + 1.))), w = h * .3;
    vec2 d = vec2(q.x - x0, q.y - base);
    if (d.y > -.02 && d.y < h) {
      float y = d.y / h, tier = fract(y * 3.5 + .2);
      float wid = w * (1. - y) * (.62 + .38 * (1. - tier));
      if (abs(d.x) < wid) { m = 1.; k = tier; }
      if (y < .12 && abs(d.x) < w * .09) m = max(m, 1.);
    }
  }
  return m;
}
/* rolling 1D height, for hills */
float ridge(float x, float seed) { return fbm(vec2(x, seed)); }
`;

export const SHADERS = {
  /* ---------- Sunny meadow ---------- */
  meadow: `
vec4 scene(vec2 uv) {
  vec2 q = vec2(uv.x * A, uv.y);
  float sky = 1.;
  vec3 hor = C(186, 228, 255);
  vec3 col = mix(hor, C(62, 128, 224), pow(sat((uv.y - .3) / .7), .85));
  vec2 sp = vec2(A * .8 - M.x * .004, .8); float sd = length(q - sp);
  col += C(255, 214, 150) * .5 * exp(-sd * 6.);
  col = mix(col, C(255, 250, 226), smoothstep(.066, .058, sd));
  col = puffs(col, q, .74, .1, .02, 0., C(255, 255, 255), C(226, 236, 252), C(170, 192, 232));
  col = puffs(col, q, .58, .055, .012, 9., C(246, 250, 255), C(216, 228, 248), C(160, 184, 226));
  float mx = q.x + M.x * .003;
  float m1 = .43 + .22 * ridge(mx * 1.3, 3.1) - .04;
  if (uv.y < m1) {
    sky = 0.;
    float r = fbm(vec2(mx * 7., uv.y * 9.));
    vec3 mc = mix(C(104, 134, 204), C(146, 172, 226), r + (q.x - floor(q.x * 3.) / 3.) * .0);
    if (uv.y > m1 - .03 - .02 * fbm(vec2(mx * 20., 1.)) && m1 > .52) mc = C(240, 246, 255);
    col = mix(mc, hor, .28);
  }
  float hx = q.x + M.x * .006;
  float h1 = .37 + .05 * sin(hx * 2.2 + 1.) + .02 * ridge(hx * 4., 1.);
  float tr = fbm(vec2(hx * 10., 4.));
  float h1t = h1 + .045 * smoothstep(.42, .66, tr);
  if (uv.y < h1t) {
    sky = 0.;
    vec3 g;
    if (uv.y > h1) g = mix(C(40, 98, 64), C(92, 156, 84), sat((uv.y - h1) / .045 * .6 + fbm(q * vec2(30., 40.)) * .7));
    else g = mix(C(96, 168, 82), C(138, 200, 100), fbm(q * vec2(8., 24.)));
    col = mix(g, hor, .18);
  }
  float nx = q.x + M.x * .012;
  float h2 = .26 + .055 * sin(nx * 1.7 + 3.) + .015 * ridge(nx * 6., 2.);
  if (uv.y < h2) {
    sky = 0.;
    float k = sat((h2 - uv.y) / .26);
    vec3 g = mix(C(134, 208, 98), C(48, 124, 56), k);
    float wind = fbm(vec2(q.x * 2.4 - T * .45 - M.x * .03, uv.y * 16.));
    g = mix(g, C(190, 234, 132), smoothstep(.56, .7, wind) * .8);
    g *= .9 + .2 * noise(F * vec2(.5, 1.4));
    vec2 fc = floor(F / vec2(3., 2.));
    float fh = hash(fc + 11.);
    if (fh > .955 && mod(F.x, 3.) < 1. && mod(F.y, 2.) < 1.) {
      float pc = hash(fc + 2.);
      g = pc < .3 ? C(255, 140, 170) : pc < .55 ? C(255, 214, 90) : pc < .8 ? C(255, 255, 255) : C(196, 160, 255);
    }
    col = g;
  }
  /* an old oak on the hill */
  float tbx = A * .82 + M.x * .012, tby = .26 + .055 * sin(tbx * 1.7 + 3.) + .015 * ridge(tbx * 6., 2.) - .015;
  vec2 cc = vec2(tbx, tby + .34);
  float trunkW = .014 + .025 * sat(1. - (q.y - tby) / .1);
  if (q.y > tby - .01 && q.y < cc.y && abs(q.x - tbx - .008 * sin(q.y * 25.)) < trunkW) { sky = 0.; col = q.x > tbx ? C(86, 58, 44) : C(130, 92, 64); }
  float n = fbm(q * 7. + 3.);
  float d = length((q - cc) * vec2(.85, 1.15)) - .19 * (.72 + .5 * n);
  if (d < 0.) {
    sky = 0.;
    vec2 nn = normalize(q - cc + 1e-4);
    float l = .5 + .45 * dot(nn, normalize(vec2(.5, .85))) + (n - .5) * 1.1 + (fbm(q * 26.) - .5) * .4;
    vec3 cl = mix(C(30, 82, 48), C(76, 148, 68), smoothstep(.1, .55, l));
    col = mix(cl, C(156, 210, 98), smoothstep(.72, 1., l));
  }
  /* butterflies */
  for (int i = 0; i < 3; i++) {
    float fi = float(i);
    vec2 bp = vec2(fract(.15 + fi * .33 + T * .012 * (1. + fi * .4)), .18 + .07 * fi + .025 * sin(T * 1.4 + fi * 2.));
    vec2 d2 = floor(F) - floor(bp * uRes);
    float fl = step(0., sin(T * 14. + fi * 3.));
    if (abs(d2.x) == 1. && d2.y == fl) col = fi == 1. ? C(255, 214, 90) : C(255, 120, 160);
    if (d2.x == 0. && d2.y == 0.) col = C(60, 40, 50);
  }
  return vec4(col, sky);
}`,

  /* ---------- Blossom hill ---------- */
  blossom: `
vec4 scene(vec2 uv) {
  vec2 q = vec2(uv.x * A, uv.y);
  float sky = 1.;
  vec3 hor = C(255, 226, 234);
  vec3 col = mix(hor, C(206, 164, 222), sat((uv.y - .35) / .65));
  col = clouds(col, q, 1.7, .8, .08, .54, .02, C(255, 244, 248), C(230, 186, 214), 2.);
  float mx = q.x + M.x * .003;
  float m = .52 + .13 * ridge(mx * 1.6, 7.);
  if (uv.y < m) { sky = 0.; col = mix(mix(C(196, 160, 210), C(220, 186, 226), fbm(q * 8.)), hor, .5); }
  /* two rows of round trees, fading into the mist */
  for (int i = 0; i < 2; i++) {
    float fi = float(i), sc = 7. - fi * 2.2, x = q.x * sc + M.x * .015 * (fi + 1.) + fi * 3.7;
    float best = 0., pinkTree = 0.;
    for (int j = -1; j <= 1; j++) {
      float cell = floor(x) + float(j), r = .45 + .25 * hash(vec2(cell, fi + 8.)), cx = cell + .5 + (hash(vec2(cell, fi + 2.)) - .5) * .4;
      float dx = (x - cx) / r, top = .4 - fi * .1 + .05 * hash(vec2(cell, fi)) + sqrt(max(0., 1. - dx * dx)) * r / sc * 1.6;
      if (uv.y < top && top > best) { best = top; pinkTree = step(.45, hash(vec2(cell, fi + 4.))); }
    }
    if (uv.y < best) {
      sky = 0.;
      vec3 tc = mix(C(108, 168, 130), C(242, 162, 198), pinkTree) * (.86 + .26 * fbm(q * vec2(26., 30.) + fi));
      col = mix(tc, hor, .55 - fi * .28);
    }
  }
  col = mix(col, C(255, 236, 244), .3 * smoothstep(.18, .3, uv.y) * smoothstep(.46, .3, uv.y));
  float gx = q.x + M.x * .012;
  float g = .22 + .035 * sin(gx * 2. + 1.);
  if (uv.y < g) {
    sky = 0.;
    float k = sat((g - uv.y) / .22);
    vec3 gc = mix(C(150, 208, 124), C(82, 150, 92), k) * (.9 + .2 * noise(F * vec2(.6, 1.2)));
    float pc = A * .58 + sin(uv.y * 10.) * .05, pw = .015 + (g - uv.y) * .55;
    if (abs(q.x - pc) < pw) gc = mix(C(238, 216, 192), C(212, 184, 158), noise(F * .4));
    if (hash(floor(F / 2.) + 3.) > .93) gc = C(255, 184, 208);
    col = gc;
  }
  /* the cherry tree */
  vec2 tb = vec2(A * .3 + M.x * .01, .19);
  float ty = q.y - tb.y, tx = tb.x + .025 * sin(ty * 9.) - ty * .06;
  if (ty > -.02 && ty < .34 && abs(q.x - tx) < .02 + .014 * (1. - ty / .34)) { sky = 0.; col = q.x > tx ? C(76, 40, 58) : C(120, 72, 86); }
  float br = abs(q.y - (tb.y + .25 + (q.x - tb.x) * .45));
  if (q.x > tb.x && q.x < tb.x + .18 && br < .01) { sky = 0.; col = C(92, 52, 68); }
  vec2 cc = tb + vec2(.02, .42);
  float n = fbm(q * 6. + 1.7);
  float d = length((q - cc) * vec2(.8, 1.15)) - .24 * (.72 + .55 * n);
  if (d < 0.) {
    sky = 0.;
    vec2 nn = normalize(q - cc + 1e-4);
    float l = .5 + .45 * dot(nn, normalize(vec2(.5, .8))) + (n - .5) * .9 + (fbm(q * 30.) - .5) * .5;
    vec3 cl = mix(C(198, 92, 140), C(250, 150, 190), smoothstep(.15, .55, l));
    col = mix(cl, C(255, 214, 230), smoothstep(.72, 1., l));
  }
  /* a stone lantern */
  vec2 lb = vec2(A * .78 + M.x * .012, .16);
  vec2 lp = q - lb;
  float flick = .8 + .2 * sin(T * 7.) * sin(T * 3.1);
  col += C(255, 200, 120) * .35 * flick * exp(-length(lp - vec2(0., .1)) * 14.);
  if (abs(lp.x) < .012 && lp.y > 0. && lp.y < .07) { sky = 0.; col = C(150, 140, 150); }
  if (abs(lp.x) < .03 && lp.y > .07 && lp.y < .085) { sky = 0.; col = C(170, 160, 168); }
  if (abs(lp.x) < .02 && lp.y > .085 && lp.y < .12) { sky = 0.; col = abs(lp.x) < .011 && lp.y < .112 ? mix(C(255, 180, 90), C(255, 236, 170), flick) : C(150, 140, 150); }
  if (abs(lp.x) < .038 - (lp.y - .12) * .5 && lp.y > .12 && lp.y < .15) { sky = 0.; col = C(120, 110, 124); }
  /* falling petals, leaning into the wind */
  for (int i = 0; i < 28; i++) {
    float fi = float(i), sp = .025 + .035 * h1(fi * 7.7);
    float py = 1.04 - fract(T * sp + h1(fi * 1.3)), px = fract(h1(fi * 3.1) + .03 * sin(T * 1.5 + fi) - T * (.012 + M.x * .02) * (1. - py));
    if (dot1(vec2(px, py))) col = h1(fi) > .5 ? C(255, 170, 202) : C(255, 236, 244);
  }
  return vec4(col, sky);
}`,

  /* ---------- Starry night ---------- */
  starry: `
float hillN(float x) { return .24 + .05 * sin(x * 1.4 + 2.) + .015 * ridge(x * 5., 6.); }
vec4 scene(vec2 uv) {
  vec2 q = vec2(uv.x * A, uv.y);
  float sky = 1.;
  vec3 col = mix(C(70, 50, 118), C(10, 14, 42), pow(sat(uv.y), .7));
  vec2 r = vec2(q.x * .8 + q.y * .6, q.y * .8 - q.x * .5);
  float band = exp(-pow((r.y - .2) * 3.6, 2.));
  float mw = fbm(r * vec2(3., 6.) + 3.) * band;
  col += C(76, 70, 150) * mw * .9 + C(160, 150, 230) * smoothstep(.42, .66, mw) * .35;
  col = stars(col, .012 + band * .03, C(255, 255, 255));
  vec2 mc = vec2(A * .78 - M.x * .003, .76); float md = length(q - mc);
  col += C(110, 110, 200) * .55 * exp(-md * 5.);
  if (md < .085) col = mix(C(255, 246, 206), C(222, 206, 164), smoothstep(.48, .62, fbm((q - mc) * 26.)));
  float ph = fract(T * .06);
  if (ph < .1) {
    vec2 dir = normalize(vec2(1., -.4)), head = vec2(A * .15, .92) + dir * ph * 6.;
    vec2 rel = q - head; float along = dot(rel, -dir), off = abs(dot(rel, vec2(-dir.y, dir.x)));
    if (along > 0. && along < .14 && off < PX()) col = mix(col, C(255, 255, 230), 1. - along / .14);
  }
  float fx = q.x + M.x * .005;
  float h1v = .4 + .07 * sin(fx * 2.) + .05 * ridge(fx * 3., 1.);
  if (uv.y < h1v) { sky = 0.; col = uv.y > h1v - 2. * PX() ? C(110, 112, 190) : mix(C(48, 52, 112), C(34, 38, 86), fbm(q * 10.)); }
  float nx = q.x + M.x * .012;
  float h2 = hillN(nx);
  float blade = step(.55, hash(vec2(floor(F.x), 7.))) * 2. * PX() * (.5 + hash(vec2(floor(F.x), 9.)));
  if (uv.y < h2 + blade) { sky = 0.; col = mix(C(30, 34, 76), C(14, 16, 40), sat((h2 - uv.y) / .2)) * (.9 + .2 * noise(F * vec2(.5, 1.4))); }
  /* a lone tree, its edge silvered by the moon */
  float tbx = A * .2 + M.x * .012, tby = hillN(tbx) - .01;
  vec2 cc = vec2(tbx, tby + .26);
  if (abs(q.x - tbx - .006 * sin(q.y * 30.)) < .012 + .01 * sat(1. - (q.y - tby) / .08) && q.y > tby - .01 && q.y < cc.y) { sky = 0.; col = C(18, 18, 40); }
  float nn = fbm(q * 11. + 2.);
  float d = length((q - cc) * vec2(.95, 1.2)) - .14 * (.75 + .45 * nn);
  if (d < 0.) {
    sky = 0.;
    vec2 dir = normalize(q - cc + 1e-4);
    float lit = dot(dir, normalize(mc - cc));
    col = lit > .35 && d > -.02 ? C(84, 92, 168) : lit > .1 && d > -.012 ? C(46, 52, 112) : C(18, 20, 46);
  }
  /* a cabin with a warm window and smoke */
  float cbx = A * .64 + M.x * .012, cby = hillN(cbx) - .015;
  vec2 cp = q - vec2(cbx, cby);
  if (abs(cp.x) < .085 && cp.y > 0. && cp.y < .1) { sky = 0.; col = cp.x > .05 ? C(40, 30, 48) : C(58, 42, 60); if (mod(floor(cp.y * uRes.y / 3.), 2.) == 0.) col *= .9; }
  if (cp.y >= .1 && cp.y < .17 && abs(cp.x) < .11 - (cp.y - .1) * 1.4) { sky = 0.; col = cp.x > 0. ? C(26, 22, 42) : C(40, 32, 58); }
  if (abs(cp.x - .055) < .012 && cp.y > .12 && cp.y < .2) { sky = 0.; col = C(36, 28, 50); }
  if (abs(cp.x + .01) < .014 && cp.y < .06 && cp.y > 0.) col = C(30, 22, 34);
  col += C(255, 186, 96) * .55 * exp(-length((cp - vec2(-.05, .05)) * vec2(1., 1.4)) * 18.);
  if (abs(cp.x + .05) < .02 && abs(cp.y - .052) < .018) col = abs(cp.x + .05) < .003 || abs(cp.y - .052) < .003 ? C(120, 70, 50) : C(255, 214, 120);
  for (int s = 0; s < 5; s++) {
    float fs = float(s), kk = fract(T * .1 + fs / 5.);
    vec2 sp = vec2(cbx + .055 + sin(kk * 5. + fs) * .02 + kk * .05, cby + .21 + kk * .2);
    col = mix(col, C(110, 104, 160), smoothstep(.02 * (.6 + kk), 0., length(q - sp)) * (1. - kk) * .55);
  }
  /* fireflies */
  for (int i = 0; i < 14; i++) {
    float fi = float(i);
    vec2 fp = vec2(fract(h1(fi) + .03 * sin(T * .4 + fi)), .06 + .24 * h1(fi + 9.) + .02 * sin(T * .7 + fi * 2.));
    float on = step(.15, sin(T * 2.2 * (.6 + h1(fi + 3.)) + fi));
    vec2 dd = (F - floor(fp * uRes)) / uRes.y;
    col += C(255, 236, 110) * on * .7 * exp(-length(dd) * 110.);
    if (on > 0. && dot1(fp)) col = C(255, 252, 190);
  }
  return vec4(col, sky);
}`,

  /* ---------- Sunset lake ---------- */
  sunset: `
vec3 dusk(float y) {
  vec3 c = mix(C(255, 214, 140), C(255, 148, 102), smoothstep(.0, .12, y));
  c = mix(c, C(214, 84, 124), smoothstep(.12, .4, y));
  return mix(c, C(46, 32, 92), smoothstep(.4, 1., y));
}
float mtns(float x, float hz) { return hz + .1 * ridge(x * 1.6, 5.) + .03; }
vec4 scene(vec2 uv) {
  vec2 q = vec2(uv.x * A, uv.y);
  float hz = .4, sky = 1.;
  vec2 sc = vec2(A * .5 - M.x * .003, hz + .05);
  vec3 col;
  if (uv.y >= hz) {
    float y = (uv.y - hz) / (1. - hz);
    col = dusk(y);
    float sd = length(q - sc);
    col += C(255, 170, 110) * .45 * exp(-sd * 4.5);
    if (sd < .12 && !(q.y < sc.y && mod(floor((sc.y - q.y) * uRes.y / 3.), 2.) == 1. && sc.y - q.y > .02)) col = mix(C(255, 236, 160), C(255, 160, 96), sat((sc.y + .12 - q.y) / .24));
    vec2 p = vec2(q.x * 1.1 + T * .01 + M.x * .01, q.y * 7.);
    float n = fbm(p) * smoothstep(.55, .9, uv.y) * smoothstep(1.05, .8, uv.y) * 1.3;
    float cm = smoothstep(.5, .56, n);
    vec3 cl = mix(C(255, 176, 150), C(150, 70, 132), smoothstep(.35, .9, y));
    col = mix(col, cl * (.85 + .3 * (fbm(p * 2.) - .4)), cm);
    float mx = q.x + M.x * .004;
    if (uv.y < mtns(mx, hz)) { sky = 0.; col = mix(C(140, 64, 112), dusk(.05), .35); }
    float mx2 = q.x + M.x * .008;
    if (uv.y < hz + .045 * ridge(mx2 * 3., 9.)) { sky = 0.; col = C(84, 38, 92); }
  } else {
    /* the lake reflects the sky, rippling */
    sky = 0.;
    float depth = (hz - uv.y) / hz;
    float rx = q.x + .006 * sin(uv.y * 160. + T * 2.) * (.3 + depth);
    float ry = hz + (hz - uv.y) * 1.6;
    col = dusk((ry - hz) / (1. - hz)) * .72;
    if (ry < mtns(rx + M.x * .004, hz) + .0) col = mix(col, C(84, 38, 92), .7);
    float glint = noise(vec2(q.x * 40., uv.y * 140. - T * 1.4));
    float sw = .1 * (1. - depth * .4);
    if (abs(q.x - sc.x) < sw && glint > .62 - depth * .1) col = mix(C(255, 224, 150), C(255, 160, 110), depth);
    col = mix(col, C(40, 22, 70), depth * .55);
    float bx = fract(.2 + T * .008) * (A + .5) - .25, by = hz - .12 + .004 * sin(T * 1.5);
    vec2 bp = q - vec2(bx, by);
    if (bp.y > -.02 && bp.y < 0. && abs(bp.x) < .085 + bp.y * 2.) col = C(30, 16, 40);
    if (abs(bp.x - .01) < .004 && bp.y >= 0. && bp.y < .11) col = C(30, 16, 40);
    if (bp.y >= .015 && bp.y < .1 && bp.x > .018 && bp.x < .018 + (.1 - bp.y) * .75) col = mix(C(255, 214, 180), C(240, 150, 130), sat((bp.x - .018) / .06));
    if (bp.y < -.02 && bp.y > -.05 && abs(bp.x) < .07 && mod(floor(bp.y * uRes.y), 2.) == 0. && hash(floor(F)) > .4) col = mix(col, C(30, 16, 40), .5);
  }
  /* reeds and a pine on the near shore */
  float k;
  if (q.x < .42 && pines(q + vec2(M.x * .02, 0.), .12, -.03, .24, .46, 2., k) > 0.) { sky = 0.; col = k > .7 ? C(44, 22, 52) : C(22, 12, 30); }
  float reed = step(.7, hash(vec2(floor(F.x), 3.))) * step(uv.y, .06 + .05 * hash(vec2(floor(F.x), 5.)) + .01 * sin(T * 2. + F.x));
  if (reed > 0. && q.x > A * .7) { sky = 0.; col = C(30, 16, 40); }
  for (int i = 0; i < 3; i++) {
    float fi = float(i);
    vec2 bp = vec2(fract(.3 + fi * .23 + T * .01), .7 + .06 * fi + .01 * sin(T + fi));
    vec2 d2 = floor(F) - floor(bp * uRes);
    float f = step(0., sin(T * 7. + fi * 2.));
    if ((abs(d2.x) == 1. && d2.y == f) || (abs(d2.x) == 2. && d2.y == f + 1.) || (d2.x == 0. && d2.y == 0.)) col = C(52, 26, 64);
  }
  return vec4(col, sky);
}`,

  /* ---------- Snowy village ---------- */
  snowy: `
vec4 scene(vec2 uv) {
  vec2 q = vec2(uv.x * A, uv.y);
  float sky = 1.;
  vec3 col = mix(C(240, 176, 200), C(110, 104, 190), smoothstep(.32, .64, uv.y));
  col = mix(col, C(30, 38, 96), smoothstep(.64, 1., uv.y));
  col = stars(col, .006 * smoothstep(.62, .9, uv.y), C(236, 240, 255));
  vec2 mc = vec2(A * .16 - M.x * .003, .84);
  col += C(170, 160, 240) * .35 * exp(-length(q - mc) * 7.);
  if (length(q - mc) < .05) col = C(252, 248, 230);
  float mx = q.x + M.x * .004;
  float h1v = .46 + .08 * ridge(mx * 2., 3.);
  if (uv.y < h1v) { sky = 0.; col = mix(C(176, 182, 236), C(214, 218, 250), smoothstep(.3, .7, fbm(q * vec2(4., 9.)))); }
  float k;
  if (pines(q + vec2(M.x * .005, 0.), .07, .4, .1, .17, 4., k) > 0.) { sky = 0.; col = k < .16 ? C(226, 232, 255) : C(86, 98, 168); }
  if (pines(q + vec2(M.x * .008, 0.), .11, .34, .16, .27, 5., k) > 0.) { sky = 0.; col = k < .16 ? C(240, 244, 255) : C(52, 64, 130); }
  float gy = .34 + .008 * sin(q.x * 5.);
  if (uv.y < gy) {
    sky = 0.;
    float sh = smoothstep(.35, .7, fbm(q * vec2(3., 8.) + 4.));
    col = mix(C(244, 248, 255), C(196, 206, 244), sh * .8 + sat((gy - uv.y) / gy) * .25);
    if (hash(floor(F)) > .992 && sin(T * 3. + hash(floor(F)) * 40.) > .7) col = C(255, 255, 255);
  }
  /* the houses: as many as fit */
  float n = clamp(floor(A * 1.3), 1., 4.);
  for (int i = 0; i < 4; i++) {
    float fi = float(i);
    if (fi >= n) break;
    float x0 = A * (fi + .5) / n + (h1(fi + 7.) - .5) * .08 + M.x * .01, w = .22 + .04 * h1(fi), h = .12 + .03 * h1(fi + 4.), base = .2 + .04 * h1(fi + 2.);
    vec2 hp = q - vec2(x0, base);
    float hue = h1(fi + 11.);
    vec3 wall = hue < .33 ? C(200, 96, 84) : hue < .66 ? C(112, 134, 200) : C(218, 160, 90);
    if (abs(hp.x - w * .3) < .016 && hp.y > h && hp.y < h + .1) { sky = 0.; col = wall * .75; if (hp.y > h + .085) col = C(244, 246, 255); }
    if (abs(hp.x) < w * .5 && hp.y > 0. && hp.y < h) {
      sky = 0.;
      col = hp.x > w * .32 ? wall * .74 : wall;
      if (mod(floor(hp.y * uRes.y / 3.), 2.) == 0.) col *= .92;
      float lit = .8 + .2 * sin(T * 2.5 + fi * 2.);
      vec2 wv = vec2(abs(abs(hp.x) - w * .24), abs(hp.y - h * .58));
      if (wv.x < .022 && wv.y < .026) col = wv.x < .003 || wv.y < .003 ? wall * .5 : mix(C(255, 180, 86), C(255, 230, 150), lit);
      if (abs(hp.x) < .02 && hp.y < h * .52) col = C(86, 52, 50);
    }
    float rh = .1, ry = hp.y - h;
    if (ry >= 0. && ry < rh && abs(hp.x) < w * .6 - ry * 1.05) { sky = 0.; col = ry > .045 || abs(hp.x) < w * .6 - ry * 1.05 - .014 ? C(248, 250, 255) : C(172, 184, 232); if (ry < .02 && abs(hp.x) > w * .6 - ry * 1.05 - .014) col = C(130, 140, 200); }
    col += C(255, 168, 80) * .3 * exp(-length((q - vec2(x0, base)) * vec2(1., 2.4)) * 7.) * step(uv.y, base + .005);
    for (int s = 0; s < 5; s++) {
      float fs = float(s), kk = fract(T * .12 + fs / 5. + fi * .3);
      vec2 sp = vec2(x0 + w * .3 + sin(kk * 6. + fi) * .02 + kk * (.06 + M.x * .03), base + h + .12 + kk * .24);
      col = mix(col, C(214, 214, 238), smoothstep(.026 * (.5 + kk), 0., length(q - sp)) * (1. - kk) * .7);
    }
  }
  /* snow, in three layers, leaning with the pointer */
  for (int l = 0; l < 3; l++) {
    float fl = float(l), sc = 64. - fl * 20.;
    vec2 p = vec2(uv.x * A + T * (.02 + M.x * .03) * (1. + fl), uv.y + T * (.05 + fl * .035)) * sc;
    vec2 cell = floor(p), f = fract(p);
    float h = hash(cell + fl * 17.);
    vec2 o = vec2(.5 + .35 * sin(T * 1.3 + h * 20.), h);
    if (h > .55 && length(f - o) < (.08 + fl * .05) * sc / 64.) col = C(255, 255, 255);
  }
  return vec4(col, sky);
}`,

  /* ---------- Campfire ---------- */
  campfire: `
vec4 scene(vec2 uv) {
  vec2 q = vec2(uv.x * A, uv.y);
  float sky = 1.;
  vec3 col = mix(C(44, 50, 106), C(10, 14, 38), smoothstep(.3, 1., uv.y));
  col = stars(col, .012, C(220, 226, 255));
  vec2 mc = vec2(A * .84 - M.x * .003, .84);
  col += C(120, 130, 210) * .3 * exp(-length(q - mc) * 7.);
  if (length(q - mc) < .055 && length(q - mc - vec2(.024, .014)) > .048) col = C(250, 240, 200);
  vec2 fb = vec2(A * .5 + M.x * .01, .15);
  float flick = .85 + .15 * sin(T * 11.) * sin(T * 4.3 + 1.);
  float k;
  if (pines(q + vec2(M.x * .003, 0.), .09, .36, .2, .34, 1., k) > 0.) { sky = 0.; col = k > .55 ? C(78, 96, 150) : C(52, 66, 116); }
  if (pines(q + vec2(M.x * .007, 0.), .13, .3, .3, .48, 2., k) > 0.) { sky = 0.; col = k > .6 ? C(40, 52, 96) : C(28, 36, 74); }
  if (uv.y < .31) {
    sky = 0.;
    vec3 g = mix(C(58, 58, 80), C(40, 40, 58), fbm(q * vec2(10., 26.)));
    float L = exp(-length((q - fb) * vec2(1., 2.2)) * 3.6) * flick;
    col = g + C(255, 130, 60) * L * .95;
  }
  /* big pines framing the clearing, their inner edges lit by the fire */
  vec2 fq = q - vec2(M.x * .016, 0.);
  float edge = min(q.x, A - q.x);
  if (edge < .3 && pines(fq, .17, .0, .62, .8, 3., k) > 0.) {
    sky = 0.;
    col = C(14, 16, 34);
    float toward = q.x < fb.x ? 1. : -1.;
    float L = exp(-abs(q.x - fb.x) * 2.2) * flick;
    if (fract((fq.x + .0) / .15) * toward > .0) col += C(110, 54, 26) * L * smoothstep(.1, .3, k);
  }
  /* the tent, lit on the fire side */
  vec2 tp = q - vec2(A * .76 + M.x * .014, .15);
  float tw = .2 - tp.y * .95;
  if (tp.y > 0. && tp.y < .21 && abs(tp.x) < tw) {
    sky = 0.;
    col = tp.x < 0. ? mix(C(200, 98, 60), C(246, 156, 84), flick) : C(124, 62, 52);
    if (abs(tp.x + .015) < (.09 - tp.y * .95) && tp.y < .09) col = C(40, 22, 30);
    if (abs(tp.x) < .006) col = C(90, 44, 40);
  }
  /* logs to sit on, and a ring of stones */
  for (int i = 0; i < 2; i++) {
    float s = float(i) * 2. - 1.;
    vec2 lp = q - fb - vec2(s * .26, -.04);
    if (abs(lp.x) < .09 && abs(lp.y) < .022) { sky = 0.; col = mix(C(84, 52, 38), C(176, 104, 62), sat(.4 - s * lp.x * 5.) * flick); if (abs(lp.x) > .08) col = C(200, 150, 100); }
  }
  for (int i = 0; i < 9; i++) {
    float a = float(i) / 9. * 6.283;
    vec2 sp = fb + vec2(cos(a) * .085, sin(a) * .028 - .005);
    if (length((q - sp) * vec2(1., 1.6)) < .016) { sky = 0.; col = mix(C(70, 66, 86), C(170, 110, 80), sat(.5 + sin(a) * -.6) * flick); }
  }
  for (int i = 0; i < 3; i++) {
    float a = float(i) * 2.1;
    vec2 lp = q - fb - vec2(0., .008);
    vec2 rot = vec2(lp.x * cos(a) - lp.y * sin(a), lp.x * sin(a) + lp.y * cos(a));
    if (abs(rot.x) < .06 && abs(rot.y) < .01) { sky = 0.; col = C(90, 50, 32); }
  }
  /* the fire */
  vec2 p = (q - fb - vec2(0., .01)) / vec2(.075, .24);
  p.x += (noise(vec2(p.y * 3. - T * 4., T * .5)) - .5) * .55 * sat(p.y);
  float f = sat(1. - (abs(p.x) * (1.4 + p.y * 1.3) + max(p.y, 0.) * .85)) * step(-.12, p.y);
  f *= .65 + .7 * noise(vec2(p.x * 4., p.y * 3. - T * 7.));
  f *= flick;
  if (f > .1) { sky = 0.; col = f > .75 ? C(255, 250, 210) : f > .5 ? C(255, 214, 84) : f > .3 ? C(255, 140, 44) : C(222, 64, 32); }
  col += C(255, 120, 40) * .3 * exp(-length((q - fb - vec2(0., .08)) * vec2(1., .8)) * 5.) * flick;
  for (int i = 0; i < 18; i++) {
    float fi = float(i), kk = fract(T * (.16 + .1 * h1(fi)) + h1(fi + 2.));
    vec2 ep = vec2(fb.x / A + (h1(fi + 5.) - .5) * .05 / A * 2. + .03 * sin(kk * 8. + fi) / A * 2. + M.x * .01 * kk, fb.y + .1 + kk * .55);
    if (kk > .04 && dot1(ep)) col = kk < .5 ? C(255, 204, 96) : C(255, 120, 60);
  }
  return vec4(col, sky);
}`,

  /* ---------- Rainy window ---------- */
  rainy: `
vec4 scene(vec2 uv) {
  vec2 q = vec2(uv.x * A, uv.y);
  float sky = 0.;
  vec3 col = mix(C(56, 38, 54), C(118, 78, 78), exp(-length(q - vec2(-.05, .6)) * 1.5));
  col *= .94 + .08 * step(.5, fract(q.x * 12.));
  float ww = A * .86, wx0 = A * .07, wy0 = .22, wh = .64;
  float panes = max(1., floor(ww / .75 + .5)), pw = ww / panes;
  vec2 wp = q - vec2(wx0, wy0);
  bool inWin = wp.x > 0. && wp.x < ww && wp.y > 0. && wp.y < wh;
  if (inWin) {
    sky = 1.;
    vec2 wq = wp / vec2(ww, wh);
    vec2 dc = floor(F / 5.), dfr = fract(F / 5.);
    float dh = hash(dc), slide = fract(T * .05 * (.5 + dh) + dh);
    bool drop = dh > .82 && length(dfr - vec2(.5, 1. - slide)) < .35;
    vec2 o = wq + (drop ? vec2(.02, .015) : vec2(0.));
    vec3 c = mix(C(34, 46, 92), C(14, 18, 44), o.y);
    for (int b = 0; b < 2; b++) {
      float fb = float(b), x = o.x * ww * (6. + fb * 5.) + fb * 3.3 + M.x * .02 * (fb + 1.);
      float hgt = .3 + .35 * hash(vec2(floor(x), fb)) - fb * .14;
      if (o.y < hgt) {
        c = mix(C(24, 28, 60), C(40, 44, 86), fb);
        vec2 g = vec2(x * 4., o.y * 34.);
        vec2 wn = fract(g);
        if (wn.x > .3 && wn.x < .7 && wn.y > .3 && wn.y < .7 && hash(floor(g)) > .55) c = mix(C(255, 196, 106), C(255, 236, 170), hash(floor(g) + 1.));
      }
    }
    for (int i = 0; i < 14; i++) {
      float fi = float(i);
      vec2 bp = vec2(h1(fi) + .01 * sin(T * .3 + fi), .08 + .45 * h1(fi + 4.));
      float r = .025 + .035 * h1(fi + 8.);
      float dd = length((o - bp) * vec2(ww / wh, 1.));
      vec3 bc = h1(fi + 2.) > .5 ? C(255, 170, 90) : h1(fi + 3.) > .5 ? C(255, 120, 150) : C(120, 190, 255);
      c += bc * smoothstep(r, r * .7, dd) * .35;
    }
    float rx = floor(F.x / 2.), rs = hash(vec2(rx, 1.));
    float ry = fract(F.y / uRes.y * 2. + T * (.8 + rs) + rs * 7.);
    if (rs > .65 && ry < .06) c = mix(c, C(170, 190, 240), .6);
    if (drop) c = mix(c, C(206, 220, 255), .3);
    col = c;
    if (abs(mod(wp.x, pw) - pw * .5) > pw * .5 - .012 || abs(wp.y - wh * .5) < .011) { sky = 0.; col = C(150, 98, 64); }
  }
  float fw = .03;
  if (!inWin && wp.x > -fw && wp.x < ww + fw && wp.y > -fw && wp.y < wh + fw) col = wp.x < 0. || wp.y > wh ? C(176, 116, 74) : C(124, 78, 52);
  /* fairy lights along the top */
  for (int i = 0; i < 18; i++) {
    float fi = float(i), t = (fi + .5) / 18.;
    if (t * ww > ww) break;
    vec2 bp = vec2(wx0 + t * ww, wy0 + wh - .03 - .045 * sin(fract(t * 3.) * 3.1416));
    float on = .6 + .4 * sin(T * 2. + fi * 1.7);
    vec3 bc = mod(fi, 3.) == 0. ? C(255, 214, 120) : mod(fi, 3.) == 1. ? C(255, 150, 170) : C(160, 210, 255);
    col += bc * on * .9 * exp(-length(q - bp) * 30.);
    if (length(q - bp) < .018) col = mix(bc, C(255, 255, 255), on * .5);
  }
  float wire = wy0 + wh - .03 - .045 * sin(fract((q.x - wx0) / ww * 3.) * 3.1416);
  if (q.x > wx0 && q.x < wx0 + ww && abs(q.y - wire) < .6 * PX()) col = C(60, 44, 46);
  /* the sill, a plant, a mug, and a sleeping cat */
  vec2 sp = q - vec2(wx0 - .07, wy0 - .07);
  if (sp.x > 0. && sp.x < ww + .14 && sp.y > 0. && sp.y < .055) col = sp.y > .035 ? C(206, 144, 94) : C(150, 100, 66);
  vec2 pp = q - vec2(wx0 + .14, wy0 - .015);
  if (abs(pp.x) < .06 - pp.y * .25 && pp.y > 0. && pp.y < .1) { col = pp.x > .02 ? C(170, 86, 58) : C(218, 116, 76); sky = 0.; }
  for (int i = 0; i < 8; i++) {
    float fi = float(i);
    vec2 lc = vec2(wx0 + .14 + (h1(fi) - .5) * .2, wy0 + .14 + .14 * h1(fi + 3.)) + vec2(.005 * sin(T + fi), 0.);
    if (length((q - lc) * vec2(1., 1.6)) < .045) { col = h1(fi + 5.) > .5 ? C(92, 176, 90) : C(54, 130, 72); sky = 0.; }
  }
  vec2 mp = q - vec2(wx0 + ww - .18, wy0 - .015);
  if (abs(mp.x) < .04 && mp.y > 0. && mp.y < .085) { col = mp.x > .016 ? C(200, 206, 222) : C(244, 246, 252); sky = 0.; }
  if (abs(mp.x - .052) < .014 && abs(mp.y - .045) < .022 && (abs(mp.x - .052) > .006 || abs(mp.y - .045) > .013)) col = C(200, 206, 222);
  for (int i = 0; i < 6; i++) {
    float fi = float(i), kk = fract(T * .25 + fi / 6.);
    vec2 st = vec2(wx0 + ww - .18 + .016 * sin(kk * 7. + fi), wy0 + .08 + kk * .2);
    col = mix(col, C(240, 230, 240), smoothstep(.013, .0, length(q - st)) * (1. - kk) * .8);
  }
  vec2 cp = q - vec2(wx0 + ww * .55, wy0 - .015);
  float breathe = .005 * sin(T * 1.5);
  float body = length((cp - vec2(0., .05)) * vec2(1., 1.7)) - (.12 + breathe);
  float head = length(cp - vec2(-.11, .065)) - .05;
  float ex = abs(cp.x + .11) - .025;
  float ears = step(abs(ex), .016) * step(cp.y, .15 - abs(ex) * 3.) * step(.1, cp.y);
  float tail = step(abs(length(cp - vec2(.1, .0)) - .07), .011) * step(cp.y, .03) * step(.0, cp.x - .1);
  if ((body < 0. || head < 0. || ears > 0. || tail > 0.) && cp.y > 0.) {
    sky = 0.;
    col = C(226, 146, 78);
    if (mod(floor((cp.x + cp.y * .4) * 40.), 3.) == 0. && body < 0.) col = C(196, 112, 56);
    if (body < 0. && cp.y > .08 && body > -.022) col = C(250, 190, 120);
    if (ears > 0. && abs(ex) < .007) col = C(255, 170, 170);
    if (cp.y < .02) col = C(176, 96, 52);
  }
  if (abs(abs(cp.x + .11) - .016) < .009 && abs(cp.y - .07) < .003) col = C(110, 60, 40);
  if (abs(cp.x + .11) < .004 && abs(cp.y - .058) < .003) col = C(255, 150, 150);
  return vec4(col, sky);
}`,

  /* ---------- Beach day ---------- */
  beach: `
vec4 scene(vec2 uv) {
  vec2 q = vec2(uv.x * A, uv.y);
  float hz = .5, sky = 1.;
  vec3 col = mix(C(196, 236, 255), C(62, 150, 236), pow(sat((uv.y - hz) / (1. - hz)), .8));
  vec2 sp = vec2(A * .2 - M.x * .004, .82); float sd = length(q - sp);
  col += C(255, 236, 170) * .45 * exp(-sd * 6.);
  col = mix(col, C(255, 252, 230), smoothstep(.06, .052, sd));
  col = puffs(col, q, .72, .07, .018, 4., C(255, 255, 255), C(226, 240, 252), C(176, 206, 240));
  col = puffs(col, q, .6, .04, .01, 13., C(250, 252, 255), C(220, 236, 250), C(170, 200, 236));
  if (uv.y < hz) {
    sky = 0.;
    float d = (hz - uv.y) / hz;
    col = mix(C(40, 140, 214), C(16, 86, 170), smoothstep(.0, .3, d));
    col = mix(col, C(60, 196, 210), smoothstep(.35, .7, d));
    float wv = sin(uv.y * (120. - d * 60.) - T * 1.6 + noise(vec2(q.x * 6., uv.y * 10.)) * 3.);
    if (wv > .82) col = mix(col, C(214, 244, 255), .7);
    if (hash(floor(F)) > .985 && sin(T * 3. + hash(floor(F)) * 50.) > .6 && d < .5) col = C(255, 255, 255);
  }
  float wash = .2 + .025 * sin(T * .7) + .012 * sin(q.x * 9. + T);
  if (uv.y < wash + .012) { sky = 0.; col = mix(col, C(240, 252, 255), .85); }
  if (uv.y < wash) { sky = 0.; col = mix(C(214, 186, 128), C(240, 214, 156), smoothstep(wash - .05, wash - .1, uv.y)); col *= .92 + .14 * noise(F * .7); if (hash(floor(F / 2.)) > .985) col = C(255, 236, 226); }
  /* a palm tree */
  vec2 pb = vec2(A * .1 + M.x * .014, .05);
  float py = q.y - pb.y, cx = pb.x + .12 * pow(sat(py / .55), 1.6);
  if (py > 0. && py < .55 && abs(q.x - cx) < .016 - py * .01) { sky = 0.; col = mod(floor(py * 50.), 2.) == 0. ? C(150, 104, 66) : C(120, 80, 52); }
  vec2 top = vec2(pb.x + .12, pb.y + .55);
  for (int i = 0; i < 6; i++) {
    float fi = float(i), a = -.3 + fi * .62 + .05 * sin(T * 1.6 + fi);
    vec2 dir = vec2(cos(a), sin(a) * .5 - .1);
    vec2 r = q - top;
    float t = clamp(dot(r, dir) / .2, 0., 1.);
    vec2 pt = top + dir * .2 * t + vec2(0., -t * t * .08);
    if (length(q - pt) < .022 * (1. - t * .7) && dot(r, dir) > 0.) { sky = 0.; col = t > .5 ? C(64, 150, 70) : C(98, 182, 80); }
  }
  /* an umbrella and a towel */
  vec2 up = q - vec2(A * .72 + M.x * .014, .06);
  if (abs(up.x + up.y * .1) < .004 && up.y > 0. && up.y < .26) { sky = 0.; col = C(232, 232, 236); }
  vec2 uc = up - vec2(-.02, .26);
  if (uc.y > 0. && length(uc * vec2(1., 2.2)) < .17) { sky = 0.; col = mod(floor(atan(uc.y, uc.x) * 4.), 2.) == 0. ? C(240, 70, 90) : C(255, 248, 240); }
  vec2 tw = up - vec2(.12, -.02);
  if (abs(tw.x) < .08 && abs(tw.y) < .018) { sky = 0.; col = mod(floor(tw.x * 40.), 2.) == 0. ? C(80, 170, 240) : C(255, 214, 90); }
  vec2 bc = q - vec2(A * .45, .07 + abs(sin(T * 2.4)) * .05);
  if (length(bc) < .025) { sky = 0.; float a = atan(bc.y, bc.x); col = mod(floor(a * 1.6), 3.) == 0. ? C(240, 70, 90) : mod(floor(a * 1.6), 3.) == 1. ? C(255, 214, 90) : C(80, 170, 240); }
  for (int i = 0; i < 3; i++) {
    float fi = float(i);
    vec2 g = vec2(fract(.5 + fi * .27 + T * .015), .66 + .07 * fi + .015 * sin(T * 1.2 + fi));
    vec2 d2 = floor(F) - floor(g * uRes);
    float f = step(0., sin(T * 6. + fi));
    if ((abs(d2.x) == 1. && d2.y == 0.) || (abs(d2.x) == 2. && d2.y == f)) col = C(255, 255, 255);
  }
  return vec4(col, sky);
}`,

  /* ---------- Aurora peaks ---------- */
  aurora: `
vec4 scene(vec2 uv) {
  vec2 q = vec2(uv.x * A, uv.y);
  float sky = 1.;
  vec3 col = mix(C(22, 38, 78), C(4, 8, 26), smoothstep(.3, 1., uv.y));
  col = stars(col, .012, C(226, 234, 255));
  vec3 glowSum = vec3(0.);
  for (int i = 0; i < 2; i++) {
    float fi = float(i);
    float base = .55 + fi * .08 + .07 * sin(q.x * 1.6 + T * .25 + fi * 2.) + .05 * fbm(vec2(q.x * 1.2 - T * .05, fi * 3.));
    float y = uv.y - base;
    if (y > -.02) {
      float streak = fbm(vec2(q.x * 26. + fi * 7., T * .2)) * (.6 + .4 * sin(q.x * 9. + T * .7 + fi));
      float a = smoothstep(-.02, .02, y) * exp(-y * (4. + fi * 2.)) * streak * (1.4 - fi * .5);
      vec3 ac = mix(C(80, 255, 160), C(60, 200, 190), smoothstep(.0, .15, y));
      ac = mix(ac, C(170, 120, 255), smoothstep(.12, .35, y));
      col += ac * a;
      glowSum += ac * streak * (1.2 - fi * .5);
    }
  }
  float mx = q.x + M.x * .005;
  float rl = .3 + .3 * pow(1. - abs(fbm(vec2(mx * 1.5, 2.)) * 2. - 1.), 2.) + .04 * fbm(vec2(mx * 9., 4.));
  if (uv.y < rl) {
    sky = 0.;
    float mx2 = mx + .01;
    float rl2 = .3 + .3 * pow(1. - abs(fbm(vec2(mx2 * 1.5, 2.)) * 2. - 1.), 2.) + .04 * fbm(vec2(mx2 * 9., 4.));
    float lit = sat(.5 + (rl - rl2) * 60.);
    float snow = smoothstep(.36, .48, uv.y) + smoothstep(.07, .0, rl - uv.y) * .7;
    vec3 rock = mix(C(40, 50, 92), C(76, 90, 138), lit);
    vec3 sn = mix(C(150, 176, 216), C(226, 244, 252), lit);
    col = mix(rock, sn, sat(snow + (fbm(q * 16.) - .5) * .5));
    col = mix(col, C(120, 220, 170), .14 * smoothstep(.3, .6, uv.y));
  }
  float k;
  if (pines(q + vec2(M.x * .012, 0.), .1, .19, .13, .24, 6., k) > 0.) { sky = 0.; col = k > .82 ? C(44, 86, 96) : C(14, 24, 44); }
  if (uv.y < .2) {
    sky = 0.;
    float d = (.2 - uv.y) / .2;
    col = mix(C(28, 46, 86), C(12, 20, 44), d);
    float streak = fbm(vec2(q.x * 26., T * .2));
    col += C(70, 220, 160) * .35 * smoothstep(.45, .75, streak) * (1. - d);
    if (abs(noise(q * vec2(5., 16.)) - .5) < .006) col = C(150, 186, 220);
    if (hash(floor(F)) > .993) col = C(220, 240, 255);
  }
  return vec4(col, sky);
}`,

  /* ---------- Cloud kingdom ---------- */
  clouds: `
vec4 scene(vec2 uv) {
  vec2 q = vec2(uv.x * A, uv.y);
  float sky = 1.;
  vec3 col = mix(C(255, 210, 230), C(212, 204, 255), smoothstep(.15, .6, uv.y));
  col = mix(col, C(164, 210, 255), smoothstep(.6, 1., uv.y));
  vec2 sp = vec2(A * .78 - M.x * .003, .82);
  col += C(255, 240, 214) * .55 * exp(-length(q - sp) * 4.5);
  if (length(q - sp) < .06) col = C(255, 252, 236);
  vec2 rc = vec2(A * .3 - M.x * .004, -.05);
  float rd = length(q - rc), rr = .82;
  if (rd < rr && rd > rr - .14) {
    float b = (rr - rd) / .14;
    vec3 rb = b < .17 ? C(255, 150, 160) : b < .33 ? C(255, 196, 140) : b < .5 ? C(255, 240, 150) : b < .67 ? C(170, 230, 160) : b < .83 ? C(150, 200, 255) : C(200, 160, 255);
    col = mix(col, rb, .6);
  }
  col = puffs(col, q, .62, .05, .01, 1., C(255, 255, 255), C(250, 228, 242), C(226, 196, 230));
  for (int i = 0; i < 2; i++) {
    float fi = float(i);
    vec2 bc = vec2(A * (.68 - fi * .44) + .03 * sin(T * .4 + fi) - M.x * .006 * (fi + 1.), .58 + fi * .12 + .02 * sin(T * .8 + fi * 2.));
    float br = .1 - fi * .035;
    vec2 d = (q - bc) / br;
    if (length(d * vec2(1., .9)) < 1. && d.y > -.85) {
      float stripe = mod(floor((d.x + 1.) * 2.6 + d.y * .3), 2.);
      vec3 c1 = fi == 0. ? C(255, 128, 170) : C(140, 190, 255), c2 = C(255, 226, 120);
      col = mix(c1, c2, stripe) * (.75 + .35 * sat(.6 - d.x * .5 + d.y * .4));
      sky = 0.;
    }
    if (abs(d.x) < .32 && d.y < -1.15 && d.y > -1.55) { col = C(160, 104, 70); sky = 0.; }
    if ((abs(d.x - .28) < .05 || abs(d.x + .28) < .05) && d.y < -.85 && d.y > -1.15) { col = C(120, 90, 90); sky = 0.; }
  }
  col = puffs(col, q, .34, .1, .02, 6., C(255, 252, 254), C(248, 222, 238), C(222, 190, 228));
  col = puffs(col, q, .06, .2, .03, 11., C(255, 255, 255), C(240, 230, 252), C(212, 196, 240));
  if (uv.y < .07) col = mix(C(240, 230, 252), C(255, 255, 255), step(.5, hash(floor(F / 3.))) * .3);
  for (int i = 0; i < 3; i++) {
    float fi = float(i);
    vec2 g = vec2(fract(.2 + fi * .3 + T * .012), .78 + .05 * fi);
    vec2 d2 = floor(F) - floor(g * uRes);
    float f = step(0., sin(T * 6. + fi));
    if ((abs(d2.x) == 1. && d2.y == 0.) || (abs(d2.x) == 2. && d2.y == f)) col = C(120, 100, 150);
  }
  return vec4(col, sky);
}`,
  /* ---------- Neon city ---------- */
  city: `
/* one layer of buildings, in scene pixels: L 0 far (hazy) to 2 near (dark), with lit windows, rooftop
 * aerials and the odd neon sign */
vec4 block(float L, vec2 P, float base) {
  float cw = 7. + L * 4., X = P.x + L * 37.;
  float id = floor(X / cw), lx = X - id * cw, r = hash(vec2(id, L + 1.));
  float bh = floor(base + uRes.y * (.16 + .26 * r) - L * uRes.y * .07);
  float y = P.y;
  /* a thin aerial with a blinking light on the tall ones */
  if (r > .7 && L > 0. && abs(lx - floor(cw * .5)) < .5 && y >= bh && y < bh + 4. + L * 2.) return vec4(y >= bh + 3. + L * 2. && sin(T * 3. + id) > .3 ? C(255, 80, 110) : C(30, 22, 52), 1.);
  if (lx >= cw - 1. || y >= bh) return vec4(0.);
  vec3 c = L == 0. ? C(92, 58, 128) : L == 1. ? C(52, 34, 86) : C(24, 18, 48);
  if (lx < 1. && L > 0.) c *= 1.25;
  /* windows: every other column, every third row, some lit (and now and then one goes off or on) */
  float wx = lx - 1., wy = bh - 2. - y;
  if (mod(wx, 2.) < 1. && wx > 0. && wx < cw - 2. && mod(wy, 3.) < 1. && wy > 0. && y > base + 2.) {
    float k = hash(vec2(id * 7. + floor(wx), floor(wy / 3.) + L * 40.));
    float on = step(.45 + .1 * L, fract(k + floor(T * .08 + k * 9.) * .37));
    vec3 wc = k > .85 ? C(150, 236, 255) : C(255, 212, 120);
    c = mix(c * 1.35, wc, on * (L == 0. ? .45 : .95));
  }
  /* a neon sign hanging off the side */
  if (L > 0. && r < .22 && lx >= cw - 3. && lx < cw - 1. && y < bh - 3. && y > bh - 12.) {
    float flick = step(.04, fract(T * .37 + r * 5.)) * step(.5, sin(y * 1.7 + r * 40.) + .9);
    c = mix(c, r < .11 ? C(255, 96, 178) : C(90, 240, 255), flick);
  }
  return vec4(c, 1.);
}
vec4 scene(vec2 uv) {
  vec2 G = floor(F);
  vec2 q = vec2(uv.x * A, uv.y);
  float sky = 1.;
  vec3 col = mix(C(236, 120, 140), C(112, 52, 132), smoothstep(.18, .5, uv.y));
  col = mix(col, C(22, 16, 52), smoothstep(.5, 1., uv.y));
  if (uv.y > .55) col = stars(col, .005, C(240, 228, 255));
  /* a crescent moon */
  vec2 mp = vec2(A * .8 - M.x * .003, .8);
  col += C(200, 130, 220) * .35 * exp(-length(q - mp) * 6.);
  if (length(q - mp) < .065 && length(q - mp - vec2(.026, .018)) > .06) col = C(255, 238, 206);
  float base = floor(uRes.y * .2);
  for (int i = 0; i < 3; i++) {
    float L = float(i);
    vec4 b = block(L, vec2(floor(G.x + M.x * (L + 1.) * 2.), G.y), base);
    if (b.a > 0.) { sky = 0.; col = L == 0. ? mix(b.rgb, C(200, 110, 150), .25) : b.rgb; }
  }
  /* the elevated railway, and a little train that rattles past now and then */
  float ty = base, Px = floor(G.x + M.x * 6.);
  if (G.y < ty + 1. && G.y >= ty) { sky = 0.; col = C(40, 26, 64); }
  if (G.y < ty && mod(Px, 22.) < 2.) { sky = 0.; col = C(32, 22, 54); }
  float tx = floor(mod(T * 28., uRes.x + 260.)) - 130., lx = Px - tx;
  if (G.y >= ty + 1. && G.y < ty + 6. && lx > 0. && lx < 96. && mod(lx, 24.) < 23.) {
    sky = 0.;
    col = G.y == ty + 5. || lx < 1. ? C(160, 168, 210) : C(214, 220, 240);
    if (G.y >= ty + 2. && G.y < ty + 4. && mod(lx, 4.) >= 1. && mod(lx, 24.) > 2. && mod(lx, 24.) < 21.) col = C(255, 220, 140);
    if (G.y == ty + 1.) col = C(255, 96, 178);
  }
  /* the wet street: dark, with neon smeared across it */
  if (G.y < ty) {
    sky = 0.;
    col = mix(C(30, 20, 56), C(14, 10, 30), sat((ty - G.y) / ty));
    /* reflections: short streaks under the brightest windows and signs, shimmering */
    float lane = floor(G.x / 5.), s = noise(vec2(G.x * .5 + M.x, G.y * 1.5 - T * .8));
    if (hash(vec2(lane, 3.)) > .55 && mod(G.x, 5.) < 2. && s > .55) col = mix(col, hash(vec2(lane, 8.)) > .6 ? C(255, 96, 178) : hash(vec2(lane, 9.)) > .5 ? C(90, 220, 255) : C(255, 212, 120), .35 * sat((G.y - ty * .2) / ty * 1.5));
    if (abs(G.y - ty * .45) < .5 && mod(G.x + T * 10., 10.) < 5.) col = C(120, 96, 150);
  }
  return vec4(col, sky);
}`,

  /* ---------- Autumn woods ---------- */
  autumn: `
/* a round tree: canopy lit from the top left in three tones, on a dark trunk */
vec3 trees(vec3 col, vec2 q, float base, float sp, float rr, float seed, float par, inout float sky) {
  float x = q.x + M.x * par;
  float c0 = floor(x / sp);
  for (int j = -1; j <= 1; j++) {
    float c = c0 + float(j), r = hash(vec2(c, seed));
    if (r < .25) continue;
    float cx = (c + .5 + (hash(vec2(c, seed + 2.)) - .5) * .6) * sp, R = rr * (.7 + .5 * hash(vec2(c, seed + 3.)));
    float cy = base + R * 1.5;
    if (abs(x - cx) < R * .12 && q.y > base - .02 && q.y < cy) { sky = 0.; col = C(74, 44, 40); }
    vec2 d = vec2(x - cx, q.y - cy);
    float n = fbm(vec2(x, q.y) * 28. + seed);
    float k = length(d * vec2(1., 1.1)) / R - (n - .5) * .35;
    if (k < 1.) {
      sky = 0.;
      float hue = hash(vec2(c, seed + 5.));
      vec3 mid = hue < .35 ? C(232, 112, 58) : hue < .65 ? C(244, 168, 58) : hue < .85 ? C(200, 64, 58) : C(240, 206, 88);
      float l = dot(normalize(d + 1e-4), normalize(vec2(-.5, .85))) * k + (n - .5) * .6;
      col = l > .35 ? mix(mid, C(255, 236, 170), .45) : l > -.3 ? mid : mix(mid, C(90, 36, 50), .45);
    }
  }
  return col;
}
vec4 scene(vec2 uv) {
  vec2 q = vec2(uv.x * A, uv.y);
  float sky = 1.;
  vec3 col = mix(C(255, 206, 150), C(150, 184, 236), smoothstep(.3, 1., uv.y));
  vec2 sp = vec2(A * .72 - M.x * .003, .52);
  float sd = length(q - sp);
  col += C(255, 190, 120) * .5 * exp(-sd * 5.);
  if (sd < .07) col = C(255, 240, 196);
  col = puffs(col, q, .78, .045, .006, 3., C(255, 244, 232), C(250, 214, 196), C(226, 174, 170));
  /* hazy far hills, then three rows of trees, nearer ones warmer and darker */
  float fx = q.x + M.x * .004;
  if (uv.y < .42 + .05 * ridge(fx * 2., 4.)) { sky = 0.; col = mix(C(222, 150, 140), C(196, 128, 136), fbm(q * 6.)); }
  col = trees(col, q, .3, .09, .06, 1., .006, sky);
  if (uv.y < .3 + .02 * sin(q.x * 3.)) { sky = 0.; col = C(196, 150, 84); }
  col = trees(col, q, .17, .16, .1, 7., .012, sky);
  /* the near meadow, with fallen leaves */
  float g = .17 + .03 * sin(q.x * 2.4 + M.x * .02) + .012 * ridge(q.x * 8., 2.);
  if (uv.y < g) {
    sky = 0.;
    col = mix(C(176, 150, 70), C(128, 104, 52), sat((g - uv.y) / .17));
    if (uv.y > g - PX()) col = C(206, 184, 96);
    float h = hash(floor(F));
    if (h > .94) col = h > .98 ? C(200, 64, 58) : C(240, 140, 58);
  }
  /* leaves twirling down, leaning into the wind */
  for (int i = 0; i < 16; i++) {
    float fi = float(i), sp2 = .05 + .04 * h1(fi + 4.);
    float y = 1.05 - fract(T * sp2 + h1(fi));
    float x = fract(h1(fi + 9.) + .05 * sin(T * 1.3 + fi * 2.) + (M.x * .04 + .02) * (1. - y));
    vec2 d2 = floor(F) - floor(vec2(x, y) * uRes);
    float flip = step(0., sin(T * 5. + fi * 3.));
    vec3 lc = h1(fi + 2.) < .5 ? C(236, 104, 52) : C(250, 190, 70);
    if ((d2.x == 0. && d2.y == 0.) || (d2.x == flip * 2. - 1. && d2.y == 0.) || (d2.x == 0. && d2.y == -1. && flip > 0.)) col = lc;
  }
  return vec4(col, sky);
}`,
  /* ---------- Sky whale ---------- */
  whale: `
/* a whale in its own units (head towards +x): 0 outside, 1 back, 2 belly, 3 fin or fluke, 4 eye */
float whale(vec2 p, float t) {
  float sw = .12 * sin(t * 1.1 - p.x * 1.6) * smoothstep(-.3, -1.4, p.x);
  vec2 s = vec2(p.x, p.y - sw);
  if (length(s - vec2(.62, .04)) < .05) return 4.;
  float th = mix(.3, .06, sat((-.6 - s.x) / .55));
  if ((s.x * s.x + s.y * s.y / .18 < 1. && s.x > -.7) || (s.x <= -.6 && s.x > -1.15 && abs(s.y) < th)) return s.y < -.14 + .1 * s.x ? 2. : 1.;
  float fx = -1.15 - s.x;
  if (fx > -.02 && fx < .34 && abs(abs(s.y) - fx * .95) < .06 + fx * .12) return 3.;
  float fy = -.26 - s.y;
  if (fy > 0. && fy < .3 && s.x < .28 - fy * 1.1 && s.x > .02 - fy * .3) return 3.;
  return 0.;
}
vec3 whaleCol(float k, vec2 p, float t, float sc) {
  vec3 c = k == 1. ? C(96, 110, 196) : k == 2. ? C(222, 226, 252) : k == 3. ? C(78, 88, 172) : C(30, 28, 64);
  if (k == 2. && mod(floor(F.y), 2.) == 0.) c = C(188, 194, 238);
  if (k == 1. && whale(p + vec2(0., 1.6 / (uRes.y * sc)), t) == 0.) c = C(168, 178, 244);
  return c;
}
vec4 scene(vec2 uv) {
  vec2 q = vec2(uv.x * A, uv.y);
  float sky = 1.;
  vec3 col = mix(C(255, 200, 170), C(196, 164, 232), smoothstep(.12, .5, uv.y));
  col = mix(col, C(70, 74, 158), smoothstep(.5, 1., uv.y));
  if (uv.y > .55) col = stars(col, .006, C(255, 250, 230));
  col += C(255, 220, 190) * .35 * exp(-length(q - vec2(A * .25, .3)) * 3.);
  col = puffs(col, q, .4, .05, .005, 2., C(255, 236, 236), C(240, 200, 220), C(206, 170, 214));
  /* a big whale and its calf, swimming slowly through the sky */
  float wx = fract(T * .008 + .35) * (A + 1.8) - .9, wy = .58 + .03 * sin(T * .45);
  for (int i = 0; i < 2; i++) {
    float fi = float(i), sc = i == 0 ? .22 : .095;
    vec2 c = i == 0 ? vec2(wx, wy) : vec2(wx - .42, wy - .2 + .02 * sin(T * .7));
    vec2 p = (q - c - vec2(M.x * .006, 0.)) / sc;
    float k = whale(p, T + fi * 1.7);
    if (k > 0.) { col = whaleCol(k, p, T + fi * 1.7, sc); sky = 0.; }
  }
  /* a fountain of sparkles from the big one's blowhole */
  for (int i = 0; i < 6; i++) {
    float fi = float(i), k = fract(T * .5 + fi / 6.);
    vec2 sp = vec2(wx + .13 + (fi - 2.5) * .014 * k * 3., wy + .1 + k * .16 - k * k * .09);
    if (dot1(vec2((sp.x + M.x * .006) / A, sp.y))) col = mix(C(255, 255, 255), C(200, 230, 255), k);
  }
  /* a sea of cloud below */
  col = puffs(col, q, .14, .1, .01, 7., C(255, 244, 246), C(248, 214, 230), C(220, 180, 220));
  col = puffs(col, q, -.02, .16, .016, 11., C(255, 252, 252), C(246, 226, 240), C(226, 196, 230));
  return vec4(col, sky);
}`,

  /* ---------- Lantern lake ---------- */
  lanterns: `
/* every lantern at once: colour where one is drawn (a > 0), and the warm glow they all give off */
vec4 lanternsAt(vec2 p, out float glow) {
  vec4 hit = vec4(0.); glow = 0.;
  for (int i = 0; i < 34; i++) {
    float fi = float(i), near = h1(fi + 7.);
    float y = .3 + fract(h1(fi) + T * (.008 + .012 * near)) * .85;
    float x = (h1(fi + 5.) * 1.2 - .1) * A + .02 * sin(T * .5 + fi);
    float s = mix(.016, .042, near * near) * (1.3 - y * .45);
    vec2 d = p - vec2(x, y);
    float tw = .8 + .2 * sin(T * 3. + fi * 5.);
    glow += exp(-length(d) / (s * 2.8)) * .4 * tw;
    if (abs(d.x) < s * .72 && abs(d.y) < s) {
      float v = (d.y + s) / (2. * s);
      hit = vec4(v > .82 ? C(196, 70, 60) : v < .16 ? C(255, 244, 190) : mix(C(255, 120, 70), C(255, 196, 110), v), 1.);
    }
  }
  return hit;
}
vec4 scene(vec2 uv) {
  vec2 q = vec2(uv.x * A, uv.y);
  float sky = 1., hz = .32, g;
  vec3 col;
  if (uv.y >= hz) {
    col = mix(C(98, 52, 96), C(36, 30, 86), smoothstep(hz, .55, uv.y));
    col = mix(col, C(10, 12, 38), smoothstep(.55, 1., uv.y));
    col = stars(col, .008, C(255, 240, 220));
    float hx = q.x + M.x * .005;
    if (uv.y < hz + .1 * ridge(hx * 1.8, 3.) + .02) { sky = 0.; col = uv.y < hz + .03 * ridge(hx * 4., 8.) ? C(18, 14, 40) : C(40, 30, 72); }
    vec4 l = lanternsAt(q + vec2(M.x * .01, 0.), g);
    col += C(255, 150, 80) * g * .55;
    if (l.a > 0.) { col = l.rgb; sky = 0.; }
  } else {
    /* the lake: the sky and its lanterns, mirrored and rippling */
    sky = 0.;
    float depth = (hz - uv.y) / hz;
    vec2 r = vec2(q.x + .006 * sin(uv.y * 220. + T * 2.) * (.4 + depth), 2. * hz - uv.y);
    col = mix(C(70, 40, 84), C(14, 14, 44), depth);
    vec4 l = lanternsAt(r + vec2(M.x * .01, 0.), g);
    col += C(255, 150, 80) * g * .4 * (1. - depth * .5);
    if (l.a > 0. && mod(floor(F.y), 2.) == 0.) col = mix(col, l.rgb, .7);
    if (abs(noise(vec2(q.x * 6., uv.y * 60. - T * .3)) - .5) < .012) col = mix(col, C(150, 110, 150), .5);
  }
  return vec4(col, sky);
}`,

  /* ---------- Glow forest ---------- */
  mushrooms: `
vec4 scene(vec2 uv) {
  vec2 q = vec2(uv.x * A, uv.y);
  float sky = 1.;
  vec3 col = mix(C(24, 46, 70), C(10, 12, 32), smoothstep(.1, 1., uv.y));
  /* two rows of trunks, the far ones lost in mist */
  for (int i = 0; i < 2; i++) {
    float fi = float(i), sp = .16 - fi * .04, x = q.x + M.x * (.004 + fi * .008) + fi * 3.1;
    float c = floor(x / sp), w = sp * (.06 + .06 * hash(vec2(c, fi)));
    if (abs(x - (c + .5) * sp) < w && hash(vec2(c, fi + 4.)) > .5) { sky = 0.; col = fi == 0. ? C(34, 52, 74) : C(16, 22, 40); }
  }
  col = mix(col, C(60, 110, 130), .25 * exp(-pow((uv.y - .28) * 7., 2.)));
  float g = .16 + .03 * sin(q.x * 3. + 1.) + .015 * ridge(q.x * 8., 4.);
  vec3 glow = vec3(0.);
  /* the mushrooms: round glowing caps with spots and gills, on pale stems */
  for (int i = 0; i < 6; i++) {
    float fi = float(i), near = h1(fi + 3.);
    float cx = (fi + .5) / 6. * A + (h1(fi) - .5) * .1 + M.x * .01 * (1. + near);
    float r = mix(.07, .17, near), base = .16 + .03 * sin(cx * 3. + 1.) - near * .05, top = base + r * mix(1., 1.6, h1(fi + 9.));
    vec3 cc = h1(fi + 11.) < .45 ? C(90, 236, 230) : h1(fi + 11.) < .8 ? C(255, 120, 206) : C(190, 140, 255);
    vec2 d = (q - vec2(cx, top)) / vec2(r, r * .8);
    glow += cc * exp(-length(q - vec2(cx, top + r * .2)) / (r * 1.4)) * .3;
    if (abs(q.x - cx) < r * .2 * (1. + .3 * (top - q.y) / r) && q.y > base - .02 && q.y < top) { sky = 0.; col = mix(C(210, 226, 236), C(150, 170, 200), step(cx + r * .05, q.x)); }
    if (length(d) < 1. && d.y > -.2) {
      sky = 0.;
      col = d.y < .05 ? cc * .55 : cc;
      if (d.y > .05 && length(d - vec2(-.3, .5)) < .3) col = mix(cc, C(255, 255, 255), .45);
      vec2 sp = floor(d * 4.5);
      if (d.y > .2 && hash(sp + fi) > .72 && length(fract(d * 4.5) - .5) < .32) col = C(255, 255, 240);
    }
  }
  col += glow * (sky > .5 ? 1. : .4);
  if (uv.y < g && sky > .5) {
    sky = 0.;
    col = mix(C(26, 52, 58), C(10, 22, 30), sat((g - uv.y) / .16)) + glow * .5;
    if (uv.y > g - PX()) col = C(56, 110, 104);
    if (hash(floor(F)) > .985) col = C(120, 255, 220);
  }
  /* spores drifting up */
  for (int i = 0; i < 22; i++) {
    float fi = float(i), k = fract(T * (.03 + .03 * h1(fi + 2.)) + h1(fi));
    vec2 sp = vec2(fract(h1(fi + 5.) + .03 * sin(T * .6 + fi * 2.)) * A, .12 + k * .9);
    if (dot1(vec2(sp.x / A, sp.y))) col = mix(C(200, 255, 240), col, k * .6);
  }
  return vec4(col, sky);
}`,

  /* ---------- Little cosmos ---------- */
  space: `
vec4 scene(vec2 uv) {
  vec2 q = vec2(uv.x * A, uv.y);
  float sky = 1.;
  vec3 col = mix(C(22, 14, 50), C(6, 6, 20), uv.y);
  float n = fbm(q * 2.4 + vec2(T * .006, 0.)), n2 = fbm(q * 3.1 + 7.);
  col += C(140, 60, 170) * pow(n, 3.) * 1.6 + C(40, 120, 190) * pow(n2, 4.) * 1.8;
  col = stars(col, .014, C(255, 255, 255));
  /* a ringed planet, lit from the top left; the ring passes behind it and then in front */
  vec2 pc = vec2(A * .66 - M.x * .004, .5);
  float R = .19;
  vec2 rp = q - pc, rr = mat2(.94, .34, -.34, .94) * rp;
  float rd = length(rr * vec2(1., 3.4));
  bool ring = rd > R * 1.3 && rd < R * 1.95 && abs(rd - R * 1.62) > R * .05;
  vec3 ringC = mix(C(255, 214, 170), C(200, 150, 220), smoothstep(R * 1.3, R * 1.95, rd));
  if (ring && rr.y > 0.) { col = ringC * .8; sky = 0.; }
  if (length(rp) < R) {
    sky = 0.;
    vec2 d = rp / R; vec3 nn = vec3(d, sqrt(max(0., 1. - dot(d, d))));
    float l = sat(dot(nn, normalize(vec3(-.55, .5, .65))));
    float band = sin(d.y * 9. + .8 * fbm(d * 3. + 2.) * 3.);
    vec3 pcol = band > .4 ? C(255, 186, 150) : band > -.3 ? C(240, 140, 160) : C(255, 220, 176);
    col = pcol * (.28 + .85 * l) + C(70, 40, 120) * (1. - l) * .4;
    if (ring && rr.y < 0.) col = mix(col, C(30, 16, 50), .5);
  }
  if (ring && rr.y <= 0.) { col = ringC; sky = 0.; }
  /* its little moon */
  float a = T * .14;
  vec2 mc = pc + vec2(cos(a) * R * 2.5, sin(a) * R * .8);
  if (length(q - mc) < .032 && (sin(a) < 0. || length(q - pc) > R)) { sky = 0.; col = mix(C(230, 226, 240), C(150, 140, 180), step(.5, fbm((q - mc) * 50.))) * (length(q - mc - vec2(-.01, .01)) < .022 ? 1. : .7); }
  /* a tiny rocket puttering across */
  vec2 rc = vec2(fract(T * .018 + .1) * (A + .4) - .2 + M.x * .006, .22 + .04 * sin(T * .5));
  vec2 r2 = (q - rc) / .034;
  if (abs(r2.y) < .55 - .12 * abs(r2.x) && r2.x > -1.6 && r2.x < 1.2) { sky = 0.; col = r2.x > .6 ? C(255, 90, 110) : length(r2 - vec2(.1, .05)) < .3 ? C(120, 220, 255) : C(240, 240, 250); }
  if (r2.x < -1.6 && r2.x > -1.6 - (1.2 + .6 * sin(T * 30.)) && abs(r2.y) < .3) { sky = 0.; col = r2.x > -2.2 ? C(255, 236, 120) : C(255, 140, 60); }
  if ((r2.x > -1.6 && r2.x < -.9) && abs(r2.y) > .4 && abs(r2.y) < .85) { sky = 0.; col = C(255, 90, 110); }
  /* now and then a shooting star */
  float ph = fract(T * .07);
  if (ph < .08) {
    vec2 dir = normalize(vec2(-1., -.35)), head = vec2(A * .95, .9) + dir * ph * 9.;
    vec2 rel = q - head; float along = dot(rel, -dir), off = abs(dot(rel, vec2(-dir.y, dir.x)));
    if (along > 0. && along < .16 && off < PX()) col = mix(col, C(255, 255, 220), 1. - along / .16);
  }
  return vec4(col, sky);
}`
,
  /* ---------- Coral reef ---------- */
  reef: `
vec4 scene(vec2 uv) {
  vec2 q = vec2(uv.x * A, uv.y), G = floor(F);
  float sky = 0.;
  vec3 col = mix(C(16, 56, 116), C(70, 196, 214), pow(uv.y, 1.3));
  /* sunbeams slanting down from the surface, and the surface shimmering */
  float ray = pow(sat(noise(vec2(q.x * 7. - uv.y * 2.2 + T * .1, 2.))), 4.) * smoothstep(.2, 1., uv.y);
  col += C(170, 250, 240) * ray * .4;
  if (uv.y > .93 && sin(q.x * 40. + T * 2. + sin(q.x * 13. - T)) > .7) col = mix(col, C(210, 255, 250), .5);
  /* a far rocky ridge in the blue */
  float rx = q.x + M.x * .004;
  if (uv.y < .3 + .08 * ridge(rx * 2., 6.)) col = mix(C(40, 110, 140), col, .45);
  /* the sandy floor with light rippling on it */
  float g = .15 + .02 * sin(q.x * 4. + 1.);
  if (uv.y < g) {
    col = mix(C(236, 214, 160), C(200, 170, 120), sat((g - uv.y) / .15));
    if (noise(vec2(q.x * 18. + T * .3, uv.y * 40.)) > .68) col = mix(col, C(255, 246, 210), .55);
  }
  /* corals: branching ones and round brain corals */
  for (int i = 0; i < 7; i++) {
    float fi = float(i), cx = (fi + .4 + .3 * h1(fi)) / 7. * A + M.x * .01, base = .15 + .02 * sin(cx * 4. + 1.) - .01;
    vec3 cc = h1(fi + 2.) < .33 ? C(255, 112, 140) : h1(fi + 2.) < .66 ? C(255, 168, 80) : C(176, 120, 230);
    vec2 d = q - vec2(cx, base);
    if (h1(fi + 6.) < .55) {
      float h = .12 + .1 * h1(fi + 4.), w = .07;
      float n = fbm(vec2(d.x * 30. + fi * 3., d.y * 18.));
      if (d.y > 0. && length(d / vec2(w, h)) < 1. && (n > .52 || abs(d.x + .01 * sin(d.y * 60.)) < .006)) col = mix(cc, cc * .7, step(.6, n));
    } else {
      vec2 e = d / vec2(.06, .045);
      if (length(e) < 1. && d.y > -.005) col = sin(e.x * 9. + e.y * 5. + sin(e.y * 7.) * 2.) > .3 ? cc : cc * .72;
    }
  }
  /* seaweed swaying */
  for (int i = 0; i < 6; i++) {
    float fi = float(i), x0 = (fi + .7) / 6. * A * .97 + M.x * .014, h = .2 + .14 * h1(fi + 8.);
    float y = uv.y - .12, sway = .025 * sin(T * 1.4 + fi + y * 12.) * y / h;
    if (y > 0. && y < h && abs(q.x - x0 - sway) < .006 * (1.2 - y / h)) col = mod(G.y, 3.) == 0. ? C(80, 190, 110) : C(50, 150, 90);
  }
  /* little fish, back and forth */
  for (int i = 0; i < 8; i++) {
    float fi = float(i), dir = h1(fi + 1.) < .5 ? 1. : -1.;
    vec2 fp = vec2(fract(h1(fi) + T * (.02 + .02 * h1(fi + 3.)) * dir) * (A + .2) - .1, .3 + .5 * h1(fi + 4.) + .02 * sin(T + fi));
    vec2 d = G - floor(fp * uRes.y); float dx = d.x * dir;
    vec3 fc = h1(fi + 9.) < .4 ? C(255, 214, 70) : h1(fi + 9.) < .75 ? C(255, 130, 70) : C(110, 200, 255);
    if (abs(d.y) <= 1. && dx >= -2. && dx <= 1. && !(abs(d.y) == 1. && (dx == 1. || dx == -2.))) col = dx == 1. && d.y == 0. ? C(255, 255, 255) : dx == 0. && d.y == 0. ? C(30, 30, 50) : fc;
    if (dx == -3. && abs(d.y) <= (step(0., sin(T * 12. + fi)) + .5)) col = fc * .8;
  }
  /* bubbles rising */
  for (int i = 0; i < 10; i++) {
    float fi = float(i), k = fract(T * (.05 + .04 * h1(fi + 2.)) + h1(fi));
    vec2 bp = vec2(h1(fi + 5.) * A + .02 * sin(T * 2. + fi), .14 + k * .9);
    vec2 d = G - floor(bp * uRes.y);
    float r = 1. + step(.5, h1(fi + 7.));
    if (abs(length(d) - r) < .6) col = mix(col, C(220, 255, 255), .8);
  }
  return vec4(col, sky);
}`,

  /* ---------- Duck bath ---------- */
  ducks: `
/* a rubber duck, facing right, in its own units: colour, or a < 0 outside */
vec4 duck(vec2 p) {
  if (length((p - vec2(.62, .78)) / vec2(.2, .1)) < 1. && p.x > .6) return vec4(C(255, 140, 50), 1.);
  if (length(p - vec2(.48, .86)) < .05) return vec4(C(40, 30, 50), 1.);
  if (length(p - vec2(.48, .87) - vec2(-.015, .02)) < .02) return vec4(1.);
  if (length(p - vec2(.36, .8)) < .3) return vec4(length(p - vec2(.28, .92)) < .14 ? C(255, 246, 140) : C(255, 216, 60), 1.);
  vec2 b = (p - vec2(0., .2)) / vec2(.7, .38);
  if (length(b) < 1. && !(p.x < -.45 && p.y > .32 + (p.x + .7) * .6)) {
    if (length((p - vec2(-.05, .3)) / vec2(.32, .16)) < 1. && p.y < .32) return vec4(C(240, 176, 40), 1.);
    return vec4(b.y > .35 && b.x < .3 ? C(255, 240, 130) : C(255, 214, 56), 1.);
  }
  return vec4(-1.);
}
vec4 scene(vec2 uv) {
  vec2 q = vec2(uv.x * A, uv.y), G = floor(F);
  float sky = 1.;
  /* the bathroom wall: pastel tiles with a shine in the corner of each */
  vec3 col = mod(floor(G.x / 7.) + floor(G.y / 7.), 2.) == 0. ? C(176, 220, 244) : C(204, 234, 250);
  if (mod(G.x, 7.) == 0. || mod(G.y, 7.) == 0.) col = C(236, 246, 252);
  else if (mod(G.x, 7.) == 1. && mod(G.y, 7.) == 5.) col = C(255, 255, 255);
  /* the tub's rim */
  float rim = .56;
  if (uv.y < rim + 5. * PX() && uv.y >= rim) { sky = 0.; col = uv.y > rim + 3. * PX() ? C(255, 255, 255) : C(226, 232, 246); }
  if (uv.y < rim) {
    sky = 0.;
    float w = .02 * sin(q.x * 9. + T * 1.2);
    col = mix(C(140, 206, 244), C(84, 150, 220), sat((rim - uv.y) / .5));
    if (abs(sin(q.x * 22. - T * 1.5 + uv.y * 40.)) < .08 && uv.y < rim - .05) col = mix(col, C(200, 240, 255), .5);
    /* foam piled along the top of the water */
    col = puffs(col, q, rim - .03, .045, .006, 4., C(255, 255, 255), C(236, 244, 255), C(196, 220, 246));
  }
  /* the ducks, bobbing, half in the water */
  for (int i = 0; i < 4; i++) {
    float fi = float(i), sc = mix(.1, .2, h1(fi + 3.)), dir = h1(fi + 6.) < .5 ? 1. : -1.;
    float wy = mix(rim - .08, .12, h1(fi + 3.)) ;
    vec2 c = vec2(fract(h1(fi) + T * .006 * dir) * (A + .6) - .3 + M.x * .01 * sc * 10., wy + .012 * sin(T * 1.6 + fi * 2.));
    vec2 p = (q - c) / sc; p.x *= dir;
    float tilt = .12 * sin(T * 1.3 + fi);
    p = mat2(cos(tilt), sin(tilt), -sin(tilt), cos(tilt)) * p;
    vec4 d = duck(p);
    if (d.a > 0.) { sky = 0.; col = q.y < c.y + .01 * sin(q.x * 30. + T * 3.) ? mix(d.rgb, C(120, 190, 240), .45) : d.rgb; }
  }
  /* soap bubbles floating up, with a rainbow shine */
  for (int i = 0; i < 9; i++) {
    float fi = float(i), k = fract(T * (.025 + .02 * h1(fi + 2.)) + h1(fi));
    vec2 bp = vec2(h1(fi + 5.) * A + .03 * sin(T + fi * 2.), rim - .05 + k * .6);
    float r = mix(.012, .034, h1(fi + 8.)), d = length(q - bp);
    if (abs(d - r) < PX() * .9) col = mix(col, k > .5 ? C(255, 190, 230) : C(190, 230, 255), .8);
    if (length(q - bp - vec2(-r * .4, r * .4)) < PX() * 1.2) col = C(255, 255, 255);
  }
  return vec4(col, sky);
}`,

  /* ---------- Breakfast hills ---------- */
  breakfast: `
vec4 scene(vec2 uv) {
  vec2 q = vec2(uv.x * A, uv.y), G = floor(F);
  float sky = 1.;
  vec3 col = mix(C(255, 236, 200), C(150, 210, 255), smoothstep(.15, .9, uv.y));
  /* the sun is an egg, sunny side up */
  vec2 ec = vec2(A * .78 - M.x * .003, .78), ed = q - ec;
  float ang = atan(ed.y, ed.x);
  if (length(ed) < .1 * (1. + .13 * sin(ang * 5. + 1.) + .06 * sin(ang * 9.))) { col = C(255, 252, 244); sky = 0.; }
  if (length(ed - vec2(.01, 0.)) < .046) { col = length(ed - vec2(-.005, .016)) < .014 ? C(255, 240, 170) : C(255, 186, 40); sky = 0.; }
  /* whipped-cream clouds */
  col = puffs(col, q, .66, .04, .006, 5., C(255, 255, 250), C(252, 240, 220), C(236, 214, 190));
  /* pancake mountains, dripping with syrup, a pat of butter on top */
  for (int j = 0; j < 3; j++) {
    float fj = float(j), cx = A * (.17 + fj * .32) + M.x * .006, w = .17 + .04 * fj, n = 5. + fj, lh = .042;
    float x = q.x - cx, base = .2;
    float k = floor((uv.y - base) / lh), fy = fract((uv.y - base) / lh);
    /* each pancake seen side-on: rounded ends, a little wobble, golden faces and a fluffy middle */
    float lw = w * (1. - k * .03) + .008 * sin(k * 2.7 + fj * 3.), ax = abs(x - .007 * sin(k * 1.9 + fj)), dy = (fy - .5) * lh, rr = lh * .5;
    if (k >= 0. && k < n && ax < lw - (rr - sqrt(max(0., rr * rr - dy * dy)))) {
      sky = 0.;
      col = fy > .72 ? C(226, 150, 70) : fy < .24 ? C(186, 112, 52) : C(252, 220, 156);
      if (ax > lw - rr * 1.2) col *= .88;
    }
    float top = base + n * lh, drip = top - .012 - .1 * pow(sat(sin(x * 48. + fj * 2.)), 8.) * step(abs(x), w * .9);
    if (uv.y < top + .014 && uv.y > drip && abs(x) < w * .88) { sky = 0.; col = uv.y > top + .006 ? C(180, 88, 36) : C(140, 62, 24); if (uv.y < drip + PX() * 2.) col = C(120, 50, 20); }
    if (abs(x) < .045 && uv.y > top + .01 && uv.y < top + .045) { sky = 0.; col = uv.y > top + .038 || x < -.035 ? C(255, 252, 214) : C(255, 230, 110); }
  }
  /* the ground is toast: slices side by side, crusts on top, crumbs and blueberries */
  float sx = q.x * 1.4 + M.x * .03, f = fract(sx), bump = .03 * (sqrt(sat(1. - pow((f - .3) / .3, 2.))) + sqrt(sat(1. - pow((f - .7) / .3, 2.)))) * .6;
  float g = .19 + bump;
  if (uv.y < g) {
    sky = 0.;
    col = uv.y > g - 3. * PX() || f < .03 || f > .97 ? C(170, 96, 44) : C(244, 204, 132);
    if (col.r > .8 && hash(G) > .9) col = C(226, 176, 104);
    vec2 bq = vec2(q.x + M.x * .02, uv.y) * 16., bc = floor(bq);
    if (hash(bc + 3.) > .82 && length(fract(bq) - .5) < .32 && uv.y < g - .04) col = hash(bc) > .5 ? C(70, 80, 170) : C(230, 50, 70);
  }
  return vec4(col, sky);
}`,

  /* ---------- Sleepy giant ---------- */
  catnap: `
vec4 scene(vec2 uv) {
  vec2 q = vec2(uv.x * A, uv.y), G = floor(F);
  float sky = 1.;
  vec3 col = mix(C(255, 196, 160), C(176, 150, 220), smoothstep(.2, .65, uv.y));
  col = mix(col, C(70, 66, 140), smoothstep(.65, 1., uv.y));
  if (uv.y > .6) col = stars(col, .006, C(255, 250, 230));
  vec2 mc = vec2(A * .12 - M.x * .003, .82);
  if (length(q - mc) < .05 && length(q - mc - vec2(.02, .012)) > .045) col = C(255, 240, 200);
  if (uv.y < .3 + .05 * ridge(q.x * 2. + M.x * .004, 9.)) { sky = 0.; col = C(166, 140, 196); }
  /* the giant: a curled-up tabby cat, breathing slowly; a little village has grown on its back */
  float breath = 1. + .02 * sin(T * .7);
  vec2 cb = vec2(A * .44 + M.x * .008, .06);
  float rx = A * .34, ry = .44 * breath;
  vec2 b = (q - cb) / vec2(rx, ry);
  vec2 hc = vec2(cb.x + rx * .86, .2 + .01 * sin(T * .7));
  float hr = .15;
  vec3 fur = C(244, 156, 84), furL = C(255, 196, 126), furD = C(206, 116, 66);
  if (length(b) < 1.) {
    sky = 0.;
    float l = dot(normalize(b + 1e-4), normalize(vec2(-.4, .9)));
    col = l > .55 ? furL : l > -.2 ? fur : furD;
    if (sin(b.x * 22. + .6 * sin(b.y * 5.)) > .6 && b.y > .3) col = furD;
  }
  /* ears, head, a sleepy face */
  vec2 hd = q - hc;
  for (int e = 0; e < 2; e++) {
    float s = e == 0 ? -1. : 1.;
    vec2 ep = hd - vec2(s * hr * .55, hr * .7);
    if (ep.y > 0. && ep.y < hr * .55 && abs(ep.x + s * ep.y * .2) < (hr * .55 - ep.y) * .55) { sky = 0.; col = abs(ep.x + s * ep.y * .2) < (hr * .55 - ep.y) * .25 && ep.y < hr * .35 ? C(255, 170, 170) : fur; }
  }
  if (length(hd * vec2(1., 1.12)) < hr) {
    sky = 0.;
    col = length(hd - vec2(-hr * .3, hr * .35)) < hr * .5 ? furL : fur;
    if (sin(hd.x * 60.) > .7 && hd.y > hr * .4) col = furD;
    for (int e = 0; e < 2; e++) {
      vec2 ey = hd - vec2((e == 0 ? -1. : 1.) * hr * .38, hr * .05);
      if (abs(length(ey - vec2(0., hr * .14)) - hr * .16) < PX() * .8 && ey.y < hr * .06) col = C(70, 40, 50);
      if (length(ey - vec2(0., -hr * .2)) < hr * .1) col = mix(col, C(255, 150, 160), .6);
    }
    if (length(hd - vec2(0., -hr * .08)) < hr * .07) col = C(240, 110, 130);
    if (abs(hd.y + hr * .2 - .2 * abs(hd.x)) < PX() * .6 && abs(hd.x) < hr * .12 && abs(hd.x) > hr * .02) col = C(70, 40, 50);
  }
  /* the tail curled round the front, a white tip */
  float tx = q.x - cb.x, ty = .05 + .035 * sin(tx * 9. - 1.) + .01 * sin(T * .5);
  if (abs(uv.y - ty) < .028 && tx > -rx * .9 && tx < rx * .55) { sky = 0.; col = tx > rx * .42 ? C(255, 246, 236) : (sin(tx * 40.) > .6 ? furD : fur); }
  /* the village on its back: houses with red roofs, round trees */
  for (int i = 0; i < 6; i++) {
    float fi = float(i), bx = (fi - 2.5) / 3.4 * .82, sy = cb.y + ry * sqrt(max(0., 1. - bx * bx)) - .012;
    float hx = cb.x + bx * rx;
    vec2 d = q - vec2(hx, sy);
    if (mod(fi, 2.) == 0.) {
      if (abs(d.x) < .022 && d.y > 0. && d.y < .028) { sky = 0.; col = abs(d.x - .006) < .005 && d.y < .014 ? C(255, 214, 110) : C(255, 248, 236); }
      if (d.y >= .028 && d.y < .052 && abs(d.x) < .03 - (d.y - .028) * 1.2) { sky = 0.; col = C(226, 76, 80); }
    } else if (length(d - vec2(0., .035)) < .025 || (abs(d.x) < .004 && d.y > 0. && d.y < .03)) { sky = 0.; col = d.y > .015 ? C(104, 170, 96) : C(120, 80, 60); }
  }
  /* Zs floating up from the sleeper */
  for (int i = 0; i < 3; i++) {
    float fi = float(i), k = fract(T * .12 + fi / 3.), s = 1. + floor(k * 2.5);
    vec2 zp = hc + vec2(.06 + k * .14, .14 + k * .3);
    vec2 d = floor((G - floor(zp * uRes.y)) / s);
    if (d.x >= 0. && d.x < 5. && d.y >= 0. && d.y < 5. && (d.y == 0. || d.y == 4. || d.x == d.y)) col = mix(C(255, 255, 255), col, k * .7);
  }
  return vec4(col, sky);
}`

};
/* the rest of the scenes live in their own files, a batch each */
Object.assign(SHADERS, NATURE, DREAMY, PLACES, OCEAN, COSMOS, COZY, SWEETS, ARTSY);
