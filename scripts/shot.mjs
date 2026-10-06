// Headless verification screenshots using the system Chrome (no browser download).
//
// usage:
//   node scripts/shot.mjs <url> <out.png> [options]
//
// options:
//   --w 1440 --h 900        viewport size (default 1440x900)
//   --dpr 1                 device scale factor
//   --wait 1200             extra ms to wait after load + fonts
//   --scroll 1200           scroll window to y (px) before capture
//   --to "#work"            scroll element into view (top) before capture
//   --full                  full-page capture
//   --reduced               emulate prefers-reduced-motion: reduce
//   --frames 4 --every 400  capture N frames, `every` ms apart (out-1.png, out-2.png, …)
//   --early                 capture from DOMContentLoaded (film intro animations)
//   --log                   print console errors/warnings from the page
import { chromium } from 'playwright-core';

const [, , url, out = 'shot.png', ...rest] = process.argv;
if (!url) {
  console.error('usage: node scripts/shot.mjs <url> <out.png> [--w 1440 --h 900 --wait ms --scroll y --to sel --full --reduced --frames n --every ms --log]');
  process.exit(1);
}
const opt = (name, fallback) => {
  const i = rest.indexOf(`--${name}`);
  if (i === -1) return fallback;
  const v = rest[i + 1];
  return v === undefined || v.startsWith('--') ? true : v;
};

const width = Number(opt('w', 1440));
const height = Number(opt('h', 900));
const dpr = Number(opt('dpr', 1));
const wait = Number(opt('wait', 1200));
const frames = Number(opt('frames', 1));
const every = Number(opt('every', 400));

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const context = await browser.newContext({
  viewport: { width, height },
  deviceScaleFactor: dpr,
  reducedMotion: opt('reduced', false) ? 'reduce' : 'no-preference',
});
const page = await context.newPage();
const logs = [];
page.on('console', (m) => {
  if (m.type() === 'error' || m.type() === 'warning') logs.push(`[${m.type()}] ${m.text()}`);
});
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));

// --early: start capturing at DOMContentLoaded (to film intros) instead of network idle
const early = Boolean(opt('early', false));
await page.goto(url, { waitUntil: early ? 'domcontentloaded' : 'networkidle' });
if (!early) await page.evaluate(() => document.fonts.ready);

const scrollY = opt('scroll', null);
const to = opt('to', null);
if (scrollY !== null) {
  await page.evaluate((y) => window.scrollTo(0, Number(y)), scrollY);
}
if (to) {
  await page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (el) window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY);
  }, to);
}
await page.waitForTimeout(wait);

const full = Boolean(opt('full', false));
// --clip x,y,w,h  (CSS px; combine with --dpr 3 for a zoomed crop)
const clipArg = opt('clip', null);
const clip = clipArg ? (([x, y, w, h]) => ({ x, y, width: w, height: h }))(String(clipArg).split(',').map(Number)) : undefined;
if (frames > 1) {
  const base = out.replace(/\.png$/i, '');
  for (let i = 1; i <= frames; i++) {
    await page.screenshot({ path: `${base}-${i}.png`, fullPage: full, clip });
    if (i < frames) await page.waitForTimeout(every);
  }
} else {
  await page.screenshot({ path: out, fullPage: full, clip });
}

const metrics = await page.evaluate(() => ({
  scrollWidth: document.documentElement.scrollWidth,
  clientWidth: document.documentElement.clientWidth,
  scrollHeight: document.documentElement.scrollHeight,
}));
console.log(JSON.stringify({ out, width, height, ...metrics, overflowX: metrics.scrollWidth > metrics.clientWidth }));
if (opt('log', false) && logs.length) console.log(logs.join('\n'));
await browser.close();
