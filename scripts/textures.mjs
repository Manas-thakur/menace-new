// Generates the print textures used across the drawers into public/textures/.
// All are original, procedurally drawn line-art (no traced or copied artwork).
//   mandala.svg  — stroke-only mandala tile, used as a colourable CSS mask
//   jaali.svg    — Mughal-lattice (8-point star) tile, used as a CSS mask
//   feather.svg  — peacock-feather "eye" tile, full colour, used as a background
//   grain.svg    — fractal-noise print grain, used as a fixed overlay
//   flower.svg   — four-petal flower tile for the cover's album-page margin
//   guilloche.svg — woven sine lines (security print) for the hero's ticket
import { mkdirSync, writeFileSync } from 'node:fs';

const out = new URL('../public/textures/', import.meta.url);
mkdirSync(out, { recursive: true });
const f = (n) => Number(n.toFixed(2));

/* ── Mandala ─────────────────────────────────────────────── */
function petalRing(cx, cy, count, r0, r1, width, rot = 0) {
  // pointed leaf petals between radius r0 and r1
  let d = '';
  for (let i = 0; i < count; i++) {
    const a = ((i / count) * 360 + rot) * (Math.PI / 180);
    const ca = Math.cos(a), sa = Math.sin(a);
    const px = -sa, py = ca; // perpendicular
    const bx = cx + ca * r0, by = cy + sa * r0;
    const tx = cx + ca * r1, ty = cy + sa * r1;
    const mx = cx + ca * ((r0 + r1) / 2), my = cy + sa * ((r0 + r1) / 2);
    d += `M${f(bx)} ${f(by)}Q${f(mx + px * width)} ${f(my + py * width)} ${f(tx)} ${f(ty)}Q${f(mx - px * width)} ${f(my - py * width)} ${f(bx)} ${f(by)}Z`;
  }
  return `<path d="${d}"/>`;
}
function dotRing(cx, cy, count, r, dotR) {
  let s = '';
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    s += `<circle cx="${f(cx + Math.cos(a) * r)}" cy="${f(cy + Math.sin(a) * r)}" r="${dotR}"/>`;
  }
  return s;
}
function scallopRing(cx, cy, count, r, depth) {
  let d = '';
  for (let i = 0; i < count; i++) {
    const a0 = (i / count) * Math.PI * 2, a1 = ((i + 1) / count) * Math.PI * 2, am = (a0 + a1) / 2;
    const x0 = cx + Math.cos(a0) * r, y0 = cy + Math.sin(a0) * r;
    const x1 = cx + Math.cos(a1) * r, y1 = cy + Math.sin(a1) * r;
    const qx = cx + Math.cos(am) * (r + depth), qy = cy + Math.sin(am) * (r + depth);
    d += `${i === 0 ? `M${f(x0)} ${f(y0)}` : ''}Q${f(qx)} ${f(qy)} ${f(x1)} ${f(y1)}`;
  }
  return `<path d="${d}"/>`;
}
function mandala(cx, cy, s = 1) {
  return [
    `<circle cx="${cx}" cy="${cy}" r="${10 * s}"/>`,
    `<circle cx="${cx}" cy="${cy}" r="${18 * s}"/>`,
    petalRing(cx, cy, 8, 18 * s, 52 * s, 11 * s),
    `<circle cx="${cx}" cy="${cy}" r="${58 * s}"/>`,
    dotRing(cx, cy, 24, 66 * s, 2.6 * s),
    petalRing(cx, cy, 16, 74 * s, 118 * s, 10 * s, 11.25),
    petalRing(cx, cy, 16, 80 * s, 108 * s, 4 * s, 11.25),
    `<circle cx="${cx}" cy="${cy}" r="${124 * s}"/>`,
    scallopRing(cx, cy, 32, 130 * s, 12 * s),
    dotRing(cx, cy, 32, 150 * s, 3 * s),
    petalRing(cx, cy, 32, 158 * s, 186 * s, 6 * s),
    `<circle cx="${cx}" cy="${cy}" r="${192 * s}"/>`,
  ].join('');
}
{
  const T = 520; // tile size; mandalas at centre and corners so the tile repeats seamlessly
  const body = [mandala(T / 2, T / 2), mandala(0, 0), mandala(T, 0), mandala(0, T), mandala(T, T)].join('');
  writeFileSync(
    new URL('mandala.svg', out),
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${T} ${T}" width="${T}" height="${T}"><g fill="none" stroke="#000" stroke-width="2.4" stroke-linejoin="round">${body}</g></svg>`
  );
}

