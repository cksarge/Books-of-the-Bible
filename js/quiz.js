/* Seventy-Three — question engine, mini quiz, daily review. */
(function () {
  const BB = window.BB, U = BB.U, ui = BB.ui, S = BB.store;

  // Each type is keyed on the book the learner must recall (the "target").
  const TYPES = {
    after: { label: 'What comes after?', kind: 'book', valid: (t, P) => t > 1 && P.has(t - 1) },
    before: { label: 'What comes before?', kind: 'book', valid: (t, P) => t < 73 && P.has(t + 1) },
    number: { label: 'Book by number', kind: 'book', valid: () => true },
    numberOf: { label: 'Number of a book', kind: 'num', valid: () => true },
    section: { label: 'Which section?', kind: 'sec', valid: () => true },
    teaches: { label: 'Which book teaches…?', kind: 'book', valid: () => true },
  };
  const TYPE_OPTIONS = [
    ['after', 'What comes after ___?'], ['before', 'What comes before ___?'], ['number', 'What is book #__?'],
    ['numberOf', 'What number is ___?'], ['section', 'Which section is ___ in?'], ['teaches', 'Which book teaches ___?'],
  ];

  function prompt(type, t) {
    const b = BB.book(t);
    switch (type) {
      case 'after': return `What comes <em>after</em> ${ui.chip(t - 1)}?`;
      case 'before': return `What comes <em>before</em> ${ui.chip(t + 1)}?`;
      case 'number': return `Which book is <em>#${t}</em>?`;
      case 'numberOf': return `What number is ${ui.chip(t)} in the Bible?`;
      case 'section': return `Which section is <b>${U.esc(b.name)}</b> in?`;
      case 'teaches': return `Which book is this?<blockquote>${U.esc(BB.redact(t))}</blockquote>`;
    }
  }

  function bookDistractors(t, exclude, P) {
    const near = [];
    for (let d = 1; d <= 5; d++) [t - d, t + d].forEach((x) => { if (x >= 1 && x <= 73 && !exclude.has(x)) near.push(x); });
    const inPool = near.filter((x) => P.has(x));
    const pickFrom = inPool.length >= 3 ? inPool : near;
    // favour the closest few, with a little randomness
    return U.shuffle(pickFrom.slice(0, 6)).slice(0, 3);
  }

  BB.quiz = {
    TYPES, TYPE_OPTIONS,
    /**
     * Build questions. o: { books, targets?, n, types, format: 'mc'|'typed'|'mixed' }
     */
    gen(o) {
      const P = new Set(o.books);
      const T = (o.targets && o.targets.length ? o.targets : o.books).slice();
      const types = (o.types && o.types.length ? o.types : Object.keys(TYPES)).filter((k) => TYPES[k]);
      let order = [];
      while (order.length < o.n) {
        const batch = U.weightedSample(T, (n) => S.weight(n), Math.min(T.length, o.n - order.length));
        // avoid immediate repeats across batches
        if (order.length && batch[0] === order[order.length - 1] && batch.length > 1) batch.push(batch.shift());
        order = order.concat(batch);
      }
      const used = new Set();
      return order.map((t) => {
        let valid = types.filter((ty) => TYPES[ty].valid(t, P) && !used.has(ty + t));
        if (!valid.length) valid = types.filter((ty) => TYPES[ty].valid(t, P));
        if (!valid.length) valid = ['number'];
        const type = U.pick(valid);
        used.add(type + t);
        const kind = TYPES[type].kind;
        let format = o.format === 'mixed' ? (Math.random() < 0.5 ? 'mc' : 'typed') : o.format || 'mc';
        if (kind === 'sec') format = 'mc';
        const q = { type, target: t, kind, format, prompt: prompt(type, t), label: TYPES[type].label };
        if (kind === 'book') {
          q.answer = t;
          if (format === 'mc') {
            const ex = new Set([t]);
            if (type === 'after') ex.add(t - 1);
            if (type === 'before') ex.add(t + 1);
            q.options = U.shuffle([t, ...bookDistractors(t, ex, P)]);
          }
        } else if (kind === 'num') {
          q.answer = t;
          if (format === 'mc') {
            const c = U.shuffle([-3, -2, -1, 1, 2, 3].map((d) => t + d).filter((x) => x >= 1 && x <= 73)).slice(0, 3);
            q.options = U.shuffle([t, ...c]);
          }
        } else {
          const sec = BB.book(t).sec;
          q.answer = sec;
          const same = BB.SECTIONS.filter((s) => s.id !== sec && s.testament === BB.book(t).testament).map((s) => s.id);
          const other = BB.SECTIONS.filter((s) => s.id !== sec && !same.includes(s.id)).map((s) => s.id);
          q.options = U.shuffle([sec, ...U.shuffle(same).concat(U.shuffle(other)).slice(0, 3)]);
        }
        return q;
      });
    },

    /**
     * Play a list of questions inside container.
     * o: { api, strict, lives, perSec, timeLimit (sec), boss (name), onDone(results, meta) }
     */
    play(container, qs, o) {
      const api = o.api;
      const results = [];
      let i = 0, lives = o.lives || 0, ended = false;
      const tStart = performance.now();
      const wrap = U.el(`<div class="quiz">
        ${o.boss ? `<div class="boss-bar"><span class="boss-name">👑 ${U.esc(o.boss)}</span><div class="hp"><i style="width:100%"></i></div></div>` : ''}
        <div class="quiz-head"><span class="qcount"></span><span class="lives"></span><span class="qclock"></span></div>
        ${o.perSec ? '<div class="qtimer"><i></i></div>' : ''}
        <div class="qcard"><div class="qtype"></div><div class="qprompt"></div></div>
        <div class="qanswer"></div>
        <div class="qfeedback" aria-live="polite"></div>
      </div>`);
      container.appendChild(wrap);
      const $ = (s) => U.$(s, wrap);
      let qTimer = null, advanceT = null;
      api.onCleanup(() => { clearInterval(qTimer); clearTimeout(advanceT); });
      let correctCount = 0;

      if (o.timeLimit) {
        api.interval(() => {
          const left = o.timeLimit * 1000 - (performance.now() - tStart);
          $('.qclock').textContent = '⏱ ' + U.fmtTime(left);
          if (left <= 0) $('.qclock').classList.add('over');
        }, 250);
      }

      const drawLives = () => {
        if (!o.lives) return;
        $('.lives').innerHTML = Array.from({ length: o.lives }, (_, k) => `<i class="${k < lives ? 'on' : ''}">♥</i>`).join('');
      };
      const label = (q, v) => (q.kind === 'sec' ? BB.sec(v).name : q.kind === 'num' ? '#' + v : BB.book(v).name);

      const show = () => {
        if (ended) return;
        const q = qs[i];
        wrap._q = q;
        api.progress(i / qs.length);
        $('.qcount').textContent = `Question ${i + 1} of ${qs.length}`;
        drawLives();
        $('.qtype').textContent = q.label;
        $('.qprompt').innerHTML = q.prompt;
        $('.qfeedback').innerHTML = '';
        $('.qfeedback').className = 'qfeedback';
        const ans = $('.qanswer');
        ans.innerHTML = '';
        let answered = false;
        const submit = (given, ok, hinted, givenLabel) => {
          if (answered) return;
          answered = true;
          clearInterval(qTimer);
          finishQ(q, ok, hinted, givenLabel);
        };
        if (q.format === 'mc') {
          const grid = U.el('<div class="mc"></div>');
          q.options.forEach((v, k) => {
            const sec = q.kind === 'sec' ? v : null;
            const b = U.el(`<button class="mc-opt" ${sec ? `data-sec="${sec}"` : ''}><span class="key">${k + 1}</span>${U.esc(label(q, v))}</button>`);
            b.onclick = () => {
              if (answered) return;
              const ok = v === q.answer;
              b.classList.add(ok ? 'ok' : 'bad');
              U.$$('.mc-opt', grid).forEach((x, j) => { x.disabled = true; if (q.options[j] === q.answer) x.classList.add('ok'); });
              submit(v, ok, false, label(q, v));
            };
            grid.appendChild(b);
          });
          ans.appendChild(grid);
        } else {
          const box = ui.typed({
            book: q.answer,
            numeric: q.kind === 'num',
            placeholder: q.kind === 'num' ? 'Type a number 1–73…' : 'Type the book name…',
            hintText: q.kind === 'num' ? () => { const s = BB.sec(BB.book(q.target).sec); return `${s.name}: #${s.from}–${s.to}`; } : null,
            onSubmit: ({ text, hinted }) => {
              let ok, gl = text.trim();
              if (q.kind === 'num') ok = parseInt(text, 10) === q.answer;
              else {
                const id = api.strict ? BB.match.strictIdentify(text) : BB.match.identify(text);
                ok = id === q.answer;
                if (id) gl = BB.book(id).name;
              }
              box.lock();
              box.classList.add(ok ? 'ok' : 'bad');
              submit(text, ok, hinted, gl);
            },
          });
          ans.appendChild(box);
        }
        if (o.perSec) {
          const bar = $('.qtimer i');
          const t0 = performance.now();
          bar.style.width = '100%';
          qTimer = setInterval(() => {
            const f = 1 - (performance.now() - t0) / (o.perSec * 1000);
            bar.style.width = Math.max(0, f) * 100 + '%';
            bar.classList.toggle('low', f < 0.3);
            if (f <= 0) {
              clearInterval(qTimer);
              if (!answered) {
                answered = true;
                U.$$('button, input', ans).forEach((x) => (x.disabled = true));
                finishQ(q, false, false, '⏱ time ran out');
              }
            }
          }, 100);
        }
      };

      const finishQ = (q, ok, hinted, givenLabel) => {
        results.push({ q, ok, hinted: ok && hinted, given: givenLabel });
        api.record(q.target, ok, hinted);
        const fb = $('.qfeedback');
        const ansHtml = q.kind === 'sec' ? ui.secChip(q.answer) : q.kind === 'num' ? `<b>#${q.answer}</b>` : ui.chip(q.answer, { num: true });
        const b = BB.book(q.target);
        if (ok) {
          correctCount++;
          BB.sfx('good');
          BB.fx.burst($('.qcard'));
          fb.className = 'qfeedback good';
          fb.innerHTML = `<div class="fb-title">✓ ${U.pick(['Correct!', 'Yes!', 'Nailed it!', 'Exactly!', 'Well done!'])}${hinted ? ' <span class="muted">(with hint)</span>' : ''}</div>
            <div class="fb-info">${ui.chip(q.target, { num: true })} <span class="muted">${U.esc(BB.sec(b.sec).name)} · ${U.esc(b.tag)}</span></div>`;
          if (o.boss) $('.hp i').style.width = (1 - correctCount / qs.length) * 100 + '%';
        } else {
          BB.sfx('bad');
          BB.fx.shake($('.qcard'));
          if (o.lives) lives--;
          drawLives();
          fb.className = 'qfeedback bad';
          fb.innerHTML = `<div class="fb-title">✗ Not quite${givenLabel ? ` — you said <i>${U.esc(givenLabel)}</i>` : ''}</div>
            <div class="fb-info">Answer: ${ansHtml} <span class="muted">${q.kind === 'book' ? U.esc(b.tag) : ''}</span></div>`;
        }
        const outOfLives = o.lives && lives <= 0;
        const outOfTime = o.timeLimit && performance.now() - tStart > o.timeLimit * 1000;
        const last = i === qs.length - 1 || outOfLives || outOfTime;
        const nb = U.el(`<button class="btn primary next-btn">${last ? 'See results' : 'Next →'}</button>`);
        fb.appendChild(nb);
        const go = () => {
          clearTimeout(advanceT);
          document.removeEventListener('keydown', key);
          if (last) return end(outOfLives);
          i++;
          show();
        };
        const key = (e) => { if (e.key === 'Enter' && !(e.target.tagName === 'INPUT' && !e.target.disabled)) { e.preventDefault(); go(); } };
        nb.onclick = go;
        setTimeout(() => { document.addEventListener('keydown', key); nb.focus({ preventScroll: true }); }, 60);
        api.onCleanup(() => document.removeEventListener('keydown', key));
        if (ok && !last) advanceT = setTimeout(go, 1300);
      };

      const mcKey = (e) => {
        if (/^[1-4]$/.test(e.key) && document.activeElement.tagName !== 'INPUT') {
          const b = U.$$('.mc-opt', wrap)[+e.key - 1];
          if (b && !b.disabled) b.click();
        }
      };
      document.addEventListener('keydown', mcKey);
      api.onCleanup(() => document.removeEventListener('keydown', mcKey));

      const end = (failed) => {
        ended = true;
        api.progress(1);
        o.onDone(results, { failed });
      };
      show();
    },

    summarize(results, extra = {}) {
      const asked = results.length;
      const correct = results.filter((r) => r.ok).length;
      const hinted = results.filter((r) => r.hinted).length;
      const missed = results.filter((r) => !r.ok).map((r) => r.q.target);
      const label = (q, v) => (q.kind === 'sec' ? BB.sec(v).name : q.kind === 'num' ? '#' + v : BB.book(v).name);
      const details = `<div class="review-list"><h3 class="details-h">Answers</h3>${results
        .map((r, k) => `<div class="review-item ${r.ok ? 'ok' : 'bad'}"><span class="ri-mark">${r.ok ? (r.hinted ? '💡' : '✓') : '✗'}</span>
          <div><div class="ri-q">${k + 1}. ${r.q.prompt.replace(/<blockquote>.*<\/blockquote>/, ' <span class="muted">“' + U.esc(BB.redact(r.q.target).slice(0, 70)) + '…”</span>')}</div>
          <div class="ri-a">${r.ok ? '' : `<span class="muted">You:</span> ${U.esc(r.given || '—')} · `}<span class="muted">Answer:</span> <b>${U.esc(label(r.q, r.q.answer))}</b></div></div></div>`)
        .join('')}</div>`;
      return Object.assign({ correct, total: extra.total || asked, hinted, missed, details }, extra);
    },
  };

  /* ---------------- Mini quiz activity ---------------- */
  BB.def('quiz', {
    title: 'Mini Quiz', icon: '❓', kind: 'quiz',
    desc: 'Multiple-choice and typed questions: before/after, numbers, sections, and what each book teaches.',
    setup: [
      { key: 'sections', type: 'sections', label: 'Sections to cover' },
      { key: 'n', type: 'seg', label: 'Length', options: [[5, '5'], [10, '10'], [20, '20'], [30, '30']], def: 10 },
      { key: 'format', type: 'seg', label: 'Answer style', options: [['mixed', 'Mixed'], ['mc', 'Multiple choice'], ['typed', 'Typed']], def: 'mixed' },
      { key: 'types', type: 'multi', label: 'Question types', options: TYPE_OPTIONS, def: TYPE_OPTIONS.map((t) => t[0]) },
      { key: 'strict', type: 'toggle', label: 'Strict spelling', hint: 'Only exact book names count for typed answers.' },
    ],
    fromSetup(v) {
      const secs = v.sections && v.sections.length ? v.sections : BB.SECTIONS.map((s) => s.id);
      const books = secs.flatMap((id) => BB.sec(id).books).sort((a, b) => a - b);
      const label = secs.length === BB.SECTIONS.length ? 'All sections' : secs.map((id) => BB.sec(id).name).join(', ');
      return { books, n: +v.n, format: v.format, types: v.types, strict: v.strict, poolKey: 'secs:' + secs.join(','), poolLabel: label };
    },
    run(body, opts, api) {
      const qs = BB.quiz.gen(opts);
      BB.quiz.play(body, qs, {
        api, lives: opts.lives, perSec: opts.perSec, boss: opts.boss, timeLimit: opts.timeLimit,
        onDone(results, meta) {
          const res = BB.quiz.summarize(results, { total: qs.length });
          if (meta.failed) { res.failed = true; res.failText = 'Out of lives! The boss wins this round.'; }
          api.finish(res);
        },
      });
    },
  });

  /* ---------------- Daily review ---------------- */
  BB.def('daily', {
    title: 'Daily Review', icon: '🔥', kind: 'tool',
    desc: 'About five minutes on the books you find hardest. Keep your streak alive!',
    run(body, opts, api) {
      const to = BB.pools.learnedTo();
      const pool = U.range(1, to);
      const targets = S.weakest(pool, Math.min(10, pool.length));
      const qs = BB.quiz.gen({ books: pool, targets, n: 15, format: 'mixed', types: Object.keys(TYPES) });
      const streak = S.streak();
      body.appendChild(U.el(`<div class="daily-intro muted small">Focus books: ${targets.map((n) => ui.chip(n, { abbr: true })).join(' ')} ${streak ? ` · 🔥 ${streak}-day streak` : ''}</div>`));
      BB.quiz.play(body, qs, {
        api, timeLimit: 300,
        onDone(results) { api.finish(BB.quiz.summarize(results)); },
      });
    },
  });
})();
