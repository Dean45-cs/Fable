/* ============================================================
   IchApp – Dashboard: Deine Schaltzentrale.
   Ein Blick am Morgen und du weißt, wo du stehst.
   ============================================================ */

window.Views = window.Views || {};

Views.dashboard = (() => {

  const QUOTES = [
    'Disziplin schlägt Motivation. Jeden. Einzelnen. Tag.',
    'Du musst nicht perfekt sein. Nur besser als gestern.',
    'Der beste Zeitpunkt war gestern. Der zweitbeste ist jetzt.',
    'Kleine Schritte jeden Tag schlagen große Pläne ohne Taten.',
    'Niemand kommt und rettet dich. Und genau das ist deine Stärke.',
    'Dein zukünftiges Ich schaut gerade zu. Mach es stolz.',
    'Konstanz ist die Superkraft, die jeder haben könnte – aber kaum einer nutzt.',
    'Erst machst du deine Gewohnheiten. Dann machen deine Gewohnheiten dich.',
    'Härter arbeiten als gestern. Klüger als vorgestern.',
    'Ein Jahr besteht aus 365 Chancen.',
    'Vergleiche dich nur mit dem Kevin von gestern.',
    'Was du heute trackst, kannst du morgen verbessern.',
    'Aufgeben ist keine Option, nur eine Ausrede.',
    'Stark wirst du nicht an guten Tagen, sondern an den Tagen, an denen du keinen Bock hast.',
    'Träume groß. Starte klein. Starte jetzt.',
    'Jede Wiederholung zählt. Jeder Euro zählt. Jeder Tag zählt.',
    'Du bist eine Entscheidung davon entfernt, dass heute ein guter Tag wird.',
    'Routine ist Freiheit: Was automatisch läuft, kostet keine Willenskraft.',
    'Fokus heißt Nein sagen – zu allem, was dich nicht weiterbringt.',
    'Es wird nicht leichter. Du wirst stärker.'
  ];

  function dayQuote() {
    const d = new Date();
    const dayOfYear = Math.floor((d - new Date(d.getFullYear(), 0, 0)) / 86400000);
    return QUOTES[dayOfYear % QUOTES.length];
  }

  function greeting() {
    const h = new Date().getHours();
    if (h < 5) return 'Späte Stunde';
    if (h < 11) return 'Guten Morgen';
    if (h < 18) return 'Guten Tag';
    return 'Guten Abend';
  }

  function render(c) {
    const s = Store.get();
    const today = U.todayStr();
    const p = s.profile;
    const tot = Store.nutritionTotals(today);
    const lastSleep = Store.lastSleep();
    const sleepIsRecent = lastSleep && U.daysBetween(lastSleep.date, today) <= 1;
    const weight = Store.latestWeight();
    const gymWeek = Store.workoutsThisWeek().length;
    const monthSpent = Store.spentInMonth(U.monthKey(today));
    const balance = s.finance.balance;

    // Gewichtstrend (letzte 2 Einträge)
    let weightTrend = '';
    if (s.weights.length >= 2) {
      const sorted = U.sortByDateDesc(s.weights);
      const diff = sorted[0].kg - sorted[1].kg;
      if (Math.abs(diff) >= 0.05) {
        weightTrend = `<span class="stat-sub ${diff > 0 ? 'up' : 'down'}">${diff > 0 ? '▲' : '▼'} ${U.fmtNum(Math.abs(diff))} kg</span>`;
      }
    }

    // Habits heute
    const habitsHtml = s.habits.length ? s.habits.map(h => {
      const done = !!h.log[today];
      const streak = Store.habitStreak(h);
      return `
        <div class="habit-row">
          <button class="habit-check ${done ? 'done' : ''}" data-habit="${h.id}" aria-label="Habit abhaken">✓</button>
          <span class="habit-name ${done ? 'done' : ''}">${U.esc(h.icon || '')} ${U.esc(h.name)}</span>
          ${streak > 0 ? `<span class="streak-flame">🔥 ${streak}</span>` : ''}
        </div>`;
    }).join('') : `<div class="empty"><span class="empty-icon">🔁</span>Noch keine Habits. Leg unter „Habits" welche an!</div>`;

    const habitsDone = s.habits.filter(h => h.log[today]).length;

    // Top-Ziele (offene, nach Fortschritt)
    const openGoals = s.goals.filter(g => !g.done).slice(0, 3);
    const goalsHtml = openGoals.length ? openGoals.map(g => {
      const pct = goalPct(g);
      return `
        <div style="margin-bottom:14px">
          <div style="display:flex;justify-content:space-between;font-size:13.5px;margin-bottom:2px">
            <span style="font-weight:600">${U.esc(g.title)}</span>
            <span style="color:var(--text-dim)">${Math.round(pct * 100)}%</span>
          </div>
          <div class="bar mt-0"><i style="width:${(pct * 100).toFixed(0)}%"></i></div>
        </div>`;
    }).join('') : `<div class="empty"><span class="empty-icon">🎯</span>Keine offenen Ziele. Zeit, dir welche zu setzen!</div>`;

    // Stimmung der letzten 7 Tage
    const moodPoints = U.lastNDays(7).map(d => {
      const entry = s.journal.find(j => j.date === d);
      return { x: U.WEEKDAYS_SHORT[U.parseDate(d).getDay()], y: entry ? entry.mood : null };
    });
    const hasMood = moodPoints.some(pt => pt.y != null);

    // Tagebuch heute schon?
    const journalToday = s.journal.find(j => j.date === today);

    // Anstehende Deadlines & Wochen-Review
    const upcoming = Store.upcoming();
    const week = Store.weekStats();
    const upcomingHtml = upcoming.length ? upcoming.map(u => `
      <div class="list-item">
        <span style="font-size:17px">${u.icon}</span>
        <div class="li-main">
          <div class="li-title">${U.esc(u.title)}</div>
          <div class="li-sub">${U.fmtDate(u.date)}</div>
        </div>
        <span class="pill ${u.days < 0 ? 'red' : u.days <= 7 ? 'orange' : 'gray'}">${u.days < 0 ? `${-u.days} T. drüber` : u.days === 0 ? 'Heute!' : `in ${u.days} T.`}</span>
      </div>`).join('') : `<div class="empty"><span class="empty-icon">📅</span>Keine Deadlines in Sicht – freie Bahn.</div>`;

    const weekRow = (icon, label, value, pct) => `
      <div style="margin-bottom:12px">
        <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:4px">
          <span style="color:var(--text-dim);font-weight:600">${icon} ${label}</span>
          <span style="font-weight:700">${value}</span>
        </div>
        ${pct != null ? `<div class="bar mt-0"><i class="${pct >= 1 ? 'green' : ''}" style="width:${(U.clamp(pct, 0, 1) * 100).toFixed(0)}%"></i></div>` : ''}
      </div>`;

    const kcalPct = p.kcalGoal ? U.clamp(tot.kcal / p.kcalGoal, 0, 1) : 0;
    const protPct = p.proteinGoal ? U.clamp(tot.protein / p.proteinGoal, 0, 1) : 0;
    const waterPct = p.waterGoal ? U.clamp(tot.water / p.waterGoal, 0, 1) : 0;

    c.innerHTML = `
      <div class="hero">
        <h2>${greeting()}, ${U.esc(p.name)}! ⚡</h2>
        <div class="quote">„${dayQuote()}“</div>
        <div class="quick-actions">
          <button class="btn primary" id="qaWorkout">💪 Workout</button>
          <button class="btn" id="qaMeal">🍎 Mahlzeit</button>
          <button class="btn" id="qaExpense">💶 Ausgabe</button>
          <button class="btn" id="qaJournal">${journalToday ? '📓 Tagebuch ✓' : '📓 Tagebuch'}</button>
          <button class="btn" id="qaSleep">😴 Schlaf</button>
        </div>
      </div>

      <div class="grid grid-4 section-gap">
        <div class="card">
          <div class="stat">
            <span class="stat-label">🔥 Kalorien heute</span>
            <span class="stat-value">${U.fmtNum(tot.kcal, 0)} <small>/ ${U.fmtNum(p.kcalGoal, 0)}</small></span>
            <div class="bar"><i class="${kcalPct >= 1 ? 'orange' : ''}" style="width:${(kcalPct * 100).toFixed(0)}%"></i></div>
          </div>
        </div>
        <div class="card">
          <div class="stat">
            <span class="stat-label">🥩 Protein heute</span>
            <span class="stat-value">${U.fmtNum(tot.protein, 0)}g <small>/ ${U.fmtNum(p.proteinGoal, 0)}g</small></span>
            <div class="bar"><i class="green" style="width:${(protPct * 100).toFixed(0)}%"></i></div>
          </div>
        </div>
        <div class="card">
          <div class="stat">
            <span class="stat-label">💧 Wasser heute</span>
            <span class="stat-value">${U.fmtNum(tot.water / 1000, 1)}l <small>/ ${U.fmtNum(p.waterGoal / 1000, 1)}l</small></span>
            <div class="bar"><i style="width:${(waterPct * 100).toFixed(0)}%;background:linear-gradient(90deg,#64d2ff,#0a84ff)"></i></div>
            <div class="water-row">
              <button class="water-btn" data-water="250">+250</button>
              <button class="water-btn" data-water="500">+500</button>
            </div>
          </div>
        </div>
        <div class="card">
          <div class="stat">
            <span class="stat-label">😴 Letzte Nacht</span>
            <span class="stat-value">${sleepIsRecent ? U.fmtHours(lastSleep.hours) : '–'}</span>
            <span class="stat-sub">${sleepIsRecent ? 'Qualität: ' + '★'.repeat(lastSleep.quality) + '☆'.repeat(5 - lastSleep.quality) : 'Noch nicht eingetragen'}</span>
          </div>
        </div>
      </div>

      ${schoolCard()}

      <div class="grid grid-3 section-gap">
        <div class="card">
          <h3 class="card-title">✅ Habits heute <span class="pill ${habitsDone === s.habits.length && s.habits.length ? 'green' : 'gray'}">${habitsDone}/${s.habits.length}</span></h3>
          <div class="list">${habitsHtml}</div>
        </div>

        <div class="card">
          <h3 class="card-title">💪 Training <button class="link-btn" data-go="gym">Alle →</button></h3>
          <div class="stat" style="margin-bottom:14px">
            <span class="stat-value">${gymWeek} <small>/ ${p.gymGoalPerWeek} diese Woche</small></span>
            <div class="bar"><i class="${gymWeek >= p.gymGoalPerWeek ? 'green' : ''}" style="width:${U.clamp(gymWeek / p.gymGoalPerWeek * 100, 0, 100).toFixed(0)}%"></i></div>
          </div>
          <div class="stat">
            <span class="stat-label">⚖️ Gewicht</span>
            <span class="stat-value">${weight ? U.fmtNum(weight.kg) + ' kg' : '–'} ${weightTrend}</span>
            ${p.weightGoal ? `<span class="stat-sub">Ziel: ${U.fmtNum(p.weightGoal)} kg</span>` : ''}
          </div>
        </div>

        <div class="card">
          <h3 class="card-title">🎯 Deine Ziele <button class="link-btn" data-go="goals">Alle →</button></h3>
          ${goalsHtml}
        </div>
      </div>

      <div class="grid grid-2 section-gap">
        <div class="card">
          <h3 class="card-title">💶 Finanzen <button class="link-btn" data-go="finance">Details →</button></h3>
          <div class="grid grid-2">
            <div class="stat">
              <span class="stat-label">Kontostand</span>
              <span class="stat-value">${balance != null ? U.fmtMoney(balance) : '–'}</span>
              ${s.finance.balanceDate ? `<span class="stat-sub">Stand ${U.fmtDateRel(s.finance.balanceDate)}</span>` : ''}
            </div>
            <div class="stat">
              <span class="stat-label">Ausgaben ${U.MONTHS[new Date().getMonth()]}</span>
              <span class="stat-value">${U.fmtMoney(monthSpent)}</span>
              <span class="stat-sub">Budget: ${U.fmtMoney(p.monthlyBudget)}</span>
              <div class="bar"><i class="${monthSpent > p.monthlyBudget ? 'orange' : 'green'}" style="width:${U.clamp(monthSpent / (p.monthlyBudget || 1) * 100, 0, 100).toFixed(0)}%"></i></div>
            </div>
          </div>
        </div>

        <div class="card">
          <h3 class="card-title">📓 Stimmung – letzte 7 Tage <button class="link-btn" data-go="journal">Tagebuch →</button></h3>
          ${hasMood
            ? `<div class="chart-wrap">${Charts.line(moodPoints, { height: 150, color: Charts.COLORS.orange, yMin: 1 })}</div>`
            : `<div class="empty"><span class="empty-icon">📓</span>Schreib heute deinen ersten Eintrag!</div>`}
        </div>
      </div>

      <div class="grid grid-2 section-gap">
        <div class="card">
          <h3 class="card-title">📅 Anstehend</h3>
          <div class="list">${upcomingHtml}</div>
        </div>
        <div class="card">
          <h3 class="card-title">📊 Deine Woche <span class="muted">Mo – heute</span></h3>
          ${weekRow('💪', 'Workouts', `${week.workouts} / ${p.gymGoalPerWeek}`, week.workouts / (p.gymGoalPerWeek || 1))}
          ${weekRow('✅', 'Habits erledigt', `${Math.round(week.habitPct * 100)} %`, week.habitPct)}
          ${weekRow('🍎', 'Ernährung getrackt', `${week.trackedDays} / ${week.days} Tage`, week.trackedDays / week.days)}
          ${weekRow('📓', 'Tagebuch', `${week.journalDays} / ${week.days} Tage`, week.journalDays / week.days)}
          ${weekRow('😴', 'Ø Schlaf', isNaN(week.sleepAvg) ? '–' : U.fmtHours(week.sleepAvg), isNaN(week.sleepAvg) ? null : week.sleepAvg / (p.sleepGoal || 8))}
          ${week.learnMinutes ? weekRow('⏱️', 'Lernzeit', U.fmtHours(week.learnMinutes / 60), null) : ''}
        </div>
      </div>
    `;

    /* ---------- Listener ---------- */

    // Habits direkt abhaken
    c.querySelectorAll('.habit-check').forEach(btn => {
      btn.onclick = () => {
        Views.habits.toggle(btn.dataset.habit, today);
        App.refresh();
      };
    });

    // Wasser-Schnellbuttons
    c.querySelectorAll('.water-btn').forEach(btn => {
      btn.onclick = () => {
        Views.nutrition.addWater(Number(btn.dataset.water));
        App.refresh();
      };
    });

    // Quick-Actions
    c.querySelector('#qaWorkout').onclick = () => Views.gym.openWorkoutModal();
    c.querySelector('#qaMeal').onclick = () => Views.nutrition.openEntryModal();
    c.querySelector('#qaExpense').onclick = () => Views.finance.openTxModal();
    c.querySelector('#qaJournal').onclick = () => Views.journal.openEntryModal(journalToday || null);
    c.querySelector('#qaSleep').onclick = () => Views.sleep.openEntryModal();

    // Navigations-Links
    c.querySelectorAll('[data-go]').forEach(btn => {
      btn.onclick = () => App.go(btn.dataset.go);
    });
  }

  /** Kompakte Schul-Karte fürs Dashboard (Blockwoche, Note, nächste Prüfung) */
  function schoolCard() {
    const today = U.todayStr();
    const e = Store.get().education;
    const block = Store.blockOn(today);
    const nb = Store.nextBlock(today);
    const avg = Store.overallGradeAvg();
    const nextExam = e.exams
      .filter(x => x.date >= today && (x.grade == null || isNaN(x.grade)))
      .sort((a, b) => a.date < b.date ? -1 : 1)[0];
    const gradeColor = isNaN(avg) ? 'var(--text)' : avg <= 2 ? 'var(--green)' : avg <= 3.5 ? 'var(--orange)' : 'var(--red)';

    let statusVal, statusSub, statusIcon;
    if (block) {
      const wd = new Date().getDay();
      const periods = (wd >= 1 && wd <= 5) ? Store.timetableForDay(wd) : [];
      statusIcon = 'building';
      statusVal = 'Blockwoche';
      statusSub = (wd >= 1 && wd <= 5) ? `${periods.length} ${periods.length === 1 ? 'Stunde' : 'Stunden'} heute` : 'Wochenende';
    } else if (nb) {
      const days = U.daysBetween(today, nb.start);
      statusIcon = 'briefcase';
      statusVal = 'Im Betrieb';
      statusSub = days === 0 ? 'Schule startet heute' : `Schule in ${days} ${days === 1 ? 'Tag' : 'Tagen'}`;
    } else {
      statusIcon = 'building';
      statusVal = '–';
      statusSub = 'Keine Blockwoche';
    }

    return `
      <div class="card section-gap">
        <h3 class="card-title">Schule <button class="link-btn" data-go="education">Öffnen →</button></h3>
        <div class="grid grid-3">
          <div class="stat">
            <span class="stat-label">${Icon(statusIcon, 15)} Status</span>
            <span class="stat-value" style="font-size:19px">${statusVal}</span>
            <span class="stat-sub">${U.esc(statusSub)}</span>
          </div>
          <div class="stat">
            <span class="stat-label">${Icon('cap', 15)} Ø Note</span>
            <span class="stat-value" style="color:${gradeColor}">${isNaN(avg) ? '–' : U.fmtNum(avg, 2)}</span>
            <span class="stat-sub">${Store.allGrades().length} Noten</span>
          </div>
          <div class="stat">
            <span class="stat-label">${Icon('clipboard', 15)} Nächste Prüfung</span>
            <span class="stat-value" style="font-size:19px">${nextExam ? U.daysBetween(today, nextExam.date) + ' <small>Tage</small>' : '–'}</span>
            <span class="stat-sub">${nextExam ? U.esc(nextExam.title) : 'Keine geplant'}</span>
          </div>
        </div>
      </div>`;
  }

  /** Fortschritt eines Ziels 0..1 (geteilt mit goals-View).
      Bei %-Zielen mit Meilensteinen zählt die Checkliste. */
  function goalPct(g) {
    if (g.done) return 1;
    if (g.milestones && g.milestones.length && g.unit === '%' && g.target === 100) {
      return g.milestones.filter(m => m.done).length / g.milestones.length;
    }
    if (g.target && g.target > 0) return U.clamp((g.current || 0) / g.target, 0, 1);
    return 0;
  }

  return { title: 'Dashboard', render, goalPct };
})();
