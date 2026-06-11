/* ============================================================
   IchApp – Tagebuch
   Kurze Einträge mit Stimmung – dein Tag in 3 Sätzen.
   ============================================================ */

window.Views = window.Views || {};

Views.journal = (() => {

  let searchTerm = '';

  function render(c) {
    const s = Store.get();
    const today = U.todayStr();
    const todayEntry = s.journal.find(j => j.date === today);

    const q = searchTerm.toLowerCase();
    const entries = U.sortByDateDesc(s.journal).filter(e => !q ||
      (e.text || '').toLowerCase().includes(q) ||
      (e.highlight || '').toLowerCase().includes(q) ||
      (e.gratitude || '').toLowerCase().includes(q));

    // Rückblick: Eintrag von vor genau einem Monat (±0 Tage)
    const flashback = !q ? s.journal.find(j => j.date === U.addDays(today, -30)) : null;

    // Stimmung der letzten 30 Tage
    const moodPoints = U.lastNDays(30).map(d => {
      const e = s.journal.find(j => j.date === d);
      return { x: d.slice(8) + '.', y: e ? e.mood : null };
    });
    const hasMood = moodPoints.some(p => p.y != null);

    // Schreib-Streak
    let streak = 0, d = today;
    if (!todayEntry) d = U.addDays(d, -1);
    while (s.journal.some(j => j.date === d)) { streak++; d = U.addDays(d, -1); }

    const moods = s.journal.map(j => j.mood);
    const avgMood = U.avg(moods.slice(0, 30));

    c.innerHTML = `
      <div class="grid grid-3">
        <div class="card"><div class="stat">
          <span class="stat-label">Einträge gesamt</span>
          <span class="stat-value">${s.journal.length}</span>
        </div></div>
        <div class="card"><div class="stat">
          <span class="stat-label">Schreib-Streak</span>
          <span class="stat-value">🔥 ${streak} <small>Tage</small></span>
        </div></div>
        <div class="card"><div class="stat">
          <span class="stat-label">Ø Stimmung</span>
          <span class="stat-value">${isNaN(avgMood) ? '–' : UI.moodEmoji(Math.round(avgMood)) + ' ' + U.fmtNum(avgMood, 1)}</span>
        </div></div>
      </div>

      <div class="quick-actions" style="align-items:center">
        <button class="btn primary" id="addEntry">${todayEntry ? '📓 Heutigen Eintrag bearbeiten' : '📓 Wie war dein Tag?'}</button>
        <input type="text" id="journalSearch" placeholder="🔍 Einträge durchsuchen…" value="${U.esc(searchTerm)}" style="max-width:260px">
      </div>

      ${flashback ? `
      <div class="card section-gap" style="border-style:dashed">
        <h3 class="card-title">⏪ Vor einem Monat</h3>
        <div style="display:flex;gap:12px;align-items:flex-start">
          <span style="font-size:24px">${UI.moodEmoji(flashback.mood)}</span>
          <div>
            <div class="muted">${U.fmtDate(flashback.date, true)}</div>
            <p style="margin:4px 0 0;white-space:pre-wrap">${U.esc(flashback.text)}</p>
          </div>
        </div>
      </div>` : ''}

      ${hasMood ? `
      <div class="card section-gap">
        <h3 class="card-title">📈 Stimmung – letzte 30 Tage</h3>
        <div class="chart-wrap">${Charts.line(moodPoints, { color: Charts.COLORS.orange, height: 160, yMin: 1 })}</div>
      </div>` : ''}

      <div class="section-gap">
        ${entries.length ? entries.slice(0, 30).map(e => `
          <div class="card" style="margin-bottom:12px">
            <div style="display:flex;align-items:flex-start;gap:12px">
              <span style="font-size:28px" title="${UI.moodLabel(e.mood)}">${UI.moodEmoji(e.mood)}</span>
              <div style="flex:1;min-width:0">
                <div style="display:flex;justify-content:space-between;gap:8px;align-items:baseline">
                  <b>${U.fmtDateRel(e.date)}</b>
                  <span class="muted">${U.fmtDate(e.date, true)}</span>
                </div>
                ${e.highlight ? `<div class="pill green" style="margin:6px 0">✨ ${U.esc(e.highlight)}</div>` : ''}
                ${e.gratitude ? `<div class="pill blue" style="margin:6px 6px 6px 0">🙏 ${U.esc(e.gratitude)}</div>` : ''}
                <p style="margin:6px 0 0;white-space:pre-wrap">${U.esc(e.text)}</p>
              </div>
              <div class="li-actions" style="opacity:1">
                <button class="icon-btn" data-edit="${e.id}" title="Bearbeiten">✏️</button>
                <button class="icon-btn danger" data-del="${e.id}" title="Löschen">🗑</button>
              </div>
            </div>
          </div>`).join('') : `<div class="card"><div class="empty"><span class="empty-icon">📓</span>Drei Sätze reichen: Was lief gut? Was nicht? Worauf bist du stolz?</div></div>`}
      </div>
    `;

    c.querySelector('#addEntry').onclick = () => openEntryModal(todayEntry || null);
    const search = c.querySelector('#journalSearch');
    search.oninput = () => {
      searchTerm = search.value;
      // Nur die Liste neu rendern würde reichen – der Einfachheit halber alles,
      // aber Cursor-Position im Suchfeld erhalten:
      const pos = search.selectionStart;
      App.refresh();
      const s2 = document.querySelector('#journalSearch');
      if (s2) { s2.focus(); s2.setSelectionRange(pos, pos); }
    };
    c.querySelectorAll('[data-edit]').forEach(b => b.onclick = () => {
      const e = Store.get().journal.find(x => x.id === b.dataset.edit);
      if (e) openEntryModal(e);
    });
    c.querySelectorAll('[data-del]').forEach(b => b.onclick = () => {
      UI.confirmDlg('Eintrag löschen?', () => {
        Store.update(st => st.journal = st.journal.filter(x => x.id !== b.dataset.del));
        App.refresh();
      });
    });
  }

  function openEntryModal(existing) {
    const e = existing || null;
    UI.openModal(e ? 'Eintrag bearbeiten' : 'Wie war dein Tag?', `
      <form>
        ${UI.field('Datum', UI.dateInput('jDate', e ? e.date : null))}
        ${UI.field('Stimmung', UI.moodPicker(e ? e.mood : null))}
        ${UI.field('Dein Tag', UI.textarea('jText', e ? e.text : '', 'Was lief gut? Was hast du gelernt? Was nervt?'))}
        ${UI.field('Highlight des Tages (optional)', UI.textInput('jHighlight', e ? e.highlight : '', 'z. B. Neuer PR beim Bankdrücken!'))}
        ${UI.field('Dafür bin ich dankbar (optional)', UI.textInput('jGratitude', e ? e.gratitude : '', 'z. B. Meine Familie, gutes Essen…'))}
        ${UI.formActions()}
      </form>
    `, body => {
      UI.bindMoodPicker(body);
      UI.bindForm(body, b => {
        const mood = UI.getMood(b);
        const text = UI.val(b, 'jText');
        if (!mood) { UI.toast('⚠️ Wähl deine Stimmung'); return; }
        if (!text) { UI.toast('⚠️ Schreib wenigstens einen Satz 🙂'); return; }
        const date = UI.val(b, 'jDate') || U.todayStr();
        const data = {
          id: e ? e.id : U.uid(),
          date, mood, text,
          highlight: UI.val(b, 'jHighlight'),
          gratitude: UI.val(b, 'jGratitude')
        };
        Store.update(st => {
          st.journal = st.journal.filter(x => x.id !== data.id && x.date !== date); // 1 Eintrag pro Tag
          st.journal.push(data);
        });
        UI.closeModal();
        UI.reward(e ? 'Eintrag aktualisiert' : 'Eintrag gespeichert', e ? 0 : 20);
        App.refresh();
      });
    });
  }

  return { title: 'Tagebuch', render, openEntryModal };
})();
