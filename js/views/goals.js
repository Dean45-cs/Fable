/* ============================================================
   IchApp – Ziele
   Kurz- & langfristige Ziele mit messbarem Fortschritt.
   ============================================================ */

window.Views = window.Views || {};

Views.goals = (() => {

  const CATEGORIES = ['Fitness', 'Finanzen', 'Ausbildung', 'Persönlich', 'Sonstiges'];
  const CAT_COLORS = { Fitness: 'green', Finanzen: 'blue', Ausbildung: 'orange', 'Persönlich': '', Sonstiges: 'gray' };

  function render(c) {
    const s = Store.get();
    const open = s.goals.filter(g => !g.done);
    const done = s.goals.filter(g => g.done);

    const shortGoals = open.filter(g => g.type === 'short');
    const longGoals = open.filter(g => g.type === 'long');

    c.innerHTML = `
      <div class="grid grid-3">
        <div class="card"><div class="stat">
          <span class="stat-label">Offene Ziele</span>
          <span class="stat-value">${open.length}</span>
        </div></div>
        <div class="card"><div class="stat">
          <span class="stat-label">Erreichte Ziele</span>
          <span class="stat-value" style="color:var(--green)">${done.length}</span>
        </div></div>
        <div class="card"><div class="stat">
          <span class="stat-label">Erfolgsquote</span>
          <span class="stat-value">${s.goals.length ? Math.round(done.length / s.goals.length * 100) + '%' : '–'}</span>
        </div></div>
      </div>

      <div class="quick-actions">
        <button class="btn primary" id="addGoal">🎯 Neues Ziel</button>
      </div>

      <div class="grid grid-2 section-gap">
        <div class="card">
          <h3 class="card-title">⚡ Kurzfristig</h3>
          <div class="list" id="shortList">
            ${shortGoals.length ? shortGoals.map(goalCard).join('') : `<div class="empty"><span class="empty-icon">⚡</span>Was willst du diesen Monat schaffen?</div>`}
          </div>
        </div>
        <div class="card">
          <h3 class="card-title">🏔️ Langfristig</h3>
          <div class="list" id="longList">
            ${longGoals.length ? longGoals.map(goalCard).join('') : `<div class="empty"><span class="empty-icon">🏔️</span>Wo willst du in 1–5 Jahren stehen?</div>`}
          </div>
        </div>
      </div>

      ${done.length ? `
      <div class="card section-gap">
        <h3 class="card-title">🏆 Erreicht</h3>
        <div class="list">
          ${U.sortByDateDesc(done, 'doneAt').map(g => `
            <div class="list-item" style="opacity:.75">
              <span style="font-size:18px">✅</span>
              <div class="li-main">
                <div class="li-title">${U.esc(g.title)}</div>
                <div class="li-sub">${g.doneAt ? 'Erreicht am ' + U.fmtDate(g.doneAt, true) : ''}</div>
              </div>
              <div class="li-actions"><button class="icon-btn danger" data-del="${g.id}" title="Löschen">🗑</button></div>
            </div>`).join('')}
        </div>
      </div>` : ''}
    `;

    c.querySelector('#addGoal').onclick = () => openGoalModal();

    c.querySelectorAll('[data-progress]').forEach(b => b.onclick = () => {
      const g = Store.get().goals.find(x => x.id === b.dataset.progress);
      if (g) openProgressModal(g);
    });
    c.querySelectorAll('[data-edit]').forEach(b => b.onclick = () => {
      const g = Store.get().goals.find(x => x.id === b.dataset.edit);
      if (g) openGoalModal(g);
    });
    c.querySelectorAll('[data-done]').forEach(b => b.onclick = () => {
      Store.update(st => {
        const g = st.goals.find(x => x.id === b.dataset.done);
        if (g) { g.done = true; g.doneAt = U.todayStr(); g.current = g.target; }
      });
      UI.reward('ZIEL ERREICHT! Du bist eine Maschine! 🏆', 150);
      App.refresh();
    });
    c.querySelectorAll('[data-del]').forEach(b => b.onclick = () => {
      UI.confirmDlg('Dieses Ziel wirklich löschen?', () => {
        Store.update(st => st.goals = st.goals.filter(x => x.id !== b.dataset.del));
        App.refresh();
      });
    });
  }

  function goalCard(g) {
    const pct = Views.dashboard.goalPct(g);
    let deadlineHtml = '';
    if (g.deadline) {
      const days = U.daysBetween(U.todayStr(), g.deadline);
      const cls = days < 0 ? 'red' : days <= 7 ? 'orange' : 'gray';
      const txt = days < 0 ? `${-days} Tage drüber` : days === 0 ? 'Heute fällig!' : `noch ${days} Tage`;
      deadlineHtml = `<span class="pill ${cls}">⏳ ${txt}</span>`;
    }
    const progressTxt = g.unit === '%'
      ? `${Math.round(pct * 100)}%`
      : `${U.fmtNum(g.current || 0)} / ${U.fmtNum(g.target)} ${U.esc(g.unit || '')}`;

    return `
      <div class="list-item goal-card" style="flex-direction:column;align-items:stretch;gap:8px">
        <div class="goal-head">
          <div>
            <div class="goal-title">${U.esc(g.title)}</div>
            <div class="goal-meta">
              <span class="pill ${CAT_COLORS[g.category] || ''}">${U.esc(g.category || 'Sonstiges')}</span>
              ${deadlineHtml}
            </div>
          </div>
          <span class="goal-pct">${Math.round(pct * 100)}%</span>
        </div>
        <div>
          <div class="bar mt-0"><i class="${pct >= 1 ? 'green' : ''}" style="width:${(pct * 100).toFixed(0)}%"></i></div>
          <div class="muted" style="margin-top:4px">${progressTxt}</div>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button class="btn small primary" data-progress="${g.id}">+ Fortschritt</button>
          <button class="btn small" data-done="${g.id}">✅ Erreicht</button>
          <span class="spacer"></span>
          <button class="icon-btn" data-edit="${g.id}" title="Bearbeiten">✏️</button>
          <button class="icon-btn danger" data-del="${g.id}" title="Löschen">🗑</button>
        </div>
      </div>`;
  }

  function openGoalModal(existing) {
    const g = existing || null;
    UI.openModal(g ? 'Ziel bearbeiten' : 'Neues Ziel', `
      <form>
        ${UI.field('Was willst du erreichen?', UI.textInput('gTitle', g ? g.title : '', 'z. B. 80 kg Bankdrücken / 1.000 € sparen'))}
        <div class="form-row">
          ${UI.field('Zeithorizont', UI.select('gType', [{ value: 'short', label: '⚡ Kurzfristig (Wochen/Monate)' }, { value: 'long', label: '🏔️ Langfristig (Jahre)' }], g ? g.type : 'short'))}
          ${UI.field('Kategorie', UI.select('gCat', CATEGORIES, g ? g.category : 'Persönlich'))}
        </div>
        ${UI.field('Deadline (optional)', `<input type="date" id="gDeadline" value="${g && g.deadline ? g.deadline : ''}">`)}
        <div class="form-row">
          ${UI.field('Zielwert', UI.numInput('gTarget', g ? g.target : 100, 'z. B. 1000'))}
          ${UI.field('Einheit', UI.textInput('gUnit', g ? g.unit : '%', 'z. B. €, kg, Seiten'))}
          ${UI.field('Aktueller Stand', UI.numInput('gCurrent', g ? g.current : 0, '0'))}
        </div>
        <p class="muted" style="margin-top:0">Tipp: Mach dein Ziel messbar – „1.000 €" statt „mehr sparen".</p>
        ${UI.formActions(g ? 'Speichern' : 'Ziel anlegen')}
      </form>
    `, body => {
      UI.bindForm(body, b => {
        const title = UI.val(b, 'gTitle');
        if (!title) { UI.toast('⚠️ Gib deinem Ziel einen Namen'); return; }
        const target = UI.numVal(b, 'gTarget');
        const data = {
          id: g ? g.id : U.uid(),
          title,
          type: UI.val(b, 'gType'),
          category: UI.val(b, 'gCat'),
          deadline: UI.val(b, 'gDeadline') || null,
          target: isNaN(target) || target <= 0 ? 100 : target,
          unit: UI.val(b, 'gUnit') || '%',
          current: UI.numVal(b, 'gCurrent') || 0,
          done: g ? g.done : false,
          doneAt: g ? g.doneAt : null,
          createdAt: g ? g.createdAt : U.todayStr()
        };
        Store.update(st => {
          if (g) st.goals = st.goals.map(x => x.id === g.id ? data : x);
          else st.goals.push(data);
        });
        UI.closeModal();
        UI.toast(g ? '✅ Ziel aktualisiert' : '🎯 Ziel angelegt – pack es an!', 'success');
        App.refresh();
      });
    });
  }

  function openProgressModal(g) {
    UI.openModal('Fortschritt: ' + g.title, `
      <form>
        ${UI.field(`Aktueller Stand (${U.esc(g.unit || '%')}) – Ziel: ${U.fmtNum(g.target)}`, UI.numInput('pCurrent', g.current || 0, ''))}
        ${UI.formActions('Aktualisieren')}
      </form>
    `, body => {
      UI.bindForm(body, b => {
        const cur = UI.numVal(b, 'pCurrent');
        if (isNaN(cur)) { UI.toast('⚠️ Bitte Zahl eingeben'); return; }
        let reached = false;
        Store.update(st => {
          const goal = st.goals.find(x => x.id === g.id);
          if (goal) {
            goal.current = cur;
            if (cur >= goal.target) { goal.done = true; goal.doneAt = U.todayStr(); reached = true; }
          }
        });
        UI.closeModal();
        if (reached) UI.reward('ZIEL ERREICHT! Weiter so! 🏆', 150);
        else UI.toast('📈 Fortschritt gespeichert', 'success');
        App.refresh();
      });
    });
  }

  return { title: 'Ziele', render, openGoalModal };
})();