/* ── Jaali (Mughal lattice) ──────────────────────────────── */
{
  const T = 120, c = T / 2, r = 34;
  const sq = (rot) => {
    const pts = [0, 1, 2, 3].map((i) => {
      const a = ((i * 90 + rot) * Math.PI) / 180;
      return `${f(c + Math.cos(a) * r)},${f(c + Math.sin(a) * r)}`;
    });
    return `<polygon points="${pts.join(' ')}"/>`;
  };
  const star = sq(0) + sq(45);
  const links = `<path d="M${c} ${c - r}V0M${c} ${c + r}V${T}M${c - r} ${c}H0M${c + r} ${c}H${T}M0 0L${f(c - r * 0.7)} ${f(c - r * 0.7)}M${T} 0L${f(c + r * 0.7)} ${f(c - r * 0.7)}M0 ${T}L${f(c - r * 0.7)} ${f(c + r * 0.7)}M${T} ${T}L${f(c + r * 0.7)} ${f(c + r * 0.7)}"/>`;
  writeFileSync(
    new URL('jaali.svg', out),
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${T} ${T}" width="${T}" height="${T}"><g fill="none" stroke="#000" stroke-width="3" stroke-linejoin="round">${star}<circle cx="${c}" cy="${c}" r="12"/>${links}</g></svg>`
  );
}

/* ── Peacock feather eye ─────────────────────────────────── */
{
  const W = 180, H = 240;
  const eye = (x, y) => `
    <g transform="translate(${x} ${y})">
      <ellipse rx="54" ry="72" fill="#0d3b3a"/>
      <ellipse rx="44" ry="60" fill="#1d7a6b"/>
      <ellipse rx="36" ry="49" fill="#c8a43a"/>
      <ellipse rx="30" ry="41" fill="#2c8a4a"/>
      <ellipse cy="4" rx="22" ry="30" fill="#164f9e"/>
      <ellipse cy="8" rx="13" ry="18" fill="#0b1e46"/>
    </g>`;
  const barbs = Array.from({ length: 18 }, (_, i) => {
    const a = (i / 18) * Math.PI * 2;
    return `M${f(W / 2 + Math.cos(a) * 70)} ${f(H / 2 + Math.sin(a) * 92)}L${f(W / 2 + Math.cos(a) * 118)} ${f(H / 2 + Math.sin(a) * 150)}`;
  }).join('');
  writeFileSync(
    new URL('feather.svg', out),
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="#03222a"/><path d="${barbs}" stroke="#14564d" stroke-width="3" fill="none"/>${eye(W / 2, H / 2)}${eye(0, 0)}${eye(W, 0)}${eye(0, H)}${eye(W, H)}</svg>`
  );
}

/* ── Print grain ─────────────────────────────────────────── */
writeFileSync(
  new URL('grain.svg', out),
  `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240"><filter id="n" x="0" y="0"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="3" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 .9 0"/></filter><rect width="100%" height="100%" filter="url(#n)"/></svg>`
);

/* ── Margin flower: four petals round a seed, for the cover's album page ── */
{
  const T = 24, c = 12;
  const petal = (rot) => `<ellipse cx="${c}" cy="${c - 5}" rx="2.6" ry="4.6" transform="rotate(${rot} ${c} ${c})"/>`;
  writeFileSync(
    new URL('flower.svg', out),
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${T} ${T}" width="${T}" height="${T}"><g fill="#000">${[0, 90, 180, 270].map(petal).join('')}<circle cx="${c}" cy="${c}" r="1.9"/><circle cx="0" cy="0" r="1.2"/><circle cx="${T}" cy="0" r="1.2"/><circle cx="0" cy="${T}" r="1.2"/><circle cx="${T}" cy="${T}" r="1.2"/></g></svg>`
  );
}

/* ── Guilloche: the woven sine lines of security print, for the ticket ── */
{
  const W = 120, H = 48, rows = 4;
  let d = '';
  for (let k = 0; k < rows; k++) {
    const y0 = ((k + 0.5) * H) / rows;
    for (const dir of [1, -1]) {
      d += `M0 ${f(y0 + dir * 4.2 * Math.sin((k * Math.PI) / 2))}`;
      for (let x = 2; x <= W; x += 2) d += `L${x} ${f(y0 + dir * 4.2 * Math.sin((2 * Math.PI * x) / W + (k * Math.PI) / 2))}`;
    }
  }
  writeFileSync(
    new URL('guilloche.svg', out),
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"><path d="${d}" fill="none" stroke="#000" stroke-width="0.7"/></svg>`
  );
}

console.log('textures written to public/textures/');
