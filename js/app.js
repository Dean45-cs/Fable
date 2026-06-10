/* ============================================================
   IchApp – App-Shell: Navigation, Header, Routing
   ============================================================ */

const App = (() => {

  let currentView = 'dashboard';

  function go(view) {
    if (!Views[view]) view = 'dashboard';
    currentView = view;
    if (location.hash !== '#' + view) {
      // Hash setzen ohne Scroll-Sprung
      history.replaceState(null, '', '#' + view);
    }
    refresh();
    window.scrollTo({ top: 0 });
  }

  /** Aktuelle View + Header neu rendern (nach jeder Datenänderung aufrufen) */
  function refresh() {
    const v = Views[currentView];
    document.getElementById('viewTitle').textContent = v.title;
    document.getElementById('topbarDate').textContent = U.fmtDateLong();

    // Navigation markieren
    document.querySelectorAll('.nav-item').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.view === currentView);
    });

    // Level-Badge
    const lvl = Store.level();
    document.getElementById('levelRing').innerHTML =
      Charts.ring(lvl.pct, { size: 38, stroke: 4, label: String(lvl.lvl) });
    document.getElementById('levelName').textContent = `Lv. ${lvl.lvl} · ${lvl.name}`;
    document.getElementById('levelXp').textContent = `${U.fmtNum(lvl.xp, 0)} XP`;

    // View rendern
    const content = document.getElementById('content');
    v.render(content);
  }

  function init() {
    // Navigation
    document.getElementById('sidebar').addEventListener('click', e => {
      const btn = e.target.closest('.nav-item');
      if (btn) go(btn.dataset.view);
    });

    // Hash-Routing (Vor/Zurück im Browser)
    window.addEventListener('hashchange', () => {
      const view = location.hash.slice(1);
      if (view && view !== currentView) go(view);
    });

    // Modal schließen: X, Backdrop-Klick, ESC
    document.getElementById('modalClose').onclick = UI.closeModal;
    document.getElementById('modalBackdrop').addEventListener('mousedown', e => {
      if (e.target === e.currentTarget) UI.closeModal();
    });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && !document.getElementById('modalBackdrop').hidden) UI.closeModal();
    });

    // Startansicht (aus URL-Hash oder Dashboard)
    const initial = location.hash.slice(1);
    go(Views[initial] ? initial : 'dashboard');
  }

  document.addEventListener('DOMContentLoaded', init);

  return { go, refresh };
})();
