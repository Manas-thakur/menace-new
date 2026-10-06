// Accessibility audit of the full stacked page with axe-core.
//   node scripts/a11y.mjs [url]
import { chromium } from 'playwright-core';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const url = process.argv[2] || 'http://127.0.0.1:5173/?nointro';
const axeSource = readFileSync(createRequire(import.meta.url).resolve('axe-core/axe.min.js'), 'utf8');
const browser = await chromium.launch({ channel: 'chrome' });
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' })).newPage();
await page.goto(url, { waitUntil: 'networkidle' });
await page.waitForFunction(() => document.querySelectorAll('.drawer').length >= 8, null, { timeout: 15000 });
await page.waitForTimeout(1500);
await page.addScriptTag({ content: axeSource });
const result = await page.evaluate(async () => {
  // eslint-disable-next-line no-undef
  const r = await axe.run(document, { resultTypes: ['violations'] });
  return r.violations.map((v) => ({
    id: v.id,
    impact: v.impact,
    help: v.help,
    nodes: v.nodes.slice(0, 6).map((n) => `${n.target.join(' ')} :: ${(n.failureSummary || '').split('\n').slice(1, 2).join(' ').trim()}`),
    count: v.nodes.length,
  }));
});
const outline = await page.evaluate(() =>
  [...document.querySelectorAll('h1, h2, h3')].map((h) => `${h.tagName} ${(h.getAttribute('aria-label') || h.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 60)}`)
);
console.log(JSON.stringify({ violations: result, outline }, null, 1));
await browser.close();
