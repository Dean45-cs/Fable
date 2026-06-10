/* ============================================================
   IchApp – Einstellungen
   Profil, Tagesziele, Backup & Daten.
   ============================================================ */

window.Views = window.Views || {};

Views.settings = (() => {

  function render(c) {
    const s = Store.get();
    const p = s.profile;
    const lvl = Store.level();

    c.innerHTML = `
      <div class="settings-grid">
        <div class="card">
          <h3 class="card-title">👤 Profil & Tagesziele</h3>
          <form id="profileForm">
            ${UI.field('Dein Name', UI.textInput('pName', p.name, ''))}
            <div class="form-row">
              ${UI.field('Kalorienziel (kcal/Tag)', UI.numInput('pKcal', p.kcalGoal, ''))}
              ${UI.field('Proteinziel (g/Tag)', UI.numInput('pProtein', p.proteinGoal, ''))}
            </div>
            <div class="form-row">
              ${UI.field('Wasserziel (ml/Tag)', UI.numInput('pWater', p.waterGoal, ''))}
              ${UI.field('Schlafziel (Std./Nacht)', UI.numInput('pSleep', p.sleepGoal, ''))}
            </div>
            <div class="form-row">
              ${UI.field('Workouts pro Woche', UI.numInput('pGym', p.gymGoalPerWeek, ''))}
              ${UI.field('Zielgewicht (kg, optional)', UI.numInput('pWeight', p.weightGoal == null ? '' : p.weightGoal, ''))}
            </div>
            ${UI.field('Monatsbudget Ausgaben (€)', UI.numInput('pBudget', p.monthlyBudget, ''))}
            <div class="form-actions">
              <button type="submit" class="btn primary">Speichern</button>
            </div>
          </form>
        </div>

        <div>
          <div class="card">
            <h3 class="card-title">⚡ Dein Level</h3>
            <div style="display:flex;align-items:center;gap:16px">
              ${Charts.ring(lvl.pct, { size: 64, stroke: 6, label: String(lvl.lvl) })}
              <div>
                <div style="font-weight:800;font-size:18px">${U.esc(lvl.name)}</div>
                <div class="muted">${U.fmtNum(lvl.xp, 0)} XP gesamt · noch ${U.fmtNum(lvl.next - lvl.xp, 0)} XP bis Level ${lvl.lvl + 1}</div>
              </div>
            </div>
            <p class="muted" style="margin-bottom:0">
              XP gibt's für alles, was dich weiterbringt: Workouts (+50), Tagebuch (+20),
              Habits (+8), Ernährungstage (+12), Schlaf & Gewicht (+10), erreichte Ziele (+150).
            </p>
          </div>

          <div class="card section-gap">
            <h3 class="card-title">💾 Backup & Daten</h3>
            <p class="muted" style="margin-top:0">
              Alle Daten liegen <b>nur lokal in deinem Browser</b> (localStorage) – nichts wird hochgeladen.
              Mach regelmäßig ein Backup, besonders bevor du den Browser-Verlauf/Website-Daten löschst.
            </p>
            <div style="display:flex;gap:10px;flex-wrap:wrap">
              <button class="btn primary" id="exportBtn">⬇️ Backup herunterladen</button>
              <label class="btn" style="cursor:pointer">⬆️ Backup einspielen
                <input type="file" id="importFile" accept="application/json,.json" hidden>
              </label>
            </div>
          </div>

          <div class="card section-gap danger-zone">
            <h3 class="card-title" style="color:var(--red)">⚠️ Gefahrenzone</h3>
            <button class="btn danger" id="resetBtn">Alle Daten unwiderruflich löschen</button>
          </div>
        </div>
      </div>
    `;

    c.querySelector('#profileForm').onsubmit = e => {
      e.preventDefault();
      const b = c;
      Store.update(st => {
        st.profile.name = UI.val(b, 'pName') || 'Kevin';
        st.profile.kcalGoal = UI.numVal(b, 'pKcal') || 2800;
        st.profile.proteinGoal = UI.numVal(b, 'pProtein') || 140;
        st.profile.waterGoal = UI.numVal(b, 'pWater') || 3000;
        st.profile.sleepGoal = UI.numVal(b, 'pSleep') || 8;
        st.profile.gymGoalPerWeek = UI.numVal(b, 'pGym') || 4;
        const wg = UI.numVal(b, 'pWeight');
        st.profile.weightGoal = isNaN(wg) ? null : wg;
        st.profile.monthlyBudget = UI.numVal(b, 'pBudget') || 0;
      });
      UI.toast('✅ Einstellungen gespeichert', 'success');
      App.refresh();
    };

    c.querySelector('#exportBtn').onclick = () => {
      const blob = new Blob([Store.exportJSON()], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `ichapp-backup-${U.todayStr()}.json`;
      a.click();
      URL.revokeObjectURL(a.href);
      UI.toast('💾 Backup heruntergeladen', 'success');
    };

    c.querySelector('#importFile').onchange = e => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        UI.confirmDlg('Backup einspielen? Deine aktuellen Daten werden dabei <b>überschrieben</b>.', () => {
          try {
            Store.importJSON(reader.result);
            UI.toast('✅ Backup eingespielt', 'success');
            App.refresh();
          } catch (err) {
            UI.toast('⚠️ ' + err.message);
          }
        });
      };
      reader.readAsText(file);
      e.target.value = '';
    };

    c.querySelector('#resetBtn').onclick = () => {
      UI.confirmDlg('Wirklich <b>ALLE</b> Daten löschen? Das kann nicht rückgängig gemacht werden!', () => {
        Store.reset();
        UI.toast('Alles gelöscht – Neustart!');
        App.go('dashboard');
      });
    };
  }

  return { title: 'Einstellungen', render };
})();
