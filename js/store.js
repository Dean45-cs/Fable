/* ============================================================
   IchApp – Datenspeicher (localStorage)
   Alle Daten bleiben auf DEINEM Gerät. Backup über Einstellungen.
   ============================================================ */

const Store = (() => {

  const KEY = 'ichapp.v1';

  function defaultState() {
    return {
      version: 1,
      profile: {
        name: 'Kevin',
        kcalGoal: 2800,       // Tagesziel Kalorien
        proteinGoal: 140,     // g Protein / Tag
        waterGoal: 3000,      // ml Wasser / Tag
        sleepGoal: 8,         // Stunden / Nacht
        gymGoalPerWeek: 4,    // Trainings / Woche
        weightGoal: null,     // Ziel-Körpergewicht in kg (optional)
        monthlyBudget: 600    // Ausgaben-Budget € / Monat
      },

      // 💪 Gym
      weights: [],        // {date, kg}
      measurements: [],   // {id, date, chest, waist, hips, biceps, thigh}
      workouts: [],       // {id, date, name, duration, notes, exercises:[{name, sets:[{kg, reps}]}]}

      // 🎯 Ziele
      goals: [],          // {id, title, type:'short'|'long', category, deadline, target, current, unit,
                          //  milestones:[{id, text, done}], done, doneAt, createdAt}

      // 💶 Finanzen
      finance: {
        balance: null,            // aktueller Kontostand (manuell oder via CSV)
        balanceDate: null,
        transactions: []          // {id, date, amount(+/-), category, note, importKey?}
      },

      // 🍎 Ernährung
      nutrition: {},      // 'YYYY-MM-DD': {water(ml), entries:[{id, name, kcal, protein}]}
      foodFavorites: [],  // {id, name, kcal, protein}

      // 😴 Schlaf
      sleep: [],          // {id, date(=Aufwach-Tag), bed, wake, hours, quality(1-5), note}

      // 🔁 Habits
      habits: [],         // {id, name, icon, createdAt, log:{'YYYY-MM-DD':true}}

      // 📓 Tagebuch
      journal: [],        // {id, date, mood(1-5), text, highlight, gratitude}

      // 🎓 Ausbildung
      education: {
        topics: [],       // {id, name, progress(0-100)}
        notes: [],        // {id, date, title, content, tag}
        projects: [],     // {id, name, desc, status:'offen'|'läuft'|'fertig'}
        exams: [],        // {id, date, title, grade}
        sessions: []      // {id, date, minutes, topic}  – Lernzeit
      },

      // 🏃 Laufen
      runs: [],           // {id, date, name, duration(s), distance(m), points:[[lat,lon,t?]], splits:[s pro km]}
      routes: [],         // {id, name, distance(m), points:[[lat,lon]]|null, notes}

      meta: { createdAt: U.todayStr() }
    };
  }

  let state = load();

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return defaultState();
      const parsed = JSON.parse(raw);
      // Sanfte Migration: fehlende Felder aus dem Default auffüllen
      const def = defaultState();
      const merged = Object.assign({}, def, parsed);
      merged.profile = Object.assign({}, def.profile, parsed.profile || {});
      merged.finance = Object.assign({}, def.finance, parsed.finance || {});
      merged.education = Object.assign({}, def.education, parsed.education || {});
      return merged;
    } catch (e) {
      console.error('Store konnte nicht geladen werden:', e);
      return defaultState();
    }
  }

  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch (e) {
      console.error('Speichern fehlgeschlagen:', e);
      if (typeof UI !== 'undefined') UI.toast('⚠️ Speichern fehlgeschlagen (Speicher voll?)');
    }
  }

  /** State lesen */
  function get() { return state; }

  /** State ändern + speichern: Store.update(s => { ... }) */
  function update(fn) {
    fn(state);
    save();
  }

  /** Kompletten Export als JSON-String */
  function exportJSON() {
    return JSON.stringify(state, null, 2);
  }

  /** Import: ersetzt alles */
  function importJSON(jsonStr) {
    const parsed = JSON.parse(jsonStr); // wirft bei ungültigem JSON
    if (!parsed || typeof parsed !== 'object' || !parsed.profile) {
      throw new Error('Das ist kein gültiges IchApp-Backup.');
    }
    state = parsed;
    state = (() => { const s = state; const def = defaultState();
      const merged = Object.assign({}, def, s);
      merged.profile = Object.assign({}, def.profile, s.profile || {});
      merged.finance = Object.assign({}, def.finance, s.finance || {});
      merged.education = Object.assign({}, def.education, s.education || {});
      return merged; })();
    save();
  }

  /** Alles löschen und neu starten */
  function reset() {
    state = defaultState();
    save();
  }

  /* ---------- Abgeleitete Werte (überall nutzbar) ---------- */

  /** Ernährungs-Tag holen (legt leeren Tag an, ohne zu speichern) */
  function nutritionDay(dateStr) {
    return state.nutrition[dateStr] || { water: 0, entries: [] };
  }

  function nutritionTotals(dateStr) {
    const day = nutritionDay(dateStr);
    return {
      kcal: U.sum(day.entries.map(e => e.kcal || 0)),
      protein: U.sum(day.entries.map(e => e.protein || 0)),
      water: day.water || 0
    };
  }

  /** Aktuellster Gewichtseintrag */
  function latestWeight() {
    if (!state.weights.length) return null;
    return U.sortByDateDesc(state.weights)[0];
  }

  /** Habit-Streak: Tage in Folge bis heute (heute zählt, wenn erledigt) */
  function habitStreak(habit) {
    let streak = 0;
    let d = U.todayStr();
    if (!habit.log[d]) d = U.addDays(d, -1); // heute noch offen? Dann ab gestern zählen
    while (habit.log[d]) {
      streak++;
      d = U.addDays(d, -1);
    }
    return streak;
  }

  /** Workouts in der aktuellen Woche (Mo–So) */
  function workoutsThisWeek() {
    const start = U.startOfWeek(U.todayStr());
    return state.workouts.filter(w => w.date >= start && w.date <= U.todayStr());
  }

  /** Ausgaben (negativ gebuchte Beträge) im Monat 'YYYY-MM' */
  function spentInMonth(monthKey) {
    return U.sum(
      state.finance.transactions
        .filter(t => t.date.slice(0, 7) === monthKey && t.amount < 0)
        .map(t => -t.amount)
    );
  }

  /** Einnahmen im Monat 'YYYY-MM' */
  function incomeInMonth(monthKey) {
    return U.sum(
      state.finance.transactions
        .filter(t => t.date.slice(0, 7) === monthKey && t.amount > 0)
        .map(t => t.amount)
    );
  }

  /** Schlaf der letzten Nacht (jüngster Eintrag) */
  function lastSleep() {
    if (!state.sleep.length) return null;
    return U.sortByDateDesc(state.sleep)[0];
  }

  /** Wochen-Statistik (aktuelle Woche Mo–heute) für das Dashboard */
  function weekStats() {
    const today = U.todayStr();
    const start = U.startOfWeek(today);
    const days = [];
    for (let d = start; d <= today; d = U.addDays(d, 1)) days.push(d);

    // Habits: erledigte Slots / mögliche Slots
    let slots = 0, done = 0;
    for (const d of days) {
      for (const h of state.habits) {
        if (!h.createdAt || h.createdAt <= d) {
          slots++;
          if (h.log[d]) done++;
        }
      }
    }

    const journalDays = days.filter(d => state.journal.some(j => j.date === d)).length;
    const trackedDays = days.filter(d => (state.nutrition[d] || {}).entries && state.nutrition[d].entries.length).length;
    const sleepEntries = state.sleep.filter(e => e.date >= start && e.date <= today);
    const learnMinutes = U.sum(state.education.sessions.filter(x => x.date >= start && x.date <= today).map(x => x.minutes || 0));

    return {
      days: days.length,
      workouts: workoutsThisWeek().length,
      habitPct: slots ? done / slots : 0,
      journalDays,
      trackedDays,
      sleepAvg: U.avg(sleepEntries.map(e => e.hours)),
      learnMinutes
    };
  }

  /** Anstehende Termine: Ziel-Deadlines + Prüfungen (nächste 60 Tage) */
  function upcoming() {
    const today = U.todayStr();
    const items = [];
    for (const g of state.goals) {
      if (!g.done && g.deadline) {
        const days = U.daysBetween(today, g.deadline);
        if (days >= -7 && days <= 60) items.push({ type: 'goal', icon: '🎯', title: g.title, date: g.deadline, days });
      }
    }
    for (const x of state.education.exams) {
      const days = U.daysBetween(today, x.date);
      if (days >= 0 && days <= 60 && (x.grade == null || isNaN(x.grade))) {
        items.push({ type: 'exam', icon: '🎓', title: x.title, date: x.date, days });
      }
    }
    return items.sort((a, b) => a.days - b.days).slice(0, 5);
  }

  /* ---------- XP / Level ---------- */

  const LEVEL_NAMES = [
    'Frischling', 'Starter', 'Dranbleiber', 'Macher', 'Durchzieher',
    'Disziplin-Profi', 'Grinder', 'Maschine', 'Unaufhaltbar', 'Legende'
  ];

  function xp() {
    let x = 0;
    x += state.workouts.length * 50;
    x += state.journal.length * 20;
    x += state.weights.length * 10;
    x += state.sleep.length * 10;
    x += state.goals.filter(g => g.done).length * 150;
    x += state.education.notes.length * 15;
    x += state.education.exams.length * 40;
    x += state.education.sessions.length * 15;
    x += state.runs.length * 40;
    for (const h of state.habits) x += Object.keys(h.log).length * 8;
    for (const day of Object.values(state.nutrition)) {
      if (day.entries && day.entries.length) x += 12;
    }
    return x;
  }

  function level() {
    const x = xp();
    const lvl = Math.floor(Math.sqrt(x / 120)) + 1;          // Level 2 ab 120 XP, 3 ab 480 …
    const cur = (lvl - 1) ** 2 * 120;
    const next = lvl ** 2 * 120;
    const name = LEVEL_NAMES[Math.min(lvl - 1, LEVEL_NAMES.length - 1)];
    return { lvl, name, xp: x, cur, next, pct: U.clamp((x - cur) / (next - cur), 0, 1) };
  }

  return {
    get, update, save, exportJSON, importJSON, reset,
    nutritionDay, nutritionTotals, latestWeight, habitStreak,
    workoutsThisWeek, spentInMonth, incomeInMonth, lastSleep,
    weekStats, upcoming, xp, level
  };
})();
