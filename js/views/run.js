/* ============================================================
   IchApp – Laufen
   Ein Knopf, los geht's: Live-GPS-Tracking (Strecke, Pace, Zeit),
   Routenplaner auf OpenStreetMap-Karte, GPX-Import für
   Apple-Watch-Workouts und GPX-Export.
   ============================================================ */

window.Views = window.Views || {};

Views.run = (() => {

  /* ---------- Geo-Mathematik ---------- */

  /** Distanz zwischen zwei Koordinaten in Metern (Haversine) */
  function haversine(lat1, lon1, lat2, lon2) {
    const R = 6371000;
    const toRad = x => x * Math.PI / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(a));
  }

  function trackDistance(points) {
    let d = 0;
    for (let i = 1; i < points.length; i++) {
      d += haversine(points[i - 1][0], points[i - 1][1], points[i][0], points[i][1]);
    }
    return d;
  }

  /** Pace (s/km) formatieren: 330 -> '5:30 /km' */
  function fmtPace(secPerKm) {
    if (!isFinite(secPerKm) || secPerKm <= 0) return '–';
    const total = Math.round(secPerKm);
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${m}:${String(s).padStart(2, '0')} /km`;
  }

  function fmtDuration(sec) {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = Math.floor(sec % 60);
    return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(s).padStart(2, '0');
  }

  /** Kilometer-Splits (s pro km) aus Punkten [[lat,lon,t(ms)],…] */
  function computeSplits(points) {
    const splits = [];
    let dist = 0, kmStartT = points.length ? points[0][2] : 0;
    for (let i = 1; i < points.length; i++) {
      dist += haversine(points[i - 1][0], points[i - 1][1], points[i][0], points[i][1]);
      if (dist >= (splits.length + 1) * 1000) {
        splits.push((points[i][2] - kmStartT) / 1000);
        kmStartT = points[i][2];
      }
    }
    return splits;
  }

  /** Mini-SVG der Strecke (Polyline, normalisiert) */
  function routeSvg(points, size, color) {
    if (!points || points.length < 2) return '';
    size = size || 120;
    const lats = points.map(p => p[0]), lons = points.map(p => p[1]);
    const minLat = Math.min(...lats), maxLat = Math.max(...lats);
    const minLon = Math.min(...lons), maxLon = Math.max(...lons);
    // Längengrade je nach Breite stauchen, damit die Form stimmt
    const latScale = Math.cos((minLat + maxLat) / 2 * Math.PI / 180);
    const w = (maxLon - minLon) * latScale || 1e-9;
    const h = (maxLat - minLat) || 1e-9;
    const scale = (size - 12) / Math.max(w, h);
    const pts = points.map(p => {
      const x = 6 + ((p[1] - minLon) * latScale) * scale + (Math.max(w, h) - w) * scale / 2;
      const y = 6 + (maxLat - p[0]) * scale + (Math.max(w, h) - h) * scale / 2;
      return x.toFixed(1) + ',' + y.toFixed(1);
    }).join(' ');
    return `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
      <polyline points="${pts}" fill="none" stroke="${color || '#30d158'}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="${pts.split(' ')[0].split(',')[0]}" cy="${pts.split(' ')[0].split(',')[1]}" r="3.5" fill="#30d158"/>
    </svg>`;
  }

  /* ---------- Live-Tracking ---------- */

  const live = {
    active: false,
    points: [],        // [lat, lon, t(ms)]
    startT: 0,
    watchId: null,
    timer: null,
    wakeLock: null,
    routeId: null      // optional: geplante Route
  };

  async function startRun() {
    if (!('geolocation' in navigator)) {
      UI.toast('⚠️ Dein Browser unterstützt kein GPS'); return;
    }
    if (!window.isSecureContext) {
      UI.toast('⚠️ GPS braucht HTTPS oder localhost – siehe Info-Karte unten');
      return;
    }
    live.active = true;
    live.points = [];
    live.startT = Date.now();
    live.watchId = navigator.geolocation.watchPosition(pos => {
      if (pos.coords.accuracy > 50) return; // ungenaue Punkte verwerfen
      live.points.push([pos.coords.latitude, pos.coords.longitude, Date.now()]);
    }, err => {
      UI.toast('⚠️ GPS-Fehler: ' + err.message);
      if (err.code === 1) stopRun(false);
    }, { enableHighAccuracy: true, maximumAge: 1000, timeout: 15000 });

    // Display anlassen (best effort)
    try { live.wakeLock = await navigator.wakeLock.request('screen'); } catch (e) { /* nicht überall verfügbar */ }

    live.timer = setInterval(updateLiveUI, 1000);
    App.refresh();
  }

  function updateLiveUI() {
    const el = document.getElementById('liveStats');
    if (!el) return;
    const sec = (Date.now() - live.startT) / 1000;
    const dist = trackDistance(live.points);
    const pace = dist > 30 ? sec / (dist / 1000) : NaN;
    // Aktuelle Pace über die letzten ~200 m
    let curPace = NaN;
    if (live.points.length > 2) {
      let d = 0, i = live.points.length - 1;
      while (i > 0 && d < 200) {
        d += haversine(live.points[i - 1][0], live.points[i - 1][1], live.points[i][0], live.points[i][1]);
        i--;
      }
      if (d > 30) curPace = (live.points[live.points.length - 1][2] - live.points[i][2]) / 1000 / (d / 1000);
    }
    const route = live.routeId ? Store.get().routes.find(r => r.id === live.routeId) : null;

    el.innerHTML = `
      <div class="grid grid-3" style="text-align:center">
        <div><div class="stat-label">Zeit</div><div class="run-big">${fmtDuration(sec)}</div></div>
        <div><div class="stat-label">Distanz</div><div class="run-big">${U.fmtNum(dist / 1000, 2)} <small>km</small></div></div>
        <div><div class="stat-label">Ø Pace</div><div class="run-big" style="font-size:26px">${fmtPace(pace)}</div></div>
      </div>
      <div class="muted" style="text-align:center;margin-top:8px">
        Aktuelle Pace: <b>${fmtPace(curPace)}</b> · GPS-Punkte: ${live.points.length}
        ${route ? ` · Route „${U.esc(route.name)}“: ${Math.round(U.clamp(dist / route.distance, 0, 1) * 100)} %` : ''}
      </div>
      ${route ? `<div class="bar"><i class="green" style="width:${(U.clamp(dist / route.distance, 0, 1) * 100).toFixed(0)}%"></i></div>` : ''}`;
  }

  function stopRun(save) {
    if (live.watchId != null) navigator.geolocation.clearWatch(live.watchId);
    clearInterval(live.timer);
    if (live.wakeLock) { try { live.wakeLock.release(); } catch (e) {} }
    live.active = false;

    const sec = (Date.now() - live.startT) / 1000;
    const dist = trackDistance(live.points);

    if (save && dist > 50) {
      const run = {
        id: U.uid(),
        date: U.todayStr(),
        name: 'Lauf',
        duration: Math.round(sec),
        distance: Math.round(dist),
        points: live.points,
        splits: computeSplits(live.points)
      };
      Store.update(st => st.runs.push(run));
      UI.reward(`Lauf gespeichert: ${U.fmtNum(dist / 1000, 2)} km in ${fmtDuration(sec)} 🏃`, 40);
    } else if (save) {
      UI.toast('Zu kurz zum Speichern (min. 50 m) – Lauf verworfen');
    }
    live.points = [];
    App.refresh();
  }

  /* ---------- GPX Import / Export ---------- */

  function parseGpx(xmlText) {
    const doc = new DOMParser().parseFromString(xmlText, 'application/xml');
    if (doc.querySelector('parsererror')) throw new Error('Keine gültige GPX-Datei.');
    const trkpts = [...doc.querySelectorAll('trkpt')];
    if (trkpts.length < 2) throw new Error('Keine Streckenpunkte (trkpt) gefunden.');
    const points = trkpts.map(pt => {
      const timeEl = pt.querySelector('time');
      return [
        parseFloat(pt.getAttribute('lat')),
        parseFloat(pt.getAttribute('lon')),
        timeEl ? new Date(timeEl.textContent).getTime() : 0
      ];
    }).filter(p => isFinite(p[0]) && isFinite(p[1]));

    const nameEl = doc.querySelector('trk > name, name');
    const hasTime = points[0][2] > 0 && points[points.length - 1][2] > 0;
    const duration = hasTime ? Math.round((points[points.length - 1][2] - points[0][2]) / 1000) : 0;
    const date = hasTime ? U.dateStr(new Date(points[0][2])) : U.todayStr();

    return {
      id: U.uid(),
      date,
      name: nameEl ? nameEl.textContent.trim() : 'Importierter Lauf',
      duration,
      distance: Math.round(trackDistance(points)),
      points,
      splits: hasTime ? computeSplits(points) : []
    };
  }

  function exportGpx(run) {
    const pts = run.points.map(p =>
      `      <trkpt lat="${p[0]}" lon="${p[1]}">${p[2] ? `<time>${new Date(p[2]).toISOString()}</time>` : ''}</trkpt>`
    ).join('\n');
    const gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="IchApp" xmlns="http://www.topografix.com/GPX/1/1">
  <trk>
    <name>${U.esc(run.name || 'Lauf')}</name>
    <trkseg>
${pts}
    </trkseg>
  </trk>
</gpx>`;
    const blob = new Blob([gpx], { type: 'application/gpx+xml' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${(run.name || 'lauf').replace(/\W+/g, '-').toLowerCase()}-${run.date}.gpx`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  /* ---------- Leaflet (Routenplaner-Karte, lädt nur bei Bedarf) ---------- */

  let leafletPromise = null;
  function ensureLeaflet() {
    if (window.L) return Promise.resolve();
    if (leafletPromise) return leafletPromise;
    leafletPromise = new Promise((resolve, reject) => {
      const css = document.createElement('link');
      css.rel = 'stylesheet';
      css.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(css);
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.onload = () => resolve();
      script.onerror = () => { leafletPromise = null; reject(new Error('offline')); };
      document.head.appendChild(script);
      setTimeout(() => { if (!window.L) { leafletPromise = null; reject(new Error('timeout')); } }, 10000);
    });
    return leafletPromise;
  }

  /* ---------- Render ---------- */

  function render(c) {
    const s = Store.get();
    const runs = U.sortByDateDesc(s.runs);
    const today = U.todayStr();
    const weekStart = U.startOfWeek(today);
    const weekKm = U.sum(s.runs.filter(r => r.date >= weekStart).map(r => r.distance)) / 1000;
    const longest = runs.length ? Math.max(...s.runs.map(r => r.distance)) : 0;
    const paces = s.runs.filter(r => r.distance >= 1000 && r.duration > 0).map(r => r.duration / (r.distance / 1000));
    const bestPace = paces.length ? Math.min(...paces) : NaN;

    // Wochen-km (8 Wochen)
    const kmBars = [];
    for (let i = 7; i >= 0; i--) {
      const start = U.addDays(weekStart, -7 * i);
      const end = U.addDays(start, 6);
      const km = U.sum(s.runs.filter(r => r.date >= start && r.date <= end).map(r => r.distance)) / 1000;
      kmBars.push({ x: start.slice(8) + '.' + start.slice(5, 7), y: Math.round(km * 10) / 10, color: i === 0 ? Charts.COLORS.green : 'rgba(48,209,88,.35)' });
    }
    const hasKm = kmBars.some(b => b.y > 0);

    if (live.active) {
      // Lauf läuft: reduzierte Ansicht mit großen Zahlen
      c.innerHTML = `
        <div class="card glow" style="text-align:center;padding:32px 20px">
          <div class="pill green" style="margin-bottom:16px">● AUFNAHME LÄUFT</div>
          <div id="liveStats"><div class="muted">Warte auf GPS-Signal… (geh am besten kurz nach draußen)</div></div>
          <div style="display:flex;gap:12px;justify-content:center;margin-top:24px">
            <button class="btn danger" id="stopDiscard">✕ Verwerfen</button>
            <button class="btn primary" id="stopSave" style="padding:14px 28px;font-size:16px">⏹ Stopp & Speichern</button>
          </div>
          <p class="muted" style="margin-top:16px">Lass den Bildschirm an und das Handy am Körper – die App trackt deine Strecke live.</p>
        </div>`;
      c.querySelector('#stopSave').onclick = () => stopRun(true);
      c.querySelector('#stopDiscard').onclick = () => UI.confirmDlg('Lauf wirklich verwerfen?', () => stopRun(false));
      updateLiveUI();
      return;
    }

    c.innerHTML = `
      <div class="grid grid-4">
        <div class="card"><div class="stat">
          <span class="stat-label">Diese Woche</span>
          <span class="stat-value">${U.fmtNum(weekKm, 1)} <small>km</small></span>
        </div></div>
        <div class="card"><div class="stat">
          <span class="stat-label">Läufe gesamt</span>
          <span class="stat-value">${s.runs.length}</span>
        </div></div>
        <div class="card"><div class="stat">
          <span class="stat-label">Längster Lauf</span>
          <span class="stat-value">${longest ? U.fmtNum(longest / 1000, 2) + ' km' : '–'}</span>
        </div></div>
        <div class="card"><div class="stat">
          <span class="stat-label">Beste Pace</span>
          <span class="stat-value" style="font-size:22px">${fmtPace(bestPace)}</span>
        </div></div>
      </div>

      <div class="card section-gap glow" style="text-align:center;padding:28px 20px">
        <button class="run-start" id="startRun">🏃<br><span>START</span></button>
        ${s.routes.length ? `
          <div style="max-width:320px;margin:16px auto 0">
            ${UI.select('routeSelect', [{ value: '', label: 'Ohne geplante Route' }, ...s.routes.map(r => ({ value: r.id, label: `🗺️ ${r.name} (${U.fmtNum(r.distance / 1000, 1)} km)` }))], live.routeId || '')}
          </div>` : ''}
        <p class="muted" style="margin:14px 0 0">Knopf drücken und loslaufen – Strecke, Pace und Zeit werden live per GPS getrackt.</p>
      </div>

      <div class="quick-actions">
        <button class="btn primary" id="planRoute">🗺️ Route planen</button>
        <button class="btn" id="importGpx">📥 GPX importieren (Apple Watch)</button>
      </div>

      <div class="grid grid-2 section-gap">
        <div class="card">
          <h3 class="card-title">📊 Kilometer pro Woche</h3>
          ${hasKm ? `<div class="chart-wrap">${Charts.bars(kmBars, { height: 180 })}</div>`
                  : `<div class="empty"><span class="empty-icon">👟</span>Dein erster Lauf wartet. Klein anfangen ist völlig okay!</div>`}
        </div>
        <div class="card">
          <h3 class="card-title">🗺️ Geplante Routen</h3>
          <div class="list">
            ${s.routes.length ? s.routes.map(r => `
              <div class="list-item">
                ${r.points && r.points.length > 1 ? routeSvg(r.points, 54, '#64d2ff') : '<span style="font-size:22px">🗺️</span>'}
                <div class="li-main">
                  <div class="li-title">${U.esc(r.name)}</div>
                  <div class="li-sub">${U.fmtNum(r.distance / 1000, 2)} km${r.notes ? ' · ' + U.esc(r.notes) : ''}</div>
                </div>
                <div class="li-actions">
                  ${r.points && r.points.length > 1 ? `<button class="icon-btn" data-route-gpx="${r.id}" title="Als GPX exportieren">⬇️</button>` : ''}
                  <button class="icon-btn danger" data-route-del="${r.id}" title="Löschen">🗑</button>
                </div>
              </div>`).join('') : `<div class="empty"><span class="empty-icon">🗺️</span>Plane deine erste Route auf der Karte – dann weißt du vorher, wie weit es wird.</div>`}
          </div>
        </div>
      </div>

      <div class="card section-gap">
        <h3 class="card-title">👟 Deine Läufe</h3>
        <div class="list">
          ${runs.length ? runs.slice(0, 20).map(r => `
            <div class="list-item" data-run="${r.id}" style="cursor:pointer">
              ${r.points && r.points.length > 1 ? routeSvg(r.points, 54) : '<span style="font-size:22px">🏃</span>'}
              <div class="li-main">
                <div class="li-title">${U.esc(r.name || 'Lauf')}</div>
                <div class="li-sub">${U.fmtDateRel(r.date)} · ${U.fmtNum(r.distance / 1000, 2)} km · ${fmtDuration(r.duration)} · ${fmtPace(r.duration / (r.distance / 1000))}</div>
              </div>
              <div class="li-actions">
                <button class="icon-btn" data-gpx="${r.id}" title="GPX exportieren">⬇️</button>
                <button class="icon-btn danger" data-del="${r.id}" title="Löschen">🗑</button>
              </div>
            </div>`).join('') : `<div class="empty"><span class="empty-icon">🏃</span>Noch keine Läufe. Drück oben auf START oder importiere ein Apple-Watch-Workout.</div>`}
        </div>
      </div>

      <div class="card section-gap" style="border-style:dashed">
        <h3 class="card-title">ℹ️ Apple Watch einbinden</h3>
        <p class="muted" style="margin:0">
          Webseiten dürfen aus Datenschutzgründen nicht direkt auf Apple Health zugreifen. So geht's trotzdem easy:
          <b>Lauf mit der Watch-Trainings-App aufzeichnen</b> → auf dem iPhone mit einer Gratis-App wie
          <b>HealthFit</b> oder <b>RunGap</b> (oder via Strava) als <b>GPX</b> exportieren → hier über
          „📥 GPX importieren" einlesen. Distanz, Zeit, Pace und Splits werden automatisch berechnet.
          Alternativ: Handy mitnehmen und direkt mit dem START-Knopf tracken.
          <br><br>⚠️ Live-GPS funktioniert nur über HTTPS oder localhost (Browser-Sicherheitsregel) –
          per Doppelklick auf die Datei geht der GPX-Import trotzdem immer.
        </p>
      </div>
    `;

    c.querySelector('#startRun').onclick = startRun;
    const routeSel = c.querySelector('#routeSelect');
    if (routeSel) routeSel.onchange = () => { live.routeId = routeSel.value || null; };

    c.querySelector('#planRoute').onclick = openRoutePlanner;
    c.querySelector('#importGpx').onclick = openGpxImport;

    c.querySelectorAll('[data-run]').forEach(el => el.onclick = e => {
      if (e.target.closest('.icon-btn')) return;
      const r = Store.get().runs.find(x => x.id === el.dataset.run);
      if (r) openRunDetail(r);
    });
    c.querySelectorAll('[data-gpx]').forEach(b => b.onclick = () => {
      const r = Store.get().runs.find(x => x.id === b.dataset.gpx);
      if (r) exportGpx(r);
    });
    c.querySelectorAll('[data-del]').forEach(b => b.onclick = () => {
      UI.confirmDlg('Lauf löschen?', () => {
        Store.update(st => st.runs = st.runs.filter(x => x.id !== b.dataset.del));
        App.refresh();
      });
    });
    c.querySelectorAll('[data-route-del]').forEach(b => b.onclick = () => {
      UI.confirmDlg('Route löschen?', () => {
        Store.update(st => st.routes = st.routes.filter(x => x.id !== b.dataset.routeDel));
        App.refresh();
      });
    });
    c.querySelectorAll('[data-route-gpx]').forEach(b => b.onclick = () => {
      const r = Store.get().routes.find(x => x.id === b.dataset.routeGpx);
      if (r) exportGpx({ name: r.name, date: U.todayStr(), points: r.points.map(p => [p[0], p[1], 0]) });
    });
  }

  /* ---------- Lauf-Detail ---------- */

  function openRunDetail(r) {
    const splitsHtml = (r.splits && r.splits.length) ? `
      <table class="data" style="margin-top:12px">
        <thead><tr><th>km</th><th class="num">Zeit</th><th class="num">Pace</th></tr></thead>
        <tbody>${r.splits.map((sec, i) => {
          const best = Math.min(...r.splits);
          return `<tr><td>${i + 1}</td><td class="num">${fmtDuration(sec)}</td>
            <td class="num" style="${sec === best ? 'color:var(--green);font-weight:700' : ''}">${fmtPace(sec)}</td></tr>`;
        }).join('')}</tbody>
      </table>` : '<p class="muted">Keine Kilometer-Splits verfügbar.</p>';

    UI.openModal(r.name || 'Lauf', `
      <div style="text-align:center">${r.points && r.points.length > 1 ? routeSvg(r.points, 220) : ''}</div>
      <div class="grid grid-3" style="text-align:center;margin-top:8px">
        <div><div class="stat-label">Distanz</div><b>${U.fmtNum(r.distance / 1000, 2)} km</b></div>
        <div><div class="stat-label">Zeit</div><b>${fmtDuration(r.duration)}</b></div>
        <div><div class="stat-label">Ø Pace</div><b>${fmtPace(r.duration / (r.distance / 1000))}</b></div>
      </div>
      ${splitsHtml}
      <div class="form-actions">
        <button class="btn" id="runGpx">⬇️ GPX</button>
        <button class="btn primary" id="runClose">Fertig</button>
      </div>
    `, body => {
      body.querySelector('#runClose').onclick = UI.closeModal;
      body.querySelector('#runGpx').onclick = () => exportGpx(r);
    });
  }

  /* ---------- GPX-Import ---------- */

  function openGpxImport() {
    UI.openModal('GPX importieren', `
      <p class="muted" style="margin-top:0">
        Workout von der Apple Watch (via HealthFit / RunGap / Strava) oder jeder anderen
        Lauf-App als <b>.gpx</b> exportieren und hier auswählen.
      </p>
      ${UI.field('GPX-Datei', '<input type="file" id="gpxFile" accept=".gpx,application/gpx+xml">')}
      <div class="form-actions"><button class="btn" id="formCancel">Abbrechen</button></div>
    `, body => {
      body.querySelector('#formCancel').onclick = UI.closeModal;
      body.querySelector('#gpxFile').onchange = e => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
          try {
            const run = parseGpx(reader.result);
            Store.update(st => st.runs.push(run));
            UI.closeModal();
            UI.reward(`Lauf importiert: ${U.fmtNum(run.distance / 1000, 2)} km`, 40);
            App.refresh();
          } catch (err) {
            UI.toast('⚠️ ' + err.message);
          }
        };
        reader.readAsText(file);
      };
    });
  }

  /* ---------- Routenplaner ---------- */

  function openRoutePlanner() {
    UI.openModal('Route planen', `
      <div id="plannerMap" class="map-wrap"><div class="empty">Karte wird geladen…</div></div>
      <div style="display:flex;justify-content:space-between;align-items:center;margin:10px 0">
        <span class="muted">Auf die Karte tippen, um Wegpunkte zu setzen.</span>
        <b id="plannerDist">0,00 km</b>
      </div>
      <form>
        <div class="form-row">
          ${UI.field('Name der Route', UI.textInput('rName', '', 'z. B. Feierabendrunde Förde'))}
        </div>
        <div class="form-actions">
          <button type="button" class="btn" id="plannerUndo">↩️ Punkt zurück</button>
          <button type="button" class="btn" id="formCancel">Abbrechen</button>
          <button type="submit" class="btn primary" id="formSave">Route speichern</button>
        </div>
      </form>
    `, body => {
      const mapEl = body.querySelector('#plannerMap');
      let map = null, polyline = null, markers = [];
      const waypoints = [];

      function updateDist() {
        const d = trackDistance(waypoints);
        body.querySelector('#plannerDist').textContent = U.fmtNum(d / 1000, 2) + ' km';
        return d;
      }

      ensureLeaflet().then(() => {
        mapEl.innerHTML = '';
        map = L.map(mapEl).setView([54.3233, 10.1228], 13); // Kiel
        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap'
        }).addTo(map);
        polyline = L.polyline([], { color: '#0a84ff', weight: 4 }).addTo(map);

        // Auf eigenen Standort zentrieren (best effort)
        if (navigator.geolocation && window.isSecureContext) {
          navigator.geolocation.getCurrentPosition(
            pos => map.setView([pos.coords.latitude, pos.coords.longitude], 14),
            () => {}, { timeout: 4000 });
        }

        map.on('click', ev => {
          waypoints.push([ev.latlng.lat, ev.latlng.lng]);
          markers.push(L.circleMarker(ev.latlng, { radius: 5, color: '#0a84ff', fillColor: '#0a84ff', fillOpacity: 1 }).addTo(map));
          polyline.setLatLngs(waypoints);
          updateDist();
        });
      }).catch(() => {
        // Offline-Fallback: Route manuell anlegen
        mapEl.innerHTML = `<div class="empty"><span class="empty-icon">📡</span>
          Karte nicht verfügbar (offline?).<br>Du kannst die Route trotzdem mit Name und Distanz anlegen.</div>`;
        const distField = document.createElement('div');
        distField.innerHTML = UI.field('Distanz (km)', UI.numInput('rDist', '', 'z. B. 5'));
        body.querySelector('form').prepend(distField);
      });

      body.querySelector('#plannerUndo').onclick = () => {
        waypoints.pop();
        const m = markers.pop();
        if (m && map) map.removeLayer(m);
        if (polyline) polyline.setLatLngs(waypoints);
        updateDist();
      };

      UI.bindForm(body, b => {
        const name = UI.val(b, 'rName');
        if (!name) { UI.toast('⚠️ Gib der Route einen Namen'); return; }
        let distance, points = null;
        if (waypoints.length > 1) {
          distance = Math.round(trackDistance(waypoints));
          points = waypoints;
        } else {
          const manual = UI.numVal(b, 'rDist');
          if (isNaN(manual) || manual <= 0) { UI.toast('⚠️ Setz mindestens 2 Punkte auf der Karte'); return; }
          distance = Math.round(manual * 1000);
        }
        Store.update(st => st.routes.push({ id: U.uid(), name, distance, points, notes: '' }));
        UI.closeModal();
        UI.toast('🗺️ Route gespeichert', 'success');
        App.refresh();
      });
    });
  }

  return { title: 'Laufen', render };
})();
