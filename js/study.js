/* Seventy-Three — lessons, flashcards, fading list, test simulation. */
(function () {
  const BB = window.BB, U = BB.U, ui = BB.ui, S = BB.store;

  /** Ready-made + personal mnemonic block for a stage. */
  BB.mnemonicHtml = function (st, { editable = true } = {}) {
    const mine = S.mnemonic('stage:' + st.id);
    return `<div class="mnemonic-card" data-sec="${st.sec}">
      <div class="mn-label">🧠 Memory trick</div>
      <div class="mn-text">${U.esc(st.mnemonic)}</div>
      <div class="mn-how">${U.esc(st.how)}</div>
      ${mine ? `<div class="mn-mine"><div class="mn-label">✍️ Your trick</div><div class="mn-text">${U.esc(mine)}</div></div>` : ''}
      ${editable ? `<button class="btn ghost small edit-mn" data-stage="${st.id}">${mine ? 'Edit my trick' : '✍️ Write my own trick'}</button>` : ''}
    </div>`;
  };

  /** Modal editor for a mnemonic. key: 'stage:id' | 'sec:id' | 'all' */
  BB.editMnemonic = function (key, books, onSave) {
    const letters = books.map((n) => BB.book(n).name.replace(/^\d /, (m) => m)).map((nm) => `<span class="ltr">${U.esc(nm.match(/^(\d )?./)[0])}</span>`).join(' ');
    const body = U.el(`<div><p class="muted small">First letters, in order:</p><div class="letters-row">${letters}</div>
      <p class="muted small">${books.map((n) => U.esc(BB.book(n).name)).join(' · ')}</p>
      <textarea class="input" rows="4" maxlength="500" placeholder="Make it silly, vivid, or personal — those stick best.">${U.esc(S.mnemonic(key))}</textarea></div>`);
    ui.modal({
      title: 'Your memory trick', body,
      actions: [
        { label: 'Delete', cls: 'ghost', onClick: () => { S.setMnemonic(key, ''); ui.toast('Trick removed'); onSave && onSave(); } },
        { label: 'Save', cls: 'primary', onClick: () => { S.setMnemonic(key, U.$('textarea', body).value); ui.toast('✍️ Trick saved', 'good'); onSave && onSave(); } },
      ],
    });
  };

  /** Mini timeline modal for a set of books. */
  BB.timelineModal = function (books, label) {
    const eras = BB.ERAS.filter((e) => e.books.some((n) => books.includes(n)));
    ui.modal({
      title: '🗺️ ' + U.esc(label) + ' on the timeline', wide: true,
      body: `<div class="mini-timeline">${BB.ERAS.map((e) => {
        const hit = eras.includes(e);
        return `<div class="mt-era ${hit ? 'hit' : ''}"><div class="mt-dot"></div><div><div class="mt-title">${U.esc(e.title)} <span class="muted small">${U.esc(e.dates)}</span></div>
          ${hit ? `<p class="small">${U.esc(e.story)}</p><div class="chips">${e.books.slice().sort((a, b) => a - b).map((n) => ui.chip(n, { cls: books.includes(n) ? 'hl' : 'dim' })).join('')}</div>` : ''}</div></div>`;
      }).join('')}</div><p><a class="btn ghost small" href="#/timeline">Open the full timeline →</a></p>`,
    });
  };

  /* ---------------- Lesson ---------------- */
  BB.def('lesson', {
    title: 'Lesson', icon: '📖', kind: 'learn',
    desc: 'Learn one chunk: read with summaries and a memory trick, fade the list away, then chain it onto what you know.',
    setup: [{ key: 'stage', type: 'stage', label: 'Chunk to learn' }],
    fromSetup(v) {
      const st = BB.STAGE_MAP[v.stage] || BB.STAGES[0];
      return { stage: st.id, sec: st.sec, title: 'Lesson: ' + st.title, poolKey: 'stage:' + st.id, poolLabel: `Books ${st.from}–${st.to}` };
    },
    run(body, opts, api) {
      const st = BB.STAGE_MAP[opts.stage];
      const books = st.books;
      const prev = st.index > 0 ? BB.STAGES[st.index - 1] : null;
      const missed = new Set();
      const score = { correct: 0, total: 0, hinted: 0 };
      const steps = ['intro', 'fade', 'letters', 'blank', 'check', ...(prev ? ['chain'] : []), 'recap'];
      let si = 0;
      const sec = BB.sec(st.sec);
      const go = () => { api.progress(si / (steps.length - 1)); body.innerHTML = ''; window.scrollTo(0, 0); STEPS[steps[si]](); };
      const next = () => { si++; go(); };

      const head = (eyebrow, title, text) => `<div class="lesson-head" data-sec="${st.sec}"><div class="eyebrow">${eyebrow}</div><h2>${title}</h2>${text ? `<p>${text}</p>` : ''}</div>`;

      /** A sheet round. modes: fn(n) -> 'show'|'input'|'letter' */
      const sheetRound = ({ eyebrow, title, text, list, modes, counts, live = true, after }) => {
        body.appendChild(U.el(head(eyebrow, title, text)));
        const m = {};
        list.forEach((n) => (m[n] = modes(n)));
        const sheet = BB.Sheet(body, { books: list, modes: m, strict: api.strict, live, onEnterLast: () => check.click() });
        const bar = U.el('<div class="sticky-actions"><button class="btn primary big">Check</button></div>');
        const check = U.$('button', bar);
        body.appendChild(bar);
        sheet.focus();
        check.onclick = () => {
          const r = sheet.grade();
          // first-letter rounds count as normal answers; only the 💡 button counts as a hint
          r.items.forEach((it) => { api.record(it.n, it.ok, it.hinted); if (!it.ok) missed.add(it.n); });
          if (counts) { score.correct += r.correct; score.total += r.total; score.hinted += r.hinted; }
          const perfect = r.correct === r.total;
          BB.sfx(perfect ? 'good' : r.correct ? 'tap' : 'bad');
          if (perfect) BB.fx.burst(check);
          const scoreText = `${r.correct} of ${r.total} correct${r.hinted ? ` · ${r.hinted} with hints` : ''}`;
          if (!perfect) return BB.fixLoop(sheet, bar, { intro: scoreText, onDone: after || next });
          bar.innerHTML = `<div class="round-score good">🎉 Perfect!${r.hinted ? ` · ${r.hinted} with hints` : ''}</div>`;
          const nb = U.el('<button class="btn primary big">Continue →</button>');
          nb.onclick = after || next;
          bar.appendChild(nb);
          nb.focus({ preventScroll: true });
        };
      };

      const STEPS = {
        intro() {
          body.innerHTML = `${head(`Lesson · Books ${st.from}–${st.to} · ${U.esc(sec.name)}`, U.esc(st.title), `Read these ${books.length} books out loud, in order. Notice what each one is about — the story helps the order stick.`)}
            <ol class="book-cards">${books.map((n) => { const b = BB.book(n); return `<li class="book-card" data-sec="${b.sec}"><span class="num-badge">${n}</span><div>
              <h4>${U.esc(b.name)} <span class="abbr">${U.esc(b.abbr)}</span>${b.deutero ? ' <span class="dc" title="Deuterocanonical">DC</span>' : ''}</h4>
              <p class="tagline">${U.esc(b.tag)}</p><p class="summary">${U.esc(b.summary)}</p></div></li>`; }).join('')}</ol>
            <div class="mn-slot">${BB.mnemonicHtml(st)}</div>
            ${books.some((n) => BB.book(n).deutero) ? '<p class="muted small"><span class="dc">DC</span> = deuterocanonical — one of the seven books in the Catholic Old Testament that are not in most Protestant Bibles.</p>' : ''}
            <div class="row-btns"><button class="btn ghost tl-link">🗺️ See where these fall on the timeline</button></div>
            <div class="sticky-actions"><button class="btn primary big start">I've read them — start recalling →</button></div>`;
          const bindMn = () => {
            const e = U.$('.edit-mn', body);
            if (e) e.onclick = () => BB.editMnemonic('stage:' + st.id, books, () => { U.$('.mn-slot', body).innerHTML = BB.mnemonicHtml(st); bindMn(); });
          };
          bindMn();
          U.$('.tl-link', body).onclick = () => BB.timelineModal(books, st.title);
          U.$('.start', body).onclick = next;
        },
        fade() {
          const hide = new Set(U.sample(books, Math.ceil(books.length / 2)));
          sheetRound({ eyebrow: 'Step 1 · Fading list', title: 'Fill the gaps', text: 'Some names have faded. Type them in — tap 💡 for a first-letter hint.', list: books, modes: (n) => (hide.has(n) ? 'input' : 'show') });
        },
        letters() {
          sheetRound({ eyebrow: 'Step 2 · First letters', title: 'Just the first letters', text: 'Halfway to full recall: only the first letter of each name is left.', list: books, modes: () => 'letter' });
        },
        blank() {
          sheetRound({ eyebrow: 'Step 3 · Blank page', title: 'From memory', text: 'Every name is gone. Recite the whole chunk.', list: books, modes: () => 'input', counts: true });
        },
        check() {
          body.appendChild(U.el(head('Step 4 · Quick check', 'Quick check', 'A few questions before you move on.')));
          const qs = BB.quiz.gen({ books, n: Math.min(5, books.length), format: 'mc', types: ['after', 'before', 'number', 'teaches', 'numberOf'] });
          BB.quiz.play(body, qs, {
            api: Object.assign({}, api, { progress() {} }),
            onDone(results) {
              results.forEach((r) => { if (!r.ok) missed.add(r.q.target); });
              score.correct += results.filter((r) => r.ok).length;
              score.total += results.length;
              next();
            },
          });
        },
        chain() {
          const list = prev.books.concat(books);
          sheetRound({
            eyebrow: 'Step 5 · Cumulative recite', title: 'Chain it on',
            text: `Add the new chunk onto what you already know: recite from ${U.esc(BB.book(prev.from).name)} straight through ${U.esc(BB.book(st.to).name)}.` +
              ` <span class="muted">(For the whole run from Genesis, try the <a href="#/practice/test">Test simulation</a> with books 1–${st.to}.)</span>`,
            list, modes: () => 'input', counts: true, live: false,
          });
        },
        recap() {
          const ms = [...missed].sort((a, b) => a - b);
          body.innerHTML = `${head('Recap', ms.length ? 'What to review' : 'Flawless!', ms.length ? 'These gave you trouble. Retry just these, or finish the lesson.' : 'You recalled every book without a miss. 🎉')}
            ${ms.length ? `<div class="chips big">${ms.map((n) => ui.chip(n, { num: true })).join('')}</div>` : ''}
            <div class="retry-slot"></div>
            <div class="sticky-actions">${ms.length ? '<button class="btn ghost big retry">↻ Retry just these</button>' : ''}<button class="btn primary big fin">Finish lesson ✓</button></div>`;
          U.$$('.chips .chip', body).forEach((c) => (c.onclick = () => ui.bookInfo(+c.dataset.n)));
          const r = U.$('.retry', body);
          if (r) r.onclick = () => {
            r.remove();
            const slot = U.$('.retry-slot', body);
            const sh = BB.Sheet(slot, { books: ms, modes: {}, strict: api.strict, live: true });
            const cb = U.el('<button class="btn primary">Check these</button>');
            slot.appendChild(cb);
            sh.focus();
            cb.onclick = () => {
              const g = sh.grade();
              g.items.forEach((it) => api.record(it.n, it.ok, it.hinted));
              const bar2 = U.el('<div class="row-btns"></div>');
              cb.replaceWith(bar2);
              if (g.correct === g.total) { bar2.innerHTML = '<div class="round-score good">✓ All correct now</div>'; BB.sfx('good'); }
              else BB.fixLoop(sh, bar2, { intro: `${g.correct} of ${g.total} correct`, onDone: () => (bar2.innerHTML = '<div class="round-score good">✓ All fixed!</div>'), doneLabel: 'Done' });
            };
          };
          U.$('.fin', body).onclick = () => api.finish({ correct: score.correct, total: score.total, hinted: score.hinted, missed: ms });
        },
      };
      go();
    },
  });

  /* ---------------- Flashcards ---------------- */
  const FLASH_MODES = [['num-name', '# → Name'], ['name-section', 'Name → Section'], ['name-summary', 'Name → Summary'], ['summary-name', 'Summary → Name'], ['mixed', 'Mixed']];
  BB.def('flash', {
    title: 'Flashcards', icon: '🃏', kind: 'tool',
    desc: 'Flip cards in four modes, with shuffle, filters, and "got it / still learning" sorting.',
    setup: [
      { key: 'pool', type: 'pool', label: 'Cards', def: 'all' },
      { key: 'mode', type: 'seg', label: 'Mode', options: FLASH_MODES, def: 'num-name' },
      { key: 'shuffle', type: 'toggle', label: 'Shuffle', def: true },
      { key: 'onlyLearning', type: 'toggle', label: 'Only cards marked "still learning"', def: false },
    ],
    fromSetup(v) {
      const p = BB.pools.resolve(v.pool);
      let books = p.books;
      if (v.onlyLearning) { const l = books.filter((n) => S.data.flash[n] === 'learning'); if (l.length) books = l; else ui.toast('No "still learning" cards there yet — using all.'); }
      return { books, mode: v.mode, shuffle: v.shuffle, poolKey: p.key + ':' + v.mode, poolLabel: p.label, sec: p.key.startsWith('sec:') ? p.key.slice(4) : null };
    },
    run(body, opts, api) {
      let deck = opts.shuffle === false ? opts.books.slice() : U.shuffle(opts.books);
      const total = deck.length;
      const firstTry = new Set(), struggled = new Set();
      let flipped = false;
      const wrap = U.el(`<div class="flash">
        <div class="flash-count muted"></div>
        <button class="card3d" aria-label="Flip card"><div class="inner"><div class="face front"></div><div class="face back"></div></div></button>
        <p class="muted small flip-tip">Tap the card (or press Space) to flip</p>
        <div class="flash-btns"><button class="btn learn">↺ Still learning</button><button class="btn got">✓ Got it</button></div>
      </div>`);
      body.appendChild(wrap);
      const card = U.$('.card3d', wrap), front = U.$('.front', wrap), back = U.$('.back', wrap), btns = U.$('.flash-btns', wrap);
      const trick = (n) => {
        const st = BB.stageOf(n);
        const mine = S.mnemonic('stage:' + st.id) || S.mnemonic('sec:' + BB.book(n).sec);
        return `<div class="card-trick">${mine ? '✍️ ' + U.esc(mine) : '🧠 ' + U.esc(st.mnemonic)}</div>`;
      };
      const faces = (n, mode) => {
        const b = BB.book(n), s = BB.sec(b.sec);
        const nameBig = `<div class="card-big">${U.esc(b.name)}</div>`;
        const ident = `<div class="card-sub">#${n} · ${U.esc(s.name)}${b.deutero ? ' · DC' : ''}</div>`;
        switch (mode) {
          case 'num-name': return [`<div class="card-q">Book number</div><div class="card-big num">${n}</div>`, `${nameBig}${ident}<p class="card-tag">${U.esc(b.tag)}</p>${trick(n)}`];
          case 'name-section': return [`<div class="card-q">Which section?</div>${nameBig}`, `<div class="card-big sec-name">${U.esc(s.name)}</div><div class="card-sub">#${n} · ${U.esc(s.testament === 'OT' ? 'Old' : 'New')} Testament</div>${trick(n)}`];
          case 'name-summary': return [`<div class="card-q">What is it about?</div>${nameBig}`, `<div class="card-name-sm">${U.esc(b.name)}</div><p class="card-summary">${U.esc(b.summary)}</p>${ident}`];
          case 'summary-name': return [`<div class="card-q">Which book?</div><p class="card-summary">${U.esc(BB.redact(n))}</p>`, `${nameBig}${ident}${trick(n)}`];
        }
      };
      const show = () => {
        if (!deck.length) {
          return api.finish({ correct: firstTry.size, total, missed: [...struggled], unit: 'first try', pct: firstTry.size / total });
        }
        const n = deck[0];
        const mode = opts.mode === 'mixed' ? U.pick(FLASH_MODES.slice(0, 4))[0] : opts.mode;
        const [f, bk] = faces(n, mode);
        flipped = false;
        card.classList.remove('flipped');
        card.setAttribute('data-sec', BB.book(n).sec);
        front.innerHTML = f;
        // the section colour would give away name→section cards, so keep the front neutral there
        card.classList.toggle('neutral-front', mode === 'name-section' || mode === 'summary-name');
        setTimeout(() => (back.innerHTML = bk), 150);
        btns.classList.remove('show');
        U.$('.flash-count', wrap).textContent = `${deck.length} card${deck.length === 1 ? '' : 's'} left · ✓ ${firstTry.size} got on first try`;
        api.progress((total - deck.length) / total);
      };
      const flip = () => { flipped = !flipped; card.classList.toggle('flipped', flipped); BB.sfx('flip'); if (flipped) btns.classList.add('show'); };
      card.onclick = flip;
      const answer = (got) => {
        if (!flipped) return;
        const n = deck.shift();
        if (got) {
          if (!struggled.has(n)) firstTry.add(n);
          S.data.flash[n] = 'got';
          BB.sfx('good');
        } else {
          struggled.add(n);
          S.data.flash[n] = 'learning';
          deck.splice(Math.min(deck.length, 3), 0, n);
        }
        api.record(n, got, false);
        show();
      };
      U.$('.got', wrap).onclick = () => answer(true);
      U.$('.learn', wrap).onclick = () => answer(false);
      const key = (e) => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
        if (e.key === ' ') { e.preventDefault(); flip(); }
        else if (e.key === 'ArrowRight') answer(true);
        else if (e.key === 'ArrowLeft') answer(false);
      };
      document.addEventListener('keydown', key);
      api.onCleanup(() => document.removeEventListener('keydown', key));
      api.meta('<span class="muted small">← learning · got it →</span>');
      show();
    },
  });

  /* ---------------- Fading list ---------------- */
  BB.def('fade', {
    title: 'Fading List', icon: '🌫️', kind: 'tool',
    desc: 'Read the list, then recite it as more names disappear each round — until the page is blank.',
    setup: [
      { key: 'pool', type: 'pool', label: 'List', def: 'sec:pent' },
      { key: 'letters', type: 'toggle', label: 'Include a first-letters round', def: true },
      { key: 'strict', type: 'toggle', label: 'Strict spelling' },
    ],
    fromSetup(v) {
      const p = BB.pools.resolve(v.pool);
      return { from: p.from, to: p.to, letters: v.letters, strict: v.strict, poolKey: p.key, poolLabel: p.label, sec: p.key.startsWith('sec:') ? p.key.slice(4) : null };
    },
    run(body, opts, api) {
      const books = U.range(opts.from, opts.to);
      const N = books.length;
      let plan = N <= 6 ? [0, 0.5, 'L', 1] : N <= 20 ? [0, 0.34, 0.67, 'L', 1] : [0, 0.25, 0.5, 0.75, 'L', 1];
      if (opts.letters === false) plan = plan.filter((x) => x !== 'L');
      const hidden = new Set();
      let r = 0, last = null;
      const round = () => {
        body.innerHTML = '';
        window.scrollTo(0, 0);
        api.progress(r / plan.length);
        const f = plan[r];
        const isLast = r === plan.length - 1;
        if (typeof f === 'number') {
          const want = Math.ceil(f * N);
          const visible = books.filter((n) => !hidden.has(n));
          U.sample(visible, Math.max(0, want - hidden.size)).forEach((n) => hidden.add(n));
        }
        const title = f === 0 ? 'Read the list' : f === 'L' ? 'First letters only' : f === 1 ? 'Blank page' : `${Math.round(f * 100)}% faded`;
        const text = f === 0 ? 'Read every name out loud, in order. Then continue.' : f === 'L' ? 'Each name is down to its first letter.' : f === 1 ? 'Recite all of them from memory.' : 'Type the faded names. Green means you got it.';
        body.appendChild(U.el(`<div class="lesson-head" ${opts.sec ? `data-sec="${opts.sec}"` : ''}><div class="eyebrow">Round ${r + 1} of ${plan.length}</div><h2>${title}</h2><p>${text}</p></div>`));
        const modes = {};
        books.forEach((n) => (modes[n] = f === 0 ? 'show' : f === 'L' ? 'letter' : f === 1 || hidden.has(n) ? 'input' : 'show'));
        const sheet = BB.Sheet(body, { books, modes, strict: api.strict, live: true, cols: N > 12, onEnterLast: () => U.$('.do-check', body).click() });
        const bar = U.el(`<div class="sticky-actions">${f === 0 ? '<button class="btn primary big do-check">I\'ve read it →</button>' : '<button class="btn primary big do-check">Check</button>'}${!isLast && r > 0 ? '<button class="btn ghost skip">Skip to blank page ⏭</button>' : ''}</div>`);
        body.appendChild(bar);
        if (f !== 0) sheet.focus();
        const sk = U.$('.skip', bar);
        if (sk) sk.onclick = () => { r = plan.length - 1; round(); };
        U.$('.do-check', bar).onclick = () => {
          if (f === 0) { r++; return round(); }
          const g = sheet.grade();
          g.items.forEach((it) => api.record(it.n, it.ok, it.hinted));
          last = g;
          const perfect = g.correct === g.total;
          BB.sfx(perfect ? 'good' : 'tap');
          const proceed = () => {
            if (isLast) return api.finish({ correct: last.correct, total: last.total, hinted: last.hinted, missed: last.items.filter((i) => !i.ok).map((i) => i.n) });
            r++;
            round();
          };
          if (!perfect) return BB.fixLoop(sheet, bar, { intro: `${g.correct} of ${g.total} correct`, onDone: proceed, doneLabel: isLast ? 'See results' : 'Next round →' });
          bar.innerHTML = '<div class="round-score good">🎉 Perfect round!</div>';
          const nb = U.el(`<button class="btn primary big">${isLast ? 'See results' : 'Next round →'}</button>`);
          bar.appendChild(nb);
          nb.focus({ preventScroll: true });
          nb.onclick = proceed;
        };
      };
      round();
    },
  });

  /* ---------------- Test simulation ---------------- */
  BB.def('test', {
    title: 'Test Simulation', icon: '📝', kind: 'quiz',
    desc: 'A blank numbered sheet you fill in from memory, then get graded. Optional timer and strict spelling.',
    setup: [
      { key: 'pool', type: 'pool', label: 'Sheet', def: 'all' },
      { key: 'timer', type: 'seg', label: 'Timer', options: [['off', 'Off'], ['up', 'Stopwatch'], ['5', '5 min'], ['10', '10 min'], ['15', '15 min']], def: 'up' },
      { key: 'strict', type: 'toggle', label: 'Strict spelling', hint: 'Only exact names count (no abbreviations, variants, or typos).' },
      { key: 'hints', type: 'toggle', label: 'Allow first-letter hints', def: true },
    ],
    fromSetup(v) {
      const p = BB.pools.resolve(v.pool);
      return { from: p.from, to: p.to, timer: v.timer, strict: v.strict, hints: v.hints, poolKey: `${p.key}${v.strict ? ':strict' : ''}`, poolLabel: p.label + (v.strict ? ' · strict' : ''), sec: p.key.startsWith('sec:') ? p.key.slice(4) : null };
    },
    run(body, opts, api) {
      const books = U.range(opts.from, opts.to);
      const limit = /^\d+$/.test(opts.timer) ? +opts.timer * 60000 : 0;
      body.appendChild(U.el(`<div class="test-head"><p>Write books <b>${opts.from}–${opts.to}</b> from memory.${api.strict ? ' <span class="tag">Strict spelling</span>' : ''}${opts.hints !== false ? ' <span class="muted small">💡 hints count separately.</span>' : ''}</p></div>`));
      const sheet = BB.Sheet(body, { books, modes: {}, strict: api.strict, hints: opts.hints !== false, cols: books.length > 12, onEnterLast: () => submit() });
      const bar = U.el('<div class="sticky-actions"><span class="muted small filled"></span><button class="btn primary big">Submit for grading</button></div>');
      body.appendChild(bar);
      const filled = U.$('.filled', bar);
      const upd = () => (filled.textContent = `${books.length - sheet.blanks()} / ${books.length} filled`);
      sheet.el.addEventListener('input', upd);
      upd();
      sheet.focus();
      const t0 = performance.now();
      let clockH = null;
      if (opts.timer && opts.timer !== 'off') {
        clockH = api.interval(() => {
          const el = performance.now() - t0;
          if (limit) {
            const left = limit - el;
            api.meta(`<span class="clock ${left < 30000 ? 'warn' : ''}">⏱ ${U.fmtTime(left)}</span>`);
            if (left <= 0) { ui.toast("⏱ Time's up!"); submit(true); }
          } else api.meta(`<span class="clock">⏱ ${U.fmtTime(el)}</span>`);
          api.progress((books.length - sheet.blanks()) / books.length);
        }, 250);
      }
      let submitted = false;
      const submit = async (force) => {
        if (submitted) return;
        const blanks = sheet.blanks();
        if (!force && blanks && !(await ui.confirm(`${blanks} blank${blanks === 1 ? '' : 's'} left. Submit anyway?`, 'Submit', 'Keep writing'))) return;
        submitted = true;
        clearInterval(clockH);
        const g = sheet.grade();
        g.items.forEach((it) => api.record(it.n, it.ok, it.hinted));
        const timeMs = performance.now() - t0;
        const done = () => {
          sheet.el.remove();
          api.finish({ correct: g.correct, total: g.total, hinted: g.hinted, missed: g.items.filter((i) => !i.ok).map((i) => i.n), timeMs, details: U.el('<div><h3 class="details-h">Your sheet</h3></div>').appendChild(sheet.el).parentNode });
        };
        // a test is one shot; only the boss recite (a learning step) fixes mistakes before results
        if (g.correct === g.total || !opts.fixMistakes) return done();
        bar.innerHTML = '';
        BB.fixLoop(sheet, bar, { intro: `${g.correct} of ${g.total} correct`, onDone: done, doneLabel: 'See results' });
        const firstBad = U.$('.srow.bad', sheet.el);
        if (firstBad) firstBad.scrollIntoView({ block: 'center', behavior: 'smooth' });
      };
      U.$('button', bar).onclick = () => submit();
    },
  });
})();
