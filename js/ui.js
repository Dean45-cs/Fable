/* ============================================================
   IchApp – UI-Komponenten (Modal, Toast, Formular-Helfer)
   ============================================================ */

const UI = (() => {

  const backdrop = () => document.getElementById('modalBackdrop');
  const modalBody = () => document.getElementById('modalBody');
  const modalTitle = () => document.getElementById('modalTitle');

  /**
   * Modal öffnen.
   * openModal('Titel', '<form>…</form>', body => { /* Listener anbinden *\/ })
   */
  function openModal(title, bodyHtml, onMount) {
    modalTitle().textContent = title;
    modalBody().innerHTML = bodyHtml;
    backdrop().hidden = false;
    document.body.style.overflow = 'hidden';
    if (onMount) onMount(modalBody());
    // Erstes Eingabefeld fokussieren
    const first = modalBody().querySelector('input, select, textarea');
    if (first) setTimeout(() => first.focus(), 50);
  }

  function closeModal() {
    backdrop().hidden = true;
    modalBody().innerHTML = '';
    document.body.style.overflow = '';
  }

  /** Toast-Nachricht unten anzeigen */
  function toast(msg, type) {
    const wrap = document.getElementById('toastWrap');
    const el = document.createElement('div');
    el.className = 'toast' + (type ? ' ' + type : '');
    el.innerHTML = msg;
    wrap.appendChild(el);
    setTimeout(() => {
      el.classList.add('out');
      setTimeout(() => el.remove(), 350);
    }, 2400);
  }

  /** Erfolg + XP-Feedback */
  function reward(msg, xpAmount) {
    toast('✅ ' + msg, 'success');
    if (xpAmount) setTimeout(() => toast(`⚡ +${xpAmount} XP`, 'xp'), 250);
  }

  /** Bestätigungs-Dialog */
  function confirmDlg(msg, onYes) {
    openModal('Bist du sicher?', `
      <p style="margin-top:0">${msg}</p>
      <div class="form-actions">
        <button class="btn" id="cfNo">Abbrechen</button>
        <button class="btn danger" id="cfYes">Ja, löschen</button>
      </div>`, body => {
      body.querySelector('#cfNo').onclick = closeModal;
      body.querySelector('#cfYes').onclick = () => { closeModal(); onYes(); };
    });
  }

  /* ---------- Formular-Bausteine (HTML-Strings) ---------- */

  function field(label, inputHtml) {
    return `<label class="field"><span>${U.esc(label)}</span>${inputHtml}</label>`;
  }

  function textInput(id, value, placeholder, type) {
    return `<input type="${type || 'text'}" id="${id}" value="${U.esc(value == null ? '' : value)}" placeholder="${U.esc(placeholder || '')}">`;
  }

  function numInput(id, value, placeholder, step) {
    return `<input type="number" id="${id}" value="${value == null || value === '' ? '' : value}" placeholder="${U.esc(placeholder || '')}" step="${step || 'any'}" inputmode="decimal">`;
  }

  function dateInput(id, value) {
    return `<input type="date" id="${id}" value="${value || U.todayStr()}">`;
  }

  function timeInput(id, value) {
    return `<input type="time" id="${id}" value="${value || ''}">`;
  }

  function select(id, options, selected) {
    const opts = options.map(o => {
      const val = typeof o === 'string' ? o : o.value;
      const lab = typeof o === 'string' ? o : o.label;
      return `<option value="${U.esc(val)}" ${val === selected ? 'selected' : ''}>${U.esc(lab)}</option>`;
    }).join('');
    return `<select id="${id}">${opts}</select>`;
  }

  function textarea(id, value, placeholder) {
    return `<textarea id="${id}" placeholder="${U.esc(placeholder || '')}">${U.esc(value || '')}</textarea>`;
  }

  /** Mood-Picker (1–5). Liefert HTML; Wert per data-mood + .active */
  const MOODS = ['😞', '😕', '😐', '🙂', '🤩'];
  const MOOD_LABELS = ['Mies', 'Naja', 'Okay', 'Gut', 'Top'];

  function moodPicker(selected) {
    return `<div class="mood-picker" id="moodPicker">` + MOODS.map((m, i) =>
      `<button type="button" class="mood-btn ${selected === i + 1 ? 'active' : ''}" data-mood="${i + 1}" title="${MOOD_LABELS[i]}">${m}</button>`
    ).join('') + `</div>`;
  }

  function bindMoodPicker(body) {
    const picker = body.querySelector('#moodPicker');
    if (!picker) return;
    picker.addEventListener('click', e => {
      const btn = e.target.closest('.mood-btn');
      if (!btn) return;
      picker.querySelectorAll('.mood-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  }

  function getMood(body) {
    const active = body.querySelector('.mood-btn.active');
    return active ? Number(active.dataset.mood) : null;
  }

  function moodEmoji(m) { return MOODS[U.clamp((m || 3) - 1, 0, 4)]; }
  function moodLabel(m) { return MOOD_LABELS[U.clamp((m || 3) - 1, 0, 4)]; }

  /** Standard-Buttons "Abbrechen / Speichern" */
  function formActions(saveLabel) {
    return `<div class="form-actions">
      <button type="button" class="btn" id="formCancel">Abbrechen</button>
      <button type="submit" class="btn primary" id="formSave">${U.esc(saveLabel || 'Speichern')}</button>
    </div>`;
  }

  /** Formular-Verdrahtung: Cancel schließt, Submit ruft onSave */
  function bindForm(body, onSave) {
    const form = body.querySelector('form');
    const cancel = body.querySelector('#formCancel');
    if (cancel) cancel.onclick = closeModal;
    if (form) form.onsubmit = e => { e.preventDefault(); onSave(body); };
  }

  function val(body, id) {
    const el = body.querySelector('#' + id);
    return el ? el.value.trim() : '';
  }

  function numVal(body, id) {
    return U.num(val(body, id));
  }

  return {
    openModal, closeModal, toast, reward, confirmDlg,
    field, textInput, numInput, dateInput, timeInput, select, textarea,
    moodPicker, bindMoodPicker, getMood, moodEmoji, moodLabel, MOODS, MOOD_LABELS,
    formActions, bindForm, val, numVal
  };
})();
