// Walks the real stacked page and captures every drawer pinned, plus the hand-off
// halfway into the next drawer.
//   node scripts/tour.mjs <url> <outDir> [--w 1440 --h 900 --reduced]
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';

const [, , url = 'http://127.0.0.1:5173/', outDir = 'tour', ...rest] = process.argv;
const opt = (n, d) => {
  const i = rest.indexOf(`--${n}`);
  return i === -1 ? d : rest[i + 1] && !rest[i + 1].startsWith('--') ? rest[i + 1] : true;
};
const width = Number(opt('w', 1440));
const height = Number(opt('h', 900));
mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({ channel: 'chrome' });
const page = await (
  await browser.newContext({ viewport: { width, height }, reducedMotion: opt('reduced', false) ? 'reduce' : 'no-preference' })
).newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));

await page.goto(url, { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);
await page.waitForFunction(() => document.querySelectorAll('.drawer').length >= 8, null, { timeout: 15000 });
await page.waitForTimeout(4400); // the cover's first light

const drawers = await page.evaluate(() => {
  const natural = (el) => {
    let top = 0;
    let node = el;
    while (node && node !== document.body) {
      const p = node.parentElement;
      if (!p) break;
      for (const s of p.children) {
        if (s === node) break;
        const pos = getComputedStyle(s).position;
        if (pos !== 'absolute' && pos !== 'fixed') top += s.offsetHeight;
      }
      node = p;
    }
    return top;
  };
  return [...document.querySelectorAll('.drawer')].map((d) => ({ id: d.id, top: natural(d), h: d.offsetHeight }));
});

const go = async (y) => {
  await page.evaluate((v) => window.scrollTo(0, v), y);
  await page.waitForTimeout(250);
  await page.evaluate((v) => window.scrollTo(0, v), y); // settle any smoothing
};

for (let i = 0; i < drawers.length; i++) {
  const d = drawers[i];
  const pinned = d.top + Math.max(0, d.h - height);
  await go(pinned);
  await page.waitForTimeout(1900);
  await page.screenshot({ path: `${outDir}/${String(i).padStart(2, '0')}-${d.id}.png` });
  const next = drawers[i + 1];
  if (next) {
    await go(next.top - height / 2);
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${outDir}/${String(i).padStart(2, '0')}-${d.id}-handoff.png` });
  }
}

const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
console.log(JSON.stringify({ drawers, overflow, errors }, null, 1));
await browser.close();
