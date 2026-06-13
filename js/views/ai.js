/* ============================================================
   IchApp – KI-Coach (Claude)
   Ein KI-Agent, der einmal über ALLES rübergeht: analysiert deine
   Daten, kategorisiert Finanzbuchungen automatisch und wertet
   deine Obsidian-Schulnotizen aus (Lernfelder, Lernplan).
   Braucht einen eigenen Claude-API-Key – der bleibt lokal im
   Browser und landet NICHT im Backup.
   ============================================================ */

window.Views = window.Views || {};

Views.ai = (() => {

  const KEY_STORAGE = 'ichapp.apikey';
  const MODEL = 'claude-opus-4-8';

  let busy = false;

  const getKey = () => localStorage.getItem(KEY_STORAGE) || '';
  const setKey = k => localStorage.setItem(KEY_STORAGE, k);

  /* ---------- Claude Messages API (direkt aus dem Browser) ---------- */

  async function callClaude({ system, user, maxTokens, outputSchema }) {
    const body = {
      model: MODEL,
      max_tokens: maxTokens || 4000,
      system,
      messages: [{ role: 'user', content: user }]
    };
    if (outputSchema) {
      body.output_config = { format: { type: 'json_schema', schema: outputSchema } };
    }

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': getKey(),
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      let msg = 'HTTP ' + res.status;
      try { msg = (await res.json()).error.message || msg; } catch (e) {}
      if (res.status === 401) throw new Error('API-Key ungültig – prüf ihn in den Einstellungen unten.');
      if (res.status === 429) throw new Error('Rate-Limit erreicht – kurz warten und nochmal probieren.');
      if (res.status === 529) throw new Error('Claude ist gerade überlastet – gleich nochmal probieren.');
      throw new Error(msg);
    }

    const data = await res.json();
    const text = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('');
    if (!text) throw new Error('Leere Antwort erhalten.');
    return text;
  }

  /* ---------- Daten-Zusammenfassung für die Analyse ---------- */

  function buildSummary() {
    const s = Store.get();
    const today = U.todayStr();
    const mk = U.monthKey(today);
    const week = Store.weekStats();
    const lvl = Store.level();

    const byCat = {};
    for (const t of s.finance.transactions) {
      if (t.date.slice(0, 7) === mk && t.amount < 0) {
        byCat[t.category] = Math.round((byCat[t.category] || 0) - t.amount);
      }
    }

    return {
      heute: today,
      profil: s.profile,
      level: { stufe: lvl.lvl, name: lvl.name, xp: lvl.xp },
      woche: {
        workouts: week.workouts, habitsQuote: Math.round(week.habitPct * 100) + '%',
        tagebuchTage: week.journalDays, ernaehrungGetrackt: week.trackedDays,
        schlafSchnittStunden: isNaN(week.sleepAvg) ? null : Math.round(week.sleepAvg * 10) / 10,
        lernzeitMinuten: week.learnMinutes
      },
      gewicht: U.sortByDateDesc(s.weights).slice(0, 10),
      workouts: U.sortByDateDesc(s.workouts).slice(0, 8).map(w => ({
        date: w.date, name: w.name,
        uebungen: w.exercises.map(e => e.name + ' ' + e.sets.map(x => `${x.kg}x${x.reps}`).join('/'))
      })),
      laeufe: U.sortByDateDesc(s.runs).slice(0, 8).map(r => ({
        date: r.date, km: Math.round(r.distance / 100) / 10, minuten: Math.round(r.duration / 60)
      })),
      ziele: s.goals.map(g => ({
        titel: g.title, typ: g.type, deadline: g.deadline, erledigt: g.done,
        fortschritt: Math.round(Views.dashboard.goalPct(g) * 100) + '%'
      })),
      finanzen: {
        kontostand: s.finance.balance,
        monatsbudget: s.profile.monthlyBudget,
        ausgabenDiesenMonat: Math.round(Store.spentInMonth(mk)),
        einnahmenDiesenMonat: Math.round(Store.incomeInMonth(mk)),
        ausgabenNachKategorie: byCat
      },
      ernaehrung7Tage: U.lastNDays(7).map(d => ({ date: d, ...Store.nutritionTotals(d) })),
      schlaf: U.sortByDateDesc(s.sleep).slice(0, 7),
      habits: s.habits.map(h => ({
        name: h.name, streak: Store.habitStreak(h),
        erledigt30Tage: U.lastNDays(30).filter(d => h.log[d]).length
      })),
      tagebuch: U.sortByDateDesc(s.journal).slice(0, 7).map(j => ({
        date: j.date, stimmung: j.mood + '/5',
        text: (j.text || '').slice(0, 250), highlight: j.highlight
      })),
      ausbildung: {
        notenschnitt: (() => { const a = Store.overallGradeAvg(); return isNaN(a) ? null : Math.round(a * 100) / 100; })(),
        faecher: s.education.subjects.map(f => {
          const a = Store.subjectAvg(f.id);
          return { name: f.name, sicherheit: (f.progress || 0) + '%', schnitt: isNaN(a) ? null : Math.round(a * 10) / 10 };
        }),
        pruefungen: s.education.exams,
        projekte: s.education.projects,
        lernthemen: s.education.topics,
        notizenAnzahl: s.education.notes.length
      }
    };
  }

  /* ---------- Aktionen ---------- */

  async function runAnalysis() {
    const summary = buildSummary();
    return callClaude({
      maxTokens: 4000,
      system: `Du bist der persönliche KI-Coach von Kevin (19, Azubi als Kaufmann für Dialogmarketing in Kiel, geht ins Gym, fängt mit dem Laufen an). Du bekommst seine kompletten Lifetracking-Daten als JSON.
Antworte auf Deutsch, per Du, direkt und motivierend, aber ehrlich – beschönige nichts. Stütze jede Aussage auf konkrete Zahlen aus den Daten.
Gliedere deine Antwort in Markdown:
## 🔍 Gesamtbild (3–4 Sätze)
## 💪 Das läuft stark (Bullet-Points mit Zahlen)
## ⚠️ Schwachstellen & Muster (Bullet-Points mit Zahlen, auch Zusammenhänge zwischen Bereichen, z. B. Schlaf ↔ Stimmung)
## 🎯 Deine Top-5-Aufgaben für nächste Woche (priorisiert, konkret messbar)
## ⚡ Schlusswort (1–2 Sätze, motivierend)`,
      user: 'Hier sind meine aktuellen Daten:\n\n' + JSON.stringify(summary)
    });
  }

  async function runCategorize() {
    const s = Store.get();
    const cats = Views.finance.CATEGORIES;
    const todo = s.finance.transactions
      .filter(t => !t.category || t.category === 'Sonstiges')
      .slice(0, 80)
      .map(t => ({ id: t.id, beschreibung: t.note || '', betrag: t.amount }));

    if (!todo.length) return { applied: 0, msg: 'Alle Buchungen sind bereits kategorisiert – nichts zu tun. ✅' };

    const text = await callClaude({
      maxTokens: 4000,
      system: `Du kategorisierst Banktransaktionen eines deutschen Azubis aus Kiel. Wähle für jede Transaktion die passendste Kategorie. Positive Beträge sind Einnahmen (meist "Gehalt"). Antworte ausschließlich mit dem geforderten JSON.`,
      user: `Kategorien: ${cats.join(', ')}\n\nTransaktionen:\n${JSON.stringify(todo)}`,
      outputSchema: {
        type: 'object',
        properties: {
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                category: { type: 'string', enum: cats }
              },
              required: ['id', 'category'],
              additionalProperties: false
            }
          }
        },
        required: ['items'],
        additionalProperties: false
      }
    });

    const parsed = JSON.parse(text);
    let applied = 0;
    Store.update(st => {
      for (const item of parsed.items || []) {
        const t = st.finance.transactions.find(x => x.id === item.id);
        if (t && cats.includes(item.category) && t.category !== item.category) {
          t.category = item.category;
          applied++;
        }
      }
    });
    return { applied, msg: `**${applied} Buchungen** automatisch kategorisiert. Schau in den Finanzen vorbei – die Kategorie-Auswertung ist jetzt aussagekräftiger. 💶` };
  }

  async function runSchoolAnalysis() {
    const s = Store.get();
    const vault = Views.obsidian.getVaultFiles();

    let docs = '';
    let source = '';
    if (vault && vault.length) {
      source = `${vault.length} Obsidian-Notizen`;
      let budget = 45000;
      for (const f of vault) {
        const chunk = `\n\n### Datei: ${f.path}${f.tags.length ? ' (Tags: ' + f.tags.join(', ') + ')' : ''}\n${f.content.slice(0, 1500)}`;
        if (budget - chunk.length < 0) break;
        budget -= chunk.length;
        docs += chunk;
      }
    } else if (s.education.notes.length) {
      source = `${s.education.notes.length} App-Notizen`;
      docs = s.education.notes.map(n => `\n\n### ${n.title} (${n.tag || 'ohne Tag'})\n${n.content.slice(0, 1500)}`).join('');
    } else {
      throw new Error('Keine Notizen gefunden. Verbinde erst deinen Obsidian-Ordner (📂 Obsidian) oder leg Notizen unter Ausbildung an.');
    }

    return callClaude({
      maxTokens: 4500,
      system: `Du bist Lern-Coach für Kevin, Azubi als Kaufmann für Dialogmarketing (IHK, Berufsschule in Kiel). Du bekommst seine Schul-/Lernnotizen und seine Prüfungstermine.
Antworte auf Deutsch in Markdown:
## 📚 Kategorisierung
Ordne die Notizen sinnvollen Themenblöcken/Lernfeldern zu (Tabelle: Thema | zugehörige Notizen).
## 🏷️ Vorschlag: Tags & Ordnerstruktur
Konkrete Obsidian-Tags und eine Ordnerstruktur, die zu den Inhalten passt.
## 🧠 Kernaussagen
Die 5–8 wichtigsten Inhalte aus den Notizen, kurz zusammengefasst.
## 🕳️ Lücken
Welche prüfungsrelevanten Themen fehlen oder sind zu dünn?
## 📅 Lernplan (2 Wochen)
Konkreter Plan mit Tagen, berücksichtige die Prüfungstermine.`,
      user: `Anstehende Prüfungen: ${JSON.stringify(s.education.exams.filter(x => x.date >= U.todayStr()))}
Lernthemen mit Fortschritt: ${JSON.stringify(s.education.topics)}

Meine Notizen (${source}):${docs}`
    });
  }

  /* ---------- Render ---------- */

  function saveOutput(title, text) {
    Store.update(st => st.aiLast = { title, text, date: U.todayStr() });
  }

  async function runAction(c, btnId, title, fn) {
    if (busy) return;
    busy = true;
    const btn = c.querySelector('#' + btnId);
    const orig = btn.textContent;
    btn.textContent = '🤔 Claude denkt nach…';
    btn.disabled = true;
    try {
      const result = await fn();
      if (typeof result === 'string') {
        saveOutput(title, result);
        UI.toast('✅ Fertig!', 'success');
      } else {
        saveOutput(title, result.msg);
        UI.toast('✅ Fertig!', 'success');
      }
    } catch (e) {
      UI.toast('⚠️ ' + e.message);
    } finally {
      busy = false;
      btn.textContent = orig;
      btn.disabled = false;
      App.refresh();
    }
  }

  function render(c) {
    const key = getKey();
    const last = Store.get().aiLast;

    if (!key) {
      c.innerHTML = `
        <div class="hero" style="text-align:center;padding:48px 24px">
          <div style="font-size:48px;margin-bottom:8px">🤖</div>
          <h2>Dein KI-Coach</h2>
          <p class="quote" style="margin:8px auto 24px;max-width:580px">
            Lass Claude einmal über <b>alles</b> rübergehen: deine Trainings-, Schlaf-, Finanz- und Schuldaten
            analysieren, Buchungen automatisch kategorisieren und aus deinen Obsidian-Notizen einen Lernplan bauen.
          </p>
          <div style="max-width:420px;margin:0 auto;text-align:left">
            ${UI.field('Dein Claude-API-Key', UI.textInput('aiKey', '', 'sk-ant-…'))}
            <button class="btn primary block" id="saveKey">Key speichern & loslegen</button>
          </div>
          <p class="muted" style="margin-top:24px;max-width:560px;margin-left:auto;margin-right:auto">
            Den Key bekommst du auf <b>console.anthropic.com</b> (Konto anlegen → API Keys). Eine Analyse kostet
            nur wenige Cent. Der Key wird nur lokal in deinem Browser gespeichert und landet <b>nicht</b> im Backup.
            Beim Ausführen einer Analyse werden deine Daten an die Claude-API von Anthropic geschickt.
          </p>
        </div>
      `;
      c.querySelector('#saveKey').onclick = () => {
        const k = c.querySelector('#aiKey').value.trim();
        if (!k.startsWith('sk-ant-')) { UI.toast('⚠️ Das sieht nicht nach einem Claude-Key aus (beginnt mit sk-ant-)'); return; }
        setKey(k);
        UI.toast('🔑 Key gespeichert', 'success');
        App.refresh();
      };
      return;
    }

    const vault = Views.obsidian.getVaultFiles();

    c.innerHTML = `
      <div class="grid grid-3">
        <div class="card">
          <h3 class="card-title">🧠 Komplett-Analyse</h3>
          <p class="muted" style="margin-top:0">Claude geht über alle deine Daten: Was läuft, was nicht, was du nächste Woche konkret tun solltest.</p>
          <button class="btn primary block" id="actAnalyze">Analyse starten</button>
        </div>
        <div class="card">
          <h3 class="card-title">💶 Finanzen kategorisieren</h3>
          <p class="muted" style="margin-top:0">Sortiert alle Buchungen mit Kategorie „Sonstiges" automatisch in die richtige Kategorie ein.</p>
          <button class="btn primary block" id="actCategorize">Kategorisieren</button>
        </div>
        <div class="card">
          <h3 class="card-title">🎓 Schul-Coach</h3>
          <p class="muted" style="margin-top:0">${vault ? `Analysiert deine ${vault.length} Obsidian-Notizen` : 'Analysiert deine Notizen'}: Lernfelder, Tags, Lücken + 2-Wochen-Lernplan.</p>
          <button class="btn primary block" id="actSchool">Notizen analysieren</button>
        </div>
      </div>

      ${last ? `
      <div class="card section-gap">
        <h3 class="card-title">📋 ${U.esc(last.title)} <span class="muted">${U.fmtDateRel(last.date)}</span></h3>
        <div class="md">${Views.obsidian.mdToHtml(last.text)}</div>
      </div>` : `
      <div class="card section-gap">
        <div class="empty" style="padding:60px 20px">
          <span class="empty-icon">🤖</span>
          Starte oben eine Aktion – das Ergebnis erscheint hier und bleibt gespeichert.
        </div>
      </div>`}

      <div class="card section-gap" style="border-style:dashed">
        <h3 class="card-title">⚙️ API-Key</h3>
        <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center">
          <span class="pill green">🔑 Verbunden (${U.esc(key.slice(0, 12))}…)</span>
          <span class="muted">Modell: ${MODEL}</span>
          <span class="spacer"></span>
          <button class="btn small danger" id="delKey">Key löschen</button>
        </div>
        <p class="muted" style="margin-bottom:0">Hinweis: Beim Ausführen werden deine Daten (bzw. Notiz-Auszüge) an die Claude-API von Anthropic gesendet. Sonst verlässt nichts dein Gerät.</p>
      </div>
    `;

    c.querySelector('#actAnalyze').onclick = () => runAction(c, 'actAnalyze', 'Komplett-Analyse', runAnalysis);
    c.querySelector('#actCategorize').onclick = () => runAction(c, 'actCategorize', 'Finanz-Kategorisierung', runCategorize);
    c.querySelector('#actSchool').onclick = () => runAction(c, 'actSchool', 'Schul-Analyse & Lernplan', runSchoolAnalysis);
    c.querySelector('#delKey').onclick = () => UI.confirmDlg('API-Key wirklich löschen?', () => {
      localStorage.removeItem(KEY_STORAGE);
      App.refresh();
    });
  }

  return { title: 'KI-Coach', render };
})();
