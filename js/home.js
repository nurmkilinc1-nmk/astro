// ===== home.js — luna.gram anasayfa =====
// Ay doğuş/batış, Ay boşluğu kartı (tek zil), önümüzdeki 3 gün, kişisel bağlantılar.
(function () {
  'use strict';

  const C = window.AstroCore;
  const $ = (id) => document.getElementById(id);

  if (!C || !window.Astronomy) {
    const s = $('vocStatusText');
    if (s) s.textContent = 'Astronomi verisi yüklenemedi';
    return;
  }
  const A = window.Astronomy;

  const GUN_KISA = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];
  const DAY = 864e5;
  const H = 36e5;
  const TZ = 3 * H;
  const OBS = new A.Observer(41.0082, 28.9784, 40); // İstanbul

  // ---------- Biçimlendirme (İstanbul saati) ----------
  const ist = (d) => C.toIstanbul(d);
  const pad = (n) => String(n).padStart(2, '0');
  const clock = (d) => { const x = ist(d); return `${pad(x.getUTCHours())}:${pad(x.getUTCMinutes())}`; };
  const dayKey = (d) => { const x = ist(d); return `${x.getUTCFullYear()}-${x.getUTCMonth()}-${x.getUTCDate()}`; };
  const istMidnight = (d) => { const x = ist(d); return Date.UTC(x.getUTCFullYear(), x.getUTCMonth(), x.getUTCDate()) - TZ; };
  function dayLabel(d, now) {
    const x = ist(d);
    if (dayKey(d) === dayKey(now)) return 'Bugün';
    if (dayKey(d) === dayKey(new Date(now.getTime() + DAY))) return 'Yarın';
    return `${x.getUTCDate()} ${C.AY_TR_KISA[x.getUTCMonth()]} ${GUN_KISA[x.getUTCDay()]}`;
  }
  function duration(ms) {
    const t = Math.max(0, Math.round(ms / 60000));
    const d = Math.floor(t / 1440), h = Math.floor((t % 1440) / 60), m = t % 60;
    if (d > 0) return `${d} g ${h} sa`;
    if (h > 0) return m ? `${h} sa ${m} dk` : `${h} sa`;
    return `${m} dk`;
  }
  const signDative = (i) => `${C.SIGNS[i]}'${['a', 'ya', 'e', 'e', 'a', 'a', 'ye', 'e', 'a', 'a', 'ya', 'a'][i]}`;
  const BELL = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.6 2.1H4.4z"/><path d="M10 20.6a2.1 2.1 0 0 0 4 0"/><path class="bell-ring" d="M3.2 9.6a9 9 0 0 1 2.3-4.8M20.8 9.6a9 9 0 0 0-2.3-4.8"/></svg>';

  // Küçük faz simgesi (elongasyona göre)
  function moonIcon(elong) {
    const f = elong / 360, r = 8, cx = 10, cy = 10;
    const k = Math.cos(2 * Math.PI * f);
    const rx = Math.max(0.01, Math.abs(k) * r).toFixed(2);
    const wax = f < 0.5, cres = k > 0;
    const d = `M${cx} ${cy - r} A${r} ${r} 0 0 ${wax ? 1 : 0} ${cx} ${cy + r} A${rx} ${r} 0 0 ${wax ? (cres ? 0 : 1) : (cres ? 1 : 0)} ${cx} ${cy - r}Z`;
    return `<svg viewBox="0 0 20 20" class="wk-moon" aria-hidden="true"><circle cx="10" cy="10" r="8" class="wk-dark"/><path d="${d}" class="wk-lit"/></svg>`;
  }
  const elongAt = (d) => C.norm(C.moonLon(d) - C.norm(A.Ecliptic(A.GeoVector(A.Body.Sun, d, true)).elon));

  // ---------- Ay doğuş / batış ----------
  function renderRiseSet() {
    const now = new Date();
    const rise = A.SearchRiseSet(A.Body.Moon, OBS, +1, A.MakeTime(now), 1.2);
    const set = A.SearchRiseSet(A.Body.Moon, OBS, -1, A.MakeTime(now), 1.2);
    const part = (label, t) => (t ? `${label} ${dayKey(t.date) === dayKey(now) ? '' : 'yarın '}${clock(t.date)}` : null);
    $('heroRiseSet').textContent = [part('Doğuş', rise), part('Batış', set)].filter(Boolean).join('  ·  ');
  }

  // ---------- Ay boşluğu ----------
  let voc = null;
  let upcoming = [];

  function computeAll(now) {
    voc = C.findVoc(now);
    const periods = C.computePeriods(now, new Date(now.getTime() + 10 * DAY));
    upcoming = periods
      .filter((p) => p.end > voc.voidEnd)
      .slice(0, 5)
      .map((p) => ({ start: C.voidStartOf(p), end: p.end, sign: p.sign, next: (p.sign + 1) % 12 }));
  }

  function renderVoc() {
    const now = new Date();
    if (!voc || now >= voc.voidEnd) computeAll(now);
    const active = now >= voc.voidStart && now < voc.voidEnd;
    $('vocCard').classList.toggle('is-active', active);
    $('vocStatusText').textContent = active ? 'Ay şu an boşlukta' : 'Ay boşlukta değil';
    $('vocCountdownLabel').textContent = active ? 'Boşluğun bitmesine' : 'Sıradaki Ay boşluğuna';
    $('vocCountdown').textContent = duration((active ? voc.voidEnd : voc.voidStart) - now);
    const total = voc.voidEnd - voc.voidStart;
    $('vocProgress').style.width = `${active ? Math.min(100, ((now - voc.voidStart) / total) * 100).toFixed(1) : 0}%`;

    const sameDay = dayKey(voc.voidStart) === dayKey(voc.voidEnd);
    $('vocWhen').innerHTML = active
      ? `Bitiş <b>${clock(voc.voidEnd)}</b>${sameDay ? '' : ` (${dayLabel(voc.voidEnd, now)})`} · toplam ${duration(total)}`
      : `${dayLabel(voc.voidStart, now)} <b>${clock(voc.voidStart)}</b> – <b>${clock(voc.voidEnd)}</b>${sameDay ? '' : ` (${dayLabel(voc.voidEnd, now)})`} · ${duration(total)}`;

    const bell = $('vocBell');
    bell.setAttribute('aria-label', active ? `Boşluğun bitişi (${clock(voc.voidEnd)}) için hatırlatıcı kur` : `Boşluğun başlangıcı (${clock(voc.voidStart)}) için hatırlatıcı kur`);
    bell.title = active ? 'Bitişte hatırlat' : 'Başlangıçta hatırlat';

    $('vocUpcoming').innerHTML = upcoming.map((u, i) => `
      <li>
        <span class="voc-up-day">${dayLabel(u.start, now)}</span>
        <span class="voc-up-range">${clock(u.start)} – ${clock(u.end)}${dayKey(u.start) !== dayKey(u.end) ? ` <small>${dayLabel(u.end, now)}</small>` : ''}</span>
        <span class="voc-up-dur">${duration(u.end - u.start)}</span>
        <button type="button" class="bell-btn sm" data-up="${i}" aria-label="${dayLabel(u.start, now)} ${clock(u.start)} için hatırlatıcı">${BELL}</button>
      </li>`).join('');
  }

  function alarm(kind, date, sign, next) {
    const D = window.LunaDevice;
    if (!D) return;
    D.alarmFlow(kind === 'start'
      ? { date, kicker: 'Boşluk başlangıcı', title: 'Ay boşluğu başlıyor', body: `Ay ${C.SIGNS[sign]} burcunda boşluğa giriyor. Yeni başlangıçları erteleyin. — luna.gram` }
      : { date, kicker: 'Boşluk bitişi', title: 'Ay boşluğu bitti', body: `Ay ${signDative(next)} geçti; boşluk sona erdi. — luna.gram` });
  }

  // ---------- Önümüzdeki 3 gün ----------
  const DAYS = 3;
  function renderWeek() {
    const now = new Date();
    const t0 = istMidnight(now);
    const tN = t0 + DAYS * DAY;
    const transitions = C.moonSignTransitions(new Date(t0), new Date(tN));
    const vocs = [{ start: voc.voidStart.getTime(), end: voc.voidEnd.getTime() }].concat(upcoming.map((u) => ({ start: u.start.getTime(), end: u.end.getTime() })));
    const quarters = [];
    let q = A.SearchMoonQuarter(A.MakeTime(new Date(t0 - DAY)));
    while (q.time.date.getTime() < tN) { quarters.push({ t: q.time.date.getTime(), q: q.quarter }); q = A.NextMoonQuarter(q); }
    const QN = ['Yeniay', 'İlk dördün', 'Dolunay', 'Son dördün'];
    const LOC = ['ta', 'da', 'de', 'te', 'da', 'ta', 'de', 'te', 'da', 'ta', 'da', 'ta'];

    const rows = [];
    for (let i = 0; i < DAYS; i++) {
      const ds = t0 + i * DAY, de = ds + DAY;
      const startSign = C.signIndex(C.moonLon(new Date(ds)));
      const tr = transitions.find((x) => x.time.getTime() >= ds && x.time.getTime() < de);
      const ev = quarters.find((x) => x.t >= ds && x.t < de);
      const dayVocs = vocs.filter((v) => v.end > ds && v.start < de);
      const label = i === 0 ? 'Bugün' : i === 1 ? 'Yarın' : GUN_KISA[ist(new Date(ds)).getUTCDay()];

      const main = ev
        ? `<span class="wk-ev">${QN[ev.q]} · ${clock(new Date(ev.t))}</span>`
        : `<span class="wk-sign">Ay ${C.SIGNS[startSign]}'${LOC[startSign]}</span>`;
      const sub = tr ? `${signDative(tr.sign)} geçiş ${clock(tr.time)}` : (ev ? `Ay ${C.SIGNS[startSign]}'${LOC[startSign]}` : '');
      const vocHtml = dayVocs.map((v) => `<span class="wk-voc-chip" title="Ay boşluğu">${clock(new Date(v.start))}–${clock(new Date(v.end))}</span>`).join('');

      rows.push(`
        <li${i === 0 ? ' class="today"' : ''}>
          <span class="wk-day">${label}</span>
          ${moonIcon(elongAt(new Date(ds + 12 * H)))}
          <span class="wk-mid">${main}${sub ? `<small class="wk-sub">${sub}</small>` : ''}</span>
          <span class="wk-right">${vocHtml ? `<small class="wk-voc-label">Boşluk</small>${vocHtml}` : ''}</span>
        </li>`);
    }
    $('weekList').innerHTML = rows.join('');
  }

  // ---------- Kişisel bağlantılar ----------
  function renderPersonal() {
    const NT = window.LunaNatal;
    let p = null;
    try { p = JSON.parse(localStorage.getItem('astro-profile') || 'null'); } catch (e) {}
    if (NT && p && p.birthDate && p.fullName) {
      if (!Number.isInteger(p.cityIndex) && p.birthPlace) {
        const t = p.birthPlace.toLocaleLowerCase('tr-TR');
        const i = NT.CITIES.findIndex((c) => t.startsWith(c[0].toLocaleLowerCase('tr-TR')));
        if (i >= 0) p.cityIndex = i;
      }
      const ch = NT.chart(p);
      const parts = [`Güneş ${NT.SIGNS[ch.sun.sign]}`, `Ay ${ch.moonAlt ? NT.SIGNS[ch.moonAlt[0]] + '/' + NT.SIGNS[ch.moonAlt[1]] : NT.SIGNS[ch.moon.sign]}`];
      if (ch.asc) parts.push(`Yükselen ${NT.SIGNS[ch.asc.sign]}`);
      $('homeProfileTitle').textContent = `${p.fullName.trim().split(/\s+/)[0]}, haritan`;
      $('homeProfileSub').textContent = parts.join(' · ');
      $('homeProfileIcon').innerHTML = `<span class="gl-glyph">${NT.SIGN_GLYPHS[ch.sun.sign]}︎</span>`;
    }
    let notes = [];
    try { notes = JSON.parse(localStorage.getItem('luna-notes') || '[]') || []; } catch (e) {}
    if (notes.length) $('homeNotesSub').textContent = `${notes.length} not · son: ${new Date(notes[0].createdAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })}`;
  }

  // ---------- Başlat ----------
  function bind() {
    $('vocBell').addEventListener('click', () => {
      if (!voc) return;
      const now = new Date();
      const active = now >= voc.voidStart && now < voc.voidEnd;
      if (navigator.vibrate) navigator.vibrate(8);
      alarm(active ? 'end' : 'start', active ? voc.voidEnd : voc.voidStart, voc.sign, voc.nextSign);
    });
    $('vocUpcoming').addEventListener('click', (e) => {
      const b = e.target.closest('[data-up]');
      if (!b) return;
      const u = upcoming[Number(b.dataset.up)];
      if (u) alarm('start', u.start, u.sign, u.next);
    });
  }

  function safe(fn, name) { try { fn(); } catch (e) { console.error(`${name} hatası:`, e); } }

  function start() {
    safe(renderVoc, 'Ay boşluğu');
    safe(renderRiseSet, 'Doğuş/batış');
    safe(renderWeek, '3 günlük Ay');
    safe(renderPersonal, 'Kişisel');
    bind();
    setInterval(() => safe(renderVoc, 'Ay boşluğu'), 30 * 1000);
    setInterval(() => { safe(renderRiseSet, 'Doğuş/batış'); safe(renderWeek, '3 günlük Ay'); }, 15 * 60 * 1000);
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) { safe(renderVoc, 'Ay boşluğu'); safe(renderRiseSet, 'Doğuş/batış'); safe(renderWeek, '3 günlük Ay'); }
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
