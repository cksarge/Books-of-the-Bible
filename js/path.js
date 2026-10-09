/* Seventy-Three — the learning path. */
(function () {
  const BB = window.BB, U = BB.U, ui = BB.ui, S = BB.store;

  const ALL_TYPES = ['after', 'before', 'number', 'numberOf', 'section', 'teaches'];
  const REVIEW_GAMES = ['sort', 'odd', 'first', 'missing', 'sort', 'odd', 'shelf', 'first', 'odd', 'sort', 'missing'];

  /** Boss = rapid-fire typed questions with lives, then recite the range. */
  BB.bossParts = function (from, to, name) {
    const books = U.range(from, to);
    return [
      { id: 'quiz', icon: '⚔️', label: 'Rapid fire', blurb: `${Math.min(10, books.length + 3)} typed questions on ${U.esc(name)}. 3 lives, 30 seconds each. Lose all your lives and the boss wins!`,
        opts: { books, n: Math.min(10, books.length + 3), format: 'typed', types: ['after', 'before', 'number', 'teaches', 'numberOf'], lives: 3, perSec: 30, boss: name }, weight: books.length },
      { id: 'test', icon: '📝', label: 'Final blow: recite it all', blurb: `Write books ${from}–${to} from memory.`, opts: { from, to, timer: 'up', hints: true } },
    ];
  };

  BB.def('boss', {
    title: 'Section Boss Round', icon: '👑', kind: 'game',
    desc: 'A harder mixed challenge on one whole section: rapid-fire questions with 3 lives, then recite it all.',
    setup: [{ key: 'section', type: 'section', label: 'Section', def: 'hist' }],
    fromSetup(v) {
      const s = BB.sec(v.section);
      return { section: s.id, sec: s.id, from: s.from, to: s.to, name: s.name, poolKey: 'sec:' + s.id, poolLabel: s.name };
    },
    run(body, opts, api) {
      if (opts.from === opts.to) {
        // a one-book section is too small for a boss: widen to its testament neighbours
        const s = BB.sec(opts.section);
        const nb = BB.SECTIONS.filter((x) => x.testament === s.testament && Math.abs(x.index - s.index) <= 1);
        opts.from = Math.min(...nb.map((x) => x.from));
        opts.to = Math.max(...nb.map((x) => x.to));
      }
      BB.acts.seq.run(body, { parts: BB.bossParts(opts.from, opts.to, opts.name), sec: opts.sec }, api);
    },
  });

  /* ---------------- stop list ---------------- */
  const stops = [];
  const add = (s) => { s.index = stops.length; stops.push(s); };
  const secFrom = (st) => BB.sec(st.sec).from;

  function gameStop(st, g, k) {
    const def = BB.acts[g];
    const bf = secFrom(st);
    const build = {
      order: () => ({ sets: [st.books, st.index ? U.sample(U.range(1, st.from - 1), 3).concat(U.sample(st.books, 4)).sort((a, b) => a - b) : U.shuffle(st.books).slice(0, 5).sort((a, b) => a - b)] }),
      match: () => ({ books: st.books, mode: 'tag', rounds: Math.ceil(st.books.length / 5) }),
      missing: () => ({ from: Math.max(1, st.from - 3), to: st.to, targets: st.books, n: 6, runLen: 5 }),
      first: () => ({ books: U.range(Math.max(1, st.from - 6), st.to), n: 10 }),
      shelf: () => ({ from: Math.max(1, st.from - 4), to: st.to, gaps: U.sample(st.books, Math.ceil(st.books.length * 0.6)) }),
      hood: () => ({ targets: st.books.filter((n) => n < st.to && n > 1), books: st.books, n: 5 }),
      unscramble: () => ({ books: st.books, n: Math.min(5, st.books.length) }),
      survival: () => ({ start: bf, end: st.to }),
      mystery: () => ({ books: st.books, rounds: 2 }),
      speed: () => ({ from: bf, to: st.to }),
    }[g];
    return { id: `${st.id}-g${k}`, type: 'game', stage: st, sec: st.sec, icon: def.icon, title: def.title, desc: def.desc, act: g, build };
  }

  BB.STAGES.forEach((st, i) => {
    if (i >= 2 && i !== 8) {
      const prev = BB.STAGES[i - 1];
      const g = REVIEW_GAMES[(i - 2) % REVIEW_GAMES.length];
      add({
        id: 'review-' + st.id, type: 'review', stage: null, beforeStage: st, sec: null, icon: '🔁', title: 'Review',
        desc: `Mixed questions on books 1–${prev.to}, weighted toward the ones you miss, plus a round of ${BB.acts[g].title}.`,
        act: 'seq',
        build: () => ({
          parts: [
            { id: 'quiz', label: 'Mixed review', icon: '🔁', blurb: `10 questions drawn from books 1–${prev.to}.`, opts: { books: U.range(1, prev.to), n: 10, format: 'mixed', types: ALL_TYPES } },
            { id: g, label: BB.acts[g].title, opts: g === 'shelf'
              ? { from: 1, to: prev.to, gaps: U.weightedSample(U.range(1, prev.to), (n) => S.weight(n), 8) }
              : g === 'missing' ? { from: 1, to: prev.to, n: 6, runLen: 5 }
              : { books: U.range(1, prev.to), n: g === 'odd' ? 6 : g === 'first' ? 10 : 12 } },
          ],
        }),
      });
    }
    if (i === 8) {
      add({ id: 'final-ot', type: 'final', stage: null, sec: null, icon: '🏛️', title: 'Old Testament Final', checkpoint: 'Checkpoint',
        desc: 'Test simulation: write all 46 Old Testament books from memory.', act: 'test', build: () => ({ from: 1, to: 46, timer: 'up', hints: true }) });
    }
    add({ id: st.id + '-lesson', type: 'lesson', stage: st, sec: st.sec, icon: '📖', title: 'Lesson', desc: `Learn books ${st.from}–${st.to} with summaries, a memory trick, a fading list, and a quick check.`, act: 'lesson', build: () => ({ stage: st.id }) });
    add({ id: st.id + '-flash', type: 'flash', stage: st, sec: st.sec, icon: '🃏', title: 'Flashcards', desc: 'Flip through this chunk in mixed modes.', act: 'flash', build: () => ({ books: st.books, mode: 'mixed', shuffle: true }) });
    add({ id: st.id + '-quiz', type: 'quiz', stage: st, sec: st.sec, icon: '❓', title: 'Mini Quiz', desc: '8 mixed questions on this chunk.', act: 'quiz', build: () => ({ books: U.range(1, st.to), targets: st.books, n: 8, format: 'mixed', types: ALL_TYPES }) });
    st.games.forEach((g, k) => add(gameStop(st, g, k + 1)));
    const bf = secFrom(st);
    const bname = bf === st.from && st.to > BB.sec(st.sec).to ? st.title : BB.sec(st.sec).name;
    add({ id: st.id + '-boss', type: 'boss', stage: st, sec: st.sec, icon: '👑', title: 'Boss: ' + bname,
      desc: `Rapid-fire typed questions on books ${bf}–${st.to} (3 lives, 30 s each), then recite them all from memory.`,
      act: 'seq', build: () => ({ parts: BB.bossParts(bf, st.to, bname) }) });
  });

  /* Final review: two stages over all 73 books, each with a different mix of games and tools. */
  const ALL = U.range(1, 73);
  const FINAL_STAGES = [
    { id: 'fr1', num: 14, title: 'Final Review · Part 1', from: 1, to: 73, books: ALL, sec: null, final: true },
    { id: 'fr2', num: 15, title: 'Final Review · Part 2', from: 1, to: 73, books: ALL, sec: null, final: true },
  ];
  const frStop = (st, key, act, title, desc, build, extra = {}) =>
    add(Object.assign({ id: `${st.id}-${key}`, type: 'game', stage: st, sec: null, icon: BB.acts[act].icon, title, desc, act, build }, extra));
  const [fr1, fr2] = FINAL_STAGES;
  frStop(fr1, 'flash', 'flash', 'Weak Spots', 'Flashcards for the 15 books you find hardest right now, in mixed modes.', () => ({ books: S.weakest(ALL, 15), mode: 'mixed', shuffle: true }), { type: 'flash' });
  frStop(fr1, 'quiz', 'quiz', 'Mixed Quiz', '15 mixed questions drawn from all 73 books, weighted toward the ones you miss.', () => ({ books: ALL, n: 15, format: 'mixed', types: ALL_TYPES }), { type: 'quiz' });
  frStop(fr1, 'sort', 'sort', 'Sort It', 'Drop 20 books from across the Bible into their sections.', () => ({ books: ALL, n: 20 }));
  frStop(fr1, 'order', 'order', 'Put in Order', 'Three rounds of seven books from anywhere in the Bible.', () => ({ books: ALL, size: 7, rounds: 3 }));
  frStop(fr1, 'missing', 'missing', 'Missing Book', 'Eight runs of books from Genesis to Revelation, each with one gap.', () => ({ from: 1, to: 73, n: 8, runLen: 5 }));
  frStop(fr1, 'odd', 'odd', 'Odd One Out', 'Eight rounds: spot the book from a different section.', () => ({ books: ALL, n: 8 }));
  frStop(fr1, 'mystery', 'mystery', 'Mystery Book', 'Three hidden books from anywhere in the Bible.', () => ({ books: ALL, rounds: 3 }));
  frStop(fr1, 'shelf', 'shelf', 'Bookshelf', 'All 73 books on the shelf with 15 gaps to fill.', () => ({ from: 1, to: 73, gaps: U.weightedSample(ALL, (n) => S.weight(n), 15) }));
  add({ id: 'fr1-boss', type: 'boss', stage: fr1, sec: null, icon: '👑', title: 'Boss: The Whole Bible',
    desc: 'Rapid-fire typed questions on all 73 books (3 lives, 30 s each), then a survival streak from Genesis to Revelation.',
    act: 'seq', build: () => ({ parts: [
      { id: 'quiz', icon: '⚔️', label: 'Rapid fire', blurb: '12 typed questions from anywhere in the Bible. 3 lives, 30 seconds each.',
        opts: { books: ALL, n: 12, format: 'typed', types: ['after', 'before', 'number', 'teaches', 'numberOf'], lives: 3, perSec: 30, boss: 'The Whole Bible' }, weight: 72 },
      { id: 'survival', icon: '❤️', label: 'Survival: Genesis to Revelation', blurb: 'Name every book in order from Genesis onward. Three lives — go all the way!', opts: { start: 1, end: 73 } },
    ] }) });

  frStop(fr2, 'flash', 'flash', 'Summary Cards', 'Read a summary, name the book — 15 cards weighted toward your weak spots.', () => ({ books: S.weakest(ALL, 15), mode: 'summary-name', shuffle: true }), { type: 'flash' });
  frStop(fr2, 'match', 'match', 'Memory Match', 'Pair books from across the Bible with their sections.', () => ({ books: ALL, mode: 'section', rounds: 3 }));
  frStop(fr2, 'first', 'first', 'Which Comes First?', '15 quick head-to-heads from anywhere in the Bible.', () => ({ books: ALL, n: 15 }));
  frStop(fr2, 'hood', 'hood', 'Neighborhood', 'Name the books on either side of 8 books from across the Bible.', () => ({ books: ALL, n: 8 }));
  frStop(fr2, 'unscramble', 'unscramble', 'Unscramble', 'Eight of the trickiest spellings in the Bible.', () => ({ books: ALL, n: 8 }));
  frStop(fr2, 'quiz', 'quiz', 'Typed Quiz', '15 typed questions on all 73 books — no multiple choice this time.', () => ({ books: ALL, n: 15, format: 'typed', types: ['after', 'before', 'number', 'numberOf', 'teaches'] }), { type: 'quiz' });
  frStop(fr2, 'speed', 'speed', 'Speed Recall', 'Type all 73 from memory against the clock, in any order.', () => ({ from: 1, to: 73 }));
  // keeps its old id so earlier progress on the Grand Final carries over
  add({ id: 'final-all', type: 'final', stage: fr2, sec: null, icon: '🏆', title: 'Grand Finale',
    desc: 'The final boss: write all 73 books of the Catholic Bible from memory on a blank numbered sheet.', act: 'test', build: () => ({ from: 1, to: 73, timer: 'up', hints: true }) });

  const MAP = {};
  stops.forEach((s) => (MAP[s.id] = s));

  BB.path = {
    stops, MAP,
    STAGES: BB.STAGES.concat(FINAL_STAGES),
    pendingUnlock: null,
    next: (id) => stops[MAP[id].index + 1] || null,
    unlocked: (s) => s.index === 0 || S.stop(stops[s.index - 1].id).stars > 0,
    current() {
      for (const s of stops) if (!S.stop(s.id).stars) return s;
      return null;
    },
    maxStars: stops.length * 3,
    done: () => stops.filter((s) => S.stop(s.id).stars > 0).length,
    runStop(id) {
      const s = MAP[id];
      if (!s) return BB.go('#/');
      if (!this.unlocked(s)) { ui.toast('🔒 Finish the previous stop first'); return BB.go('#/'); }
      const opts = Object.assign({ sec: s.sec, icon: s.icon }, s.build());
      const where = s.stage ? s.stage.title : s.type === 'review' ? `Books 1–${BB.STAGES[s.beforeStage.index - 1].to}` : '';
      BB.run(s.act, opts, { mode: 'path', stopId: s.id, back: '#/', label: s.title + (where && s.type !== 'boss' ? ' · ' + where : ''), bestKey: 'stop:' + s.id });
    },
  };

  /* ---------------- path screen ---------------- */
  function groups() {
    const out = [];
    let cur = null;
    stops.forEach((s) => {
      const st = s.stage || s.beforeStage;
      const solo = s.type === 'final' && !s.stage; // a checkpoint between stages
      const key = solo ? s.id : st.id;
      if (!cur || cur.key !== key) { cur = { key, stage: solo ? null : st, final: solo ? s : null, stops: [] }; out.push(cur); }
      cur.stops.push(s);
    });
    return out;
  }

  BB.pages = BB.pages || {};
  BB.pages.path = function (view) {
    const current = BB.path.current();
    const total = S.totalStars();
    const streak = S.streak();
    const dailyToday = S.data.daily.last === U.today();
    const learnedTo = BB.pools.learnedTo();
    const lessonDone = (st) => S.stop(st.id + '-lesson').stars > 0;

    let html = '';
    html += `<div class="path-hero">
      <div class="hero-top"><div><div class="eyebrow">Your journey</div><h1>Genesis → Revelation</h1></div>
        <div class="hero-stats"><span title="Stars">★ <b>${total}</b><small>/${BB.path.maxStars}</small></span><span title="Stops completed">📍 <b>${BB.path.done()}</b><small>/${stops.length}</small></span><span title="Daily streak">🔥 <b>${streak}</b></span></div></div>
      <div class="book-strip" aria-label="Books learned">${BB.BOOKS.map((b) => `<i data-sec="${b.sec}" class="${b.n <= learnedTo && lessonDone(BB.stageOf(b.n)) ? 'on' : ''}" title="${U.esc(b.name)}"></i>`).join('')}</div>
      ${current ? `<button class="next-card" ${current.sec ? `data-sec="${current.sec}"` : ''}><span class="nc-ico">${current.icon}</span><span class="nc-text"><small>Up next</small><b>${U.esc(current.title)}</b><span>${U.esc(current.stage ? current.stage.title + ' · books ' + current.stage.from + '–' + current.stage.to : current.desc)}</span></span><span class="nc-go">Start →</span></button>`
        : '<div class="next-card done"><span class="nc-ico">🏆</span><span class="nc-text"><b>Path complete!</b><span>Replay any stop to earn more stars, or keep sharp with daily review.</span></span></div>'}
      ${!dailyToday ? `<a class="daily-card" href="#/daily"><span>🔥</span><span><b>Daily review</b><small>${streak ? `Keep your ${streak}-day streak going` : 'Start a streak'} · about 5 minutes</small></span><span class="nc-go">Go →</span></a>` : `<div class="daily-card done"><span>✅</span><span><b>Daily review done</b><small>${streak}-day streak — see you tomorrow!</small></span></div>`}
    </div><div class="path">`;

    let gi = 0;
    groups().forEach((g) => {
      if (g.final) {
        const s = g.final;
        html += `<div class="checkpoint"><div class="cp-label">${U.esc(s.checkpoint)}</div></div>`;
      } else {
        const st = g.stage;
        const stops2 = g.stops.filter((s) => s.stage);
        const got = stops2.reduce((a, s) => a + S.stop(s.id).stars, 0);
        const sub = st.final ? 'All 73 books · Genesis to Revelation' : `${U.esc(BB.sec(st.sec).name)}${st.to > BB.sec(st.sec).to ? ' & ' + U.esc(BB.sec(BB.book(st.to).sec).name) : ''} · books ${st.from}–${st.to}`;
        html += `<div class="stage-banner ${st.final ? 'final-stage' : ''}" ${st.sec ? `data-sec="${st.sec}"` : ''}><div class="sb-left"><div class="sb-num">Stage ${st.final ? st.num : st.index + 1}</div><h2>${U.esc(st.title)}</h2>
          <div class="sb-sub">${sub}</div></div>
          <div class="sb-right"><span class="sb-stars">★ ${got}/${stops2.length * 3}</span>${st.final ? '<a class="btn small ghost-light" href="#/books">Books</a>' : `<button class="btn small ghost-light sb-ref" data-stage="${st.id}">Books</button>`}</div></div>`;
      }
      const ROW = 136;
      const pts = g.stops.map((s, k) => ({ s, x: 50 + 30 * Math.sin((gi + k) * 0.95), y: k * ROW + 78 }));
      gi += g.stops.length;
      const h = g.stops.length * ROW + 40;
      const d = pts.map((p, k) => (k ? `S ${pts[k - 1].x} ${p.y - ROW / 2} ${p.x} ${p.y}` : `M ${p.x} ${p.y}`)).join(' ');
      html += `<div class="stops" style="height:${h}px"><svg class="trail" viewBox="0 0 100 ${h}" preserveAspectRatio="none" aria-hidden="true"><path d="${d}"/></svg>`;
      pts.forEach(({ s, x, y }) => {
        const rec = S.stop(s.id);
        const open = BB.path.unlocked(s);
        const state = rec.stars ? 'done' : open ? 'open' : 'locked';
        const isCur = current && current.id === s.id;
        html += `<button class="node ${state} ${isCur ? 'current' : ''} t-${s.type}" ${s.sec ? `data-sec="${s.sec}"` : ''} data-id="${s.id}" style="left:${x}%;top:${y}px" aria-label="${U.esc(s.title)}${open ? '' : ' (locked)'}">
          ${isCur ? '<span class="here">You are here</span>' : ''}
          <span class="node-ico">${open ? s.icon : '🔒'}</span>
          <span class="node-label">${U.esc(s.title)}</span>
          ${rec.stars || open ? `<span class="node-stars">${ui.stars(rec.stars)}</span>` : ''}
        </button>`;
      });
      html += '</div>';
    });
    html += '</div>';
    view.innerHTML = html;

    const nc = U.$('button.next-card', view);
    if (nc) nc.onclick = () => BB.go('#/stop/' + current.id);
    U.$$('.sb-ref', view).forEach((b) => (b.onclick = () => {
      const st = BB.STAGE_MAP[b.dataset.stage];
      ui.modal({ title: U.esc(st.title), body: `<div class="ref-mini">${st.books.map((n) => `<div class="rm-row" data-sec="${BB.book(n).sec}"><span class="num-badge">${n}</span><b>${U.esc(BB.book(n).name)}</b><span class="muted small">${U.esc(BB.book(n).tag)}</span></div>`).join('')}</div>${BB.mnemonicHtml(st, { editable: false })}` });
    }));
    U.$$('.node', view).forEach((n) => (n.onclick = () => {
      const s = MAP[n.dataset.id];
      if (!BB.path.unlocked(s)) { BB.fx.shake(n); BB.sfx('bad'); ui.toast('🔒 Finish the previous stop to unlock this one'); return; }
      const rec = S.stop(s.id);
      ui.modal({
        title: `${s.icon} ${U.esc(s.title)}`,
        body: `${s.stage ? `<p class="muted small">${U.esc(s.stage.title)} · books ${s.stage.from}–${s.stage.to}</p>` : ''}<p>${U.esc(s.desc)}</p>
          ${rec.plays ? `<p>${ui.stars(rec.stars)} <span class="muted small">Best ${Math.round(rec.best * 100)}% · played ${U.plural(rec.plays, 'time')}</span></p>` : ''}`,
        actions: [{ label: rec.stars ? '↻ Replay' : 'Start', cls: 'primary', onClick: () => BB.go('#/stop/' + s.id) }],
      });
    }));

    // scroll to current / just-unlocked stop
    const target = (BB.path.pendingUnlock && U.$(`.node[data-id="${BB.path.pendingUnlock}"]`, view)) || U.$('.node.current', view);
    if (BB.path.pendingUnlock && target) {
      target.classList.add('just-unlocked');
      setTimeout(() => { BB.sfx('unlock'); BB.fx.burst(target); }, 450);
    }
    BB.path.pendingUnlock = null;
    if (target && (S.data.seenWelcome || BB.path.done())) setTimeout(() => target.scrollIntoView({ block: 'center', behavior: 'smooth' }), 120);
  };
})();
