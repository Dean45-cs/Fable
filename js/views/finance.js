/* ============================================================
   IchApp – Finanzen
   Kontostand, Ausgaben, Budget – mit Revolut-CSV-Import.
   ============================================================ */

window.Views = window.Views || {};

Views.finance = (() => {

  const CATEGORIES = ['Lebensmittel', 'Essen gehen', 'Fitness', 'Abos', 'Shopping', 'Transport', 'Freizeit', 'Drogerie', 'Wohnen', 'Gehalt', 'Sonstiges'];

  const CAT_KEYWORDS = {
    'Lebensmittel': ['rewe', 'lidl', 'aldi', 'edeka', 'netto', 'penny', 'kaufland', 'famila', 'citti'],
    'Essen gehen': ['mcdonald', 'burger', 'subway', 'pizza', 'kfc', 'doener', 'döner', 'restaurant', 'lieferando', 'wolt', 'cafe', 'bäcker', 'baecker'],
    'Fitness': ['gym', 'fitness', 'mcfit', 'fitx', 'clever fit', 'urban sports', 'supplement', 'myprotein', 'esn'],
    'Abos': ['spotify', 'netflix', 'disney', 'prime', 'youtube', 'icloud', 'playstation', 'xbox', 'crunchyroll', 'dazn'],
    'Transport': ['shell', 'aral', 'esso', 'jet ', 'tank', 'db ', 'bahn', 'hvv', 'nah.sh', 'bolt', 'uber', 'tier', 'voi'],
    'Drogerie': ['dm ', 'dm-', 'rossmann', 'mueller', 'müller'],
    'Shopping': ['amazon', 'zalando', 'h&m', 'zara', 'about you', 'snipes', 'mediamarkt', 'saturn'],
    'Gehalt': ['gehalt', 'lohn', 'salary', 'ausbildungsverg', 'verguetung', 'vergütung']
  };

  function guessCategory(desc, amount) {
    const d = (desc || '').toLowerCase();
    for (const [cat, words] of Object.entries(CAT_KEYWORDS)) {
      if (words.some(w => d.includes(w))) return cat;
    }
    return amount > 0 ? 'Gehalt' : 'Sonstiges';
  }

  function render(c) {
    const s = Store.get();
    const f = s.finance;
    const mk = U.monthKey(U.todayStr());
    const monthTx = f.transactions.filter(t => t.date.slice(0, 7) === mk);
    const spent = U.sum(monthTx.filter(t => t.amount < 0).map(t => -t.amount));
    const income = U.sum(monthTx.filter(t => t.amount > 0).map(t => t.amount));
    const budget = s.profile.monthlyBudget || 0;
    const left = budget - spent;

    // Ausgaben nach Kategorie (aktueller Monat)
    const byCat = {};
    for (const t of monthTx) {
      if (t.amount < 0) byCat[t.category || 'Sonstiges'] = (byCat[t.category || 'Sonstiges'] || 0) - t.amount;
    }
    const catItems = Object.entries(byCat)
      .sort((a, b) => b[1] - a[1])
      .map(([label, value]) => ({ label, value }));

    // Monatsvergleich (letzte 6 Monate)
    const monthBars = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = U.dateStr(d).slice(0, 7);
      monthBars.push({
        x: U.MONTHS[d.getMonth()].slice(0, 3),
        y: Math.round(Store.spentInMonth(key)),
        color: key === mk ? Charts.COLORS.accent : 'rgba(255,255,255,.18)'
      });
    }
    const hasMonths = monthBars.some(b => b.y > 0);

    const txSorted = U.sortByDateDesc(f.transactions).slice(0, 25);

    c.innerHTML = `
      <div class="grid grid-4">
        <div class="card glow"><div class="stat">
          <span class="stat-label">💳 Kontostand (Revolut)</span>
          <span class="stat-value">${f.balance != null ? U.fmtMoney(f.balance) : '–'}</span>
          <span class="stat-sub">${f.balanceDate ? 'Stand ' + U.fmtDateRel(f.balanceDate) : 'Noch nicht gesetzt'}</span>
        </div></div>
        <div class="card"><div class="stat">
          <span class="stat-label">Einnahmen ${U.MONTHS[now.getMonth()].slice(0, 3)}.</span>
          <span class="stat-value" style="color:var(--green)">+${U.fmtMoney(income)}</span>
        </div></div>
        <div class="card"><div class="stat">
          <span class="stat-label">Ausgaben ${U.MONTHS[now.getMonth()].slice(0, 3)}.</span>
          <span class="stat-value" style="color:var(--red)">−${U.fmtMoney(spent)}</span>
        </div></div>
        <div class="card"><div class="stat">
          <span class="stat-label">Budget übrig</span>
          <span class="stat-value" style="color:${left >= 0 ? 'var(--green)' : 'var(--red)'}">${U.fmtMoney(left)}</span>
          <div class="bar"><i class="${spent > budget ? 'orange' : 'green'}" style="width:${budget ? U.clamp(spent / budget * 100, 0, 100).toFixed(0) : 0}%"></i></div>
          <span class="stat-sub">von ${U.fmtMoney(budget)}</span>
        </div></div>
      </div>

      <div class="quick-actions">
        <button class="btn primary" id="addTx">💶 Ausgabe / Einnahme</button>
        <button class="btn" id="setBalance">💳 Kontostand setzen</button>
        <button class="btn" id="importCsv">📥 Revolut-CSV importieren</button>
      </div>

      <div class="grid grid-2 section-gap">
        <div class="card">
          <h3 class="card-title">📊 Ausgaben nach Kategorie (${U.MONTHS[now.getMonth()]})</h3>
          ${catItems.length ? Charts.hbars(catItems, { fmt: U.fmtMoney }) : `<div class="empty"><span class="empty-icon">📊</span>Noch keine Ausgaben diesen Monat.</div>`}
        </div>
        <div class="card">
          <h3 class="card-title">📅 Ausgaben pro Monat (€)</h3>
          ${hasMonths ? `<div class="chart-wrap">${Charts.bars(monthBars, { goal: budget || null, goalColor: Charts.COLORS.orange })}</div>`
                      : `<div class="empty"><span class="empty-icon">📅</span>Hier siehst du bald deinen Monatsvergleich.</div>`}
        </div>
      </div>

      <div class="card section-gap">
        <h3 class="card-title">🧾 Letzte Buchungen <span class="muted">${f.transactions.length} gesamt</span></h3>
        <div class="list">
          ${txSorted.length ? txSorted.map(t => `
            <div class="list-item">
              <span style="font-size:18px">${t.amount >= 0 ? '🟢' : '🔴'}</span>
              <div class="li-main">
                <div class="li-title">${U.esc(t.note || t.category)}</div>
                <div class="li-sub">${U.fmtDateRel(t.date)} · ${U.esc(t.category)}</div>
              </div>
              <div class="li-end" style="font-weight:700;color:${t.amount >= 0 ? 'var(--green)' : 'var(--text)'}">
                ${t.amount >= 0 ? '+' : '−'}${U.fmtMoney(Math.abs(t.amount)).replace('−', '')}
              </div>
              <div class="li-actions"><button class="icon-btn danger" data-del="${t.id}" title="Löschen">🗑</button></div>
            </div>`).join('') : `<div class="empty"><span class="empty-icon">🧾</span>Noch keine Buchungen. Trag deine erste Ausgabe ein oder importiere dein Revolut-CSV.</div>`}
        </div>
      </div>

      <div class="card section-gap" style="border-style:dashed">
        <h3 class="card-title">ℹ️ So holst du deine Revolut-Daten</h3>
        <p class="muted" style="margin:0">
          Revolut bietet für Privatkonten keine direkte App-Anbindung – aber den Export geht's easy:
          <b>Revolut-App → Konto → Auszug/Kontoauszug → Excel (CSV)</b> → Datei hier über
          „📥 Revolut-CSV importieren" hochladen. Buchungen werden automatisch kategorisiert,
          Duplikate übersprungen und dein Kontostand aktualisiert. Alles bleibt lokal auf deinem Gerät.
        </p>
      </div>
    `;

    c.querySelector('#addTx').onclick = () => openTxModal();
    c.querySelector('#setBalance').onclick = openBalanceModal;
    c.querySelector('#importCsv').onclick = openImportModal;
    c.querySelectorAll('[data-del]').forEach(b => b.onclick = () => {
      UI.confirmDlg('Buchung löschen?', () => {
        Store.update(st => st.finance.transactions = st.finance.transactions.filter(x => x.id !== b.dataset.del));
        App.refresh();
      });
    });
  }

  /* ---------- Buchung anlegen ---------- */

  function openTxModal() {
    UI.openModal('Buchung eintragen', `
      <form>
        <div class="form-row">
          ${UI.field('Art', UI.select('txType', [{ value: 'out', label: '🔴 Ausgabe' }, { value: 'in', label: '🟢 Einnahme' }], 'out'))}
          ${UI.field('Betrag (€)', UI.numInput('txAmount', '', 'z. B. 12,99'))}
        </div>
        <div class="form-row">
          ${UI.field('Kategorie', UI.select('txCat', CATEGORIES, 'Lebensmittel'))}
          ${UI.field('Datum', UI.dateInput('txDate'))}
        </div>
        ${UI.field('Beschreibung (optional)', UI.textInput('txNote', '', 'z. B. Wocheneinkauf REWE'))}
        ${UI.formActions('Buchen')}
      </form>
    `, body => {
      UI.bindForm(body, b => {
        const amt = UI.numVal(b, 'txAmount');
        if (isNaN(amt) || amt <= 0) { UI.toast('⚠️ Bitte gültigen Betrag eingeben'); return; }
        const sign = UI.val(b, 'txType') === 'in' ? 1 : -1;
        Store.update(st => {
          st.finance.transactions.push({
            id: U.uid(),
            date: UI.val(b, 'txDate') || U.todayStr(),
            amount: sign * amt,
            category: UI.val(b, 'txCat'),
            note: UI.val(b, 'txNote')
          });
          // Kontostand mitführen, wenn gesetzt
          if (st.finance.balance != null) {
            st.finance.balance += sign * amt;
            st.finance.balanceDate = U.todayStr();
          }
        });
        UI.closeModal();
        UI.toast('💶 Buchung gespeichert', 'success');
        App.refresh();
      });
    });
  }

  /* ---------- Kontostand ---------- */

  function openBalanceModal() {
    const f = Store.get().finance;
    UI.openModal('Kontostand setzen', `
      <form>
        ${UI.field('Aktueller Kontostand (€)', UI.numInput('balVal', f.balance != null ? f.balance : '', 'z. B. 1.234,56'))}
        <p class="muted" style="margin-top:0">Einfach den aktuellen Stand aus deiner Revolut-App abtippen. Neue Buchungen rechnen den Stand automatisch weiter.</p>
        ${UI.formActions()}
      </form>
    `, body => {
      UI.bindForm(body, b => {
        const v = UI.numVal(b, 'balVal');
        if (isNaN(v)) { UI.toast('⚠️ Bitte Betrag eingeben'); return; }
        Store.update(st => {
          st.finance.balance = v;
          st.finance.balanceDate = U.todayStr();
        });
        UI.closeModal();
        UI.toast('💳 Kontostand aktualisiert', 'success');
        App.refresh();
      });
    });
  }

  /* ---------- Revolut-CSV-Import ---------- */

  /** Einfacher CSV-Parser mit Anführungszeichen-Unterstützung */
  function parseCsv(text) {
    const rows = [];
    let row = [], field = '', inQuotes = false;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (inQuotes) {
        if (ch === '"') {
          if (text[i + 1] === '"') { field += '"'; i++; }
          else inQuotes = false;
        } else field += ch;
      } else {
        if (ch === '"') inQuotes = true;
        else if (ch === ',') { row.push(field); field = ''; }
        else if (ch === '\n' || ch === '\r') {
          if (ch === '\r' && text[i + 1] === '\n') i++;
          row.push(field); field = '';
          if (row.length > 1 || row[0] !== '') rows.push(row);
          row = [];
        } else field += ch;
      }
    }
    if (field !== '' || row.length) { row.push(field); rows.push(row); }
    return rows;
  }

  /** Revolut-Datum ('2026-06-01 12:34:56' oder '01/06/2026 …') -> 'YYYY-MM-DD' */
  function parseCsvDate(s) {
    if (!s) return null;
    s = s.trim();
    let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return `${m[1]}-${m[2]}-${m[3]}`;
    m = s.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})/);
    if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
    m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
    return null;
  }

  function importCsvText(text) {
    const rows = parseCsv(text);
    if (rows.length < 2) throw new Error('Die Datei scheint leer zu sein.');

    const header = rows[0].map(h => h.trim().toLowerCase());
    const idx = name => header.findIndex(h => h.includes(name));

    // Revolut-Spalten (englisch oder deutsch)
    const iDate = [idx('completed date'), idx('abschlussdatum'), idx('started date'), idx('startdatum'), idx('date'), idx('datum')].find(i => i >= 0);
    const iDesc = [idx('description'), idx('beschreibung')].find(i => i >= 0);
    const iAmount = [idx('amount'), idx('betrag')].find(i => i >= 0);
    const iBalance = [idx('balance'), idx('kontostand'), idx('saldo')].find(i => i >= 0);
    const iState = [idx('state'), idx('status')].find(i => i >= 0);

    if (iDate == null || iAmount == null) {
      throw new Error('Spalten nicht erkannt. Bitte das Original-CSV aus der Revolut-App verwenden.');
    }

    const s = Store.get();
    const existing = new Set(s.finance.transactions.map(t => t.importKey).filter(Boolean));
    const newTx = [];
    let lastBalance = null, lastBalanceDate = null;

    for (let r = 1; r < rows.length; r++) {
      const row = rows[r];
      if (row.length < header.length - 1) continue;
      const date = parseCsvDate(row[iDate]);
      const amount = U.num(row[iAmount]);
      if (!date || isNaN(amount) || amount === 0) continue;
      if (iState != null && row[iState] && !/completed|abgeschlossen/i.test(row[iState])) continue;

      const desc = iDesc != null ? (row[iDesc] || '').trim() : '';
      const key = `${date}|${amount}|${desc}`.slice(0, 120);
      if (existing.has(key)) continue;
      existing.add(key);

      newTx.push({
        id: U.uid(),
        date, amount,
        category: guessCategory(desc, amount),
        note: desc,
        importKey: key
      });

      if (iBalance != null) {
        const bal = U.num(row[iBalance]);
        if (!isNaN(bal) && (lastBalanceDate == null || date >= lastBalanceDate)) {
          lastBalance = bal; lastBalanceDate = date;
        }
      }
    }

    Store.update(st => {
      st.finance.transactions.push(...newTx);
      if (lastBalance != null) {
        st.finance.balance = lastBalance;
        st.finance.balanceDate = lastBalanceDate;
      }
    });

    return { added: newTx.length, balance: lastBalance };
  }

  function openImportModal() {
    UI.openModal('Revolut-CSV importieren', `
      <p class="muted" style="margin-top:0">
        In der Revolut-App: <b>Konto → Auszug → Excel (CSV)</b> exportieren und die Datei hier auswählen.
        Duplikate werden automatisch übersprungen.
      </p>
      ${UI.field('CSV-Datei', '<input type="file" id="csvFile" accept=".csv,text/csv">')}
      <div class="form-actions">
        <button class="btn" id="formCancel">Abbrechen</button>
      </div>
    `, body => {
      body.querySelector('#formCancel').onclick = UI.closeModal;
      body.querySelector('#csvFile').onchange = e => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
          try {
            const res = importCsvText(reader.result);
            UI.closeModal();
            UI.toast(`📥 ${res.added} Buchungen importiert${res.balance != null ? ' · Kontostand: ' + U.fmtMoney(res.balance) : ''}`, 'success');
            App.refresh();
          } catch (err) {
            UI.toast('⚠️ ' + err.message);
          }
        };
        reader.readAsText(file);
      };
    });
  }

  return { title: 'Finanzen', render, openTxModal, CATEGORIES };
})();
