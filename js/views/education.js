/* ============================================================
   IchApp – Ausbildung
   Lernfortschritt, Notizen, Projekte & Prüfungen
   für deine Ausbildung als Kaufmann für Dialogmarketing.
   ============================================================ */

window.Views = window.Views || {};

Views.education = (() => {

  const TOPIC_SUGGESTIONS = [
    'Kommunikation & Gesprächsführung', 'Marketing-Grundlagen', 'Projektmanagement',
    'Rechnungswesen & Controlling', 'Datenschutz & Recht', 'Kampagnenplanung',
    'Personalwirtschaft', 'Englisch', 'Wirtschafts- & Sozialkunde'
  ];

  const STATUS = ['offen', 'läuft', 'fertig'];
  const STATUS_PILL = { offen: 'gray', 'läuft': 'blue', fertig: 'green' };

  function render(c) {
    const s = Store.get();
    const e = s.education;
    const today = U.todayStr();

    const grades = e.exams.filter(x => x.grade != null && !isNaN(x.grade) && x.date <= today);
    const avgGrade = U.avg(grades.map(x => x.grade));
    const upcoming = e.exams.filter(x => x.date >= today).sort((a, b) => a.date < b.date ? -1 : 1);
    const avgProgress = e.topics.length ? U.avg(e.topics.map(t => t.progress || 0)) : NaN;

    c.innerHTML = `
      <div class="grid grid-4">
        <div class="card"><div class="stat">
          <span class="stat-label">Ø Lernfortschritt</span>
          <span class="stat-value">${isNaN(avgProgress) ? '–' : Math.round(avgProgress) + '%'}</span>
          <div class="bar"><i style="width:${isNaN(avgProgress) ? 0 : Math.round(avgProgress)}%"></i></div>
        </div></div>
        <div class="card"><div class="stat">
          <span class="stat-label">Ø Note</span>
          <span class="stat-value">${isNaN(avgGrade) ? '–' : U.fmtNum(avgGrade, 1)}</span>
          <span class="stat-sub">${grades.length} benotete Prüfungen</span>
        </div></div>
        <div class="card"><div class="stat">
          <span class="stat-label">Nächste Prüfung</span>
          <span class="stat-value">${upcoming.length ? `${U.daysBetween(today, upcoming[0].date)} <small>Tage</small>` : '–'}</span>
          <span class="stat-sub">${upcoming.length ? U.esc(upcoming[0].title) : 'Keine geplant'}</span>
        </div></div>
        <div class="card"><div class="stat">
          <span class="stat-label">Notizen</span>
          <span class="stat-value">${e.notes.length}</span>
        </div></div>
      </div>

      <div class="quick-actions">
        <button class="btn primary" id="addNote">📝 Notiz</button>
        <button class="btn" id="addTopic">📚 Lernthema</button>
        <button class="btn" id="addProject">📁 Projekt</button>
        <button class="btn" id="addExam">🎓 Prüfung / Note</button>
      </div>

      <div class="grid grid-2 section-gap">
        <div class="card">
          <h3 class="card-title">📚 Lernthemen</h3>
          ${e.topics.length ? e.topics.map(t => `
            <div style="margin-bottom:14px">
              <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:4px">
                <span style="font-weight:600;font-size:14px">${U.esc(t.name)}</span>
                <span style="display:flex;align-items:center;gap:4px">
                  <span class="muted">${t.progress || 0}%</span>
                  <button class="icon-btn" data-topic-plus="${t.id}" title="+10 %">➕</button>
                  <button class="icon-btn danger" data-topic-del="${t.id}" title="Löschen">🗑</button>
                </span>
              </div>
              <div class="bar mt-0"><i class="${(t.progress || 0) >= 100 ? 'green' : ''}" style="width:${t.progress || 0}%"></i></div>
            </div>`).join('') : `<div class="empty"><span class="empty-icon">📚</span>Leg deine Lernfelder an und tracke, wie sicher du dich fühlst.</div>`}
        </div>

        <div class="card">
          <h3 class="card-title">🎓 Prüfungen & Noten</h3>
          ${e.exams.length ? `<table class="data"><thead><tr><th>Datum</th><th>Prüfung</th><th class="num">Note</th><th></th></tr></thead><tbody>` +
            [...e.exams].sort((a, b) => a.date < b.date ? 1 : -1).map(x => `
              <tr>
                <td>${U.fmtDateRel(x.date)}</td>
                <td>${U.esc(x.title)}</td>
                <td class="num">${x.grade != null && !isNaN(x.grade) ? `<b style="color:${x.grade <= 2 ? 'var(--green)' : x.grade <= 3.5 ? 'var(--orange)' : 'var(--red)'}">${U.fmtNum(x.grade, 1)}</b>` : '<span class="pill blue">ansteht</span>'}</td>
                <td style="width:30px"><button class="icon-btn danger" data-exam-del="${x.id}" title="Löschen">🗑</button></td>
              </tr>`).join('') + `</tbody></table>`
            : `<div class="empty"><span class="empty-icon">🎓</span>Trag Klausuren und Noten ein – behalte deinen Schnitt im Blick.</div>`}
        </div>
      </div>

      <div class="card section-gap">
        <h3 class="card-title">📁 Projekte</h3>
        <div class="list">
          ${e.projects.length ? e.projects.map(pr => `
            <div class="list-item">
              <div class="li-main">
                <div class="li-title">${U.esc(pr.name)}</div>
                ${pr.desc ? `<div class="li-sub">${U.esc(pr.desc)}</div>` : ''}
              </div>
              <button class="pill ${STATUS_PILL[pr.status] || 'gray'}" style="border:none;cursor:pointer" data-project-status="${pr.id}" title="Status wechseln">${U.esc(pr.status)}</button>
              <div class="li-actions"><button class="icon-btn danger" data-project-del="${pr.id}" title="Löschen">🗑</button></div>
            </div>`).join('') : `<div class="empty"><span class="empty-icon">📁</span>Berichtsheft, Azubi-Projekt, Präsentation – behalte alles im Blick.</div>`}
        </div>
      </div>

      <div class="card section-gap">
        <h3 class="card-title">📝 Notizen</h3>
        ${e.notes.length ? U.sortByDateDesc(e.notes).slice(0, 20).map(n => `
          <div class="list-item" style="margin-bottom:8px">
            <div class="li-main">
              <div class="li-title">${U.esc(n.title)} ${n.tag ? `<span class="pill blue">${U.esc(n.tag)}</span>` : ''}</div>
              <div class="li-sub">${U.fmtDateRel(n.date)}</div>
              <p style="margin:6px 0 0;white-space:pre-wrap;font-size:14px;color:var(--text-dim)">${U.esc(n.content)}</p>
            </div>
            <div class="li-actions">
              <button class="icon-btn" data-note-edit="${n.id}" title="Bearbeiten">✏️</button>
              <button class="icon-btn danger" data-note-del="${n.id}" title="Löschen">🗑</button>
            </div>
          </div>`).join('') : `<div class="empty"><span class="empty-icon">📝</span>Halte fest, was du in der Berufsschule und im Betrieb lernst.</div>`}
      </div>
    `;

    c.querySelector('#addNote').onclick = () => openNoteModal();
    c.querySelector('#addTopic').onclick = openTopicModal;
    c.querySelector('#addProject').onclick = openProjectModal;
    c.querySelector('#addExam').onclick = openExamModal;

    c.querySelectorAll('[data-topic-plus]').forEach(b => b.onclick = () => {
      Store.update(st => {
        const t = st.education.topics.find(x => x.id === b.dataset.topicPlus);
        if (t) t.progress = U.clamp((t.progress || 0) + 10, 0, 100);
      });
      App.refresh();
    });
    c.querySelectorAll('[data-topic-del]').forEach(b => b.onclick = () => {
      UI.confirmDlg('Lernthema löschen?', () => {
        Store.update(st => st.education.topics = st.education.topics.filter(x => x.id !== b.dataset.topicDel));
        App.refresh();
      });
    });
    c.querySelectorAll('[data-project-status]').forEach(b => b.onclick = () => {
      Store.update(st => {
        const pr = st.education.projects.find(x => x.id === b.dataset.projectStatus);
        if (pr) pr.status = STATUS[(STATUS.indexOf(pr.status) + 1) % STATUS.length];
      });
      App.refresh();
    });
    c.querySelectorAll('[data-project-del]').forEach(b => b.onclick = () => {
      UI.confirmDlg('Projekt löschen?', () => {
        Store.update(st => st.education.projects = st.education.projects.filter(x => x.id !== b.dataset.projectDel));
        App.refresh();
      });
    });
    c.querySelectorAll('[data-exam-del]').forEach(b => b.onclick = () => {
      UI.confirmDlg('Prüfung löschen?', () => {
        Store.update(st => st.education.exams = st.education.exams.filter(x => x.id !== b.dataset.examDel));
        App.refresh();
      });
    });
    c.querySelectorAll('[data-note-edit]').forEach(b => b.onclick = () => {
      const n = Store.get().education.notes.find(x => x.id === b.dataset.noteEdit);
      if (n) openNoteModal(n);
    });
    c.querySelectorAll('[data-note-del]').forEach(b => b.onclick = () => {
      UI.confirmDlg('Notiz löschen?', () => {
        Store.update(st => st.education.notes = st.education.notes.filter(x => x.id !== b.dataset.noteDel));
        App.refresh();
      });
    });
  }

  function openTopicModal() {
    UI.openModal('Lernthema anlegen', `
      <form>
        ${UI.field('Thema', UI.textInput('tName', '', 'z. B. Kampagnenplanung'))}
        ${UI.field('Aktueller Fortschritt: <b id="tPctLabel">0%</b>', '<input type="range" id="tPct" min="0" max="100" step="5" value="0">')}
        <div class="muted" style="margin-bottom:8px">Vorschläge:</div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px">
          ${TOPIC_SUGGESTIONS.map((t, i) => `<button type="button" class="btn small" data-ts="${i}">${U.esc(t)}</button>`).join('')}
        </div>
        ${UI.formActions('Anlegen')}
      </form>
    `, body => {
      const slider = body.querySelector('#tPct');
      slider.oninput = () => body.querySelector('#tPctLabel').textContent = slider.value + '%';
      body.querySelectorAll('[data-ts]').forEach(b => b.onclick = () => {
        body.querySelector('#tName').value = TOPIC_SUGGESTIONS[Number(b.dataset.ts)];
      });
      UI.bindForm(body, b => {
        const name = UI.val(b, 'tName');
        if (!name) { UI.toast('⚠️ Themenname fehlt'); return; }
        Store.update(st => st.education.topics.push({ id: U.uid(), name, progress: Number(slider.value) }));
        UI.closeModal();
        UI.toast('📚 Lernthema angelegt', 'success');
        App.refresh();
      });
    });
  }

  function openNoteModal(existing) {
    const n = existing || null;
    UI.openModal(n ? 'Notiz bearbeiten' : 'Neue Notiz', `
      <form>
        ${UI.field('Titel', UI.textInput('nTitle', n ? n.title : '', 'z. B. Einwandbehandlung am Telefon'))}
        ${UI.field('Tag (optional)', UI.textInput('nTag', n ? n.tag : '', 'z. B. Berufsschule, Betrieb, Prüfung'))}
        ${UI.field('Inhalt', UI.textarea('nContent', n ? n.content : '', 'Was hast du gelernt?'))}
        ${UI.formActions()}
      </form>
    `, body => {
      UI.bindForm(body, b => {
        const title = UI.val(b, 'nTitle');
        const content = UI.val(b, 'nContent');
        if (!title || !content) { UI.toast('⚠️ Titel und Inhalt eintragen'); return; }
        Store.update(st => {
          if (n) {
            const x = st.education.notes.find(y => y.id === n.id);
            if (x) { x.title = title; x.content = content; x.tag = UI.val(b, 'nTag'); }
          } else {
            st.education.notes.push({ id: U.uid(), date: U.todayStr(), title, content, tag: UI.val(b, 'nTag') });
          }
        });
        UI.closeModal();
        UI.reward(n ? 'Notiz aktualisiert' : 'Notiz gespeichert', n ? 0 : 15);
        App.refresh();
      });
    });
  }

  function openProjectModal() {
    UI.openModal('Projekt anlegen', `
      <form>
        ${UI.field('Projektname', UI.textInput('pName', '', 'z. B. Azubi-Projekt Kundenumfrage'))}
        ${UI.field('Beschreibung (optional)', UI.textInput('pDesc', '', ''))}
        ${UI.field('Status', UI.select('pStatus', STATUS, 'offen'))}
        ${UI.formActions('Anlegen')}
      </form>
    `, body => {
      UI.bindForm(body, b => {
        const name = UI.val(b, 'pName');
        if (!name) { UI.toast('⚠️ Projektname fehlt'); return; }
        Store.update(st => st.education.projects.push({
          id: U.uid(), name, desc: UI.val(b, 'pDesc'), status: UI.val(b, 'pStatus')
        }));
        UI.closeModal();
        UI.toast('📁 Projekt angelegt', 'success');
        App.refresh();
      });
    });
  }

  function openExamModal() {
    UI.openModal('Prüfung / Note eintragen', `
      <form>
        ${UI.field('Titel', UI.textInput('eTitle', '', 'z. B. Klausur Rechnungswesen'))}
        <div class="form-row">
          ${UI.field('Datum', UI.dateInput('eDate'))}
          ${UI.field('Note (leer = steht noch aus)', UI.numInput('eGrade', '', 'z. B. 2,3'))}
        </div>
        ${UI.formActions('Eintragen')}
      </form>
    `, body => {
      UI.bindForm(body, b => {
        const title = UI.val(b, 'eTitle');
        if (!title) { UI.toast('⚠️ Titel fehlt'); return; }
        const grade = UI.numVal(b, 'eGrade');
        Store.update(st => st.education.exams.push({
          id: U.uid(),
          date: UI.val(b, 'eDate') || U.todayStr(),
          title,
          grade: isNaN(grade) ? null : grade
        }));
        UI.closeModal();
        UI.reward('Eingetragen', 40);
        App.refresh();
      });
    });
  }

  return { title: 'Ausbildung', render };
})();
