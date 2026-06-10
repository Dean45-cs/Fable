/* ============================================================
   IchApp – Ernährung
   Kalorien, Protein, Wasser – schnell getrackt.
   ============================================================ */

window.Views = window.Views || {};

Views.nutrition = (() => {

  // Schnellauswahl typischer Lebensmittel (kcal, Protein g)
  const QUICK_FOODS = [
    { name: 'Proteinshake', kcal: 120, protein: 24 },
    { name: 'Magerquark (250 g)', kcal: 170, protein: 30 },
    { name: 'Hähnchenbrust (200 g)', kcal: 220, protein: 46 },
    { name: 'Haferflocken (80 g)', kcal: 300, protein: 11 },
    { name: '3 Eier', kcal: 215, protein: 19 },
    { name: 'Reis, gekocht (250 g)', kcal: 325, protein: 7 },
    { name: 'Banane', kcal: 105, protein: 1 },
    { name: 'Vollkornbrot (2 Scheiben)', kcal: 180, protein: 7 }
  ];

  function render(c) {
    const s = Store.get();
    const p = s.profile;
    const today = U.todayStr();
    const day = Store.nutritionDay(today);
    const tot = Store.nutritionTotals(today);

    const kcalPct = p.kcalGoal ? U.clamp(tot.kcal / p.kcalGoal, 0, 1) : 0;
    const protPct = p.proteinGoal ? U.clamp(tot.protein / p.proteinGoal, 0, 1) : 0;
    const waterPct = p.waterGoal ? U.clamp(tot.water / p.waterGoal, 0, 1) : 0;

    // 7-Tage-Charts
    const days = U.lastNDays(7);
    const kcalBars = days.map(d => ({
      x: U.WEEKDAYS_SHORT[U.parseDate(d).getDay()],
      y: Store.nutritionTotals(d).kcal,
      color: d === today ? Charts.COLORS.accent : 'rgba(255,255,255,.18)'
    }));
    const protBars = days.map(d => ({
      x: U.WEEKDAYS_SHORT[U.parseDate(d).getDay()],
      y: Store.nutritionTotals(d).protein,
      color: d === today ? Charts.COLORS.green : 'rgba(48,209,88,.4)'
    }));

    c.innerHTML = `
      <div class="grid grid-3">
        <div class="card"><div class="stat">
          <span class="stat-label">🔥 Kalorien</span>
          <span class="stat-value">${U.fmtNum(tot.kcal, 0)} <small>/ ${U.fmtNum(p.kcalGoal, 0)} kcal</small></span>
          <div class="bar"><i class="${kcalPct >= 1 ? 'orange' : ''}" style="width:${(kcalPct * 100).toFixed(0)}%"></i></div>
          <span class="stat-sub">${tot.kcal <= p.kcalGoal ? `Noch ${U.fmtNum(p.kcalGoal - tot.kcal, 0)} kcal übrig` : `${U.fmtNum(tot.kcal - p.kcalGoal, 0)} kcal über Ziel`}</span>
        </div></div>
        <div class="card"><div class="stat">
          <span class="stat-label">🥩 Protein</span>
          <span class="stat-value">${U.fmtNum(tot.protein, 0)}g <small>/ ${U.fmtNum(p.proteinGoal, 0)}g</small></span>
          <div class="bar"><i class="green" style="width:${(protPct * 100).toFixed(0)}%"></i></div>
          <span class="stat-sub">${tot.protein >= p.proteinGoal ? 'Proteinziel erreicht! 💪' : `Noch ${U.fmtNum(p.proteinGoal - tot.protein, 0)} g bis zum Ziel`}</span>
        </div></div>
        <div class="card"><div class="stat">
          <span class="stat-label">💧 Wasser</span>
          <span class="stat-value">${U.fmtNum(tot.water / 1000, 1)}l <small>/ ${U.fmtNum(p.waterGoal / 1000, 1)}l</small></span>
          <div class="bar"><i style="width:${(waterPct * 100).toFixed(0)}%;background:linear-gradient(90deg,#64d2ff,#0a84ff)"></i></div>
          <div class="water-row">
            <button class="water-btn" data-water="250">+250 ml</button>
            <button class="water-btn" data-water="500">+500 ml</button>
            <button class="water-btn" data-water="750">+750 ml</button>
            <button class="water-btn" data-water="-250" style="border-color:var(--border-2);color:var(--text-faint)">−250</button>
          </div>
        </div></div>
      </div>

      <div class="quick-actions">
        <button class="btn primary" id="addEntry">🍎 Mahlzeit eintragen</button>
        ${QUICK_FOODS.slice(0, 4).map((f, i) => `<button class="btn small" data-quick="${i}">+ ${U.esc(f.name)}</button>`).join('')}
      </div>

      <div class="grid grid-2 section-gap">
        <div class="card">
          <h3 class="card-title">🍽️ Heute gegessen <span class="muted">${day.entries.length} Einträge</span></h3>
          <div class="list">
            ${day.entries.length ? day.entries.map(e => `
              <div class="list-item">
                <div class="li-main">
                  <div class="li-title">${U.esc(e.name)}</div>
                  <div class="li-sub">${U.fmtNum(e.kcal, 0)} kcal · ${U.fmtNum(e.protein, 0)} g Protein</div>
                </div>
                <div class="li-actions"><button class="icon-btn danger" data-del="${e.id}" title="Löschen">🗑</button></div>
              </div>`).join('') : `<div class="empty"><span class="empty-icon">🍽️</span>Noch nichts eingetragen heute.</div>`}
          </div>
        </div>
        <div>
          <div class="card">
            <h3 class="card-title">🔥 Kalorien – letzte 7 Tage</h3>
            <div class="chart-wrap">${Charts.bars(kcalBars, { goal: p.kcalGoal, height: 170 })}</div>
          </div>
          <div class="card section-gap">
            <h3 class="card-title">🥩 Protein – letzte 7 Tage (g)</h3>
            <div class="chart-wrap">${Charts.bars(protBars, { goal: p.proteinGoal, height: 170 })}</div>
          </div>
        </div>
      </div>
    `;

    c.querySelector('#addEntry').onclick = () => openEntryModal();
    c.querySelectorAll('[data-water]').forEach(b => b.onclick = () => {
      addWater(Number(b.dataset.water));
      App.refresh();
    });
    c.querySelectorAll('[data-quick]').forEach(b => b.onclick = () => {
      const f = QUICK_FOODS[Number(b.dataset.quick)];
      addEntry(f.name, f.kcal, f.protein);
      App.refresh();
    });
    c.querySelectorAll('[data-del]').forEach(b => b.onclick = () => {
      Store.update(st => {
        const d = st.nutrition[today];
        if (d) d.entries = d.entries.filter(e => e.id !== b.dataset.del);
      });
      App.refresh();
    });
  }

  /** Wasser hinzufügen (ml, kann negativ sein) */
  function addWater(ml) {
    const today = U.todayStr();
    Store.update(st => {
      if (!st.nutrition[today]) st.nutrition[today] = { water: 0, entries: [] };
      st.nutrition[today].water = Math.max(0, (st.nutrition[today].water || 0) + ml);
    });
    if (ml > 0) UI.toast(`💧 +${ml} ml`, 'success');
  }

  function addEntry(name, kcal, protein) {
    const today = U.todayStr();
    Store.update(st => {
      if (!st.nutrition[today]) st.nutrition[today] = { water: 0, entries: [] };
      st.nutrition[today].entries.push({ id: U.uid(), name, kcal: kcal || 0, protein: protein || 0 });
    });
    UI.toast(`🍎 ${U.esc(name)} eingetragen`, 'success');
  }

  function openEntryModal() {
    UI.openModal('Mahlzeit eintragen', `
      <form>
        ${UI.field('Was hast du gegessen?', UI.textInput('nName', '', 'z. B. Hähnchen mit Reis'))}
        <div class="form-row">
          ${UI.field('Kalorien (kcal)', UI.numInput('nKcal', '', 'z. B. 650'))}
          ${UI.field('Protein (g)', UI.numInput('nProtein', '', 'z. B. 45'))}
        </div>
        <div class="muted" style="margin-bottom:8px">Schnellauswahl:</div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px">
          ${QUICK_FOODS.map((f, i) => `<button type="button" class="btn small" data-qf="${i}">${U.esc(f.name)}</button>`).join('')}
        </div>
        ${UI.formActions('Eintragen')}
      </form>
    `, body => {
      body.querySelectorAll('[data-qf]').forEach(b => b.onclick = () => {
        const f = QUICK_FOODS[Number(b.dataset.qf)];
        body.querySelector('#nName').value = f.name;
        body.querySelector('#nKcal').value = f.kcal;
        body.querySelector('#nProtein').value = f.protein;
      });
      UI.bindForm(body, b => {
        const name = UI.val(b, 'nName');
        const kcal = UI.numVal(b, 'nKcal');
        if (!name) { UI.toast('⚠️ Was hast du gegessen?'); return; }
        if (isNaN(kcal) || kcal < 0) { UI.toast('⚠️ Bitte Kalorien angeben'); return; }
        addEntry(name, kcal, UI.numVal(b, 'nProtein') || 0);
        UI.closeModal();
        App.refresh();
      });
    });
  }

  return { title: 'Ernährung', render, openEntryModal, addWater };
})();
