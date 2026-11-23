const COZY = {}; // trimmed for this site: the cozy 3D art set isn't used

/* Dioramas: small 3D worlds, ray-marched from signed distance functions in one fragment shader
 * each. A diorama defines map(p) (distance and material) and scene(uv) (camera, lighting, sky);
 * the shared parts in between march rays, find normals, soft shadows and ambient occlusion.
 * Extra inputs: uS scroll progress (0 below the screen → 1 above it), uO orbit from dragging,
 * uK a "poke" that jumps to 1 on click and fades. */

export const ART_HEADER = `
float sdSphere(vec3 p, float r) { return length(p) - r; }
float sdEllipsoid(vec3 p, vec3 r) { float k0 = length(p / r), k1 = length(p / (r * r)); return k0 * (k0 - 1.) / max(k1, 1e-5); }
float sdRoundBox(vec3 p, vec3 b, float r) { vec3 q = abs(p) - b; return length(max(q, 0.)) + min(max(q.x, max(q.y, q.z)), 0.) - r; }
float sdCyl(vec3 p, float h, float r) { vec2 d = abs(vec2(length(p.xz), p.y)) - vec2(r, h); return min(max(d.x, d.y), 0.) + length(max(d, 0.)); }
/* a cone, apex up at +h, base of radius r at -h (a bound, which is all marching needs) */
float sdCone(vec3 p, float h, float r) { vec2 q = vec2(length(p.xz), p.y); float s = r / (2. * h); return max((q.x - (h - q.y) * s) / sqrt(1. + s * s), -q.y - h); }
float sdCapsule(vec3 p, vec3 a, vec3 b, float r) { vec3 pa = p - a, ba = b - a; float h = clamp(dot(pa, ba) / dot(ba, ba), 0., 1.); return length(pa - ba * h) - r; }
float sdTorus(vec3 p, vec2 t) { return length(vec2(length(p.xz) - t.x, p.y)) - t.y; }
float smin(float a, float b, float k) { float h = clamp(.5 + .5 * (b - a) / k, 0., 1.); return mix(b, a, h) - k * h * (1. - h); }
float smax(float a, float b, float k) { return -smin(-a, -b, k); }
mat2 rot(float a) { float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }
vec2 U(vec2 a, vec2 b) { return a.x < b.x ? a : b; }
/* a gabled roof: width w, height h, depth d, sitting on y = 0 */
float sdRoof(vec3 p, float w, float h, float d) { return max(max(abs(p.x) * h / w + p.y - h, abs(p.z) - d), -p.y); }
/* a five-pointed star in 2D, for starfish and decorations */
float sdStar5(vec2 p, float r, float k) { float a = atan(p.y, p.x), m = .5 + .5 * cos(a * 5.); return length(p) - r * mix(k, 1., m * m); }
/* a bit of surface grain, so nothing looks like plain plastic */
vec3 grain(vec3 c, vec3 p, float f) { return c * (.92 + .16 * noise(p.xy * f + p.zx * f * .7)); }
/* a soft pastel sky to sit behind everything */
vec3 skyGrad(vec3 rd, vec3 lo, vec3 hi) { return mix(lo, hi, sat(rd.y * 1.4 + .35)); }
`;

export const ART_MARCH = `
vec2 march(vec3 ro, vec3 rd, float maxd) {
  float t = .01, m = -1.;
  for (int i = 0; i < 96; i++) {
    vec2 h = map(ro + rd * t);
    if (h.x < .0012 * t) { m = h.y; if (gT > 999.) gT = t; break; }
    t += h.x * .9;
    if (t > maxd) break;
  }
  return vec2(t, m);
}
/* four taps on a tetrahedron rather than six on the axes */
vec3 calcN(vec3 p) {
  vec2 e = vec2(1., -1.) * .00087;
  return normalize(e.xyy * map(p + e.xyy).x + e.yyx * map(p + e.yyx).x + e.yxy * map(p + e.yxy).x + e.xxx * map(p + e.xxx).x);
}
float softShadow(vec3 ro, vec3 rd, float k) {
  float res = 1., t = .03;
  for (int i = 0; i < 28; i++) {
    float h = map(ro + rd * t).x;
    res = min(res, k * h / t);
    t += clamp(h, .03, .35);
    if (res < .004 || t > 6.) break;
  }
  return clamp(res, 0., 1.);
}
float calcAO(vec3 p, vec3 n) {
  float o = 0., s = 1.;
  for (int i = 0; i < 6; i++) { float h = .015 + .08 * float(i); o += (h - map(p + n * h).x) * s; s *= .72; }
  return clamp(1. - 1.8 * o, 0., 1.);
}
/* filmic (ACES) tone mapping */
vec3 tone(vec3 c) { c = max(c, 0.) * .92; return clamp((c * (2.51 * c + .03)) / (c * (2.43 * c + .59) + .14), 0., 1.); }
/* pull the camera back on narrow frames, so the whole diorama stays in shot */
float fit() { return max(1., 1.55 / A); }
mat3 camera(vec3 ro, vec3 ta) { vec3 f = normalize(ta - ro), r = normalize(cross(f, vec3(0., 1., 0.))), u = cross(r, f); return mat3(r, u, f); }
/* a cute soft light: a soft terminator, shadows tinted by the sky, hemisphere ambient, a gentle
 * highlight and a rim of sheen */
vec3 softLight(vec3 base, vec3 p, vec3 n, vec3 rd, vec3 L, vec3 sun, vec3 skyC, vec3 bounce, float sh, float ao) {
  float ndl = dot(n, L);
  float wrap = sat((ndl + .3) / 1.3);
  vec3 direct = sun * mix(wrap, sat(ndl), .6) * sh;
  float hemi = .5 + .5 * n.y;
  vec3 amb = skyC * hemi * ao * .62 + bounce * (1. - hemi) * ao * .4;
  float fres = pow(1. - sat(dot(n, -rd)), 4.);
  vec3 col = base * (direct * 1.2 + amb);
  col += skyC * fres * .22 * ao;
  col += sun * pow(sat(dot(n, normalize(L - rd))), 48.) * .14 * sh;
  return col;
}
`;

