// ===== natal.js — luna.gram doğum haritası hesapları =====
// astronomy-engine (global Astronomy) gerektirir. Tarayıcıda window.LunaNatal,
// Node'da module.exports.
(function (root) {
  'use strict';

  const A = () => root.Astronomy;
  const DEG = Math.PI / 180;
  const H = 3600 * 1000;
  const DAY = 24 * H;
  const norm = (d) => ((d % 360) + 360) % 360;

  // 81 il: [ad, enlem, boylam] (il merkezleri, yaklaşık)
  const CITIES = [
    ['Adana', 37.00, 35.32], ['Adıyaman', 37.76, 38.28], ['Afyonkarahisar', 38.76, 30.54], ['Ağrı', 39.72, 43.05],
    ['Aksaray', 38.37, 34.03], ['Amasya', 40.65, 35.83], ['Ankara', 39.93, 32.86], ['Antalya', 36.90, 30.70],
    ['Ardahan', 41.11, 42.70], ['Artvin', 41.18, 41.82], ['Aydın', 37.85, 27.84], ['Balıkesir', 39.65, 27.88],
    ['Bartın', 41.64, 32.34], ['Batman', 37.89, 41.13], ['Bayburt', 40.26, 40.23], ['Bilecik', 40.14, 29.98],
    ['Bingöl', 38.88, 40.50], ['Bitlis', 38.40, 42.11], ['Bolu', 40.74, 31.61], ['Burdur', 37.72, 30.29],
    ['Bursa', 40.19, 29.06], ['Çanakkale', 40.15, 26.41], ['Çankırı', 40.60, 33.62], ['Çorum', 40.55, 34.95],
    ['Denizli', 37.78, 29.09], ['Diyarbakır', 37.91, 40.24], ['Düzce', 40.84, 31.16], ['Edirne', 41.68, 26.56],
    ['Elazığ', 38.67, 39.22], ['Erzincan', 39.75, 39.49], ['Erzurum', 39.90, 41.27], ['Eskişehir', 39.78, 30.52],
    ['Gaziantep', 37.07, 37.38], ['Giresun', 40.91, 38.39], ['Gümüşhane', 40.46, 39.48], ['Hakkari', 37.58, 43.74],
    ['Hatay', 36.20, 36.16], ['Iğdır', 39.92, 44.04], ['Isparta', 37.76, 30.55], ['İstanbul', 41.01, 28.98],
    ['İzmir', 38.42, 27.14], ['Kahramanmaraş', 37.58, 36.94], ['Karabük', 41.20, 32.62], ['Karaman', 37.18, 33.22],
    ['Kars', 40.60, 43.10], ['Kastamonu', 41.38, 33.78], ['Kayseri', 38.73, 35.49], ['Kilis', 36.72, 37.12],
    ['Kırıkkale', 39.85, 33.51], ['Kırklareli', 41.73, 27.22], ['Kırşehir', 39.15, 34.16], ['Kocaeli', 40.77, 29.92],
    ['Konya', 37.87, 32.48], ['Kütahya', 39.42, 29.98], ['Malatya', 38.35, 38.31], ['Manisa', 38.61, 27.43],
    ['Mardin', 37.31, 40.74], ['Mersin', 36.81, 34.64], ['Muğla', 37.22, 28.36], ['Muş', 38.74, 41.49],
    ['Nevşehir', 38.62, 34.71], ['Niğde', 37.97, 34.68], ['Ordu', 40.98, 37.88], ['Osmaniye', 37.07, 36.25],
    ['Rize', 41.02, 40.52], ['Sakarya', 40.78, 30.40], ['Samsun', 41.29, 36.33], ['Siirt', 37.93, 41.94],
    ['Sinop', 42.03, 35.15], ['Sivas', 39.75, 37.02], ['Şanlıurfa', 37.17, 38.79], ['Şırnak', 37.52, 42.46],
    ['Tekirdağ', 40.98, 27.51], ['Tokat', 40.31, 36.55], ['Trabzon', 41.00, 39.72], ['Tunceli', 39.11, 39.55],
    ['Uşak', 38.68, 29.41], ['Van', 38.49, 43.38], ['Yalova', 40.66, 29.27], ['Yozgat', 39.82, 34.81],
    ['Zonguldak', 41.45, 31.79]
  ];

  const SIGNS = ['Koç', 'Boğa', 'İkizler', 'Yengeç', 'Aslan', 'Başak', 'Terazi', 'Akrep', 'Yay', 'Oğlak', 'Kova', 'Balık'];
  const SIGN_GLYPHS = ['♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓'];
  const ELEMENTS = ['Ateş', 'Toprak', 'Hava', 'Su'];      // burç % 4
  const MODES = ['Öncü', 'Sabit', 'Değişken'];            // burç % 3
  const KEYWORDS = [
    'Cesur, girişken, doğrudan', 'Sabırlı, güvenilir, duyusal', 'Meraklı, konuşkan, çok yönlü',
    'Şefkatli, koruyucu, sezgisel', 'Yaratıcı, cömert, sıcak', 'Titiz, yardımsever, analitik',
    'Uyumlu, zarif, adil', 'Tutkulu, derin, kararlı', 'Özgür, iyimser, maceracı',
    'Disiplinli, hırslı, sorumlu', 'Yenilikçi, bağımsız, insancıl', 'Hayalperest, duyarlı, ruhani'
  ];
  const HOUSE_THEMES = [
    'Benlik ve görünüm', 'Para ve değerler', 'İletişim ve yakın çevre', 'Ev ve aile',
    'Aşk, keyif ve yaratıcılık', 'Sağlık ve günlük düzen', 'İlişkiler ve ortaklıklar', 'Dönüşüm ve ortak kaynaklar',
    'Seyahat, öğrenme ve inanç', 'Kariyer ve hedefler', 'Arkadaşlar ve topluluk', 'İç dünya ve dinlenme'
  ];
  const PLANETS = [
    { key: 'Sun', tr: 'Güneş', glyph: '☉' }, { key: 'Moon', tr: 'Ay', glyph: '☽' },
    { key: 'Mercury', tr: 'Merkür', glyph: '☿' }, { key: 'Venus', tr: 'Venüs', glyph: '♀' },
    { key: 'Mars', tr: 'Mars', glyph: '♂' }, { key: 'Jupiter', tr: 'Jüpiter', glyph: '♃' },
    { key: 'Saturn', tr: 'Satürn', glyph: '♄' }, { key: 'Uranus', tr: 'Uranüs', glyph: '♅' },
    { key: 'Neptune', tr: 'Neptün', glyph: '♆' }, { key: 'Pluto', tr: 'Plüton', glyph: '♇' }
  ];

  // ---------- Türkiye'nin tarihsel saat dilimi (yaklaşık) ----------
  // 2016-09-07 sonrası sabit UTC+3. 1986–2016: UTC+2, yaz saatinde UTC+3 (AB kuralları).
  // 1978–1985: UTC+3. Daha öncesi: UTC+2, Nisan–Eylül arası UTC+3.
  function lastSundayUTC(y, m) {
    const d = new Date(Date.UTC(y, m + 1, 0, 1)); // ayın son günü 01:00 UTC
    d.setUTCDate(d.getUTCDate() - d.getUTCDay());
    return d.getTime();
  }
  function turkeyOffsetHours(utcMs) {
    const y = new Date(utcMs).getUTCFullYear();
    if (utcMs >= Date.UTC(2016, 8, 6, 21)) return 3;
    if (y >= 1986) return utcMs >= lastSundayUTC(y, 2) && utcMs < lastSundayUTC(y, 9) ? 3 : 2;
    if (y >= 1978) return 3;
    const m = new Date(utcMs).getUTCMonth();
    return m >= 3 && m <= 8 ? 3 : 2;
  }

  // Yerel tarih+saatten UTC anı. offsetHours verilmezse Türkiye kuralı.
  function localToUtc(dateStr, timeStr, offsetHours) {
    const [y, mo, d] = dateStr.split('-').map(Number);
    const [hh, mm] = (timeStr || '12:00').split(':').map(Number);
    const naive = Date.UTC(y, mo - 1, d, hh, mm);
    if (typeof offsetHours === 'number') return naive - offsetHours * H;
    let off = turkeyOffsetHours(naive - 2 * H);
    off = turkeyOffsetHours(naive - off * H);
    return naive - off * H;
  }

  // ---------- Konumlar ----------
  function bodyLon(key, date) {
    const AE = A();
    if (key === 'Moon') return norm(AE.EclipticGeoMoon(date).lon);
    return norm(AE.Ecliptic(AE.GeoVector(AE.Body[key], date, true)).elon);
  }
  function isRetro(key, date) {
    if (key === 'Sun' || key === 'Moon') return false;
    let d = bodyLon(key, new Date(date.getTime() + DAY / 4)) - bodyLon(key, date);
    if (d > 180) d -= 360;
    if (d < -180) d += 360;
    return d < 0;
  }

  // Yükselen ve Tepe Noktası (MC)
  function angles(date, lat, lon) {
    const AE = A();
    const T = (AE.MakeTime(date).tt) / 36525;
    const eps = (23.4392911 - 0.0130042 * T) * DEG;
    const ramc = norm(AE.SiderealTime(date) * 15 + lon) * DEG;
    const phi = lat * DEG;
    const mc = norm(Math.atan2(Math.sin(ramc), Math.cos(ramc) * Math.cos(eps)) / DEG);
    const asc = norm(Math.atan2(Math.cos(ramc), -(Math.sin(ramc) * Math.cos(eps) + Math.tan(phi) * Math.sin(eps))) / DEG);
    return { asc, mc };
  }

  const signOf = (lon) => Math.floor(norm(lon) / 30) % 12;
  const degIn = (lon) => {
    const x = norm(lon) % 30;
    const d = Math.floor(x);
    let m = Math.round((x - d) * 60);
    return m === 60 ? `${d + 1}°00′` : `${d}°${String(m).padStart(2, '0')}′`;
  };

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

  // ---------- Harita ----------
  // profile: { birthDate:'YYYY-MM-DD', birthTime:'HH:MM', unknownTime, cityIndex, tzOffset }
  function chart(profile) {
    const city = Number.isInteger(profile.cityIndex) && CITIES[profile.cityIndex] ? CITIES[profile.cityIndex] : null;
    const knowsTime = !profile.unknownTime && !!profile.birthTime;
    const tz = city ? undefined : (typeof profile.tzOffset === 'number' ? profile.tzOffset : 3);
    const utc = localToUtc(profile.birthDate, knowsTime ? profile.birthTime : '12:00', tz);
    const date = new Date(utc);

    const planets = PLANETS.map((p) => {
      const lon = bodyLon(p.key, date);
      return { ...p, lon, sign: signOf(lon), deg: degIn(lon), retro: isRetro(p.key, date) };
    });

    // Saat bilinmiyorsa Ay'ın gün içinde burç değiştirip değiştirmediği
    let moonAlt = null;
    if (!knowsTime) {
      const s0 = signOf(bodyLon('Moon', new Date(localToUtc(profile.birthDate, '00:00', tz))));
      const s1 = signOf(bodyLon('Moon', new Date(localToUtc(profile.birthDate, '23:59', tz))));
      if (s0 !== s1) moonAlt = [s0, s1];
    }

    let asc = null, mc = null;
    if (knowsTime && city) {
      const a = angles(date, city[1], city[2]);
      asc = { lon: a.asc, sign: signOf(a.asc), deg: degIn(a.asc) };
      mc = { lon: a.mc, sign: signOf(a.mc), deg: degIn(a.mc) };
      // Tam burç ev sistemi
      planets.forEach((p) => { p.house = ((p.sign - asc.sign + 12) % 12) + 1; });
    }

    const sun = planets[0], moon = planets[1];
    const elong = norm(moon.lon - sun.lon);
    const illum = (1 - Math.cos(elong * DEG)) / 2;

    // Element ve nitelik dağılımı (10 gezegen + yükselen)
    const pts = planets.map((p) => p.sign).concat(asc ? [asc.sign] : []);
    const elements = [0, 0, 0, 0], modes = [0, 0, 0];
    pts.forEach((s) => { elements[s % 4]++; modes[s % 3]++; });

    return {
      utc: date, knowsTime, city: city ? city[0] : null,
      planets, sun, moon, asc, mc, moonAlt,
      birthPhase: { elong, name: phaseName(elong), illum },
      elements, modes, total: pts.length,
      dominantElement: elements.indexOf(Math.max(...elements)),
      dominantMode: modes.indexOf(Math.max(...modes))
    };
  }

  // Bir sonraki Ay dönüşü (Ay doğum boylamına döner, ~27,3 günde bir)
  function nextLunarReturn(natalMoonLon, from = new Date()) {
    const f = (t) => { let d = bodyLon('Moon', new Date(t)) - natalMoonLon; d = ((d + 540) % 360) - 180; return d; };
    let t0 = from.getTime();
    let v0 = f(t0);
    for (let t = t0 + 6 * H; t < t0 + 30 * DAY; t += 6 * H) {
      const v = f(t);
      if (v0 < 0 && v >= 0 && v - v0 < 90) {
        let lo = t - 6 * H, hi = t;
        for (let i = 0; i < 30; i++) { const m = (lo + hi) / 2; if (f(m) < 0) lo = m; else hi = m; }
        return new Date(hi);
      }
      v0 = v;
    }
    return null;
  }

  // Bir sonraki Güneş dönüşü (yıllık doğum günü anı)
  function nextSolarReturn(natalSunLon, from = new Date()) {
    const r = A().SearchSunLongitude(natalSunLon, A().MakeTime(from), 370);
    return r ? r.date : null;
  }

  root.LunaNatal = {
    CITIES, SIGNS, SIGN_GLYPHS, ELEMENTS, MODES, KEYWORDS, HOUSE_THEMES, PLANETS,
    turkeyOffsetHours, localToUtc, bodyLon, angles, chart, nextLunarReturn, nextSolarReturn, signOf, degIn, phaseName
  };
  if (typeof module === 'object' && module.exports) module.exports = root.LunaNatal;
})(typeof window !== 'undefined' ? window : globalThis);
