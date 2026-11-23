/* More scene shaders (nature). Same contract as shaders.js: each scene is a GLSL string defining
 * vec4 scene(vec2 uv) on top of HEADER's helpers; merged into SHADERS there. */
export const SHADERS = {
  /* ---------- Bamboo grove ---------- */
  bamboo: `
/* a bamboo stalk's colour: u across it (-1..1), fy up the segment, nhp the segment height in pixels */
vec3 stalkC(float u, float fy, float nhp) {
  if (fy * nhp < 1.) return C(56, 104, 62);
  if (fy * nhp < 2.) return C(206, 234, 160);
  return u < -.35 ? C(174, 214, 120) : u < .45 ? C(110, 172, 86) : C(70, 130, 70);
}
/* one layer of stalks, sc to a unit; leafy layers grow sprays of leaves at some of their nodes */
vec4 grove(vec2 q, float sc, float seed, float base, float leafy, float gap) {
  vec4 r = vec4(0.);
  if (q.y < base) return r;
  float x = q.x * sc, w = .1, nh = 3.6 * w / sc, nhp = nh * uRes.y;
  for (int j = -1; j <= 1; j++) {
    float cell = floor(x) + float(j);
    if (hash(vec2(cell, seed)) < gap) continue;
    float cx = cell + .2 + .6 * hash(vec2(cell, seed + 1.));
    float slope = (hash(vec2(cell, seed + 2.)) - .5) * .1 + .012 * sin(T * .5 + cell * 1.7);
    float dx = x - cx - slope * (q.y - base) * sc;
    float off = hash(vec2(cell, seed + 3.)) * nh;
    if (abs(dx) < w && r.a < .5) r = vec4(stalkC(dx / w, fract((q.y - off) / nh), nhp), 1.);
    if (leafy > 0. && abs(dx) < .7) {
      float k0 = floor((q.y - off) / nh);
      for (int n = 0; n < 2; n++) {
        float kk = k0 + float(n), hn = hash(vec2(cell * 3.1 + kk, seed + 5.));
        float yn = off + kk * nh;
        if (hn < .5 || yn < base + .3) continue;
        vec2 p = vec2((x - cx - slope * (yn - base) * sc) / sc, q.y - yn);
        float L = 2.6 * w / sc * (.8 + .4 * hn);
        for (int s = 0; s < 3; s++) {
          float fs = float(s), side = mod(fs + kk, 2.) < 1. ? 1. : -1.;
          float a = .3 + fs * .28 + .1 * sin(T * .9 + kk + cell + fs);
          vec2 dir = vec2(side * cos(a), -sin(a));
          float t = dot(p, dir) / L;
          if (t > 0. && t < 1.) {
            float acr = dot(p, vec2(-dir.y, dir.x)), wid = .5 * w / sc * pow(sin(t * 3.1416), .7) * (1. - .35 * t);
            if (abs(acr) < wid) r = vec4(acr * side > 0. ? C(146, 204, 102) : C(78, 148, 74), 1.);
          }
        }
      }
    }
  }
  return r;
}
bool ell(vec2 p, vec2 c, vec2 r) { return length((p - c) / r) < 1.; }
vec4 scene(vec2 uv) {
  vec2 q = vec2(uv.x * A, uv.y), G = floor(F);
  float sky = 1.;
  vec3 mist = C(232, 240, 222), sun = C(255, 250, 214);
  vec3 col = mix(C(250, 246, 220), C(176, 216, 196), smoothstep(.15, 1., uv.y));
  col += C(255, 236, 180) * .35 * exp(-length(q - vec2(A * .12, 1.05)) * 2.2);
  /* sunbeams slanting down through the canopy */
  float beam = smoothstep(.5, .85, noise(vec2((q.x + q.y * .7) * 3.2 - T * .02, 1.))) * (.15 + .85 * uv.y);
  vec4 g = grove(q + vec2(M.x * .002, 0.), 16., 1., .3, 0., .2);
  if (g.a > 0.) { sky = 0.; col = mix(g.rgb, mist, .8); }
  g = grove(q + vec2(M.x * .004, 0.), 9., 2., .22, 0., .25);
  if (g.a > 0.) { sky = 0.; col = mix(g.rgb, mist, .6); }
  col = mix(col, sun, beam * .45);
  if (uv.y < .16 + .015 * sin(q.x * 4. + 2.)) { sky = 0.; col = mix(C(126, 168, 104), mist, .5); }
  g = grove(q + vec2(M.x * .008, 0.), 5.5, 3., .13, 1., .3);
  if (g.a > 0.) { sky = 0.; col = mix(g.rgb, mist, .34); }
  /* mist pooling low between the stalks */
  col = mix(col, mist, smoothstep(.36, .02, uv.y) * (.45 + .55 * noise(vec2(q.x * 2.4 - T * .05, uv.y * 6.))) * .7);
  col = mix(col, sun, beam * .18);
  float nx = M.x * .016;
  g = grove(q + vec2(nx, 0.), 2.6, 4., .05, 1., .45);
  if (g.a > 0.) { sky = 0.; col = mix(g.rgb, sun, beam * .12); }
  /* the mossy floor */
  float gy = .07 + .012 * sin(q.x * 4. + 1.);
  if (uv.y < gy) {
    sky = 0.;
    col = uv.y > gy - PX() ? C(160, 204, 116) : mix(C(118, 166, 92), C(92, 138, 80), sat((gy - uv.y) / .07));
    float hh = hash(floor(F / vec2(2., 1.)));
    if (hh > .93) col = hh > .97 ? C(220, 214, 120) : C(150, 196, 110);
  }
  /* a panda asleep at the foot of a stalk, curled round its paws */
  vec2 P = vec2(A * .6 - nx, gy - .012);
  float sx = P.x - .23 + (q.y - .05) * .03;
  if (abs(q.x - sx) < .038 && q.y > gy - .02) { sky = 0.; col = stalkC((q.x - sx) / .038, fract((q.y - .01) / .14), .14 * uRes.y); }
  vec2 pp = (q - P) / 1.15;
  float br = 1. + .035 * sin(T * 1.1);
  vec3 Wc = C(250, 248, 240), Wd = C(206, 210, 220), K = C(44, 42, 56);
  /* a soft bed of moss and ferns behind, so the white of the panda stands out */
  vec2 mb = (pp - vec2(-.02, 0.)) / vec2(.27, .13 + .03 * noise(vec2(pp.x * 30., 2.)));
  if (length(mb) < 1. && pp.y > -.03) { sky = 0.; col = mix(C(64, 112, 70), C(94, 150, 84), step(.6, noise(q * 50.))); if (length(mb) > 1. - PX() * 9.) col = C(110, 166, 92); }
  if (ell(pp, vec2(0., .06 * br), vec2(.15, .07 * br))) {
    sky = 0.;
    vec2 e = (pp - vec2(0., .06 * br)) / vec2(.15, .07 * br);
    col = e.y < -.35 + e.x * .25 ? Wd : Wc;
    if (abs(e.x + .36 + e.y * .3) < .15 && e.y > -.7) col = K;
  }
  if (ell(pp, vec2(.11, .03), vec2(.055, .036))) { sky = 0.; col = K; }
  if (ell(pp, vec2(-.07, .016), vec2(.075, .024))) { sky = 0.; col = K; }
  vec2 hp = pp - vec2(-.135, .058 + .003 * sin(T * 1.1));
  if (ell(hp, vec2(-.042, .048), vec2(.022)) || ell(hp, vec2(.04, .05), vec2(.022))) { sky = 0.; col = K; }
  if (length(hp) < .062) {
    sky = 0.;
    col = length(hp - vec2(-.012, .012)) > .056 ? Wd : Wc;
    if (ell(hp, vec2(-.024, .004), vec2(.018, .013)) || ell(hp, vec2(.022, .004), vec2(.018, .013))) col = K;
    if (ell(hp, vec2(-.002, -.024), vec2(.011, .008))) col = K;
    if (length(hp - vec2(-.044, -.02)) < .01 || length(hp - vec2(.042, -.02)) < .01) col = C(255, 184, 196);
  }
  /* Zs */
  for (int i = 0; i < 3; i++) {
    float fi = float(i), k = fract(T * .1 + fi / 3.);
    vec2 zp = P + vec2(-.14 + k * .1, .16 + k * .22);
    vec2 d = G - floor(zp * uRes.y);
    if (d.x >= 0. && d.x < 4. && d.y >= 0. && d.y < 4. && (d.y == 0. || d.y == 3. || d.x == d.y)) col = mix(C(96, 140, 110), col, k * .8);
  }
  /* leaves drifting down, tumbling */
  for (int i = 0; i < 12; i++) {
    float fi = float(i);
    float y = 1.05 - fract(T * (.025 + .025 * h1(fi + 2.)) + h1(fi + 5.)) * 1.1;
    float x = fract(h1(fi) + T * .01 + .03 * sin(T * .8 + fi * 2.));
    vec2 d = G - floor(vec2(x, y) * uRes);
    float flip = sin(T * 2.5 + fi * 3.) > 0. ? 1. : -1.;
    if ((d.x == 0. && d.y == 0.) || (d.x == 1. && d.y == flip)) col = h1(fi + 9.) > .4 ? C(150, 204, 96) : C(222, 214, 110);
  }
  return vec4(col, sky);
}`,

  /* ---------- Lavender rows ---------- */
  lavender: `
vec4 scene(vec2 uv) {
  vec2 q = vec2(uv.x * A, uv.y), G = floor(F);
  float hz = .44, sky = 1.;
  float ys = (uv.y - hz) / (1. - hz);
  vec3 col = mix(C(255, 226, 160), C(255, 180, 150), smoothstep(.0, .3, ys));
  col = mix(col, C(180, 150, 210), smoothstep(.3, .75, ys));
  col = mix(col, C(116, 120, 198), smoothstep(.75, 1.1, ys));
  vec2 sc = vec2(A * .76 - M.x * .003, hz + .1);
  float sd = length(q - sc);
  col += C(255, 196, 130) * .5 * exp(-sd * 5.);
  if (sd < .07) col = mix(C(255, 252, 226), C(255, 214, 150), sat((sc.y + .07 - q.y) / .14));
  /* long thin clouds, lit gold from underneath */
  vec2 cp = vec2(q.x * 1.3 + T * .008 + M.x * .008, q.y * 9.);
  float cn = fbm3(cp) * smoothstep(.5, .7, uv.y) * smoothstep(1., .84, uv.y) * 1.35;
  if (cn > .62) col = cn > .66 ? mix(C(255, 222, 180), C(236, 166, 190), smoothstep(.7, .9, uv.y)) : mix(C(255, 236, 196), C(250, 196, 200), smoothstep(.7, .9, uv.y));
  /* far hills */
  float mx = q.x + M.x * .004;
  float hf = hz + .03 + .07 * noise(vec2(mx * 1.8, 3.)) + .01 * noise(vec2(mx * 9., 1.));
  if (uv.y < hf) { sky = 0.; col = mix(C(176, 150, 210), C(236, 184, 190), sat((hf - uv.y) / .08) * .6); }
  float hm = hz + .012 + .02 * noise(vec2(q.x * 4. + M.x * .02, 7.));
  if (uv.y < hm) { sky = 0.; col = hash(vec2(floor(F.x / 2.), 3.)) > .7 && uv.y > hm - 2. * PX() ? C(110, 120, 110) : C(158, 124, 172); }
  /* the farmhouse, its cypresses */
  vec2 fh = q - vec2(A * .26 - M.x * .005, hz - .004);
  for (int i = 0; i < 3; i++) {
    float fi = float(i), cx = fi < 2. ? -.12 + fi * .028 : .135, hh = fi == 1. ? .085 : .115;
    float t = fh.y / hh, wd = .018 * sqrt(sat(t * (1. - t))) * 2. * (1. - t * .3);
    if (t > 0. && t < 1. && abs(fh.x - cx) < wd) { sky = 0.; col = fh.x - cx > wd * .2 ? C(124, 128, 82) : C(64, 92, 72); }
  }
  if (abs(fh.x) < .075 && fh.y > 0. && fh.y < .05) {
    sky = 0.;
    col = fh.x > .05 ? C(250, 216, 170) : C(232, 198, 160);
    if (hash(floor(F / vec2(2., 1.))) > .8) col *= .93;
    if ((abs(fh.x + .04) < .009 || abs(fh.x - .015) < .009) && fh.y > .02 && fh.y < .036) col = C(255, 216, 130);
    if (abs(fh.x + .012) < .008 && fh.y < .026) col = C(150, 96, 80);
  }
  if (fh.x > .075 && fh.x < .125 && fh.y > 0. && fh.y < .03) { sky = 0.; col = C(214, 176, 148); }
  if (fh.x > .07 && fh.x < .13 && fh.y >= .03 && fh.y < .042 - (fh.x - .07) * .15) { sky = 0.; col = C(186, 96, 76); }
  if (fh.y >= .05 && fh.y < .072 && abs(fh.x) < .085 - (fh.y - .05) * 1.4) { sky = 0.; col = fh.y < .05 + PX() ? C(150, 76, 66) : mod(G.x, 2.) == 0. ? C(214, 116, 84) : C(196, 102, 78); }
  if (abs(fh.x - .05) < .007 && fh.y > .06 && fh.y < .085) { sky = 0.; col = C(200, 164, 136); }
  /* the rows run away to the horizon */
  if (uv.y < hz) {
    sky = 0.;
    float d = hz - uv.y, z = 1. / d;
    float vxp = A * .42 + M.x * .03 * d, xr = (q.x - vxp) / d;
    /* how many rows a pixel spans: where they crowd below a few pixels, they melt into one colour */
    float fw = (abs(q.x - vxp) / (d * d) + 1. / d) / .55 / uRes.y;
    float rc = xr / .55 + .5 + .05 * sin(T * 1.2 - q.x * 3.) * smoothstep(.12, .4, d);
    float f = fract(rc), rid = floor(rc);
    float bz = fract(z * 2.2 + hash(vec2(rid, 1.)) * 9.);
    float hwb = .3 + .08 * sqrt(sat(1. - pow((bz - .5) * 2., 2.))) * smoothstep(.12, .3, d);
    float u = (f - .5) / hwb;
    vec3 c;
    if (abs(u) < 1.) {
      c = u > .15 ? C(196, 152, 234) : u < -.45 ? C(104, 78, 164) : C(150, 112, 208);
      float fl = noise(vec2(rc * 14., z * 14.));
      if (fl > .66) c = mix(c, C(232, 204, 252), .55);
      if (fl < .24) c = mix(c, C(82, 62, 134), .5);
      if (abs(u) > .86) c = mix(c, C(112, 132, 90), .6);
    } else c = f > .5 ? C(222, 176, 116) : C(150, 126, 84);
    c = mix(c, mix(C(150, 112, 184), C(186, 150, 200), step(.5, fract(rc * .5 + .25 * step(.5, hash(G))))), smoothstep(.38, .75, fw));
    c = mix(C(176, 132, 196), c, smoothstep(.012, .05, d));
    c = mix(c, C(250, 196, 176), smoothstep(.1, .0, d) * .4);
    c += C(255, 186, 120) * .28 * exp(-length((q - vec2(sc.x, hz)) * vec2(1., 3.)) * 3.5);
    col = c * (.88 + .12 * smoothstep(.0, .25, uv.y));
  }
  /* bees bobbing over the flowers */
  for (int i = 0; i < 5; i++) {
    float fi = float(i);
    vec2 bp = vec2(fract(h1(fi) + T * .012 * (h1(fi + 1.) - .5) + .03 * sin(T * .9 + fi)) * A, .05 + .22 * h1(fi + 2.) + .015 * sin(T * 2.3 + fi * 1.7));
    vec2 d = G - floor(bp * uRes.y);
    if (d.y == 0. && (d.x == 0. || d.x == 1.)) col = d.x == 0. ? C(64, 40, 44) : C(255, 206, 60);
    if (d.y == 1. && d.x == (sin(T * 20. + fi) > 0. ? 0. : 1.)) col = C(255, 255, 255);
  }
  return vec4(col, sky);
}`,

  /* ---------- Jungle falls ---------- */
  waterfall: `
float seg(vec2 p, vec2 a, vec2 b) { vec2 pa = p - a, ba = b - a; return length(pa - ba * clamp(dot(pa, ba) / dot(ba, ba), 0., 1.)); }
/* a leaf (or a fern frond, ser > 0) from b along angle a: 0 outside, else 1..2 across it */
float leaf(vec2 p, vec2 b, float a, float L, float W, float ser) {
  vec2 dir = vec2(cos(a), sin(a)), r = p - b;
  float t = dot(r, dir) / L;
  if (t < 0. || t > 1.) return 0.;
  float ac = dot(r, vec2(-dir.y, dir.x)) + t * t * L * .25;
  float w = W * pow(sin(t * 3.1416), .8) * (1. - .25 * t) * mix(1., .45 + .55 * abs(sin(t * 26.)), ser);
  if (abs(ac) > w) return 0.;
  return 1.5 + ac / w * .5;
}
vec4 scene(vec2 uv) {
  vec2 q = vec2(uv.x * A, uv.y), G = floor(F);
  float sky = 1.;
  vec3 col = mix(C(236, 248, 228), C(150, 212, 222), smoothstep(.6, 1., uv.y));
  float fx = A * .5 + M.x * .006, pool = .27, lip = .76;
  /* far jungle: a hazy line of round treetops */
  float tx = q.x * 9. + M.x * .01;
  float tt = .84 + .05 * noise(vec2(tx * .5, 2.)) + .035 * sqrt(sat(1. - pow(fract(tx) * 2. - 1., 2.)));
  if (uv.y < tt) { sky = 0.; col = mix(C(126, 190, 146), C(186, 228, 200), .35 + .3 * noise(q * 26.)); }
  /* the cliffs either side, mossy and wet */
  float ct = lip + .05 + .03 * noise(vec2(q.x * 7., 5.));
  float hw = .09 + (lip - uv.y) * .07, xx = q.x - fx;
  if (uv.y < ct) {
    sky = 0.;
    float lf = fract(uv.y * 7. + noise(vec2(q.x * 3., 1.)) * .9);
    col = mix(C(62, 88, 88), C(104, 126, 114), noise(vec2(q.x * 34., uv.y * 3.)));
    if (lf > .84) col = lf > .94 ? C(146, 200, 108) : C(96, 160, 88);
    else if (lf < .12) col = C(44, 64, 70);
    col *= .72 + .28 * smoothstep(.0, .12, abs(xx) - hw);
  }
  /* the fall */
  if (uv.y > pool - .02 && uv.y < lip + .014 * (1. - pow(xx / hw, 2.)) && abs(xx) < hw) {
    sky = 0.;
    float s = noise(vec2(xx * 38., uv.y * 5. + T * 2.6)) * .6 + noise(vec2(xx * 90., uv.y * 9. + T * 3.4)) * .4;
    col = mix(C(118, 194, 222), C(214, 244, 250), smoothstep(.35, .7, s));
    if (s > .72) col = C(255, 255, 255);
    col = mix(col, C(80, 156, 190), smoothstep(.7, 1., abs(xx) / hw) * .6);
    if (uv.y > lip - .006) col = C(240, 252, 255);
  }
  /* jungle crowding in from the sides, low by the fall, tall at the edges */
  for (int i = 0; i < 2; i++) {
    float fi = float(i), sc = 10. - fi * 3., x = (q.x + M.x * .004 * (fi + 1.)) * sc;
    float best = -1., cxB = 0., rB = 1.;
    for (int j = -1; j <= 1; j++) {
      float cell = floor(x) + float(j), cx = cell + .5 + (hash(vec2(cell, fi * 7. + 3.)) - .5) * .5;
      float r = .55 + .35 * hash(vec2(cell, fi * 7. + 1.)), dxc = (x - cx) / r;
      float base = pool - .12 - fi * .05 + .55 * smoothstep(.12 + fi * .08, .8, abs(cx / sc - fx));
      float top = base + sqrt(max(0., 1. - dxc * dxc)) * r / sc * 1.4;
      if (uv.y < top && top > best) { best = top; cxB = dxc; rB = r / sc; }
    }
    if (uv.y < best) {
      sky = 0.;
      bool lit = cxB < .25 && best - uv.y < rB * (.7 + .4 * noise(q * 30.));
      col = fi == 0. ? (lit ? C(70, 140, 88) : C(38, 92, 68)) : (lit ? C(112, 186, 92) : C(54, 128, 72));
      if (hash(floor(F / 2.) + fi) > .88) col *= lit ? 1.1 : .85;
    }
  }
  /* the pool */
  if (uv.y < pool) {
    sky = 0.;
    float dd = (pool - uv.y) / pool;
    col = mix(C(92, 202, 196), C(28, 110, 134), smoothstep(0., .8, dd));
    float rip = sin(length((q - vec2(fx, pool)) * vec2(1., 3.)) * 60. - T * 3. + noise(q * 9.) * 3.);
    if (rip > .9 && dd < .6) col = mix(col, C(170, 236, 236), .4 * (1. - dd) * exp(-abs(q.x - fx) * 3.));
    if (abs(q.x - fx) < .1 + dd * .06 && dd < .6 && noise(vec2((q.x - fx) * 30., uv.y * 30. - T * 2.)) > .58) col = mix(col, C(200, 240, 246), .5);
  }
  /* foam churning where it lands */
  for (int i = 0; i < 8; i++) {
    float fi = float(i), k = fract(T * .5 + h1(fi));
    vec2 fc = vec2(fx + (h1(fi + 3.) - .5) * .3, pool + .005 + k * .03);
    float r = (.024 + .024 * h1(fi + 6.)) * (1. - k * .4);
    vec2 d = q - fc;
    if (length(d * vec2(.8, 1.)) < r) { sky = 0.; col = d.y > r * .2 ? C(255, 255, 255) : C(204, 236, 244); }
  }
  /* spray, and a rainbow in it */
  float env = exp(-pow(xx * 3., 2.) - pow((uv.y - pool - .07) * 6.5, 2.));
  if (env > .02) col = mix(col, C(246, 252, 252), sat(env * (fbm3(vec2(q.x * 4. - T * .06, uv.y * 5. - T * .25)) * 1.4 - .1)) * .85);
  float ro = length(q - vec2(fx + .1, pool - .14)), rt = (.42 - ro) / .07;
  if (rt > 0. && rt < 1. && uv.y > pool) {
    vec3 rb = .5 + .5 * cos(6.2832 * (rt * .72 + vec3(0., -.333, -.667)));
    col = mix(col, mix(rb, vec3(1.), .25), .38 * exp(-pow((q.x - fx - .1) * 2.2, 2.)));
  }
  /* vines hanging from the top */
  for (int i = 0; i < 5; i++) {
    float fi = float(i), vx = (fi < 2.5 ? .07 + fi * .15 : A - .07 - (fi - 3.) * .17) + M.x * .014;
    float len = .28 + .25 * h1(fi + 1.);
    if (uv.y < 1.02 - len) continue;
    float k = (1.02 - uv.y) / len;
    float x = vx + .02 * sin(T * .6 + fi) * k * k + .008 * sin(uv.y * 30. + fi);
    if (abs(q.x - x) < PX() * .6) { sky = 0.; col = C(56, 104, 60); }
    float lk = uv.y * 26. + fi * .3, side = mod(floor(lk), 2.) * 2. - 1.;
    vec2 lp = vec2((q.x - x) * side, (fract(lk) - .5) / 26.);
    if (length((lp - vec2(.011, 0.)) * vec2(1., 1.5)) < .011) { sky = 0.; col = lp.y > 0. ? C(116, 184, 92) : C(70, 140, 72); }
  }
  /* a parrot on a branch */
  vec2 pb = vec2(fx - .26 + M.x * .002, .52);
  if (seg(q, pb + vec2(-.16, .01), pb + vec2(.06, -.008)) < .008 && q.x < fx - hw * .9) { sky = 0.; col = C(96, 70, 56); }
  vec2 pp = (q - pb) / .055;
  float bob = .06 * sin(T * 1.3) * step(.6, sin(T * .7));
  if (seg(pp, vec2(-.1, .4), vec2(-.38, -.95)) < .13) { sky = 0.; col = C(64, 120, 224); }
  if (length((pp - vec2(0., .82)) / vec2(.4, .62)) < 1.) {
    sky = 0.; col = C(232, 58, 66);
    if (length((pp - vec2(-.12, .72)) / vec2(.28, .5)) < 1.) col = pp.y > .78 ? C(255, 206, 64) : C(70, 132, 232);
  }
  vec2 hc = vec2(.1, 1.45 + bob);
  if (length(pp - hc) < .32) {
    sky = 0.; col = C(232, 58, 66);
    if (length(pp - hc - vec2(.12, .02)) < .14) col = length(pp - hc - vec2(.14, .03)) < .06 ? C(30, 26, 40) : C(250, 242, 232);
  }
  if (length(pp - hc - vec2(.34, -.06)) < .15 && pp.y < hc.y + .06) { sky = 0.; col = pp.y > hc.y - .05 ? C(250, 236, 214) : C(60, 54, 66); }
  /* and another one flying past */
  float ft = fract(T * .025);
  vec2 fp = vec2(-.2 + ft * (A + .4), .66 + .05 * sin(ft * 9.));
  vec2 fd = (q - fp) / .034;
  float flap = sin(T * 9.);
  if (abs(fd.x) < 2. && abs(fd.y) < 1.6) {
    bool hit = false; vec3 bc = C(64, 132, 232);
    if (length(fd / vec2(.9, .32)) < 1.) { hit = true; if (fd.y < -.08) bc = C(255, 204, 64); }
    if (length(fd - vec2(.86, .14)) < .3) hit = true;
    if (length(fd - vec2(1.16, .06)) < .14) { hit = true; bc = C(50, 46, 58); }
    if (seg(fd, vec2(-.6, 0.), vec2(-1.7, -.16)) < .13) hit = true;
    float wx = abs(fd.x - .05) / .4;
    if (wx < 1. && fd.y * flap > 0. && abs(fd.y) < abs(flap) * 1.4 * (1. - wx) + .1) hit = true;
    if (hit) { sky = 0.; col = bc; }
  }
  /* big leaves and ferns in the corners */
  for (int i = 0; i < 6; i++) {
    float fi = float(i), lft = fi < 3. ? 1. : -1., j = mod(fi, 3.);
    vec2 b = vec2(lft > 0. ? -.03 : A + .03, -.04) + vec2(M.x * .03, 0.);
    float a = (lft > 0. ? .3 + j * .42 : 3.1416 - .3 - j * .42) + .05 * sin(T * .9 + fi);
    float l = leaf(q, b, a, .3 - j * .05, .055 - j * .008, step(.5, j));
    if (l > 0.) { sky = 0.; col = l > 1.5 ? C(74, 156, 82) : C(40, 112, 66); if (abs(l - 1.5) < .07 && j < .5) col = C(146, 206, 112); }
  }
  return vec4(col, sky);
}`,

  /* ---------- Moonlit dunes ---------- */
  dunes: `
float seg(vec2 p, vec2 a, vec2 b) { vec2 pa = p - a, ba = b - a; return length(pa - ba * clamp(dot(pa, ba) / dot(ba, ba), 0., 1.)); }
/* a dune line: long windward slopes, a sharp crest, a steep slip face; t tells where in the dune x is */
float dune(float x, float seed, out float t, out float a) {
  float s = x + .3 * sin(x * .6 + seed);
  t = fract(s);
  a = .55 + .45 * hash(vec2(floor(s), seed));
  float p = t < .72 ? sin(t / .72 * 1.5708) : 1. - smoothstep(.72, 1., t);
  return p * a + .3 * noise(vec2(x * .4, seed));
}
float midH(float x) { float t, a; return .25 + .12 * dune(x * .9 + M.x * .008, 5., t, a); }
bool camel(vec2 p, float ph) {
  if (length((p - vec2(0., .62)) / vec2(.42, .2)) < 1.) return true;
  if (length(p - vec2(-.06, .74)) < .2) return true;
  if (seg(p, vec2(.3, .66), vec2(.52, .92)) < .08) return true;
  if (length((p - vec2(.6, .93)) / vec2(.14, .075)) < 1.) return true;
  if (seg(p, vec2(-.42, .64), vec2(-.5, .4)) < .035) return true;
  for (int l = 0; l < 4; l++) {
    float fl = float(l), lx = fl < 2. ? -.28 + fl * .1 : .2 + (fl - 2.) * .1;
    float sw = .1 * sin(ph + fl * 1.6 + (fl < 2. ? 0. : 1.6));
    if (seg(p, vec2(lx, .55), vec2(lx + sw, 0.)) < .055) return true;
  }
  return false;
}
vec4 scene(vec2 uv) {
  vec2 q = vec2(uv.x * A, uv.y), G = floor(F);
  float sky = 1.;
  vec3 col = mix(C(250, 172, 142), C(196, 112, 150), smoothstep(.3, .55, uv.y));
  col = mix(col, C(82, 56, 116), smoothstep(.5, .78, uv.y));
  col = mix(col, C(32, 28, 76), smoothstep(.78, 1.05, uv.y));
  col = stars(col, .012 * smoothstep(.55, .9, uv.y), C(255, 240, 230));
  /* the huge moon */
  vec2 mc = vec2(A * .6 - M.x * .003, .47);
  float md = length(q - mc), mr = .2;
  col += C(255, 196, 176) * .3 * exp(-max(md - mr, 0.) * 5.);
  if (md < mr) {
    col = C(255, 242, 218);
    float n = fbm3((q - mc) * 9. + 4.);
    if (n > .56) col = C(244, 218, 196);
    if (n > .66) col = C(232, 204, 186);
    col = mix(col, C(255, 214, 190), smoothstep(mr * .7, mr, md) * .5);
  }
  /* thin bands of cloud drifting across it */
  /* three lines of dunes; the far ones hazy */
  float t, a, h;
  h = .36 + .1 * dune(q.x * 1.3 + M.x * .004, 2., t, a);
  if (uv.y < h) { sky = 0.; float tt = fract(t - (h - uv.y) * 1.5); col = mix(tt < .72 ? C(226, 146, 142) : C(166, 102, 144), C(240, 168, 156), .35); }
  float hm = midH(q.x);
  float tm, am; float dm = dune(q.x * .9 + M.x * .008, 5., tm, am);
  if (uv.y < hm) {
    sky = 0.;
    float tt = fract(tm - (hm - uv.y) * 1.4);
    col = tt < .72 ? C(242, 158, 120) : C(150, 86, 124);
    if (uv.y > hm - PX() && tm < .72) col = C(255, 206, 156);
  }
  /* the caravan, walking the ridge in front of the moon */
  float lead = fract(T * .004 + (A * .6 + .6) / (A + .7)) * (A + .7) - .35;
  for (int i = 0; i < 4; i++) {
    float fi = float(i), cx = lead - fi * .13 - (fi > 0. ? .03 : 0.);
    if (abs(q.x - cx) > .09) continue;
    float ph = T * 3. + fi * 1.3, gy = midH(cx) - .006 + .003 * abs(sin(ph));
    vec2 p = (q - vec2(cx, gy)) / .09;
    bool hit = false;
    if (i == 0) {
      hit = seg(p, vec2(0., .1), vec2(0., .5)) < .13 + max(.25 - p.y, 0.) * .4 || length(p - vec2(0., .7)) < .11 || seg(p, vec2(0., .45), vec2(.28, .42)) < .04
        || seg(p, vec2(-.05, .15), vec2(-.05 + .08 * sin(ph), 0.)) < .05 || seg(p, vec2(.05, .15), vec2(.05 - .08 * sin(ph), 0.)) < .05;
      vec2 lp = vec2(cx + .028, gy + .034);
      col += C(255, 180, 100) * .5 * exp(-length(q - lp) * 70.);
      if (length(q - lp) < .006) col = C(255, 230, 150);
    } else hit = camel(p, ph);
    if (hit) { sky = 0.; col = C(60, 34, 76); }
  }
  /* the near dune, rippled by the wind, sand lifting off its crests */
  float hn = .06 + .14 * dune(q.x * .7 + M.x * .016, 9., t, a);
  float crest = .06 + .14 * (a + .3 * noise(vec2((q.x * .7 + M.x * .016) * .4, 9.)));
  if (uv.y < hn) {
    sky = 0.;
    float tt = fract(t - (hn - uv.y) * 1.2);
    col = tt < .72 ? C(252, 180, 124) : C(162, 92, 114);
    if (sin((q.x * 2. + uv.y * 7.) * 26. + 4. * noise(q * 6.)) > .82) col *= .9;
    if (uv.y > hn - PX() && t < .72) col = C(255, 222, 170);
    if (uv.y < hn - PX() * 2. && hash(floor(F / 2.) + 7.) > .985) col = C(255, 226, 190);
  } else if (t > .6) {
    float e = uv.y - crest + (t - .72) * .1;
    float sp = noise(vec2(q.x * 40. - T * 4., uv.y * 120.)) * smoothstep(.035, .0, abs(e)) * smoothstep(1., .72, t);
    col = mix(col, C(255, 214, 172), sat(sp * 2. - .5) * .85);
  }
  /* a couple of dry tufts on the near crest */
  float tc = floor(q.x * 5.);
  if (hash(vec2(tc, 4.)) > .6 && uv.y >= hn && uv.y < hn + .025 && abs(fract(q.x * 5.) - .5) < .12 && hash(vec2(G.x, 2.)) > .35 && uv.y < hn + .025 * hash(vec2(G.x, 5.))) { sky = 0.; col = C(120, 74, 96); }
  return vec4(col, sky);
}`,

  /* ---------- Heart volcano ---------- */
  volcano: `
float dot2(vec2 v) { return dot(v, v); }
float heart(vec2 p) {
  p.x = abs(p.x);
  if (p.y + p.x > 1.) return sqrt(dot2(p - vec2(.25, .75))) - sqrt(2.) / 4.;
  return sqrt(min(dot2(p - vec2(0., 1.)), dot2(p - .5 * max(p.x + p.y, 0.)))) * sign(p.x - p.y);
}
float cone(float dx) { return abs(dx) < .045 ? .678 : .34 + .35 * pow(sat(1. - (abs(dx) - .055) / .4), 1.6); }
vec4 scene(vec2 uv) {
  vec2 q = vec2(uv.x * A, uv.y), G = floor(F);
  float hz = .34, sky = 1.;
  vec3 col = mix(C(255, 226, 206), C(196, 214, 248), smoothstep(hz, .6, uv.y));
  col = mix(col, C(108, 174, 238), smoothstep(.55, 1., uv.y));
  col = puffs(col, q, .84, .06, .012, 3., C(255, 255, 255), C(236, 240, 252), C(196, 206, 236));
  col = puffs(col, q, .6, .036, .007, 11., C(255, 250, 248), C(250, 226, 230), C(226, 196, 214));
  float vx = A * .5 + M.x * .006, dx = q.x - vx;
  /* the island: green slopes, purple rock, a warm glow in the crater */
  float top = cone(dx) + .005 * noise(vec2(q.x * 30., 1.));
  if (uv.y < top && uv.y >= hz && abs(dx) < .45) {
    sky = 0.;
    bool lit = dx < -.012 + (uv.y - .4) * .12;
    vec3 c = lit ? C(186, 140, 156) : C(132, 98, 132);
    if (fract(dx / (.71 - uv.y) * 3.5 + .5) < .12) c *= .88;
    float gl = .47 + .03 * noise(vec2(q.x * 14., 2.)) + .02 * sqrt(sat(1. - pow(fract(q.x * 22.) * 2. - 1., 2.)));
    if (uv.y < gl) c = lit ? C(116, 200, 112) : C(66, 152, 98);
    if (uv.y < gl && hash(floor(F / 2.)) > .9) c *= .9;
    if (uv.y > top - 2. * PX() && abs(dx) < .07) c = C(255, 186, 140);
    col = c;
    /* a sleepy, contented face */
    for (int e = 0; e < 2; e++) {
      vec2 ep = q - vec2(vx + (e == 0 ? -.055 : .055), .555);
      if (abs(length(ep) - .02) < PX() * .75 && ep.y < -.003) col = C(86, 50, 76);
      if (length((ep - vec2(e == 0 ? -.025 : .025, -.032)) / vec2(.02, .011)) < 1.) col = mix(col, C(255, 140, 170), .65);
    }
    vec2 mp = q - vec2(vx, .54);
    if (abs(length(mp) - .014) < PX() * .75 && mp.y < -.006) col = C(86, 50, 76);
  }
  col += C(255, 150, 110) * .55 * (.85 + .15 * sin(T * 2.)) * exp(-length((q - vec2(vx, .68)) * vec2(1., 1.8)) * 14.);
  /* heart-shaped puffs rising, drifting, fading */
  for (int i = 0; i < 3; i++) {
    float fi = float(i), k = fract(T * .07 + fi / 3.);
    float s = .035 + .085 * sqrt(k), tilt = .25 * sin(k * 4. + fi * 2.);
    vec2 c = vec2(vx + k * .3 + .03 * sin(k * 7. + fi), .7 + k * .36);
    vec2 p = (q - c) / s;
    p = mat2(cos(tilt), -sin(tilt), sin(tilt), cos(tilt)) * p + vec2(0., .5);
    float hd = heart(p);
    if (hd < 0.) {
      float l = dot(normalize(p - vec2(0., .55) + 1e-4), normalize(vec2(-.5, .85)));
      vec3 hc = l > .25 ? C(255, 240, 246) : l > -.35 ? C(255, 204, 222) : C(236, 156, 190);
      if (hd > -.07 && l > .3) hc = C(255, 255, 255);
      float a = smoothstep(1., .72, k);
      col = mix(col, hc, a);
      if (a > .5) sky = 0.;
    }
  }
  /* the sea, the island's reflection, foam round the shore */
  if (uv.y < hz) {
    sky = 0.;
    float d = (hz - uv.y) / hz;
    col = mix(C(126, 204, 232), C(40, 118, 196), smoothstep(0., .7, d));
    float rx = q.x + .006 * sin(uv.y * 150. + T * 2.), ry = hz + (hz - uv.y) * 1.3;
    if (ry < cone(rx - vx)) col = mix(col, ry < .47 ? C(56, 150, 116) : C(130, 104, 150), .45);
    float wv = sin(uv.y * (110. - d * 50.) - T * 1.4 + noise(vec2(q.x * 6., uv.y * 10.)) * 3.);
    if (wv > .85) col = mix(col, C(220, 244, 255), .6);
    if (abs(uv.y - hz + .006 + .003 * sin(T * 1.4 + q.x * 20.)) < PX() && abs(dx) < .47) col = C(255, 255, 255);
  }
  if (uv.y >= hz && uv.y < hz + .02 && abs(dx) < .47 - (uv.y - hz) * 2.) { sky = 0.; col = uv.y > hz + .02 - PX() ? C(255, 240, 196) : C(250, 222, 166); }
  /* palms on the beach */
  for (int i = 0; i < 3; i++) {
    float fi = float(i), side = fi == 0. ? -1. : 1.;
    vec2 pb = vec2(vx + (fi == 0. ? -.33 : fi == 1. ? .29 : .37), hz + .012);
    float ph = fi == 2. ? .11 : .16, lean = side * (fi == 2. ? .03 : .05);
    float py = q.y - pb.y, cx = pb.x + lean * pow(sat(py / ph), 1.5);
    if (py > 0. && py < ph && abs(q.x - cx) < .009 - py * .02) { sky = 0.; col = mod(floor(py * uRes.y / 2.), 2.) == 0. ? C(160, 112, 76) : C(126, 86, 62); }
    vec2 tp = pb + vec2(lean, ph);
    for (int f = 0; f < 5; f++) {
      float a = -.4 + float(f) * .82 + .06 * sin(T * 1.5 + fi + float(f));
      vec2 dir = vec2(cos(a), sin(a) * .5 - .05), r = q - tp;
      float tl = clamp(dot(r, dir) / .1, 0., 1.);
      vec2 pt = tp + dir * .1 * tl + vec2(0., -tl * tl * .05);
      if (length(q - pt) < .014 * (1. - tl * .7) && dot(r, dir) > 0.) { sky = 0.; col = q.y > pt.y ? C(110, 196, 92) : C(60, 146, 76); }
    }
  }
  /* a pair of gulls */
  for (int i = 0; i < 2; i++) {
    float fi = float(i);
    vec2 g = vec2(fract(.2 + fi * .4 + T * .012), .5 + .1 * fi + .015 * sin(T * 1.2 + fi));
    vec2 d2 = G - floor(g * uRes);
    float f = step(0., sin(T * 6. + fi * 2.));
    if ((abs(d2.x) == 1. && d2.y == 0.) || (abs(d2.x) == 2. && d2.y == f)) col = C(255, 255, 255);
  }
  return vec4(col, sky);
}`,

  /* ---------- Tulip fields ---------- */
  tulips: `
vec4 scene(vec2 uv) {
  vec2 q = vec2(uv.x * A, uv.y), G = floor(F);
  float hz = .5, sky = 1.;
  vec3 col = mix(C(218, 240, 255), C(92, 162, 236), pow(sat((uv.y - hz) / (1. - hz)), .8));
  col = puffs(col, q, .8, .07, .015, 2., C(255, 255, 255), C(228, 238, 252), C(180, 204, 236));
  col = puffs(col, q, .64, .045, .009, 8., C(250, 252, 255), C(220, 234, 250), C(172, 198, 232));
  /* far trees and farms along the horizon */
  float tx = q.x * 14. + M.x * .02;
  float th = hz + .004 + .02 * sqrt(sat(1. - pow(fract(tx) * 2. - 1., 2.))) * step(.35, hash(vec2(floor(tx), 3.)));
  if (uv.y < th) { sky = 0.; col = mix(C(98, 140, 132), C(140, 176, 160), step(.5, fract(tx))); }
  /* striped fields running to the horizon, a canal through them */
  if (uv.y < hz) {
    sky = 0.;
    float d = hz - uv.y, z = 1. / d;
    float xr = (q.x - A * .34 - M.x * .03 * d) / d;
    float bc = xr * .5 + 20.5, bi = floor(bc), f = fract(bc);
    float hb = hash(vec2(bi, 4.));
    vec3 tc = hb < .22 ? C(236, 56, 74) : hb < .42 ? C(255, 206, 60) : hb < .62 ? C(255, 126, 172) : hb < .8 ? C(250, 246, 236) : C(160, 96, 210);
    vec3 c;
    if (bi == 21.) {
      c = mix(C(150, 202, 242), C(96, 160, 220), sat(d * 3.));
      if (noise(vec2(f * 6., z * 5. - T * .4)) > .62) c = C(214, 236, 255);
      if (f < .07 || f > .93) c = C(76, 128, 74);
    } else if (f < .09 || f > .91) c = C(92, 156, 70);
    else {
      vec2 tg = vec2(f * 10., z * 2.4), cl = fract(tg) - .5;
      bool head = abs(cl.x) < .32 && cl.y > -.3 && cl.y < .28 && length(vec2(cl.x, min(cl.y, 0.))) < .32;
      c = head ? (cl.x < -.05 && cl.y > -.1 ? mix(tc, vec3(1.), .3) : tc) : abs(cl.x) < .08 ? C(60, 116, 52) : mix(C(80, 146, 64), tc, .15);
      c = mix(tc * .92 + .04, c, smoothstep(.06, .2, d));
    }
    c = mix(c, C(186, 206, 196), smoothstep(.08, .0, d) * .6);
    col = c;
  }
  /* the windmill on its little mound */
  vec2 wm = vec2(A * .76 + M.x * .008, .36), w = q - wm;
  if (uv.y < wm.y + .012 - 1.4 * w.x * w.x && uv.y > wm.y - .06 && abs(w.x) < .12) { sky = 0.; col = uv.y > wm.y + .012 - 1.4 * w.x * w.x - PX() ? C(150, 206, 100) : C(104, 168, 80); }
  float tw = .055 - w.y * .08;
  if (w.y > 0. && w.y < .24 && abs(w.x) < tw) {
    sky = 0.;
    col = w.x < tw * .25 ? C(156, 104, 82) : C(112, 72, 64);
    if (mod(G.x, 3.) == 0.) col *= .92;
    if (abs(w.x) < .012 && w.y < .036) col = C(70, 50, 52);
    if (abs(w.x + .004) < .009 && abs(w.y - .16) < .012) col = abs(w.x + .004) < .005 && abs(w.y - .16) < .008 ? C(78, 96, 120) : C(240, 236, 228);
  }
  if (abs(w.y - .09) < .005 && abs(w.x) < .075) { sky = 0.; col = w.y > .09 ? C(240, 232, 220) : C(86, 62, 56); }
  if (w.y >= .24 && length((w - vec2(0., .24)) / vec2(.044, .042)) < 1.) { sky = 0.; col = w.x < -.01 ? C(84, 108, 96) : C(58, 80, 72); }
  vec2 hp = w - vec2(0., .262);
  for (int s = 0; s < 4; s++) {
    float a = T * .5 + float(s) * 1.5708;
    vec2 dir = vec2(cos(a), sin(a));
    float al = dot(hp, dir), ac = dot(hp, vec2(-dir.y, dir.x));
    if (al > .012 && al < .21) {
      if (abs(ac) < .0055) { sky = 0.; col = C(104, 72, 60); }
      else if (ac > 0. && ac < .046 && al > .035) {
        sky = 0.;
        col = .046 * uRes.y > 5. && (mod(al * uRes.y, 4.) < 1. || ac * uRes.y > .046 * uRes.y - 1.) ? C(140, 100, 80) : C(250, 244, 230);
      }
    }
  }
  if (length(hp) < .011) { sky = 0.; col = C(60, 44, 46); }
  /* a few birds */
  for (int i = 0; i < 3; i++) {
    float fi = float(i);
    vec2 bp = vec2(fract(.1 + fi * .13 + T * .01), .74 + .04 * fi + .01 * sin(T + fi));
    vec2 d2 = G - floor(bp * uRes);
    float f = step(0., sin(T * 7. + fi * 2.));
    if ((abs(d2.x) == 1. && d2.y == f) || (d2.x == 0. && d2.y == 0.)) col = C(60, 70, 100);
  }
  return vec4(col, sky);
}`,

  /* ---------- Lily pond ---------- */
  pond: `
mat2 rot(float a) { float c = cos(a), s = sin(a); return mat2(c, s, -s, c); }
/* the lily pads: where (in A units of x), and how big */
vec3 padAt(float i) {
  if (i < .5) return vec3(.12, .74, .11);
  if (i < 1.5) return vec3(.3, .26, .09);
  if (i < 2.5) return vec3(.56, .6, .125);
  if (i < 3.5) return vec3(.8, .28, .1);
  if (i < 4.5) return vec3(.92, .8, .08);
  if (i < 5.5) return vec3(.4, .9, .07);
  return vec3(.68, .1, .065);
}
/* a koi, in its own frame (x towards the head): 0 outside, else 1 + where along */
float koi(vec2 p, float L, float i) {
  float u = p.x / L;
  if (u < -1. || u > .5) return 0.;
  float y = p.y - .1 * L * sin(T * 5. + i * 2. - u * 4.) * u * u, W = .23 * L;
  float wb = u > .1 ? W * sqrt(sat(1. - pow((u - .1) / .4, 2.))) : W * (1. - pow(sat((.1 - u) / .72), 1.5));
  if (abs(y) < wb) return 1.5 + u;
  float tu = (-.56 - u) / .42;
  if (tu > 0. && tu < 1. && abs(y) < W * (.25 + tu) && !(tu > .65 && abs(y) < W * (tu - .65) * 2.2)) return .5;
  if (length(vec2(u - .02, (abs(y) - W * 1.2) / W * .12)) < .12) return .4;
  return 0.;
}
vec4 scene(vec2 uv) {
  vec2 q = vec2(uv.x * A, uv.y), G = floor(F);
  float sky = 1.;
  /* tensorman.me: seen from 10% further up, about the middle of the screen (Z), so a little more pond shows */
  float Z = 1.1, P = PX() * Z;
  vec2 zq = (q - vec2(A * .5, .5)) * Z + vec2(A * .5, .5);
  vec2 wq = zq + vec2(M.x * .006, 0.);
  /* the water: deep green, caustics shimmering, the sky's soft reflection drifting */
  float n = fbm3(wq * 2.5 + vec2(T * .02, 0.));
  vec3 col = mix(C(26, 82, 96), C(48, 126, 120), n);
  float c1 = noise(wq * 13. + vec2(T * .25, T * .1)), c2 = noise(wq * 14. - vec2(T * .2, -T * .15) + 5.);
  col = mix(col, C(100, 180, 164), smoothstep(.06, .0, abs(c1 - c2)) * .28);
  col = mix(col, C(170, 214, 214), smoothstep(.55, .8, fbm3(wq * 1.2 + vec2(T * .01, 3.))) * .22);
  /* koi gliding under the surface, each with a shadow on the bottom */
  for (int i = 0; i < 4; i++) {
    float fi = float(i), w = (.12 + .05 * h1(fi + 1.)) * (h1(fi + 2.) > .5 ? 1. : -1.), th = T * w + h1(fi) * 6.3;
    vec2 R = vec2(.18 + .2 * h1(fi + 3.), .12 + .1 * h1(fi + 4.));
    vec2 o = vec2(A * (.25 + .5 * h1(fi + 5.)), .3 + .4 * h1(fi + 6.));
    vec2 pos = o + R * vec2(cos(th), sin(th)), dir = normalize(R * vec2(-sin(th), cos(th)) * sign(w));
    float L = .13 + .04 * h1(fi + 7.);
    vec2 r = wq - pos;
    if (dot(r, r) > L * L * 1.6) continue;
    vec2 p = vec2(dot(r, dir), dot(r, vec2(-dir.y, dir.x)));
    if (koi(p - vec2(-.008, .012) * mat2(dir.x, -dir.y, dir.y, dir.x), L, fi) > 0.) col *= .78;
    float k = koi(p, L, fi);
    if (k > 0.) {
      vec3 kc = C(255, 248, 238);
      float spots = noise(p / L * 5. + fi * 7.);
      if (fi == 0. || fi == 2.) { if (spots > .45) kc = C(255, 116, 50); }
      else if (fi == 1.) kc = spots > .6 ? C(255, 236, 200) : C(255, 160, 60);
      else { if (spots > .55) kc = C(255, 126, 60); if (spots < .25) kc = C(44, 44, 56); }
      if (k < 1.) kc = mix(kc, C(255, 236, 220), .3);
      col = mix(kc, col, k < 1. ? .45 : .14);
    }
  }
  /* rings spreading where something touched the water */
  for (int i = 0; i < 3; i++) {
    float fi = float(i), tt = T * .18 + fi / 3., k = fract(tt), id = floor(tt);
    vec2 c = vec2(hash(vec2(id, fi)) * A, hash(vec2(fi, id + 3.)));
    if (abs(length(wq - c) - k * .12) < P * .7) col = mix(col, C(190, 236, 226), (1. - k) * .6);
  }
  /* the lily pads, a water lily on some */
  for (int i = 0; i < 7; i++) {
    float fi = float(i);
    vec3 pd = padAt(fi);
    vec2 pc = vec2(pd.x * A, pd.y) + .006 * vec2(sin(T * .3 + fi), cos(T * .25 + fi * 2.));
    vec2 r = wq - pc;
    if (length(r - vec2(.012, -.016)) < pd.z && length(r) >= pd.z) col *= .72;
    if (length(r) > pd.z) continue;
    /* tensorman.me: a pad with a lily has its notch on the far side from the flower, so the notch never
     * cuts through the flower; every notch is edged dark like the rim */
    bool lily = fi == 0. || fi == 3. || fi == 4.;
    float na = (lily ? -.64 + .5 * (h1(fi + 11.) - .5) : h1(fi + 11.) * 6.283) + .1 * sin(T * .2 + fi), a = atan(r.y, r.x);
    float da = abs(mod(a - na + 3.1416, 6.2832) - 3.1416);
    if (da < .3 && length(r) > pd.z * .08) continue;
    sky = 0.;
    float l = dot(r / pd.z, normalize(vec2(-.6, .8)));
    col = l > .45 ? C(136, 204, 100) : C(96, 174, 82);
    if (length(r) > pd.z - P * 1.2 || (length(r) > pd.z * .08 && (da - .3) * length(r) < P * 1.2)) col = C(54, 120, 64);
    if (sin(a * 11. + fi) > .93 && length(r) > pd.z * .15) col = mix(col, C(150, 214, 110), .7);
    if (fi == 0. || fi == 3. || fi == 4.) {
      vec2 lp = r + vec2(pd.z * .2, -pd.z * .15);
      float fs = pd.z * .5, la = atan(lp.y, lp.x) + T * .05, rr = length(lp) / fs;
      if (rr < .55 + .45 * pow(abs(cos(la * 4.)), 1.5)) {
        col = fi == 3. ? C(255, 246, 236) : C(255, 168, 200);
        if (rr < .62 * (.55 + .45 * pow(abs(cos(la * 4. + .78)), 1.5))) col = fi == 3. ? C(255, 220, 230) : C(255, 222, 234);
        if (rr < .24) col = C(255, 214, 80);
      }
    }
  }
  /* a frog on the big pad */
  vec3 fp = padAt(2.);
  vec2 fr = (wq - vec2(fp.x * A, fp.y) - .006 * vec2(sin(T * .3 + 2.), cos(T * .25 + 4.)) - vec2(-.01, .005)) / 1.45;
  float bre = 1. + .04 * sin(T * 2.);
  vec3 dk = C(70, 140, 64), fg = C(124, 200, 84);
  bool blink = fract(T * .23) < .04;
  if (length((fr - vec2(-.036, -.02)) / vec2(.016, .03)) < 1. || length((fr - vec2(.036, -.02)) / vec2(.016, .03)) < 1.) { sky = 0.; col = dk; }
  if (length((fr - vec2(-.03, .028)) / vec2(.008, .014)) < 1. || length((fr - vec2(.03, .028)) / vec2(.008, .014)) < 1.) { sky = 0.; col = dk; }
  if (length(fr / vec2(.032, .04) * vec2(1., 1. / bre)) < 1.) {
    sky = 0.; col = fg;
    if (abs(fr.x) < .006 && fr.y < .02) col = C(170, 226, 110);
    if (hash(floor(F / 2.)) > .85 && fr.y < .01) col = dk;
  }
  for (int e = 0; e < 2; e++) {
    vec2 ep = fr - vec2(e == 0 ? -.017 : .017, .036);
    if (length(ep) < .012) { sky = 0.; col = C(160, 220, 110); if (length(ep) < .006) col = blink ? C(90, 160, 70) : C(30, 30, 36); }
  }
  /* blossom petals afloat, turning slowly */
  for (int i = 0; i < 6; i++) {
    float fi = float(i);
    vec2 pc = vec2(fract(h1(fi + 20.) + T * .004 * (h1(fi + 21.) - .3)) * (A + .2) - .1, h1(fi + 22.) + .02 * sin(T * .3 + fi));
    vec2 r = rot(T * .2 + fi) * (wq - pc);
    if (length(r / vec2(.014, .008)) < 1.) { sky = 0.; col = r.x > 0. ? C(255, 196, 214) : C(255, 226, 236); }
  }
  /* a grassy bank in one corner, mossy stones in the other */
  float bn = noise(zq * 9.);
  if (length((zq - vec2(-.06 + M.x * .012, 1.1)) * vec2(.75, 1.)) < .3 + .04 * bn) {
    sky = 0.;
    col = mix(C(96, 156, 74), C(136, 194, 92), step(.5, hash(vec2(G.x, floor(G.y / 3.)))));
    if (length((zq - vec2(-.06 + M.x * .012, 1.1)) * vec2(.75, 1.)) > .3 + .04 * bn - P * 2.) col = C(60, 110, 60);
  }
  for (int i = 0; i < 4; i++) {
    float fi = float(i);
    vec2 sc = vec2(A + .02 - .09 * fi - .04 * h1(fi) + M.x * .012, .02 + .05 * mod(fi, 2.) + .03 * h1(fi + 2.));
    float sr = .05 + .03 * h1(fi + 4.);
    vec2 r = zq - sc;
    if (length(r - vec2(-.008, -.01)) < sr && length(r) >= sr) col *= .7;
    if (length(r) < sr) {
      sky = 0.;
      float l = dot(r / sr, normalize(vec2(-.6, .8)));
      col = l > .35 ? C(196, 192, 200) : l > -.3 ? C(152, 148, 164) : C(110, 106, 126);
      if (l > .2 && noise(zq * 30. + fi) > .55) col = C(116, 170, 92);
    }
  }
  /* dragonflies darting over it all */
  for (int i = 0; i < 2; i++) {
    float fi = float(i), t = T * .25 + fi * 3.;
    vec2 pos = vec2(A * (.5 + .38 * sin(t * .9 + fi) * cos(t * .37)), .5 + .32 * sin(t * 1.3 + fi * 2.));
    vec2 vel = vec2(A * .38 * (.9 * cos(t * .9 + fi) * cos(t * .37) - .37 * sin(t * .9 + fi) * sin(t * .37)), .32 * 1.3 * cos(t * 1.3 + fi * 2.));
    vec2 dir = normalize(vel + 1e-4), nr = vec2(-dir.y, dir.x), r = zq - pos;
    if (dot(r, r) > .01) continue;
    float al = dot(r, dir), ac = dot(r, nr);
    float fl = .9 + .1 * sin(T * 40. + fi);
    for (int k = 0; k < 2; k++) {
      float wo = k == 0 ? .006 : -.004;
      if (length(vec2(al - wo, abs(ac) - .024 * fl) / vec2(.008, .023 * fl)) < 1.) col = mix(col, C(230, 244, 255), .6);
    }
    if (abs(ac) < P * (al > .004 ? 1.2 : .7) && al > -.05 && al < .014) { sky = 0.; col = al > .004 ? C(30, 60, 120) : C(70, 160, 240); }
  }
  return vec4(col, sky);
}`,

  /* ---------- Sunset canyon ---------- */
  canyon: `
float mesa(float x, float seed, float base, float amp) {
  float n = noise(vec2(x, seed)) * .75 + noise(vec2(x * 3.1, seed + 4.)) * .25;
  float top = smoothstep(.58, .61, n) * (.93 + .07 * noise(vec2(x * 9., seed))), talus = smoothstep(.36, .56, n) * .36;
  return base + amp * max(top, talus);
}
vec3 strata(float y, float x, float seed) {
  float b = mod(floor(y * 30. + noise(vec2(x * 3., seed)) * 1.2), 4.);
  return b == 0. ? C(240, 186, 136) : b == 1. ? C(204, 92, 70) : b == 2. ? C(226, 126, 78) : C(172, 72, 66);
}
/* a layer of mesas: rock banded in strata, sunlit faces to the left, shade to the right */
vec4 mesas(vec2 q, float sc, float seed, float base, float amp) {
  float x = q.x * sc, h = mesa(x, seed, base, amp);
  if (q.y >= h) return vec4(0.);
  vec3 c = strata(q.y, x, seed);
  float e = .05 * sc;
  if (q.y > mesa(x - e, seed, base, amp)) c = mix(c, C(255, 196, 140), .45);
  else if (q.y > mesa(x + e, seed, base, amp)) c = mix(c, C(96, 58, 110), .5);
  if (q.y > h - PX() * 1.5) c = mix(c, C(255, 214, 160), .5);
  return vec4(c, 1.);
}
vec4 scene(vec2 uv) {
  vec2 q = vec2(uv.x * A, uv.y), G = floor(F);
  float sky = 1.;
  vec3 col = mix(C(255, 206, 140), C(244, 140, 118), smoothstep(.4, .62, uv.y));
  col = mix(col, C(92, 92, 172), smoothstep(.6, 1., uv.y));
  vec2 sc = vec2(A * .22 - M.x * .003, .58);
  float sd = length(q - sc);
  col += C(255, 200, 130) * .45 * exp(-sd * 5.);
  if (sd < .075) col = C(255, 240, 190);
  vec2 cp = vec2(q.x * 1.2 + T * .008 + M.x * .008, q.y * 10.);
  float cn = fbm3(cp) * smoothstep(.62, .78, uv.y) * smoothstep(1., .86, uv.y) * 1.4;
  if (cn > .6) col = mix(C(255, 196, 166), C(186, 116, 166), smoothstep(.7, .95, uv.y));
  /* far mesas, hazy and cool */
  vec4 m = mesas(q + vec2(M.x * .004, 0.), 3., 1., .43, .12);
  if (m.a > 0.) { sky = 0.; col = mix(m.rgb, C(206, 140, 160), .55); }
  m = mesas(q + vec2(M.x * .008, 0.), 1.8, 7., .3, .3);
  if (m.a > 0.) { sky = 0.; col = mix(m.rgb, C(236, 160, 140), .15); }
  /* the canyon floor, a river winding through it far below */
  if (uv.y < .31) {
    sky = 0.;
    float v = (.31 - uv.y) / .31;
    col = mix(C(176, 96, 92), C(120, 64, 86), v);
    if (hash(floor(F / vec2(2., 1.))) > .9) col = mix(col, C(110, 132, 80), .6);
    float xc = A * .5 + (.04 + .22 * v) * sin(v * 7. + 1.) + M.x * .01 * v, wr = .004 + .06 * v * v;
    float dr = abs(q.x - xc);
    if (dr < wr + .004 + .02 * v) col = C(104, 128, 76);
    if (dr < wr) {
      col = mix(C(255, 196, 150), C(104, 132, 196), smoothstep(.1, .8, v));
      if (noise(vec2(q.x * 30., uv.y * 60. - T * .8)) > .64) col = mix(col, C(255, 236, 200), .6);
    }
  }
  /* near cliffs framing the view */
  float nx = q.x + M.x * .014;
  float hl = .3 - smoothstep(A * .2, A * .36, nx) * .4 + .02 * noise(vec2(nx * 10., 3.));
  float hr = .27 - smoothstep(A * .82, A * .66, nx) * .4 + .02 * noise(vec2(nx * 10., 8.));
  float hh = max(hl, hr);
  if (uv.y < hh) {
    sky = 0.;
    col = mix(strata(uv.y, nx * 2., 3.), C(110, 50, 70), .4);
    if (uv.y > hh - PX() * 2.) col = C(255, 180, 130);
    else if (hl > hr && nx > A * .2 && uv.y > hl - .05 - (nx - A * .2) * .5) col = mix(col, C(80, 44, 70), .3);
  }
  /* a juniper on the left rim */
  vec2 jb = vec2(A * .1 + M.x * .014 * -1., .3);
  vec2 jp = q - jb;
  if (abs(jp.x - jp.y * .3) < .006 && jp.y > -.01 && jp.y < .06) { sky = 0.; col = C(80, 50, 50); }
  float jn = noise(q * 40.);
  if (length((jp - vec2(.02, .075)) / vec2(.05, .03)) < .8 + .35 * jn || length((jp - vec2(-.02, .055)) / vec2(.035, .022)) < .8 + .35 * jn) { sky = 0.; col = jn > .55 ? C(110, 130, 80) : C(64, 86, 66); }
  /* a big bird circling on the warm air */
  for (int i = 0; i < 2; i++) {
    float fi = float(i), ba = T * (.3 + fi * .1) + fi * 2.;
    vec2 bc = vec2(A * (.6 - fi * .25) + (.26 - fi * .1) * cos(ba), .74 + fi * .05 + .06 * sin(ba));
    float bs = (.05 - fi * .02) * (1. + .2 * sin(ba));
    vec2 bp = (q - bc) / bs;
    float ax = abs(bp.x);
    if (ax < 1.6 && abs(bp.y) < .8) {
      float flap = .25 * sin(T * 6.) * step(.85, sin(T * .5 + fi * 2.));
      float yc = .32 * ax * (1. - ax * .4) + flap * ax, tw = .16 * (1. - ax / 1.7) + .05;
      if ((abs(bp.y - yc) < tw && ax < 1.5) || length(bp / vec2(.16, .2)) < 1. || (bp.y < 0. && bp.y > -.38 && ax < .12 - bp.y * .2)) { sky = 0.; col = C(60, 34, 56); }
    }
  }
  return vec4(col, sky);
}`,

  /* ---------- Storm lighthouse ---------- */
  storm: `
vec4 scene(vec2 uv) {
  vec2 q = vec2(uv.x * A, uv.y), G = floor(F);
  float hz = .34, sky = 1.;
  vec3 col = mix(C(88, 96, 134), C(30, 34, 64), smoothstep(hz, 1., uv.y));
  /* rolling storm clouds */
  float cn = fbm(vec2(q.x * 1.6 + T * .03 + M.x * .006, uv.y * 3.2 - T * .01));
  float cl = smoothstep(.45, .7, cn) * smoothstep(hz + .02, .55, uv.y);
  col = mix(col, mix(C(52, 56, 92), C(122, 124, 166), smoothstep(.55, .85, cn)), cl);
  /* far-off lightning, glowing softly inside the clouds */
  float lt = T * .16, li = floor(lt), lph = fract(lt);
  vec2 lc = vec2(h1(li * 3.) * A * .7, .55 + .3 * h1(li * 3. + 1.));
  float env = smoothstep(0., .03, lph) * smoothstep(.22, .04, lph) * (.8 + .2 * sin(lph * 80.));
  col += C(170, 150, 255) * env * .5 * exp(-length((q - vec2(lc.x, lc.y)) * vec2(.7, 1.)) * 3.5) * (.35 + cl);
  /* the sea, swells rolling in, crests breaking white */
  if (uv.y < hz) {
    sky = 0.;
    float d = (hz - uv.y) / hz, z = 1. / (hz - uv.y + .02);
    col = mix(C(60, 88, 112), C(20, 38, 58), smoothstep(0., .6, d));
    float wv = sin(uv.y * (95. - d * 60.) - T * 1.5 + noise(vec2(q.x * 4., uv.y * 9.)) * 3.5);
    if (wv > .5) col = mix(col, C(82, 114, 140), .55);
    if (wv > .88 && noise(vec2(q.x * 18., uv.y * 30.)) > .42) col = C(206, 220, 236);
    col += C(170, 150, 255) * env * .15 * (1. - d);
  }
  /* the cliff */
  float ex = A * .6 + .04 * noise(vec2(uv.y * 10., 2.)) + (uv.y - hz) * .2 + M.x * .008;
  float ct = .5 + .025 * noise(vec2(q.x * 8., 4.));
  if (q.x > ex && uv.y < ct && uv.y > hz - .06) {
    sky = 0.;
    col = mix(C(46, 46, 70), C(80, 76, 102), smoothstep(.35, .7, fbm3(vec2(q.x * 8., uv.y * 12.))));
    if (q.x < ex + .012) col = C(104, 100, 140);
    if (uv.y > ct - .012) col = uv.y > ct - PX() ? C(110, 140, 110) : C(70, 100, 84);
  }
  /* the lighthouse, its lamp, its beam sweeping round */
  vec2 L0 = vec2(A * .78 + M.x * .008, .5);
  vec2 Lp = L0 + vec2(0., .31);
  float ba = T * .7, cb = cos(ba), sb = sin(ba);
  vec2 r = q - Lp;
  float beamI = 0.;
  if (r.x * cb > 0.) {
    float ax = abs(r.x), hwid = .01 + ax * (.06 + .3 * (1. - abs(cb)));
    float len = 1.3 * abs(cb) + .15;
    if (abs(r.y) < hwid) beamI = exp(-ax / len * 1.2) * (1. - abs(r.y) / hwid) * (.6 + .4 * max(sb, 0.));
  }
  col += C(255, 236, 180) * .7 * beamI;
  col += C(255, 226, 160) * (.25 + .6 * pow(max(sb, 0.), 4.)) * exp(-length(r) * 16.);
  vec2 lh = q - L0;
  float tw = .042 - lh.y * .045;
  if (lh.y > -.01 && lh.y < .27 && abs(lh.x) < tw) {
    sky = 0.;
    col = mod(floor(lh.y / .068), 2.) == 1. ? C(210, 70, 78) : C(238, 236, 242);
    if (lh.x > tw * .3) col *= .76;
    if (abs(lh.x + .004) < .006 && lh.y < .03) col = C(60, 50, 64);
  }
  if (lh.y >= .27 && lh.y < .285 && abs(lh.x) < .044) { sky = 0.; col = C(48, 44, 62); }
  if (lh.y >= .285 && lh.y < .33 && abs(lh.x) < .026) { sky = 0.; col = mix(C(255, 220, 140), C(255, 252, 230), max(sb, 0.)); if (abs(lh.x) < PX() * .5 || abs(abs(lh.x) - .026) < PX()) col = C(60, 54, 70); }
  if (lh.y >= .33 && lh.y < .36 && abs(lh.x) < .03 * (1. - (lh.y - .33) / .035)) { sky = 0.; col = C(160, 52, 64); }
  /* the keeper's cottage, a warm window */
  vec2 hp = q - vec2(L0.x + .1, ct - .01);
  col += C(255, 190, 100) * .45 * exp(-length(hp - vec2(-.01, .03)) * 30.);
  if (abs(hp.x) < .05 && hp.y > 0. && hp.y < .05) {
    sky = 0.; col = hp.x > .025 ? C(150, 140, 150) : C(196, 186, 190);
    if (abs(hp.x + .01) < .011 && abs(hp.y - .026) < .011) col = abs(hp.x + .01) < PX() * .6 || abs(hp.y - .026) < PX() * .6 ? C(130, 80, 60) : C(255, 206, 110);
  }
  if (hp.y >= .05 && hp.y < .085 && abs(hp.x) < .06 - (hp.y - .05) * 1.6) { sky = 0.; col = C(62, 56, 80); }
  if (abs(hp.x - .03) < .007 && hp.y > .06 && hp.y < .1) { sky = 0.; col = C(80, 70, 90); }
  for (int s = 0; s < 4; s++) {
    float fs = float(s), k = fract(T * .3 + fs / 4.);
    vec2 sp = vec2(L0.x + .13 + k * .12, ct + .1 + k * .04);
    col = mix(col, C(120, 120, 150), smoothstep(.014 * (.6 + k), 0., length(q - sp)) * (1. - k) * .5);
  }
  /* waves bursting white against the foot of the cliff */
  float sk = fract(T * .28);
  if (sk < .8) {
    for (int i = 0; i < 5; i++) {
      float fi = float(i), a = sk + fi * .02;
      vec2 sp = vec2(A * .6 + M.x * .008 + .01 + fi * .03 - a * (.04 + .06 * h1(fi + 3.)), hz - .03 + sin(a * 2.) * (.08 + .07 * h1(fi)));
      float rr = (.012 + a * .03) * (.7 + .5 * h1(fi + 6.));
      if (length(q - sp) < rr) { sky = 0.; col = mix(col, length(q - sp - vec2(-.3, .4) * rr) < rr * .8 ? C(236, 244, 252) : C(170, 190, 214), smoothstep(.8, .3, sk)); }
    }
  }
  if (uv.y < hz - .01 && uv.y > hz - .07 && q.x > ex - .06 && q.x < ex + .02 && noise(vec2(q.x * 30. + T, uv.y * 30. - T * 2.)) > .55) { sky = 0.; col = C(196, 212, 230); }
  /* rain, slanting in on the wind, lit up where the beam catches it */
  float rx = floor((G.x + G.y * .45) / 2.), rs = hash(vec2(rx, 4.));
  float ry = fract(G.y / uRes.y * 1.3 + T * (1.1 + rs * .6) + rs * 9.);
  if (rs > .62 && ry < .07) col = mix(col, C(160, 172, 214) + C(255, 236, 180) * beamI, .4);
  return vec4(col, sky);
}`,

  /* ---------- Harvest field ---------- */
  harvest: `
mat2 rot(float a) { float c = cos(a), s = sin(a); return mat2(c, s, -s, c); }
/* a crow, facing left; p in its own units */
bool crow(vec2 p, float peck) {
  vec2 hc = vec2(-.9, .55 - peck * .5);
  return length(p / vec2(1., .62)) < 1. || length(p - hc) < .48 || (p.x > .6 && p.x < 1.5 && abs(p.y - .1 - (p.x - .6) * .3) < .25 - (p.x - .6) * .15)
    || (p.x < -1.2 && p.x > -1.6 && abs(p.y - hc.y + .05) < (p.x + 1.6) * .35) || (abs(p.x + .1) < .08 && p.y < -.5 && p.y > -1.1);
}
vec4 scene(vec2 uv) {
  vec2 q = vec2(uv.x * A, uv.y), G = floor(F);
  float hz = .44, sky = 1.;
  vec3 col = mix(C(255, 222, 172), C(164, 198, 230), smoothstep(hz, .8, uv.y));
  col = mix(col, C(112, 156, 214), smoothstep(.8, 1.1, uv.y));
  vec2 sp = vec2(A * .1 - M.x * .003, .66);
  float sd = length(q - sp);
  col += C(255, 200, 140) * .35 * exp(-sd * 4.);
  if (sd < .055) col = C(255, 246, 214);
  col = puffs(col, q, .8, .065, .014, 6., C(255, 250, 242), C(252, 228, 212), C(222, 182, 182));
  col = puffs(col, q, .62, .04, .008, 1., C(255, 246, 236), C(250, 222, 206), C(220, 180, 180));
  /* geese heading south */
  for (int i = 0; i < 7; i++) {
    float fi = float(i), k = floor((fi + 1.) / 2.), sd2 = mod(fi, 2.) * 2. - 1.;
    vec2 bp = vec2(fract(.6 - T * .012) * (A + .4) - .2, .84 + .004 * sin(T * 2. + fi));
    vec2 d2 = G - floor(bp * uRes.y) - vec2(k * 4., sd2 * k * 2.);
    float f = step(0., sin(T * 6. + fi));
    if ((abs(d2.x) == 1. && d2.y == f) || (d2.x == 0. && d2.y == 0.)) col = C(96, 90, 120);
  }
  /* far hills, then a line of autumn trees */
  float mx = q.x + M.x * .004;
  if (uv.y < hz + .06 + .05 * noise(vec2(mx * 2.2, 4.))) { sky = 0.; col = C(186, 176, 204); }
  float tx = q.x * 11. + M.x * .02, tcell = floor(tx), tf = fract(tx) * 2. - 1.;
  float tth = hz + .012 + .032 * sqrt(sat(1. - tf * tf)) * step(.3, hash(vec2(tcell, 2.)));
  if (uv.y < tth) {
    sky = 0.;
    float th = hash(vec2(tcell, 5.));
    col = th < .3 ? C(232, 132, 60) : th < .55 ? C(204, 82, 62) : th < .8 ? C(242, 192, 72) : C(150, 130, 64);
    if (tf > .2) col *= .82;
  }
  /* the red barn and its silo */
  vec2 bb = q - vec2(A * .22 + M.x * .006, hz - .02);
  if (abs(bb.x + .1) < .026 && bb.y > 0. && bb.y < .14) { sky = 0.; col = bb.x + .1 > .01 ? C(150, 160, 176) : C(196, 204, 214); if (mod(floor(bb.y * uRes.y), 5.) == 0.) col *= .9; }
  if (bb.y >= .14 && length((bb - vec2(-.1, .14)) / vec2(.026, .02)) < 1.) { sky = 0.; col = C(170, 70, 60); }
  if (bb.x > .06 && bb.x < .15 && bb.y > 0. && bb.y < .07) { sky = 0.; col = C(160, 48, 46); if (mod(G.x, 3.) == 0.) col *= .9; }
  if (bb.x > .06 && bb.x < .15 && bb.y >= .07 && bb.y < .1 - (bb.x - .06) * .05) { sky = 0.; col = C(96, 80, 92); }
  float gh = bb.y < .1 ? .075 - max(bb.y - .07, 0.) * .3 : .066 - (bb.y - .1) * 2.;
  if (abs(bb.x) < gh && bb.y > 0. && bb.y < .133) {
    sky = 0.;
    col = C(204, 60, 52);
    if (mod(G.x, 3.) == 0.) col = C(184, 52, 48);
    if (abs(bb.x) > gh - PX() * 1.2) col = C(250, 246, 236);
    if (abs(bb.x) < .032 && bb.y < .048) { col = C(180, 48, 46); vec2 dp = vec2(abs(bb.x), bb.y - .024); if (abs(dp.x - .032) < PX() || abs(abs(dp.y) - .024) < PX() || abs(dp.x * .75 - abs(dp.y)) < PX() * .7) col = C(250, 246, 236); }
    if (abs(bb.x) < .015 && abs(bb.y - .09) < .012) col = abs(bb.x) > .015 - PX() || abs(bb.y - .09) > .012 - PX() ? C(250, 246, 236) : C(80, 40, 40);
  }
  /* the wheat, waves of wind rolling through it */
  if (uv.y < hz) {
    sky = 0.;
    float d = hz - uv.y;
    float wave = sin(q.x * 4.5 - T * 1.3 + 2.2 / (d + .12) + 1.5 * noise(vec2(q.x * 2., d * 6.)) + M.x * .05);
    vec3 wc = mix(C(236, 180, 82), C(212, 148, 62), noise(vec2(q.x * 40., uv.y * 8.)));
    wc = mix(wc, C(255, 224, 134), smoothstep(.5, .95, wave));
    wc = mix(wc, C(186, 120, 56), smoothstep(-.6, -.95, wave) * .6);
    if (hash(vec2(G.x, floor(G.y / 3.))) > .8) wc *= .92;
    col = mix(wc, C(250, 216, 166), smoothstep(.1, .0, d) * .5);
  }
  /* round hay bales */
  for (int i = 0; i < 2; i++) {
    vec2 hb = q - vec2(A * (.4 + float(i) * .075) + M.x * .008, hz - .07 - float(i) * .025);
    float rb = .036 + float(i) * .008;
    if (length(hb) < rb && hb.y > -rb * .8) { sky = 0.; col = abs(fract(length(hb) / rb * 2.5) - .5) < .15 ? C(196, 144, 66) : C(238, 198, 108); if (length(hb) > rb - PX()) col = C(176, 124, 58); }
  }
  /* the scarecrow, swaying, a crow on its arm */
  vec2 S = vec2(A * .66 + M.x * .012, .1);
  vec2 s = rot(.03 * sin(T * .9)) * (q - S) / 1.3;
  vec3 straw = C(250, 214, 100);
  if (abs(s.x) < .006 && s.y > 0. && s.y < .26) { sky = 0.; col = C(120, 80, 50); }
  if (abs(s.y - .2) < .005 && abs(s.x) < .1) { sky = 0.; col = C(120, 80, 50); }
  bool plaidA = abs(s.x) < .042 && s.y > .12 && s.y < .215, plaidB = abs(s.y - .2) < .019 && abs(s.x) < .095;
  if (plaidA || plaidB) {
    sky = 0.;
    vec2 pc = floor(s * uRes.y / 2.);
    col = mod(pc.x, 2.) == 0. || mod(pc.y, 2.) == 0. ? C(206, 64, 60) : C(240, 136, 96);
    if (mod(pc.x, 2.) == 0. && mod(pc.y, 2.) == 0.) col = C(150, 40, 48);
  }
  if (abs(s.y - .2) < .02 && abs(s.x) > .095 && abs(s.x) < .118 && mod(G.y + G.x, 2.) == 0.) { sky = 0.; col = straw; }
  for (int l = 0; l < 2; l++) {
    float lx = l == 0 ? -.018 : .018;
    if (abs(s.x - lx) < .014 && s.y > .06 && s.y <= .12) { sky = 0.; col = s.y < .068 ? straw : C(84, 106, 166); if (l == 1 && abs(s.y - .09) < .008 && abs(s.x - lx) < .007) col = C(226, 170, 80); }
  }
  vec2 hc = s - vec2(0., .245);
  if (length(hc) < .03) {
    sky = 0.; col = C(232, 202, 150);
    if (length(hc - vec2(-.011, .004)) < .005 || length(hc - vec2(.011, .004)) < .005) col = C(50, 40, 50);
    if (abs(length(hc - vec2(0., .002)) - .016) < PX() * .7 && hc.y < -.006) col = C(110, 70, 60);
  }
  if (abs(s.y - .27) < .006 && abs(s.x) < .058) { sky = 0.; col = s.y > .27 ? C(244, 200, 100) : C(196, 146, 64); }
  if (s.y >= .27 && s.y < .306 && abs(s.x) < .027 - (s.y - .27) * .15) { sky = 0.; col = s.y < .281 ? C(200, 70, 60) : s.x < 0. ? C(240, 198, 100) : C(214, 166, 76); }
  float caw = step(.9, sin(T * 1.1));
  if (crow((s - vec2(-.075, .224)) / .016, -.15 * caw)) { sky = 0.; col = C(40, 36, 52); }
  /* crows hopping about, pecking */
  for (int i = 0; i < 2; i++) {
    float fi = float(i), ph = T * .7 + fi * 1.7, fp = fract(ph), dir = fi == 0. ? 1. : -1.;
    float x = A * (fi == 0. ? .3 : .84) - dir * mod(floor(ph) * .025 + smoothstep(0., .3, fp) * .025, .3) + M.x * .014;
    float y = .06 + fi * .03 + .025 * sin(3.1416 * sat(fp / .3));
    float pk = fp > .5 && fp < .85 ? sat(sin((fp - .5) * 18.)) : 0.;
    vec2 cp = (q - vec2(x, y + .026)) / .025;
    cp.x *= dir;
    if (crow(cp, pk)) { sky = 0.; col = C(36, 32, 48); if (cp.y > .35 && cp.x > -.6 && cp.x < .5) col = C(70, 72, 104); if (length(cp - vec2(-1.05, .7 - pk * .5)) < .14) col = C(240, 240, 250); }
  }
  /* a fringe of ripe ears right in front */
  if (uv.y < .2) {
    for (int j = -2; j <= 2; j++) {
      float cc = floor(G.x / 3.) + float(j);
      if (hash(vec2(cc, 7.)) < .35) continue;
      float top = (.08 + .1 * hash(vec2(cc, 8.))) * uRes.y;
      float k = sat(G.y / top), sw = (2. + hash(vec2(cc, 9.))) * sin(T * 1.6 + cc * .35 - G.y * .0) * k * k;
      float sx = cc * 3. + 1. + floor(sw + .5);
      if (G.y > top - 6. && G.y <= top && G.x - sx >= 0. && G.x - sx <= 1.) { sky = 0.; col = mod(G.y, 2.) == 0. ? C(250, 214, 120) : C(220, 160, 70); }
      else if (G.y <= top - 6. && G.x == sx) { sky = 0.; col = C(196, 140, 64); }
    }
  }
  return vec4(col, sky);
}`
};
