/* ============================================================
   IchApp – Icon-Set
   Feine Linien-Icons im Stil der Seitenleiste (Apple/SF-Symbols-
   Anmutung) statt bunter Emojis. Aufruf: Icon('name', size)
   Alle nutzen currentColor – Farbe kommt also vom Elternelement.
   ============================================================ */

const Icon = (() => {

  const P = {
    // Navigation & Schule
    calendar:  '<rect x="3" y="4.5" width="18" height="16" rx="2.5"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="8" y1="2.5" x2="8" y2="6.5"/><line x1="16" y1="2.5" x2="16" y2="6.5"/>',
    timetable: '<rect x="3" y="4.5" width="18" height="16" rx="2.5"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="8" y1="2.5" x2="8" y2="6.5"/><line x1="16" y1="2.5" x2="16" y2="6.5"/><line x1="7.5" y1="13" x2="10.5" y2="13"/><line x1="13.5" y1="13" x2="16.5" y2="13"/><line x1="7.5" y1="16.5" x2="10.5" y2="16.5"/><line x1="13.5" y1="16.5" x2="16.5" y2="16.5"/>',
    book:      '<path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v17.5H6.5A2.5 2.5 0 0 0 4 22z"/><path d="M20 19.5H6.5A2.5 2.5 0 0 1 4 17"/><line x1="9" y1="7" x2="16" y2="7"/>',
    cap:       '<path d="m2 9 10-5 10 5-10 5z"/><path d="M6.5 11.5V16c0 1.4 2.5 2.8 5.5 2.8s5.5-1.4 5.5-2.8v-4.5"/><path d="M22 9v5.5"/>',
    clipboard: '<rect x="5" y="4" width="14" height="17" rx="2.5"/><rect x="9" y="2.5" width="6" height="3.4" rx="1.3"/><line x1="8.5" y1="11" x2="15.5" y2="11"/><line x1="8.5" y1="14.5" x2="13" y2="14.5"/>',
    note:      '<path d="M6 3.5h7l5 5V20a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1z"/><path d="M13 3.5V9h5"/><line x1="8.5" y1="13" x2="14" y2="13"/><line x1="8.5" y1="16.5" x2="14" y2="16.5"/>',
    clock:     '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3.5 2"/>',
    folder:    '<path d="M3 7.5A1.5 1.5 0 0 1 4.5 6h4l2 2.5h9A1.5 1.5 0 0 1 21 10v8a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18z"/>',
    briefcase: '<rect x="3" y="7.5" width="18" height="12" rx="2.5"/><path d="M8.5 7.5V6a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v1.5"/><line x1="3" y1="12.5" x2="21" y2="12.5"/>',
    building:  '<path d="M4 21h16"/><path d="M5 21V8.5l7-4 7 4V21"/><path d="M9.5 21v-4h5v4"/><circle cx="9" cy="11" r=".7" fill="currentColor" stroke="none"/><circle cx="15" cy="11" r=".7" fill="currentColor" stroke="none"/>',
    chart:     '<line x1="4" y1="20" x2="20.5" y2="20"/><rect x="5.5" y="11" width="3.3" height="7" rx="1"/><rect x="10.4" y="6" width="3.3" height="12" rx="1"/><rect x="15.3" y="13" width="3.3" height="5" rx="1"/>',

    // Aktionen
    plus:    '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
    minus:   '<line x1="5" y1="12" x2="19" y2="12"/>',
    pencil:  '<path d="M4 20l.8-3.6L15 6.2a1.6 1.6 0 0 1 2.3 0l.7.7a1.6 1.6 0 0 1 0 2.3L7.6 19.2 4 20z"/><line x1="13.6" y1="7.6" x2="16.6" y2="10.6"/>',
    trash:   '<line x1="4" y1="7" x2="20" y2="7"/><path d="M9.5 7V4.8a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1V7"/><path d="M6.2 7l.9 12.4a1.5 1.5 0 0 0 1.5 1.4h6.8a1.5 1.5 0 0 0 1.5-1.4L17.8 7"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/>',
    search:  '<circle cx="11" cy="11" r="7"/><line x1="16.5" y1="16.5" x2="21" y2="21"/>',
    sparkles:'<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M18.5 14.5l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z"/>',
    check:   '<path d="M5 12.5l4.5 4.5L19 7"/>',
    checkCircle: '<circle cx="12" cy="12" r="8.5"/><path d="M8.4 12.2l2.4 2.4 4.8-5"/>',
    dot:     '<circle cx="12" cy="12" r="5" fill="currentColor" stroke="none"/>',
    chevronLeft: '<path d="M14.5 5.5L8 12l6.5 6.5"/>'
  };

  function icon(name, size, cls) {
    const inner = P[name] || P.dot;
    const s = size || 18;
    return `<svg class="ic ${cls || ''}" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" ` +
      `stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;
  }

  return icon;
})();
