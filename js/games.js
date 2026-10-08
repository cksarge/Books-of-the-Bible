/* Seventy-Three — games. */
(function () {
  const BB = window.BB, U = BB.U, ui = BB.ui, S = BB.store;

  const poolOpts = (v, extra = {}) => {
    const p = BB.pools.resolve(v.pool);
    return Object.assign({ books: p.books, from: p.from, to: p.to, poolKey: p.key, poolLabel: p.label, sec: p.key.startsWith('sec:') ? p.key.slice(4) : null }, extra);
  };
  const stopwatch = (api, t0 = performance.now()) => api.interval(() => api.meta(`<span class="clock">⏱ ${U.fmtTime(performance.now() - t0)}</span>`), 250);
  const nextBtn = (parent, label, fn, auto) => {
    const b = U.el(`<button class="btn primary next-btn">${label}</button>`);
    parent.appendChild(b);
    let t = auto ? setTimeout(() => go(), auto) : null;
    const key = (e) => { if (e.key === 'Enter' && !(e.target.tagName === 'INPUT' && !e.target.disabled)) { e.preventDefault(); go(); } };
    const go = () => { clearTimeout(t); document.removeEventListener('keydown', key); b.disabled = true; fn(); };
    b.onclick = go;
    setTimeout(() => { if (!b.disabled) document.addEventListener('keydown', key); }, 80);
    return b;
  };
  const bookName = (n) => U.esc(BB.book(n).name);
  const neutralChip = (n, cls = '') => `<span class="chip plain ${cls}" data-n="${n}">${bookName(n)}</span>`;

  /* ---------------- Put in order ---------------- */
  function sortable(list) {
    let drag = null;
    list.addEventListener('pointerdown', (e) => {
      const item = e.target.closest('.sort-item');
      if (!item || e.target.closest('button') || list.classList.contains('locked')) return;
      e.preventDefault();
      item.setPointerCapture(e.pointerId);
      drag = { item, y: e.clientY, id: e.pointerId };
      item.classList.add('dragging');
    });
    list.addEventListener('pointermove', (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      const it = drag.item;
      let dy = e.clientY - drag.y;
      const prev = it.previousElementSibling, next = it.nextElementSibling;
      const top0 = it.offsetTop;
      if (next && dy > next.offsetHeight / 2 + 4) list.insertBefore(next, it);
      else if (prev && dy < -(prev.offsetHeight / 2 + 4)) list.insertBefore(it, prev);
      drag.y += it.offsetTop - top0;
      dy = e.clientY - drag.y;
      it.style.transform = `translateY(${dy}px)`;
    });
    const end = () => {
      if (!drag) return;
      drag.item.style.transform = '';
      drag.item.classList.remove('dragging');
      drag = null;
      BB.sfx('tap');
    };
    list.addEventListener('pointerup', end);
    list.addEventListener('pointercancel', end);
    list.addEventListener('click', (e) => {
      const b = e.target.closest('button[data-dir]');
      if (!b || list.classList.contains('locked')) return;
      const it = b.closest('.sort-item');
      if (b.dataset.dir === 'up' && it.previousElementSibling) list.insertBefore(it, it.previousElementSibling);
      if (b.dataset.dir === 'down' && it.nextElementSibling) list.insertBefore(it.nextElementSibling, it);
      BB.sfx('tap');
    });
  }

  BB.def('order', {
    title: 'Put in Order', icon: '🔀', kind: 'game',
    desc: 'Drag scrambled books into the correct sequence.',
    setup: [
      { key: 'pool', type: 'pool', label: 'Books', def: 'ot' },
      { key: 'size', type: 'seg', label: 'Books per round', options: [[5, '5'], [7, '7'], [10, '10']], def: 7 },
      { key: 'rounds', type: 'seg', label: 'Rounds', options: [[1, '1'], [3, '3'], [5, '5']], def: 3 },
    ],
    fromSetup: (v) => poolOpts(v, { size: +v.size, rounds: +v.rounds }),
    run(body, opts, api) {
      const pool = opts.books || [...new Set(opts.sets.flat())].sort((a, b) => a - b);
      const size = Math.min(opts.size || 7, pool.length);
      const sets = opts.sets || Array.from({ length: opts.rounds || 3 }, (_, r) => {
        if (pool.length <= size) return pool.slice();
        if (r % 2 === 0) { const s = Math.floor(Math.random() * (pool.length - size + 1)); return pool.slice(s, s + size); }
        return U.sample(pool, size).sort((a, b) => a - b);
      });
      let r = 0, correct = 0, total = 0;
      const missed = [];
      const round = () => {
        const set = sets[r];
        let order = U.shuffle(set);
        if (set.length > 1) while (order.every((n, i) => n === set[i])) order = U.shuffle(set);
        api.progress(r / sets.length);
        body.innerHTML = `<div class="game-head"><h3>Round ${r + 1} of ${sets.length}</h3><p class="muted">Drag (or use the arrows) to put these in Bible order — earliest at the top.</p></div>
          <ol class="sort-list">${order.map((n) => `<li class="sort-item" data-n="${n}"><span class="grip">⋮⋮</span><span class="sname">${bookName(n)}</span><span class="spos"></span><span class="arrows"><button data-dir="up" aria-label="Move up">▲</button><button data-dir="down" aria-label="Move down">▼</button></span></li>`).join('')}</ol>
          <div class="sticky-actions"><button class="btn primary big chk">Check order</button></div>`;
        const list = U.$('.sort-list', body);
        sortable(list);
        U.$('.chk', body).onclick = (e) => {
          list.classList.add('locked');
          const items = U.$$('.sort-item', list);
          let rc = 0;
          items.forEach((it, i) => {
            const n = +it.dataset.n, ok = n === set[i];
            it.classList.add(ok ? 'ok' : 'bad');
            it.setAttribute('data-sec', BB.book(n).sec);
            U.$('.spos', it).textContent = ok ? `#${n}` : `#${n} · belongs at spot ${set.indexOf(n) + 1}`;
            if (ok) rc++; else missed.push(n);
            api.record(n, ok, false);
          });
          correct += rc;
          total += set.length;
          BB.sfx(rc === set.length ? 'good' : 'bad');
          if (rc === set.length) BB.fx.burst(e.target);
          const bar = e.target.parentNode;
          bar.innerHTML = `<div class="round-score ${rc === set.length ? 'good' : ''}">${rc === set.length ? '🎉 Perfect order!' : `${rc} of ${set.length} in the right spot`}</div>`;
          if (rc !== set.length) list.insertAdjacentHTML('afterend', `<p class="muted small center">Correct order: ${set.map((n) => ui.chip(n, { abbr: true })).join(' ')}</p>`);
          nextBtn(bar, r === sets.length - 1 ? 'See results' : 'Next round →', () => { r++; r < sets.length ? round() : api.finish({ correct, total, missed }); });
        };
      };
      round();
    },
  });

  /* ---------------- Speed recall ---------------- */
  BB.def('speed', {
    title: 'Speed Recall', icon: '⚡', kind: 'game',
    desc: 'Type every book from memory against the clock — the list fills in as you go.',
    setup: [
      { key: 'pool', type: 'pool', label: 'Books', def: 'all' },
      { key: 'limit', type: 'seg', label: 'Time limit', options: [[0, 'None'], [180, '3 min'], [300, '5 min'], [600, '10 min']], def: 0 },
      { key: 'strict', type: 'toggle', label: 'Strict spelling' },
    ],
    fromSetup: (v) => poolOpts(v, { limit: +v.limit, strict: v.strict, poolKey: BB.pools.resolve(v.pool).key + (v.strict ? ':strict' : '') }),
    run(body, opts, api) {
      const books = U.range(opts.from, opts.to);
      const found = new Set();
      body.innerHTML = `<div class="speed">
        <div class="speed-top"><input class="input big-input" placeholder="Type any book…" autocomplete="off" autocorrect="off" autocapitalize="words" spellcheck="false" aria-label="Book name">
          <div class="speed-stats"><b class="cnt">0</b>/${books.length} <span class="muted small">found</span><button class="btn ghost small give">Give up</button></div></div>
        <div class="speed-grid ${books.length > 12 ? 'cols' : ''}">${books.map((n) => `<div class="slot" data-n="${n}"><span class="snum">${n}</span><span class="sname"></span></div>`).join('')}</div>
      </div>`;
      const input = U.$('input', body);
      const t0 = performance.now();
      api.interval(() => {
        const el = performance.now() - t0;
        if (opts.limit) {
          const left = opts.limit * 1000 - el;
          api.meta(`<span class="clock ${left < 20000 ? 'warn' : ''}">⏱ ${U.fmtTime(left)}</span>`);
          if (left <= 0) end();
        } else api.meta(`<span class="clock">⏱ ${U.fmtTime(el)}</span>`);
      }, 200);
      const accept = (n) => {
        found.add(n);
        const slot = U.$(`.slot[data-n="${n}"]`, body);
        slot.classList.add('filled');
        slot.setAttribute('data-sec', BB.book(n).sec);
        U.$('.sname', slot).textContent = BB.book(n).name;
        slot.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        BB.fx.pop(slot);
        BB.sfx('good');
        api.record(n, true, false);
        input.value = '';
        U.$('.cnt', body).textContent = found.size;
        api.progress(found.size / books.length);
        if (found.size === books.length) end();
      };
      const id = (v, loose) => (api.strict ? BB.match.strictIdentify(v) : loose ? BB.match.identify(v) : BB.match.exact(v));
      let pending = null;
      api.onCleanup(() => clearTimeout(pending));
      input.addEventListener('input', () => {
        clearTimeout(pending);
        const n = id(input.value, false);
        if (n && books.includes(n) && !found.has(n)) return accept(n);
        // "Revelation" could still become "Revelations": accept after a short pause
        const m = api.strict ? 0 : BB.match.alias(input.value);
        if (m && books.includes(m) && !found.has(m)) pending = setTimeout(() => { if (BB.match.alias(input.value) === m) accept(m); }, 650);
      });
      input.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter') return;
        e.preventDefault();
        const n = id(input.value, true);
        if (!input.value.trim()) return;
        if (n && books.includes(n) && !found.has(n)) return accept(n);
        BB.fx.shake(input);
        ui.toast(n && found.has(n) ? `Already have ${BB.book(n).name}` : n ? `${BB.book(n).name} isn't in this list` : 'Not a book name I recognize');
        input.select();
      });
      let ended = false;
      const end = () => {
        if (ended) return;
        ended = true;
        const missed = books.filter((n) => !found.has(n));
        missed.forEach((n) => api.record(n, false, false));
        U.$$('.slot', body).forEach((s) => { if (!s.classList.contains('filled')) { s.classList.add('miss'); U.$('.sname', s).textContent = BB.book(+s.dataset.n).name; } });
        const det = U.el('<div><h3 class="details-h">Your list</h3></div>');
        det.appendChild(U.$('.speed-grid', body));
        api.finish({ correct: found.size, total: books.length, missed, timeMs: performance.now() - t0, details: det });
      };
      U.$('.give', body).onclick = async () => { if (await ui.confirm('Stop here and see what you missed?', 'Stop', 'Keep going')) end(); };
      input.focus();
    },
  });

  /* ---------------- Missing book ---------------- */
  BB.def('missing', {
    title: 'Missing Book', icon: '🕳️', kind: 'game',
    desc: 'A run of books with one blank. Fill it in.',
    setup: [
      { key: 'pool', type: 'pool', label: 'Books', def: 'all' },
      { key: 'n', type: 'seg', label: 'Rounds', options: [[5, '5'], [10, '10'], [15, '15']], def: 10 },
    ],
    fromSetup: (v) => poolOpts(v, { n: +v.n }),
    run(body, opts, api) {
      const from = opts.from || opts.books[0], to = opts.to || opts.books[opts.books.length - 1];
      const targets = opts.targets || U.range(from, to);
      const len = Math.min(opts.runLen || 5, to - from + 1);
      const n = opts.n || 8;
      let list = [];
      while (list.length < n) list = list.concat(U.weightedSample(targets, (x) => S.weight(x), Math.min(targets.length, n - list.length)));
      let r = 0, correct = 0, hinted = 0;
      const missed = [];
      const round = () => {
        const t = list[r];
        const lo = Math.max(from, Math.min(to - len + 1, t - Math.floor(Math.random() * len)));
        const run = U.range(lo, lo + len - 1);
        api.progress(r / n);
        body.innerHTML = `<div class="game-head"><h3>Round ${r + 1} of ${n}</h3><p class="muted">Which book is missing?</p></div>
          <div class="run">${run.map((x) => (x === t ? '<div class="run-item gap">?</div>' : `<div class="run-item" data-sec="${BB.book(x).sec}">${bookName(x)}</div>`)).join('')}</div>
          <div class="ans"></div><div class="qfeedback"></div>`;
        const box = ui.typed({
          book: t,
          onSubmit({ text, hinted: h }) {
            const ok = BB.match.check(text, t, api.strict);
            box.lock();
            api.record(t, ok, h);
            const gap = U.$('.gap', body);
            gap.textContent = BB.book(t).name;
            gap.setAttribute('data-sec', BB.book(t).sec);
            gap.classList.add(ok ? 'ok' : 'bad');
            const fb = U.$('.qfeedback', body);
            if (ok) { correct++; if (h) hinted++; BB.sfx('good'); BB.fx.burst(gap); fb.className = 'qfeedback good'; fb.innerHTML = `<div class="fb-title">✓ Correct!</div>`; }
            else { missed.push(t); BB.sfx('bad'); BB.fx.shake(gap); fb.className = 'qfeedback bad'; fb.innerHTML = `<div class="fb-title">✗ It was ${ui.chip(t, { num: true })}</div>`; }
            nextBtn(fb, r === n - 1 ? 'See results' : 'Next →', () => { r++; r < n ? round() : api.finish({ correct, total: n, hinted, missed }); }, ok ? 1100 : 0);
          },
        });
        U.$('.ans', body).appendChild(box);
      };
      round();
    },
  });

  /* ---------------- Memory match ---------------- */
  const MATCH_MODES = [['tag', 'Short summary'], ['summary', 'Full summary'], ['section', 'Section'], ['number', 'Number']];
  BB.def('match', {
    title: 'Memory Match', icon: '🧩', kind: 'game',
    desc: 'Pair each book with its summary, section, or number.',
    setup: [
      { key: 'pool', type: 'pool', label: 'Books', def: 'all' },
      { key: 'mode', type: 'seg', label: 'Match with', options: MATCH_MODES, def: 'tag' },
      { key: 'rounds', type: 'seg', label: 'Rounds', options: [[1, '1'], [3, '3'], [5, '5']], def: 3 },
    ],
    fromSetup: (v) => poolOpts(v, { mode: v.mode, rounds: +v.rounds, poolKey: BB.pools.resolve(v.pool).key + ':' + v.mode }),
    run(body, opts, api) {
      let mode = opts.mode || 'tag';
      const per = opts.per || 5;
      let books = U.shuffle(opts.books);
      let groups = [];
      if (mode === 'section') {
        const secs = new Set(books.map((n) => BB.book(n).sec));
        if (secs.size < 2) { mode = 'tag'; ui.toast('Only one section here — matching summaries instead.'); }
        else {
          const R = opts.rounds || 3;
          for (let r = 0; r < R; r++) {
            const g = [], used = new Set();
            for (const n of U.shuffle(books)) { if (!used.has(BB.book(n).sec)) { used.add(BB.book(n).sec); g.push(n); } if (g.length >= per) break; }
            groups.push(g);
          }
        }
      }
      if (mode !== 'section') {
        const max = (opts.rounds || Math.ceil(books.length / per)) * per;
        books = books.slice(0, Math.min(books.length, max));
        const k = Math.ceil(books.length / per);
        for (let i = 0; i < k; i++) groups.push(books.filter((_, j) => j % k === i));
      }
      const descr = (n) => {
        const b = BB.book(n);
        if (mode === 'tag') return U.esc(b.tag);
        if (mode === 'summary') return U.esc(BB.redact(n));
        if (mode === 'number') return '#' + n;
        return U.esc(BB.sec(b.sec).name);
      };
      let g = 0, firstTry = 0, attempts = 0, pairs = 0;
      const missed = new Set();
      const total = groups.reduce((s, x) => s + x.length, 0);
      const round = () => {
        const grp = groups[g];
        api.progress(g / groups.length);
        body.innerHTML = `<div class="game-head"><h3>Round ${g + 1} of ${groups.length}</h3><p class="muted">Tap a book, then tap its match.</p></div>
          <div class="match ${mode === 'summary' ? 'long' : ''}"><div class="mcol left">${U.shuffle(grp).map((n) => `<button class="mcard book" data-n="${n}">${bookName(n)}</button>`).join('')}</div>
          <div class="mcol right">${U.shuffle(grp).map((n) => `<button class="mcard desc" data-n="${n}" ${mode === 'section' ? `data-sec="${BB.book(n).sec}"` : ''}>${descr(n)}</button>`).join('')}</div></div>`;
        let selL = null, selR = null, done = 0;
        const tried = new Set();
        const tryPair = () => {
          if (!selL || !selR) return;
          attempts++;
          const n = +selL.dataset.n, ok = n === +selR.dataset.n;
          if (ok) {
            [selL, selR].forEach((x) => { x.classList.remove('sel'); x.classList.add('matched'); x.setAttribute('data-sec', BB.book(n).sec); x.disabled = true; });
            if (!tried.has(n)) firstTry++;
            api.record(n, !tried.has(n), false);
            pairs++;
            BB.sfx('good');
            BB.fx.burst(selR);
            done++;
            if (done === grp.length) {
              setTimeout(() => { g++; g < groups.length ? round() : api.finish({ correct: firstTry, total, missed: [...missed], pct: firstTry / total, unit: 'first-try matches' }); }, 650);
            }
          } else {
            tried.add(n);
            missed.add(n);
            api.record(n, false, false);
            BB.sfx('bad');
            [selL, selR].forEach((x) => { BB.fx.shake(x); x.classList.remove('sel'); x.classList.add('wrong'); setTimeout(() => x.classList.remove('wrong'), 400); });
          }
          selL = selR = null;
        };
        U.$$('.mcard', body).forEach((c) => (c.onclick = () => {
          const left = c.classList.contains('book');
          if (left) { if (selL) selL.classList.remove('sel'); selL = selL === c ? null : c; }
          else { if (selR) selR.classList.remove('sel'); selR = selR === c ? null : c; }
          if ((left ? selL : selR) === c) c.classList.add('sel');
          BB.sfx('tap');
          tryPair();
        }));
      };
      round();
    },
  });

  /* ---------------- Sort it ---------------- */
  BB.def('sort', {
    title: 'Sort It', icon: '🗂️', kind: 'game',
    desc: 'Drop each book into the right section as fast as you can.',
    setup: [
      { key: 'pool', type: 'pool', label: 'Books', def: 'all' },
      { key: 'n', type: 'seg', label: 'Books', options: [[10, '10'], [20, '20'], [30, '30']], def: 20 },
    ],
    fromSetup: (v) => poolOpts(v, { n: +v.n }),
    run(body, opts, api) {
      const n = Math.min(opts.n || 12, opts.books.length);
      const list = U.weightedSample(opts.books, (x) => S.weight(x), n);
      let secIds = [...new Set(opts.books.map((x) => BB.book(x).sec))];
      if (secIds.length < 2) {
        const i = BB.sec(secIds[0]).index;
        secIds = BB.SECTIONS.filter((s) => Math.abs(s.index - i) <= 1).map((s) => s.id);
      }
      secIds.sort((a, b) => BB.sec(a).index - BB.sec(b).index);
      body.innerHTML = `<div class="sortit"><div class="game-head"><p class="muted">Tap the right section (or drag the card onto it).</p></div>
        <div class="sort-stage"><div class="sort-card"></div></div>
        <div class="bins bins-${secIds.length}">${secIds.map((id) => `<button class="bin" data-sec="${id}" data-id="${id}"><span class="bin-name">${U.esc(BB.sec(id).name)}</span><span class="bin-count">0</span></button>`).join('')}</div></div>`;
      const card = U.$('.sort-card', body);
      const t0 = performance.now();
      stopwatch(api, t0);
      let i = 0, correct = 0, busy = false;
      const missed = [];
      const show = () => {
        api.progress(i / n);
        card.className = 'sort-card';
        card.style.transform = '';
        card.innerHTML = `<span>${bookName(list[i])}</span><small>${i + 1} / ${n}</small>`;
        card.animate([{ transform: 'scale(.85)', opacity: 0 }, { transform: 'scale(1)', opacity: 1 }], { duration: 180 });
      };
      const drop = (bin) => {
        if (busy || !bin) return;
        busy = true;
        const b = list[i], ok = BB.book(b).sec === bin.dataset.id;
        api.record(b, ok, false);
        if (ok) { correct++; BB.sfx('good'); BB.fx.pop(bin); }
        else {
          missed.push(b);
          BB.sfx('bad');
          BB.fx.shake(bin);
          const right = U.$(`.bin[data-id="${BB.book(b).sec}"]`, body);
          if (right) { right.classList.add('flash-right'); setTimeout(() => right.classList.remove('flash-right'), 700); }
        }
        const target = U.$(`.bin[data-id="${BB.book(b).sec}"]`, body) || bin;
        target.querySelector('.bin-count').textContent = +target.querySelector('.bin-count').textContent + 1;
        card.classList.add(ok ? 'ok' : 'bad');
        card.setAttribute('data-sec', BB.book(b).sec);
        setTimeout(() => { busy = false; i++; i < n ? show() : api.finish({ correct, total: n, missed, timeMs: performance.now() - t0 }); }, ok ? 380 : 900);
      };
      U.$$('.bin', body).forEach((bn) => (bn.onclick = () => drop(bn)));
      // drag the card onto a bin
      let drag = null;
      card.addEventListener('pointerdown', (e) => { if (busy) return; drag = { x: e.clientX, y: e.clientY, id: e.pointerId }; card.setPointerCapture(e.pointerId); card.classList.add('dragging'); });
      card.addEventListener('pointermove', (e) => { if (!drag) return; card.style.transform = `translate(${e.clientX - drag.x}px, ${e.clientY - drag.y}px)`; });
      card.addEventListener('pointerup', (e) => {
        if (!drag) return;
        const moved = Math.hypot(e.clientX - drag.x, e.clientY - drag.y) > 12;
        drag = null;
        card.classList.remove('dragging');
        card.style.visibility = 'hidden';
        const under = document.elementFromPoint(e.clientX, e.clientY);
        card.style.visibility = '';
        const bin = under && under.closest('.bin');
        if (moved && bin) drop(bin);
        else card.style.transform = '';
      });
      show();
    },
  });

  /* ---------------- Which comes first? ---------------- */
  BB.def('first', {
    title: 'Which Comes First?', icon: '⚖️', kind: 'game',
    desc: 'Two books appear — tap the one that comes earlier.',
    setup: [
      { key: 'pool', type: 'pool', label: 'Books', def: 'all' },
      { key: 'n', type: 'seg', label: 'Rounds', options: [[10, '10'], [20, '20'], [30, '30']], def: 20 },
    ],
    fromSetup: (v) => poolOpts(v, { n: +v.n }),
    run(body, opts, api) {
      const pool = opts.books, n = opts.n || 12;
      const pairs = Array.from({ length: n }, () => {
        const a = U.pick(pool);
        const near = pool.filter((x) => x !== a && Math.abs(x - a) <= 4);
        const b = near.length && Math.random() < 0.7 ? U.pick(near) : U.pick(pool.filter((x) => x !== a));
        return U.shuffle([a, b]);
      });
      const t0 = performance.now();
      stopwatch(api, t0);
      let i = 0, correct = 0;
      const missed = [];
      const show = () => {
        api.progress(i / n);
        const [a, b] = pairs[i];
        body.innerHTML = `<div class="game-head"><h3>${i + 1} / ${n}</h3><p class="muted">Which comes <b>first</b> in the Bible?</p></div>
          <div class="duel"><button class="duel-btn" data-n="${a}">${bookName(a)}<small></small></button><span class="vs">or</span><button class="duel-btn" data-n="${b}">${bookName(b)}<small></small></button></div>`;
        U.$$('.duel-btn', body).forEach((btn) => (btn.onclick = () => {
          const pick = +btn.dataset.n, ok = pick === Math.min(a, b);
          U.$$('.duel-btn', body).forEach((x) => { x.disabled = true; x.setAttribute('data-sec', BB.book(+x.dataset.n).sec); U.$('small', x).textContent = '#' + x.dataset.n; x.classList.add(+x.dataset.n === Math.min(a, b) ? 'ok' : 'dim'); });
          const early = Math.min(a, b), late = Math.max(a, b);
          api.record(early, ok, false);
          if (ok) { correct++; BB.sfx('good'); BB.fx.burst(btn); } else { missed.push(early, late); BB.sfx('bad'); BB.fx.shake(btn); }
          setTimeout(() => { i++; i < n ? show() : api.finish({ correct, total: n, missed, timeMs: performance.now() - t0 }); }, ok ? 650 : 1300);
        }));
      };
      show();
    },
  });

  /* ---------------- Neighborhood ---------------- */
  BB.def('hood', {
    title: 'Neighborhood', icon: '🏘️', kind: 'game',
    desc: 'Given one book, name the book before it and the book after it.',
    setup: [
      { key: 'pool', type: 'pool', label: 'Books', def: 'all' },
      { key: 'n', type: 'seg', label: 'Rounds', options: [[5, '5'], [8, '8'], [12, '12']], def: 8 },
      { key: 'strict', type: 'toggle', label: 'Strict spelling' },
    ],
    fromSetup: (v) => poolOpts(v, { n: +v.n, strict: v.strict }),
    run(body, opts, api) {
      const cand = (opts.targets || opts.books).filter((x) => x > 1 && x < 73);
      const n = opts.n || 6;
      let list = [];
      while (list.length < n) list = list.concat(U.weightedSample(cand, (x) => S.weight(x), Math.min(cand.length, n - list.length)));
      let r = 0, correct = 0, hinted = 0;
      const missed = [];
      const round = () => {
        const t = list[r];
        api.progress(r / n);
        body.innerHTML = `<div class="game-head"><h3>Round ${r + 1} of ${n}</h3><p class="muted">Who are the neighbors?</p></div>
          <div class="hood">
            <div class="hood-slot before"><label>← Before</label><div class="hs"></div></div>
            <div class="hood-center" data-sec="${BB.book(t).sec}">${bookName(t)}<small>#${t}</small></div>
            <div class="hood-slot after"><label>After →</label><div class="hs"></div></div>
          </div><div class="qfeedback"></div>`;
        const mk = (n2, where) => {
          const box = ui.typed({ book: n2, placeholder: where === 'before' ? 'Book before…' : 'Book after…', onSubmit() {} });
          U.$('button[type=submit]', box).remove();
          U.$(`.hood-slot.${where} .hs`, body).appendChild(box);
          box.addEventListener('submit', (e) => { e.preventDefault(); e.stopImmediatePropagation(); if (where === 'before') U.$('.hood-slot.after input', body).focus(); else checkBoth(); }, true);
          return box;
        };
        const bb = mk(t - 1, 'before'), ab = mk(t + 1, 'after');
        bb.input.focus();
        const fb = U.$('.qfeedback', body);
        const cbtn = U.el('<button class="btn primary hood-check">Check both</button>');
        cbtn.onclick = () => checkBoth();
        fb.appendChild(cbtn);
        let checked = false;
        const checkBoth = () => {
          if (checked) return;
          checked = true;
          cbtn.remove();
          let rc = 0;
          [[bb, t - 1], [ab, t + 1]].forEach(([box, ans]) => {
            const h = U.$('.hint-btn', box) && U.$('.hint-btn', box).disabled;
            const ok = BB.match.check(box.input.value, ans, api.strict);
            box.lock();
            box.classList.add(ok ? 'ok' : 'bad');
            api.record(ans, ok, h);
            if (ok) { rc++; correct++; if (h) hinted++; } else { missed.push(ans); box.insertAdjacentHTML('beforeend', `<div class="small">→ ${bookName(ans)}</div>`); }
          });
          BB.sfx(rc === 2 ? 'good' : rc ? 'tap' : 'bad');
          if (rc === 2) BB.fx.burst(U.$('.hood-center', body));
          fb.className = 'qfeedback ' + (rc === 2 ? 'good' : 'bad');
          fb.innerHTML = `<div class="fb-title">${rc === 2 ? '✓ Both right!' : `${rc} of 2`}</div>`;
          nextBtn(fb, r === n - 1 ? 'See results' : 'Next →', () => { r++; r < n ? round() : api.finish({ correct, total: n * 2, hinted, missed }); }, rc === 2 ? 1200 : 0);
        };
      };
      round();
    },
  });

  /* ---------------- Survival streak ---------------- */
  BB.def('survival', {
    title: 'Survival Streak', icon: '❤️', kind: 'game',
    desc: 'Keep naming the next book in order. Three lives — how far can you go?',
    setup: [
      { key: 'start', type: 'start', label: 'Start from', def: '1' },
      { key: 'strict', type: 'toggle', label: 'Strict spelling' },
    ],
    fromSetup: (v) => {
      const start = v.start === 'random' ? 1 + Math.floor(Math.random() * 60) : +v.start;
      return { start, end: 73, strict: v.strict, poolKey: 'from:' + v.start, poolLabel: v.start === 'random' ? 'Random start' : 'From ' + BB.book(start).name };
    },
    run(body, opts, api) {
      const start = opts.start || 1, end = opts.end || 73;
      let cur = start, lives = opts.lives || 3, correct = 0, hinted = 0, streak = 0, best = 0;
      const missed = [];
      const total = end - start;
      body.innerHTML = `<div class="survival"><div class="surv-top"><span class="lives"></span><span class="streak">Streak <b>0</b></span></div>
        <div class="chain"></div><div class="surv-q"></div><div class="ans"></div><div class="qfeedback"></div></div>`;
      const chain = U.$('.chain', body);
      const addChain = (n, ok) => {
        chain.insertAdjacentHTML('beforeend', ui.chip(n, { cls: ok ? '' : 'missed-chip' }));
        while (chain.children.length > 7) chain.firstElementChild.remove();
      };
      addChain(start, true);
      const draw = () => {
        U.$('.lives', body).innerHTML = Array.from({ length: opts.lives || 3 }, (_, k) => `<i class="${k < lives ? 'on' : ''}">♥</i>`).join('');
        U.$('.streak b', body).textContent = streak;
      };
      const ask = () => {
        draw();
        api.progress((cur - start) / total);
        const t = cur + 1;
        U.$('.surv-q', body).innerHTML = `What comes after <b>${bookName(cur)}</b>?`;
        U.$('.qfeedback', body).innerHTML = '';
        U.$('.qfeedback', body).className = 'qfeedback';
        const ans = U.$('.ans', body);
        ans.innerHTML = '';
        const box = ui.typed({
          book: t,
          onSubmit({ text, hinted: h }) {
            const ok = BB.match.check(text, t, api.strict);
            box.lock();
            api.record(t, ok, h);
            if (ok) { correct++; streak++; best = Math.max(best, streak); if (h) hinted++; BB.sfx('good'); }
            else { lives--; streak = 0; missed.push(t); BB.sfx('bad'); BB.fx.shake(U.$('.lives', body)); }
            addChain(t, ok);
            cur = t;
            draw();
            const over = lives <= 0 || cur >= end;
            const fb = U.$('.qfeedback', body);
            if (!ok) { fb.className = 'qfeedback bad'; fb.innerHTML = `<div class="fb-title">✗ It's ${ui.chip(t, { num: true })}</div>`; }
            if (over) {
              const win = cur >= end && lives > 0;
              fb.insertAdjacentHTML('beforeend', `<div class="fb-title">${win ? '🏁 You made it to the end!' : '💔 Out of lives'}</div>`);
              nextBtn(fb, 'See results', () => api.finish({ correct, total, hinted, missed, score: correct, scoreLabel: 'named in a row' + (best ? ` (best run ${best})` : ''), failed: !win && opts.mustFinish, failText: 'Out of lives! Try again.' }));
            } else if (ok) ask();
            else nextBtn(fb, 'Keep going →', ask);
          },
        });
        ans.appendChild(box);
      };
      ask();
    },
  });

  /* ---------------- Odd one out ---------------- */
  BB.def('odd', {
    title: 'Odd One Out', icon: '🦄', kind: 'game',
    desc: 'Four books — three share a section, one does not. Find it.',
    setup: [
      { key: 'pool', type: 'pool', label: 'Books', def: 'all' },
      { key: 'n', type: 'seg', label: 'Rounds', options: [[5, '5'], [10, '10'], [15, '15']], def: 10 },
    ],
    fromSetup: (v) => poolOpts(v, { n: +v.n }),
    run(body, opts, api) {
      const P = new Set(opts.books);
      const n = opts.n || 8;
      const secs = [...new Set(opts.books.map((x) => BB.book(x).sec))];
      const groupable = BB.SECTIONS.filter((s) => s.books.length >= 3 && (secs.includes(s.id)));
      const rounds = Array.from({ length: n }, () => {
        const A = U.pick(groupable.length ? groupable : BB.SECTIONS.filter((s) => s.books.length >= 3));
        const inA = A.books.filter((x) => P.has(x));
        const three = U.sample(inA.length >= 3 ? inA : A.books, 3);
        const others = BB.BOOKS.filter((b) => b.sec !== A.id).map((b) => b.n);
        const near = others.filter((x) => P.has(x) && BB.book(x).testament === A.testament);
        let cands = near;
        if (!cands.length) cands = others.filter((x) => BB.book(x).testament === A.testament && Math.abs(x - A.from) < 25);
        if (!cands.length) cands = others;
        const odd = U.pick(cands);
        return { A, odd, four: U.shuffle([...three, odd]) };
      });
      let i = 0, correct = 0;
      const missed = [];
      const show = () => {
        api.progress(i / n);
        const R = rounds[i];
        body.innerHTML = `<div class="game-head"><h3>${i + 1} / ${n}</h3><p class="muted">Which book belongs to a <b>different section</b>?</p></div>
          <div class="odd-grid">${R.four.map((x) => `<button class="odd-btn" data-n="${x}">${bookName(x)}<small></small></button>`).join('')}</div><div class="qfeedback"></div>`;
        U.$$('.odd-btn', body).forEach((b) => (b.onclick = () => {
          const ok = +b.dataset.n === R.odd;
          U.$$('.odd-btn', body).forEach((x) => { x.disabled = true; const bk = BB.book(+x.dataset.n); x.setAttribute('data-sec', bk.sec); U.$('small', x).textContent = BB.sec(bk.sec).name; if (+x.dataset.n === R.odd) x.classList.add('odd'); });
          api.record(R.odd, ok, false);
          if (ok) { correct++; BB.sfx('good'); BB.fx.burst(b); } else { missed.push(R.odd); BB.sfx('bad'); BB.fx.shake(b); }
          const fb = U.$('.qfeedback', body);
          fb.className = 'qfeedback ' + (ok ? 'good' : 'bad');
          fb.innerHTML = `<div class="fb-title">${ok ? '✓ Right!' : '✗ Not that one'}</div><div class="fb-info">${bookName(R.odd)} is in the ${U.esc(BB.sec(BB.book(R.odd).sec).name)}; the others are ${U.esc(R.A.name)}.</div>`;
          nextBtn(fb, i === n - 1 ? 'See results' : 'Next →', () => { i++; i < n ? show() : api.finish({ correct, total: n, missed }); }, ok ? 1500 : 0);
        }));
      };
      show();
    },
  });

  /* ---------------- Mystery book ---------------- */
  BB.def('mystery', {
    title: 'Mystery Book', icon: '🕵️', kind: 'game',
    desc: 'Guess the hidden book. Each guess tells you earlier/later and whether the testament and section match.',
    setup: [
      { key: 'pool', type: 'pool', label: 'Mystery book comes from', def: 'all' },
      { key: 'rounds', type: 'seg', label: 'Rounds', options: [[1, '1'], [3, '3'], [5, '5']], def: 3 },
    ],
    fromSetup: (v) => poolOpts(v, { rounds: +v.rounds }),
    run(body, opts, api) {
      const R = opts.rounds || 3, MAX = opts.max || 7;
      const secrets = U.sample(opts.books, Math.min(R, opts.books.length));
      while (secrets.length < R) secrets.push(U.pick(opts.books));
      let r = 0, solved = 0, scoreSum = 0, hinted = 0;
      const missed = [];
      const round = () => {
        const secret = secrets[r], sb = BB.book(secret);
        const guesses = [];
        let clue = false, over = false;
        api.progress(r / R);
        body.innerHTML = `<div class="game-head"><h3>Mystery ${r + 1} of ${R}</h3><p class="muted">Guess the hidden book in ${MAX} tries${opts.books.length < 73 ? ` <span class="small">(it's one of books ${opts.books[0]}–${opts.books[opts.books.length - 1]})</span>` : ''}.</p></div>
          <div class="mys-box"><div class="mys-q">?</div><button class="btn ghost small clue">🔎 Clue</button></div>
          <div class="ans"></div><div class="mys-legend muted small">⬆ earlier · ⬇ later · T = testament · S = section</div><div class="guesses"></div><div class="qfeedback"></div>`;
        U.$('.clue', body).onclick = (e) => { clue = true; e.target.outerHTML = `<div class="mys-clue">“${U.esc(sb.tag)}”</div>`; };
        const box = ui.typed({
          book: secret, hint: false, placeholder: 'Guess a book…',
          onSubmit({ text }) {
            const g = BB.match.identify(text);
            if (!g) { BB.fx.shake(box); ui.toast('Not a book name I recognize'); return; }
            if (guesses.includes(g)) { ui.toast('You already guessed that'); box.input.select(); return; }
            guesses.push(g);
            box.input.value = '';
            const gb = BB.book(g);
            const dir = g === secret ? '🎯' : secret < g ? '⬆ Earlier' : '⬇ Later';
            const dist = Math.abs(secret - g);
            const heat = g === secret ? '' : dist <= 3 ? '🔥 very close' : dist <= 10 ? '♨️ close' : '❄️ far';
            U.$('.guesses', body).insertAdjacentHTML('afterbegin', `<div class="guess ${g === secret ? 'win' : ''}">${ui.chip(g)}
              <span class="g-dir">${dir}</span><span class="g-t ${gb.testament === sb.testament ? 'y' : 'n'}">T ${gb.testament === sb.testament ? '✓' : '✗'}</span>
              <span class="g-s ${gb.sec === sb.sec ? 'y' : 'n'}">S ${gb.sec === sb.sec ? '✓' : '✗'}</span><span class="g-h muted small">${heat}</span></div>`);
            if (g === secret) end(true);
            else { BB.sfx('tap'); if (guesses.length >= MAX) end(false); }
          },
        });
        U.$('.ans', body).appendChild(box);
        const end = (win) => {
          if (over) return;
          over = true;
          box.lock();
          api.record(secret, win, clue);
          const s = win ? Math.max(0.4, 1 - (guesses.length - 1) * 0.1) - (clue ? 0.15 : 0) : 0;
          scoreSum += Math.max(0, s);
          if (win) { solved++; if (clue) hinted++; BB.sfx('good'); BB.fx.confetti(30, U.$('.mys-q', body).getBoundingClientRect()); } else { missed.push(secret); BB.sfx('bad'); }
          const q = U.$('.mys-q', body);
          q.textContent = sb.name;
          q.setAttribute('data-sec', sb.sec);
          q.classList.add('revealed');
          const fb = U.$('.qfeedback', body);
          fb.className = 'qfeedback ' + (win ? 'good' : 'bad');
          fb.innerHTML = `<div class="fb-title">${win ? `🎯 Found it in ${U.plural(guesses.length, 'guess').replace('guesss', 'guesses')}!` : `It was ${U.esc(sb.name)}`}</div><div class="fb-info">#${secret} · ${U.esc(BB.sec(sb.sec).name)} — ${U.esc(sb.summary)}</div>`;
          nextBtn(fb, r === R - 1 ? 'See results' : 'Next mystery →', () => { r++; r < R ? round() : api.finish({ correct: solved, total: R, hinted, missed, pct: scoreSum / R, unit: 'solved' }); });
        };
      };
      round();
    },
  });

  /* ---------------- Bookshelf ---------------- */
  BB.def('shelf', {
    title: 'Bookshelf', icon: '📚', kind: 'game',
    desc: 'The books stand as spines on a shelf with gaps. Fill every gap.',
    setup: [
      { key: 'pool', type: 'pool', label: 'Shelf', def: 'all' },
      { key: 'gaps', type: 'seg', label: 'Gaps', options: [[5, '5'], [10, '10'], [20, '20'], ['half', 'Half']], def: 10 },
      { key: 'strict', type: 'toggle', label: 'Strict spelling' },
    ],
    fromSetup: (v) => {
      const p = BB.pools.resolve(v.pool);
      const k = v.gaps === 'half' ? Math.ceil(p.books.length / 2) : Math.min(+v.gaps, p.books.length);
      return poolOpts(v, { gaps: U.weightedSample(p.books, (x) => S.weight(x), k), strict: v.strict, poolKey: p.key + ':' + v.gaps });
    },
    run(body, opts, api) {
      const books = U.range(opts.from, opts.to);
      const gaps = opts.gaps.slice().sort((a, b) => a - b);
      const tries = {};
      let correct = 0, hinted = 0, cur = null;
      const missed = [];
      const solved = new Set();
      body.innerHTML = `<div class="shelf-wrap"><p class="muted center">Tap a gap and name the missing book.</p>
        <div class="shelf">${books.map((n) => {
          const gap = gaps.includes(n);
          const h = 92 + ((n * 37) % 5) * 9 + Math.min(20, BB.book(n).name.length);
          return `<button class="spine ${gap ? 'gap' : ''}" data-n="${n}" ${gap ? '' : `data-sec="${BB.book(n).sec}"`} style="height:${h}px" ${gap ? '' : 'tabindex="-1"'}><span class="sp-t">${gap ? '?' : U.esc(BB.book(n).abbr)}</span><span class="sp-n">${n}</span></button>`;
        }).join('')}</div></div>
        <div class="shelf-panel sticky-actions"><div class="sp-label"></div><div class="sp-ans"></div></div>`;
      const label = U.$('.sp-label', body), ansEl = U.$('.sp-ans', body);
      const select = (n) => {
        cur = n;
        U.$$('.spine.sel', body).forEach((x) => x.classList.remove('sel'));
        const sp = U.$(`.spine[data-n="${n}"]`, body);
        sp.classList.add('sel');
        sp.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
        label.innerHTML = `Book <b>#${n}</b> ${n > 1 ? `· after ${bookName(n - 1)}` : ''}`;
        ansEl.innerHTML = '';
        const box = ui.typed({
          book: n,
          onSubmit({ text, hinted: h }) {
            const ok = BB.match.check(text, n, api.strict);
            tries[n] = (tries[n] || 0) + 1;
            if (ok) {
              const first = tries[n] === 1;
              if (first) { correct++; if (h) hinted++; } else missed.push(n);
              api.record(n, first, h);
              fill(n, true);
              BB.sfx('good');
            } else if (tries[n] >= 2) {
              missed.push(n);
              api.record(n, false, false);
              BB.sfx('bad');
              fill(n, false);
            } else {
              BB.sfx('bad');
              BB.fx.shake(sp);
              BB.fx.shake(box);
              box.input.select();
              ui.toast('Not quite — one more try');
            }
          },
        });
        ansEl.appendChild(box);
      };
      const fill = (n, ok) => {
        solved.add(n);
        const sp = U.$(`.spine[data-n="${n}"]`, body);
        sp.classList.remove('gap', 'sel');
        sp.classList.add(ok ? 'filled' : 'revealed');
        sp.setAttribute('data-sec', BB.book(n).sec);
        U.$('.sp-t', sp).textContent = BB.book(n).abbr;
        sp.animate([{ transform: 'translateY(-30px)', opacity: 0.2 }, { transform: 'translateY(0)', opacity: 1 }], { duration: 300, easing: 'cubic-bezier(.3,1.4,.6,1)' });
        api.progress(solved.size / gaps.length);
        if (solved.size === gaps.length) {
          ansEl.innerHTML = '';
          label.innerHTML = '<b>Shelf complete!</b>';
          setTimeout(() => api.finish({ correct, total: gaps.length, hinted, missed }), 700);
        } else {
          const nxt = gaps.find((g) => g > n && !solved.has(g)) || gaps.find((g) => !solved.has(g));
          select(nxt);
        }
      };
      U.$$('.spine.gap', body).forEach((sp) => (sp.onclick = () => { if (!solved.has(+sp.dataset.n)) select(+sp.dataset.n); }));
      U.$$('.spine:not(.gap)', body).forEach((sp) => (sp.onclick = () => ui.bookInfo(+sp.dataset.n)));
      select(gaps[0]);
    },
  });

  /* ---------------- Unscramble ---------------- */
  const HARD = new Set([3, 5, 12, 13, 14, 16, 18, 20, 21, 25, 26, 28, 31, 32, 33, 35, 38, 40, 41, 42, 43, 44, 45, 46, 53, 54, 55, 56, 57, 58, 59, 60, 64, 73]);
  BB.def('unscramble', {
    title: 'Unscramble', icon: '🔤', kind: 'game',
    desc: 'Rebuild scrambled book names — focused on the tricky spellings.',
    setup: [
      { key: 'pool', type: 'pool', label: 'Books', def: 'all' },
      { key: 'n', type: 'seg', label: 'Words', options: [[5, '5'], [8, '8'], [12, '12']], def: 8 },
    ],
    fromSetup: (v) => poolOpts(v, { n: +v.n }),
    run(body, opts, api) {
      const word = (n) => (n === 51 ? 'Acts' : BB.book(n).name.replace(/^\d /, ''));
      const cand = opts.books.filter((n) => word(n).replace(/ /g, '').length >= 4);
      const n = Math.min(opts.n || 8, cand.length);
      const list = U.weightedSample(cand, (x) => word(x).length / 3 + (HARD.has(x) ? 3 : 0) + S.weight(x) / 2, n);
      let r = 0, correct = 0, hinted = 0;
      const missed = [];
      const round = () => {
        const t = list[r];
        const target = word(t).toUpperCase();
        const prefix = BB.book(t).name.match(/^\d /) ? BB.book(t).name[0] + ' ' : '';
        const letters = target.replace(/ /g, '').split('');
        let tiles = U.shuffle(letters);
        for (let k = 0; k < 5 && tiles.join('') === letters.join(''); k++) tiles = U.shuffle(letters);
        const slots = target.split('').map((ch) => (ch === ' ' ? { space: true } : { ch: null, tile: -1, fixed: false }));
        let wrong = false, usedHint = false, solvedNow = false;
        api.progress(r / n);
        body.innerHTML = `<div class="game-head"><h3>${r + 1} / ${n}</h3><p class="muted">Tap the letters (or type) to spell the book.</p></div>
          <div class="unscr"><div class="slots">${prefix ? `<span class="prefix">${prefix.trim()}</span>` : ''}${slots.map((s, i) => (s.space ? '<span class="sp-gap"></span>' : `<button class="slot-l" data-i="${i}"></button>`)).join('')}</div>
          <div class="tiles">${tiles.map((c, i) => `<button class="tile" data-i="${i}">${c}</button>`).join('')}</div>
          <div class="row-btns"><button class="btn ghost small shuf">🔀 Shuffle</button><button class="btn ghost small hnt">💡 Hint</button><button class="btn ghost small give">Give up</button></div>
          <div class="qfeedback"></div></div>`;
        const tileEls = U.$$('.tile', body);
        const slotEls = {};
        U.$$('.slot-l', body).forEach((e) => (slotEls[e.dataset.i] = e));
        const used = new Set();
        const firstEmpty = () => slots.findIndex((s) => !s.space && s.ch == null);
        const render = () => {
          slots.forEach((s, i) => { if (!s.space) { slotEls[i].textContent = s.ch || ''; slotEls[i].classList.toggle('fixed', s.fixed); } });
          tileEls.forEach((e, i) => e.classList.toggle('used', used.has(i)));
        };
        const place = (ti) => {
          if (solvedNow || used.has(ti)) return;
          const si = firstEmpty();
          if (si < 0) return;
          slots[si].ch = tiles[ti];
          slots[si].tile = ti;
          used.add(ti);
          BB.sfx('tap');
          render();
          if (firstEmpty() < 0) check();
        };
        const unplace = (si) => {
          const s = slots[si];
          if (solvedNow || s.space || s.ch == null || s.fixed) return;
          used.delete(s.tile);
          s.ch = null;
          s.tile = -1;
          render();
        };
        const check = () => {
          const guess = slots.map((s) => (s.space ? ' ' : s.ch)).join('');
          if (guess === target) return done(true);
          wrong = true;
          BB.sfx('bad');
          BB.fx.shake(U.$('.slots', body));
          U.$('.slots', body).classList.add('bad');
          setTimeout(() => U.$('.slots', body) && U.$('.slots', body).classList.remove('bad'), 500);
        };
        const done = (ok) => {
          solvedNow = true;
          const first = ok && !wrong;
          api.record(t, first, usedHint);
          if (first) { correct++; if (usedHint) hinted++; } else missed.push(t);
          slots.forEach((s, i) => { if (!s.space) s.ch = target[i]; });
          render();
          U.$('.slots', body).classList.add(ok ? 'ok' : 'revealed');
          U.$('.slots', body).setAttribute('data-sec', BB.book(t).sec);
          const fb = U.$('.qfeedback', body);
          fb.className = 'qfeedback ' + (ok ? 'good' : 'bad');
          fb.innerHTML = `<div class="fb-title">${ok ? (first ? '✓ Spelled it!' : '✓ Got it on a retry') : '✗ Revealed'}: ${ui.chip(t, { num: true })}</div>`;
          if (ok) { BB.sfx('good'); BB.fx.burst(U.$('.slots', body)); } else BB.sfx('bad');
          nextBtn(fb, r === n - 1 ? 'See results' : 'Next →', () => { r++; r < n ? round() : api.finish({ correct, total: n, hinted, missed }); }, ok ? 1200 : 0);
        };
        tileEls.forEach((e, i) => (e.onclick = () => place(i)));
        Object.entries(slotEls).forEach(([i, e]) => (e.onclick = () => unplace(+i)));
        U.$('.shuf', body).onclick = () => {
          // shuffle only the unused tiles' display positions
          const free = tiles.map((c, i) => i).filter((i) => !used.has(i));
          const letters2 = U.shuffle(free.map((i) => tiles[i]));
          free.forEach((i, k) => { tiles[i] = letters2[k]; tileEls[i].textContent = letters2[k]; });
        };
        U.$('.hnt', body).onclick = (e) => {
          // lock in the next correct letter
          const si = slots.findIndex((s, i) => !s.space && !s.fixed && s.ch !== target[i]);
          if (si < 0) return;
          slots.forEach((s, i) => { if (!s.space && !s.fixed && i >= si && s.ch != null) unplace(i); });
          const ti = tiles.findIndex((c, i) => c === target[si] && !used.has(i));
          if (ti < 0) return;
          usedHint = true;
          slots[si] = { ch: target[si], tile: ti, fixed: true };
          used.add(ti);
          render();
          if (firstEmpty() < 0) check();
        };
        U.$('.give', body).onclick = () => { if (!solvedNow) done(false); };
        const key = (e) => {
          if (solvedNow || e.target.tagName === 'INPUT' || e.metaKey || e.ctrlKey) return;
          if (e.key === 'Backspace') {
            const last = [...slots.keys()].reverse().find((i) => !slots[i].space && slots[i].ch != null && !slots[i].fixed);
            if (last != null) unplace(last);
            e.preventDefault();
          } else if (/^[a-z]$/i.test(e.key)) {
            const ti = tiles.findIndex((c, i) => c === e.key.toUpperCase() && !used.has(i));
            if (ti >= 0) place(ti);
          }
        };
        document.addEventListener('keydown', key);
        api.onCleanup(() => document.removeEventListener('keydown', key));
        const prevCleanup = round.cleanupKey;
        if (prevCleanup) prevCleanup();
        round.cleanupKey = () => document.removeEventListener('keydown', key);
      };
      round();
    },
  });
})();
