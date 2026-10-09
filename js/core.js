/* Seventy-Three — utilities, answer matching, storage, sound, effects, shared UI. */
(function () {
  const BB = window.BB;

  /* ---------------- utilities ---------------- */
  const U = (BB.U = {
    $: (sel, root = document) => root.querySelector(sel),
    $$: (sel, root = document) => Array.from(root.querySelectorAll(sel)),
    el(html) {
      const t = document.createElement('template');
      t.innerHTML = html.trim();
      return t.content.firstElementChild;
    },
    esc: (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]),
    shuffle(arr) {
      const a = arr.slice();
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    },
    pick: (arr) => arr[Math.floor(Math.random() * arr.length)],
    sample: (arr, k) => U.shuffle(arr).slice(0, k),
    range(a, b) {
      const r = [];
      for (let i = a; i <= b; i++) r.push(i);
      return r;
    },
    clamp: (x, a, b) => Math.max(a, Math.min(b, x)),
    fmtTime(ms) {
      const s = Math.max(0, Math.round(ms / 1000));
      return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
    },
    today(d = new Date()) {
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    },
    dayDiff(a, b) {
      return Math.round((new Date(b + 'T12:00') - new Date(a + 'T12:00')) / 86400000);
    },
    // Weighted sample without replacement.
    weightedSample(items, weightFn, k) {
      const pool = items.map((x) => ({ x, w: Math.max(0.01, weightFn(x)) }));
      const out = [];
      while (out.length < k && pool.length) {
        let total = pool.reduce((s, p) => s + p.w, 0);
        let r = Math.random() * total;
        let i = 0;
        for (; i < pool.length - 1; i++) {
          r -= pool[i].w;
          if (r <= 0) break;
        }
        out.push(pool[i].x);
        pool.splice(i, 1);
      }
      return out;
    },
    plural: (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`,
  });

  /* ---------------- answer matching ---------------- */
  const FILLER = new Set(['the', 'book', 'books', 'of', 'gospel', 'according', 'to', 'saint', 'st', 'letter', 'epistle', 'prophet', 'prophecy', 'apostle', 'paul', 'pauls', 's', 'a', 'an']);
  const ORDINALS = { first: '1', '1st': '1', one: '1', i: '1', second: '2', '2nd': '2', two: '2', ii: '2', third: '3', '3rd': '3', three: '3', iii: '3', fourth: '4', '4th': '4', iv: '4' };

  function norm(input) {
    let s = String(input || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    s = s.replace(/[’'`]/g, ' ').replace(/[^a-z0-9 ]+/g, ' ').replace(/\b([1-4])(st|nd|rd|th)\b/g, '$1').replace(/\b([1-4])([a-z])/g, '$1 $2');
    let t = s.split(/\s+/).filter((w) => w && !FILLER.has(w));
    if (t.length > 1 && ORDINALS[t[0]]) t[0] = ORDINALS[t[0]];
    // "Samuel 1" / "Samuel II" → "1 samuel"
    const last = t[t.length - 1];
    if (t.length > 1 && !/^\d$/.test(t[0]) && (/^[1-4]$/.test(last) || ['i', 'ii', 'iii'].includes(last))) {
      t = [ORDINALS[last] || last, ...t.slice(0, -1)];
    }
    return t.join(' ');
  }
  const splitNum = (s) => {
    const m = s.match(/^(\d) (.*)$/);
    return m ? { num: m[1], core: m[2] } : { num: '', core: s };
  };

  // Optimal-string-alignment distance (Levenshtein + adjacent transpositions).
  function osa(a, b) {
    const m = a.length, n = b.length;
    if (Math.abs(m - n) > 3) return 99;
    const d = Array.from({ length: m + 1 }, (_, i) => [i]);
    for (let j = 1; j <= n; j++) d[0][j] = j;
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        const c = a[i - 1] === b[j - 1] ? 0 : 1;
        d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + c);
        if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    }
    return d[m][n];
  }

  const ALIAS = new Map(); // normalized alias -> book number
  const ALIAS_LIST = [];
  BB.BOOKS.forEach((b) => {
    [b.name, b.abbr, ...b.aliases].forEach((a) => {
      const k = norm(a);
      if (!k) return;
      if (ALIAS.has(k) && ALIAS.get(k) !== b.n) {
        console.warn('Ambiguous alias', a);
        return;
      }
      if (!ALIAS.has(k)) {
        ALIAS.set(k, b.n);
        ALIAS_LIST.push({ key: k, n: b.n, ...splitNum(k) });
      }
    });
  });

  const strictNorm = (s) => String(s || '').toLowerCase().replace(/\s+/g, ' ').replace(/\.$/, '').trim();

  BB.match = {
    norm,
    osa,
    /** Return the book number an answer refers to, or 0. */
    identify(input) {
      const k = norm(input);
      if (!k) return 0;
      if (ALIAS.has(k)) return ALIAS.get(k);
      const { num, core } = splitNum(k);
      if (core.length < 3) return 0;
      let best = 99;
      let hits = new Set();
      for (const a of ALIAS_LIST) {
        if (a.num !== num || a.core.length < 4) continue;
        const d = osa(core, a.core);
        const max = a.core.length <= 4 ? 1 : a.core.length <= 7 ? 2 : 3;
        if (d > max) continue;
        if (d < best) { best = d; hits = new Set([a.n]); }
        else if (d === best) hits.add(a.n);
      }
      return hits.size === 1 ? [...hits][0] : 0;
    },
    /** Exact (non-fuzzy) identification, used for auto-accepting as you type. */
    exact(input) {
      const k = norm(input);
      if (!ALIAS.has(k)) return 0;
      // don't auto-accept while it could still be the start of a longer name ("phil" → "philemon")
      for (const a of ALIAS_LIST) if (a.key !== k && a.key.startsWith(k)) return 0;
      return ALIAS.get(k);
    },
    /** Exact alias match ignoring longer names that start the same way. */
    alias(input) {
      return ALIAS.get(norm(input)) || 0;
    },
    strictIdentify(input) {
      const s = strictNorm(input);
      const b = BB.BOOKS.find((b) => strictNorm(b.name) === s || b.strictAlt.some((x) => strictNorm(x) === s));
      return b ? b.n : 0;
    },
    check(input, n, strict) {
      return (strict ? this.strictIdentify(input) : this.identify(input)) === n;
    },
    hint(n) {
      const name = BB.book(n).name;
      const m = name.match(/^(\d )?(.)/);
      return (m[1] || '') + m[2] + '…';
    },
  };

  /* ---------------- storage ---------------- */
  const KEY = 'seventy-three:v1';
  const DEFAULTS = () => ({
    v: 1,
    stops: {},
    books: {},
    mnemonics: {},
    flash: {},
    best: {},
    setup: {},
    daily: { streak: 0, bestStreak: 0, last: null, days: [] },
    settings: { strict: false, sound: true, haptics: true, theme: 'auto' },
    stats: { answers: 0, correct: 0, hinted: 0, since: Date.now() },
    seenWelcome: false,
  });
  let memoryOnly = false;
  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return DEFAULTS();
      const d = JSON.parse(raw);
      const base = DEFAULTS();
      for (const k of Object.keys(base)) if (d[k] === undefined) d[k] = base[k];
      d.settings = Object.assign(base.settings, d.settings);
      d.daily = Object.assign(base.daily, d.daily);
      return d;
    } catch (e) {
      memoryOnly = true;
      return DEFAULTS();
    }
  }

  const S = (BB.store = {
    data: load(),
    save() {
      try { localStorage.setItem(KEY, JSON.stringify(S.data)); } catch (e) { memoryOnly = true; }
    },
    get memoryOnly() { return memoryOnly; },
    get settings() { return S.data.settings; },
    set(k, v) { S.data.settings[k] = v; S.save(); },
    record(n, ok, hinted) {
      if (!n) return;
      const b = (S.data.books[n] = S.data.books[n] || { r: 0, w: 0, h: 0, box: 0, last: 0 });
      if (ok && !hinted) { b.r++; b.box = Math.min(5, b.box + 1); }
      else if (ok) { b.h++; }
      else { b.w++; b.box = Math.max(0, b.box - 2); }
      b.last = Date.now();
      S.data.stats.answers++;
      if (ok) S.data.stats.correct++;
      if (ok && hinted) S.data.stats.hinted++;
      S.save();
    },
    bookStats: (n) => S.data.books[n] || { r: 0, w: 0, h: 0, box: 0, last: 0 },
    mastery: (n) => (S.data.books[n] ? S.data.books[n].box / 5 : 0),
    /** Higher = weaker = should be asked more often. */
    weight(n) {
      const b = S.data.books[n];
      if (!b) return 3;
      const attempts = b.r + b.w + b.h;
      const err = attempts ? (b.w + 0.5 * b.h) / attempts : 0.5;
      const staleDays = (Date.now() - b.last) / 86400000;
      return 1 + (5 - b.box) * 0.8 + err * 4 + Math.min(2, staleDays / 3);
    },
    weakest(pool, k) {
      return pool.slice().sort((a, b) => S.weight(b) - S.weight(a) || Math.random() - 0.5).slice(0, k);
    },
    stop: (id) => S.data.stops[id] || { stars: 0, best: 0, plays: 0 },
    setStop(id, stars, pct) {
      const s = (S.data.stops[id] = S.data.stops[id] || { stars: 0, best: 0, plays: 0 });
      const prev = s.stars;
      s.stars = Math.max(s.stars, stars);
      s.best = Math.max(s.best, pct);
      s.plays++;
      S.save();
      return prev;
    },
    totalStars: () => Object.values(S.data.stops).reduce((s, x) => s + (x.stars || 0), 0),
    saveBest(key, rec) {
      const cur = S.data.best[key];
      const better = !cur || rec.pct > cur.pct + 1e-9 || (Math.abs(rec.pct - cur.pct) < 1e-9 && rec.timeMs && (!cur.timeMs || rec.timeMs < cur.timeMs)) || (rec.score != null && cur.score != null && rec.score > cur.score);
      if (better) {
        S.data.best[key] = Object.assign({ date: U.today(), plays: (cur ? cur.plays : 0) + 1 }, rec);
      } else {
        cur.plays = (cur.plays || 0) + 1;
      }
      S.save();
      return better && !!cur;
    },
    dailyDone() {
      const d = S.data.daily, t = U.today();
      if (d.last === t) return false;
      d.streak = d.last && U.dayDiff(d.last, t) === 1 ? d.streak + 1 : 1;
      d.bestStreak = Math.max(d.bestStreak, d.streak);
      d.last = t;
      d.days = [...(d.days || []), t].slice(-60);
      S.save();
      return true;
    },
    streak() {
      const d = S.data.daily;
      if (!d.last) return 0;
      const gap = U.dayDiff(d.last, U.today());
      return gap <= 1 ? d.streak : 0;
    },
    mnemonic: (key) => S.data.mnemonics[key] || '',
    setMnemonic(key, text) {
      if (text && text.trim()) S.data.mnemonics[key] = text.trim();
      else delete S.data.mnemonics[key];
      S.save();
    },
    reset() { S.data = DEFAULTS(); S.save(); },
    export: () => JSON.stringify(S.data, null, 2),
    import(json) {
      const d = JSON.parse(json);
      if (!d || typeof d !== 'object' || !d.v) throw new Error('Not a Seventy-Three backup file');
      localStorage.setItem(KEY, JSON.stringify(d));
      S.data = load();
    },
  });

  /* ---------------- sound & haptics ---------------- */
  let actx = null;
  function tone(freq, start, dur, type = 'sine', vol = 0.12) {
    const o = actx.createOscillator(), g = actx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, actx.currentTime + start);
    g.gain.setValueAtTime(0, actx.currentTime + start);
    g.gain.linearRampToValueAtTime(vol, actx.currentTime + start + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, actx.currentTime + start + dur);
    o.connect(g).connect(actx.destination);
    o.start(actx.currentTime + start);
    o.stop(actx.currentTime + start + dur + 0.05);
  }
  BB.sfx = function (kind) {
    const st = S.settings;
    if (st.haptics && navigator.vibrate) {
      const pat = { good: 12, bad: [30, 40, 30], star: 15, unlock: [20, 30, 20, 30, 40], win: [20, 40, 60] }[kind];
      if (pat) try { navigator.vibrate(pat); } catch (e) {}
    }
    if (!st.sound) return;
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      if (actx.state === 'suspended') actx.resume();
      switch (kind) {
        case 'good': tone(660, 0, 0.12, 'triangle'); tone(990, 0.08, 0.18, 'triangle'); break;
        case 'bad': tone(180, 0, 0.22, 'sawtooth', 0.06); tone(140, 0.1, 0.25, 'sawtooth', 0.05); break;
        case 'tap': tone(520, 0, 0.05, 'sine', 0.05); break;
        case 'star': tone(1175, 0, 0.18, 'triangle', 0.1); tone(1568, 0.06, 0.25, 'sine', 0.07); break;
        case 'unlock': [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.09, 0.3, 'triangle', 0.1)); break;
        case 'win': [523, 659, 784, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.1, 0.35, 'triangle', 0.1)); break;
        case 'flip': tone(380, 0, 0.06, 'sine', 0.04); break;
      }
    } catch (e) {}
  };

  /* ---------------- visual effects ---------------- */
  const SEC_COLORS = () => BB.SECTIONS.map((s) => getComputedStyle(document.documentElement).getPropertyValue('--c-' + s.id).trim() || '#888');
  BB.fx = {
    confetti(count = 70, origin) {
      if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      const colors = SEC_COLORS();
      const layer = document.createElement('div');
      layer.className = 'fx-layer';
      document.body.appendChild(layer);
      const ox = origin ? origin.x : innerWidth / 2, oy = origin ? origin.y : innerHeight * 0.35;
      for (let i = 0; i < count; i++) {
        const p = document.createElement('i');
        p.style.background = U.pick(colors);
        p.style.left = ox + 'px';
        p.style.top = oy + 'px';
        if (Math.random() < 0.4) p.style.borderRadius = '50%';
        layer.appendChild(p);
        const ang = Math.random() * Math.PI * 2, v = 120 + Math.random() * 260;
        const dx = Math.cos(ang) * v, dy = Math.sin(ang) * v - 180;
        p.animate(
          [
            { transform: 'translate(0,0) rotate(0)', opacity: 1 },
            { transform: `translate(${dx}px, ${dy + 420}px) rotate(${Math.random() * 720}deg)`, opacity: 0 },
          ],
          { duration: 1100 + Math.random() * 700, easing: 'cubic-bezier(.2,.7,.4,1)', fill: 'forwards' }
        );
      }
      setTimeout(() => layer.remove(), 2000);
    },
    pop(el) {
      if (!el || !el.animate) return;
      el.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.08)' }, { transform: 'scale(1)' }], { duration: 260, easing: 'ease-out', composite: 'add' });
    },
    shake(el) {
      if (!el || !el.animate) return;
      el.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-7px)' }, { transform: 'translateX(7px)' }, { transform: 'translateX(-4px)' }, { transform: 'translateX(0)' }], { duration: 320, composite: 'add' });
    },
    burst(el) {
      if (!el || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      const r = el.getBoundingClientRect();
      const layer = document.createElement('div');
      layer.className = 'fx-layer';
      document.body.appendChild(layer);
      for (let i = 0; i < 12; i++) {
        const p = document.createElement('i');
        p.className = 'spark';
        p.style.left = r.left + r.width / 2 + 'px';
        p.style.top = r.top + r.height / 2 + 'px';
        layer.appendChild(p);
        const a = (i / 12) * Math.PI * 2, d = 40 + Math.random() * 30;
        p.animate([{ transform: 'translate(0,0) scale(1)', opacity: 1 }, { transform: `translate(${Math.cos(a) * d}px, ${Math.sin(a) * d}px) scale(.2)`, opacity: 0 }], { duration: 520, easing: 'ease-out', fill: 'forwards' });
      }
      setTimeout(() => layer.remove(), 700);
    },
  };

  /* ---------------- shared UI ---------------- */
  const ui = (BB.ui = {
    secAttr: (n) => `data-sec="${BB.book(n).sec}"`,
    chip(n, o = {}) {
      const b = BB.book(n);
      const plain = o.plain ? ' plain' : '';
      const num = o.num ? `<span class="chip-num">${n}</span>` : '';
      const dc = o.dc && b.deutero ? '<span class="dc" title="Deuterocanonical">DC</span>' : '';
      return `<span class="chip${plain}${o.cls ? ' ' + o.cls : ''}" data-sec="${b.sec}" data-n="${n}">${num}${U.esc(o.abbr ? b.abbr : b.name)}${dc}</span>`;
    },
    secChip(id, label) {
      const s = BB.sec(id);
      return `<span class="chip" data-sec="${id}">${U.esc(label || s.name)}</span>`;
    },
    stars(k, max = 3) {
      let h = '<span class="stars" aria-label="' + k + ' of ' + max + ' stars">';
      for (let i = 0; i < max; i++) h += `<i class="${i < k ? 'on' : ''}">★</i>`;
      return h + '</span>';
    },
    toast(msg, kind = '') {
      let wrap = U.$('#toasts');
      const t = U.el(`<div class="toast ${kind}">${msg}</div>`);
      wrap.appendChild(t);
      setTimeout(() => t.classList.add('out'), 2200);
      setTimeout(() => t.remove(), 2600);
    },
    modal({ title = '', body = '', actions = [], wide = false, onClose, locked = false }) {
      const m = U.el(`<div class="modal-back${locked ? ' locked' : ''}"><div class="modal ${wide ? 'wide' : ''}" role="dialog" aria-modal="true" aria-label="${U.esc(title)}">
        <div class="modal-head"><h3>${title}</h3>${locked ? '' : '<button class="icon-btn" data-close aria-label="Close">✕</button>'}</div>
        <div class="modal-body"></div><div class="modal-actions"></div></div></div>`);
      const bodyEl = U.$('.modal-body', m);
      if (typeof body === 'string') bodyEl.innerHTML = body;
      else bodyEl.appendChild(body);
      const acts = U.$('.modal-actions', m);
      if (!actions.length) acts.remove();
      const close = () => {
        m.classList.add('out');
        setTimeout(() => { m.remove(); ui.scrollLock(); }, 180);
        document.removeEventListener('keydown', onKey);
        onClose && onClose();
      };
      actions.forEach((a) => {
        const b = U.el(`<button class="btn ${a.cls || ''}">${a.label}</button>`);
        b.onclick = () => { if (a.onClick && a.onClick() === false) return; close(); };
        acts.appendChild(b);
      });
      const onKey = (e) => { if (e.key === 'Escape' && !locked) close(); };
      document.addEventListener('keydown', onKey);
      m.addEventListener('click', (e) => { if (!locked && (e.target === m || e.target.closest('[data-close]'))) close(); });
      document.body.appendChild(m);
      ui.scrollLock();
      const f = U.$('input, textarea, .btn.primary', m);
      if (f) setTimeout(() => f.focus(), 50);
      return { el: m, body: bodyEl, close };
    },
    /**
     * Freeze the page behind open popups. Uses position:fixed on <body> (not just overflow:hidden)
     * so it also holds on iOS Safari; the scroll position is restored when the last popup closes.
     */
    scrollLock() {
      const b = document.body;
      const open = !!document.querySelector('.modal-back:not(.out)');
      if (open && !b.classList.contains('scroll-locked')) {
        b.dataset.lockY = window.scrollY;
        b.style.top = `-${window.scrollY}px`;
        b.classList.add('scroll-locked');
      } else if (!open && b.classList.contains('scroll-locked')) {
        const y = +b.dataset.lockY || 0;
        b.classList.remove('scroll-locked');
        b.style.top = '';
        window.scrollTo(0, y);
      }
    },
    confirm(msg, okLabel = 'Yes', cancelLabel = 'Cancel') {
      return new Promise((res) => {
        let answered = false;
        ui.modal({
          title: msg,
          body: '',
          actions: [
            { label: cancelLabel, cls: 'ghost', onClick: () => { answered = true; res(false); } },
            { label: okLabel, cls: 'primary', onClick: () => { answered = true; res(true); } },
          ],
          onClose: () => { if (!answered) res(false); },
        });
      });
    },
    /** Show a book's details in a modal. */
    bookInfo(n) {
      const b = BB.book(n), s = BB.sec(b.sec), era = BB.eraOf(n), st = BB.store.bookStats(n);
      const tries = st.r + st.w + st.h;
      ui.modal({
        title: `<span class="num-badge" data-sec="${b.sec}">${n}</span> ${U.esc(b.name)}`,
        body: `<div class="info-tags">${ui.secChip(b.sec)} <span class="tag">${b.testament === 'OT' ? 'Old Testament' : 'New Testament'}</span> <span class="tag">Abbr. ${U.esc(b.abbr)}</span>${b.deutero ? ' <span class="tag dc-tag">Deuterocanonical</span>' : ''}</div>
          <p class="info-tagline">${U.esc(b.tag)}</p><p>${U.esc(b.summary)}</p>
          <p class="muted small">Story era: <a href="#/timeline?book=${n}">${U.esc(era.title)}</a> (${U.esc(era.dates)})</p>
          ${tries ? `<p class="muted small">Your record: ${st.r} right · ${st.h} with hint · ${st.w} missed · mastery ${Math.round(BB.store.mastery(n) * 100)}%</p>` : ''}`,
      });
    },
    /**
     * A typed answer box with optional first-letter hint.
     * opts: { book, placeholder, onSubmit({text, hinted}), hint: true, numeric }
     */
    typed(opts) {
      const wrap = U.el(`<form class="typed" autocomplete="off">
        <input class="input" type="${opts.numeric ? 'number' : 'text'}" inputmode="${opts.numeric ? 'numeric' : 'text'}" autocomplete="off" autocorrect="off" autocapitalize="words" spellcheck="false" placeholder="${U.esc(opts.placeholder || 'Type the book name…')}" aria-label="Your answer">
        ${opts.hint !== false ? '<button type="button" class="btn ghost hint-btn" title="Reveal first letter">💡 Hint</button>' : ''}
        <button type="submit" class="btn primary">Check</button>
      </form>`);
      const input = U.$('input', wrap);
      let hinted = false;
      const hb = U.$('.hint-btn', wrap);
      if (hb) hb.onclick = () => {
        hinted = true;
        const h = opts.hintText ? opts.hintText() : BB.match.hint(opts.book);
        hb.textContent = '💡 ' + h;
        hb.disabled = true;
        if (!opts.numeric && !opts.hintText) {
          const pre = h.replace('…', '');
          if (!input.value) input.value = pre;
        }
        input.focus();
      };
      wrap.addEventListener('submit', (e) => {
        e.preventDefault();
        if (!input.value.trim()) { BB.fx.shake(input); return; }
        opts.onSubmit({ text: input.value, hinted });
      });
      wrap.input = input;
      wrap.lock = () => U.$$('input,button', wrap).forEach((x) => (x.disabled = true));
      setTimeout(() => input.focus({ preventScroll: true }), 30);
      return wrap;
    },
  });

  /* ---------------- pools (which books an activity covers) ---------------- */
  BB.pools = {
    learnedTo() {
      // furthest book whose path lesson has been completed (at least Pentateuch)
      let to = 5;
      BB.STAGES.forEach((s) => { if (S.stop(s.id + '-lesson').stars > 0) to = Math.max(to, s.to); });
      return to;
    },
    options() {
      const learned = this.learnedTo();
      return [
        { group: 'Whole Bible', items: [['all', 'All 73 books'], ['ot', 'Old Testament (1–46)'], ['nt', 'New Testament (47–73)'], ['learned', `Learned so far (1–${learned})`]] },
        { group: 'Sections', items: BB.SECTIONS.map((s) => ['sec:' + s.id, `${s.name} (${s.from === s.to ? s.from : s.from + '–' + s.to})`]) },
        { group: 'Path chunks', items: BB.STAGES.map((s) => ['stage:' + s.id, `${s.title} (${s.from}–${s.to})`]) },
      ];
    },
    resolve(key) {
      let from = 1, to = 73, label = 'All 73 books';
      if (key === 'ot') { to = 46; label = 'Old Testament'; }
      else if (key === 'nt') { from = 47; label = 'New Testament'; }
      else if (key === 'learned') { to = this.learnedTo(); label = 'Learned so far'; }
      else if (key && key.startsWith('sec:')) { const s = BB.sec(key.slice(4)); from = s.from; to = s.to; label = s.name; }
      else if (key && key.startsWith('stage:')) { const s = BB.STAGE_MAP[key.slice(6)]; from = s.from; to = s.to; label = s.title; }
      else if (key && key.startsWith('range:')) { [from, to] = key.slice(6).split('-').map(Number); label = `Books ${from}–${to}`; }
      return { key, from, to, label, books: U.range(from, to) };
    },
    select(value, name = 'pool') {
      return `<select class="input" name="${name}">${this.options().map((g) => `<optgroup label="${g.group}">${g.items.map(([v, l]) => `<option value="${v}"${v === value ? ' selected' : ''}>${U.esc(l)}</option>`).join('')}</optgroup>`).join('')}</select>`;
    },
  };

  /** Redact a book's own name (and aliases) from its summary for "which book is this?" prompts. */
  BB.redact = function (n, text) {
    const b = BB.book(n);
    let t = text || b.summary;
    const core = b.name.replace(/^\d /, '').split(' ')[0];
    const words = [core.length > 6 ? core.slice(0, 6) : core, ...b.aliases.filter((a) => a.length >= 5)];
    words.forEach((w) => {
      const re = new RegExp('\\b' + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + "\\w*('s)?", 'gi');
      t = t.replace(re, '____');
    });
    return t;
  };

  BB.starsFor = (pct) => (pct >= 0.9 ? 3 : pct >= 0.7 ? 2 : pct >= 0.5 ? 1 : 0);
})();
