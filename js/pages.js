/* Seventy-Three — practice hub, setup forms, reference, timeline, mnemonics, progress, settings. */
(function () {
  const BB = window.BB, U = BB.U, ui = BB.ui, S = BB.store;
  const P = (BB.pages = BB.pages || {});

  /* ---------------- Practice hub ---------------- */
  const LINKS = {
    reference: { title: 'Reference List', icon: '📜', desc: 'All 73 books in order, grouped and color-coded, with summaries.', href: '#/books' },
    mnemonics: { title: 'Mnemonic Builder', icon: '✍️', desc: 'Write and save your own memory tricks for any chunk or section.', href: '#/mnemonics' },
    timeline: { title: 'Timeline', icon: '🗺️', desc: 'Where each book falls in the larger story of salvation history.', href: '#/timeline' },
    daily: { title: 'Daily Review', icon: '🔥', desc: 'About five minutes on your weakest books. Builds your streak.', href: '#/daily' },
    progress: { title: 'Progress', icon: '📈', desc: 'Mastery by section, most-missed books, and best scores.', href: '#/progress' },
  };
  const card = (id) => {
    const l = LINKS[id];
    const d = l || BB.acts[id];
    const href = l ? l.href : '#/practice/' + id;
    const bests = Object.entries(S.data.best).filter(([k]) => k.startsWith(id + ':')).map(([, v]) => v);
    const top = bests.length ? Math.max(...bests.map((b) => b.pct)) : null;
    return `<a class="tool-card" href="${href}"><span class="tc-ico">${d.icon}</span><span class="tc-body"><b>${U.esc(d.title)}</b><small>${U.esc(d.desc)}</small>${top != null ? `<span class="tc-best">Best ${Math.round(top * 100)}%</span>` : ''}</span></a>`;
  };
  P.practice = function (view) {
    view.innerHTML = `<div class="page"><header class="page-head"><h1>Practice</h1><p class="muted">Everything on the path, any time. Jump straight to a tool or game.</p></header>
      <h2 class="grid-h">Learn</h2><div class="tool-grid">${card('lesson')}${card('reference')}${card('timeline')}${card('mnemonics')}</div>
      <h2 class="grid-h">Study tools</h2><div class="tool-grid">${card('flash')}${card('fade')}${card('daily')}${card('progress')}</div>
      <h2 class="grid-h">Quizzes</h2><div class="tool-grid">${card('quiz')}${card('test')}</div>
      <h2 class="grid-h">Games</h2><div class="tool-grid">${['order', 'speed', 'missing', 'match', 'sort', 'first', 'hood', 'survival', 'odd', 'mystery', 'shelf', 'unscramble', 'boss'].map(card).join('')}</div></div>`;
  };

  /* ---------------- Setup form ---------------- */
  const opts = (f) => f.options.filter(([v]) => BB.askSummaries() || !BB.SUMMARY_OPTIONS.has(v));
  function field(f, val) {
    if (f.type === 'seg' && !opts(f).some(([v]) => String(v) === String(val))) val = opts(f)[0][0]; // saved choice was hidden
    const lab = `<label class="f-label">${U.esc(f.label || '')}</label>`;
    switch (f.type) {
      case 'pool': return `<div class="field">${lab}${BB.pools.select(val, f.key)}</div>`;
      case 'stage': return `<div class="field">${lab}<select class="input" name="${f.key}">${BB.STAGES.map((s) => `<option value="${s.id}"${s.id === val ? ' selected' : ''}>${s.index + 1}. ${U.esc(s.title)} (${s.from}–${s.to})</option>`).join('')}</select></div>`;
      case 'section': return `<div class="field">${lab}<select class="input" name="${f.key}">${BB.SECTIONS.map((s) => `<option value="${s.id}"${s.id === val ? ' selected' : ''}>${U.esc(s.name)} (${s.from === s.to ? s.from : s.from + '–' + s.to})</option>`).join('')}</select></div>`;
      case 'start': return `<div class="field">${lab}<select class="input" name="${f.key}"><option value="random"${val === 'random' ? ' selected' : ''}>🎲 Random book</option>${BB.SECTIONS.filter((s) => s.from < 73).map((s) => `<option value="${s.from}"${String(s.from) === String(val) ? ' selected' : ''}>${U.esc(BB.book(s.from).name)} (start of ${U.esc(s.name)})</option>`).join('')}</select></div>`;
      case 'seg': return `<div class="field">${lab}<div class="seg" role="radiogroup">${opts(f).map(([v, l]) => `<label><input type="radio" name="${f.key}" value="${v}"${String(v) === String(val) ? ' checked' : ''}><span>${U.esc(l)}</span></label>`).join('')}</div></div>`;
      case 'toggle': return `<div class="field toggle-field"><label class="switch"><input type="checkbox" name="${f.key}"${val ? ' checked' : ''}><span class="sw"></span><span>${U.esc(f.label)}</span></label>${f.hint ? `<small class="muted">${U.esc(f.hint)}</small>` : ''}</div>`;
      case 'multi': return `<div class="field">${lab}<div class="checks">${opts(f).map(([v, l]) => `<label class="check"><input type="checkbox" name="${f.key}" value="${v}"${val.includes(v) ? ' checked' : ''}><span>${U.esc(l)}</span></label>`).join('')}</div></div>`;
      case 'sections': return `<div class="field">${lab} <button type="button" class="link-btn" data-all="${f.key}">All</button> · <button type="button" class="link-btn" data-none="${f.key}">None</button>
        <div class="sec-checks">${BB.SECTIONS.map((s) => `<label class="sec-check" data-sec="${s.id}"><input type="checkbox" name="${f.key}" value="${s.id}"${val.includes(s.id) ? ' checked' : ''}><span>${U.esc(s.name)}</span></label>`).join('')}</div></div>`;
    }
  }
  function defaultOf(f) {
    if (f.def !== undefined) return f.def;
    if (f.type === 'toggle' && f.key === 'strict') return S.settings.strict;
    if (f.type === 'sections') return BB.SECTIONS.map((s) => s.id);
    if (f.type === 'stage') { const c = BB.path.current(); return c && c.stage && BB.STAGE_MAP[c.stage.id] ? c.stage.id : 'pent'; }
    if (f.type === 'pool') return 'all';
    return '';
  }
  function read(form, setup) {
    const v = {};
    setup.forEach((f) => {
      if (f.type === 'toggle') v[f.key] = form.elements[f.key].checked;
      else if (f.type === 'multi' || f.type === 'sections') v[f.key] = U.$$(`input[name="${f.key}"]:checked`, form).map((i) => i.value);
      else if (f.type === 'seg') { const c = U.$(`input[name="${f.key}"]:checked`, form); v[f.key] = c ? c.value : f.def; }
      else v[f.key] = form.elements[f.key].value;
    });
    return v;
  }
  P.setup = function (view, id) {
    const def = BB.acts[id];
    if (!def || def.kind === 'hidden') return BB.go('#/practice');
    if (!def.setup) return BB.run(id, {}, { mode: id === 'daily' ? 'daily' : 'practice', back: '#/practice' });
    const saved = S.data.setup[id] || {};
    const params = new URLSearchParams(location.hash.split('?')[1] || '');
    const vals = {};
    def.setup.forEach((f) => (vals[f.key] = params.get(f.key) || (saved[f.key] !== undefined ? saved[f.key] : defaultOf(f))));
    const bests = Object.entries(S.data.best).filter(([k]) => k.startsWith(id + ':')).map(([, v]) => v).sort((a, b) => b.pct - a.pct).slice(0, 5);
    view.innerHTML = `<div class="page narrow"><a class="back-link" href="#/practice">← Practice</a>
      <form class="setup card"><div class="setup-head"><span class="setup-ico">${def.icon}</span><div><h1>${U.esc(def.title)}</h1><p class="muted">${U.esc(def.desc)}</p></div></div>
      ${def.setup.map((f) => field(f, vals[f.key])).join('')}
      <button class="btn primary big full" type="submit">Start ${def.icon}</button></form>
      ${bests.length ? `<div class="card bests"><h3>Your best</h3>${bests.map((b) => `<div class="best-row"><span>${U.esc(b.sub || b.label)}</span><b>${Math.round(b.pct * 100)}%</b><span class="muted small">${b.timeMs ? U.fmtTime(b.timeMs) : ''} · ${b.date}</span></div>`).join('')}</div>` : ''}</div>`;
    const form = U.$('form', view);
    U.$$('[data-all]', form).forEach((b) => (b.onclick = () => U.$$(`input[name="${b.dataset.all}"]`, form).forEach((i) => (i.checked = true))));
    U.$$('[data-none]', form).forEach((b) => (b.onclick = () => U.$$(`input[name="${b.dataset.none}"]`, form).forEach((i) => (i.checked = false))));
    form.onsubmit = (e) => {
      e.preventDefault();
      const v = read(form, def.setup);
      if (def.setup.some((f) => f.type === 'sections') && !v.sections.length) { ui.toast('Pick at least one section'); return; }
      if (def.setup.some((f) => f.type === 'multi') && !v.types.length) { ui.toast('Pick at least one question type'); return; }
      S.data.setup[id] = v;
      S.save();
      const start = () => BB.run(id, def.fromSetup(v), ctx);
      const ctx = { mode: 'practice', back: '#/practice/' + id, backLabel: 'Change settings', onAgain: () => start() };
      start();
    };
  };

  /* ---------------- Reference list ---------------- */
  P.books = function (view) {
    view.innerHTML = `<div class="page"><header class="page-head"><h1>The 73 Books</h1><p class="muted">The Catholic canon in order: 46 Old Testament + 27 New Testament. Tap a book for its summary.</p></header>
      <div class="ref-tools"><input class="input" type="search" placeholder="Search books, abbreviations, or topics…" aria-label="Search"><label class="switch"><input type="checkbox" class="showall"><span class="sw"></span><span>Show all summaries</span></label></div>
      <div class="legend">${BB.SECTIONS.map((s) => `<a class="chip" data-sec="${s.id}" href="#sec-${s.id}">${U.esc(s.name)} <b>${s.books.length}</b></a>`).join('')}</div>
      <p class="muted small count-tip">💡 ${U.esc(BB.COUNT_TIP)} <span class="dc">DC</span> marks the 7 deuterocanonical books.</p>
      ${['OT', 'NT'].map((t) => `<section class="ref-testament"><h2>${t === 'OT' ? 'Old Testament · 46' : 'New Testament · 27'}</h2>${BB.SECTIONS.filter((s) => s.testament === t).map((s) => `
        <div class="ref-section" id="sec-${s.id}" data-sec="${s.id}"><div class="ref-sec-head"><h3>${U.esc(s.name)}</h3><span class="muted small">${s.from === s.to ? s.from : s.from + '–' + s.to} · ${U.plural(s.books.length, 'book')}</span></div><p class="muted small">${U.esc(s.blurb)}</p>
        ${s.books.map((n) => { const b = BB.book(n); return `<div class="ref-row" data-n="${n}" data-search="${U.esc((b.name + ' ' + b.abbr + ' ' + b.aliases.join(' ') + ' ' + b.tag + ' ' + b.summary).toLowerCase())}">
          <button class="ref-btn" aria-expanded="false"><span class="num-badge">${n}</span><span class="ref-name">${U.esc(b.name)}${b.deutero ? ' <span class="dc" title="Deuterocanonical">DC</span>' : ''}</span><span class="ref-abbr">${U.esc(b.abbr)}</span><span class="ref-tag">${U.esc(b.tag)}</span></button>
          <div class="ref-more"><p>${U.esc(b.summary)}</p><p class="muted small">Era: <a href="#/timeline?book=${n}">${U.esc(BB.eraOf(n).title)}</a> · Mastery ${Math.round(S.mastery(n) * 100)}%</p></div></div>`; }).join('')}</div>`).join('')}</section>`).join('')}
      <p class="muted small center no-hits" hidden>No books match that search.</p></div>`;
    U.$$('.ref-btn', view).forEach((b) => (b.onclick = () => { const r = b.parentNode; r.classList.toggle('open'); b.setAttribute('aria-expanded', r.classList.contains('open')); }));
    U.$('.showall', view).onchange = (e) => U.$$('.ref-row', view).forEach((r) => r.classList.toggle('open', e.target.checked));
    U.$$('.legend a', view).forEach((a) => (a.onclick = (e) => { e.preventDefault(); U.$(a.getAttribute('href'), view).scrollIntoView({ behavior: 'smooth', block: 'start' }); }));
    const search = U.$('input[type=search]', view);
    search.oninput = () => {
      const q = search.value.trim().toLowerCase();
      let hits = 0;
      U.$$('.ref-row', view).forEach((r) => { const m = !q || r.dataset.search.includes(q) || r.dataset.n === q; r.hidden = !m; if (m) hits++; });
      U.$$('.ref-section', view).forEach((s) => (s.hidden = !U.$$('.ref-row', s).some((r) => !r.hidden)));
      U.$('.no-hits', view).hidden = !!hits;
    };
  };

  /* ---------------- Timeline ---------------- */
  P.timeline = function (view) {
    const params = new URLSearchParams(location.hash.split('?')[1] || '');
    const hl = new Set();
    if (params.get('book')) hl.add(+params.get('book'));
    if (params.get('stage') && BB.STAGE_MAP[params.get('stage')]) BB.STAGE_MAP[params.get('stage')].books.forEach((n) => hl.add(n));
    view.innerHTML = `<div class="page"><header class="page-head"><h1>The Story of Salvation</h1>
      <p class="muted">The Bible's order groups books by <i>type</i> (law, history, wisdom, prophecy…), not strictly by date. This timeline places each book where its story is set, so the order and the summaries make sense together.</p></header>
      <div class="tl-filter"><label class="f-label">Highlight</label><select class="input"><option value="">Nothing</option>${BB.SECTIONS.map((s) => `<option value="sec:${s.id}">${U.esc(s.name)}</option>`).join('')}${BB.STAGES.map((s) => `<option value="stage:${s.id}"${params.get('stage') === s.id ? ' selected' : ''}>Chunk: ${U.esc(s.title)}</option>`).join('')}</select></div>
      <ol class="timeline">${BB.ERAS.map((e, i) => `<li class="era"><div class="era-dot">${i + 1}</div><div class="era-body"><div class="era-dates">${U.esc(e.dates)}</div><h3>${U.esc(e.title)}</h3><p>${U.esc(e.story)}</p>
        <div class="chips">${e.books.slice().sort((a, b) => a - b).map((n) => ui.chip(n, { num: true, dc: true, cls: hl.size ? (hl.has(n) ? 'hl' : 'dim') : '' })).join('')}</div></div></li>`).join('')}</ol></div>`;
    U.$$('.chip[data-n]', view).forEach((c) => (c.onclick = () => ui.bookInfo(+c.dataset.n)));
    U.$('.tl-filter select', view).onchange = (e) => {
      const v = e.target.value;
      const set = new Set(v ? BB.pools.resolve(v).books : []);
      U.$$('.timeline .chip', view).forEach((c) => { c.classList.toggle('hl', set.has(+c.dataset.n)); c.classList.toggle('dim', set.size > 0 && !set.has(+c.dataset.n)); });
    };
    const first = U.$('.timeline .chip.hl', view);
    if (first) setTimeout(() => first.scrollIntoView({ block: 'center', behavior: 'smooth' }), 100);
  };

  /* ---------------- Mnemonic builder ---------------- */
  P.mnemonics = function (view) {
    const letters = (books) => books.map((n) => { const nm = BB.book(n).name; const m = nm.match(/^(\d )?(.)(.*)$/); return `<span class="mb-book"><b>${U.esc((m[1] || '') + m[2])}</b>${U.esc(m[3])}</span>`; }).join(' ');
    const item = (key, title, sub, books, sec, ready, how) => {
      const mine = S.mnemonic(key);
      return `<div class="mn-item card" data-key="${key}" data-sec="${sec}"><div class="mn-item-head"><h3>${U.esc(title)}</h3><span class="muted small">${U.esc(sub)}</span></div>
        <div class="mb-books">${letters(books)}</div>
        ${ready ? `<div class="mn-ready"><span class="mn-label">🧠 Ready-made</span> <b>${U.esc(ready)}</b>${how ? `<div class="muted small">${U.esc(how)}</div>` : ''}</div>` : ''}
        <div class="mn-yours"><span class="mn-label">✍️ Yours</span> <span class="mn-val">${mine ? U.esc(mine) : '<i class="muted">Not written yet</i>'}</span></div>
        <div class="mn-edit" hidden><textarea class="input" rows="3" maxlength="500" placeholder="Write a sentence, rhyme, story, or acrostic…">${U.esc(mine)}</textarea><div class="row-btns"><button class="btn primary small save">Save</button><button class="btn ghost small cancel">Cancel</button>${mine ? '<button class="btn ghost small del">Delete</button>' : ''}</div></div>
        <button class="btn ghost small edit">${mine ? 'Edit' : '✍️ Write my own'}</button></div>`;
    };
    view.innerHTML = `<div class="page"><header class="page-head"><h1>Mnemonic Builder</h1><p class="muted">Silly, vivid, personal tricks stick best. Yours appear in lessons and on flashcards.</p></header>
      <div class="card tip">💡 ${U.esc(BB.COUNT_TIP)}</div>
      <h2 class="grid-h">Whole Bible</h2>${item('all', 'All 73 books', 'Your master trick', U.range(1, 73).filter((n) => BB.SECTIONS.some((s) => s.from === n)), '', 'Pentateuch, History, Wisdom, Prophets · Gospels, Acts, Paul, Catholic Letters, Revelation', 'The first book of each section, in order.')}
      <h2 class="grid-h">Path chunks</h2><div class="mn-grid">${BB.STAGES.map((s) => item('stage:' + s.id, `${s.index + 1}. ${s.title}`, `Books ${s.from}–${s.to}`, s.books, s.sec, s.mnemonic, s.how)).join('')}</div>
      <h2 class="grid-h">Whole sections</h2><div class="mn-grid">${BB.SECTIONS.filter((s) => s.books.length > 1).map((s) => item('sec:' + s.id, s.name, `Books ${s.from}–${s.to}`, s.books, s.id, '', '')).join('')}</div></div>`;
    U.$$('.mn-item', view).forEach((it) => {
      const key = it.dataset.key;
      const ed = U.$('.mn-edit', it), eb = U.$('.edit', it);
      eb.onclick = () => { ed.hidden = false; eb.hidden = true; U.$('textarea', ed).focus(); };
      U.$('.cancel', it).onclick = () => { ed.hidden = true; eb.hidden = false; };
      U.$('.save', it).onclick = () => { S.setMnemonic(key, U.$('textarea', it).value); ui.toast('✍️ Saved', 'good'); BB.sfx('good'); P.mnemonics(view); };
      const d = U.$('.del', it);
      if (d) d.onclick = () => { S.setMnemonic(key, ''); ui.toast('Removed'); P.mnemonics(view); };
    });
  };

  /* ---------------- Progress ---------------- */
  P.progress = function (view) {
    const D = S.data;
    const mastered = BB.BOOKS.filter((b) => S.bookStats(b.n).box >= 4).length;
    const st = D.stats;
    const missed = BB.BOOKS.map((b) => ({ n: b.n, s: S.bookStats(b.n) })).filter((x) => x.s.w + x.s.h > 0).sort((a, b) => b.s.w + b.s.h * 0.5 - (a.s.w + a.s.h * 0.5)).slice(0, 10);
    const bests = Object.entries(D.best).filter(([k]) => !k.startsWith('stop:')).sort((a, b) => (b[1].date || '').localeCompare(a[1].date || ''));
    const totalStars = S.totalStars();
    view.innerHTML = `<div class="page"><header class="page-head"><h1>Your Progress</h1><p class="muted">Saved on this device${S.memoryOnly ? ' — <b>storage is blocked, so it will not persist</b>' : ''}.</p></header>
      <div class="stat-tiles">
        <div class="stat"><b>★ ${totalStars}</b><span>of ${BB.path.maxStars} stars</span></div>
        <div class="stat"><b>${BB.path.done()}</b><span>of ${BB.path.stops.length} stops done</span></div>
        <div class="stat"><b>${mastered}</b><span>of 73 books mastered</span></div>
        <div class="stat"><b>🔥 ${S.streak()}</b><span>day streak · best ${D.daily.bestStreak}</span></div>
        <div class="stat"><b>${st.answers ? Math.round((st.correct / st.answers) * 100) : 0}%</b><span>of ${st.answers} answers right</span></div>
        <div class="stat"><b>💡 ${st.hinted}</b><span>right with a hint · ${st.correct - st.hinted} unaided</span></div>
      </div>
      <div class="card"><h2>Mastery by section</h2><div class="mastery">${BB.SECTIONS.map((s) => { const m = s.books.reduce((a, n) => a + S.mastery(n), 0) / s.books.length; return `<div class="m-row" data-sec="${s.id}"><span class="m-name">${U.esc(s.name)}</span><span class="m-bar"><i style="width:${Math.round(m * 100)}%"></i></span><b>${Math.round(m * 100)}%</b></div>`; }).join('')}</div></div>
      <div class="card"><h2>Every book</h2><p class="muted small">Brighter = stronger. Tap any book for details.</p><div class="heat">${BB.BOOKS.map((b) => `<button class="heat-cell" data-sec="${b.sec}" data-n="${b.n}" style="--m:${Math.round(S.mastery(b.n) * 100)}%" title="${U.esc(b.name)}"><span>${b.n}</span><small>${U.esc(b.abbr)}</small></button>`).join('')}</div></div>
      <div class="card"><h2>Most missed</h2>${missed.length ? `<div class="missed-list">${missed.map((x) => `<div class="mm-row">${ui.chip(x.n, { num: true })}<span class="muted small">${x.s.w} missed · ${x.s.h} hinted · ${x.s.r} right</span></div>`).join('')}</div>
        <button class="btn primary quiz-missed">Quiz me on these</button> <span class="muted small">These books are also weighted to come up more often everywhere.</span>` : '<p class="muted">Nothing yet — play a few stops and your trouble spots will appear here.</p>'}</div>
      <div class="card"><h2>Best scores & times</h2>${bests.length ? `<div class="best-table">${bests.map(([k, b]) => `<div class="best-row"><span><b>${U.esc(b.label || k)}</b><small class="muted"> ${U.esc(b.sub || '')}</small></span><b>${Math.round(b.pct * 100)}%</b><span class="muted small">${b.timeMs ? '⏱ ' + U.fmtTime(b.timeMs) : ''}${b.score != null ? ' · ' + b.score : ''} · ${b.date}</span></div>`).join('')}</div>` : '<p class="muted">Play quizzes and games in Practice to set records.</p>'}</div>
      <div class="card"><h2>Path stars by stage</h2><div class="stage-stars">${BB.path.STAGES.map((s) => { const ids = BB.path.stops.filter((x) => x.stage === s); const got = ids.reduce((a, x) => a + S.stop(x.id).stars, 0); return `<div class="ss-row" ${s.sec ? `data-sec="${s.sec}"` : ""}><span>${s.checkpoint ? U.esc(s.label) + ': ' : (s.final ? s.num : s.index + 1) + '. '}${U.esc(s.title)}</span><span class="m-bar"><i style="width:${(got / (ids.length * 3)) * 100}%"></i></span><b>${got}/${ids.length * 3}</b></div>`; }).join('')}</div></div>
      <div class="card"><h2>Your data</h2><p class="muted small">Move your progress to another device with a backup file.</p><div class="row-btns"><button class="btn ghost exp">⬇ Export backup</button><label class="btn ghost">⬆ Import backup<input type="file" accept="application/json,.json" hidden class="imp"></label><button class="btn danger reset">Reset all progress</button></div></div></div>`;
    U.$$('.heat-cell, .missed-list .chip', view).forEach((c) => (c.onclick = () => ui.bookInfo(+c.dataset.n)));
    const qm = U.$('.quiz-missed', view);
    if (qm) qm.onclick = () => BB.run('quiz', { books: U.range(1, 73), targets: missed.map((x) => x.n), n: 10, format: 'mixed', types: ['after', 'before', 'number', 'numberOf', 'section', 'teaches'], poolKey: 'most-missed', poolLabel: 'Most-missed books' }, { mode: 'practice', back: '#/progress', backLabel: 'Back to progress', label: 'Most-missed quiz' });
    U.$('.exp', view).onclick = () => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([S.export()], { type: 'application/json' }));
      a.download = `seventy-three-backup-${U.today()}.json`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    };
    U.$('.imp', view).onchange = async (e) => {
      const f = e.target.files[0];
      if (!f) return;
      try { S.import(await f.text()); ui.toast('Backup restored', 'good'); BB.router(); } catch (err) { ui.toast('Could not read that file', 'bad'); }
    };
    U.$('.reset', view).onclick = async () => {
      if (await ui.confirm('Erase all stars, stats, streaks, and mnemonics on this device?', 'Erase everything', 'Cancel')) { S.reset(); BB.applyTheme(); ui.toast('Progress reset'); BB.router(); }
    };
  };

  /* ---------------- Settings ---------------- */
  BB.openSettings = function () {
    const st = S.settings;
    const body = U.el(`<div class="settings">
      <div class="field toggle-field"><label class="switch"><input type="checkbox" name="strict"${st.strict ? ' checked' : ''}><span class="sw"></span><span>Strict spelling by default</span></label><small class="muted">Off: typed answers ignore capitals and accept variants like "1 Sam", "Song of Solomon", "Apocalypse", and small typos.</small></div>
      <div class="field toggle-field"><label class="switch"><input type="checkbox" name="summaries"${BB.askSummaries() ? ' checked' : ''}><span class="sw"></span><span>Questions about what each book teaches</span></label><small class="muted">Turn off to practice only book names, order, and sections. Summaries still show in lessons and the book list.</small></div>
      <div class="field toggle-field"><label class="switch"><input type="checkbox" name="sound"${st.sound ? ' checked' : ''}><span class="sw"></span><span>Sound effects</span></label></div>
      <div class="field toggle-field"><label class="switch"><input type="checkbox" name="haptics"${st.haptics ? ' checked' : ''}><span class="sw"></span><span>Vibration (phones)</span></label></div>
      <div class="field"><label class="f-label">Theme</label><div class="seg">${[['auto', 'Auto'], ['light', 'Light'], ['dark', 'Dark']].map(([v, l]) => `<label><input type="radio" name="theme" value="${v}"${st.theme === v ? ' checked' : ''}><span>${l}</span></label>`).join('')}</div></div>
    </div>`);
    body.addEventListener('change', (e) => {
      const t = e.target;
      S.set(t.name, t.type === 'checkbox' ? t.checked : t.value);
      if (t.name === 'theme') BB.applyTheme();
      if (t.name === 'sound' && t.checked) BB.sfx('good');
      // refresh the page behind the popup so labels and options match the new setting
      if (t.name === 'summaries' && !document.body.classList.contains('in-activity')) {
        const v = U.$('#view'), tab = (location.hash.split('/')[1] || '').split('?')[0];
        if (!tab) BB.pages.path(v); else if (tab === 'practice' && location.hash.split('/')[2]) BB.pages.setup(v, location.hash.split('/')[2].split('?')[0]);
      }
    });
    ui.modal({ title: '⚙️ Settings', body });
  };
})();
