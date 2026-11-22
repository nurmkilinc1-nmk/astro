// ===== activities.js — luna.gram etkinlik kuralları ve aylık gökyüzü verisi =====
// Özel takvimlerin (saç, imza, sağlık...) "uygun / kaçın" kuralları burada tek
// kaynaktan tanımlanır. js/astro-core.js'e bağımlıdır.
(function (root) {
  'use strict';

  const H = 3600 * 1000;
  const DAY = 24 * H;
  const TZ = 3 * H; // İstanbul, sabit UTC+3

  const PLANET_TR = { Mercury: 'Merkür', Venus: 'Venüs', Mars: 'Mars', Jupiter: 'Jüpiter', Saturn: 'Satürn' };

  // Kural alanları:
  //  goodSigns   Ay bu burçlardayken uygun (yoksa burç şartı yok)
  //  bestSigns   bu burçlarda "En uygun"
  //  badSigns    günün çoğunda Ay bu burçlardaysa kaçın
  //  phase       'waxing' | 'waning' şartı
  //  bestPhase   bu fazda iyi pencereler "En uygun"
  //  afterNewMoon / bestAfterNewMoon  Yeniay'dan sonraki ilk N gün
  //  retro       bu gezegenler retrodaysa kaçın
  //  avoidFullMoon / avoidBalsamic / avoidPreFull  faz kaynaklı kaçınma
  //  avoidVOC    Ay boşluğu saatleri pencereden çıkarılır
  //  hours       önerinin geçerli olduğu saat aralığı [başlangıç, bitiş]
  const ACTIVITIES = [
    {
      id: 'sac', name: 'Saç', title: 'Saç kesimi & bakım', page: 'sac-bakim.html', emoji: '✂️',
      icon: '<circle cx="6.5" cy="7" r="2.5"/><circle cx="6.5" cy="17" r="2.5"/><path d="M8.6 8.4 20 17M8.6 15.6 20 7"/>',
      rules: { goodSigns: [1, 4, 9], badSigns: [3, 11], bestPhase: 'waxing', avoidVOC: true, hours: [9, 20] },
      good: 'Ay Boğa, Aslan veya Oğlak burcunda; büyüyen Ay saçın gürleşmesini destekler.',
      bad: 'Ay Yengeç veya Balık burcunda ya da boşlukta.'
    },
    {
      id: 'imza', name: 'İmza', title: 'İmza & sözleşme', page: 'imza-sozlesme.html', emoji: '✍️',
      icon: '<path d="M4 19.5h16"/><path d="m14.5 4.5 4 4L9 18l-4.5 1 1-4.5z"/>',
      rules: { goodSigns: [1, 3, 9], bestPhase: 'waxing', retro: ['Mercury'], avoidVOC: true, hours: [9, 18] },
      good: 'Ay Boğa, Yengeç veya Oğlak burcunda, boşlukta değil ve Merkür direkt.',
      bad: 'Merkür retrosu ya da mesai saatlerinin çoğunda Ay boşluğu.'
    },
    {
      id: 'saglik', name: 'Sağlık', title: 'Sağlık & tedavi', page: 'saglik-tedavi.html', emoji: '🩺',
      icon: '<path d="M12 20s-7.5-4.4-7.5-10A4.3 4.3 0 0 1 12 7.6 4.3 4.3 0 0 1 19.5 10c0 5.6-7.5 10-7.5 10z"/><path d="M9 12.5h1.8l1-2 1.5 4 1-2H15"/>',
      rules: { goodSigns: [5, 9], bestPhase: 'waning', avoidFullMoon: true, avoidVOC: true, hours: [8, 18] },
      good: 'Ay Başak veya Oğlak burcunda; küçülen Ay iyileşmeyi destekler.',
      bad: 'Dolunay günleri ve gün boyu süren Ay boşluğu.'
    },
    {
      id: 'seyahat', name: 'Seyahat', title: 'Seyahat', page: 'seyahat.html', emoji: '✈️',
      icon: '<path d="M10.5 13.5 3.5 11l1.5-1.5 7 1 4-4c1-1 2.6-1.3 3.3-.6s.4 2.3-.6 3.3l-4 4 1 7-1.5 1.5-2.5-7-3 3v2.5L7.2 21l-1-3.2L3 16.8 4.2 15.3h2.5z"/>',
      rules: { goodSigns: [8, 2], bestSigns: [8], avoidVOC: true, hours: [6, 22] },
      good: 'Ay Yay (en iyisi) veya İkizler burcunda, boşlukta değil.',
      bad: 'Günün çoğunu kaplayan Ay boşluğu.'
    },
    {
      id: 'sosyal', name: 'Buluşma', title: 'Sosyal & ilk buluşma', page: 'sosyal.html', emoji: '🥂',
      icon: '<path d="M7 3.5h5l-.5 6a2 2 0 0 1-4 0z"/><path d="M9.5 11.5v8M7 19.5h5"/><path d="M14.5 6.5h4.5l-.5 5.5a2 2 0 0 1-3.6 0z" opacity=".55"/>',
      rules: { goodSigns: [1, 4, 6], bestSigns: [6], retro: ['Venus'], avoidVOC: true, hours: [12, 23] },
      good: 'Ay Boğa, Aslan veya Terazi (en iyisi) burcunda.',
      bad: 'Venüs retrosu ya da akşamın çoğunda Ay boşluğu.'
    },
    {
      id: 'yeni', name: 'Başlangıç', title: 'Yeni başlangıçlar', page: 'yeni-baslangiclar.html', emoji: '🌱',
      icon: '<path d="M12 20v-8"/><path d="M12 12c0-4 3-6.5 7-6.5 0 4-3 6.5-7 6.5zM12 14c0-3-2.3-5-5.5-5 0 3 2.3 5 5.5 5z"/>',
      rules: { afterNewMoon: 7, bestAfterNewMoon: 3, avoidBalsamic: true, avoidVOC: true, hours: [8, 21] },
      good: 'Yeniay\'dan sonraki ilk hafta, Ay boşluğu dışında.',
      bad: 'Yeniay öncesi karanlık Ay (balsamik) günleri.'
    },
    {
      id: 'detoks', name: 'Detoks', title: 'Detoks & arınma', page: 'detoks.html', emoji: '💧',
      icon: '<path d="M12 3.5s6 6.4 6 10.5a6 6 0 0 1-12 0c0-4.1 6-10.5 6-10.5z"/><path d="M9.5 14.5a2.5 2.5 0 0 0 2.5 2.5"/>',
      rules: { phase: 'waning', bestSigns: [5], avoidPreFull: true, avoidVOC: false, hours: [7, 22] },
      good: 'Küçülen Ay; Başak burcunda en etkili.',
      bad: 'Dolunaya giden şişkin Ay günleri.'
    },
    {
      id: 'bahce', name: 'Bahçe', title: 'Bahçe & ekim', page: 'bahcivanlik.html', emoji: '🪴',
      icon: '<path d="M6 13.5h12l-1.5 7h-9z"/><path d="M12 13.5V9"/><path d="M12 9c0-2.8 2-4.5 4.8-4.5 0 2.8-2 4.5-4.8 4.5zM12 10.5C12 8.4 10.5 7 8.3 7c0 2.1 1.5 3.5 3.7 3.5z"/>',
      rules: { goodSigns: [3, 7, 11], badSigns: [2, 4, 10], bestPhase: 'waxing', avoidVOC: true, hours: [6, 20] },
      good: 'Ay verimli su burçlarında (Yengeç, Akrep, Balık); ekim için büyüyen Ay.',
      bad: 'Ay kısır burçlarda (İkizler, Aslan, Kova).'
    },
    {
      id: 'mutfak', name: 'Mutfak', title: 'Gıda & mutfak', page: 'gida-mutfak.html', emoji: '🫙',
      icon: '<path d="M7 7.5h10v11a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2z"/><path d="M6.5 4h11v3.5h-11z"/><path d="M10 12.5h4"/>',
      rules: { goodSigns: [3, 7, 11], badSigns: [4, 10], avoidVOC: true, hours: [8, 21] },
      good: 'Ay su burçlarında (Yengeç, Akrep, Balık): konserve, turşu, mayalama.',
      bad: 'Ay Aslan veya Kova burcunda.'
    }
  ];

  const byId = Object.fromEntries(ACTIVITIES.map((a) => [a.id, a]));

  // ---------- yardımcılar ----------
  const norm = (d) => ((d % 360) + 360) % 360;
  const overlap = (a0, a1, b0, b1) => Math.max(0, Math.min(a1, b1) - Math.max(a0, b0));

  function subtractIntervals(s, e, cuts) {
    let pieces = [[s, e]];
    for (const c of cuts) {
      const next = [];
      for (const [a, b] of pieces) {
        if (c.end <= a || c.start >= b) { next.push([a, b]); continue; }
        if (c.start > a) next.push([a, c.start]);
        if (c.end < b) next.push([c.end, b]);
      }
      pieces = next;
    }
    return pieces;
  }

  function planetLon(A, body, date) {
    return norm(A.Ecliptic(A.GeoVector(body, date, true)).elon);
  }
  function isRetro(A, body, date) {
    let diff = planetLon(A, body, new Date(date.getTime() + DAY)) - planetLon(A, body, date);
    if (diff > 180) diff -= 360;
    if (diff < -180) diff += 360;
    return diff < 0;
  }

  // ---------- Aylık gökyüzü verisi ----------
  // year, month (0-11) İstanbul takvimine göre. Dönen her gün: segments (Ay burçları),
  // vocs (Ay boşlukları), events (faz, tutulma, Güneş geçişi, retro dönüşleri)...
  const cache = new Map();
  function buildMonth(year, month) {
    const key = `${year}-${month}`;
    if (cache.has(key)) return cache.get(key);
    const C = root.AstroCore;
    const A = root.Astronomy;

    const mStart = Date.UTC(year, month, 1) - TZ;
    const mEnd = Date.UTC(year, month + 1, 1) - TZ;
    const nDays = Math.round((mEnd - mStart) / DAY);
    const rStart = new Date(mStart - 4 * DAY);
    const rEnd = new Date(mEnd + 4 * DAY);

    // Ay burç dönemleri (tam kapsama)
    const tr = C.moonSignTransitions(rStart, rEnd);
    const segments = [];
    let prevT = rStart.getTime();
    let prevSign = C.signIndex(C.moonLon(rStart));
    for (const t of tr) {
      segments.push({ start: prevT, end: t.time.getTime(), sign: prevSign });
      prevT = t.time.getTime();
      prevSign = t.sign;
    }
    segments.push({ start: prevT, end: rEnd.getTime(), sign: prevSign });

    // Ay boşlukları: tamamı bilinen her burç dönemi için
    const vocs = [];
    for (let i = 1; i < segments.length - 1; i++) {
      const s = segments[i];
      if (s.end < mStart - DAY || s.start > mEnd + DAY) continue;
      const vs = C.voidStartOf({ start: new Date(s.start), end: new Date(s.end), sign: s.sign }).getTime();
      vocs.push({ start: vs, end: s.end, sign: s.sign, next: (s.sign + 1) % 12 });
    }

    // Olaylar
    const events = [];
    let q = A.SearchMoonQuarter(A.MakeTime(new Date(mStart - DAY)));
    while (q.time.date.getTime() < mEnd) {
      const t = q.time.date.getTime();
      if (t >= mStart) {
        const ecl = (q.quarter === 0 || q.quarter === 2) ? C.eclipseAt(q.time.date, q.quarter) : null;
        const names = ['Yeniay', 'İlk Dördün', 'Dolunay', 'Son Dördün'];
        events.push({
          time: t, type: 'phase', quarter: q.quarter,
          title: ecl ? ecl.label : `${C.SIGNS[C.signIndex(C.moonLon(q.time.date))]} ${names[q.quarter]}`,
          short: ecl ? 'Tutulma' : names[q.quarter],
          eclipse: !!ecl
        });
      }
      q = A.NextMoonQuarter(q);
    }

    // Günlük örnekler (öğlen): Güneş burcu, retrolar
    const days = [];
    const sunSignAt = (ms) => C.signIndex(planetLon(A, A.Body.Sun, new Date(ms)));
    let prevSun = sunSignAt(mStart - DAY / 2);
    const retroBodies = ['Mercury', 'Venus', 'Mars'];
    const prevRetro = {};
    retroBodies.forEach((b) => { prevRetro[b] = isRetro(A, A.Body[b], new Date(mStart - DAY / 2)); });

    for (let i = 0; i < nDays; i++) {
      const start = mStart + i * DAY;
      const end = start + DAY;
      const noon = new Date(start + 12 * H);
      const sunSign = sunSignAt(noon.getTime());
      const dayEvents = events.filter((e) => e.time >= start && e.time < end);

      if (sunSign !== prevSun) {
        // Güneş'in burç değiştirdiği anı bul (ikiye bölme)
        let lo = start - DAY / 2, hi = noon.getTime();
        for (let k = 0; k < 24; k++) {
          const mid = (lo + hi) / 2;
          if (sunSignAt(mid) === prevSun) lo = mid; else hi = mid;
        }
        if (hi >= start) dayEvents.push({ time: hi, type: 'sun', title: `Güneş ${C.SIGNS[sunSign]} burcunda`, short: 'Güneş geçişi' });
        else if (days.length) days[days.length - 1].events.push({ time: hi, type: 'sun', title: `Güneş ${C.SIGNS[sunSign]} burcunda`, short: 'Güneş geçişi' });
        prevSun = sunSign;
      }

      const retro = {};
      for (const b of retroBodies) {
        retro[b] = isRetro(A, A.Body[b], noon);
        if (retro[b] !== prevRetro[b]) {
          dayEvents.push({ time: noon.getTime(), type: 'station', title: `${PLANET_TR[b]} ${retro[b] ? 'retroya başlıyor' : 'düzlüğe çıkıyor'}`, short: retro[b] ? 'Retro' : 'Direkt' });
          prevRetro[b] = retro[b];
        }
      }

      const elong = norm(C.moonLon(noon) - planetLon(A, A.Body.Sun, noon));
      const lastNew = C.lastNewMoonBefore(noon);
      const daySegs = segments
        .filter((s) => s.end > start && s.start < end)
        .map((s) => ({ start: Math.max(s.start, start), end: Math.min(s.end, end), sign: s.sign, fullStart: s.start, fullEnd: s.end }));
      const dayVocs = vocs
        .filter((v) => v.end > start && v.start < end)
        .map((v) => ({ start: Math.max(v.start, start), end: Math.min(v.end, end), fullStart: v.start, fullEnd: v.end, sign: v.sign, next: v.next }));
      dayEvents.sort((a, b) => a.time - b.time);

      days.push({
        index: i,
        dayNum: i + 1,
        start, end, noon,
        weekday: new Date(start + TZ).getUTCDay(),
        segments: daySegs,
        vocs: dayVocs,
        events: dayEvents,
        elong,
        waxing: elong < 180,
        illum: A.Illumination(A.Body.Moon, noon).phase_fraction,
        daysSinceNew: lastNew ? (noon - lastNew) / DAY : 99,
        quarters: dayEvents.filter((e) => e.type === 'phase').map((e) => e.quarter),
        retro
      });
    }

    const monthVocs = vocs.filter((v) => v.end > mStart && v.start < mEnd);
    const data = { year, month, start: mStart, end: mEnd, days, vocs: monthVocs, events };
    cache.set(key, data);
    return data;
  }

  // ---------- Bir günü bir etkinlik için değerlendir ----------
  // { status: 'good'|'bad'|'neutral', best, windows: [{start,end,sign}], reasons: [] }
  function evaluate(act, day) {
    const C = root.AstroCore;
    const r = act.rules;
    const ws = day.start + r.hours[0] * H;
    const we = day.start + r.hours[1] * H;
    const span = we - ws;

    // Kesin kaçınma koşulları
    let hard = null;
    if (r.retro) for (const p of r.retro) if (day.retro[p]) hard = `${PLANET_TR[p]} retroda`;
    if (r.avoidFullMoon && day.quarters.includes(2)) hard = 'Dolunay günü';
    if (r.avoidBalsamic && day.elong >= 315) hard = 'Yeniay öncesi karanlık Ay';
    if (r.avoidPreFull && day.elong >= 135 && day.elong < 180) hard = 'Dolunaya giden şişkin Ay';
    if (hard) return { status: 'bad', best: false, windows: [], reasons: [hard] };

    // Faz şartları
    const phaseOk = !r.phase || (r.phase === 'waxing' ? day.waxing : !day.waxing);
    const nmOk = !r.afterNewMoon || day.daysSinceNew <= r.afterNewMoon;

    // Uygun pencereler
    let windows = [];
    if (phaseOk && nmOk) {
      for (const s of day.segments) {
        const a = Math.max(s.start, ws), b = Math.min(s.end, we);
        if (b <= a) continue;
        if (r.goodSigns && !r.goodSigns.includes(s.sign)) continue;
        const pieces = r.avoidVOC ? subtractIntervals(a, b, day.vocs) : [[a, b]];
        for (const [p0, p1] of pieces) if (p1 - p0 >= 60 * 60000) windows.push({ start: p0, end: p1, sign: s.sign });
      }
    }

    if (windows.length) {
      const best =
        windows.some((w) => r.bestSigns && r.bestSigns.includes(w.sign)) ||
        (r.bestPhase && (r.bestPhase === 'waxing' ? day.waxing : !day.waxing)) ||
        (r.bestAfterNewMoon && day.daysSinceNew <= r.bestAfterNewMoon);
      const signs = [...new Set(windows.map((w) => C.SIGNS[w.sign]))].join(', ');
      const reasons = [r.goodSigns || r.bestSigns ? `Ay ${signs} burcunda` : (r.afterNewMoon ? 'Yeniay\'ın ilk haftası' : (r.phase === 'waning' ? 'Küçülen Ay' : 'Uygun gün'))];
      return { status: 'good', best: !!best, windows, reasons };
    }

    // Yumuşak kaçınma: günün çoğu kötü burçta ya da boşlukta
    if (r.badSigns) {
      const badTime = day.segments.reduce((t, s) => t + (r.badSigns.includes(s.sign) ? overlap(s.start, s.end, ws, we) : 0), 0);
      if (badTime >= span * 0.5) {
        const sg = day.segments.find((s) => r.badSigns.includes(s.sign));
        return { status: 'bad', best: false, windows: [], reasons: [`Ay ${C.SIGNS[sg.sign]} burcunda`] };
      }
    }
    if (r.avoidVOC) {
      const vocTime = day.vocs.reduce((t, v) => t + overlap(v.start, v.end, ws, we), 0);
      if (vocTime >= span * 0.5) return { status: 'bad', best: false, windows: [], reasons: ['Ay boşluğu günün çoğunu kaplıyor'] };
    }

    let why = 'Belirgin bir destek yok';
    if (!phaseOk) why = r.phase === 'waning' ? 'Ay büyüyor' : 'Ay küçülüyor';
    else if (!nmOk) why = 'Yeniay\'ın ilk haftası geçti';
    else if (r.goodSigns) why = 'Ay uygun burçlarda değil';
    return { status: 'neutral', best: false, windows: [], reasons: [why] };
  }

  root.LunaActivities = { list: ACTIVITIES, byId, buildMonth, evaluate, PLANET_TR };
})(typeof window !== 'undefined' ? window : globalThis);
