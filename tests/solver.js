// Injected into the page: one step of "play correctly".
window.__step = function () {
  const BB = window.BB, $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const vis = (el) => el && el.offsetParent !== null && !el.disabled;
  const setVal = (inp, v) => { inp.value = v; inp.dispatchEvent(new Event('input', { bubbles: true })); };
  const id = (t) => BB.match.identify(t.trim());
  const wrongNow = () => !!window.__wrongEvery && (++window.__wc % window.__wrongEvery === 0);
  window.__wc = window.__wc || 0;
  const modal = $('.modal-back');
  if (modal) { const b = $('.modal-actions .btn.primary', modal); if (b) { b.click(); return 'modal-primary'; } $('[data-close]', modal).click(); return 'modal-close'; }
  // result screen
  if ($('.result')) {
    const next = $$('.result-actions .btn').find((b) => /^Next:/.test(b.textContent));
    if (next) { next.click(); return 'result-next'; }
    const replay = $$('.result-actions .btn').find((b) => /Replay/.test(b.textContent));
    if (replay) { replay.click(); return 'result-replay'; }
    return 'result-end:' + $('.result-stats b').textContent;
  }
  const nb = $$('.next-btn').find(vis); if (nb) { nb.click(); return 'next'; }
  const pi = $('.part-intro button'); if (pi) { pi.click(); return 'part'; }
  const start = $('.sticky-actions .start'); if (start) { start.click(); return 'lesson-start'; }
  const fin = $('.sticky-actions .fin'); if (fin) { fin.click(); return 'lesson-finish'; }
  // quiz
  const quiz = $('.quiz');
  if (quiz && quiz._q && !$('.qfeedback .fb-title', quiz)) {
    const q = quiz._q;
    // never miss on purpose on the last life, or a 12-question boss with 3 lives can never be beaten
    const bad = !q._entry && $$('.lives i.on', quiz).length !== 1 && wrongNow();
    if (q.format === 'mc') { const opts = quiz._opts || q.options; const i = bad ? opts.findIndex((v) => v !== q.answer) : opts.indexOf(q.answer); $$('.mc-opt', quiz)[i].click(); return bad ? 'mc-WRONG' : 'mc'; }
    const inp = $('.qanswer input', quiz);
    const val = q.kind === 'num' ? String(bad ? (q.answer % 73) + 1 : q.answer) : BB.book(bad ? (q.answer % 73) + 1 : q.answer).name;
    setVal(inp, val); $('.qanswer form', quiz).requestSubmit(); return bad ? 'typed-WRONG' : (q._entry ? 'typed-fix' : 'typed');
  }
  // sheet rounds (lesson/fade/test)
  const sheetInputs = $$('.sheet input:not(:disabled)');
  if (sheetInputs.length) {
    let w = 0;
    sheetInputs.forEach((inp) => { const row = inp.closest('.srow'); const bad = !row.classList.contains('redo') && wrongNow(); if (bad) w++; setVal(inp, bad ? 'zzz' : BB.book(+row.dataset.n).name); });
    if (w) { $$('.sticky-actions .btn.primary').find(vis).click(); return 'sheet-check-WRONG' + w; }
    const b = $$('.sticky-actions .btn.primary').find(vis); b.click(); return 'sheet-check';
  }
  const stickyPrimary = $$('.sticky-actions .btn.primary').find(vis);
  if (stickyPrimary && /Continue|Next round|See results|read it|Fix mistakes/.test(stickyPrimary.textContent)) { stickyPrimary.click(); return 'sticky:' + stickyPrimary.textContent.trim(); }
  // flashcards
  if ($('.card3d')) { if (!$('.card3d.flipped')) { $('.card3d').click(); return 'flip'; } $('.flash-btns .got').click(); return 'got'; }
  // put in order
  const sl = $('.sort-list:not(.locked)');
  if (sl) { $$('.sort-item', sl).sort((a, b) => a.dataset.n - b.dataset.n).forEach((it) => sl.appendChild(it)); $('.chk').click(); return 'order'; }
  // speed
  const sp = $('.speed input');
  if (sp) { const slot = $('.slot:not(.filled)'); setVal(sp, BB.book(+slot.dataset.n).name); if (sp.value) sp.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); return 'speed'; }
  // missing
  if ($('.run .gap') && $('.ans input:not(:disabled)')) {
    const items = $$('.run .run-item'); const gi = items.findIndex((x) => x.classList.contains('gap'));
    const n = gi > 0 ? id(items[gi - 1].textContent) + 1 : id(items[gi + 1].textContent) - 1;
    setVal($('.ans input'), BB.book(n).name); $('.ans form').requestSubmit(); return 'missing';
  }
  // match
  if ($('.match')) {
    const l = $('.mcard.book:not(.matched)'); if (!l) return 'match-wait';
    l.click(); $(`.mcard.desc[data-n="${l.dataset.n}"]`).click(); return 'match';
  }
  // sort it
  if ($('.sortit')) { const c = $('.sort-card'); if (c.classList.contains('ok') || c.classList.contains('bad')) return 'sort-wait'; const n = id(c.querySelector('span').textContent); if (wrongNow()) { $$('.bin').find((b) => b.dataset.id !== BB.book(n).sec).click(); return 'sort-WRONG'; } $(`.bin[data-id="${BB.book(n).sec}"]`).click(); return 'sort'; }
  // which first
  const duel = $$('.duel-btn:not(:disabled)'); if (duel.length === 2) { const early = +duel[0].dataset.n < +duel[1].dataset.n ? 0 : 1; duel[wrongNow() ? 1 - early : early].click(); return 'first'; }
  // neighborhood
  if ($('.hood') && $('.hood input:not(:disabled)')) {
    const n = id($('.hood-center').childNodes[0].textContent);
    setVal($('.hood-slot.before input'), BB.book(n - 1).name); setVal($('.hood-slot.after input'), BB.book(n + 1).name);
    $('.hood-check').click(); return 'hood';
  }
  // survival
  if ($('.survival') && $('.survival .ans input:not(:disabled)')) { const n = id($('.surv-q b').textContent); setVal($('.survival .ans input'), BB.book(n + 1).name); $('.survival .ans form').requestSubmit(); return 'survival'; }
  // odd one out
  const odd = $$('.odd-btn:not(:disabled)');
  if (odd.length === 4) { const secs = odd.map((b) => BB.book(+b.dataset.n).sec); const o = odd.find((b, i) => secs.filter((s) => s === secs[i]).length === 1); o.click(); return 'odd'; }
  // mystery: read every clue row and guess the middle of the books that still fit them all
  if ($('.mys-box') && $('.mys-box ~ .ans input:not(:disabled), .ans input:not(:disabled)')) {
    const m = /books (\d+)–(\d+)/.exec($('.game-head').textContent);
    const lo = m ? +m[1] : 1, hi = m ? +m[2] : 73;
    const clues = $$('.guess').map((row) => ({
      p: id(row.querySelector('.chip').textContent), earlier: /Earlier/.test(row.querySelector('.g-dir').textContent),
      t: /✓/.test(row.querySelector('.g-t').textContent), s: /✓/.test(row.querySelector('.g-s').textContent),
      band: /very close/.test(row.querySelector('.g-h').textContent) ? 0 : /close/.test(row.querySelector('.g-h').textContent) ? 1 : 2,
    }));
    const fits = [];
    for (let n = lo; n <= hi; n++) if (!clues.some((c) => c.p === n) && !BB.mysteryIgnored(n, clues, lo, hi).length) fits.push(n);
    const guess = fits[Math.floor((fits.length - 1) / 2)];
    setVal($('.ans input'), BB.book(guess).name); $('.ans form').requestSubmit(); return 'mystery ' + guess;
  }
  // shelf
  const sel = $('.spine.sel'); if (sel && $('.sp-ans input')) { setVal($('.sp-ans input'), BB.book(+sel.dataset.n).name); $('.sp-ans form').requestSubmit(); return 'shelf'; }
  // unscramble
  if ($('.unscr') && $$('.tile:not(.used)').length) {
    const letters = $$('.tile').map((t) => t.textContent).sort().join('');
    const pre = ($('.prefix') || {}).textContent || '';
    const n = BB.BOOKS.find((b) => { const w = (b.n === 51 ? 'Acts' : b.name.replace(/^\d /, '')).toUpperCase().replace(/ /g, ''); return w.split('').sort().join('') === letters && (pre ? b.name.startsWith(pre + ' ') : !/^\d/.test(b.name)); }).n;
    const word = (n === 51 ? 'Acts' : BB.book(n).name.replace(/^\d /, '')).toUpperCase().replace(/ /g, '');
    const tiles = $$('.tile'); const used = new Set();
    for (const ch of word) { const i = tiles.findIndex((t, k) => t.textContent === ch && !used.has(k)); used.add(i); tiles[i].click(); }
    return 'unscramble';
  }
  return 'idle';
};
