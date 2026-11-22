// ===== astro-core.js — luna.gram ortak astronomi hesapları =====
// Tüm sayfalarda kopyalanan Ay/burç/VOC/tutulma kodunun tek kaynağı.
// astronomy-engine (global `Astronomy`) bu dosyadan ÖNCE yüklenmelidir.
// Tarayıcıda `window.AstroCore`, Node'da `module.exports` olarak kullanılır.
(function (root) {
  'use strict';

  const A = () => root.Astronomy;

  const SIGNS = ['Koç', 'Boğa', 'İkizler', 'Yengeç', 'Aslan', 'Başak', 'Terazi', 'Akrep', 'Yay', 'Oğlak', 'Kova', 'Balık'];
  const SYMBOLS = ['♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓'];
  const AY_TR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
  const AY_TR_KISA = AY_TR.map((m) => m.slice(0, 3));
  // Türkiye 2016'dan beri yaz saati uygulamıyor: sabit UTC+3.
  const TZ_OFFSET_MS = 3 * 60 * 60 * 1000;
  const HOUR = 3600 * 1000;
  const DAY = 24 * HOUR;

  // Ay boşluğu (VOC) için klasik gezegenler ve majör açılar.
  // Açılar "Ay − gezegen" boylam farkı (elongasyon) olarak tanımlanır; böylece
  // 0° kavuşum ve 180° karşıtlık da gerçek bir işaret değişimiyle yakalanır.
  const VOC_ASPECTS = [0, 60, 90, 120, 180];
  const VOC_ELONGATIONS = [0, 60, 90, 120, 180, 240, 270, 300];
  let vocPlanets = null;
  function getVocPlanets() {
    if (!vocPlanets) {
      const B = A().Body;
      vocPlanets = [B.Sun, B.Mercury, B.Venus, B.Mars, B.Jupiter, B.Saturn];
    }
    return vocPlanets;
  }

  // ---------- Temel yardımcılar ----------
  const norm = (deg) => ((deg % 360) + 360) % 360;
  // -180..180 aralığına indirger
  const signedDiff = (a, b) => norm(a - b + 180) - 180;

  function moonLon(date) {
    return norm(A().EclipticGeoMoon(date).lon);
  }

  function planetLon(body, date) {
    const vec = A().GeoVector(body, date, true);
    return norm(A().Ecliptic(vec).elon);
  }

  function angDist(a, b) {
    const d = Math.abs(a - b) % 360;
    return d > 180 ? 360 - d : d;
  }

  function toIstanbul(date) {
    return new Date(date.getTime() + TZ_OFFSET_MS);
  }

  function signIndex(lon) {
    return Math.floor(norm(lon) / 30) % 12;
  }

  // ---------- Burç geçişleri ----------
  // Ay'ın `target` boylamını t1–t2 arasında geçtiği anı ikiye bölmeyle bulur.
  // Aralıkta geçiş yoksa null döner.
  function findCrossing(t1, t2, target) {
    let lo = t1.getTime();
    let hi = t2.getTime();
    const diffAt = (t) => signedDiff(moonLon(new Date(t)), target);
    const loDiff = diffAt(lo);
    const hiDiff = diffAt(hi);
    if ((loDiff < 0) === (hiDiff < 0)) return null;
    for (let i = 0; i < 40; i++) {
      const mid = (lo + hi) / 2;
      if ((diffAt(mid) < 0) === (loDiff < 0)) lo = mid; else hi = mid;
    }
    return new Date((lo + hi) / 2);
  }

  // start–end arasındaki Ay burç geçişleri: [{time, sign}]
  function moonSignTransitions(startDate, endDate, stepMs = 4 * HOUR) {
    const transitions = [];
    let prevT = startDate.getTime();
    let prevSign = signIndex(moonLon(startDate));
    for (let t = prevT + stepMs; t <= endDate.getTime() + stepMs; t += stepMs) {
      const s = signIndex(moonLon(new Date(t)));
      if (s !== prevSign) {
        const cross = findCrossing(new Date(prevT), new Date(t), s * 30);
        if (cross && cross.getTime() <= endDate.getTime()) transitions.push({ time: cross, sign: s });
        prevSign = s;
      }
      prevT = t;
    }
    return transitions;
  }

  // Ayın tam olarak geçirdiği burç dönemleri: [{start, end, sign}]
  // (Başlangıçtaki yarım dönem dahil edilmez — eski davranışla aynı.)
  function computePeriods(startDate, endDate) {
    const tr = moonSignTransitions(startDate, endDate);
    const periods = [];
    for (let i = 0; i < tr.length - 1; i++) {
      periods.push({ start: tr[i].time, end: tr[i + 1].time, sign: tr[i].sign });
    }
    return periods;
  }

  // Ay'ın şu an içinde bulunduğu burç dönemi: {start, end, sign}
  function findSignWindow(now) {
    const stepMs = 4 * HOUR;
    const curSign = signIndex(moonLon(now));
    let end = null;
    let start = null;

    for (let t = now.getTime(), i = 0; !end && i < 30; i++) {
      const next = t + stepMs;
      const s = signIndex(moonLon(new Date(next)));
      if (s !== curSign) end = findCrossing(new Date(t), new Date(next), s * 30);
      t = next;
    }
    for (let t = now.getTime(), i = 0; !start && i < 30; i++) {
      const prev = t - stepMs;
      const s = signIndex(moonLon(new Date(prev)));
      if (s !== curSign) start = findCrossing(new Date(prev), new Date(t), curSign * 30);
      t = prev;
    }
    return { start, end, sign: curSign };
  }

  // ---------- Ay boşluğu (VOC) ----------
  function elongation(body, date) {
    return norm(moonLon(date) - planetLon(body, date));
  }

  function bisectElongation(body, target, t1, t2) {
    let lo = t1.getTime();
    let hi = t2.getTime();
    const f = (t) => signedDiff(elongation(body, new Date(t)), target);
    const loNeg = f(lo) < 0;
    for (let i = 0; i < 30; i++) {
      const mid = (lo + hi) / 2;
      if ((f(mid) < 0) === loNeg) lo = mid; else hi = mid;
    }
    return new Date((lo + hi) / 2);
  }

  // start–end arasında Ay'ın klasik gezegenlerle yaptığı tüm majör açılar.
  // [{time, body, aspect}] — zamana göre sıralı.
  function findMoonAspects(start, end, stepMs = 20 * 60 * 1000) {
    const times = [];
    for (let t = start.getTime(); t < end.getTime(); t += stepMs) times.push(new Date(t));
    times.push(new Date(end.getTime()));
    const moonVals = times.map(moonLon);
    const found = [];

    for (const body of getVocPlanets()) {
      const elong = times.map((t, i) => norm(moonVals[i] - planetLon(body, t)));
      for (let i = 1; i < times.length; i++) {
        for (const target of VOC_ELONGATIONS) {
          const prev = signedDiff(elong[i - 1], target);
          const cur = signedDiff(elong[i], target);
          // Sadece hedefin yakınındaki gerçek geçişler (±180 sarmasını değil)
          if ((prev < 0) !== (cur < 0) && Math.abs(prev) < 30 && Math.abs(cur) < 30) {
            found.push({
              time: bisectElongation(body, target, times[i - 1], times[i]),
              body,
              aspect: target > 180 ? 360 - target : target
            });
          }
        }
      }
    }
    found.sort((a, b) => a.time - b.time);
    return found;
  }

  // Bir burç döneminde Ay boşluğunun başladığı an: son majör açının zamanı.
  // Dönem boyunca hiç açı yoksa dönemin tamamı boştur (başlangıç döner).
  function voidStartOf(period) {
    const aspects = findMoonAspects(period.start, period.end);
    return aspects.length ? aspects[aspects.length - 1].time : period.start;
  }

  // Şu anki burç dönemi için VOC: {voidStart, voidEnd, sign, nextSign, lastAspect}
  function findVoc(now) {
    const win = findSignWindow(now);
    const aspects = findMoonAspects(win.start, win.end);
    const last = aspects.length ? aspects[aspects.length - 1] : null;
    return {
      voidStart: last ? last.time : win.start,
      voidEnd: win.end,
      sign: win.sign,
      nextSign: (win.sign + 1) % 12,
      lastAspect: last
    };
  }

  // ---------- Fazlar ----------
  function lastQuarterBefore(date, quarter) {
    let q = A().SearchMoonQuarter(A().MakeTime(new Date(date.getTime() - 40 * DAY)));
    let last = null;
    while (q.time.date.getTime() < date.getTime()) {
      if (q.quarter === quarter) last = q.time.date;
      q = A().NextMoonQuarter(q);
    }
    return last;
  }
  const lastNewMoonBefore = (date) => lastQuarterBefore(date, 0);
  const lastFullMoon = (date) => lastQuarterBefore(date, 2);

  // quarter: 0 Yeniay, 1 İlk Dördün, 2 Dolunay, 3 Son Dördün
  function nextQuarter(date, quarter) {
    let q = A().SearchMoonQuarter(A().MakeTime(date));
    while (q.quarter !== quarter) q = A().NextMoonQuarter(q);
    return q.time.date;
  }

  function phaseDurum(date) {
    return A().MoonPhase(date) < 180 ? 'büyüyor' : 'küçülüyor';
  }

  const PHASE_EMOJIS = ['🌑', '🌒', '🌓', '🌔', '🌕', '🌖', '🌗', '🌘'];
  function phaseEmoji(phaseAngle) {
    return PHASE_EMOJIS[Math.round(norm(phaseAngle) / 45) % 8];
  }

  // ---------- Tutulmalar ----------
  const LUNAR_KIND_TR = { penumbral: 'Yarıgölge', partial: 'Parçalı', total: 'Tam' };
  const SOLAR_KIND_TR = { partial: 'Parçalı', annular: 'Halkalı', total: 'Tam' };

  // {type: 'lunar'|'solar', kind, kindTr, label, date}
  function nextLunarEclipse(date) {
    const e = A().SearchLunarEclipse(A().MakeTime(date));
    const kindTr = LUNAR_KIND_TR[e.kind] || '';
    return { type: 'lunar', kind: e.kind, kindTr, label: `${kindTr} Ay Tutulması`.trim(), date: e.peak.date };
  }

  function nextSolarEclipse(date) {
    const e = A().SearchGlobalSolarEclipse(A().MakeTime(date));
    const kindTr = SOLAR_KIND_TR[e.kind] || '';
    return { type: 'solar', kind: e.kind, kindTr, label: `${kindTr} Güneş Tutulması`.trim(), date: e.peak.date };
  }

  function nextEclipse(date) {
    const l = nextLunarEclipse(date);
    const s = nextSolarEclipse(date);
    return l.date <= s.date ? l : s;
  }

  // Verilen Yeniay/Dolunay anına denk gelen tutulma (±1 gün), yoksa null.
  function eclipseAt(date, quarter) {
    const from = new Date(date.getTime() - DAY);
    const e = quarter === 2 ? nextLunarEclipse(from) : nextSolarEclipse(from);
    return Math.abs(e.date - date) <= DAY ? e : null;
  }

  // ---------- Biçimlendirme (İstanbul saatine çevrilmiş tarih bekler) ----------
  const pad = (n) => String(n).padStart(2, '0');
  function fmtSaat(d) {
    return `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
  }
  function fmtTarihSaat(d) {
    return `${pad(d.getUTCDate())} ${AY_TR_KISA[d.getUTCMonth()]}, ${fmtSaat(d)}`;
  }
  function fmtDegree(deg) {
    let d = Math.floor(deg);
    let m = Math.round((deg - d) * 60);
    if (m === 60) { m = 0; d += 1; }
    return `${d}°${pad(m)}′`;
  }

  const api = {
    SIGNS, SYMBOLS, AY_TR, AY_TR_KISA, TZ_OFFSET_MS, VOC_ASPECTS,
    get VOC_PLANETS() { return getVocPlanets(); },
    norm, signedDiff, moonLon, planetLon, angDist, toIstanbul, signIndex,
    findCrossing, moonSignTransitions, computePeriods, findSignWindow,
    findMoonAspects, voidStartOf, findVoc,
    lastNewMoonBefore, lastFullMoon, nextQuarter, phaseDurum, phaseEmoji,
    nextLunarEclipse, nextSolarEclipse, nextEclipse, eclipseAt,
    fmtSaat, fmtTarihSaat, fmt: fmtTarihSaat, fmtDegree
  };

  root.AstroCore = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
