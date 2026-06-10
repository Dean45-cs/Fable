/* ============================================================
   IchApp – Habits
   Täglich abhaken, Streaks aufbauen, durchziehen.
   ============================================================ */

window.Views = window.Views || {};

Views.habits = (() => {

  const SUGGESTIONS = [
    { icon: '🏋️', name: 'Training' },
    { icon: '💧', name: '3l Wasser trinken' },
    { icon: '📖', name: '10 Seiten lesen' },
    { icon: '🚶', name: '10.000 Schritte' },
    { icon: '📵', name: 'Kein Handy nach 23 Uhr' },
    { icon: '🥗', name: 'Gesund essen' },
    { icon: '📓', name: 'Tagebuch schreiben' },
    { icon: '🇬🇧', name: 'Englisch lernen' }
  ];

  function render(c) {
    const s = Store.get();
    const today = U.todayStr();
    const doneToday = s.habits.filter(h => h.log[today]).length;
    const bestStreak = Math.max(0, ...s.habits.map(maxStreak));
    const last7 = U.lastNDays(7);

    // Gesamt-Heatmap: Anteil erledigter Habits pro Tag
    const intensity = d => {
      if (!s.habits.length) return 0;
      const active = s.habits.filter(h => !h.createdAt || h.createdAt <= d);
      if (!active.length) return 0;
      const done = active.filter(h => h.log[d]).length;
      if (!done) return 0;
      const frac = done / active.length;
      return frac >= 1 ? 3 : frac >= 0.5 ? 2 : 1;
    };

    c.innerHTML = `
      <div class="grid grid-3">
        <div class="card"><div class="stat">
          <span class="stat-label">Heute erledigt</span>
          <span class="stat-value">${doneToday} <small>/ ${s.habits.length}</small></span>
          <div class="bar"><i class="${doneToday === s.habits.length && s.habits.length ? 'green' : ''}" style="width:${s.habits.length ? (doneToday / s.habits.length * 100).toFixed(0) : 0}%"></i></div>
        </div></div>
        <div class="card"><div class="stat">
          <span class="stat-label">Längster Streak</span>
          <span class="stat-value">🔥 ${bestStreak} <small>Tage</small></span>
        </div></div>
        <div class="card"><div class="stat">
          <span class="stat-label">Aktive Habits</span>
          <span class="stat-value">${s.habits.length}</span>
        </div></div>
      </div>

      <div class="quick-actions">
        <button class="btn primary" id="addHabit">🔁 Neue Gewohnheit</button>
      </div>

      <div class="card section-gap">
        <h3 class="card-title">✅ Deine Habits <span class="muted">Letzte 7 Tage</span></h3>
        <div class="list">
          ${s.habits.length ? s.habits.map(h => {
            const streak = Store.habitStreak(h);
            const week = last7.map(d => {
              const done = !!h.log[d];
              const isToday = d === today;
              return `<button class="habit-check ${done ? 'done' : ''}" style="width:22px;height:22px;font-size:11px;border-radius:7px;${isToday ? '' : 'opacity:.8'}"
                data-habit="${h.id}" data-date="${d}" title="${U.fmtDate(d)}">✓</button>`;
            }).join('');
            return `
              <div class="habit-row">
                <button class="habit-check ${h.log[today] ? 'done' : ''}" data-habit="${h.id}" data-date="${today}" aria-label="Heute abhaken">✓</button>
                <span class="habit-name ${h.log[today] ? 'done' : ''}">${U.esc(h.icon || '')} ${U.esc(h.name)}</span>
                ${streak > 0 ? `<span class="streak-flame">🔥 ${streak}</span>` : '<span class="muted" style="font-size:12px">Starte heute!</span>'}
                <div style="display:flex;gap:4px;margin-left:8px">${week}</div>
                <div class="li-actions" style="opacity:1">
                  <button class="icon-btn" data-edit="${h.id}" title="Umbenennen">✏️</button>
                  <button class="icon-btn danger" data-del="${h.id}" title="Löschen">🗑</button>
                </div>
              </div>`;
          }).join('') : `<div class="empty"><span class="empty-icon">🔁</span>Gewohnheiten machen den Unterschied. Leg deine erste an!</div>`}
        </div>
      </div>

      <div class="card section-gap">
        <h3 class="card-title">🗓️ Konstanz – letzte 16 Wochen</h3>
        <div style="overflow-x:auto;padding-bottom:4px">${Charts.heatmap(16, intensity)}</div>
        <div class="chart-legend">
          <span><i style="background:rgba(255,255,255,.1)"></i>Nichts</span>
          <span><i style="background:rgba(48,209,88,.28)"></i>Etwas</span>
          <span><i style="background:rgba(48,209,88,.58)"></i>Über die Hälfte</span>
          <span><i style="background:#30d158"></i>Alles erledigt</span>
        </div>
      </div>
    `;

    c.querySelector('#addHabit').onclick = () => openHabitModal();
    c.querySelectorAll('.habit-check').forEach(b => b.onclick = () => {
      toggle(b.dataset.habit, b.dataset.date);
      App.refresh();
    });
    c.querySelectorAll('[data-edit]').forEach(b => b.onclick = () => {
      const h = Store.get().habits.find(x => x.id === b.dataset.edit);
      if (h) openHabitModal(h);
    });
    c.querySelectorAll('[data-del]').forEach(b => b.onclick = () => {
      UI.confirmDlg('Habit samt Verlauf löschen?', () => {
        Store.update(st => st.habits = st.habits.filter(x => x.id !== b.dataset.del));
        App.refresh();
      });
    });
  }

  /** Habit an einem Tag umschalten (auch vom Dashboard genutzt) */
  function toggle(id, date) {
    let nowDone = false, streak = 0;
    Store.update(st => {
      const h = st.habits.find(x => x.id === id);
      if (!h) return;
      if (h.log[date]) delete h.log[date];
      else { h.log[date] = true; nowDone = true; }
      streak = Store.habitStreak(h);
    });
    if (nowDone) {
      if (streak > 0 && streak % 7 === 0) UI.toast(`🔥 ${streak} Tage Streak – nicht zu stoppen!`, 'xp');
      else UI.toast('✅ Abgehakt! +8 XP', 'success');
    }
  }

  /** Längster Streak aller Zeiten */
  function maxStreak(h) {
    const days = Object.keys(h.log).sort();
    let best = 0, cur = 0, prev = null;
    for (const d of days) {
      cur = (prev && U.daysBetween(prev, d) === 1) ? cur + 1 : 1;
      best = Math.max(best, cur);
      prev = d;
    }
    return best;
  }

  function openHabitModal(existing) {
    const h = existing || null;
    UI.openModal(h ? 'Habit bearbeiten' : 'Neue Gewohnheit', `
      <form>
        <div class="form-row">
          ${UI.field('Emoji', UI.textInput('hIcon', h ? h.icon : '💪', ''))}
          ${UI.field('Name', UI.textInput('hName', h ? h.name : '', 'z. B. 10 Seiten lesen'))}
        </div>
        ${h ? '' : `
          <div class="muted" style="margin-bottom:8px">Vorschläge:</div>
          <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px">
            ${SUGGESTIONS.map((sg, i) => `<button type="button" class="btn small" data-sg="${i}">${sg.icon} ${U.esc(sg.name)}</button>`).join('')}
          </div>`}
        ${UI.formActions(h ? 'Speichern' : 'Anlegen')}
      </form>
    `, body => {
      body.querySelectorAll('[data-sg]').forEach(b => b.onclick = () => {
        const sg = SUGGESTIONS[Number(b.dataset.sg)];
        body.querySelector('#hIcon').value = sg.icon;
        body.querySelector('#hName').value = sg.name;
      });
      UI.bindForm(body, b => {
        const name = UI.val(b, 'hName');
        if (!name) { UI.toast('⚠️ Wie heißt deine Gewohnheit?'); return; }
        Store.update(st => {
          if (h) {
            const x = st.habits.find(y => y.id === h.id);
            if (x) { x.name = name; x.icon = UI.val(b, 'hIcon'); }
          } else {
            st.habits.push({ id: U.uid(), name, icon: UI.val(b, 'hIcon'), createdAt: U.todayStr(), log: {} });
          }
        });
        UI.closeModal();
        UI.toast(h ? '✅ Gespeichert' : '🔁 Habit angelegt – Tag 1 startet jetzt!', 'success');
        App.refresh();
      });
    });
  }

  return { title: 'Habits', render, toggle };
})();
