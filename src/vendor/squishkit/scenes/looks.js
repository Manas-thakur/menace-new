/* Scene looks. A scene paints full colour into a texture (a couple of samples per scene pixel), then one of
 * these passes finishes it at screen resolution:
 *   pixel   the default: levels, a light dither, scaled up with no smoothing (gl.js MAIN, no pass here)
 *   soft    the clay style: a smooth, painterly picture with a gentle glow on bright things
 *   paper   the scrapbook style: flat bands of coloured card, cut edges with a short shadow, paper grain
 *   crayon  the doodle style: wax crayon on warm paper, darker where the scene is darker, a wobbly pencil line
 * Each design system maps onto one: a scene without its own look= follows the closest [data-sq-style]. */

export const SCENE_LOOKS = ['pixel', 'soft', 'paper', 'crayon'];
export const LOOK_FOR_STYLE = { pixel: 'pixel', clay: 'soft', paper: 'paper', doodle: 'crayon' };

/* samples per scene pixel in the first pass, per look: enough that edges come out clean once smoothed */
export const LOOK_SUB = { soft: 2, paper: 2, crayon: 1.5 };

const COMMON = `
precision highp float;
uniform sampler2D uTex;
uniform vec2 uTexRes, uSrc, uOut, uFade;
uniform float uSky, uT, uDpr, uSub;
float hash(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
  return mix(mix(hash(i), hash(i + vec2(1., 0.)), f.x), mix(hash(i + vec2(0., 1.)), hash(i + vec2(1., 1.)), f.x), f.y);
}
float sat(float x) { return clamp(x, 0., 1.); }
float luma(vec3 c) { return dot(c, vec3(.299, .587, .114)); }
/* the painted scene: t in texels (centres at .5), clamped to the part of the texture this scene used */
vec4 texel(vec2 t) { return texture2D(uTex, clamp(t, vec2(.5), uSrc - .5) / uTexRes); }
vec4 tex(vec2 uv) { return texel(uv * uSrc); }
/* a smooth cubic (B-spline) read, from four bilinear ones */
vec4 cubic(vec2 uv) {
  vec2 p = uv * uSrc - .5, i = floor(p), f = p - i, f2 = f * f, f3 = f2 * f;
  vec2 w0 = (1. - 3. * f + 3. * f2 - f3) / 6., w1 = (4. - 6. * f2 + 3. * f3) / 6., w2 = (1. + 3. * f + 3. * f2 - 3. * f3) / 6., w3 = f3 / 6.;
  vec2 g0 = w0 + w1, g1 = w2 + w3, h0 = i - .5 + w1 / g0, h1 = i + 1.5 + w3 / g1;
  return g0.y * (g0.x * texel(vec2(h0.x, h0.y)) + g1.x * texel(vec2(h1.x, h0.y))) + g1.y * (g0.x * texel(vec2(h0.x, h1.y)) + g1.x * texel(vec2(h1.x, h1.y)));
}
/* 0..1: how far into a fade this point is (1 = not fading) */
float fadeK(vec2 uv) {
  float a = 1.;
  if (uFade.x > 0.) a = min(a, (1. - uv.y) / uFade.x);
  if (uFade.y > 0.) a = min(a, uv.y / uFade.y);
  return sat(a);
}
/* one scene pixel, in uv */
vec2 SP() { return uSub / uSrc; }
`;

const SOFT = `
void main() {
  vec2 uv = gl_FragCoord.xy / uOut;
  vec4 s = cubic(uv);
  vec3 c = s.rgb;
  /* a soft glow round bright things: a ring of wide taps */
  /* light spills from bright things onto darker surroundings (never brightening what is already bright) */
  vec3 g = vec3(0.), base = max(c, vec3(.45));
  for (int i = 0; i < 8; i++) {
    float fi = float(i), a = fi * 2.39996;
    g += max(tex(uv + vec2(cos(a), sin(a)) * SP() * (1.2 + fi * .4)).rgb - base, 0.);
  }
  c += g * (.5 / 8.);
  /* gentle: a touch more colour, a soft s-curve, the blacks lifted a little */
  float l = luma(c);
  c = mix(vec3(l), c, 1.06);
  c = mix(c, c * c * (3. - 2. * c), .12) * .97 + .025;
  c += (hash(gl_FragCoord.xy) - .5) / 160.;
  float k = fadeK(uv), a = (uSky > .5 ? 1. : sat(s.a)) * k * k * (3. - 2. * k);
  gl_FragColor = vec4(clamp(c, 0., 1.) * a, a);
}`;

