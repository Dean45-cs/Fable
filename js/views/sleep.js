/* ============================================================
   IchApp – Schlaf
   Dauer & Qualität – denn Gains entstehen im Schlaf.
   ============================================================ */

window.Views = window.Views || {};

Views.sleep = (() => {

  function render(c) {
    const s = Store.get();
    const p = s.profile;
    const entries = U.sortByDateDesc(s.sleep);
    const last7 = U.lastNDays(7).map(d => s.sleep.find(e => e.date === d) || null);

    const week = last7.filter(Boolean);
    const avgH = U.avg(week.map(e => e.hours));
    const avgQ = U.avg(week.map(e => e.quality));
    const lastE = entries[0] || null;

    // Ø Bettzeit: Zeiten nach Mitternacht zählen als „+24h“, damit der Schnitt stimmt
    const bedMins = week.filter(e => e.bed).map(e => {
      const [h, m] = e.bed.split(':').map(Number);
      let mins = h * 60 + m;
      if (mins < 720) mins += 1440;
      return mins;
    });
    let avgBed = '–';
    if (bedMins.length) {
      const m = Math.round(U.avg(bedMins)) % 1440;
      avgBed = `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
    }

    const bars = U.lastNDays(14).map(d => {
      const e = s.sleep.find(x => x.date === d);
      const h = e ? e.hours : 0;
      return {
        x: d.slice(8) + '.',
        y: Math.round(h * 10) / 10,
        color: !e ? 'rgba(255,255,255,.1)' : h >= p.sleepGoal ? Charts.COLORS.green : h >= p.sleepGoal - 1.5 ? Charts.COLORS.teal : Charts.COLORS.orange
      };
    });

    c.innerHTML = `
      <div class="grid grid-4">
        <div class="card"><div class="stat">
          <span class="stat-label">Letzte Nacht</span>
          <span class="stat-value">${lastE ? U.fmtHours(lastE.hours) : '–'}</span>
          <span class="stat-sub">${lastE ? U.fmtDateRel(lastE.date) : 'Noch kein Eintrag'}</span>
        </div></div>
        <div class="card"><div class="stat">
          <span class="stat-label">Ø Dauer (7 Tage)</span>
          <span class="stat-value">${isNaN(avgH) ? '–' : U.fmtHours(avgH)}</span>
          <span class="stat-sub">Ziel: ${U.fmtHours(p.sleepGoal)} · ${week.filter(e => e.hours >= p.sleepGoal).length}/7 Nächte geschafft</span>
        </div></div>
        <div class="card"><div class="stat">
          <span class="stat-label">Ø Qualität (7 Tage)</span>
          <span class="stat-value">${isNaN(avgQ) ? '–' : U.fmtNum(avgQ, 1) + ' / 5'}</span>
          <span class="stat-sub">${isNaN(avgQ) ? '' : '★'.repeat(Math.round(avgQ)) + '☆'.repeat(5 - Math.round(avgQ))}</span>
        </div></div>
        <div class="card"><div class="stat">
          <span class="stat-label">Ø Bettzeit (7 Tage)</span>
          <span class="stat-value">${avgBed}</span>
          <span class="stat-sub">Konstanz schlägt Schlafdauer</span>
        </div></div>
      </div>

      <div class="quick-actions">
        <button class="btn primary" id="addSleep">😴 Schlaf eintragen</button>
      </div>

      <div class="card section-gap">
        <h3 class="card-title">🌙 Schlafdauer – letzte 14 Nächte (Stunden)</h3>
        <div class="chart-wrap">${Charts.bars(bars, { goal: p.sleepGoal })}</div>
        <div class="chart-legend">
          <span><i style="background:${Charts.COLORS.green}"></i>Ziel erreicht</span>
          <span><i style="background:${Charts.COLORS.teal}"></i>Fast geschafft</span>
          <span><i style="background:${Charts.COLORS.orange}"></i>Zu wenig</span>
        </div>
      </div>

      <div class="card section-gap">
        <h3 class="card-title">📒 Schlaf-Log</h3>
        <div class="list">
          ${entries.length ? entries.slice(0, 14).map(e => `
            <div class="list-item">
              <span style="font-size:18px">${e.hours >= p.sleepGoal ? '😴' : e.hours >= p.sleepGoal - 1.5 ? '🥱' : '😵'}</span>
              <div class="li-main">
                <div class="li-title">${U.fmtHours(e.hours)} ${e.bed && e.wake ? `<span class="muted">(${e.bed} – ${e.wake})</span>` : ''}</div>
                <div class="li-sub">${U.fmtDateRel(e.date)} · ${'★'.repeat(e.quality)}${'☆'.repeat(5 - e.quality)}${e.note ? ' · ' + U.esc(e.note) : ''}</div>
              </div>
              <div class="li-actions">
                <button class="icon-btn" data-edit="${e.id}" title="Bearbeiten">✏️</button>
                <button class="icon-btn danger" data-del="${e.id}" title="Löschen">🗑</button>
              </div>
            </div>`).join('') : `<div class="empty"><span class="empty-icon">🌙</span>Trag deine erste Nacht ein – Schlaf ist dein Recovery-Tool Nr. 1.</div>`}
        </div>
      </div>
    `;

    c.querySelector('#addSleep').onclick = () => openEntryModal();
    c.querySelectorAll('[data-edit]').forEach(b => b.onclick = () => {
      const e = Store.get().sleep.find(x => x.id === b.dataset.edit);
      if (e) openEntryModal(e);
    });
    c.querySelectorAll('[data-del]').forEach(b => b.onclick = () => {
      UI.confirmDlg('Eintrag löschen?', () => {
        Store.update(st => st.sleep = st.sleep.filter(x => x.id !== b.dataset.del));
        App.refresh();
      });
    });
  }

  function openEntryModal(existing) {
    const e = existing || null;
    UI.openModal(e ? 'Schlaf bearbeiten' : 'Schlaf eintragen', `
      <form>
        ${UI.field('Aufgewacht am', UI.dateInput('sDate', e ? e.date : null))}
        <div class="form-row">
          ${UI.field('Eingeschlafen (ca.)', UI.timeInput('sBed', e ? e.bed : '23:00'))}
          ${UI.field('Aufgewacht', UI.timeInput('sWake', e ? e.wake : '06:30'))}
        </div>
        ${UI.field('Qualität', `
          <div class="mood-picker" id="qualPicker">
            ${[1, 2, 3, 4, 5].map(q => `<button type="button" class="mood-btn ${e && e.quality === q ? 'active' : (!e && q === 3 ? 'active' : '')}" data-q="${q}" title="${q}/5">${['😵', '😣', '😐', '🙂', '😴'][q - 1]}</button>`).join('')}
          </div>`)}
        ${UI.field('Notiz (optional)', UI.textInput('sNote', e ? e.note : '', 'z. B. spät am Handy gewesen…'))}
        ${UI.formActions()}
      </form>
    `, body => {
      const picker = body.querySelector('#qualPicker');
      picker.addEventListener('click', ev => {
        const btn = ev.target.closest('.mood-btn');
        if (!btn) return;
        picker.querySelectorAll('.mood-btn').forEach(x => x.classList.remove('active'));
        btn.classList.add('active');
      });

      UI.bindForm(body, b => {
        const bed = UI.val(b, 'sBed');
        const wake = UI.val(b, 'sWake');
        const hours = U.sleepDuration(bed, wake);
        if (isNaN(hours)) { UI.toast('⚠️ Bitte beide Uhrzeiten angeben'); return; }
        const qBtn = b.querySelector('#qualPicker .mood-btn.active');
        const date = UI.val(b, 'sDate') || U.todayStr();
        const data = {
          id: e ? e.id : U.uid(),
          date, bed, wake,
          hours: Math.round(hours * 100) / 100,
          quality: qBtn ? Number(qBtn.dataset.q) : 3,
          note: UI.val(b, 'sNote')
        };
        Store.update(st => {
          st.sleep = st.sleep.filter(x => x.id !== data.id && x.date !== date); // 1 Eintrag pro Nacht
          st.sleep.push(data);
        });
        UI.closeModal();
        UI.reward('Schlaf gespeichert', e ? 0 : 10);
        App.refresh();
      });
    });
  }

  return { title: 'Schlaf', render, openEntryModal };
})();
