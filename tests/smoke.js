/*
 * Smoke test: opens every page and starts every activity on a laptop-sized and a phone-sized
 * screen, saving screenshots to tests/out/smoke/ and failing on any JavaScript error.
 * Run: node tests/smoke.js
 */
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const { serve } = require('./serve');

(async () => {
  const server = await serve();
  const out = path.join(__dirname, 'out', 'smoke');
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch();
  let failed = false;
  for (const [name, vp] of [['desk', { width: 1280, height: 860 }], ['phone', { width: 390, height: 844 }]]) {
    const page = await (await browser.newContext({ viewport: vp })).newPage();
    const errs = [];
    page.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message));
    page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push('CONSOLE ' + m.text()); });
    await page.route(/fonts\.(googleapis|gstatic)/, (r) => r.abort()); // keep it offline-friendly
    await page.goto(server.url + '/#/');
    await page.evaluate(() => { BB.store.reset(); BB.store.data.seenWelcome = true; BB.store.data.settings.sound = false; BB.store.save(); });
    await page.reload();
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${out}/${name}-path.png` });
    for (const r of ['practice', 'books', 'timeline', 'mnemonics', 'progress']) {
      await page.goto(`${server.url}/#/${r}`); await page.waitForTimeout(250);
      await page.screenshot({ path: `${out}/${name}-${r}.png`, fullPage: r === 'practice' });
    }
    const acts = ['lesson', 'flash', 'fade', 'test', 'quiz', 'order', 'speed', 'missing', 'match', 'sort', 'first', 'hood', 'survival', 'odd', 'mystery', 'shelf', 'unscramble', 'boss'];
    for (const a of acts) {
      await page.goto(`${server.url}/#/practice/${a}`); await page.waitForTimeout(150);
      await page.click('form.setup button[type=submit]');
      await page.waitForTimeout(350);
      if (a === 'boss') { await page.click('.part-intro button'); await page.waitForTimeout(200); }
      await page.screenshot({ path: `${out}/${name}-act-${a}.png` });
    }
    await page.goto(`${server.url}/#/daily`); await page.waitForTimeout(300);
    await page.screenshot({ path: `${out}/${name}-daily.png` });
    console.log(name, errs.length ? errs : 'no errors');
    if (errs.length) failed = true;
  }
  await browser.close();
  server.close();
  console.log(`Screenshots in ${out}`);
  process.exit(failed ? 1 : 0);
})();
