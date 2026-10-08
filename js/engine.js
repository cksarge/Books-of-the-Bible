/* Seventy-Three — activity runner, result screen, recite sheet, sequences. */
(function () {
  const BB = window.BB, U = BB.U, ui = BB.ui, S = BB.store;

  BB.acts = {}; // id -> { id, title, icon, kind, desc, setup:[...], fromSetup(values), run(body, opts, api) }
  BB.def = (id, d) => { d.id = id; BB.acts[id] = d; };

  let cleanupFn = null;
  BB.setCleanup = (fn) => { if (cleanupFn) try { cleanupFn(); } catch (e) {} cleanupFn = fn; };
  BB.go = (hash) => { if (location.hash === hash) BB.router(); else location.hash = hash; };

  /**
   * Run an activity full-screen.
   * ctx: { mode: 'practice'|'path'|'daily', stopId, back, bestKey, label, onAgain }
   */
  BB.run = function (id, opts, ctx = {}) {
    const def = BB.acts[id];
    const view = U.$('#view');
    document.body.classList.add('in-activity');
    window.scrollTo(0, 0);
    const color = opts.sec ? `data-sec="${opts.sec}"` : '';
    view.innerHTML = `<section class="act" ${color}>
      <header class="act-top">
        <button class="icon-btn act-quit" aria-label="Quit">✕</button>
        <div class="act-title"><span class="act-icon">${opts.icon || def.icon}</span><span>${U.esc(ctx.label || opts.title || def.title)}</span></div>
        <div class="act-meta"></div>
      </header>
      <div class="act-progress"><i></i></div>
      <div class="act-body"></div>
    </section>`;
    const body = U.$('.act-body', view);
    let cleanups = [];
    let done = false;
    const t0 = performance.now();
    const api = {
      body, opts, ctx,
      strict: opts.strict != null ? opts.strict : S.settings.strict,
      progress(f) { U.$('.act-progress i', view).style.width = U.clamp(f, 0, 1) * 100 + '%'; },
      meta(html) { U.$('.act-meta', view).innerHTML = html; },
      onCleanup(fn) { cleanups.push(fn); },
      cleanup() { cleanups.forEach((f) => { try { f(); } catch (e) {} }); cleanups = []; },
      record: (n, ok, hinted) => S.record(n, ok, hinted),
      elapsed: () => performance.now() - t0,
      interval(fn, ms) { const h = setInterval(fn, ms); cleanups.push(() => clearInterval(h)); return h; },
      timeout(fn, ms) { const h = setTimeout(fn, ms); cleanups.push(() => clearTimeout(h)); return h; },
      finish(res) {
        if (done) return;
        done = true;
        api.cleanup();
        if (res.timeMs == null) res.timeMs = performance.now() - t0;
        showResult(view, def, opts, ctx, res);
      },
    };
    BB.setCleanup(() => api.cleanup());
    U.$('.act-quit', view).onclick = async () => {
      if (!done && !(await ui.confirm('Leave this activity? Progress in this round won\'t be saved.', 'Leave', 'Keep going'))) return;
      api.cleanup();
      BB.go(ctx.back || '#/');
    };
    def.run(body, opts, api);
    return api;
  };

  function pctOf(res) {
    if (res.pct != null) return res.pct;
    if (!res.total) return 0;
    return U.clamp((res.correct - 0.5 * (res.hinted || 0)) / res.total, 0, 1);
  }

  function showResult(view, def, opts, ctx, res) {
    const pct = pctOf(res);
    const stars = res.failed ? 0 : BB.starsFor(pct);
    let headline, unlocked = null, prevStars = 0, nextStop = null;
    const bestKey = ctx.bestKey || `${def.id}:${opts.poolKey || 'custom'}`;
    const isBest = S.saveBest(bestKey, { pct, timeMs: res.timeMs, score: res.score, total: res.total, label: ctx.label || opts.title || def.title, sub: opts.poolLabel || '' });

    if (ctx.mode === 'path') {
      prevStars = S.setStop(ctx.stopId, stars, pct);
      nextStop = BB.path.next(ctx.stopId);
      if (!prevStars && stars && nextStop) { unlocked = nextStop; BB.path.pendingUnlock = nextStop.id; }
    }
    let dailyNew = false;
    if (ctx.mode === 'daily') dailyNew = S.dailyDone();

    if (res.failed) headline = res.failText || 'Not quite — try again!';
    else headline = ['Keep practicing!', 'Nice work!', 'Great job!', 'Outstanding!'][stars];

    const missed = [...new Set(res.missed || [])].sort((a, b) => a - b);
    view.innerHTML = `<section class="result" ${opts.sec ? `data-sec="${opts.sec}"` : ''}>
      <div class="result-card">
        <div class="result-stars">${[0, 1, 2].map((i) => `<i class="big-star" data-i="${i}">★</i>`).join('')}</div>
        <h2>${headline}</h2>
        <p class="result-sub">${U.esc(ctx.label || opts.title || def.title)}${opts.poolLabel ? ' · ' + U.esc(opts.poolLabel) : ''}</p>
        <div class="result-stats">
          <div><b>${Math.round(pct * 100)}%</b><span>accuracy</span></div>
          ${res.total ? `<div><b>${res.correct}/${res.total}</b><span>${res.unit || 'correct'}</span></div>` : ''}
          ${res.score != null && res.scoreLabel ? `<div><b>${res.score}</b><span>${res.scoreLabel}</span></div>` : ''}
          <div><b>${U.fmtTime(res.timeMs)}</b><span>time</span></div>
          ${res.hinted ? `<div><b>${res.hinted}</b><span>with hints</span></div>` : ''}
        </div>
        ${isBest ? '<div class="badge-best">🏆 New personal best!</div>' : ''}
        ${dailyNew ? `<div class="badge-best">🔥 Daily review done — ${S.streak()}-day streak!</div>` : ''}
        ${unlocked ? `<div class="badge-unlock">🔓 Unlocked: <b>${U.esc(unlocked.title)}</b></div>` : ''}
        ${ctx.mode === 'path' && !stars ? '<p class="muted">Score at least 50% to earn a star and unlock the next stop.</p>' : ''}
        ${missed.length ? `<div class="missed"><h4>To review (${missed.length})</h4><div class="chips">${missed.map((n) => ui.chip(n, { num: true })).join('')}</div>
          <button class="btn ghost retry-missed">↻ Retry just these</button></div>` : ''}
        <div class="result-actions"></div>
      </div>
      <div class="result-details"></div>
    </section>`;
    const det = U.$('.result-details', view);
    if (res.details) { if (typeof res.details === 'string') det.innerHTML = res.details; else det.appendChild(res.details); }
    U.$$('.missed .chip', view).forEach((c) => (c.onclick = () => ui.bookInfo(+c.dataset.n)));

    const acts = U.$('.result-actions', view);
    const btn = (label, cls, fn) => { const b = U.el(`<button class="btn ${cls}">${label}</button>`); b.onclick = fn; acts.appendChild(b); };
    if (ctx.mode === 'path') {
      if (nextStop && S.stop(ctx.stopId).stars > 0) btn(`Next: ${U.esc(nextStop.title)} →`, 'primary', () => BB.go('#/stop/' + nextStop.id));
      btn('↻ Replay', 'ghost', () => BB.router());
      btn('Back to path', S.stop(ctx.stopId).stars ? 'ghost' : 'primary', () => BB.go('#/'));
    } else if (ctx.mode === 'daily') {
      btn('Done', 'primary', () => BB.go('#/'));
      btn('Another round', 'ghost', () => BB.router());
    } else {
      btn('↻ Play again', 'primary', () => (ctx.onAgain ? ctx.onAgain() : BB.router()));
      btn(ctx.backLabel || 'Back', 'ghost', () => BB.go(ctx.back || '#/practice'));
    }
    const rm = U.$('.retry-missed', view);
    if (rm) rm.onclick = () => BB.retryMissed(missed, ctx);

    // star reveal
    const starEls = U.$$('.big-star', view);
    starEls.forEach((s, i) => {
      if (i < stars) setTimeout(() => { s.classList.add('on'); BB.sfx('star'); }, 350 + i * 320);
    });
    setTimeout(() => {
      if (stars === 3 || unlocked) { BB.fx.confetti(stars === 3 ? 90 : 50); BB.sfx(unlocked ? 'unlock' : 'win'); }
    }, 350 + stars * 320);
    window.scrollTo(0, 0);
  }

  BB.retryMissed = function (missed, ctx) {
    const n = Math.min(12, Math.max(4, missed.length * 2));
    BB.run('quiz', {
      books: U.range(1, 73), targets: missed, n, format: 'typed',
      types: ['number', 'after', 'before', 'teaches', 'numberOf'], title: 'Retry missed books', poolKey: 'retry',
    }, { mode: 'practice', back: ctx.mode === 'path' ? '#/' : ctx.back || '#/practice', backLabel: 'Done', label: 'Retry missed books' });
  };

  /* ---------------- Recite sheet ---------------- */
  /**
   * opts: { books:[n], modes:{n:'show'|'input'|'letter'}, strict, live, hints, cols, onEnterLast }
   */
  BB.Sheet = function (container, opts) {
    const hints = opts.hints !== false;
    const el = U.el(`<div class="sheet ${opts.cols ? 'cols' : ''}"></div>`);
    const rows = {};
    opts.books.forEach((n) => {
      const mode = (opts.modes && opts.modes[n]) || 'input';
      const b = BB.book(n);
      let row;
      if (mode === 'show') {
        row = U.el(`<div class="srow show" data-sec="${b.sec}"><span class="snum">${n}</span><span class="sname">${U.esc(b.name)}</span></div>`);
      } else {
        const letter = mode === 'letter' ? `<span class="sletter">${U.esc(BB.match.hint(n).replace('…', ''))}</span>` : '';
        row = U.el(`<div class="srow in ${mode}"><span class="snum">${n}</span><span class="sfield">${letter}<input class="input" autocomplete="off" autocorrect="off" autocapitalize="words" spellcheck="false" aria-label="Book ${n}"></span>${hints && mode !== 'letter' ? '<button type="button" class="hint-mini" title="Reveal first letter" aria-label="Hint">💡</button>' : ''}<span class="sanswer"></span></div>`);
        row.hinted = mode === 'letter';
        const inp = U.$('input', row);
        const hb = U.$('.hint-mini', row);
        if (hb) hb.onclick = () => {
          row.hinted = true;
          hb.textContent = BB.match.hint(n).replace('…', '');
          hb.disabled = true;
          hb.classList.add('used');
          inp.focus();
        };
        inp.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            const all = U.$$('input:not(:disabled)', el);
            const i = all.indexOf(inp);
            if (i >= 0 && i < all.length - 1) all[i + 1].focus();
            else if (opts.onEnterLast) opts.onEnterLast();
          }
        });
        if (opts.live) inp.addEventListener('input', () => {
          const ok = BB.match.check(inp.value, n, opts.strict);
          if (ok && !row.classList.contains('live-ok')) { BB.sfx('tap'); }
          row.classList.toggle('live-ok', ok);
        });
      }
      row.dataset.n = n;
      rows[n] = row;
      el.appendChild(row);
    });
    container.appendChild(el);
    return {
      el, rows,
      focus() { const i = U.$('input', el); if (i) i.focus({ preventScroll: false }); },
      blanks() { return U.$$('input', el).filter((i) => !i.value.trim()).length; },
      inputs() { return U.$$('input', el); },
      grade() {
        const items = [];
        opts.books.forEach((n) => {
          const row = rows[n];
          const inp = U.$('input', row);
          if (!inp) return;
          const given = inp.value.trim();
          const ok = !!given && BB.match.check(given, n, opts.strict);
          items.push({ n, ok, hinted: ok && row.hinted, given });
          inp.disabled = true;
          const hb = U.$('.hint-mini', row);
          if (hb) hb.disabled = true;
          row.classList.remove('live-ok');
          row.classList.add(ok ? 'ok' : 'bad');
          row.setAttribute('data-sec', BB.book(n).sec);
          if (!ok) U.$('.sanswer', row).textContent = BB.book(n).name;
          else if (given.toLowerCase() !== BB.book(n).name.toLowerCase()) U.$('.sanswer', row).textContent = BB.book(n).name;
        });
        const correct = items.filter((i) => i.ok).length;
        const hinted = items.filter((i) => i.hinted).length;
        return { items, correct, hinted, total: items.length };
      },
    };
  };

  /* ---------------- Sequence (multi-part stops) ---------------- */
  BB.def('seq', {
    title: 'Challenge', icon: '🎯', kind: 'hidden',
    run(body, opts, api) {
      const parts = opts.parts;
      const agg = { correct: 0, total: 0, hinted: 0, missed: [], details: document.createElement('div') };
      let i = 0;
      const next = () => {
        if (i >= parts.length) {
          agg.pct = agg.total ? U.clamp((agg.correct - 0.5 * agg.hinted) / agg.total, 0, 1) : 0;
          return api.finish(agg);
        }
        const part = parts[i];
        const pdef = BB.acts[part.id];
        body.innerHTML = '';
        const intro = U.el(`<div class="card center part-intro">
          <div class="part-step">Part ${i + 1} of ${parts.length}</div>
          <div class="part-icon">${part.icon || pdef.icon}</div>
          <h2>${U.esc(part.label || pdef.title)}</h2>
          <p class="muted">${part.blurb || pdef.desc || ''}</p>
          <button class="btn primary big">Start</button></div>`);
        body.appendChild(intro);
        const go = () => {
          body.innerHTML = '';
          const sub = Object.assign({}, api, {
            strict: part.opts && part.opts.strict != null ? part.opts.strict : api.strict,
            finish(res) {
              api.cleanup();
              agg.correct += res.correct || 0;
              agg.total += res.total || 0;
              agg.hinted += res.hinted || 0;
              agg.missed.push(...(res.missed || []));
              if (res.details) {
                const h = U.el(`<div><h3 class="details-h">${U.esc(part.label || pdef.title)}</h3></div>`);
                if (typeof res.details === 'string') h.insertAdjacentHTML('beforeend', res.details); else h.appendChild(res.details);
                agg.details.appendChild(h);
              }
              if (res.failed) {
                agg.failed = true;
                agg.failText = res.failText;
                agg.pct = 0;
                agg.total += parts.slice(i + 1).reduce((s, p) => s + (p.weight || 0), 0);
                return api.finish(agg);
              }
              i++;
              next();
            },
          });
          pdef.run(body, Object.assign({ sec: opts.sec }, part.opts), sub);
        };
        U.$('button', intro).onclick = go;
        api.progress(i / parts.length);
      };
      next();
    },
  });
})();
