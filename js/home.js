// ===== home.js — luna.gram anasayfa: Ay boşluğu kartı, alarm, gökyüzü özeti =====
(function () {
  'use strict';

  const C = window.AstroCore;
  const $ = (id) => document.getElementById(id);

  if (!C || !window.Astronomy) {
    const s = $('vocStatusText');
    if (s) s.textContent = 'Astronomi verisi yüklenemedi';
    return;
  }

  const GUN = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
  const GUN_KISA = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];
  const PLANET_TR = { Sun: 'Güneş', Mercury: 'Merkür', Venus: 'Venüs', Mars: 'Mars', Jupiter: 'Jüpiter', Saturn: 'Satürn' };
  const ASPECT_SYM = { 0: '☌', 60: '⚹', 90: '□', 120: '△', 180: '☍' };
  const ASPECT_TR = { 0: 'kavuşum', 60: 'sekstil', 90: 'kare', 120: 'üçgen', 180: 'karşıtlık' };
  const SUITABLE = [
    'Yeni başlangıçlar, cesur adımlar', 'Finans, keyif, bedene özen', 'İletişim, yazışma, kısa yollar',
    'Ev, aile, duygusal bağlar', 'Yaratıcılık, aşk, eğlence', 'Sağlık, düzen, detaylar',
    'İlişkiler, iş birlikleri', 'Dönüşüm, araştırma, derinlik', 'Keşif, seyahat, öğrenme',
    'Kariyer, hedefler, plan', 'Topluluk, yenilik, fikirler', 'Ruhsallık, sanat, dinlenme'
  ];
  const DAY = 864e5;

  // ---------- Biçimlendirme (İstanbul saati) ----------
  const ist = (d) => C.toIstanbul(d);
  const pad = (n) => String(n).padStart(2, '0');
  const clock = (d) => { const x = ist(d); return `${pad(x.getUTCHours())}:${pad(x.getUTCMinutes())}`; };
  const dayKey = (d) => { const x = ist(d); return `${x.getUTCFullYear()}-${x.getUTCMonth()}-${x.getUTCDate()}`; };

  function dayLabel(d, now) {
    const x = ist(d);
    if (dayKey(d) === dayKey(now)) return 'Bugün';
    if (dayKey(d) === dayKey(new Date(now.getTime() + DAY))) return 'Yarın';
    return `${x.getUTCDate()} ${C.AY_TR_KISA[x.getUTCMonth()]} ${GUN_KISA[x.getUTCDay()]}`;
  }
  function longDate(d) {
    const x = ist(d);
    return `${x.getUTCDate()} ${C.AY_TR[x.getUTCMonth()]} ${x.getUTCFullYear()}, ${GUN[x.getUTCDay()]}`;
  }
  function duration(ms) {
    const totalMin = Math.max(0, Math.round(ms / 60000));
    const d = Math.floor(totalMin / 1440);
    const h = Math.floor((totalMin % 1440) / 60);
    const m = totalMin % 60;
    if (d > 0) return `${d} g ${h} sa`;
    if (h > 0) return `${h} sa ${m} dk`;
    return `${m} dk`;
  }
  function relDays(d, now) {
    const days = Math.round((startOfIstDay(d) - startOfIstDay(now)) / DAY);
    if (days <= 0) return 'Bugün';
    if (days === 1) return 'Yarın';
    return `${days} gün sonra`;
  }
  function startOfIstDay(d) {
    const x = ist(d);
    return Date.UTC(x.getUTCFullYear(), x.getUTCMonth(), x.getUTCDate());
  }
  const signTo = (i) => {
    // Türkçe yönelme eki: Koç'a, Boğa'ya, İkizler'e ...
    const ek = ['a', 'ya', 'e', 'e', 'a', 'a', 'ye', 'e', 'a', 'a', 'ya', 'a'];
    return `${C.SIGNS[i]}'${ek[i]}`;
  };

  // ---------- Ay boşluğu durumu ----------
  let voc = null;
  let upcoming = [];

  function computeAll(now) {
    voc = C.findVoc(now);
    const periods = C.computePeriods(now, new Date(now.getTime() + 10 * DAY));
    upcoming = periods
      .filter((p) => p.end > voc.voidEnd)
      .slice(0, 4)
      .map((p) => ({ start: C.voidStartOf(p), end: p.end, sign: p.sign, next: (p.sign + 1) % 12 }));
  }

  function renderVoc() {
    const now = new Date();
    if (!voc || now >= voc.voidEnd) computeAll(now);

    const active = now >= voc.voidStart && now < voc.voidEnd;
    const card = $('vocCard');
    card.classList.toggle('is-active', active);

    $('vocStatusText').textContent = active ? 'Ay şu an boşlukta' : 'Ay boşlukta değil';
    $('vocCountdownLabel').textContent = active ? 'Boşluğun bitmesine' : 'Sıradaki boşluğa';
    $('vocCountdown').textContent = duration((active ? voc.voidEnd : voc.voidStart) - now);

    const total = voc.voidEnd - voc.voidStart;
    const pct = active ? Math.min(100, ((now - voc.voidStart) / total) * 100) : 0;
    $('vocProgress').style.width = `${pct.toFixed(1)}%`;

    $('vocStartClock').textContent = clock(voc.voidStart);
    $('vocStartDay').textContent = dayLabel(voc.voidStart, now);
    $('vocEndClock').textContent = clock(voc.voidEnd);
    $('vocEndDay').textContent = dayLabel(voc.voidEnd, now);
    $('vocDuration').textContent = duration(total);

    const startBtn = $('alarmStartBtn');
    const startPassed = now >= voc.voidStart;
    startBtn.disabled = startPassed;
    startBtn.querySelector('span').textContent = startPassed ? 'Başladı' : 'Alarm kur';

    const la = voc.lastAspect;
    const aspectTxt = la
      ? `Son açı: Ay ${ASPECT_SYM[la.aspect]} ${PLANET_TR[la.body] || la.body} (${ASPECT_TR[la.aspect]})`
      : 'Bu burçta majör açı yok';
    $('vocFoot').textContent = `${aspectTxt} · ${C.SIGNS[voc.sign]} → ${C.SIGNS[voc.nextSign]}`;

    const list = $('vocUpcoming');
    list.innerHTML = upcoming.map((u, i) => `
      <li>
        <div class="voc-up-main">
          <span class="voc-up-day">${dayLabel(u.start, now)}</span>
          <span class="voc-up-range">${clock(u.start)} – ${clock(u.end)}${dayKey(u.start) !== dayKey(u.end) ? ` <small>(${dayLabel(u.end, now)})</small>` : ''}</span>
          <span class="voc-up-sign">${C.SIGNS[u.sign]} → ${C.SIGNS[u.next]} · ${duration(u.end - u.start)}</span>
        </div>
        <button type="button" class="icon-btn alarm-mini" data-up="${i}" aria-label="${dayLabel(u.start, now)} ${clock(u.start)} için alarm">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="13" r="7.5"/><path d="M12 9.5V13l2.3 1.6M4.5 5.5l3-2.4M19.5 5.5l-3-2.4"/></svg>
        </button>
      </li>`).join('');
  }

  // ---------- Gökyüzü özeti ----------
  function renderSky() {
    const now = new Date();
    $('homeDate').textContent = longDate(now);

    const nextNew = C.nextQuarter(now, 0);
    const nextFull = C.nextQuarter(now, 2);
    const isFull = nextFull < nextNew;
    const phaseDate = isFull ? nextFull : nextNew;
    const ecl = C.eclipseAt(phaseDate, isFull ? 2 : 0);
    $('tilePhaseLabel').textContent = isFull ? 'Sıradaki dolunay' : 'Sıradaki yeniay';
    $('tilePhaseValue').textContent = `${dayLabel(phaseDate, now)} · ${clock(phaseDate)}`;
    $('tilePhaseSub').textContent = ecl ? ecl.label : `${C.SIGNS[C.signIndex(C.moonLon(phaseDate))]} burcunda · ${relDays(phaseDate, now)}`;

    const win = voc || C.findVoc(now);
    $('tileSignValue').textContent = C.SIGNS[win.nextSign];
    $('tileSignSub').textContent = `${dayLabel(win.voidEnd, now)} · ${clock(win.voidEnd)}`;

    const e = C.nextEclipse(now);
    $('tileEclipseValue').textContent = `${dayLabel(e.date, now)}`;
    $('tileEclipseSub').textContent = `${e.label} · ${relDays(e.date, now)}`;

    const sign = C.signIndex(C.moonLon(now));
    $('tileGoodValue').textContent = SUITABLE[sign];
    const vocNow = voc && now >= voc.voidStart && now < voc.voidEnd;
    $('tileGoodSub').textContent = vocNow ? 'Boşluk sürerken yeni işe başlama' : `Ay ${C.SIGNS[sign]} burcunda`;
  }

  // ---------- Alarm (ortak: js/device.js) ----------
  function alarmText(kind, sign, next) {
    return kind === 'start'
      ? { title: 'Ay boşluğu başlıyor', body: `Ay ${C.SIGNS[sign]} burcunda boşluğa giriyor. Yeni başlangıçları erteleyin. — luna.gram` }
      : { title: 'Ay boşluğu bitti', body: `Ay ${signTo(next)} geçti; boşluk sona erdi. — luna.gram` };
  }
  function handleAlarm(kind, date, sign, next) {
    const D = window.LunaDevice;
    if (!D) return;
    const { title, body } = alarmText(kind, sign, next);
    D.alarmFlow({ date, title, body, kicker: kind === 'start' ? 'Boşluk başlangıcı' : 'Boşluk bitişi' });
  }

  function bindUi() {
    $('alarmStartBtn').addEventListener('click', () => handleAlarm('start', voc.voidStart, voc.sign, voc.nextSign));
    $('alarmEndBtn').addEventListener('click', () => handleAlarm('end', voc.voidEnd, voc.sign, voc.nextSign));
    $('vocUpcoming').addEventListener('click', (e) => {
      const b = e.target.closest('[data-up]');
      if (!b) return;
      const u = upcoming[Number(b.dataset.up)];
      if (u) handleAlarm('start', u.start, u.sign, u.next);
    });

    const info = $('vocInfoBtn');
    info.addEventListener('click', () => {
      const ex = $('vocExplain');
      const open = ex.hidden;
      ex.hidden = !open;
      info.setAttribute('aria-expanded', String(open));
    });

  }

  function tick() {
    try { renderVoc(); } catch (e) { console.error('VOC hesaplama hatası:', e); }
  }

  function renderProfileCta() {
    const NT = window.LunaNatal;
    let p = null;
    try { p = JSON.parse(localStorage.getItem('astro-profile') || 'null'); } catch (e) {}
    if (!NT || !p || !p.birthDate || !p.fullName) return;
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
  }

  function start() {
    try { renderProfileCta(); } catch (e) { console.error('Profil özeti hatası:', e); }
    tick();
    try { renderSky(); } catch (e) { console.error('Gökyüzü özeti hatası:', e); }
    bindUi();
    setInterval(tick, 30 * 1000);
    setInterval(() => { try { renderSky(); } catch (e) {} }, 10 * 60 * 1000);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) { tick(); renderSky(); } });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