const PAPER = `
const float N = 7.;
vec3 toY(vec3 c) { return vec3(dot(c, vec3(.25, .5, .25)), dot(c, vec3(.5, 0., -.5)), dot(c, vec3(-.25, .5, -.25))); }
vec3 fromY(vec3 y) { float t = y.x - y.z; return vec3(t + y.y, y.x + y.z, t - y.y); }
/* the band a colour falls in, and how high its card sits: ground over sky; on the ground darker card is nearer,
   in the sky lighter card (clouds, moons, stars) sits on top */
float wob;
vec4 band(vec2 uv) {
  vec4 s = tex(uv);
  float b = min(floor(pow(max(toY(s.rgb).x, 0.), .75) * N + wob), N - 1.);
  return vec4(s.rgb, s.a > .5 ? 20. - b : b);
}
void main() {
  vec2 uv = gl_FragCoord.xy / uOut, cp = gl_FragCoord.xy / uDpr;
  /* hand-cut: the band edges wander a little */
  wob = (noise(cp * .045) - .5) * .5 + .5;
  vec4 s = cubic(uv);
  /* flat card: brightness in a few bands (closer together in the dark), colour in a few steps of hue */
  vec3 y = toY(s.rgb);
  /* (capped at the top band, or pale skies would round up past white) */
  float b = min(floor(pow(max(y.x, 0.), .75) * N + wob), N - 1.), yb = pow((b + .5) / N, 1.333);
  vec2 ch = floor(y.yz / max(y.x, .04) * 12. + .5) / 12.;
  y = vec3(yb, ch * yb);
  vec3 c = clamp(fromY(y), 0., 1.);
  /* card stock: a little softer and warmer than ink */
  c = mix(c, vec3(luma(c)), .1) * vec3(1., .985, .955) + vec3(.02, .018, .012);
  float h = s.a > .5 ? 20. - b : b;
  /* the shadow a higher card casts down and to the right */
  vec2 d = vec2(-1., 1.) * uDpr / uOut;
  float sh = 0.;
  for (int i = 1; i <= 4; i++) {
    float fi = float(i);
    sh += step(h + .5, band(uv + d * (fi * 1.7 + .3)).a) * (1. - fi * .18);
  }
  c *= 1. - sat(sh / 2.4) * .2;
  /* the cut edge of a card catches the light */
  if (band(uv - d).a + .5 < h) c = mix(c, vec3(1.), .1);
  /* grain and fibres */
  float g = (hash(floor(cp * 1.3)) - .5) * .045 + (noise(vec2(cp.x * .5 + cp.y * .12, cp.y * 3.5) + b * 7.) - .5) * .04;
  c *= 1. + g;
  float a = uSky > .5 ? 1. : step(.5, s.a);
  /* a fade becomes a torn edge, with the paper's white core showing along it */
  float k = fadeK(uv);
  if (k < 1.) {
    /* torn along a wandering line, a few pixels of ragged fibre either side */
    float r = (noise(vec2(cp.x * .035, 3.)) - .5) * 16. + (noise(vec2(cp.x * .4, 9.)) - .5) * 3.;
    float kt = fadeK(uv + vec2(0., r * uDpr / uOut.y)), tear = .5;
    a *= smoothstep(tear - .015, tear + .005, kt);
    c = mix(c, vec3(.99, .975, .95), smoothstep(tear + .045, tear + .02, kt) * .9);
  }
  gl_FragColor = vec4(clamp(c, 0., 1.) * a, a);
}`;

