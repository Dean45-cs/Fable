/* ============================================================
   IchApp – Gym & Training
   Workouts, Körpergewicht, Maße, PRs, Fortschritt.
   ============================================================ */

window.Views = window.Views || {};

Views.gym = (() => {

  function render(c) {
    const s = Store.get();
    const weight = Store.latestWeight();
    const gymWeek = Store.workoutsThisWeek().length;
    const workouts = U.sortByDateDesc(s.workouts);

    // Gewichts-Chart (letzte 30 Einträge)
    const wSorted = [...s.weights].sort((a, b) => a.date < b.date ? -1 : 1).slice(-30);
    const wPoints = wSorted.map(w => ({ x: w.date.slice(8) + '.' + w.date.slice(5, 7), y: w.kg }));

    // Volumen pro Woche (letzte 8 Wochen)
    const volBars = [];
    for (let i = 7; i >= 0; i--) {
      const start = U.addDays(U.startOfWeek(U.todayStr()), -7 * i);
      const end = U.addDays(start, 6);
      const vol = U.sum(s.workouts.filter(w => w.date >= start && w.date <= end).map(volume));
      volBars.push({ x: start.slice(8) + '.' + start.slice(5, 7), y: Math.round(vol / 1000) });
    }
    const hasVol = volBars.some(b => b.y > 0);

    // PRs: höchstes Gewicht je Übung
    const prs = {};
    for (const w of s.workouts) {
      for (const ex of w.exercises) {
        for (const set of ex.sets) {
          const kg = set.kg || 0;
          if (!prs[ex.name] || kg > prs[ex.name].kg) prs[ex.name] = { kg, reps: set.reps, date: w.date };
        }
      }
    }
    const prList = Object.entries(prs)
      .filter(([, v]) => v.kg > 0)
      .sort((a, b) => b[1].kg - a[1].kg)
      .slice(0, 6);

    const measurements = U.sortByDateDesc(s.measurements);
    const M_FIELDS = [['chest', 'Brust'], ['waist', 'Taille'], ['hips', 'Hüfte'], ['biceps', 'Bizeps'], ['thigh', 'Oberschenkel']];

    c.innerHTML = `
      <div class="grid grid-4">
        <div class="card"><div class="stat">
          <span class="stat-label">Diese Woche</span>
          <span class="stat-value">${gymWeek} <small>/ ${s.profile.gymGoalPerWeek} Workouts</small></span>
          <div class="bar"><i class="${gymWeek >= s.profile.gymGoalPerWeek ? 'green' : ''}" style="width:${U.clamp(gymWeek / s.profile.gymGoalPerWeek * 100, 0, 100).toFixed(0)}%"></i></div>
        </div></div>
        <div class="card"><div class="stat">
          <span class="stat-label">Workouts gesamt</span>
          <span class="stat-value">${s.workouts.length}</span>
        </div></div>
        <div class="card"><div class="stat">
          <span class="stat-label">Aktuelles Gewicht</span>
          <span class="stat-value">${weight ? U.fmtNum(weight.kg) + ' kg' : '–'}</span>
          ${s.profile.weightGoal ? `<span class="stat-sub">Ziel: ${U.fmtNum(s.profile.weightGoal)} kg</span>` : ''}
        </div></div>
        <div class="card"><div class="stat">
          <span class="stat-label">Stärkster Lift</span>
          <span class="stat-value">${prList.length ? U.fmtNum(prList[0][1].kg) + ' kg' : '–'}</span>
          ${prList.length ? `<span class="stat-sub">${U.esc(prList[0][0])}</span>` : ''}
        </div></div>
      </div>

      <div class="quick-actions">
        <button class="btn primary" id="addWorkout">💪 Workout eintragen</button>
        <button class="btn" id="addWeight">⚖️ Gewicht eintragen</button>
        <button class="btn" id="addMeasure">📏 Maße eintragen</button>
      </div>

      <div class="grid grid-2 section-gap">
        <div class="card">
          <h3 class="card-title">⚖️ Gewichtsverlauf</h3>
          <div class="chart-wrap">${Charts.line(wPoints, { color: Charts.COLORS.blue })}</div>
        </div>
        <div class="card">
          <h3 class="card-title">📊 Trainingsvolumen pro Woche (Tonnen)</h3>
          ${hasVol ? `<div class="chart-wrap">${Charts.bars(volBars, { color: Charts.COLORS.accent })}</div>`
                   : `<div class="empty"><span class="empty-icon">🏋️</span>Trag dein erstes Workout ein!</div>`}
        </div>
      </div>

      <div class="grid grid-2 section-gap">
        <div class="card">
          <h3 class="card-title">🏆 Persönliche Rekorde</h3>
          ${prList.length ? `<table class="data"><thead><tr><th>Übung</th><th class="num">Gewicht</th><th class="num">Wdh.</th><th>Datum</th></tr></thead><tbody>` +
            prList.map(([name, v]) => `<tr><td>${U.esc(name)}</td><td class="num"><b>${U.fmtNum(v.kg)} kg</b></td><td class="num">${v.reps || '–'}</td><td>${U.fmtDate(v.date)}</td></tr>`).join('') +
            `</tbody></table>` : `<div class="empty"><span class="empty-icon">🏆</span>Deine Rekorde erscheinen hier automatisch.</div>`}
        </div>
        <div class="card">
          <h3 class="card-title">📏 Körpermaße (cm)</h3>
          ${measurements.length ? `<table class="data"><thead><tr><th>Datum</th>${M_FIELDS.map(f => `<th class="num">${f[1]}</th>`).join('')}<th></th></tr></thead><tbody>` +
            measurements.slice(0, 6).map(m => `<tr><td>${U.fmtDateRel(m.date)}</td>${M_FIELDS.map(f => `<td class="num">${m[f[0]] != null ? U.fmtNum(m[f[0]]) : '–'}</td>`).join('')}<td style="width:30px"><button class="icon-btn danger" data-del-measure="${m.id}" title="Löschen">🗑</button></td></tr>`).join('') +
            `</tbody></table>` : `<div class="empty"><span class="empty-icon">📏</span>Noch keine Maße eingetragen.</div>`}
        </div>
      </div>

      <div class="card section-gap">
        <h3 class="card-title">📒 Workout-Log</h3>
        <div class="list">
          ${workouts.length ? workouts.slice(0, 20).map(w => `
            <div class="list-item">
              <div class="li-main">
                <div class="li-title">${U.esc(w.name || 'Workout')}</div>
                <div class="li-sub">${U.fmtDateRel(w.date)} · ${w.exercises.length} Übungen · ${U.fmtNum(volume(w) / 1000, 1)} t Volumen${w.duration ? ' · ' + w.duration + ' min' : ''}</div>
              </div>
              <div class="li-actions">
                <button class="icon-btn" data-edit="${w.id}" title="Bearbeiten">✏️</button>
                <button class="icon-btn danger" data-del="${w.id}" title="Löschen">🗑</button>
              </div>
            </div>`).join('') : `<div class="empty"><span class="empty-icon">💪</span>Noch keine Workouts. Heute ist ein guter Tag, um anzufangen!</div>`}
        </div>
      </div>
    `;

    c.querySelector('#addWorkout').onclick = () => openWorkoutModal();
    c.querySelector('#addWeight').onclick = openWeightModal;
    c.querySelector('#addMeasure').onclick = openMeasureModal;

    c.querySelectorAll('[data-edit]').forEach(b => b.onclick = () => {
      const w = Store.get().workouts.find(x => x.id === b.dataset.edit);
      if (w) openWorkoutModal(w);
    });
    c.querySelectorAll('[data-del]').forEach(b => b.onclick = () => {
      UI.confirmDlg('Workout wirklich löschen?', () => {
        Store.update(st => st.workouts = st.workouts.filter(x => x.id !== b.dataset.del));
        UI.toast('Workout gelöscht');
        App.refresh();
      });
    });
    c.querySelectorAll('[data-del-measure]').forEach(b => b.onclick = () => {
      UI.confirmDlg('Diesen Maß-Eintrag löschen?', () => {
        Store.update(st => st.measurements = st.measurements.filter(x => x.id !== b.dataset.delMeasure));
        App.refresh();
      });
    });
  }

  /** Gesamtvolumen eines Workouts (kg) */
  function volume(w) {
    return U.sum(w.exercises.map(ex => U.sum(ex.sets.map(s => (s.kg || 0) * (s.reps || 0)))));
  }

  /* ---------- Workout-Modal (anlegen / bearbeiten) ---------- */

  function exerciseBlockHtml(ex) {
    ex = ex || { name: '', sets: [{ kg: '', reps: '' }] };
    const sets = ex.sets.length ? ex.sets : [{ kg: '', reps: '' }];
    return `
      <div class="exercise-block">
        <div class="exercise-head">
          <input type="text" class="ex-name" placeholder="Übung (z. B. Bankdrücken)" value="${U.esc(ex.name)}" list="exNames">
          <button type="button" class="icon-btn danger ex-remove" title="Übung entfernen">🗑</button>
        </div>
        <div class="set-row" style="margin-bottom:2px">
          <span class="set-num">#</span>
          <span class="muted" style="font-size:11.5px">Gewicht (kg)</span>
          <span class="muted" style="font-size:11.5px">Wiederholungen</span>
          <span></span>
        </div>
        <div class="sets">
          ${sets.map((st, i) => setRowHtml(i + 1, st)).join('')}
        </div>
        <button type="button" class="btn small add-set">+ Satz</button>
      </div>`;
  }

  function setRowHtml(n, st) {
    st = st || { kg: '', reps: '' };
    return `
      <div class="set-row">
        <span class="set-num">${n}</span>
        <input type="number" class="set-kg" step="any" inputmode="decimal" placeholder="kg" value="${st.kg === '' || st.kg == null ? '' : st.kg}">
        <input type="number" class="set-reps" step="1" inputmode="numeric" placeholder="Wdh." value="${st.reps === '' || st.reps == null ? '' : st.reps}">
        <button type="button" class="icon-btn danger set-remove" title="Satz entfernen">✕</button>
      </div>`;
  }

  function knownExerciseNames() {
    const names = new Set(['Bankdrücken', 'Kniebeugen', 'Kreuzheben', 'Schulterdrücken', 'Klimmzüge', 'Rudern', 'Bizeps-Curls', 'Trizepsdrücken', 'Beinpresse', 'Latzug']);
    for (const w of Store.get().workouts) for (const ex of w.exercises) if (ex.name) names.add(ex.name);
    return [...names];
  }

  function openWorkoutModal(existing) {
    const w = existing || null;
    UI.openModal(w ? 'Workout bearbeiten' : 'Workout eintragen', `
      <form>
        <div class="form-row">
          ${UI.field('Name', UI.textInput('woName', w ? w.name : '', 'z. B. Push Day'))}
          ${UI.field('Datum', UI.dateInput('woDate', w ? w.date : null))}
        </div>
        ${UI.field('Dauer (Minuten, optional)', UI.numInput('woDuration', w ? w.duration : '', 'z. B. 75', '1'))}
        <datalist id="exNames">${knownExerciseNames().map(n => `<option value="${U.esc(n)}">`).join('')}</datalist>
        <div id="exList">${(w ? w.exercises : [null]).map(ex => exerciseBlockHtml(ex)).join('')}</div>
        <button type="button" class="btn small" id="addExercise">+ Übung</button>
        ${UI.field('Notizen (optional)', UI.textarea('woNotes', w ? w.notes : '', 'Wie lief es?'))}
        ${UI.formActions(w ? 'Speichern' : 'Workout speichern')}
      </form>
    `, body => {
      const exList = body.querySelector('#exList');

      body.querySelector('#addExercise').onclick = () => {
        exList.insertAdjacentHTML('beforeend', exerciseBlockHtml());
      };

      // Delegierte Listener für Sätze/Übungen
      exList.addEventListener('click', e => {
        if (e.target.closest('.add-set')) {
          const block = e.target.closest('.exercise-block');
          const sets = block.querySelector('.sets');
          sets.insertAdjacentHTML('beforeend', setRowHtml(sets.children.length + 1));
        }
        if (e.target.closest('.set-remove')) {
          const row = e.target.closest('.set-row');
          const sets = row.parentElement;
          row.remove();
          [...sets.querySelectorAll('.set-num')].forEach((el, i) => el.textContent = i + 1);
        }
        if (e.target.closest('.ex-remove')) {
          e.target.closest('.exercise-block').remove();
        }
      });

      UI.bindForm(body, b => {
        const exercises = [...b.querySelectorAll('.exercise-block')].map(block => {
          const name = block.querySelector('.ex-name').value.trim();
          const sets = [...block.querySelectorAll('.sets .set-row')].map(row => ({
            kg: U.num(row.querySelector('.set-kg').value) || 0,
            reps: U.num(row.querySelector('.set-reps').value) || 0
          })).filter(s => s.kg > 0 || s.reps > 0);
          return { name, sets };
        }).filter(ex => ex.name);

        if (!exercises.length) { UI.toast('⚠️ Mindestens eine Übung mit Namen eintragen'); return; }

        const data = {
          id: w ? w.id : U.uid(),
          date: UI.val(b, 'woDate') || U.todayStr(),
          name: UI.val(b, 'woName') || 'Workout',
          duration: UI.numVal(b, 'woDuration') || null,
          notes: UI.val(b, 'woNotes'),
          exercises
        };

        Store.update(st => {
          if (w) st.workouts = st.workouts.map(x => x.id === w.id ? data : x);
          else st.workouts.push(data);
        });
        UI.closeModal();
        UI.reward(w ? 'Workout aktualisiert' : 'Workout gespeichert – stark! 💪', w ? 0 : 50);
        App.refresh();
      });
    });
  }

  /* ---------- Gewicht ---------- */

  function openWeightModal() {
    const latest = Store.latestWeight();
    UI.openModal('Gewicht eintragen', `
      <form>
        <div class="form-row">
          ${UI.field('Gewicht (kg)', UI.numInput('wKg', latest ? latest.kg : '', 'z. B. 74,5'))}
          ${UI.field('Datum', UI.dateInput('wDate'))}
        </div>
        ${UI.formActions()}
      </form>
    `, body => {
      UI.bindForm(body, b => {
        const kg = UI.numVal(b, 'wKg');
        if (isNaN(kg) || kg <= 0) { UI.toast('⚠️ Bitte gültiges Gewicht eingeben'); return; }
        const date = UI.val(b, 'wDate') || U.todayStr();
        Store.update(st => {
          st.weights = st.weights.filter(x => x.date !== date); // pro Tag ein Eintrag
          st.weights.push({ date, kg });
        });
        UI.closeModal();
        UI.reward('Gewicht gespeichert', 10);
        App.refresh();
      });
    });
  }

  /* ---------- Körpermaße ---------- */

  function openMeasureModal() {
    UI.openModal('Körpermaße eintragen (cm)', `
      <form>
        ${UI.field('Datum', UI.dateInput('mDate'))}
        <div class="form-row">
          ${UI.field('Brust', UI.numInput('mChest', '', 'cm'))}
          ${UI.field('Taille', UI.numInput('mWaist', '', 'cm'))}
        </div>
        <div class="form-row">
          ${UI.field('Hüfte', UI.numInput('mHips', '', 'cm'))}
          ${UI.field('Bizeps', UI.numInput('mBiceps', '', 'cm'))}
          ${UI.field('Oberschenkel', UI.numInput('mThigh', '', 'cm'))}
        </div>
        ${UI.formActions()}
      </form>
    `, body => {
      UI.bindForm(body, b => {
        const m = {
          id: U.uid(),
          date: UI.val(b, 'mDate') || U.todayStr(),
          chest: UI.numVal(b, 'mChest') || null,
          waist: UI.numVal(b, 'mWaist') || null,
          hips: UI.numVal(b, 'mHips') || null,
          biceps: UI.numVal(b, 'mBiceps') || null,
          thigh: UI.numVal(b, 'mThigh') || null
        };
        if (!m.chest && !m.waist && !m.hips && !m.biceps && !m.thigh) {
          UI.toast('⚠️ Mindestens ein Maß eintragen'); return;
        }
        Store.update(st => st.measurements.push(m));
        UI.closeModal();
        UI.reward('Maße gespeichert', 10);
        App.refresh();
      });
    });
  }

  return { title: 'Gym & Training', render, openWorkoutModal, openWeightModal };
})();
