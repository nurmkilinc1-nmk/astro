// ===== takvim.js — luna.gram aylık takvim =====
// Tek ay görünümü; etkinlik seçilince uygun günler yeşil, kaçınılacaklar kırmızı.
// Her günün altında 24 saatlik şeritte Ay boşluğu gösterilir.
(function () {
  'use strict';

  const C = window.AstroCore;
  const L = window.LunaActivities;
  const $ = (id) => document.getElementById(id);
  const grid = $('calGrid');

  if (!C || !L || !window.Astronomy) {
    grid.innerHTML = '<p class="cal-empty">Takvim verisi şu an hesaplanamıyor.</p>';
    return;
  }

  const H = 3600 * 1000;
  const DAY = 24 * H;
  const TZ = 3 * H;
  const AY = C.AY_TR;
  // Burç simgelerinin renkli emoji yerine metin olarak çizilmesi için (U+FE0E)
  const glyph = (i) => `${C.SYMBOLS[i]}\uFE0E`;
  const GUN = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
  const STORE_KEY = 'luna-cal-activity';
  const MAX_AHEAD = 11;

  const ist = (ms) => new Date(ms + TZ);
  const pad = (n) => String(n).padStart(2, '0');
  const clock = (ms) => { const d = ist(ms); return `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`; };
  const clockEnd = (ms, dayStart) => (ms >= dayStart + DAY ? '24:00' : clock(ms));
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const dur = (ms) => {
    const t = Math.round(ms / 60000), h = Math.floor(t / 60), m = t % 60;
    return h ? (m ? `${h} sa ${m} dk` : `${h} sa`) : `${m} dk`;
  };
  const signDative = (i) => `${C.SIGNS[i]}'${['a', 'ya', 'e', 'e', 'a', 'a', 'ye', 'e', 'a', 'a', 'ya', 'a'][i]}`;
  const signLoc = (i) => `${C.SIGNS[i]}'${['ta', 'da', 'de', 'te', 'da', 'ta', 'de', 'te', 'da', 'ta', 'da', 'ta'][i]}`;

  // Basit faz simgeleri (SVG)
  function phaseSvg(q) {
    const lit = {
      0: '',
      1: '<path d="M8 2a6 6 0 0 1 0 12z" fill="currentColor"/>',
      2: '<circle cx="8" cy="8" r="6" fill="currentColor"/>',
      3: '<path d="M8 2a6 6 0 0 0 0 12z" fill="currentColor"/>'
    }[q];
    return `<svg viewBox="0 0 16 16" class="ph-ico" aria-hidden="true"><circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" stroke-width="1.2"/>${lit}</svg>`;
  }
  const actIcon = (a, cls = '') => `<svg viewBox="0 0 24 24" class="${cls}" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${a.icon}</svg>`;

  // ---------- Durum ----------
  const nowD = new Date();
  const todayIst = ist(nowD.getTime());
  const base = { y: todayIst.getUTCFullYear(), m: todayIst.getUTCMonth() };
  let offset = 0;
  let activity = null;
  let month = null;
  let evals = [];

  try {
    const q = new URLSearchParams(location.search).get('etkinlik');
    const saved = q || localStorage.getItem(STORE_KEY);
    if (saved && L.byId[saved]) activity = L.byId[saved];
  } catch (e) {}

  // ---------- Etkinlik seçici ----------
  function renderChips() {
    const chips = [{ id: '', name: 'Gökyüzü', icon: '<circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6 7 7M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4"/>' }, ...L.list];
    $('actChips').innerHTML = chips.map((a) => {
      const on = (activity ? activity.id : '') === a.id;
      return `<button type="button" class="act-chip${on ? ' on' : ''}" role="radio" aria-checked="${on}" data-act="${a.id}">${actIcon(a, 'act-chip-ico')}<span>${a.name}</span></button>`;
    }).join('');
    const on = $('actChips').querySelector('.on');
    if (on) on.scrollIntoView({ block: 'nearest', inline: 'center' });
  }

  $('actChips').addEventListener('click', (e) => {
    const b = e.target.closest('[data-act]');
    if (!b) return;
    activity = b.dataset.act ? L.byId[b.dataset.act] : null;
    try { localStorage.setItem(STORE_KEY, activity ? activity.id : ''); } catch (err) {}
    if (navigator.vibrate) navigator.vibrate(6);
    renderChips();
    renderGrid();
  });

  // ---------- Ay verisi ----------
  function load() {
    const y = base.y + Math.floor((base.m + offset) / 12);
    const m = (base.m + offset) % 12;
    $('monthTitle').textContent = `${AY[m]} ${y}`;
    $('prevMonth').disabled = offset <= 0;
    $('nextMonth').disabled = offset >= MAX_AHEAD;
    grid.classList.add('loading');
    // Hesaplamadan önce başlığın çizilmesine izin ver
    setTimeout(() => {
      try {
        month = L.buildMonth(y, m);
      } catch (err) {
        console.error('Takvim hesaplama hatası:', err);
        grid.innerHTML = '<p class="cal-empty">Takvim verisi şu an hesaplanamıyor.</p>';
        return;
      }
      grid.classList.remove('loading');
      renderGrid();
      renderVocList();
    }, 30);
  }

  $('prevMonth').addEventListener('click', () => { if (offset > 0) { offset--; load(); } });
  $('nextMonth').addEventListener('click', () => { if (offset < MAX_AHEAD) { offset++; load(); } });

  // ---------- Izgara ----------
  function renderGrid() {
    if (!month) return;
    const now = Date.now();
    evals = month.days.map((d) => (activity ? L.evaluate(activity, d) : null));
    const firstWeekday = (month.days[0].weekday + 6) % 7; // Pazartesi başlangıç

    let html = '';
    for (let i = 0; i < firstWeekday; i++) html += '<span class="cal-day blank" aria-hidden="true"></span>';

    month.days.forEach((d, i) => {
      const ev = evals[i];
      const cls = ['cal-day'];
      if (ev) cls.push(`is-${ev.status}`);
      if (ev && ev.best) cls.push('is-best');
      if (now >= d.start && now < d.end) cls.push('today');
      else if (d.end <= now) cls.push('past');

      const phase = d.events.find((e) => e.type === 'phase');
      const noonSign = C.signIndex(C.moonLon(d.noon));
      const mark = phase
        ? `<span class="cd-phase${phase.eclipse ? ' eclipse' : ''}">${phaseSvg(phase.quarter)}</span>`
        : `<span class="cd-sign">${glyph(noonSign)}</span>`;
      const voc = d.vocs.map((v) => {
        const left = ((v.start - d.start) / DAY) * 100;
        const width = Math.max(3, ((v.end - v.start) / DAY) * 100);
        return `<i style="left:${left.toFixed(1)}%;width:${width.toFixed(1)}%"></i>`;
      }).join('');
      const other = d.events.some((e) => e.type !== 'phase') ? '<span class="cd-dot" aria-hidden="true"></span>' : '';

      const label = [
        `${d.dayNum} ${AY[month.month]} ${GUN[d.weekday]}`,
        ev ? (ev.status === 'good' ? (ev.best ? 'en uygun' : 'uygun') : ev.status === 'bad' ? 'kaçınılmalı' : '') : '',
        d.vocs.length ? 'Ay boşluğu var' : '',
        phase ? phase.title : ''
      ].filter(Boolean).join(', ');

      html += `<button type="button" class="${cls.join(' ')}" data-i="${i}" aria-label="${esc(label)}">
        <span class="cd-num">${d.dayNum}</span>
        ${mark}${other}
        <span class="cd-voc" aria-hidden="true">${voc}</span>
      </button>`;
    });
    grid.innerHTML = html;

    // Özet satırı
    const sum = $('actSummary');
    const legend = $('calLegend');
    if (!activity) {
      sum.innerHTML = `Bir etkinlik seç; uygun günler <b class="t-good">yeşil</b>, kaçınılacaklar <b class="t-bad">kırmızı</b> görünsün.`;
      legend.classList.add('no-act');
    } else {
      const upcoming = month.days.map((d, i) => ({ d, e: evals[i] })).filter((x) => x.d.end > now);
      const g = upcoming.filter((x) => x.e.status === 'good').length;
      const b = upcoming.filter((x) => x.e.status === 'bad').length;
      const next = upcoming.find((x) => x.e.status === 'good');
      sum.innerHTML = `<b>${activity.title}</b>: ${g ? `<b class="t-good">${g} uygun</b>` : 'uygun gün yok'}${b ? `, <b class="t-bad">${b} kaçınılacak</b>` : ''} gün${next ? ` · ilki ${next.d.dayNum} ${AY[month.month]}` : ''}`;
      legend.classList.remove('no-act');
    }
  }

  grid.addEventListener('click', (e) => {
    const b = e.target.closest('[data-i]');
    if (b) openDay(Number(b.dataset.i));
  });

  // ---------- Ay boşlukları listesi ----------
  let showAllVoc = false;
  function renderVocList() {
    const now = Date.now();
    const list = month.vocs.slice().sort((a, b) => a.start - b.start);
    const total = list.reduce((t, v) => t + (v.end - v.start), 0);
    $('vocMonthMeta').textContent = `${list.length} kez · toplam ${Math.round(total / H)} saat`;

    const firstFuture = list.findIndex((v) => v.end > now);
    const start = showAllVoc ? 0 : Math.max(0, firstFuture);
    const shown = showAllVoc ? list : list.slice(start, start + 5);

    $('vocMonthList').innerHTML = shown.map((v) => {
      const s = ist(v.start), e = ist(v.end);
      const sameDay = s.getUTCDate() === e.getUTCDate();
      const active = now >= v.start && now < v.end;
      const past = v.end <= now;
      const idx = list.indexOf(v);
      return `<li class="${active ? 'active' : ''}${past ? ' past' : ''}">
        <span class="vm-date"><b>${s.getUTCDate()}</b><small>${AY[s.getUTCMonth()].slice(0, 3)}</small></span>
        <span class="vm-main">
          <span class="vm-range">${clock(v.start)} – ${clock(v.end)}${sameDay ? '' : ` <small>(${e.getUTCDate()} ${AY[e.getUTCMonth()].slice(0, 3)})</small>`}</span>
          <span class="vm-sub">${active ? '<b>Şu an</b> · ' : ''}${C.SIGNS[v.sign]} → ${C.SIGNS[v.next]} · ${dur(v.end - v.start)}</span>
        </span>
        ${past ? '' : `<button type="button" class="icon-btn alarm-mini" data-voc="${idx}" aria-label="${s.getUTCDate()} ${AY[s.getUTCMonth()]} ${clock(v.start)} Ay boşluğu için alarm">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="13" r="7.5"/><path d="M12 9.5V13l2.3 1.6M4.5 5.5l3-2.4M19.5 5.5l-3-2.4"/></svg>
        </button>`}
      </li>`;
    }).join('') || '<li class="empty">Bu ay için kalan Ay boşluğu yok.</li>';

    const more = $('vocMonthMore');
    more.hidden = list.length <= shown.length && !showAllVoc;
    more.textContent = showAllVoc ? 'Daha az göster' : `Tümünü göster (${list.length})`;
    $('vocMonthList')._list = list;
  }
  $('vocMonthMore').addEventListener('click', () => { showAllVoc = !showAllVoc; renderVocList(); });
  $('vocMonthList').addEventListener('click', (e) => {
    const b = e.target.closest('[data-voc]');
    if (!b) return;
    const v = $('vocMonthList')._list[Number(b.dataset.voc)];
    vocAlarm(v, 'start');
  });

  function vocAlarm(v, kind) {
    const D = window.LunaDevice;
    if (!D) return;
    const start = kind === 'start';
    D.alarmFlow({
      date: new Date(start ? v.start : v.end),
      kicker: start ? 'Boşluk başlangıcı' : 'Boşluk bitişi',
      title: start ? 'Ay boşluğu başlıyor' : 'Ay boşluğu bitti',
      body: start
        ? `Ay ${C.SIGNS[v.sign]} burcunda boşluğa giriyor. Yeni başlangıçları erteleyin. — luna.gram`
        : `Ay ${signDative(v.next)} geçti; boşluk sona erdi. — luna.gram`
    });
  }

  function phaseNameOf(el) {
    if (el < 6 || el >= 354) return 'Yeniay';
    if (el < 84) return 'Büyüyen Hilal';
    if (el < 96) return 'İlk Dördün';
    if (el < 174) return 'Büyüyen Şişkin Ay';
    if (el < 186) return 'Dolunay';
    if (el < 264) return 'Küçülen Şişkin Ay';
    if (el < 276) return 'Son Dördün';
    return 'Küçülen Hilal';
  }

  // ---------- Gün detayı ----------
  let sheetDay = null;
  function openDay(i) {
    const d = month.days[i];
    const ev = evals[i];
    sheetDay = { d, ev, i };
    const now = Date.now();
    const past = d.end <= now;
    const phaseName = phaseNameOf(d.elong);

    let verdict = '';
    if (activity && ev) {
      const lbl = ev.status === 'good' ? (ev.best ? 'En uygun gün' : 'Uygun gün') : ev.status === 'bad' ? 'Kaçınılması önerilir' : 'Nötr gün';
      const wins = ev.windows.map((w) => `<li><span class="w-time">${clock(w.start)} – ${clockEnd(w.end, d.start)}</span><span class="w-sign">Ay ${signLoc(w.sign)}</span></li>`).join('');
      verdict = `<div class="verdict v-${ev.status}${ev.best ? ' v-best' : ''}">
        <div class="verdict-head">${actIcon(activity, 'verdict-ico')}<div><span class="verdict-act">${activity.title}</span><strong>${lbl}</strong></div></div>
        <p class="verdict-why">${esc(ev.reasons.join(' · '))}</p>
        ${wins ? `<p class="verdict-sub">En iyi saatler</p><ul class="verdict-wins">${wins}</ul>` : ''}
        ${ev.status !== 'good' ? `<p class="verdict-rule">${esc(ev.status === 'bad' ? activity.bad : activity.good)}</p>` : ''}
      </div>`;
    }

    const segs = d.segments.map((s) => `<li><span class="w-time">${clock(s.start)} – ${clockEnd(s.end, d.start)}</span><span><span class="ds-glyph">${glyph(s.sign)}</span> ${C.SIGNS[s.sign]}</span></li>`).join('');
    const vocs = d.vocs.map((v, k) => `<li>
        <span class="w-time">${clock(v.fullStart)} – ${clock(v.fullEnd)}</span>
        <span>${dur(v.fullEnd - v.fullStart)}</span>
        ${v.fullStart > now ? `<button type="button" class="icon-btn alarm-mini" data-dvoc="${k}" aria-label="Bu Ay boşluğu için alarm"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="13" r="7.5"/><path d="M12 9.5V13l2.3 1.6M4.5 5.5l3-2.4M19.5 5.5l-3-2.4"/></svg></button>` : ''}
      </li>`).join('');
    const events = d.events.map((e) => `<li><span class="w-time">${e.type === 'station' ? '' : clock(e.time)}</span><span>${esc(e.title)}</span></li>`).join('');
    const defaultTitle = activity ? activity.title : 'Gökyüzü notu';

    $('daySheetBody').innerHTML = `
      <p class="sheet-kicker">${GUN[d.weekday]}${now >= d.start && now < d.end ? ' · Bugün' : ''}</p>
      <h3 class="sheet-title" id="daySheetTitle">${d.dayNum} ${AY[month.month]} ${month.year}</h3>
      <p class="sheet-when">${d.waxing ? 'Büyüyen' : 'Küçülen'} Ay · %${Math.round(d.illum * 100)} aydınlık${phaseName ? ` · ${phaseName}` : ''}</p>
      ${verdict}
      <div class="ds-block"><p class="ds-label">Ay'ın burcu</p><ul class="ds-list">${segs}</ul></div>
      ${vocs ? `<div class="ds-block ds-voc"><p class="ds-label">Ay boşluğu</p><ul class="ds-list">${vocs}</ul></div>` : ''}
      ${events ? `<div class="ds-block"><p class="ds-label">Gökyüzü olayları</p><ul class="ds-list">${events}</ul></div>` : ''}
      ${past ? '' : `
      <div class="ds-add">
        <label class="ds-label" for="dsTitle">Takvime ekle</label>
        <input id="dsTitle" class="ds-input" type="text" maxlength="80" value="${esc(defaultTitle)}" placeholder="Ör. Kuaför randevusu" autocomplete="off">
        ${ev && ev.windows.length ? `<p class="ds-hint">${clock(ev.windows[0].start)} – ${clockEnd(ev.windows[0].end, d.start)} aralığına eklenir; saati takviminde değiştirebilirsin.</p>` : '<p class="ds-hint">Tüm gün etkinliği olarak eklenir.</p>'}
      </div>`}
      <div class="sheet-actions">
        ${past ? '' : '<button type="button" class="sheet-btn sheet-btn--primary" id="dsAdd">Takvime ekle</button>'}
        ${activity ? `<a class="sheet-btn sheet-btn--link" href="${activity.page}">${activity.title} rehberi</a>` : ''}
        <button type="button" class="sheet-btn sheet-btn--ghost" id="dsClose">Kapat</button>
      </div>`;

    const sheet = $('daySheet');
    sheet.hidden = false;
    requestAnimationFrame(() => sheet.classList.add('open'));
  }

  function closeDay() {
    const s = $('daySheet');
    s.classList.remove('open');
    setTimeout(() => { s.hidden = true; }, 260);
  }

  $('daySheet').addEventListener('click', async (e) => {
    if (e.target.id === 'daySheet' || e.target.id === 'dsClose') { closeDay(); return; }
    const dv = e.target.closest('[data-dvoc]');
    if (dv && sheetDay) {
      const v = sheetDay.d.vocs[Number(dv.dataset.dvoc)];
      closeDay();
      vocAlarm({ start: v.fullStart, end: v.fullEnd, sign: v.sign, next: v.next }, 'start');
      return;
    }
    if (e.target.id === 'dsAdd' && sheetDay) {
      const D = window.LunaDevice;
      const { d, ev } = sheetDay;
      const title = ($('dsTitle').value || '').trim() || (activity ? activity.title : 'Gökyüzü notu');
      const lines = [];
      if (activity && ev) lines.push(`${activity.title}: ${ev.status === 'good' ? (ev.best ? 'en uygun gün' : 'uygun gün') : ev.status === 'bad' ? 'kaçınılması önerilir' : 'nötr gün'} (${ev.reasons.join(', ')}).`);
      lines.push(`Ay: ${d.segments.map((s) => `${clock(s.start)} ${C.SIGNS[s.sign]}`).join(', ')}.`);
      if (d.vocs.length) lines.push(`Ay boşluğu: ${d.vocs.map((v) => `${clock(v.fullStart)}–${clock(v.fullEnd)}`).join(', ')}.`);
      lines.push('— luna.gram');
      const win = ev && ev.windows.length ? ev.windows.find((w) => w.end > Date.now()) || ev.windows[0] : null;
      try {
        const how = await D.addToCalendar(win
          ? { begin: new Date(Math.max(win.start, Date.now())), end: new Date(win.end), title, body: lines.join('\n') }
          : { begin: new Date(d.noon), allDay: true, title, body: lines.join('\n') });
        closeDay();
        D.toast(how === 'native' ? 'Takvim açıldı; kaydetmeyi unutma.' : 'Takvim dosyası indirildi.');
      } catch (err) {
        D.toast('Takvime eklenemedi.');
      }
    }
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('daySheet').hidden) closeDay(); });

  // ---------- Başlat ----------
  renderChips();
  load();
})();