const CRAYON = `
mat2 rot(float a) { float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }
void main() {
  vec2 uv = gl_FragCoord.xy / uOut, cp = gl_FragCoord.xy / uDpr, px = uDpr / uOut;
  /* the line boils a few times a second while the scene moves (it holds still with the scene) */
  float boil = floor(uT * 4.);
  vec2 w = (vec2(noise(cp * .05 + boil * 3.1), noise(cp * .05 + 17. + boil * 5.3)) - .5) * 2.6;
  vec2 wuv = uv + w * px;
  /* colouring in never quite follows the line: the fill wanders on its own */
  vec2 fw = (vec2(noise(cp * .09 + 40.), noise(cp * .09 + 70.)) - .5) * 4.;
  vec4 s = cubic(uv + fw * px);
  vec3 c = s.rgb;
  float L = luma(c), ch = length(c - L);
  /* warm paper, with a tooth the wax skips over */
  float tooth = hash(floor(cp * 1.3));
  vec3 paper = vec3(.98, .955, .905) * (.97 + .03 * tooth);
  /* strokes leaning up to the right, as a right hand lays them, turning a little for each shade */
  float ang = -.8 + (floor(L * 3. + .5) - 1.5) * .3;
  vec2 rp = rot(ang) * cp;
  /* strokes: bands a few pixels wide and a few times longer; inside them the wax catches on a stretched tooth */
  float st = noise(rp * vec2(.11, .42)) * .7 + noise(rp * vec2(.22, .8) + 5.) * .3;
  float grain = noise(rp * vec2(.7, 1.9) + 9.) * .55 + tooth * .45;
  float press = clamp(1.08 - L * .8 + ch * .45, .12, .8);
  /* light colour goes on as separate strokes; heavier colour is solid but for the tooth */
  float wst = mix(.65, .2, sat((press - .2) * 2.));
  float v = st * wst + grain * (1. - wst);
  float cov = smoothstep(1. - press - .12, 1. - press + .12, v);
  /* darker places get a second, crossing layer */
  vec2 rq = rot(ang - 1.25) * cp;
  float v2 = noise(rq * vec2(.11, .42)) * .4 + grain * .6;
  cov = max(cov, smoothstep(1.5 - press - .12, 1.5 - press + .12, v2) * .9);
  /* wax: the scene's colour, a little richer, streaky where it's laid on thick */
  vec3 wax = clamp(mix(vec3(L), c, 1.2) * (.86 + .24 * st), 0., 1.);
  /* where it's laid on thick, the gaps show an earlier, lighter layer rather than bare paper */
  vec3 col = mix(mix(paper, wax, sat(press - .2) * 1.4), wax, cov);
  /* a wobbly pencil line where big shapes meet: a sharp edge here, and still different a little way off
     on either side (so stars and specks don't get circled) */
  vec2 dx = vec2(px.x, 0.), dy = vec2(0., px.y);
  vec3 gx = tex(wuv + dx).rgb - tex(wuv - dx).rgb, gy = tex(wuv + dy).rgb - tex(wuv - dy).rgb;
  float e = sqrt(dot(gx, gx) + dot(gy, gy));
  vec2 n = vec2(dot(gx, vec3(1.)), dot(gy, vec3(1.)));
  n = n / max(length(n), 1e-4) * SP() * 1.6;
  float big = length(tex(wuv + n).rgb - tex(wuv - n).rgb);
  float ink = smoothstep(.2, .34, min(e, big * .7)) * (.55 + .45 * noise(cp * .25 + boil));
  col = mix(col, mix(c * .35, vec3(.17, .13, .2), .6), ink * .75);
  float a = uSky > .5 ? 1. : sat(s.a * 1.5 - .25);
  /* a fade: the crayon thins out, the paper ends */
  float k = fadeK(uv);
  a *= smoothstep(.0, .55, k + (v - .5) * .35);
  gl_FragColor = vec4(clamp(col, 0., 1.) * a, a);
}`;

export const LOOK_SHADERS = { soft: COMMON + SOFT, paper: COMMON + PAPER, crayon: COMMON + CRAYON };