export const ART = {
  /* ---------- Ice igloo: blocks glow at the seams and drift apart as you scroll ---------- */
  igloo: {
    title: "Ice igloo", desc: "A snow-brick igloo at dusk, warm light spilling from its doorway, a penguin in a red scarf keeping watch. Scroll and the bricks float apart.",
    map: `
float gEdge; vec3 gPP; float gHB;
float explode() { return max(sat(uS * 1.3), uK * .35); }
float dunes(vec3 p) { return .09 * sin(p.x * .7 + 1.) * sin(p.z * .6) + .05 * sin(p.x * 1.9 + p.z * 1.3) + .025 * noise(p.xz * 2.5) - .02; }
float blocks(vec3 p) {
  float r = length(p), el = asin(clamp(p.y / max(r, 1e-4), -1., 1.)), az = atan(p.z, p.x);
  float rows = 6., rowH = 1.5708 / rows, row = clamp(floor(el / rowH), 0., rows - 1.), best = 1e9, E = explode();
  for (int dr = -1; dr <= 1; dr++) {
    float ri = clamp(row + float(dr), 0., rows - 1.);
    float elc = (ri + .5) * rowH, cnt = max(3., floor(15. * cos(elc) + .5)), colW = 6.2832 / cnt, off = mod(ri, 2.) * .5 * colW;
    float ci = floor((az - off) / colW);
    for (int dc = -1; dc <= 1; dc++) {
      float cj = ci + float(dc), azc = (cj + .5) * colW + off, h = hash(vec2(ri, mod(cj, cnt)));
      if (ri < 2.5 && abs(mod(azc + 3.1416, 6.2832) - 3.1416) < .3) continue;
      float e = E * (.25 + h * .9);
      vec3 dir = vec3(cos(elc) * cos(azc), sin(elc), cos(elc) * sin(azc));
      vec3 c = dir * (1. + .02 * h + e * .9) + vec3(0., e * (.4 + h * .8), 0.);
      vec3 rt = normalize(vec3(-sin(azc), 0., cos(azc))), up = cross(dir, rt);
      vec3 lp = p - c, q = vec3(dot(lp, rt), dot(lp, up), dot(lp, dir));
      q.xy = rot((h - .5) * .08 + e * (h - .5) * 2.5) * q.xy; q.yz = rot(e * (hash(vec2(h, ri)) - .5) * 2.) * q.yz;
      vec3 sz = vec3(colW * cos(elc) * .5 * (.94 + .05 * h) - .022, rowH * .5 - .022, .12);
      float d = sdRoundBox(q, sz - .05, .05);
      if (d < best) { best = d; gEdge = max(abs(q.x) / sz.x, abs(q.y) / sz.y); gHB = h; }
    }
  }
  return best + (noise(p.xz * 14. + p.y * 6.) - .5) * .0025;
}
vec2 map(vec3 p) {
  float mound = smoothstep(1.4, .9, length(p.xz)) * .04;
  vec2 res = vec2((p.y - dunes(p) * smoothstep(1.1, 2.4, length(p.xz)) + mound) * .8, 1.);
  /* the entrance: an arched tunnel of snow */
  vec3 tp = p - vec3(1.12, 0., 0.);
  float arch = max(length(tp.yz) - .36, -(length(tp.yz) - .22));
  arch = max(arch, abs(tp.x) - .2);
  arch = max(arch, -tp.y);
  res = U(res, vec2(arch - .015 + explode() * 3., 2.));
  res = U(res, vec2(max(length(tp.yz) - .225, max(abs(tp.x - .08) - .12, -tp.y)) + explode() * 3., 5.));
  /* the blocks sit in a shell around r = 1 (wider as they float apart): skip them when it's further than what we have */
  float b = abs(length(p) - 1.01) - .3 - explode() * 2.5;
  if (b < res.x) b = blocks(p);
  if (b < res.x) res = vec2(b, 2.);
  /* a penguin in a red scarf */
  vec3 pp = p - vec3(1.78, .0, .68);
  if (length(pp - vec3(0., .3, 0.)) - .4 > res.x) return res;
  pp.xz = rot(-.85) * pp.xz;
  float body = sdEllipsoid(pp - vec3(0., .24, 0.), vec3(.16, .24, .14));
  float head = sdSphere(pp - vec3(0., .5, .0), .11);
  float peng = smin(body, head, .07);
  peng = smin(peng, sdEllipsoid(vec3(abs(pp.x), pp.yz) - vec3(.15, .26, 0.), vec3(.03, .12, .06)), .02);
  if (peng < res.x) { res = vec2(peng, 3.); gPP = pp; }
  float beak = sdEllipsoid(pp - vec3(0., .48, .12), vec3(.035, .02, .05));
  float feet = sdEllipsoid(vec3(abs(pp.x), pp.yz) - vec3(.06, .01, .06), vec3(.045, .02, .07));
  if (min(beak, feet) < res.x) res = vec2(min(beak, feet), 4.);
  float scarf = sdTorus(pp - vec3(0., .4, 0.), vec2(.115, .028));
  scarf = min(scarf, sdRoundBox(pp - vec3(.07, .3, .1), vec3(.025, .08, .012), .01));
  if (scarf < res.x) res = vec2(scarf, 6.);
  return res;
}`,
    render: `
vec4 scene(vec2 uv) {
  vec2 sc = (uv - .5) * vec2(A, 1.);
  float yaw = .95 + uO.x + M.x * .1 + T * .02, pit = .24 + uO.y * .45 + M.y * .04;
  vec3 ta = vec3(.2, .42, 0.), ro = ta + 4.5 * fit() * vec3(cos(yaw) * cos(pit), sin(pit), sin(yaw) * cos(pit));
  vec3 rd = camera(ro, ta) * normalize(vec3(sc, 1.85));
  /* dusk: deep blue above, lavender at the horizon, a moon */
  vec3 hor = C(150, 150, 196), zen = C(36, 46, 96);
  vec3 skyc = mix(hor, zen, pow(sat(rd.y * 1.6 + .05), .7));
  vec3 Lm = normalize(vec3(-.25, .62, .75)), moonDir = normalize(vec3(-.6, .42, -.68));
  float md = dot(rd, moonDir);
  skyc += C(200, 210, 255) * pow(sat(md), 60.) * .6 + C(255, 250, 230) * smoothstep(.9994, .9997, md);
  if (fract(sin(dot(floor(rd.xy * 300.), vec2(12.9, 78.2))) * 43758.5) > .996 && rd.y > .1) skyc += vec3(.6);
  float az = atan(rd.z, rd.x);
  float ridge1 = .09 + .08 * fbm(vec2(az * 3., 1.)), ridge2 = .045 + .05 * fbm(vec2(az * 5., 4.));
  if (rd.y < ridge1) skyc = mix(C(96, 104, 150), skyc, .45);
  if (rd.y < ridge2) skyc = mix(C(76, 84, 128), skyc, .3);
  vec3 col = skyc; float sky = 1.;
  vec2 h = march(ro, rd, 30.);
  vec3 warm = C(255, 168, 88);
  vec3 door = vec3(1.42, .14, 0.);
  if (h.y > 0.) {
    sky = 0.;
    vec3 p = ro + rd * h.x, n = calcN(p);
    map(p);
    float m = h.y;
    float sh = softShadow(p + n * .01, Lm, 12.), ao = calcAO(p, n);
    vec3 base = m < 1.5 ? C(222, 228, 246) : m < 2.5 ? mix(C(226, 234, 250), C(206, 218, 244), gHB) : m < 3.5 ? C(40, 44, 62) : m < 4.5 ? C(255, 156, 60) : m < 5.5 ? C(20, 14, 20) : C(220, 54, 70);
    if (m > 2.5 && m < 3.5) {
      if (gPP.z > .04 && gPP.y < .42 && length((gPP.xy - vec2(0., .22)) * vec2(1., .7)) < .14) base = C(244, 244, 250);
      vec2 e = vec2(abs(gPP.x) - .045, gPP.y - .53);
      if (gPP.z > .06 && length(e) < .022) base = C(16, 16, 26);
      if (gPP.z > .06 && length(e - vec2(-.006, .007)) < .007) base = vec3(1.);
      if (gPP.z > .05 && length(vec2(abs(gPP.x) - .075, gPP.y - .47)) < .02) base = C(255, 150, 170);
    }
    if (m < 1.5) base *= .96 + .08 * noise(p.xz * 12.);
    col = softLight(base, p, n, rd, Lm, C(214, 220, 255), C(118, 132, 206), C(176, 166, 214), sh, ao);
    /* snow and ice let a little blue light through */
    if (m < 2.5) col += C(90, 130, 220) * .06 * (1. - sat(dot(n, Lm)));
    /* warm light from the doorway: pooling on the snow, catching the penguin and the tunnel */
    vec3 toD = door - p; float dd = length(toD);
    float wl = sat(dot(n, toD / dd) * .8 + .2) / (1. + dd * dd * 3.5);
    col += base * warm * wl * 1.9;
    if (m > 4.5 && m < 5.5) col = mix(warm * .9, C(255, 220, 160), .3);
    if (m > 1.5 && m < 2.5) {
      col += warm * smoothstep(.75, 1., gEdge) * explode() * 1.4;
      if (dot(n, normalize(p - vec3(0., .25, 0.))) < -.2) col = mix(col, warm * 1.05, .85);
    }
    /* sparkles in the snow */
    if (m < 2.5 && hash(floor(F * .9)) > .985 && dot(reflect(rd, n), Lm) > .2) col += vec3(.5);
    col = mix(col, skyc, 1. - exp(-h.x * h.x * .0045));
  }
  /* falling snow */
  for (int i = 0; i < 40; i++) {
    float fi = float(i), k = fract(T * (.04 + .03 * h1(fi)) + h1(fi + 1.));
    vec2 sp = vec2(fract(h1(fi + 2.) + .02 * sin(T * .7 + fi) - M.x * .01), 1. - k);
    float d = length((uv - sp) * vec2(A, 1.)) * uRes.y;
    col = mix(col, vec3(1.), smoothstep(1.8, .6, d) * .7);
  }
  return vec4(tone(col * 1.25), sky);
}`
  },

  /* ---------- Floating island ---------- */
  island: {
    title: 'Floating island', desc: 'A grassy island adrift above a sea of clouds: a cottage with a smoking chimney, a tree with a swing, a sheep, and a pond spilling over the edge.',
    map: `
vec3 gHQ, gSQ, gTQ;
float bob() { return sin(T * .9) * .05 + uK * .06 * sin(T * 14.); }
float rimR(float a) { return 1.16 + .07 * sin(a * 3. + 1.) + .04 * sin(a * 7. + 2.); }
float topH(vec2 xz) { return .06 + .08 * (1. - sat(dot(xz, xz) / 1.3)) + .012 * sin(xz.x * 4.) * sin(xz.y * 3.); }
/* the cottage, in its own frame with the door facing +z */
vec2 house(vec3 p, vec2 res) {
  vec3 q = p - vec3(.3, .1, .3); q.xz = rot(-.5) * q.xz;
  if (length(q - vec3(0., .45, 0.)) - .8 > res.x) return res;
  float walls = sdRoundBox(q - vec3(0., .15, 0.), vec3(.19, .15, .16), .02);
  if (walls < res.x) { res = vec2(walls, 5.); gHQ = q; }
  vec3 rq = q - vec3(0., .29, 0.);
  float roof = max(sdRoof(rq, .27, .19, .22), -sdRoof(rq + vec3(0., .045, 0.), .27, .19, .3)) - .008;
  if (roof * .8 < res.x) { res = vec2(roof * .8, 6.); gHQ = rq; }
  res = U(res, vec2(sdRoundBox(q - vec3(-.11, .45, -.07), vec3(.035, .08, .035), .006), 15.));
  vec3 wq = q - vec3(-.08, .2, .178);
  float door = sdRoundBox(q - vec3(.07, .1, .17), vec3(.045, .09, .012), .01);
  float box = sdRoundBox(q - vec3(-.08, .125, .19), vec3(.06, .014, .02), .004);
  float frame = sdTorus(vec3(wq.x, wq.z, wq.y), vec2(.048, .01));
  float mull = min(sdRoundBox(q - vec3(.205, .18, 0.), vec3(.014, .052, .006), 0.), sdRoundBox(q - vec3(.205, .18, 0.), vec3(.014, .006, .052), 0.));
  res = U(res, vec2(min(min(door, box), min(frame, mull)), 7.));
  res = U(res, vec2(min(sdCyl(vec3(wq.x, wq.z, wq.y), .006, .045), sdRoundBox(q - vec3(.2, .18, 0.), vec3(.014, .05, .05), 0.)), 8.));
  float fl = 1e9, st = 1e9;
  for (int i = 0; i < 3; i++) {
    float fi = float(i);
    fl = min(fl, sdSphere(q - vec3(-.12 + fi * .04, .155, .19), .02));
    st = min(st, sdCyl(q - vec3(.07 + .03 * sin(fi * 2.), .015, .32 + fi * .13), .012, .05 - fi * .005) - .006);
  }
  res = U(res, vec2(fl, 17.));
  res = U(res, vec2(st, 15.));
  /* smoke puffs, rising and fading */
  vec3 cq = q - vec3(-.11, .56, -.07);
  float sm = 1e9;
  for (int i = 0; i < 4; i++) {
    float fi = float(i), k = fract(T * .22 + fi * .25);
    sm = min(sm, sdSphere(cq - vec3(.06 * k + .02 * sin(T * 1.3 + fi * 2.), k * .5, .02 * cos(T + fi)), (.022 + .05 * k) * (1. - smoothstep(.7, 1., k))));
  }
  return U(res, vec2(sm, 14.));
}
vec2 treeU(vec3 t, vec2 res) {
  if (length(t - vec3(0., .55, 0.)) - .66 > res.x) return res;
  float trunk = sdCapsule(t, vec3(0., -.05, 0.), vec3(.04, .62, .02), .055 - .02 * sat(t.y / .6));
  trunk = smin(trunk, sdCapsule(t, vec3(.03, .38, .02), vec3(.34, .47, .17), .022), .04);
  trunk = smin(trunk, sdCapsule(t, vec3(0., .02, 0.), vec3(-.12, -.02, .05), .022), .05);
  trunk = smin(trunk, sdCapsule(t, vec3(0., .02, 0.), vec3(.06, -.02, -.12), .02), .05);
  if (trunk < res.x) { res = vec2(trunk, 3.); gTQ = t; }
  float lv = sdSphere(t - vec3(.03, .8, .02), .28);
  lv = smin(lv, sdSphere(t - vec3(-.2, .68, -.06), .2), .1);
  lv = smin(lv, sdSphere(t - vec3(.22, .7, .06), .19), .1);
  lv = smin(lv, sdSphere(t - vec3(.02, .66, .24), .18), .1);
  lv = smin(lv, sdSphere(t - vec3(-.04, .68, -.22), .18), .1);
  lv = smin(lv, sdSphere(t - vec3(.06, 1., 0.), .15), .1);
  lv += .022 * (noise(t.xy * 10. + t.z * 4.) - .5) + .008 * sin(t.x * 34.) * sin(t.y * 31.) * sin(t.z * 33.);
  if (lv * .85 < res.x) { res = vec2(lv * .85, 4.); gTQ = t; }
  float fr = min(min(sdSphere(t - vec3(.2, .86, .24), .032), sdSphere(t - vec3(-.17, .89, .21), .03)), min(sdSphere(t - vec3(.37, .64, .16), .03), sdSphere(t - vec3(-.34, .64, .08), .03)));
  res = U(res, vec2(min(fr, sdSphere(t - vec3(.08, .59, .4), .03)), 13.));
  /* a swing on the low branch */
  vec3 s = t - vec3(.29, .455, .146);
  s.yz = rot(sin(T * 1.4) * .22 + uK * .4 * sin(T * 6.)) * s.yz;
  res = U(res, vec2(sdCapsule(vec3(abs(s.x), s.yz), vec3(.05, 0., 0.), vec3(.05, -.29, 0.), .005), 16.));
  return U(res, vec2(sdRoundBox(s - vec3(0., -.3, 0.), vec3(.075, .008, .03), .006), 7.));
}
vec2 tree(vec3 p, vec2 res) { vec2 r = treeU((p - vec3(-.6, .1, .06)) / .85, vec2(res.x / .85, res.y)); return vec2(r.x * .85, r.y); }
vec2 sheep(vec3 p, vec2 res) {
  vec3 s = p - vec3(-.02, .1, .7); s.xz = rot(-.2) * s.xz;
  if (length(s - vec3(.03, .1, 0.)) - .26 > res.x) return res;
  float b = sdSphere(s - vec3(0., .12, 0.), .085);
  b = smin(b, sdSphere(s - vec3(.06, .125, .02), .07), .04);
  b = smin(b, sdSphere(s - vec3(-.065, .12, -.01), .07), .04);
  b = smin(b, sdSphere(s - vec3(0., .17, 0.), .066), .04);
  b = smin(b, sdSphere(s - vec3(.01, .12, .06), .062), .04);
  b = smin(b, sdSphere(s - vec3(-.01, .12, -.06), .062), .04);
  b += .006 * sin(s.x * 70.) * sin(s.y * 70.) * sin(s.z * 70.);
  if (b * .9 < res.x) { res = vec2(b * .9, 10.); gSQ = s; }
  vec3 hq = s - vec3(.12, .13, 0.);
  hq.xy = rot(-.25 - .3 * smoothstep(-.3, .3, sin(T * .7))) * hq.xy;
  float hd = sdEllipsoid(hq - vec3(.03, 0., 0.), vec3(.05, .042, .036));
  hd = min(hd, sdEllipsoid(vec3(hq.x, hq.y, abs(hq.z)) - vec3(0., .02, .045), vec3(.012, .01, .028)));
  float legs = sdCapsule(vec3(abs(s.x), s.y, abs(s.z)), vec3(.05, .07, .035), vec3(.05, 0., .035), .016);
  if (min(hd, legs) < res.x) { res = vec2(min(hd, legs), 11.); gSQ = hq; }
  return U(res, vec2(sdSphere(hq - vec3(.0, .045, 0.), .028), 10.));
}
vec2 shroom(vec3 p, vec3 c, float s, vec2 res) {
  vec3 q = (p - c) / s;
  if (length(q - vec3(0., .05, 0.)) - .1 > res.x / s) return res;
  res = U(res, vec2(sdCapsule(q, vec3(0.), vec3(0., .07, 0.), .014) * s, 19.));
  return U(res, vec2(max(sdEllipsoid(q - vec3(0., .066, 0.), vec3(.05, .04, .05)), .066 - q.y) * s, 12.));
}
vec2 map(vec3 p) {
  p.y -= bob();
  float r = length(p.xz), R = rimR(atan(p.z, p.x));
  float slab = smax(r - R, smax(p.y - topH(p.xz), -.16 - p.y, .06), .08);
  /* a pond, notched through the rim */
  vec3 pc = p - vec3(.52, .1, -.68);
  float pond = sdEllipsoid(pc, vec3(.32, .1, .26));
  slab = smax(slab, -pond, .04);
  vec2 res = vec2(slab * .9, 1.);
  res = U(res, vec2(max(pond, p.y - .065), 9.));
  /* the rocky underside, layered and tapering to a point */
  vec3 u = p - vec3(0., -.1, 0.);
  u.xz *= 1. + .6 * sat(-u.y);
  float under = max(sdEllipsoid(u, vec3(1.02, 1.02, 1.02)), u.y - .02);
  under += .07 * (noise(p.xz * 3. + p.y * 2.) - .5) + .025 * (noise(vec2(p.x * 5. + p.z * 4., p.y * 9.)) - .5) + .012 * sin(p.y * 30.);
  under = smin(under, sdEllipsoid(p - vec3(.28, -.9, .2), vec3(.09, .2, .09)), .12);
  under = smin(under, sdEllipsoid(p - vec3(-.3, -.72, -.28), vec3(.08, .16, .08)), .12);
  res = U(res, vec2(under * .55, 2.));
  /* the waterfall: a sheet curving out over the edge, ending in mist */
  vec3 w = vec3(dot(p.xz, vec2(.794, .607)), p.y, dot(p.xz, vec2(.607, -.794)));
  float fall = max(.065 - w.y, 0.);
  float sheet = length(vec2(max(abs(w.x) - .11 + .03 * sat(fall), 0.), w.z - 1.06 - .2 * sqrt(fall))) - .022;
  res = U(res, vec2(max(sheet, max(w.y - .07, -.85 - w.y)) * .7, 18.));
  float mist = 1e9;
  for (int i = 0; i < 4; i++) {
    float fi = float(i), k = fract(T * .3 + fi * .25);
    mist = min(mist, sdSphere(w - vec3((fi - 1.5) * .06, -.85 - k * .25, 1.25 + .05 * sin(fi * 3.)), (.06 + .03 * sin(fi * 5.)) * (1. - k)));
  }
  res = U(res, vec2(mist, 14.));
  res = house(p, res);
  res = tree(p, res);
  res = sheep(p, res);
  res = shroom(p, vec3(-.78, .08, -.24), 1., res);
  res = shroom(p, vec3(-.68, .09, -.32), .7, res);
  res = shroom(p, vec3(.12, .11, -.5), .85, res);
  /* little islets drifting around */
  for (int i = 0; i < 4; i++) {
    float fi = float(i), a = fi * 1.57 + .4 + T * .07, rr = 1.75 + .12 * fi;
    vec3 q = p - vec3(cos(a) * rr, -.35 + .25 * sin(T * .7 + fi * 2.) + .2 * mod(fi, 2.), sin(a) * rr);
    float s = .1 + .03 * fi;
    if (length(q) - s * 1.6 > res.x) continue;
    q.xz = rot(fi + T * .1) * q.xz;
    float rk = smax(sdEllipsoid(q, vec3(1.2, 1., 1.2) * s), q.y - .25 * s, .03);
    rk += .015 * (noise(q.xz * 18. + q.y * 9.) - .5);
    res = U(res, vec2(rk * .8, 2.));
  }
  return res;
}`,
    render: `
vec3 skyI(vec3 rd) {
  vec3 c = rd.y > 0. ? mix(C(255, 206, 196), C(118, 160, 248), pow(sat(rd.y * 2.6), .7)) : mix(C(255, 196, 190), C(122, 148, 236), pow(sat(-rd.y * 2.4), .55));
  float sd = sat(dot(rd, normalize(vec3(.55, .62, .5))));
  c += C(255, 220, 170) * (pow(sd, 8.) * .3 + pow(sd, 300.) * .8);
  if (rd.y < -.01) {
    /* a sea of clouds far below, lit pink from above */
    vec2 q = rd.xz / -rd.y * .5 + vec2(T * .02, 0.);
    float n = fbm(q), up = fbm(q + vec2(.06, .1));
    vec3 cc = mix(C(196, 176, 230), C(255, 244, 246), sat(.55 + (n - up) * 7.));
    c = mix(c, cc, smoothstep(.53, .58, n) * sat(-rd.y * 12.));
  } else {
    vec2 q = rd.xz / (rd.y + .08) * .3 + vec2(T * .01, 0.);
    float n = fbm(q) * smoothstep(.45, .1, rd.y);
    c = mix(c, mix(C(255, 222, 220), vec3(1.), sat((n - .46) * 6.)), smoothstep(.44, .52, n) * .9);
  }
  return c;
}
vec3 matCol(float m, vec3 p, vec3 n) {
  if (m < 1.5) {
    vec3 g = mix(C(92, 182, 84), C(168, 224, 104), fbm3(p.xz * 2.6)) * (.88 + .24 * noise(p.xz * 46.));
    float side = smoothstep(.62, .35, n.y + .12 * noise(p.xz * 14. + p.y * 9.));
    g = mix(g, mix(C(156, 108, 80), C(118, 84, 72), noise(p.xz * 20. + p.y * 20.)), side);
    vec2 fc = p.xz * 12., fi = floor(fc); float fh = hash(fi);
    if (side < .5 && fh > .86 && length(fract(fc) - .5 - (vec2(hash(fi + 3.), hash(fi + 7.)) - .5) * .5) < .11) g = fh > .96 ? C(255, 236, 110) : fh > .92 ? C(255, 150, 196) : C(255, 255, 255);
    return g;
  }
  if (m < 2.5) {
    vec3 r = mix(C(178, 136, 110), C(128, 94, 92), .5 + .5 * sin(p.y * 24. + noise(p.xz * 4.) * 3.));
    r = grain(mix(r, C(100, 76, 90), sat(-p.y - .2) * .6), p * 3., 6.);
    return mix(r, C(124, 198, 98), smoothstep(.6, .8, n.y));
  }
  if (m < 3.5) return C(146, 100, 74) * (.8 + .3 * noise(vec2(atan(gTQ.z, gTQ.x) * 5., gTQ.y * 14.)));
  if (m < 4.5) return mix(C(64, 152, 92), C(156, 214, 106), sat(n.y * .55 + .45)) * (.85 + .3 * noise(p.xy * 24. + p.z * 9.));
  if (m < 5.5) return gHQ.y < .045 ? grain(C(196, 186, 180), p, 40.) : grain(C(255, 244, 228), p, 30.);
  if (m < 6.5) {
    float row = floor(gHQ.y * 26.);
    return mix(C(240, 112, 102), C(214, 86, 94), hash(vec2(row, floor(gHQ.z * 13. + row * .5)))) * (.76 + .24 * smoothstep(0., .4, fract(gHQ.y * 26.)));
  }
  if (m < 7.5) return C(160, 104, 76) * (.86 + .14 * sin(p.x * 150. + noise(p.xz * 20.) * 3.));
  if (m < 8.5) return C(255, 206, 130);
  if (m < 9.5) return C(84, 176, 206);
  if (m < 10.5) return C(252, 249, 244) * (.9 + .1 * noise(p.xy * 60. + p.z * 30.));
  if (m < 11.5) {
    vec3 c = C(78, 66, 80);
    vec2 e = vec2(gSQ.y - .012, abs(gSQ.z) - .021);
    if (gSQ.x > .05 && length(e) < .011) c = length(e - vec2(-.002, 0.)) < .006 ? C(20, 16, 24) : vec3(1.);
    if (gSQ.x > .05 && length(vec2(gSQ.y + .014, abs(gSQ.z) - .03)) < .009) c = C(255, 150, 170);
    return c;
  }
  if (m < 12.5) return length(fract(n.xz * 3.5) - .5) < .2 && n.y > .3 ? vec3(1.) : C(236, 76, 80);
  if (m < 13.5) return C(255, 96, 124);
  if (m < 14.5) return C(250, 250, 255);
  if (m < 15.5) return grain(C(188, 174, 168), p, 30.);
  if (m < 16.5) return C(214, 178, 122);
  if (m < 17.5) return C(255, 120, 170);
  if (m < 18.5) return C(200, 236, 255);
  return C(252, 242, 224);
}
vec4 scene(vec2 uv) {
  vec2 sc = (uv - .5) * vec2(A, 1.);
  float yaw = .7 + uO.x + M.x * .15 + T * .06, pit = .36 + uO.y * .5 + M.y * .06;
  vec3 ta = vec3(0., -.04, 0.), ro = ta + 5.2 * fit() * vec3(cos(yaw) * cos(pit), sin(pit), sin(yaw) * cos(pit));
  mat3 cam = camera(ro, ta);
  vec3 rd = cam * normalize(vec3(sc, 2.));
  vec3 bg = skyI(rd), col = bg;
  float sky = 1., by = bob();
  vec3 L = normalize(vec3(.55, .62, .5));
  vec2 h = march(ro, rd, 20.);
  if (h.y > 0.) {
    sky = 0.;
    vec3 p = ro + rd * h.x, n = calcN(p);
    map(p);
    vec3 pl = p - vec3(0., by, 0.);
    float m = h.y;
    float sh = softShadow(p + n * .01, L, 10.), ao = calcAO(p, n);
    vec3 base = matCol(m, pl, n);
    col = softLight(base, p, n, rd, L, C(255, 226, 192), C(150, 176, 250), C(240, 196, 170), sh, ao);
    if (m > 3.5 && m < 4.5) col += C(170, 220, 90) * pow(sat(dot(rd, L)), 3.) * .3 * ao;
    if (m > 7.5 && m < 8.5) col = C(255, 190, 110) * 1.5;
    if (m > 8.5 && m < 9.5) {
      vec3 nw = normalize(n + vec3(noise(pl.xz * 22. + T) - .5, 0., noise(pl.xz * 22. - T * .8) - .5) * .35);
      float fr = .1 + .9 * pow(1. - sat(dot(nw, -rd)), 4.);
      col = mix(base * (.4 + .5 * sh), skyI(reflect(rd, nw)), fr) + pow(sat(dot(reflect(rd, nw), L)), 60.) * sh;
    }
    if (m > 13.5 && m < 14.5) col = mix(C(196, 196, 232), C(255, 250, 246), sat(dot(n, L) * .5 + .6));
    if (m > 17.5 && m < 18.5) {
      vec3 w = vec3(dot(pl.xz, vec2(.794, .607)), pl.y, dot(pl.xz, vec2(.607, -.794)));
      float st = smoothstep(.5, .85, noise(vec2(w.x * 50., w.y * 5. + T * 5.)));
      col = mix(C(110, 196, 244), vec3(1.15), .4 + .5 * st) * (.8 + .3 * sat(dot(n, L) + .5));
    }
    /* warm light from the cottage window */
    vec2 wo = rot(.5) * vec2(-.08, .32);
    vec3 toW = vec3(.3 + wo.x, .3 + by, .3 + wo.y) - p; float dw = length(toW);
    col += base * C(255, 170, 90) * sat(dot(n, toW / dw) * .7 + .3) / (1. + dw * dw * 40.) * .9;
    col = mix(col, bg, 1. - exp(-max(h.x - 4., 0.) * .06));
  }
  /* two butterflies over the flowers */
  for (int i = 0; i < 2; i++) {
    float fi = float(i);
    vec3 c = vec3(cos(T * .6 + fi * 3.) * .45 + .05, .32 + .07 * sin(T * 2.3 + fi) + by, sin(T * .8 + fi * 3.) * .4 + .1);
    vec3 v = (c - ro) * cam;
    if (v.z < .1 || (h.y > 0. && length(c - ro) > h.x)) continue;
    vec2 q = (sc - v.xy / v.z * 2.) * v.z / 2.;
    float flap = .25 + .75 * abs(sin(T * 13. + fi * 2.));
    float wing = length(vec2(abs(q.x) / flap - .016, q.y - .004) / vec2(.016, .014));
    wing = min(wing, length(vec2(abs(q.x) / flap - .011, q.y + .01) / vec2(.011, .009)));
    col = mix(col, fi < .5 ? C(255, 214, 90) : C(255, 170, 220), smoothstep(1.1, .9, wing));
  }
  return vec4(tone(col * 1.3), sky);
}`
  },

  /* ---------- Snow globe ---------- */
  snowglobe: {
    title: 'Snow globe', desc: 'A glass globe on a turned wooden base: a log cabin with glowing windows, snowy pines, a snowman in a knitted hat and a lamp post, with fairy lights behind. Click it and the snow swirls.',
    map: `
vec3 gCQ, gSM, gPQ;
float gh(vec2 x) { return -.5 + .035 * sin(x.x * 5. + 1.) * sin(x.y * 4.) + .015 * noise(x * 6.); }
vec2 cabin(vec3 p, vec2 res) {
  vec3 q = p - vec3(-.15, gh(vec2(-.15, -.12)) - .01, -.12); q.xz = rot(-.35) * q.xz;
  if (length(q - vec3(0., .25, 0.)) - .55 > res.x) return res;
  float walls = sdRoundBox(q - vec3(0., .13, 0.), vec3(.21, .13, .16), .012) + .004 * smoothstep(.5, 1., abs(cos(q.y * 78.5)));
  if (walls < res.x) { res = vec2(walls, 5.); gCQ = q; }
  vec3 rq = q - vec3(0., .26, 0.);
  res = U(res, vec2((max(sdRoof(rq, .29, .17, .21), -sdRoof(rq + vec3(0., .04, 0.), .29, .17, .3)) - .006) * .8, 6.));
  res = U(res, vec2((sdRoof(rq - vec3(0., .028, 0.), .29, .17, .225) - .014 - .004 * sin(rq.z * 50.) * sin(rq.x * 37.)) * .8, 1.));
  res = U(res, vec2(sdRoundBox(q - vec3(-.1, .36, -.07), vec3(.028, .07, .028), .004), 21.));
  res = U(res, vec2(sdRoundBox(q - vec3(-.1, .435, -.07), vec3(.032, .006, .032), .01), 1.));
  res = U(res, vec2(sdRoundBox(q - vec3(0., .075, .17), vec3(.045, .075, .008), .006), 9.));
  vec3 dq = q - vec3(0., .115, .182);
  res = U(res, vec2(sdTorus(vec3(dq.x, dq.z, dq.y), vec2(.021, .008)), 10.));
  vec3 wq = vec3(abs(q.x) - .12, q.y - .15, q.z - .168);
  res = U(res, vec2(min(sdRoundBox(wq, vec3(.035, .032, .004), .002), sdRoundBox(q - vec3(.218, .15, 0.), vec3(.004, .032, .035), .002)), 8.));
  float fr = min(sdRoundBox(wq, vec3(.04, .005, .008), .002), sdRoundBox(wq, vec3(.005, .036, .008), .002));
  fr = min(fr, sdRoundBox(wq - vec3(0., -.04, .006), vec3(.048, .006, .012), .003));
  res = U(res, vec2(fr, 6.));
  res = U(res, vec2(sdRoundBox(wq - vec3(0., -.031, .012), vec3(.044, .004, .01), .006), 1.));
  vec3 cq = q - vec3(-.1, .47, -.07);
  float sm = 1e9;
  for (int i = 0; i < 3; i++) {
    float fi = float(i), k = fract(T * .2 + fi / 3.);
    sm = min(sm, sdSphere(cq - vec3(.04 * k + .015 * sin(T + fi * 2.), k * .3, 0.), (.015 + .035 * k) * (1. - smoothstep(.6, 1., k))));
  }
  return U(res, vec2(sm, 22.));
}
vec2 pine(vec3 p, vec3 c, float s, vec2 res) {
  vec3 q = (p - vec3(c.x, gh(c.xz) - .02, c.z)) / s;
  if (length(q - vec3(0., .32, 0.)) - .4 > res.x / s) return res;
  res = U(res, vec2(sdCyl(q - vec3(0., .05, 0.), .06, .025) * s, 6.));
  float d = 1e9;
  for (int k = 0; k < 4; k++) {
    float fk = float(k);
    vec3 tq = q - vec3(0., .14 + fk * .12, 0.);
    float wob = .014 * sin(atan(tq.z, tq.x) * 9. + fk * 2.) * sat(-tq.y / .09 + .5);
    d = min(d, sdCone(tq, .09, .25 - fk * .05 + wob));
  }
  return U(res, vec2((d - .006) * .85 * s, 11.));
}
vec2 snowman(vec3 p, vec2 res) {
  vec3 q = p - vec3(.32, gh(vec2(.32, .34)) - .015, .34); q.xz = rot(.3) * q.xz;
  if (length(q - vec3(0., .24, 0.)) - .32 > res.x) return res;
  float b = smin(sdSphere(q - vec3(0., .1, 0.), .11), sdSphere(q - vec3(0., .25, 0.), .08), .03);
  b = smin(b, sdSphere(q - vec3(0., .37, 0.), .062), .02);
  if (b < res.x) { res = vec2(b, 13.); gSM = q; }
  vec3 nq = q - vec3(0., .37, .058);
  res = U(res, vec2(sdCone(vec3(nq.x, nq.z - .03, nq.y), .03, .026), 14.));
  float sc = min(sdTorus(q - vec3(0., .315, 0.), vec2(.058, .017)), sdRoundBox(q - vec3(.04, .25, .065), vec3(.017, .06, .008), .005));
  res = U(res, vec2(sc, 15.));
  vec3 hq = q - vec3(0., .38, 0.);
  float hat = min(max(sdSphere(hq, .066), .01 - hq.y), sdTorus(hq - vec3(0., .016, 0.), vec2(.062, .013)));
  if (hat < res.x) { res = vec2(hat, 16.); gSM = hq; }
  res = U(res, vec2(sdSphere(hq - vec3(0., .075, 0.), .022), 1.));
  vec3 aq = vec3(abs(q.x), q.yz);
  float arm = min(sdCapsule(aq, vec3(.07, .26, 0.), vec3(.19, .34, .02), .007), sdCapsule(aq, vec3(.155, .315, .015), vec3(.17, .37, .01), .005));
  return U(res, vec2(arm, 6.));
}
vec2 props(vec3 p, vec2 res) {
  /* a lamp post */
  vec3 q = p - vec3(-.52, gh(vec2(-.52, .28)) - .01, .28);
  if (length(q - vec3(0., .26, 0.)) - .3 < res.x) {
    float post = min(sdCyl(q - vec3(0., .2, 0.), .2, .009), sdCyl(q - vec3(0., .015, 0.), .015, .02));
    post = min(post, min(sdCone(q - vec3(0., .5, 0.), .022, .05), sdCyl(q - vec3(0., .405, 0.), .006, .028)));
    res = U(res, vec2(post, 17.));
    res = U(res, vec2(sdRoundBox(q - vec3(0., .44, 0.), vec3(.02, .03, .02), .004), 18.));
    res = U(res, vec2(sdRoundBox(q - vec3(0., .525, 0.), vec3(.012, .006, .012), .012), 1.));
  }
  /* a red sled with a present */
  q = p - vec3(.02, gh(vec2(.02, .56)) - .004, .56); q.xz = rot(.6) * q.xz;
  if (length(q) - .16 < res.x) {
    vec3 rq = vec3(abs(q.x) - .042, q.y, q.z);
    vec3 cq = rq - vec3(0., .03, .06);
    float run = min(sdRoundBox(rq - vec3(0., .006, -.01), vec3(.004, .004, .07), .002), max(abs(length(cq.yz) - .025) - .004, max(abs(cq.x) - .004, -cq.z)));
    run = min(run, sdRoundBox(vec3(rq.x, rq.y - .02, abs(rq.z + .01) - .04), vec3(.003, .012, .003), .001));
    res = U(res, vec2(run, 17.));
    res = U(res, vec2(sdRoundBox(q - vec3(0., .036, -.005), vec3(.056, .006, .07), .006), 9.));
    float gift = sdRoundBox(q - vec3(0., .072, -.015), vec3(.03, .026, .03), .004);
    if (gift < res.x) { res = vec2(gift, 19.); gPQ = q - vec3(0., .072, -.015); }
    vec3 bq = q - vec3(0., .104, -.015);
    res = U(res, vec2(sdEllipsoid(vec3(abs(bq.x) - .014, bq.y, bq.z), vec3(.016, .009, .007)), 9.));
  }
  /* a little fence along the back */
  float r = length(p.xz), a = atan(p.z, p.x);
  if (max(abs(r - .74) - .06, p.z - .05) < res.x) {
    float ac = clamp(floor(a / .3 + .5), -10., -1.) * .3;
    vec2 pc = vec2(cos(ac), sin(ac)) * .74;
    vec3 fq = vec3(p.x - pc.x, p.y - gh(pc), p.z - pc.y);
    float fen = sdRoundBox(fq - vec3(0., .07, 0.), vec3(.012, .07, .012), .004);
    float lim = max(a + .3, -3. - a) * .74;
    fen = min(fen, max(min(length(vec2(r - .74, p.y + .44)), length(vec2(r - .74, p.y + .395))) - .008, lim));
    res = U(res, vec2(fen, 6.));
    res = U(res, vec2(sdRoundBox(fq - vec3(0., .148, 0.), vec3(.01, .004, .01), .01), 1.));
  }
  return res;
}
vec2 map(vec3 p) {
  /* the snowy ground inside the glass */
  vec2 res = vec2(max(p.y - gh(p.xz), length(p) - .97), 1.);
  /* the turned wooden base, a brass ring and a plaque */
  if (p.y + .74 < res.x) {
    float r = length(p.xz), rr = mix(.9, .8, sat((p.y + 1.04) / .24));
    float body = smax(r - rr, abs(p.y + .92) - .12, .02);
    body = smax(body, -sdTorus(p - vec3(0., -.975, 0.), vec2(.885, .018)), .01);
    float wood = min(body, sdCyl(p - vec3(0., -1.08, 0.), .03, .96) - .02);
    wood = min(wood, sdCyl(p - vec3(0., -.795, 0.), .014, .83) - .008);
    res = U(res, vec2(wood, 2.));
    res = U(res, vec2(sdTorus(p - vec3(0., -.765, 0.), vec2(.79, .022)), 3.));
    vec3 pq = p - vec3(0., -.9, .845); pq.yz = rot(-.4) * pq.yz;
    if (sdRoundBox(pq, vec3(.17, .036, .008), .004) < res.x) { res = vec2(sdRoundBox(pq, vec3(.17, .036, .008), .004), 20.); gPQ = pq; }
  }
  res = U(res, vec2(p.y + 1.13, 4.));
  if (length(p) > 1.05) return res;
  res = cabin(p, res);
  res = pine(p, vec3(.44, 0., -.34), 1., res);
  res = pine(p, vec3(-.56, 0., -.3), .78, res);
  res = pine(p, vec3(.64, 0., .08), .55, res);
  res = snowman(p, res);
  return props(p, res);
}`,
    render: `
vec3 Lk() { return normalize(vec3(-.5, .75, .45)); }
/* the room around the globe, for the glass and the lacquer to reflect: a warm window, a lamp */
vec3 room(vec3 rd) {
  vec3 c = mix(C(30, 22, 38), C(82, 54, 70), sat(rd.y * .6 + .45));
  vec2 w = vec2(rd.z, rd.y) / max(-rd.x, .05);
  float win = rd.x < -.2 ? step(abs(w.x + .1), .5) * step(abs(w.y - .3), .5) : 0.;
  float mull = max(step(abs(w.x + .1), .025), step(abs(w.y - .3), .025));
  c = mix(c, C(255, 204, 150) * 1.7, win * (1. - mull));
  return c + C(255, 170, 110) * pow(sat(dot(rd, Lk())), 5.) * .3;
}
vec3 bokeh(vec2 sc) {
  vec3 c = vec3(0.);
  for (int i = 0; i < 14; i++) {
    float fi = float(i), u = fi / 13.;
    vec2 bp = vec2((u - .5) * 1.1 * A + .02 * sin(fi * 7.), .4 - .12 * (1. - pow(2. * u - 1., 2.)) + .02 * sin(fi * 3.));
    float d = length(sc - bp), r = .028 + .014 * h1(fi);
    float disc = smoothstep(r, r - .005, d) * (.55 + .45 * smoothstep(r * .4, r, d));
    vec3 lc = mod(fi, 3.) < 1. ? C(255, 186, 104) : mod(fi, 3.) < 2. ? C(255, 140, 136) : C(255, 226, 160);
    c += lc * disc * (.42 + .12 * sin(T * 1.5 + fi * 2.));
  }
  for (int i = 0; i < 8; i++) {
    float fi = float(i);
    vec2 bp = vec2((h1(fi + 20.) - .5) * A, h1(fi + 30.) * .6 - .35);
    float d = length(sc - bp), r = .05 + .03 * h1(fi + 40.);
    c += C(255, 170, 120) * smoothstep(r, r - .008, d) * .07;
  }
  return c;
}
vec3 matCol(float m, vec3 p, vec3 n) {
  if (m < 1.5) return C(238, 243, 255) * (.95 + .05 * noise(p.xz * 30.));
  if (m < 2.5) return C(122, 58, 44) * (.84 + .16 * sin(p.y * 140. + noise(p.xz * 6.) * 8.));
  if (m < 3.5) return C(236, 186, 96);
  if (m < 4.5) {
    float pl = floor(p.z * 2.5), fw = exp(-length(p.xz) * .5);
    return mix(C(128, 82, 62), C(110, 70, 56), hash(vec2(pl, 1.))) * (1. - fw * .12 * (noise(vec2(p.x * 3., p.z * 40.)) - .5)) * mix(1., smoothstep(.0, .12, abs(fract(p.z * 2.5) - .5) * 2.) * .3 + .7, fw);
  }
  if (m < 5.5) return C(170, 104, 70) * (.7 + .3 * smoothstep(0., .35, abs(fract(gCQ.y * 25.) - .5) * 2.)) * (.9 + .1 * noise(gCQ.xz * 60.));
  if (m < 6.5) return C(96, 60, 48);
  if (m < 8.5) return C(255, 206, 130);
  if (m < 9.5) return C(214, 62, 66);
  if (m < 10.5) return C(56, 140, 84);
  if (m < 11.5) return n.y > .45 + .35 * noise(p.xz * 40. + p.y * 20.) ? C(238, 243, 255) : C(44, 112, 92) * (.8 + .3 * noise(p.xz * 30. + p.y * 40.));
  if (m < 13.5) {
    vec3 c = C(242, 246, 255);
    vec3 q = gSM;
    if (q.z > .03 && length(vec2(abs(q.x) - .022, q.y - .388)) < .009) c = C(30, 26, 34);
    if (q.z > .06 && min(length(vec2(q.x, q.y - .23)), length(vec2(q.x, q.y - .275))) < .011) c = C(30, 26, 34);
    if (q.z > .03 && length(vec2(abs(q.x) - .036, q.y - .36)) < .013) c = mix(c, C(255, 160, 170), .6);
    float ma = atan(q.x, .37 - q.y);
    if (q.z > .03 && abs(length(vec2(q.x, q.y - .37)) - .03) < .005 && abs(ma) < .8 && fract(ma * 2.4 + .5) < .45) c = C(30, 26, 34);
    return c;
  }
  if (m < 14.5) return C(255, 136, 48);
  if (m < 15.5) return C(220, 58, 70) * (.86 + .14 * sin(p.y * 260.));
  if (m < 16.5) return mix(C(250, 190, 76), C(240, 112, 96), step(.5, fract(gSM.y * 40.))) * (.88 + .12 * sin(atan(gSM.z, gSM.x) * 40.));
  if (m < 17.5) return C(40, 36, 46);
  if (m < 18.5) return C(255, 220, 150);
  if (m < 19.5) return min(abs(gPQ.x), abs(gPQ.z)) < .007 ? C(214, 62, 66) : C(70, 150, 130);
  if (m < 20.5) return C(236, 186, 96) * (abs(gPQ.x) < .13 && abs(gPQ.y) < .014 && abs(gPQ.y) > .004 && mod(floor(gPQ.x * 90.), 3.) > .5 ? .55 : 1.);
  if (m < 21.5) return grain(C(170, 160, 160), p, 50.);
  return C(240, 240, 250);
}
vec3 shadeHit(vec3 p, vec3 rd, float m) {
  vec3 n = calcN(p);
  map(p);
  vec3 L = Lk();
  float sh = softShadow(p + n * .01, L, 10.), ao = calcAO(p, n);
  vec3 base = matCol(m, p, n);
  vec3 col = softLight(base, p, n, rd, L, C(255, 232, 206) * .95, C(140, 150, 214), C(200, 170, 190), sh, ao);
  if (m > 1.5 && m < 3.5 || m > 19.5 && m < 20.5) {
    float fr = pow(1. - sat(dot(n, -rd)), 4.);
    vec3 env = room(reflect(rd, n));
    col = m < 2.5 ? col + env * (.06 + .5 * fr) : base * (env * 1.3 + .12) * (.4 + .6 * ao) + pow(sat(dot(reflect(rd, n), L)), 40.) * sh;
  }
  if (m > 3.5 && m < 4.5) col = mix(C(26, 18, 30), col, exp(-max(length(p.xz) - .9, 0.) * .9));
  if (m < 1.5 || m > 12.5 && m < 13.5) {
    col += C(80, 110, 200) * .05 * (1. - sat(dot(n, L)));
    if (hash(floor(F * .9)) > .986 && dot(reflect(rd, n), L) > .1) col += vec3(.5);
  }
  if (m > 7.5 && m < 8.5) col = C(255, 196, 110) * 1.6;
  if (m > 17.5 && m < 18.5) col = C(255, 214, 140) * 2.;
  if (m > 21.5) col = mix(C(170, 170, 200), C(250, 248, 255), sat(dot(n, L) * .5 + .6));
  /* warm light from the cabin windows and the lamp */
  vec2 wo = rot(.35) * vec2(0., .32);
  vec3 tw = vec3(-.15 + wo.x, gh(vec2(-.15, -.12)) + .14, -.12 + wo.y) - p, tl = vec3(-.52, gh(vec2(-.52, .28)) + .43, .28) - p;
  float dw = length(tw), dl = length(tl);
  vec3 warm = C(255, 168, 88);
  col += base * warm * (sat(dot(n, tw / dw) * .7 + .3) / (1. + dw * dw * 30.) * 1.3 + sat(dot(n, tl / dl) * .7 + .3) / (1. + dl * dl * 30.) * 1.6);
  return col;
}
vec4 scene(vec2 uv) {
  vec2 sc = (uv - .5) * vec2(A, 1.);
  float yaw = 1.57 + uO.x + M.x * .12 + sin(T * .2) * .12, pit = .17 + uO.y * .4 + M.y * .05;
  vec3 ta = vec3(0., -.17, 0.), ro = ta + 5.3 * fit() * vec3(cos(yaw) * cos(pit), sin(pit), sin(yaw) * cos(pit));
  vec3 rd = camera(ro, ta) * normalize(vec3(sc, 2.));
  vec3 bg = room(rd) * .75 + bokeh(sc);
  vec3 col = bg; float sky = 1.;
  float b = dot(ro, rd), c = dot(ro, ro) - 1., disc = b * b - c;
  float t0 = disc > 0. ? -b - sqrt(disc) : 1e3;
  /* everything outside the glass first: the base and the table */
  vec2 h = march(ro, rd, min(t0, 14.));
  if (h.y > 0.) { sky = 0.; col = shadeHit(ro + rd * h.x, rd, h.y); }
  else if (t0 < 1e3) {
    sky = 0.;
    vec3 pg = ro + rd * t0, gn = normalize(pg);
    vec3 rd2 = refract(rd, gn, .93);
    vec2 h2 = march(pg, rd2, 2.2);
    gT = t0 + (h2.y > 0. ? h2.x : .6);
    col = h2.y > 0. ? shadeHit(pg + rd2 * h2.x, rd2, h2.y) : room(rd2) * .7;
    /* snow inside, swirling harder after a poke */
    float swirl = .3 + uK * 3.;
    for (int i = 0; i < 48; i++) {
      float fi = float(i), a = fi * 2.4 + T * (.2 + swirl * .3) * (h1(fi) - .3);
      float y = mix(.75, -.5, fract(h1(fi + 3.) + T * .035 * (1. + swirl)));
      float rr = .8 * sqrt(h1(fi + 1.)) * sqrt(max(1. - y * y, 0.));
      vec3 w = vec3(cos(a) * rr, y, sin(a) * rr) - pg;
      float along = dot(w, rd2);
      if (along < 0. || (h2.y > 0. && along > h2.x)) continue;
      float s = .007 + .01 * h1(fi + 9.);
      col = mix(col, vec3(1.08), smoothstep(s, s * .3, length(w - rd2 * along)) * .9);
    }
    /* the glass: a darker rim, the room reflected, highlights */
    float ct = sat(dot(-rd, gn));
    col = mix(col, C(28, 26, 44), smoothstep(.2, .04, ct) * .4);
    float fres = .04 + .96 * pow(1. - ct, 5.);
    vec3 rr = reflect(rd, gn);
    col = mix(col, room(rr), fres) + C(255, 236, 214) * pow(sat(dot(rr, Lk())), 300.) * 3. + C(255, 210, 160) * pow(sat(dot(rr, normalize(vec3(-1., .3, -.1)))), 60.) * .5;
  }
  return vec4(tone(col * 1.2), sky);
}`
  },

  /* ---------- Jelly blobs ---------- */
  blobs: {
    title: 'Jelly blobs', desc: 'A family of glossy jelly blobs hopping around a pastel studio, squashing as they land and melting into each other. The big one watches your cursor; click and they all jump.',
    map: `
/* the studio: a floor curving up into a wall */
float cyc(vec3 p) {
  vec2 q = vec2(p.z + 1.6, p.y - 1.);
  if (q.x < 0. && q.y < 0.) return 1. - length(q);
  return min(p.y, q.x + 1.);
}
float hopC(float ph) { return 1. - smoothstep(0., .3, abs(sin(ph))); }
/* blob i: its centre and radii, squashed as it lands */
void blobE(int i, out vec3 c, out vec3 rad) {
  float fi = float(i);
  if (i == 0) {
    float ph = T * 2.2, k = hopC(ph) * .6 + uK * .3 * sin(T * 18.);
    rad = .62 * vec3(1.08 + .12 * k, .9 * (1. - .2 * k), 1. + .12 * k);
    c = vec3(M.x * .55, rad.y + abs(sin(ph)) * (.05 + uK * .45), .15);
    return;
  }
  float a = fi * 1.2566 + T * .22 * (mod(fi, 2.) < .5 ? 1. : -.7), rr = 1.05 + .1 * fi, r = .14 + .025 * fi;
  float ph = T * (2.6 + .3 * fi) + fi * 1.7, k = hopC(ph);
  rad = r * vec3(1. + .14 * k, 1. - .24 * k, 1. + .14 * k);
  c = vec3(cos(a) * rr + M.x * .2, rad.y + abs(sin(ph)) * (.22 + uK * .5), sin(a) * rr * .7 + .1);
}
vec2 map(vec3 p) {
  vec2 res = vec2(cyc(p), 1.);
  float d = 1e9;
  for (int i = 0; i < 6; i++) { vec3 c, rad; blobE(i, c, rad); d = smin(d, sdEllipsoid(p - c, rad), .18); }
  d += .008 * sin(p.x * 8. + T * 3.) * sin(p.y * 7. - T * 2.) * sin(p.z * 9.) * (1. + uK * 4.);
  return U(res, vec2(d, 2.));
}`,
    render: `
vec3 blobCol(int i) {
  if (i == 0) return C(255, 128, 176);
  if (i == 1) return C(84, 222, 184);
  if (i == 2) return C(166, 132, 255);
  if (i == 3) return C(255, 164, 104);
  if (i == 4) return C(255, 210, 84);
  return C(104, 180, 255);
}
/* each point takes the colour of the blobs nearest it, blended where they melt together */
vec3 mixCol(vec3 p, float k) {
  vec3 acc = vec3(0.); float ws = 0.;
  for (int i = 0; i < 6; i++) {
    vec3 c, rad; blobE(i, c, rad);
    float w = exp(-max(sdEllipsoid(p - c, rad), 0.) * k);
    acc += w * blobCol(i); ws += w;
  }
  return acc / max(ws, 1e-4);
}
vec3 studio(vec3 rd) { return mix(C(255, 218, 230), C(206, 198, 255), sat(rd.y * .8 + .4)); }
/* faces: big eyes with highlights and a little mouth on the big one, dots on the small ones */
vec3 face(vec3 p, vec3 base) {
  vec3 c, rad; blobE(0, c, rad);
  vec3 lp = p - c; lp.xz = rot(-M.x * .35) * lp.xz;
  vec2 e = lp.xy / rad.xy;
  if (lp.z > .3 * rad.z && sdEllipsoid(p - c, rad) < .04) {
    float blink = smoothstep(.0, .04, abs(fract(T * .21) - .5) - .45) > 0. ? .15 : 1.;
    vec2 ey = vec2(abs(e.x) - .3, e.y - .14);
    float eye = length(ey / vec2(.1, .13 * blink));
    if (eye < 1.) {
      base = C(46, 32, 52);
      if (blink > .5 && length(ey - vec2(-.03, .05)) < .04) base = vec3(1.);
      if (blink > .5 && length(ey - vec2(.035, -.04)) < .018) base = vec3(1.);
    }
    vec2 mq = vec2(abs(e.x), e.y + .06);
    if (abs(length(mq - vec2(.05, .02)) - .05) < .016 && mq.y < .025) base = C(46, 32, 52);
    if (length((vec2(abs(e.x) - .5, e.y + .02)) / vec2(.1, .06)) < 1.) base = mix(base, C(255, 110, 150), .55);
  }
  for (int i = 1; i < 6; i++) {
    blobE(i, c, rad);
    lp = p - c; e = lp.xy / rad.xy;
    if (sdEllipsoid(lp, rad) > .03) continue;
    if (lp.z > .5 * rad.z && length(vec2(abs(e.x) - .3, e.y - .15) / vec2(1., 1.25)) < .11) base = C(46, 32, 52);
    if (lp.z > .5 * rad.z && length(vec2(abs(e.x) - .5, e.y + .05)) < .12) base = mix(base, C(255, 120, 160), .4);
  }
  return base;
}
vec4 scene(vec2 uv) {
  vec2 sc = (uv - .5) * vec2(A, 1.);
  float yaw = 1.57 + uO.x + M.x * .1, pit = .3 + uO.y * .4 + M.y * .05;
  vec3 ta = vec3(0., .42, 0.), ro = ta + 5.2 * fit() * vec3(cos(yaw) * cos(pit), sin(pit), sin(yaw) * cos(pit));
  vec3 rd = camera(ro, ta) * normalize(vec3(sc, 1.9));
  vec3 col = studio(rd); float sky = 1.;
  vec3 L = normalize(vec3(-.5, .85, .55));
  vec2 h = march(ro, rd, 16.);
  if (h.y > 0.) {
    sky = 0.;
    vec3 p = ro + rd * h.x, n = calcN(p);
    float sh = softShadow(p + n * .01, L, 6.), ao = calcAO(p, n);
    if (h.y < 1.5) {
      vec3 base = mix(C(255, 220, 232), C(214, 204, 255), sat(p.y * .45 + max(-p.z - 1.6, 0.) * .5));
      col = softLight(base, p, n, rd, L, C(255, 244, 236), C(220, 210, 255), C(255, 220, 230), sh, ao);
      /* shadows and contact pick up the colour of the jelly */
      vec3 tint = mixCol(p, 3.);
      col *= mix(vec3(1.), tint * 1.05, sat((1. - sh) * .45 + (1. - ao) * .6));
      col += tint * .12 * exp(-p.y * 3.) * (1. - ao);
    } else {
      vec3 base = face(p, mixCol(p, 14.));
      float wrap = sat((dot(n, L) + .5) / 1.5), fr = pow(1. - sat(dot(n, -rd)), 3.);
      col = base * (.42 + .72 * wrap * mix(.55, 1., sh)) * mix(.7, 1., ao);
      col += base * base * fr * .7;
      /* thin edges let light through */
      col += base * .3 * (1. - sat(-map(p - n * .2).x * 6.));
      vec3 r = reflect(rd, n);
      col += C(255, 250, 245) * (pow(sat(dot(r, L)), 90.) * 1.6 + pow(sat(dot(r, L)), 12.) * .12) * mix(.3, 1., sh);
      col += C(210, 226, 255) * pow(sat(dot(r, normalize(vec3(.8, .3, -.4)))), 30.) * .5;
      col += studio(r) * fr * .3;
    }
    col = mix(col, studio(rd), 1. - exp(-max(h.x - 6., 0.) * .1));
  }
  /* sparkles drifting up */
  for (int i = 0; i < 8; i++) {
    float fi = float(i), k = fract(T * .05 + h1(fi));
    vec2 sp = vec2((h1(fi + 5.) - .5) * A * .9 + .03 * sin(T + fi), k * 1.1 - .55);
    vec2 d = abs(sc - sp) * uRes.y;
    float tw = .5 + .5 * sin(T * 3. + fi * 2.), s = (2. + 3. * h1(fi + 8.)) * tw;
    float st = max(smoothstep(1.2, 0., d.x) * smoothstep(s, 0., d.y), smoothstep(1.2, 0., d.y) * smoothstep(s, 0., d.x));
    col = mix(col, vec3(1.), st * sin(k * 3.14) * .9);
  }
  return vec4(tone(col * 1.12), sky);
}`
  },

  /* ---------- Tiny planet ---------- */
  planet: {
    title: 'Tiny planet', desc: 'A little world turning in space: continents and seas, snowy poles, villages and woods, a windmill, a lighthouse sweeping its beam, clouds drifting round and a sleepy moon. Drag to spin it.',
    map: `
const vec3 WM = vec3(.36, .52, .77);
const vec3 LH = vec3(-.62, .2, .76);
float spin() { return T * .12 + uO.x; }
float cont(vec3 d) {
  float c = 1.6 * sin(d.x * 2.3 + 1.) * sin(d.y * 2.6 + .5) * sin(d.z * 2.1 + 2.);
  c += .6 * sin(d.x * 4.3 + d.z * 3.1 + 1.) * sin(d.y * 3.9 - 1.);
  c += .3 * sin(d.x * 8.1 - d.y * 7.3 + 2.) * sin(d.z * 7.7 + 1.);
  return c + .3 + 1.2 * exp(-dot(d - WM, d - WM) * 10.) + 1.6 * exp(-dot(d - LH, d - LH) * 60.) - .9 * exp(-dot(d - LH, d - LH) * 6.);
}
float groundH(vec3 d) {
  float c = cont(d);
  return .985 + .065 * smoothstep(0., .3, c) + .05 * smoothstep(.7, 1.4, c) * (.5 + .5 * sin(d.x * 23.) * sin(d.y * 21.) * sin(d.z * 19.));
}
/* a frame sitting on the surface at direction d, y pointing up */
vec3 frameQ(vec3 q, vec3 d, float h) {
  vec3 t = normalize(cross(d, abs(d.y) < .9 ? vec3(0., 1., 0.) : vec3(1., 0., 0.))), b = cross(d, t);
  vec3 v = q - d * h;
  return vec3(dot(v, t), dot(v, d), dot(v, b));
}
vec3 moonC() { float a = T * .22 + 1.; return vec3(cos(a) * 2.05, .3 * sin(a) + .2, sin(a) * 2.05); }
/* trees and houses, one per cell of a latitude-longitude grid; the four nearest cells are checked */
vec2 dressing(vec3 q, float r, vec2 res) {
  vec3 d = q / r;
  float u = atan(d.z, d.x) / 6.2832 * 26., v = (asin(clamp(d.y, -1., 1.)) / 3.1416 + .5) * 14.;
  for (int k = 0; k < 4; k++) {
    float ci = floor(u - .5) + mod(float(k), 2.), cj = floor(v - .5) + floor(float(k) / 2.);
    float hs = hash(vec2(mod(ci, 26.), cj)), thc = (ci + .5) / 26. * 6.2832, phc = ((cj + .5) / 14. - .5) * 3.1416;
    if (abs(phc) > .95 || hs < .3) continue;
    vec3 cd = vec3(cos(phc) * cos(thc), sin(phc), cos(phc) * sin(thc));
    if (length(q - cd * 1.08) - .2 > res.x || dot(cd, WM) > .96 || dot(cd, LH) > .96 || cont(cd) < .3) continue;
    vec3 lq = frameQ(q, cd, groundH(cd) - .008);
    lq.xz = rot(hs * 40.) * lq.xz;
    float s = min(1., cos(phc) * 1.5) * (.8 + .4 * fract(hs * 13.));
    lq /= s;
    if (hs < .74) {
      res = U(res, vec2(sdCapsule(lq, vec3(0.), vec3(0., .06, 0.), .011) * s, 3.));
      res = U(res, vec2(smin(sdSphere(lq - vec3(0., .09, 0.), .048), sdSphere(lq - vec3(.025, .072, .01), .034), .02) * s, 4.));
    } else if (hs < .9) {
      res = U(res, vec2(sdCapsule(lq, vec3(0.), vec3(0., .03, 0.), .01) * s, 3.));
      res = U(res, vec2(min(sdCone(lq - vec3(0., .07, 0.), .045, .07), sdCone(lq - vec3(0., .11, 0.), .035, .05)) * s, 5.));
    } else {
      res = U(res, vec2(sdRoundBox(lq - vec3(0., .03, 0.), vec3(.04, .03, .032), .004) * s, 6.));
      res = U(res, vec2(sdRoof(lq - vec3(0., .058, 0.), .055, .04, .04) * .8 * s, 7.));
      res = U(res, vec2(sdRoundBox(lq - vec3(.015, .032, .033), vec3(.011, .011, .003), .001) * s, 8.));
    }
  }
  return res;
}
vec2 landmarks(vec3 q, vec2 res) {
  /* a windmill */
  vec3 w = frameQ(q, WM, groundH(WM) - .01);
  if (length(w - vec3(0., .12, 0.)) - .2 < res.x) {
    res = U(res, vec2(max(sdCone(w - vec3(0., .08, 0.), .08, .05), w.y - .13) - .003, 6.));
    res = U(res, vec2(sdCone(w - vec3(0., .158, 0.), .03, .046), 7.));
    res = U(res, vec2(sdRoundBox(w - vec3(0., .018, .042), vec3(.012, .018, .004), .002), 12.));
    vec3 bq = w - vec3(0., .13, .05);
    bq.xy = rot(T * 1.6 + uK * 6.) * bq.xy;
    float a = mod(atan(bq.y, bq.x) + .7854, 1.5708) - .7854, l = length(bq.xy);
    vec3 b2 = vec3(l * cos(a), l * sin(a), bq.z);
    float blade = sdRoundBox(b2 - vec3(.065, .008, 0.), vec3(.05, .016, .002), .002);
    blade = min(blade, sdRoundBox(b2 - vec3(.06, 0., 0.), vec3(.06, .003, .003), .001));
    res = U(res, vec2(min(blade, sdSphere(bq, .012)), 10.));
  }
  /* a lighthouse on its own islet */
  vec3 lq = frameQ(q, LH, groundH(LH) - .01);
  if (length(lq - vec3(0., .1, 0.)) - .16 < res.x) {
    float tower = max(length(lq.xz) - (.032 - .07 * lq.y * .15), abs(lq.y - .07) - .07);
    res = U(res, vec2(tower - .002, 11.));
    res = U(res, vec2(sdCyl(lq - vec3(0., .158, 0.), .016, .019), 8.));
    res = U(res, vec2(min(sdCone(lq - vec3(0., .188, 0.), .016, .03), sdCyl(lq - vec3(0., .142, 0.), .004, .034)), 12.));
  }
  return res;
}
vec2 map(vec3 p) {
  vec2 res = vec2(1e9, 0.);
  vec3 q = p; q.xz = rot(spin()) * q.xz;
  float r = length(q);
  if (r < 1.3) {
    vec3 d = q / r;
    res = vec2((r - groundH(d)) * .8, 1.);
    res = U(res, vec2(r - 1., 2.));
    res = dressing(q, r, res);
    res = landmarks(q, res);
  } else res = vec2(r - 1.22, 0.);
  /* clouds drifting round */
  for (int i = 0; i < 5; i++) {
    float fi = float(i), a = fi * 1.26 + T * .16;
    vec3 c = normalize(vec3(cos(a), sin(fi * 2.1) * .55, sin(a))) * 1.34;
    if (length(p - c) - .2 > res.x) continue;
    vec3 tv = normalize(cross(c, vec3(0., 1., 0.))), cp = p - c;
    vec3 up = normalize(c);
    float cl = smin(sdSphere(cp, .065), sdSphere(cp - tv * .075, .05), .04);
    cl = smin(cl, sdSphere(cp + tv * .07, .045), .04);
    cl = smin(cl, sdSphere(cp - up * .045 + tv * .02, .052), .04);
    cl = smin(cl, sdSphere(cp - up * .03 - tv * .04, .04), .03);
    cl = smax(cl, -(dot(cp, up) + .035), .02);
    res = U(res, vec2(cl, 9.));
  }
  return U(res, vec2(sdSphere(p - moonC(), .2), 13.));
}`,
    render: `
vec3 space(vec2 sc, vec2 uv) {
  vec3 bg = mix(C(42, 30, 86), C(12, 12, 36), uv.y);
  float n = fbm(sc * 1.6 + vec2(T * .005, 0.));
  bg += C(150, 70, 160) * .22 * smoothstep(.45, .8, n) + C(60, 110, 200) * .16 * smoothstep(.5, .85, fbm(sc * 2.3 + 7.));
  return stars(bg, .006, C(255, 248, 226));
}
vec4 scene(vec2 uv) {
  vec2 sc = (uv - .5) * vec2(A, 1.);
  float pit = .3 + uO.y * .5 + M.y * .08, yaw = 1.57 + M.x * .15;
  vec3 ro = 5.5 * fit() * vec3(cos(yaw) * cos(pit), sin(pit), sin(yaw) * cos(pit));
  mat3 cam = camera(ro, vec3(0.));
  vec3 rd = cam * normalize(vec3(sc, 1.9));
  vec3 bg = space(sc, uv), col = bg; float sky = 1.;
  vec3 L = normalize(vec3(-.85, .4, .25));
  vec2 h = march(ro, rd, 12.);
  float hitT = h.y > 0. ? h.x : 1e3;
  if (h.y > 0.) {
    sky = 0.;
    vec3 p = ro + rd * h.x, n = calcN(p);
    float m = h.y;
    vec3 pl = p; pl.xz = rot(spin()) * pl.xz;
    vec3 d = normalize(pl); float c = cont(d), rr = length(pl);
    float sh = softShadow(p + n * .01, L, 10.), ao = calcAO(p, n);
    vec3 base = vec3(1.);
    if (m < 1.5) {
      base = mix(C(120, 204, 96), C(64, 150, 88), smoothstep(.3, 1., c + .35 * noise(d.xy * 9. + d.z * 5.)));
      base = mix(base, C(250, 226, 170), smoothstep(1.008, .998, rr));
      base = mix(base, C(170, 150, 140), smoothstep(.95, 1.25, c) * .7);
      base = mix(base, C(250, 252, 255), max(smoothstep(.8, .86, abs(d.y) + .06 * noise(d.xz * 12.)), smoothstep(1.25, 1.45, c)));
    } else if (m < 2.5) {
      base = mix(C(46, 100, 200), C(72, 200, 214), smoothstep(-.3, .3, c)) * (.92 + .16 * noise(d.xy * 40. + d.z * 20. + T * .3));
      base = mix(base, vec3(1.), smoothstep(.05, .0, abs(c - .07 + .03 * sin(T * 2. + d.x * 30.))) * .6);
    } else if (m < 3.5) base = C(140, 96, 70);
    else if (m < 4.5) base = mix(C(96, 190, 96), C(150, 214, 96), noise(pl.xy * 30.));
    else if (m < 5.5) base = C(52, 138, 100);
    else if (m < 6.5) base = C(255, 244, 228);
    else if (m < 7.5) base = C(236, 96, 96);
    else if (m < 8.5) base = C(255, 206, 130);
    else if (m < 9.5) base = vec3(1.);
    else if (m < 10.5) base = C(250, 236, 210);
    else if (m < 11.5) { vec3 lq = frameQ(pl, LH, groundH(LH) - .01); base = fract(lq.y * 26.) < .5 ? C(236, 70, 76) : vec3(1.); }
    else if (m < 12.5) base = C(60, 56, 70);
    else {
      vec3 lp = p - moonC();
      base = C(244, 236, 216) * (1. - .25 * smoothstep(.55, .7, noise(normalize(lp).xy * 5. + normalize(lp).z * 3.)));
      vec2 e = vec2(dot(lp, cam[0]), dot(lp, cam[1])) / .2;
      if (dot(lp, -rd) > 0.) {
        vec2 ey = vec2(abs(e.x) - .32, e.y - .12);
        if (abs(length(ey - vec2(0., .1)) - .13) < .035 && ey.y < .1) base = C(80, 66, 90);
        if (length(vec2(abs(e.x) - .5, e.y + .12) / vec2(1., .7)) < .13) base = mix(base, C(255, 150, 160), .6);
        if (abs(length(e - vec2(0., .02)) - .1) < .03 && e.y < -.02) base = C(80, 66, 90);
      }
    }
    /* sunlight, a cool fill from space, a warm band at the terminator */
    float ndl = dot(n, L), wrap = sat((ndl + .25) / 1.25);
    vec3 nrm = m > 12.5 ? n : normalize(pl);
    float day = sat(dot(normalize(p), L) * 2.5 + .3);
    col = base * (C(255, 238, 214) * 1.25 * mix(wrap, sat(ndl), .5) * sh + C(70, 84, 170) * .32 * ao + C(255, 150, 120) * .25 * exp(-abs(dot(m > 12.5 ? n : normalize(p), L)) * 6.) * ao);
    col += C(255, 250, 240) * pow(sat(dot(reflect(rd, n), L)), m > 1.5 && m < 2.5 ? 70. : 30.) * (m > 1.5 && m < 2.5 ? .9 : .12) * sh;
    if (m > 7.5 && m < 8.5) col = C(255, 190, 110) * (.5 + 1.4 * (1. - day));
    if (m > 8.5 && m < 9.5) col = mix(C(150, 150, 210), C(255, 252, 248), sat(ndl * .6 + .5)) * (.35 + .65 * day);
    /* little lights in the villages on the night side */
    if (m < 1.5 && c > .3 && hash(floor(d.xy * 70. + d.z * 31.)) > .975) col += C(255, 190, 110) * (1. - day) * .8;
    /* the atmosphere */
    col += C(110, 160, 255) * pow(1. - sat(dot(n, -rd)), 3.) * .55 * sat(dot(normalize(p), L) + .4) * step(m, 12.5);
  } else {
    float b = dot(ro, rd), dmin = length(ro - rd * b);
    col += C(130, 160, 255) * .6 * exp(-max(dmin - 1., 0.) * 6.) * sat(dot(normalize(ro - rd * b), L) + .5) * step(0., -b);
  }
  /* the lighthouse beam sweeping round */
  float sp = spin();
  vec3 lc = LH * (groundH(LH) + .15);
  vec3 tt = normalize(cross(LH, vec3(0., 1., 0.))), bb = cross(LH, tt);
  vec3 B = normalize(cos(T * 1.3) * tt + sin(T * 1.3) * bb + LH * .12);
  lc.xz = rot(-sp) * lc.xz; B.xz = rot(-sp) * B.xz;
  vec3 w0 = ro - lc;
  float bd = dot(rd, B), dd = dot(rd, w0), ee = dot(B, w0), den = max(1. - bd * bd, 1e-4);
  float tr = (bd * ee - dd) / den, sb = clamp((ee - bd * dd) / den, 0., .9);
  if (tr > 0. && tr < hitT + .05) {
    float dist = length(ro + rd * tr - lc - B * sb), wd = .012 + .07 * sb;
    col += C(255, 226, 150) * exp(-dist * dist / (wd * wd)) * (1. - sb / .9) * .55;
  }
  return vec4(tone(col * 1.2), sky);
}`
  }
};

/* the cozy set lives in its own file */
Object.assign(ART, COZY);
export const ART_NAMES = Object.keys(ART);
