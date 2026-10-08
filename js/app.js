/* Seventy-Three — app shell and router. */
(function () {
  const BB = window.BB, U = BB.U, S = BB.store;

  BB.applyTheme = function () {
    const t = S.settings.theme;
    if (t === 'light' || t === 'dark') document.documentElement.setAttribute('data-theme', t);
    else document.documentElement.removeAttribute('data-theme');
  };

  BB.updateHeader = function () {
    U.$('#hdr-stars').textContent = S.totalStars();
    U.$('#hdr-streak').textContent = S.streak();
  };

  BB.router = function () {
    BB.setCleanup(null);
    U.$$('.modal-back').forEach((m) => m.remove());
    document.body.classList.remove('in-activity');
    const view = U.$('#view');
    const raw = (location.hash || '#/').slice(1);
    const [path] = raw.split('?');
    const parts = path.split('/').filter(Boolean);
    const tab = parts[0] || 'path';
    U.$$('[data-tab]').forEach((a) => a.classList.toggle('active', a.dataset.tab === (tab === 'stop' ? 'path' : tab)));
    BB.updateHeader();
    window.scrollTo(0, 0);
    const P = BB.pages;
    switch (tab) {
      case 'path': return P.path(view);
      case 'stop': return BB.path.runStop(parts[1]);
      case 'practice': return parts[1] ? P.setup(view, parts[1]) : P.practice(view);
      case 'daily': return BB.run('daily', {}, { mode: 'daily', back: '#/', bestKey: 'daily:review' });
      case 'books': return P.books(view);
      case 'timeline': return P.timeline(view);
      case 'mnemonics': return P.mnemonics(view);
      case 'progress': return P.progress(view);
      default: location.hash = '#/';
    }
  };

  BB.applyTheme();
  U.$('#settings-btn').onclick = BB.openSettings;
  window.addEventListener('hashchange', BB.router);
  BB.router();

  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol) && !/localhost|127\.0\.0\.1/.test(location.hostname)) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
})();
