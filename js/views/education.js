/* ============================================================
   IchApp – Schule / Ausbildung
   Dein kompletter Schul-Bereich in EINER App:
   Stundenplan mit Blockwochen, Fächer/Lernfelder, Noten mit
   Schnitt, Prüfungstermine, Markdown-Notizen pro Fach und
   Lernzeit – alles zum Anlegen, Bearbeiten und Löschen.
   ============================================================ */

window.Views = window.Views || {};

Views.education = (() => {

  const SUBJECT_COLORS = ['#5e5ce6', '#0a84ff', '#64d2ff', '#30d158', '#ffd60a', '#ff9f0a', '#ff453a', '#ff375f', '#bf5af2', '#ac8e68'];
  const SUBJECT_SUGGESTIONS = [
    'Kommunikation & Gesprächsführung', 'Marketing & Kampagnen', 'Rechnungswesen & Controlling',
    'Datenschutz & Recht', 'Projektmanagement', 'Personalwirtschaft',
    'Wirtschafts- & Sozialkunde', 'Englisch', 'Deutsch'
  ];
  const GRADE_TYPES = ['Klausur', 'Test', 'Mündlich', 'Projekt', 'Sonstige'];
  const STATUS = ['offen', 'läuft', 'fertig'];
  const STATUS_PILL = { offen: 'gray', 'läuft': 'blue', fertig: 'green' };
  const DAY_NAME = ['', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag'];

  // Ansichts-Zustand (bleibt zwischen Renders erhalten)
  let tab = 'today';
  let selectedSubjectId = null;
  let noteSearch = '';
  let noteSubjectFilter = '';
  let gradeSubjectFilter = '';

  /* ---------- kleine Helfer ---------- */

  function nowHM() {
    const d = new Date();
    return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  }
  function todayWeekday() {
    const wd = new Date().getDay(); // 0=So .. 6=Sa
    return (wd >= 1 && wd <= 5) ? wd : null;
  }
  function gradeColor(v) {
    if (v == null || isNaN(v)) return 'var(--text-faint)';
    return v <= 2.0 ? 'var(--green)' : v <= 3.5 ? 'var(--orange)' : 'var(--red)';
  }
  function ic(name, color, size) {
    return color ? `<span style="color:${color};display:inline-flex">${Icon(name, size)}</span>` : Icon(name, size);
  }
  function md(text) {
    return (window.Views && Views.obsidian && Views.obsidian.mdToHtml)
      ? Views.obsidian.mdToHtml(text || '')
      : `<p style="white-space:pre-wrap">${U.esc(text || '')}</p>`;
  }

  /** farbiger Fach-Chip (oder Fallback-Text) */
  function subjectChip(subjectId, opts) {
    opts = opts || {};
    const s = Store.subjectById(subjectId);
    if (!s) return opts.fallback ? `<span class="pill gray">${U.esc(opts.fallback)}</span>` : '';
    const label = opts.short && s.short ? s.short : s.name;
    return `<span class="subj-chip" style="--sc:${s.color || '#5e5ce6'}">${U.esc(label)}</span>`;
  }

  /** <select> aller Fächer */
  function subjectSelect(id, selected, includeNone) {
    const subs = Store.get().education.subjects;
    const opts = [];
    if (includeNone !== false) opts.push({ value: '', label: '– Kein Fach –' });
    for (const s of subs) opts.push({ value: s.id, label: s.name });
    return UI.select(id, opts, selected || '');
  }

  function hasSubjects() { return Store.get().education.subjects.length > 0; }

  /* ============================================================
     RENDER
     ============================================================ */

  function render(c) {
    const tabs = [
      ['today', 'calendar', 'Überblick'],
      ['timetable', 'timetable', 'Stundenplan'],
      ['subjects', 'book', 'Fächer'],
      ['grades', 'cap', 'Noten'],
      ['exams', 'clipboard', 'Prüfungen'],
      ['notes', 'note', 'Notizen']
    ];

    let body = '';
    if (tab === 'today') body = todayHtml();
    else if (tab === 'timetable') body = timetableHtml();
    else if (tab === 'subjects') body = subjectsHtml();
    else if (tab === 'grades') body = gradesHtml();
    else if (tab === 'exams') body = examsHtml();
    else if (tab === 'notes') body = notesHtml();

    c.innerHTML = `
      <div class="tabs" id="schoolTabs">
        ${tabs.map(([id, icon, label]) => `<button class="tab ${tab === id ? 'active' : ''}" data-tab="${id}">${Icon(icon, 17)} ${label}</button>`).join('')}
      </div>
      <div id="schoolBody">${body}</div>
    `;

    wire(c);
  }

  /* ---------- Überblick ---------- */

  function todayHtml() {
    const s = Store.get();
    const e = s.education;
    const today = U.todayStr();

    const avgGrade = Store.overallGradeAvg();
    const nextExam = e.exams
      .filter(x => x.date >= today && (x.grade == null || isNaN(x.grade)))
      .sort((a, b) => a.date < b.date ? -1 : 1)[0];

    const weekStart = U.startOfWeek(today);
    const weekMinutes = U.sum(e.sessions.filter(x => x.date >= weekStart && x.date <= today).map(x => x.minutes || 0));
    const learnBars = [];
    for (let i = 7; i >= 0; i--) {
      const start = U.addDays(weekStart, -7 * i);
      const end = U.addDays(start, 6);
      const mins = U.sum(e.sessions.filter(x => x.date >= start && x.date <= end).map(x => x.minutes || 0));
      learnBars.push({ x: start.slice(8) + '.' + start.slice(5, 7), y: Math.round(mins / 60 * 10) / 10, color: i === 0 ? Charts.COLORS.accent : 'rgba(255,255,255,.18)' });
    }
    const hasLearn = learnBars.some(b => b.y > 0);

    return `
      ${blockBannerHtml()}

      <div class="grid grid-4 section-gap">
        <div class="card"><div class="stat">
          <span class="stat-label">${ic('cap', null, 15)} Ø Note</span>
          <span class="stat-value" style="color:${gradeColor(avgGrade)}">${isNaN(avgGrade) ? '–' : U.fmtNum(avgGrade, 2)}</span>
          <span class="stat-sub">${Store.allGrades().length} Noten</span>
        </div></div>
        <div class="card"><div class="stat">
          <span class="stat-label">${ic('clipboard', null, 15)} Nächste Prüfung</span>
          <span class="stat-value">${nextExam ? `${U.daysBetween(today, nextExam.date)} <small>Tage</small>` : '–'}</span>
          <span class="stat-sub">${nextExam ? U.esc(nextExam.title) : 'Keine geplant'}</span>
        </div></div>
        <div class="card"><div class="stat">
          <span class="stat-label">${ic('clock', null, 15)} Lernzeit diese Woche</span>
          <span class="stat-value">${U.fmtHours(weekMinutes / 60)}</span>
          <span class="stat-sub">${e.subjects.length} Fächer · ${e.notes.length} Notizen</span>
        </div></div>
        <div class="card"><div class="stat">
          <span class="stat-label">${ic('building', null, 15)} Blockwochen</span>
          <span class="stat-value">${e.blocks.length}</span>
          <span class="stat-sub">${e.timetable.length} Stunden im Plan</span>
        </div></div>
      </div>

      <div class="quick-actions">
        <button class="btn primary" id="addSession">${Icon('clock')} Lernzeit</button>
        <button class="btn" data-add-grade>${Icon('cap')} Note</button>
        <button class="btn" data-add-note>${Icon('note')} Notiz</button>
        <button class="btn" data-add-exam>${Icon('clipboard')} Prüfung</button>
        <button class="btn" data-add-subject>${Icon('book')} Fach</button>
        <button class="btn" id="goObsidian">${Icon('folder')} Obsidian</button>
      </div>

      <div class="grid grid-2 section-gap">
        <div class="card">
          <h3 class="card-title">Lernzeit pro Woche (Stunden)</h3>
          ${hasLearn ? `<div class="chart-wrap">${Charts.bars(learnBars, { height: 180 })}</div>`
                     : `<div class="empty"><span class="empty-icon">${Icon('clock', 30)}</span>Trag deine erste Lerneinheit ein – auch 20 Minuten zählen.</div>`}
        </div>
        <div class="card">
          <h3 class="card-title">Projekte <button class="link-btn" data-add-project>+ Neu</button></h3>
          <div class="list">
            ${e.projects.length ? e.projects.map(pr => `
              <div class="list-item">
                <div class="li-main">
                  <div class="li-title">${U.esc(pr.name)}</div>
                  ${pr.desc ? `<div class="li-sub">${U.esc(pr.desc)}</div>` : ''}
                </div>
                <button class="pill ${STATUS_PILL[pr.status] || 'gray'}" style="border:none;cursor:pointer" data-project-status="${pr.id}" title="Status wechseln">${U.esc(pr.status)}</button>
                <div class="li-actions"><button class="icon-btn danger" data-project-del="${pr.id}" title="Löschen">${Icon('trash', 16)}</button></div>
              </div>`).join('') : `<div class="empty"><span class="empty-icon">${Icon('folder', 30)}</span>Berichtsheft, Azubi-Projekt, Präsentation – behalte alles im Blick.</div>`}
          </div>
        </div>
      </div>

      ${e.topics.length ? `
      <div class="card section-gap">
        <h3 class="card-title">Lernfortschritt (alt) <span class="muted">Fächer haben jetzt eigenen Fortschritt</span></h3>
        ${e.topics.map(t => `
          <div style="margin-bottom:12px">
            <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:4px">
              <span style="font-weight:600;font-size:14px">${U.esc(t.name)}</span>
              <span style="display:flex;align-items:center;gap:4px">
                <span class="muted">${t.progress || 0}%</span>
                <button class="icon-btn danger" data-topic-del="${t.id}" title="Löschen">${Icon('trash', 16)}</button>
              </span>
            </div>
            <div class="bar mt-0"><i class="${(t.progress || 0) >= 100 ? 'green' : ''}" style="width:${t.progress || 0}%"></i></div>
          </div>`).join('')}
      </div>` : ''}
    `;
  }

  function blockBannerHtml() {
    const today = U.todayStr();
    const block = Store.blockOn(today);
    const wd = todayWeekday();

    if (block) {
      const left = U.daysBetween(today, block.end);
      let inner;
      if (wd) {
        const periods = Store.timetableForDay(wd);
        inner = periods.length ? todayPeriodsHtml(periods)
          : `<div class="muted" style="margin-top:8px">Für ${DAY_NAME[wd]} ist noch kein Unterricht eingetragen. <button class="link-btn" data-tab="timetable">Stundenplan bearbeiten →</button></div>`;
      } else {
        inner = `<div class="muted" style="margin-top:8px">Wochenende – heute kein Unterricht.</div>`;
      }
      return `
        <div class="card glow">
          <div class="school-block-head">
            <div><span class="pill green">${Icon('building', 14)} Blockwoche läuft</span> <b style="margin-left:6px">${U.esc(block.label || 'Berufsschule')}</b></div>
            <span class="muted">noch ${left} ${left === 1 ? 'Tag' : 'Tage'} · bis ${U.fmtDate(block.end)}</span>
          </div>
          ${inner}
        </div>`;
    }

    const nb = Store.nextBlock(today);
    if (nb) {
      const days = U.daysBetween(today, nb.start);
      return `
        <div class="card">
          <div class="school-block-head">
            <div><span class="pill gray">${Icon('briefcase', 14)} Im Betrieb</span> <b style="margin-left:6px">${U.esc(nb.label || 'Nächste Blockwoche')}</b></div>
            <span class="pill ${days <= 7 ? 'orange' : 'blue'}">${days === 0 ? 'startet heute' : 'in ' + days + ' ' + (days === 1 ? 'Tag' : 'Tagen')}</span>
          </div>
          <div class="muted" style="margin-top:8px">Nächste Berufsschule: ${U.fmtDate(nb.start, true)} – ${U.fmtDate(nb.end, true)}. Bis dahin volle Power im Betrieb.</div>
        </div>`;
    }

    return `
      <div class="card">
        <div class="school-block-head">
          <div><span class="pill gray">${Icon('building', 14)} Blockwochen</span> <b style="margin-left:6px">Noch keine Blockwoche geplant</b></div>
        </div>
        <div class="muted" style="margin-top:8px">Trag deine Berufsschul-Wochen ein – dann zeigt dir die App automatisch, wann's wieder losgeht und welche Stunden anstehen. <button class="link-btn" data-tab="timetable">Jetzt anlegen →</button></div>
      </div>`;
  }

  function todayPeriodsHtml(periods) {
    const now = nowHM();
    return `<div class="tt-today">` + periods.map(p => {
      const s = Store.subjectById(p.subjectId);
      const isNow = p.start && p.end && p.start <= now && now < p.end;
      const isPast = p.end && p.end <= now;
      const sub = [p.room || (s && s.room), s && s.teacher, p.note].filter(Boolean).map(U.esc).join(' · ');
      return `<div class="tt-period ${isNow ? 'tt-now' : ''} ${isPast ? 'tt-past' : ''}" style="--sc:${s ? s.color : '#5e5ce6'}">
        <span class="tt-period-time">${U.esc(p.start || '')}<br>${U.esc(p.end || '')}</span>
        <div class="li-main">
          <div class="li-title">${s ? U.esc(s.name) : '<span class="muted">Fach gelöscht</span>'}</div>
          ${sub ? `<div class="li-sub">${sub}</div>` : ''}
        </div>
        ${isNow ? '<span class="pill green">jetzt</span>' : ''}
      </div>`;
    }).join('') + `</div>`;
  }

  /* ---------- Stundenplan + Blockwochen ---------- */

  function timetableHtml() {
    const e = Store.get().education;
    const today = U.todayStr();
    const blocks = [...e.blocks].sort((a, b) => (a.start || '') < (b.start || '') ? -1 : 1);

    const weekCols = [];
    for (let d = 1; d <= 5; d++) {
      const periods = Store.timetableForDay(d);
      weekCols.push(`
        <div class="tt-day">
          <div class="tt-day-name">${DAY_NAME[d]}</div>
          ${periods.map(p => {
            const s = Store.subjectById(p.subjectId);
            const sub = [p.room || (s && s.room), s && s.teacher].filter(Boolean).map(U.esc).join(' · ');
            return `<div class="tt-period" style="--sc:${s ? s.color : '#5e5ce6'}">
              <span class="tt-period-time">${U.esc(p.start || '')}<br>${U.esc(p.end || '')}</span>
              <div class="li-main">
                <div class="li-title">${s ? U.esc(s.name) : '<span class="muted">Fach weg</span>'}</div>
                ${sub ? `<div class="li-sub">${sub}</div>` : ''}
              </div>
              <div class="li-actions">
                <button class="icon-btn" data-edit-period="${p.id}" title="Bearbeiten">${Icon('pencil', 16)}</button>
                <button class="icon-btn danger" data-del-period="${p.id}" title="Löschen">${Icon('trash', 16)}</button>
              </div>
            </div>`;
          }).join('')}
          <button class="tt-add" data-add-period data-day="${d}">${Icon('plus', 14)} Stunde</button>
        </div>`);
    }

    return `
      <div class="card">
        <h3 class="card-title">Blockwochen <button class="link-btn" data-add-block>+ Blockwoche</button></h3>
        <p class="muted" style="margin-top:0">Trag die Wochen ein, in denen du in der Berufsschule bist. In diesen Zeiträumen gilt dein Stundenplan unten.</p>
        <div class="list">
          ${blocks.length ? blocks.map(b => {
            const isNow = b.start && b.end && today >= b.start && today <= b.end;
            const isPast = b.end && b.end < today;
            const days = b.start && b.end ? (U.daysBetween(b.start, b.end) + 1) : 0;
            const mark = isNow ? ic('dot', 'var(--green)', 16) : isPast ? ic('checkCircle', 'var(--text-faint)', 18) : ic('calendar', 'var(--text-faint)', 18);
            return `<div class="list-item">
              <span style="display:inline-flex">${mark}</span>
              <div class="li-main">
                <div class="li-title">${U.esc(b.label || 'Blockwoche')} ${isNow ? '<span class="pill green">läuft</span>' : ''}</div>
                <div class="li-sub">${U.fmtDate(b.start, true)} – ${U.fmtDate(b.end, true)} · ${days} ${days === 1 ? 'Tag' : 'Tage'}</div>
              </div>
              <div class="li-actions">
                <button class="icon-btn" data-edit-block="${b.id}" title="Bearbeiten">${Icon('pencil', 16)}</button>
                <button class="icon-btn danger" data-del-block="${b.id}" title="Löschen">${Icon('trash', 16)}</button>
              </div>
            </div>`;
          }).join('') : `<div class="empty"><span class="empty-icon">${Icon('calendar', 30)}</span>Noch keine Blockwoche. Leg deine erste Berufsschul-Woche an.</div>`}
        </div>
      </div>

      <div class="card section-gap">
        <h3 class="card-title">Wochen-Stundenplan</h3>
        ${hasSubjects() ? `<div class="tt-week">${weekCols.join('')}</div>`
          : `<div class="empty"><span class="empty-icon">${Icon('book', 30)}</span>Leg zuerst deine Fächer/Lernfelder an – dann kannst du sie in den Stundenplan setzen.<br><button class="btn small primary" data-add-subject style="margin-top:12px">${Icon('book', 16)} Erstes Fach anlegen</button></div>`}
      </div>
    `;
  }

  /* ---------- Fächer / Lernfelder ---------- */

  function subjectsHtml() {
    if (selectedSubjectId && Store.subjectById(selectedSubjectId)) {
      return subjectDetailHtml(selectedSubjectId);
    }
    selectedSubjectId = null;
    const subs = Store.get().education.subjects;

    return `
      <div class="quick-actions" style="margin-top:0">
        <button class="btn primary" data-add-subject>${Icon('book')} Fach / Lernfeld anlegen</button>
      </div>
      ${subs.length ? `<div class="grid grid-3 section-gap subj-grid">
        ${subs.map(s => {
          const avg = Store.subjectAvg(s.id);
          const noteCount = Store.get().education.notes.filter(n => n.subjectId === s.id).length;
          const gradeCount = Store.allGrades().filter(g => g.subjectId === s.id).length;
          return `<div class="card subj-card" data-open-subject="${s.id}" style="--sc:${s.color || '#5e5ce6'};cursor:pointer">
            <div class="subj-card-head">
              <div>
                <div class="subj-card-name">${U.esc(s.name)}</div>
                <div class="muted">${[s.teacher, s.room].filter(Boolean).map(U.esc).join(' · ') || 'Kein Lehrer/Raum'}</div>
              </div>
              <span class="subj-card-grade" style="color:${gradeColor(avg)}">${isNaN(avg) ? '–' : U.fmtNum(avg, 1)}</span>
            </div>
            <div class="bar"><i class="${(s.progress || 0) >= 100 ? 'green' : ''}" style="width:${s.progress || 0}%"></i></div>
            <div class="subj-card-foot">
              <span class="muted">${s.progress || 0}% sicher</span>
              <span class="muted">${ic('cap', null, 13)} ${gradeCount} · ${ic('note', null, 13)} ${noteCount}</span>
            </div>
            <div class="li-actions subj-card-actions">
              <button class="icon-btn" data-edit-subject="${s.id}" title="Bearbeiten">${Icon('pencil', 16)}</button>
              <button class="icon-btn danger" data-del-subject="${s.id}" title="Löschen">${Icon('trash', 16)}</button>
            </div>
          </div>`;
        }).join('')}
      </div>` : `<div class="card section-gap"><div class="empty"><span class="empty-icon">${Icon('book', 30)}</span>Leg deine Fächer und Lernfelder an – sie sind die Basis für Stundenplan, Noten und Notizen.</div></div>`}
    `;
  }

  function subjectDetailHtml(id) {
    const s = Store.subjectById(id);
    const e = Store.get().education;
    const avg = Store.subjectAvg(id);
    const grades = Store.allGrades().filter(g => g.subjectId === id);
    const exams = e.exams.filter(x => x.subjectId === id).sort((a, b) => a.date < b.date ? 1 : -1);
    const notes = U.sortByDateDesc(e.notes.filter(n => n.subjectId === id));

    return `
      <button class="btn small" data-back-subjects style="margin-bottom:14px">${Icon('chevronLeft', 16)} Alle Fächer</button>
      <div class="card subj-detail" style="--sc:${s.color || '#5e5ce6'}">
        <div class="subj-detail-head">
          <div>
            <h2 style="margin:0;font-size:22px;letter-spacing:-.02em">${U.esc(s.name)}</h2>
            <div class="muted">${[s.short && '„' + s.short + '"', s.teacher, s.room].filter(Boolean).map(U.esc).join(' · ') || 'Lernfeld / Fach'}</div>
          </div>
          <div style="text-align:right">
            <div class="goal-pct" style="color:${gradeColor(avg)}">${isNaN(avg) ? '–' : U.fmtNum(avg, 2)}</div>
            <div class="muted">Ø Note</div>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:10px;margin-top:14px">
          <button class="icon-btn" data-prog-minus="${s.id}" title="−10 %">${Icon('minus', 16)}</button>
          <div class="bar mt-0" style="flex:1"><i class="${(s.progress || 0) >= 100 ? 'green' : ''}" style="width:${s.progress || 0}%"></i></div>
          <button class="icon-btn" data-prog-plus="${s.id}" title="+10 %">${Icon('plus', 16)}</button>
          <span class="muted" style="width:70px;text-align:right">${s.progress || 0}% sicher</span>
        </div>
        <div class="form-actions" style="justify-content:flex-start">
          <button class="btn small" data-edit-subject="${s.id}">${Icon('pencil', 15)} Bearbeiten</button>
          <button class="btn small danger" data-del-subject="${s.id}">${Icon('trash', 15)} Löschen</button>
        </div>
      </div>

      <div class="grid grid-2 section-gap">
        <div class="card">
          <h3 class="card-title">Noten <button class="link-btn" data-add-grade data-subject="${s.id}">+ Note</button></h3>
          <div class="list">
            ${grades.length ? grades.map(g => gradeRow(g, true)).join('') : `<div class="empty"><span class="empty-icon">${Icon('cap', 28)}</span>Noch keine Note.</div>`}
          </div>
        </div>
        <div class="card">
          <h3 class="card-title">Prüfungen <button class="link-btn" data-add-exam data-subject="${s.id}">+ Termin</button></h3>
          <div class="list">
            ${exams.length ? exams.map(x => examRow(x, true)).join('') : `<div class="empty"><span class="empty-icon">${Icon('clipboard', 28)}</span>Keine Prüfung geplant.</div>`}
          </div>
        </div>
      </div>

      <div class="card section-gap">
        <h3 class="card-title">Notizen <button class="link-btn" data-add-note data-subject="${s.id}">+ Notiz</button></h3>
        ${notes.length ? notes.map(n => noteCard(n, true)).join('') : `<div class="empty"><span class="empty-icon">${Icon('note', 28)}</span>Halte hier fest, was du in diesem Fach lernst (Markdown wird unterstützt).</div>`}
      </div>
    `;
  }

  /* ---------- Noten ---------- */

  function gradesHtml() {
    const subs = Store.get().education.subjects;
    let grades = Store.allGrades();
    if (gradeSubjectFilter) grades = grades.filter(g => g.subjectId === gradeSubjectFilter);
    const overall = Store.overallGradeAvg();

    const subjAverages = subs
      .map(s => ({ s, avg: Store.subjectAvg(s.id), n: Store.allGrades().filter(g => g.subjectId === s.id).length }))
      .filter(x => x.n > 0);

    return `
      <div class="grid grid-2">
        <div class="card glow"><div class="stat">
          <span class="stat-label">${ic('cap', null, 15)} Gesamt-Notenschnitt</span>
          <span class="stat-value" style="font-size:40px;color:${gradeColor(overall)}">${isNaN(overall) ? '–' : U.fmtNum(overall, 2)}</span>
          <span class="stat-sub">gewichtet aus ${Store.allGrades().length} Noten</span>
        </div></div>
        <div class="card">
          <h3 class="card-title">Schnitt pro Fach</h3>
          ${subjAverages.length ? subjAverages.map(({ s, avg, n }) => `
            <div style="margin-bottom:10px">
              <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:4px">
                <span style="font-weight:600">${subjectChip(s.id)} ${U.esc(s.name)}</span>
                <span style="font-weight:700;color:${gradeColor(avg)}">${U.fmtNum(avg, 1)} <span class="muted">(${n})</span></span>
              </div>
              <div class="bar mt-0"><i style="width:${U.clamp((6 - avg) / 5 * 100, 0, 100).toFixed(0)}%;background:${gradeColor(avg)}"></i></div>
            </div>`).join('') : `<div class="empty">Noch keine Noten erfasst.</div>`}
        </div>
      </div>

      <div class="card section-gap">
        <h3 class="card-title">Alle Noten
          <span style="display:flex;align-items:center;gap:8px">
            <select id="gradeFilter" style="width:auto;padding:4px 30px 4px 10px;font-size:13px">
              <option value="">Alle Fächer</option>
              ${subs.map(s => `<option value="${s.id}" ${gradeSubjectFilter === s.id ? 'selected' : ''}>${U.esc(s.name)}</option>`).join('')}
            </select>
            <button class="btn small primary" data-add-grade>+ Note</button>
          </span>
        </h3>
        <div class="list">
          ${grades.length ? grades.map(g => gradeRow(g, false)).join('') : `<div class="empty"><span class="empty-icon">${Icon('cap', 30)}</span>Trag deine Noten ein – mündlich, Tests, Klausuren – und behalte den Schnitt im Blick.</div>`}
        </div>
      </div>
    `;
  }

  function gradeRow(g, hideSubject) {
    const typeTag = g.source === 'exam' ? 'Prüfung' : U.esc(g.type || 'Note');
    return `<div class="list-item">
      <span class="grade-badge" style="background:${gradeColor(g.value)}22;color:${gradeColor(g.value)}">${U.fmtNum(g.value, 1)}</span>
      <div class="li-main">
        <div class="li-title">${U.esc(g.title)} ${!hideSubject ? subjectChip(g.subjectId) : ''}</div>
        <div class="li-sub">${U.fmtDateRel(g.date)} · ${typeTag}${g.weight && g.weight !== 1 ? ' · ×' + U.fmtNum(g.weight, 1) : ''}</div>
      </div>
      <div class="li-actions">
        <button class="icon-btn" data-edit-${g.source}="${g.id}" title="Bearbeiten">${Icon('pencil', 16)}</button>
        <button class="icon-btn danger" data-del-${g.source}="${g.id}" title="Löschen">${Icon('trash', 16)}</button>
      </div>
    </div>`;
  }

  /* ---------- Prüfungen ---------- */

  function examsHtml() {
    const e = Store.get().education;
    const today = U.todayStr();
    const upcoming = e.exams.filter(x => x.date >= today).sort((a, b) => a.date < b.date ? -1 : 1);
    const past = e.exams.filter(x => x.date < today).sort((a, b) => a.date < b.date ? 1 : -1);

    return `
      <div class="quick-actions" style="margin-top:0">
        <button class="btn primary" data-add-exam>${Icon('clipboard')} Prüfung / Termin anlegen</button>
      </div>
      <div class="card section-gap">
        <h3 class="card-title">Anstehend</h3>
        <div class="list">
          ${upcoming.length ? upcoming.map(x => examRow(x, false)).join('') : `<div class="empty"><span class="empty-icon">${Icon('clipboard', 30)}</span>Keine Prüfung geplant – trag Klausuren und Tests ein, damit sie auch im Dashboard auftauchen.</div>`}
        </div>
      </div>
      <div class="card section-gap">
        <h3 class="card-title">Vergangen</h3>
        <div class="list">
          ${past.length ? past.map(x => examRow(x, false)).join('') : `<div class="empty">Noch nichts geschrieben.</div>`}
        </div>
      </div>
    `;
  }

  function examRow(x, hideSubject) {
    const today = U.todayStr();
    const days = U.daysBetween(today, x.date);
    const graded = x.grade != null && !isNaN(Number(x.grade));
    let right;
    if (graded) {
      right = `<span class="grade-badge" style="background:${gradeColor(Number(x.grade))}22;color:${gradeColor(Number(x.grade))}">${U.fmtNum(Number(x.grade), 1)}</span>`;
    } else if (x.date >= today) {
      right = `<span class="pill ${days <= 7 ? 'orange' : 'blue'}">${days === 0 ? 'Heute!' : 'in ' + days + ' T.'}</span>`;
    } else {
      right = `<button class="btn small" data-grade-exam="${x.id}">Note eintragen</button>`;
    }
    return `<div class="list-item">
      <span style="display:inline-flex;color:var(--text-faint)">${graded ? Icon('cap', 18) : Icon('clipboard', 18)}</span>
      <div class="li-main">
        <div class="li-title">${U.esc(x.title)} ${!hideSubject ? subjectChip(x.subjectId) : ''}</div>
        <div class="li-sub">${U.fmtDate(x.date, true)}</div>
      </div>
      ${right}
      <div class="li-actions">
        <button class="icon-btn" data-edit-exam="${x.id}" title="Bearbeiten">${Icon('pencil', 16)}</button>
        <button class="icon-btn danger" data-del-exam="${x.id}" title="Löschen">${Icon('trash', 16)}</button>
      </div>
    </div>`;
  }

  /* ---------- Notizen ---------- */

  function notesHtml() {
    const e = Store.get().education;
    const subs = e.subjects;
    const q = noteSearch.toLowerCase();
    let notes = U.sortByDateDesc(e.notes);
    if (noteSubjectFilter) notes = notes.filter(n => n.subjectId === noteSubjectFilter);
    if (q) notes = notes.filter(n =>
      (n.title || '').toLowerCase().includes(q) ||
      (n.content || '').toLowerCase().includes(q) ||
      (n.tag || '').toLowerCase().includes(q));

    return `
      <div class="card">
        <h3 class="card-title">Notizen <button class="link-btn" data-add-note>+ Notiz</button></h3>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px">
          <div class="input-icon" style="flex:1;min-width:160px">${Icon('search', 16)}<input type="text" id="noteSearch" placeholder="Titel, Inhalt, Tag …" value="${U.esc(noteSearch)}"></div>
          <select id="noteFilter" style="width:auto;padding:8px 30px 8px 12px">
            <option value="">Alle Fächer</option>
            ${subs.map(s => `<option value="${s.id}" ${noteSubjectFilter === s.id ? 'selected' : ''}>${U.esc(s.name)}</option>`).join('')}
          </select>
        </div>
        ${notes.length ? notes.map(n => noteCard(n, false)).join('')
          : `<div class="empty"><span class="empty-icon">${Icon('note', 30)}</span>${q || noteSubjectFilter ? 'Nichts gefunden.' : 'Halte fest, was du in Berufsschule und Betrieb lernst. Markdown (# Überschriften, **fett**, Listen, Tabellen) wird unterstützt.'}</div>`}
      </div>
    `;
  }

  function noteCard(n, hideSubject) {
    const preview = (n.content || '').replace(/[#*`>\-]/g, '').trim().slice(0, 160);
    return `<div class="list-item note-card" style="align-items:flex-start;margin-bottom:8px;cursor:pointer" data-view-note="${n.id}">
      <div class="li-main">
        <div class="li-title">${U.esc(n.title)} ${!hideSubject ? subjectChip(n.subjectId) : ''} ${n.tag ? `<span class="pill blue">${U.esc(n.tag)}</span>` : ''}</div>
        <div class="li-sub">${U.fmtDateRel(n.date)}</div>
        ${preview ? `<p style="margin:6px 0 0;font-size:13.5px;color:var(--text-dim)">${U.esc(preview)}${(n.content || '').length > 160 ? '…' : ''}</p>` : ''}
      </div>
      <div class="li-actions">
        <button class="icon-btn" data-edit-note="${n.id}" title="Bearbeiten">${Icon('pencil', 16)}</button>
        <button class="icon-btn danger" data-del-note="${n.id}" title="Löschen">${Icon('trash', 16)}</button>
      </div>
    </div>`;
  }

  /* ============================================================
     LISTENER
     ============================================================ */

  function wire(c) {
    c.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => {
      tab = b.dataset.tab;
      if (tab !== 'subjects') selectedSubjectId = null;
      App.refresh();
    });

    const sess = c.querySelector('#addSession'); if (sess) sess.onclick = openSessionModal;
    const obs = c.querySelector('#goObsidian'); if (obs) obs.onclick = () => App.go('obsidian');

    const ns = c.querySelector('#noteSearch');
    if (ns) ns.oninput = () => {
      noteSearch = ns.value;
      const pos = ns.selectionStart;
      App.refresh();
      const x = document.querySelector('#noteSearch');
      if (x) { x.focus(); x.setSelectionRange(pos, pos); }
    };
    const nf = c.querySelector('#noteFilter');
    if (nf) nf.onchange = () => { noteSubjectFilter = nf.value; App.refresh(); };
    const gf = c.querySelector('#gradeFilter');
    if (gf) gf.onchange = () => { gradeSubjectFilter = gf.value; App.refresh(); };

    c.querySelectorAll('[data-add-subject]').forEach(b => b.onclick = () => openSubjectModal());
    c.querySelectorAll('[data-add-block]').forEach(b => b.onclick = () => openBlockModal());
    c.querySelectorAll('[data-add-period]').forEach(b => b.onclick = () => openPeriodModal(null, b.dataset.day ? Number(b.dataset.day) : null));
    c.querySelectorAll('[data-add-grade]').forEach(b => b.onclick = () => openGradeModal(null, b.dataset.subject || null));
    c.querySelectorAll('[data-add-exam]').forEach(b => b.onclick = () => openExamModal(null, b.dataset.subject || null));
    c.querySelectorAll('[data-add-note]').forEach(b => b.onclick = () => openNoteModal(null, b.dataset.subject || null));
    c.querySelectorAll('[data-add-project]').forEach(b => b.onclick = () => openProjectModal());

    c.querySelectorAll('[data-open-subject]').forEach(el => el.onclick = e => {
      if (e.target.closest('.icon-btn')) return;
      selectedSubjectId = el.dataset.openSubject;
      tab = 'subjects';
      App.refresh();
    });
    c.querySelectorAll('[data-back-subjects]').forEach(b => b.onclick = () => { selectedSubjectId = null; App.refresh(); });
    c.querySelectorAll('[data-edit-subject]').forEach(b => b.onclick = e => {
      e.stopPropagation();
      const s = Store.subjectById(b.dataset.editSubject);
      if (s) openSubjectModal(s);
    });
    c.querySelectorAll('[data-del-subject]').forEach(b => b.onclick = e => {
      e.stopPropagation();
      UI.confirmDlg('Fach löschen? Notizen, Noten und Prüfungen dieses Fachs bleiben erhalten, verlieren aber die Zuordnung.', () => {
        Store.update(st => {
          const id = b.dataset.delSubject;
          st.education.subjects = st.education.subjects.filter(x => x.id !== id);
          st.education.timetable = st.education.timetable.filter(t => t.subjectId !== id);
          st.education.notes.forEach(n => { if (n.subjectId === id) n.subjectId = null; });
          st.education.grades.forEach(g => { if (g.subjectId === id) g.subjectId = null; });
          st.education.exams.forEach(x => { if (x.subjectId === id) x.subjectId = null; });
        });
        selectedSubjectId = null;
        App.refresh();
      });
    });
    c.querySelectorAll('[data-prog-plus]').forEach(b => b.onclick = () => bumpProgress(b.dataset.progPlus, 10));
    c.querySelectorAll('[data-prog-minus]').forEach(b => b.onclick = () => bumpProgress(b.dataset.progMinus, -10));

    c.querySelectorAll('[data-edit-block]').forEach(b => b.onclick = () => {
      const blk = Store.get().education.blocks.find(x => x.id === b.dataset.editBlock);
      if (blk) openBlockModal(blk);
    });
    c.querySelectorAll('[data-del-block]').forEach(b => b.onclick = () => {
      UI.confirmDlg('Blockwoche löschen?', () => {
        Store.update(st => st.education.blocks = st.education.blocks.filter(x => x.id !== b.dataset.delBlock));
        App.refresh();
      });
    });

    c.querySelectorAll('[data-edit-period]').forEach(b => b.onclick = () => {
      const p = Store.get().education.timetable.find(x => x.id === b.dataset.editPeriod);
      if (p) openPeriodModal(p);
    });
    c.querySelectorAll('[data-del-period]').forEach(b => b.onclick = () => {
      UI.confirmDlg('Stunde aus dem Plan löschen?', () => {
        Store.update(st => st.education.timetable = st.education.timetable.filter(x => x.id !== b.dataset.delPeriod));
        App.refresh();
      });
    });

    c.querySelectorAll('[data-edit-grade]').forEach(b => b.onclick = () => {
      const g = Store.get().education.grades.find(x => x.id === b.dataset.editGrade);
      if (g) openGradeModal(g);
    });
    c.querySelectorAll('[data-del-grade]').forEach(b => b.onclick = () => {
      UI.confirmDlg('Note löschen?', () => {
        Store.update(st => st.education.grades = st.education.grades.filter(x => x.id !== b.dataset.delGrade));
        App.refresh();
      });
    });

    c.querySelectorAll('[data-edit-exam]').forEach(b => b.onclick = () => {
      const x = Store.get().education.exams.find(y => y.id === b.dataset.editExam);
      if (x) openExamModal(x);
    });
    c.querySelectorAll('[data-grade-exam]').forEach(b => b.onclick = () => {
      const x = Store.get().education.exams.find(y => y.id === b.dataset.gradeExam);
      if (x) openExamModal(x, null, true);
    });
    c.querySelectorAll('[data-del-exam]').forEach(b => b.onclick = () => {
      UI.confirmDlg('Prüfung löschen?', () => {
        Store.update(st => st.education.exams = st.education.exams.filter(x => x.id !== b.dataset.delExam));
        App.refresh();
      });
    });

    c.querySelectorAll('[data-view-note]').forEach(el => el.onclick = e => {
      if (e.target.closest('.icon-btn')) return;
      const n = Store.get().education.notes.find(x => x.id === el.dataset.viewNote);
      if (n) viewNote(n);
    });
    c.querySelectorAll('[data-edit-note]').forEach(b => b.onclick = e => {
      e.stopPropagation();
      const n = Store.get().education.notes.find(x => x.id === b.dataset.editNote);
      if (n) openNoteModal(n);
    });
    c.querySelectorAll('[data-del-note]').forEach(b => b.onclick = e => {
      e.stopPropagation();
      UI.confirmDlg('Notiz löschen?', () => {
        Store.update(st => st.education.notes = st.education.notes.filter(x => x.id !== b.dataset.delNote));
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

    c.querySelectorAll('[data-topic-del]').forEach(b => b.onclick = () => {
      Store.update(st => st.education.topics = st.education.topics.filter(x => x.id !== b.dataset.topicDel));
      App.refresh();
    });
  }

  function bumpProgress(id, delta) {
    Store.update(st => {
      const s = st.education.subjects.find(x => x.id === id);
      if (s) s.progress = U.clamp((s.progress || 0) + delta, 0, 100);
    });
    App.refresh();
  }

  /* ============================================================
     MODALS
     ============================================================ */

  function openSubjectModal(existing) {
    const s = existing || null;
    const startColor = s ? (s.color || SUBJECT_COLORS[0]) : SUBJECT_COLORS[Store.get().education.subjects.length % SUBJECT_COLORS.length];
    UI.openModal(s ? 'Fach bearbeiten' : 'Fach / Lernfeld anlegen', `
      <form>
        ${UI.field('Name', UI.textInput('subName', s ? s.name : '', 'z. B. LF 3 – Kundenkommunikation'))}
        <div class="form-row">
          ${UI.field('Kürzel (optional)', UI.textInput('subShort', s ? s.short : '', 'z. B. LF3'))}
          ${UI.field('Raum (optional)', UI.textInput('subRoom', s ? s.room : '', 'z. B. A-204'))}
        </div>
        ${UI.field('Lehrer/in (optional)', UI.textInput('subTeacher', s ? s.teacher : '', 'z. B. Frau Schmidt'))}
        ${UI.field('Farbe', `<input type="hidden" id="subColor" value="${startColor}">
          <div class="swatches" id="swatches">
            ${SUBJECT_COLORS.map(col => `<button type="button" class="swatch ${col === startColor ? 'sel' : ''}" data-color="${col}" style="background:${col}" aria-label="Farbe"></button>`).join('')}
          </div>`)}
        ${UI.field('Wie sicher fühlst du dich? <b id="subPctLabel">' + (s ? (s.progress || 0) : 0) + '%</b>', `<input type="range" id="subPct" min="0" max="100" step="5" value="${s ? (s.progress || 0) : 0}">`)}
        ${!s ? `<div class="muted" style="margin-bottom:8px">Vorschläge:</div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px">
          ${SUBJECT_SUGGESTIONS.map((t, i) => `<button type="button" class="btn small" data-ss="${i}">${U.esc(t)}</button>`).join('')}
        </div>` : ''}
        ${UI.formActions(s ? 'Speichern' : 'Anlegen')}
      </form>
    `, body => {
      const slider = body.querySelector('#subPct');
      slider.oninput = () => body.querySelector('#subPctLabel').textContent = slider.value + '%';
      body.querySelectorAll('#swatches .swatch').forEach(sw => sw.onclick = () => {
        body.querySelector('#subColor').value = sw.dataset.color;
        body.querySelectorAll('#swatches .swatch').forEach(o => o.classList.remove('sel'));
        sw.classList.add('sel');
      });
      body.querySelectorAll('[data-ss]').forEach(b => b.onclick = () => {
        body.querySelector('#subName').value = SUBJECT_SUGGESTIONS[Number(b.dataset.ss)];
      });
      UI.bindForm(body, b => {
        const name = UI.val(b, 'subName');
        if (!name) { UI.toast('Bitte einen Namen eingeben'); return; }
        const data = {
          name,
          short: UI.val(b, 'subShort'),
          room: UI.val(b, 'subRoom'),
          teacher: UI.val(b, 'subTeacher'),
          color: b.querySelector('#subColor').value,
          progress: Number(slider.value)
        };
        Store.update(st => {
          if (s) Object.assign(st.education.subjects.find(x => x.id === s.id), data);
          else st.education.subjects.push(Object.assign({ id: U.uid() }, data));
        });
        UI.closeModal();
        UI.toast(s ? 'Fach aktualisiert' : 'Fach angelegt', 'success');
        App.refresh();
      });
    });
  }

  function openBlockModal(existing) {
    const b0 = existing || null;
    UI.openModal(b0 ? 'Blockwoche bearbeiten' : 'Blockwoche anlegen', `
      <form>
        ${UI.field('Bezeichnung', UI.textInput('blkLabel', b0 ? b0.label : '', 'z. B. Blockwoche 1 / KW 12'))}
        <div class="form-row">
          ${UI.field('Von', UI.dateInput('blkStart', b0 ? b0.start : null))}
          ${UI.field('Bis', UI.dateInput('blkEnd', b0 ? b0.end : null))}
        </div>
        <p class="muted" style="margin-top:0">In diesem Zeitraum bist du in der Berufsschule – dein Stundenplan gilt dann automatisch.</p>
        ${UI.formActions(b0 ? 'Speichern' : 'Anlegen')}
      </form>
    `, body => {
      UI.bindForm(body, b => {
        const label = UI.val(b, 'blkLabel') || 'Blockwoche';
        const start = UI.val(b, 'blkStart');
        const end = UI.val(b, 'blkEnd');
        if (!start || !end) { UI.toast('Bitte Start- und Enddatum wählen'); return; }
        if (end < start) { UI.toast('Das Ende liegt vor dem Start'); return; }
        Store.update(st => {
          if (b0) Object.assign(st.education.blocks.find(x => x.id === b0.id), { label, start, end });
          else st.education.blocks.push({ id: U.uid(), label, start, end });
        });
        UI.closeModal();
        UI.toast('Blockwoche gespeichert', 'success');
        App.refresh();
      });
    });
  }

  function openPeriodModal(existing, presetDay) {
    if (!hasSubjects()) { UI.toast('Leg zuerst ein Fach an'); openSubjectModal(); return; }
    const p = existing || null;
    const day = p ? p.day : (presetDay || 1);
    UI.openModal(p ? 'Stunde bearbeiten' : 'Stunde hinzufügen', `
      <form>
        <div class="form-row">
          ${UI.field('Tag', UI.select('pDay', [1, 2, 3, 4, 5].map(d => ({ value: String(d), label: DAY_NAME[d] })), String(day)))}
          ${UI.field('Fach', subjectSelect('pSubject', p ? p.subjectId : '', false))}
        </div>
        <div class="form-row">
          ${UI.field('Von', UI.timeInput('pStart', p ? p.start : '08:00'))}
          ${UI.field('Bis', UI.timeInput('pEnd', p ? p.end : '09:30'))}
        </div>
        <div class="form-row">
          ${UI.field('Raum (optional)', UI.textInput('pRoom', p ? p.room : '', 'überschreibt Fach-Raum'))}
          ${UI.field('Notiz (optional)', UI.textInput('pNote', p ? p.note : '', 'z. B. Doppelstunde'))}
        </div>
        ${UI.formActions(p ? 'Speichern' : 'Hinzufügen')}
      </form>
    `, body => {
      UI.bindForm(body, b => {
        const subjectId = UI.val(b, 'pSubject');
        if (!subjectId) { UI.toast('Welches Fach?'); return; }
        const data = {
          day: Number(UI.val(b, 'pDay')),
          subjectId,
          start: UI.val(b, 'pStart'),
          end: UI.val(b, 'pEnd'),
          room: UI.val(b, 'pRoom'),
          note: UI.val(b, 'pNote')
        };
        Store.update(st => {
          if (p) Object.assign(st.education.timetable.find(x => x.id === p.id), data);
          else st.education.timetable.push(Object.assign({ id: U.uid() }, data));
        });
        UI.closeModal();
        UI.toast('Stundenplan aktualisiert', 'success');
        App.refresh();
      });
    });
  }

  function openGradeModal(existing, presetSubjectId) {
    const g = existing || null;
    UI.openModal(g ? 'Note bearbeiten' : 'Note eintragen', `
      <form>
        ${UI.field('Fach', subjectSelect('gSubject', g ? g.subjectId : (presetSubjectId || ''), true))}
        ${UI.field('Bezeichnung', UI.textInput('gTitle', g ? g.title : '', 'z. B. Klausur LF3'))}
        <div class="form-row">
          ${UI.field('Note (1–6)', UI.numInput('gValue', g ? g.value : '', 'z. B. 2,3', '0.1'))}
          ${UI.field('Gewichtung', UI.numInput('gWeight', g ? (g.weight || 1) : 1, 'z. B. 2', '0.5'))}
        </div>
        <div class="form-row">
          ${UI.field('Art', UI.select('gType', GRADE_TYPES, g ? (g.type || 'Klausur') : 'Klausur'))}
          ${UI.field('Datum', UI.dateInput('gDate', g ? g.date : null))}
        </div>
        ${UI.formActions(g ? 'Speichern' : 'Eintragen')}
      </form>
    `, body => {
      UI.bindForm(body, b => {
        const value = UI.numVal(b, 'gValue');
        if (isNaN(value) || value < 1 || value > 6) { UI.toast('Note zwischen 1 und 6 eintragen'); return; }
        let weight = UI.numVal(b, 'gWeight');
        if (isNaN(weight) || weight <= 0) weight = 1;
        const data = {
          subjectId: UI.val(b, 'gSubject') || null,
          title: UI.val(b, 'gTitle') || UI.val(b, 'gType') || 'Note',
          value, weight,
          type: UI.val(b, 'gType'),
          date: UI.val(b, 'gDate') || U.todayStr()
        };
        Store.update(st => {
          if (g) Object.assign(st.education.grades.find(x => x.id === g.id), data);
          else st.education.grades.push(Object.assign({ id: U.uid() }, data));
        });
        UI.closeModal();
        UI.reward(g ? 'Note aktualisiert' : 'Note eingetragen', g ? 0 : 20);
        App.refresh();
      });
    });
  }

  function openExamModal(existing, presetSubjectId, focusGrade) {
    const x = existing || null;
    UI.openModal(x ? 'Prüfung bearbeiten' : 'Prüfung / Termin anlegen', `
      <form>
        ${UI.field('Titel', UI.textInput('eTitle', x ? x.title : '', 'z. B. Klausur Rechnungswesen'))}
        <div class="form-row">
          ${UI.field('Fach', subjectSelect('eSubject', x ? x.subjectId : (presetSubjectId || ''), true))}
          ${UI.field('Datum', UI.dateInput('eDate', x ? x.date : null))}
        </div>
        ${UI.field('Note (leer = steht noch aus)', UI.numInput('eGrade', x && x.grade != null ? x.grade : '', 'z. B. 2,3', '0.1'))}
        ${UI.formActions(x ? 'Speichern' : 'Anlegen')}
      </form>
    `, body => {
      if (focusGrade) { const g = body.querySelector('#eGrade'); if (g) setTimeout(() => g.focus(), 60); }
      UI.bindForm(body, b => {
        const title = UI.val(b, 'eTitle');
        if (!title) { UI.toast('Bitte einen Titel eingeben'); return; }
        const grade = UI.numVal(b, 'eGrade');
        if (!isNaN(grade) && (grade < 1 || grade > 6)) { UI.toast('Note zwischen 1 und 6'); return; }
        const data = {
          title,
          subjectId: UI.val(b, 'eSubject') || null,
          date: UI.val(b, 'eDate') || U.todayStr(),
          grade: isNaN(grade) ? null : grade
        };
        Store.update(st => {
          if (x) Object.assign(st.education.exams.find(y => y.id === x.id), data);
          else st.education.exams.push(Object.assign({ id: U.uid() }, data));
        });
        UI.closeModal();
        UI.reward(x ? 'Aktualisiert' : 'Eingetragen', x ? 0 : 40);
        App.refresh();
      });
    });
  }

  function openNoteModal(existing, presetSubjectId) {
    const n = existing || null;
    UI.openModal(n ? 'Notiz bearbeiten' : 'Neue Notiz', `
      <form>
        <div class="form-row">
          ${UI.field('Titel', UI.textInput('nTitle', n ? n.title : '', 'z. B. Einwandbehandlung'))}
          ${UI.field('Fach', subjectSelect('nSubject', n ? n.subjectId : (presetSubjectId || ''), true))}
        </div>
        ${UI.field('Tag (optional)', UI.textInput('nTag', n ? n.tag : '', 'z. B. Prüfung, Betrieb'))}
        ${UI.field('Inhalt (Markdown möglich)', UI.textarea('nContent', n ? n.content : '', '# Überschrift\n- Stichpunkt\n**wichtig**'))}
        ${UI.formActions()}
      </form>
    `, body => {
      const ta = body.querySelector('#nContent');
      if (ta) ta.style.minHeight = '200px';
      UI.bindForm(body, b => {
        const title = UI.val(b, 'nTitle');
        const content = UI.val(b, 'nContent');
        if (!title || !content) { UI.toast('Bitte Titel und Inhalt eintragen'); return; }
        const data = { title, content, tag: UI.val(b, 'nTag'), subjectId: UI.val(b, 'nSubject') || null };
        Store.update(st => {
          if (n) Object.assign(st.education.notes.find(y => y.id === n.id), data);
          else st.education.notes.push(Object.assign({ id: U.uid(), date: U.todayStr() }, data));
        });
        UI.closeModal();
        UI.reward(n ? 'Notiz aktualisiert' : 'Notiz gespeichert', n ? 0 : 15);
        App.refresh();
      });
    });
  }

  function viewNote(n) {
    UI.openModal(n.title || 'Notiz', `
      <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-bottom:12px">
        ${subjectChip(n.subjectId, { fallback: 'Kein Fach' })}
        ${n.tag ? `<span class="pill blue">${U.esc(n.tag)}</span>` : ''}
        <span class="muted">${U.fmtDate(n.date, true)}</span>
      </div>
      <div class="md">${md(n.content)}</div>
      <div class="form-actions">
        <button class="btn danger" id="nvDel">${Icon('trash', 15)} Löschen</button>
        <button class="btn" id="nvEdit">${Icon('pencil', 15)} Bearbeiten</button>
        <button class="btn primary" id="nvClose">Fertig</button>
      </div>
    `, body => {
      body.querySelector('#nvClose').onclick = UI.closeModal;
      body.querySelector('#nvEdit').onclick = () => { UI.closeModal(); openNoteModal(n); };
      body.querySelector('#nvDel').onclick = () => {
        UI.closeModal();
        UI.confirmDlg('Notiz löschen?', () => {
          Store.update(st => st.education.notes = st.education.notes.filter(x => x.id !== n.id));
          App.refresh();
        });
      };
    });
  }

  function openSessionModal() {
    UI.openModal('Lernzeit eintragen', `
      <form>
        <div class="form-row">
          ${UI.field('Minuten', UI.numInput('sMinutes', '', 'z. B. 45', '5'))}
          ${UI.field('Datum', UI.dateInput('sDate'))}
        </div>
        ${UI.field('Fach (optional)', subjectSelect('sSubject', '', true))}
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px">
          ${[15, 25, 45, 60, 90].map(m => `<button type="button" class="btn small" data-min="${m}">${m} min</button>`).join('')}
        </div>
        ${UI.formActions('Eintragen')}
      </form>
    `, body => {
      body.querySelectorAll('[data-min]').forEach(b => b.onclick = () => { body.querySelector('#sMinutes').value = b.dataset.min; });
      UI.bindForm(body, b => {
        const minutes = UI.numVal(b, 'sMinutes');
        if (isNaN(minutes) || minutes <= 0) { UI.toast('Wie lange hast du gelernt?'); return; }
        const subjectId = UI.val(b, 'sSubject') || null;
        const subj = subjectId ? Store.subjectById(subjectId) : null;
        Store.update(st => st.education.sessions.push({
          id: U.uid(),
          date: UI.val(b, 'sDate') || U.todayStr(),
          minutes,
          subjectId,
          topic: subj ? subj.name : 'Allgemein'
        }));
        UI.closeModal();
        UI.reward('Lernzeit gespeichert – weiter so!', 15);
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
        if (!name) { UI.toast('Bitte einen Projektnamen eingeben'); return; }
        Store.update(st => st.education.projects.push({
          id: U.uid(), name, desc: UI.val(b, 'pDesc'), status: UI.val(b, 'pStatus')
        }));
        UI.closeModal();
        UI.toast('Projekt angelegt', 'success');
        App.refresh();
      });
    });
  }

  return { title: 'Schule', render };
})();
