/* ============================================================
   IchApp – Charts (eigene, leichte SVG-Renderer; keine Abhängigkeiten)
   Alle Funktionen geben einen SVG-String zurück.
   ============================================================ */

const Charts = (() => {

  const COLORS = {
    accent: '#7c6cff', blue: '#38bdf8', green: '#2dd4a7',
    red: '#ff6b81', orange: '#ffb454', grid: '#232d3f', text: '#5d6b82'
  };

  function svgOpen(w, h) {
    return `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">`;
  }

  function niceRange(min, max) {
    if (!isFinite(min) || !isFinite(max)) { min = 0; max = 1; }
    if (min === max) { min -= 1; max += 1; }
    const pad = (max - min) * 0.12;
    return [min - pad, max + pad];
  }

  /**
   * Linien-Chart.
   * points: [{x: label, y: number|null}], opts: {height, color, unit, area, yMin}
   */
  function line(points, opts) {
    opts = opts || {};
    const W = 600, H = opts.height || 200;
    const padL = 42, padR = 12, padT = 14, padB = 26;
    const vals = points.map(p => p.y).filter(v => v != null && !isNaN(v));
    if (!vals.length) return emptyChart(W, H);

    let [lo, hi] = niceRange(Math.min(...vals), Math.max(...vals));
    if (opts.yMin != null) lo = Math.min(lo, opts.yMin);

    const xPos = i => padL + (points.length === 1 ? (W - padL - padR) / 2 : i * (W - padL - padR) / (points.length - 1));
    const yPos = v => padT + (1 - (v - lo) / (hi - lo)) * (H - padT - padB);

    const color = opts.color || COLORS.accent;
    let s = svgOpen(W, H);

    // Gitterlinien + Y-Beschriftung
    for (let g = 0; g <= 3; g++) {
      const v = lo + (hi - lo) * g / 3;
      const y = yPos(v);
      s += `<line x1="${padL}" y1="${y}" x2="${W - padR}" y2="${y}" stroke="${COLORS.grid}" stroke-width="1"/>`;
      s += `<text x="${padL - 8}" y="${y + 4}" text-anchor="end" font-size="11" fill="${COLORS.text}">${U.fmtNum(v, hi - lo > 20 ? 0 : 1)}</text>`;
    }

    // Linie & Fläche
    const segs = [];
    let cur = [];
    points.forEach((p, i) => {
      if (p.y == null || isNaN(p.y)) { if (cur.length) segs.push(cur); cur = []; }
      else cur.push([xPos(i), yPos(p.y)]);
    });
    if (cur.length) segs.push(cur);

    for (const seg of segs) {
      const d = seg.map((pt, i) => `${i ? 'L' : 'M'}${pt[0].toFixed(1)},${pt[1].toFixed(1)}`).join(' ');
      if (opts.area !== false && seg.length > 1) {
        const aid = 'g' + Math.random().toString(36).slice(2, 7);
        s += `<defs><linearGradient id="${aid}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="${color}" stop-opacity=".25"/>
          <stop offset="100%" stop-color="${color}" stop-opacity="0"/></linearGradient></defs>`;
        s += `<path d="${d} L${seg[seg.length - 1][0].toFixed(1)},${H - padB} L${seg[0][0].toFixed(1)},${H - padB} Z" fill="url(#${aid})"/>`;
      }
      s += `<path d="${d}" fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>`;
      for (const pt of seg) {
        s += `<circle cx="${pt[0].toFixed(1)}" cy="${pt[1].toFixed(1)}" r="3" fill="#10141d" stroke="${color}" stroke-width="2"/>`;
      }
    }

    // X-Beschriftung (max. ~7 Labels)
    const step = Math.max(1, Math.ceil(points.length / 7));
    points.forEach((p, i) => {
      if (i % step === 0 || i === points.length - 1) {
        s += `<text x="${xPos(i)}" y="${H - 8}" text-anchor="middle" font-size="11" fill="${COLORS.text}">${U.esc(p.x)}</text>`;
      }
    });

    return s + '</svg>';
  }

  /**
   * Balken-Chart.
   * bars: [{x: label, y: number, color?}], opts: {height, color, goal, goalColor}
   */
  function bars(bars_, opts) {
    opts = opts || {};
    const W = 600, H = opts.height || 200;
    const padL = 42, padR = 12, padT = 14, padB = 26;
    const vals = bars_.map(b => b.y || 0);
    if (!bars_.length) return emptyChart(W, H);

    let hi = Math.max(...vals, opts.goal || 0, 1) * 1.12;
    const yPos = v => padT + (1 - v / hi) * (H - padT - padB);
    const bw = (W - padL - padR) / bars_.length;

    let s = svgOpen(W, H);

    for (let g = 0; g <= 3; g++) {
      const v = hi * g / 3;
      const y = yPos(v);
      s += `<line x1="${padL}" y1="${y}" x2="${W - padR}" y2="${y}" stroke="${COLORS.grid}" stroke-width="1"/>`;
      s += `<text x="${padL - 8}" y="${y + 4}" text-anchor="end" font-size="11" fill="${COLORS.text}">${U.fmtNum(v, 0)}</text>`;
    }

    bars_.forEach((b, i) => {
      const x = padL + i * bw + bw * 0.18;
      const w = bw * 0.64;
      const y = yPos(b.y || 0);
      const h = Math.max(0, H - padB - y);
      const c = b.color || opts.color || COLORS.accent;
      s += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" rx="4" fill="${c}" opacity="0.92"/>`;
      if (bars_.length <= 14) {
        s += `<text x="${(x + w / 2).toFixed(1)}" y="${H - 8}" text-anchor="middle" font-size="11" fill="${COLORS.text}">${U.esc(b.x)}</text>`;
      }
    });

    // Ziellinie
    if (opts.goal) {
      const y = yPos(opts.goal);
      s += `<line x1="${padL}" y1="${y}" x2="${W - padR}" y2="${y}" stroke="${opts.goalColor || COLORS.green}" stroke-width="1.5" stroke-dasharray="5 4"/>`;
      s += `<text x="${W - padR}" y="${y - 5}" text-anchor="end" font-size="10.5" fill="${opts.goalColor || COLORS.green}">Ziel ${U.fmtNum(opts.goal, 0)}</text>`;
    }

    return s + '</svg>';
  }

  /**
   * Donut / Fortschrittsring. pct: 0..1
   */
  function ring(pct, opts) {
    opts = opts || {};
    const size = opts.size || 38;
    const sw = opts.stroke || 4;
    const r = (size - sw) / 2;
    const c = 2 * Math.PI * r;
    const off = c * (1 - U.clamp(pct, 0, 1));
    const color = opts.color || COLORS.accent;
    const label = opts.label != null ? opts.label : Math.round(pct * 100) + '%';
    return `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
      <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="#232d3f" stroke-width="${sw}"/>
      <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${color}" stroke-width="${sw}"
        stroke-linecap="round" stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${off.toFixed(1)}"
        transform="rotate(-90 ${size / 2} ${size / 2})"/>
      ${opts.noLabel ? '' : `<text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" font-size="${size / 4}" font-weight="700" fill="#e8edf5">${U.esc(label)}</text>`}
    </svg>`;
  }

  /**
   * Horizontale Kategorie-Balken (z. B. Ausgaben nach Kategorie).
   * items: [{label, value, color?}]
   */
  function hbars(items, opts) {
    opts = opts || {};
    if (!items.length) return '<div class="empty">Keine Daten</div>';
    const max = Math.max(...items.map(i => i.value), 1);
    const fmt = opts.fmt || (v => U.fmtNum(v, 0));
    return items.map(it => `
      <div style="margin-bottom:10px">
        <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:4px">
          <span style="color:var(--text-dim);font-weight:600">${U.esc(it.label)}</span>
          <span style="font-weight:700">${fmt(it.value)}</span>
        </div>
        <div class="bar mt-0"><i style="width:${(it.value / max * 100).toFixed(1)}%;${it.color ? `background:${it.color}` : ''}"></i></div>
      </div>`).join('');
  }

  /**
   * Habit-Heatmap: letzte `weeks` Wochen, GitHub-Style.
   * isDone(dateStr) -> 0..3 (Intensität)
   */
  function heatmap(weeks, intensity) {
    const today = U.todayStr();
    const end = U.addDays(U.startOfWeek(today), 6);      // Ende aktueller Woche (So)
    const start = U.addDays(end, -(weeks * 7 - 1));
    let cells = '';
    for (let d = start; d <= end; d = U.addDays(d, 1)) {
      const lvl = d > today ? 0 : intensity(d);
      const cls = [lvl >= 3 ? 'l3' : lvl === 2 ? 'l2' : lvl === 1 ? 'l1' : '', d === today ? 'today' : '']
        .filter(Boolean).join(' ');
      cells += `<i class="${cls}" title="${U.fmtDate(d, true)}"></i>`;
    }
    return `<div class="heatmap">${cells}</div>`;
  }

  function emptyChart(w, h) {
    return svgOpen(w, h) +
      `<text x="${w / 2}" y="${h / 2}" text-anchor="middle" font-size="13" fill="${COLORS.text}">Noch keine Daten – leg los! 🚀</text></svg>`;
  }

  return { line, bars, ring, hbars, heatmap, COLORS };
})();
