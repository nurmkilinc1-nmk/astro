// ===== notlar.js — luna.gram Notlarım (Ay günlüğü) =====
// Her not yazıldığı andaki Ay fazı ve burcuyla etiketlenir. Veriler cihazda saklanır.
(function () {
  'use strict';

  const C = window.AstroCore;
  const A = window.Astronomy;
  const $ = (id) => document.getElementById(id);
  const KEY = 'luna-notes';
  const AY = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
  const GUN = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
  const SIGNS = ['Koç', 'Boğa', 'İkizler', 'Yengeç', 'Aslan', 'Başak', 'Terazi', 'Akrep', 'Yay', 'Oğlak', 'Kova', 'Balık'];
  const LOC = ['ta', 'da', 'de', 'te', 'da', 'ta', 'de', 'te', 'da', 'ta', 'da', 'ta'];
  const MOODS = [
    { id: 'huzurlu', name: 'Huzurlu', color: '#4fa58f' },
    { id: 'enerjik', name: 'Enerjik', color: '#e3884f' },
    { id: 'duygusal', name: 'Duygusal', color: '#5f7fd6' },
    { id: 'odakli', name: 'Odaklı', color: '#8f6fd6' },
    { id: 'yorgun', name: 'Yorgun', color: '#8a93a6' }
  ];
  const moodById = Object.fromEntries(MOODS.map((m) => [m.id, m]));
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const toast = (m) => window.LunaDevice && window.LunaDevice.toast(m);
  const norm = (d) => ((d % 360) + 360) % 360;

  // ---------- Ay bilgisi ----------
  function phaseName(el) {
    if (el < 6 || el >= 354) return 'Yeniay';
    if (el < 84) return 'Büyüyen Hilal';
    if (el < 96) return 'İlk Dördün';
    if (el < 174) return 'Büyüyen Şişkin Ay';
    if (el < 186) return 'Dolunay';
    if (el < 264) return 'Küçülen Şişkin Ay';
    if (el < 276) return 'Son Dördün';
    return 'Küçülen Hilal';
  }
  function moonAt(date) {
    if (!C || !A) return null;
    const ml = C.moonLon(date);
    const sl = norm(A.Ecliptic(A.GeoVector(A.Body.Sun, date, true)).elon);
    const elong = norm(ml - sl);
    return { elong: Math.round(elong * 10) / 10, sign: Math.floor(ml / 30) % 12, phase: phaseName(elong) };
  }
  // Ay evresine göre yazma önerisi
  function promptFor(el) {
    if (el < 30 || el >= 345) return 'Bu yeni döngü için niyetin ne?';
    if (el < 100) return 'Hangi adımı atmaya hazırsın?';
    if (el < 165) return 'Neyi büyütüyor, neye emek veriyorsun?';
    if (el < 195) return 'Neyi bırakmaya hazırsın?';
    if (el < 270) return 'Bu ay neye minnettarsın?';
    return 'Neyi tamamlayıp kapatmak istiyorsun?';
  }
  function moonSvg(el, size = 40) {
    const f = el / 360, r = 18, cx = 20, cy = 20;
    const k = Math.cos(2 * Math.PI * f);
    const rx = Math.max(0.01, Math.abs(k) * r).toFixed(2);
    const wax = f < 0.5, cres = k > 0;
    const d = `M${cx} ${cy - r} A${r} ${r} 0 0 ${wax ? 1 : 0} ${cx} ${cy + r} A${rx} ${r} 0 0 ${wax ? (cres ? 0 : 1) : (cres ? 1 : 0)} ${cx} ${cy - r}Z`;
    return `<svg viewBox="0 0 40 40" width="${size}" height="${size}" class="nm" aria-hidden="true"><circle cx="20" cy="20" r="18" class="nm-dark"/><path d="${d}" class="nm-lit"/></svg>`;
  }
  const periodOf = (el) => (el < 45 || el >= 315 ? 'yeniay' : el >= 135 && el < 225 ? 'dolunay' : el < 180 ? 'buyuyen' : 'kuculen');

  // ---------- Saklama ----------
  function load() {
    try { const v = JSON.parse(localStorage.getItem(KEY) || '[]'); return Array.isArray(v) ? v : []; } catch (e) { return []; }
  }
  function store(list) {
    list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    try { localStorage.setItem(KEY, JSON.stringify(list)); } catch (e) { toast('Not kaydedilemedi: depolama dolu olabilir.'); }
  }

  // ---------- Bugünün Ay'ı ----------
  function renderToday() {
    const m = moonAt(new Date());
    if (!m) { $('tpMeta').textContent = ''; $('tpPrompt').textContent = 'Bugün neler hissediyorsun?'; return; }
    $('tpMoon').innerHTML = moonSvg(m.elong, 46);
    $('tpMeta').textContent = `${m.phase} · Ay ${SIGNS[m.sign]}'${LOC[m.sign]}`;
    $('tpPrompt').textContent = promptFor(m.elong);
  }

  // ---------- İçgörüler ----------
  function renderInsights(list) {
    const box = $('insights');
    if (list.length < 3) { box.hidden = true; return; }
    const moodCount = {};
    const periodCount = { yeniay: 0, dolunay: 0, buyuyen: 0, kuculen: 0 };
    list.forEach((n) => {
      if (n.mood) moodCount[n.mood] = (moodCount[n.mood] || 0) + 1;
      if (n.moon) periodCount[periodOf(n.moon.elong)]++;
    });
    const topMood = Object.entries(moodCount).sort((a, b) => b[1] - a[1])[0];
    const PN = { yeniay: 'Yeniay', dolunay: 'Dolunay', buyuyen: 'büyüyen Ay', kuculen: 'küçülen Ay' };
    const topPeriod = Object.entries(periodCount).sort((a, b) => b[1] - a[1])[0];
    const now = new Date();
    const thisMonth = list.filter((n) => { const d = new Date(n.createdAt); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); }).length;
    const items = [`<div class="ins glass"><b>${thisMonth}</b><span>bu ay not</span></div>`];
    if (topMood) items.push(`<div class="ins glass"><b style="color:${moodById[topMood[0]].color}">${moodById[topMood[0]].name}</b><span>en sık ruh hâlin</span></div>`);
    if (topPeriod && topPeriod[1]) items.push(`<div class="ins glass"><b>${PN[topPeriod[0]]}</b><span>en çok yazdığın dönem</span></div>`);
    box.innerHTML = items.join('');
    box.hidden = false;
  }

  // ---------- Liste ----------
  let filter = 'all';
  let query = '';
  const FILTERS = [
    { id: 'all', name: 'Tümü' },
    { id: 'intent', name: '✦ Niyetler' },
    { id: 'yeniay', name: 'Yeniay dönemi' },
    { id: 'dolunay', name: 'Dolunay dönemi' }
  ];
  function renderFilters() {
    $('noteFilters').innerHTML = FILTERS.map((f) => `<button type="button" class="nf${f.id === filter ? ' on' : ''}" role="radio" aria-checked="${f.id === filter}" data-f="${f.id}">${f.name}</button>`).join('');
  }
  $('noteFilters').addEventListener('click', (e) => {
    const b = e.target.closest('[data-f]');
    if (!b) return;
    filter = b.dataset.f;
    renderFilters();
    renderList();
  });
  $('noteSearch').addEventListener('input', () => { query = $('noteSearch').value.trim().toLocaleLowerCase('tr-TR'); renderList(); });

  function renderList() {
    const all = load();
    $('notesSub').textContent = all.length ? `Ay günlüğün · ${all.length} not` : 'Ay günlüğün';
    renderInsights(all);
    let list = all;
    if (filter === 'intent') list = list.filter((n) => n.intention);
    else if (filter !== 'all') list = list.filter((n) => n.moon && periodOf(n.moon.elong) === filter);
    if (query) list = list.filter((n) => n.text.toLocaleLowerCase('tr-TR').includes(query));

    if (!all.length) {
      $('notesList').innerHTML = `
        <div class="notes-empty glass">
          ${moonSvg(120, 56)}
          <strong>İlk notunu yaz</strong>
          <p>Duygularını, niyetlerini ve gözlemlerini kaydet. Her not, o anki Ay fazı ve burcuyla etiketlenir; zamanla kendi döngülerini görürsün.</p>
        </div>`;
      return;
    }
    if (!list.length) {
      $('notesList').innerHTML = '<p class="notes-none">Bu filtreye uyan not yok.</p>';
      return;
    }
    let html = '';
    let lastMonth = '';
    list.forEach((n) => {
      const d = new Date(n.createdAt);
      const mk = `${AY[d.getMonth()]} ${d.getFullYear()}`;
      if (mk !== lastMonth) { html += `<h2 class="notes-month">${mk}</h2>`; lastMonth = mk; }
      const mood = moodById[n.mood];
      html += `
        <article class="note glass" data-id="${esc(n.id)}" tabindex="0" role="button" aria-label="${esc(d.getDate() + ' ' + AY[d.getMonth()])} notunu aç">
          <div class="note-side">
            ${n.moon ? moonSvg(n.moon.elong, 30) : ''}
            <b>${d.getDate()}</b>
            <small>${GUN[d.getDay()].slice(0, 3)}</small>
          </div>
          <div class="note-body">
            <div class="note-tags">
              ${n.intention ? '<span class="tag tag-intent">✦ Niyet</span>' : ''}
              ${mood ? `<span class="tag"><i style="background:${mood.color}"></i>${mood.name}</span>` : ''}
              ${n.moon ? `<span class="tag tag-moon">${esc(n.moon.phase)} · ${SIGNS[n.moon.sign]}</span>` : ''}
            </div>
            <p class="note-text-prev">${esc(n.text)}</p>
            <span class="note-time">${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}</span>
          </div>
        </article>`;
    });
    $('notesList').innerHTML = html;
  }

  // ---------- Not penceresi ----------
  let editing = null;
  let mood = null;
  let delArmed = false;
  function renderMoods() {
    $('moodPicker').innerHTML = MOODS.map((m) => `<button type="button" class="mood${m.id === mood ? ' on' : ''}" role="radio" aria-checked="${m.id === mood}" data-m="${m.id}" style="--mc:${m.color}"><i></i>${m.name}</button>`).join('');
  }
  $('moodPicker').addEventListener('click', (e) => {
    const b = e.target.closest('[data-m]');
    if (!b) return;
    mood = mood === b.dataset.m ? null : b.dataset.m;
    renderMoods();
  });

  function openSheet(note) {
    editing = note || null;
    mood = note ? note.mood || null : null;
    delArmed = false;
    const d = note ? new Date(note.createdAt) : new Date();
    const m = note ? note.moon : moonAt(d);
    $('noteSheetTitle').textContent = note ? `${d.getDate()} ${AY[d.getMonth()]} ${GUN[d.getDay()]}` : 'Yeni not';
    $('nsMeta').textContent = m ? `${m.phase} · Ay ${SIGNS[m.sign]}'${LOC[m.sign]}` : '';
    $('nsMoon').innerHTML = m ? moonSvg(m.elong, 44) : '';
    $('noteText').value = note ? note.text : '';
    $('noteText').placeholder = m ? promptFor(m.elong) : 'Bugün neler hissediyorsun?';
    $('noteIntent').checked = !!(note && note.intention);
    $('noteDelete').hidden = !note;
    $('noteDelete').textContent = 'Notu sil';
    $('noteDelete').classList.remove('armed');
    renderMoods();
    const s = $('noteSheet');
    s.hidden = false;
    requestAnimationFrame(() => s.classList.add('open'));
    if (!note) setTimeout(() => $('noteText').focus({ preventScroll: true }), 320);
  }
  function closeSheet() {
    const s = $('noteSheet');
    s.classList.remove('open');
    setTimeout(() => { s.hidden = true; }, 260);
  }

  $('newNoteBtn').addEventListener('click', () => openSheet(null));
  $('notesList').addEventListener('click', (e) => {
    const card = e.target.closest('[data-id]');
    if (!card) return;
    const n = load().find((x) => x.id === card.dataset.id);
    if (n) openSheet(n);
  });
  $('notesList').addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const card = e.target.closest('[data-id]');
    if (!card) return;
    e.preventDefault();
    const n = load().find((x) => x.id === card.dataset.id);
    if (n) openSheet(n);
  });
  $('noteCancel').addEventListener('click', closeSheet);
  $('noteSheet').addEventListener('click', (e) => { if (e.target.id === 'noteSheet') closeSheet(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('noteSheet').hidden) closeSheet(); });

  $('noteForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const text = $('noteText').value.trim();
    if (!text) {
      $('noteText').classList.add('invalid');
      $('noteText').focus();
      setTimeout(() => $('noteText').classList.remove('invalid'), 1200);
      return;
    }
    const list = load();
    if (editing) {
      const n = list.find((x) => x.id === editing.id);
      if (n) { n.text = text; n.mood = mood; n.intention = $('noteIntent').checked; n.updatedAt = new Date().toISOString(); }
    } else {
      const now = new Date();
      list.push({ id: `n${now.getTime()}`, text, mood, intention: $('noteIntent').checked, createdAt: now.toISOString(), moon: moonAt(now) });
    }
    store(list);
    closeSheet();
    renderList();
    toast(editing ? 'Not güncellendi.' : 'Not kaydedildi.');
  });

  $('noteDelete').addEventListener('click', () => {
    if (!editing) return;
    if (!delArmed) {
      delArmed = true;
      $('noteDelete').textContent = 'Emin misin? Tekrar dokun';
      $('noteDelete').classList.add('armed');
      return;
    }
    store(load().filter((x) => x.id !== editing.id));
    closeSheet();
    renderList();
    toast('Not silindi.');
  });

  renderToday();
  renderFilters();
  renderList();
})();
