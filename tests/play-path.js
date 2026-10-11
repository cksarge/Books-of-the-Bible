/*
 * Plays the whole learning path in a phone-sized browser using tests/solver.js (an auto-player
 * that answers every activity correctly) and reports stars, stops completed, and any errors.
 *
 *   node tests/play-path.js                 # fresh progress, every answer correct
 *   WRONG=4 node tests/play-path.js         # deliberately miss every 4th first attempt
 *                                           # (exercises the fix-your-mistakes loops)
 *   MAXSTEPS=3000 node tests/play-path.js   # stop early (default 12000 steps ≈ the whole path)
 *   node tests/play-path.js state.json      # start from a saved progress backup
 *
 * Output (screenshots, final progress backup) goes to tests/out/path/.
 * A full run takes roughly 10–25 minutes. Mystery Book may get 1–2 stars because the solver
 * finds the book by binary search (more guesses = fewer stars); that's expected.
 */
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const { serve } = require('./serve');

(async () => {
  const server = await serve();
  const out = path.join(__dirname, 'out', 'path');
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch();
  const page = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message + '\n' + e.stack));
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push('CONSOLE ' + m.text()); });
  await page.route(/fonts\.(googleapis|gstatic)/, (r) => r.abort());
  await page.addInitScript(fs.readFileSync(path.join(__dirname, 'solver.js'), 'utf8'));
  await page.goto(server.url + '/#/');
  if (process.argv[2]) await page.evaluate((s) => BB.store.import(s), fs.readFileSync(process.argv[2], 'utf8'));
  else await page.evaluate(() => BB.store.reset());
  await page.evaluate(() => { BB.store.data.settings.sound = false; BB.store.data.seenWelcome = true; BB.store.save(); });
  await page.reload();
  await page.waitForTimeout(300);
  await page.evaluate((w) => { window.__wrongEvery = w; }, +(process.env.WRONG || 0));
  await page.click('button.next-card');

  const MAX = +(process.env.MAXSTEPS || 12000);
  let idle = 0, steps = 0;
  const log = [];
  while (steps < MAX) {
    steps++;
    await page.waitForTimeout(60);
    const r = await page.evaluate(() => window.__step());
    log.push(r);
    if (r.startsWith('result-end')) break;
    const allDone = await page.evaluate(() => BB.path.done() === BB.path.stops.length);
    if (allDone && r.startsWith('result')) break;
    if (r === 'idle' || r.endsWith('wait')) {
      if (++idle > 60) {
        console.log('STUCK at', await page.evaluate(() => location.hash + ' ' + (document.querySelector('.act-title') || {}).textContent));
        await page.screenshot({ path: path.join(out, 'stuck.png') });
        break;
      }
    } else idle = 0;
    if (errs.length) break;
  }
  const res = await page.evaluate(() => ({
    stars: BB.store.totalStars(), maxStars: BB.path.maxStars, done: BB.path.done(), total: BB.path.stops.length,
    under3: BB.path.stops.filter((s) => BB.store.stop(s.id).plays && BB.store.stop(s.id).stars < 3).map((s) => `${s.id}:${BB.store.stop(s.id).stars}★`),
  }));
  console.log(`steps ${steps} · stops ${res.done}/${res.total} · stars ${res.stars}/${res.maxStars}`);
  if (res.under3.length) console.log('played but under 3 stars:', res.under3.join(' '));
  console.log('last steps:', log.slice(-12).join(' | '));
  console.log(errs.length ? errs.slice(0, 5) : 'no errors');
  await page.goto(server.url + '/#/'); await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(out, 'path.png'), fullPage: true });
  fs.writeFileSync(path.join(out, 'state.json'), await page.evaluate(() => BB.store.export()));
  await browser.close();
  server.close();
  process.exit(errs.length || res.done < res.total ? 1 : 0);
})();
