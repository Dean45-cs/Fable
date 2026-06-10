/* ============================================================
   IchApp – Utilities
   ============================================================ */

const U = (() => {

  const WEEKDAYS = ['Sonntag','Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag'];
  const WEEKDAYS_SHORT = ['So','Mo','Di','Mi','Do','Fr','Sa'];
  const MONTHS = ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];

  /** Eindeutige ID */
  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  /** Datum -> 'YYYY-MM-DD' (lokale Zeitzone) */
  function dateStr(d) {
    const x = d instanceof Date ? d : new Date(d);
    const y = x.getFullYear();
    const m = String(x.getMonth() + 1).padStart(2, '0');
    const day = String(x.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  function todayStr() { return dateStr(new Date()); }

  /** 'YYYY-MM-DD' -> Date (lokale Mitternacht) */
  function parseDate(s) {
    const [y, m, d] = s.split('-').map(Number);
    return new Date(y, m - 1, d);
  }

  function addDays(s, n) {
    const d = parseDate(s);
    d.setDate(d.getDate() + n);
    return dateStr(d);
  }

  /** Differenz in Tagen (b - a) */
  function daysBetween(a, b) {
    return Math.round((parseDate(b) - parseDate(a)) / 86400000);
  }

  /** 'YYYY-MM-DD' -> 'Mo, 10. Juni' */
  function fmtDate(s, withYear) {
    if (!s) return '–';
    const d = parseDate(s);
    let out = `${WEEKDAYS_SHORT[d.getDay()]}, ${d.getDate()}. ${MONTHS[d.getMonth()]}`;
    if (withYear) out += ` ${d.getFullYear()}`;
    return out;
  }

  /** 'Heute' / 'Gestern' / Datum */
  function fmtDateRel(s) {
    const t = todayStr();
    if (s === t) return 'Heute';
    if (s === addDays(t, -1)) return 'Gestern';
    if (s === addDays(t, 1)) return 'Morgen';
    return fmtDate(s, parseDate(s).getFullYear() !== new Date().getFullYear());
  }

  /** Langes Datum: 'Mittwoch, 10. Juni 2026' */
  function fmtDateLong(s) {
    const d = s ? parseDate(s) : new Date();
    return `${WEEKDAYS[d.getDay()]}, ${d.getDate()}. ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  }

  /** Letzte n Tage als Array von 'YYYY-MM-DD', endend heute */
  function lastNDays(n) {
    const out = [];
    for (let i = n - 1; i >= 0; i--) out.push(addDays(todayStr(), -i));
    return out;
  }

  /** Montag der Woche des Datums */
  function startOfWeek(s) {
    const d = parseDate(s);
    const diff = (d.getDay() + 6) % 7; // Mo = 0
    return addDays(s, -diff);
  }

  /** 'YYYY-MM' des Datums */
  function monthKey(s) { return s.slice(0, 7); }

  /** Geld formatieren */
  function fmtMoney(n) {
    return (n < 0 ? '−' : '') + Math.abs(n).toLocaleString('de-DE', {
      minimumFractionDigits: 2, maximumFractionDigits: 2
    }) + ' €';
  }

  /** Zahl mit max. 1 Nachkommastelle */
  function fmtNum(n, digits) {
    if (n == null || isNaN(n)) return '–';
    return n.toLocaleString('de-DE', { maximumFractionDigits: digits == null ? 1 : digits });
  }

  /** Eingabe-String -> Zahl ('72,5' und '72.5' funktionieren) */
  function num(v) {
    if (typeof v === 'number') return v;
    if (v == null) return NaN;
    const s = String(v).trim().replace(/\s/g, '').replace(',', '.');
    return s === '' ? NaN : Number(s);
  }

  /** HTML escapen (für alle Nutzereingaben!) */
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  /** Minuten -> '7h 30m' */
  function fmtHours(h) {
    if (h == null || isNaN(h)) return '–';
    const totalMin = Math.round(h * 60);
    const hh = Math.floor(totalMin / 60);
    const mm = totalMin % 60;
    return mm ? `${hh}h ${mm}m` : `${hh}h`;
  }

  /** Schlafdauer aus Bettzeit + Aufstehzeit ('23:30','07:00') in Stunden */
  function sleepDuration(bed, wake) {
    if (!bed || !wake) return NaN;
    const [bh, bm] = bed.split(':').map(Number);
    const [wh, wm] = wake.split(':').map(Number);
    let mins = (wh * 60 + wm) - (bh * 60 + bm);
    if (mins <= 0) mins += 24 * 60;
    return mins / 60;
  }

  function clamp(n, lo, hi) { return Math.min(hi, Math.max(lo, n)); }

  function sum(arr) { return arr.reduce((a, b) => a + b, 0); }

  function avg(arr) { return arr.length ? sum(arr) / arr.length : NaN; }

  function sortByDateDesc(arr, key) {
    key = key || 'date';
    return [...arr].sort((a, b) => (a[key] < b[key] ? 1 : a[key] > b[key] ? -1 : 0));
  }

  return {
    uid, dateStr, todayStr, parseDate, addDays, daysBetween,
    fmtDate, fmtDateRel, fmtDateLong, lastNDays, startOfWeek, monthKey,
    fmtMoney, fmtNum, num, esc, fmtHours, sleepDuration,
    clamp, sum, avg, sortByDateDesc,
    WEEKDAYS, WEEKDAYS_SHORT, MONTHS
  };
})();
