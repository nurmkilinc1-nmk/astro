// ===== profil.js — luna.gram profil ve doğum haritası sayfası =====
(function () {
  'use strict';

  const N = window.LunaNatal;
  const C = window.AstroCore;
  const D = () => window.LunaDevice;
  const $ = (id) => document.getElementById(id);
  const KEY = 'astro-profile';
  const DAY = 864e5;
  const AY = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
  const GUN = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
  const ELEMENT_CLASS = ['fire', 'earth', 'air', 'water'];
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const g = (s) => `${s}︎`; // simgeyi emoji değil metin olarak çiz
  const signLoc = (i) => `${N.SIGNS[i]}'${['ta', 'da', 'de', 'te', 'da', 'ta', 'de', 'te', 'da', 'ta', 'da', 'ta'][i]}`;

  // ---------- Saklama ----------
  function load() {
    let p = null;
    try { p = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) {}
    if (p && p.birthDate && !Number.isInteger(p.cityIndex) && p.birthPlace && p.cityIndex !== -1) {
      // Eski profillerde şehir metnini il listesiyle eşleştir
      const t = p.birthPlace.toLocaleLowerCase('tr-TR');
      const i = N.CITIES.findIndex((c) => t.startsWith(c[0].toLocaleLowerCase('tr-TR')));
      if (i >= 0) p.cityIndex = i;
    }
    return p;
  }
  function save(p) {
    try { localStorage.setItem(KEY, JSON.stringify(p)); } catch (e) {}
  }

  // ---------- Form ----------
  function fillSelects() {
    const sorted = N.CITIES.map((c, i) => [c[0], i]).sort((a, b) => a[0].localeCompare(b[0], 'tr'));
    $('birthCity').innerHTML = '<option value="" disabled selected>Şehir seç</option>' +
      sorted.map(([n, i]) => `<option value="${i}">${n}</option>`).join('') +
      '<option value="-1">Yurt dışı / listede yok</option>';
    const offs = [];
    for (let h = -12; h <= 14; h += 0.5) {
      if (!Number.isInteger(h) && ![-9.5, -3.5, 3.5, 4.5, 5.5, 6.5, 9.5, 10.5].includes(h)) continue;
      const sign = h >= 0 ? '+' : '−';
      const a = Math.abs(h);
      offs.push(`<option value="${h}">UTC${sign}${Math.floor(a)}${a % 1 ? ':30' : ''}</option>`);
    }
    $('tzOffset').innerHTML = offs.join('');
    $('tzOffset').value = '1';
  }

  function showForm(p) {
    $('formTitle').textContent = p ? 'Bilgilerini düzenle' : 'Doğum haritanı oluştur';
    $('fullName').value = p ? p.fullName || '' : '';
    $('birthDate').value = p ? p.birthDate || '' : '';
    $('birthDate').max = new Date().toISOString().slice(0, 10);
    $('birthTime').value = p && !p.unknownTime ? p.birthTime || '' : '';
    $('unknownTime').checked = !!(p && p.unknownTime);
    $('birthTime').disabled = $('unknownTime').checked;
    const ci = p && Number.isInteger(p.cityIndex) ? String(p.cityIndex) : '';
    $('birthCity').value = ci;
    syncCity();
    $('birthPlace').value = p && p.cityIndex === -1 ? p.birthPlace || '' : '';
    if (p && typeof p.tzOffset === 'number') $('tzOffset').value = String(p.tzOffset);
    $('cancelEdit').hidden = !p;
    $('formCard').hidden = false;
    $('profileView').hidden = true;
    window.scrollTo(0, 0);
  }

  $('unknownTime').addEventListener('change', () => {
    $('birthTime').disabled = $('unknownTime').checked;
    if ($('unknownTime').checked) $('birthTime').value = '';
  });
  function syncCity() {
    const v = $('birthCity').value;
    $('abroadBox').hidden = v !== '-1';
    const t = $('cityPickText');
    t.textContent = v === '' ? 'Haritadan seç' : v === '-1' ? 'Yurt dışı' : N.CITIES[Number(v)][0];
    $('cityPickBtn').classList.toggle('has-value', v !== '');
  }
  $('birthCity').addEventListener('change', syncCity);
  $('cancelEdit').addEventListener('click', () => render(load()));

  $('profileForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const name = $('fullName').value.trim();
    const date = $('birthDate').value;
    const time = $('birthTime').value;
    const unknown = $('unknownTime').checked;
    const city = $('birthCity').value;
    const fail = (el, msg) => { el.classList.add('invalid'); el.focus(); D() && D().toast(msg); setTimeout(() => el.classList.remove('invalid'), 1400); };
    if (!name) return fail($('fullName'), 'Adını yazar mısın?');
    if (!date || date < '1900-01-01' || date > new Date().toISOString().slice(0, 10)) return fail($('birthDate'), 'Geçerli bir doğum tarihi seç.');
    if (!unknown && !time) return fail($('birthTime'), 'Doğum saatini yaz ya da "bilmiyorum"u işaretle.');
    if (city === '') return fail($('birthCity'), 'Doğum yerini seç.');
    const cityIndex = Number(city);
    const p = {
      fullName: name,
      birthDate: date,
      birthTime: unknown ? '' : time,
      unknownTime: unknown,
      cityIndex,
      birthPlace: cityIndex >= 0 ? N.CITIES[cityIndex][0] : ($('birthPlace').value.trim() || 'Yurt dışı'),
      tzOffset: cityIndex >= 0 ? undefined : Number($('tzOffset').value),
      updatedAt: new Date().toISOString()
    };
    save(p);
    render(p);
    D() && D().toast('Haritan hazır ✨');
  });

  // ---------- Harita ile şehir seçimi ----------
  // Eşdikdörtgen izdüşüm (39° enlemde boylam düzeltmesi); 81 il noktası Türkiye'nin şeklini oluşturur.
  const MAP = { lon0: 25.4, lat0: 42.4, k: 100, cos: Math.cos(39 * Math.PI / 180) };
  const px = (c) => [((c[2] - MAP.lon0) * MAP.cos * MAP.k) + 20, ((MAP.lat0 - c[1]) * MAP.k) + 20];
  const fold = (t) => t.toLocaleLowerCase('tr-TR').replace(/ı/g, 'i').replace(/ş/g, 's').replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ö/g, 'o').replace(/ç/g, 'c').replace(/[̀-ͯ]/g, '');
  const LANDMARK = ['İstanbul', 'Ankara', 'İzmir', 'Antalya', 'Trabzon', 'Van', 'Diyarbakır', 'Adana', 'Samsun', 'Erzurum'];
  let pick = null;

  function drawMap() {
    const dots = N.CITIES.map((c, i) => {
      const [x, y] = px(c);
      const lm = LANDMARK.includes(c[0]);
      return `<g class="cm-city${lm ? ' lm' : ''}" data-i="${i}"><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${lm ? 19 : 15}" class="cm-dot"/>${lm ? `<text x="${x.toFixed(1)}" y="${(y - 30).toFixed(1)}" class="cm-lm">${c[0]}</text>` : ''}</g>`;
    }).join('');
    // Noktaların bulanık birleşimi Türkiye'nin silüetini oluşturur
    const land = N.CITIES.map((c) => { const [x, y] = px(c); return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="78"/>`; }).join('');
    $('cityMap').innerHTML = `<defs><filter id="cmLand" x="-10%" y="-20%" width="120%" height="140%"><feGaussianBlur stdDeviation="26"/></filter></defs>
      <g class="cm-land" filter="url(#cmLand)">${land}</g><g class="cm-dots">${dots}</g><g id="cmSel"></g>`;
  }
  function renderPick() {
    $('cityMap').querySelectorAll('.cm-city').forEach((g) => g.classList.toggle('on', Number(g.dataset.i) === pick));
    const sel = $('cmSel');
    if (pick !== null && pick >= 0) {
      const [x, y] = px(N.CITIES[pick]);
      const left = x > 1300;
      sel.innerHTML = `<circle cx="${x}" cy="${y}" r="52" class="cm-ring"/><circle cx="${x}" cy="${y}" r="24" class="cm-pin"/>
        <text x="${left ? x - 40 : x + 40}" y="${y + 18}" text-anchor="${left ? 'end' : 'start'}" class="cm-label">${N.CITIES[pick][0]}</text>`;
      $('citySel').textContent = N.CITIES[pick][0];
    } else {
      sel.innerHTML = '';
      $('citySel').textContent = 'Haritada bir noktaya dokun ya da ara';
    }
    $('cityDone').disabled = pick === null;
    $('cityList').querySelectorAll('[data-i]').forEach((li) => li.setAttribute('aria-selected', String(Number(li.dataset.i) === pick)));
  }
  function renderCityList() {
    const q = fold($('citySearch').value.trim());
    const items = N.CITIES.map((c, i) => [c[0], i])
      .filter(([n]) => !q || fold(n).includes(q))
      .sort((a, b) => {
        if (q) { const as = fold(a[0]).startsWith(q), bs = fold(b[0]).startsWith(q); if (as !== bs) return as ? -1 : 1; }
        return a[0].localeCompare(b[0], 'tr');
      });
    $('cityList').innerHTML = items.length
      ? items.map(([n, i]) => `<li role="option" data-i="${i}" aria-selected="${i === pick}">${n}</li>`).join('')
      : '<li class="empty">Bulunamadı. Yurt dışında doğduysan aşağıdan seç.</li>';
  }
  function openCity() {
    const v = $('birthCity').value;
    pick = v === '' || v === '-1' ? null : Number(v);
    $('citySearch').value = '';
    renderCityList();
    renderPick();
    const s = $('citySheet');
    s.hidden = false;
    requestAnimationFrame(() => s.classList.add('open'));
  }
  function closeCity() {
    const s = $('citySheet');
    s.classList.remove('open');
    setTimeout(() => { s.hidden = true; }, 260);
  }
  function choose(v) {
    $('birthCity').value = String(v);
    syncCity();
    closeCity();
  }
  $('cityPickBtn').addEventListener('click', openCity);
  $('cityMap').addEventListener('click', (e) => {
    // En yakın ile dokunma (küçük noktalar için parmak dostu)
    const svg = $('cityMap');
    const pt = svg.createSVGPoint();
    pt.x = e.clientX; pt.y = e.clientY;
    const p = pt.matrixTransform(svg.getScreenCTM().inverse());
    let best = -1, bd = Infinity;
    N.CITIES.forEach((c, i) => { const [x, y] = px(c); const d = (x - p.x) ** 2 + (y - p.y) ** 2; if (d < bd) { bd = d; best = i; } });
    if (best >= 0 && bd < 90 * 90) {
      pick = best;
      renderPick();
      if (navigator.vibrate) navigator.vibrate(5);
    }
  });
  $('citySearch').addEventListener('input', () => {
    renderCityList();
    const first = $('cityList').querySelector('[data-i]');
    if (first && $('citySearch').value.trim()) { pick = Number(first.dataset.i); renderPick(); }
  });
  $('cityList').addEventListener('click', (e) => {
    const li = e.target.closest('[data-i]');
    if (!li) return;
    pick = Number(li.dataset.i);
    renderPick();
    choose(pick);
  });
  $('cityDone').addEventListener('click', () => { if (pick !== null) choose(pick); });
  $('cityAbroad').addEventListener('click', () => choose(-1));
  $('citySheet').addEventListener('click', (e) => { if (e.target.id === 'citySheet') closeCity(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('citySheet').hidden) closeCity(); });

  // ---------- Profil görünümü ----------
  function fmtBirth(p) {
    const [y, m, d] = p.birthDate.split('-').map(Number);
    const parts = [`${d} ${AY[m - 1]} ${y}`];
    parts.push(p.unknownTime || !p.birthTime ? 'saat bilinmiyor' : p.birthTime);
    if (p.birthPlace) parts.push(p.birthPlace);
    return parts.join(' · ');
  }
  function age(p) {
    const [y, m, d] = p.birthDate.split('-').map(Number);
    const now = new Date();
    let a = now.getFullYear() - y;
    if (now.getMonth() + 1 < m || (now.getMonth() + 1 === m && now.getDate() < d)) a--;
    return a;
  }
  function moonSvg(elong) {
    const f = elong / 360;
    const r = 20, cx = 24, cy = 24;
    const k = Math.cos(2 * Math.PI * f);
    const rx = Math.max(0.01, Math.abs(k) * r).toFixed(2);
    const waxing = f < 0.5, crescent = k > 0;
    const lit = `M${cx} ${cy - r} A${r} ${r} 0 0 ${waxing ? 1 : 0} ${cx} ${cy + r} A${rx} ${r} 0 0 ${waxing ? (crescent ? 0 : 1) : (crescent ? 1 : 0)} ${cx} ${cy - r}Z`;
    return `<svg viewBox="0 0 48 48" class="bp-moon" aria-hidden="true"><circle cx="${cx}" cy="${cy}" r="${r}" class="bp-dark"/><path d="${lit}" class="bp-lit"/></svg>`;
  }
  const relDays = (d) => {
    const n = Math.round((new Date(d).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) / DAY);
    return n <= 0 ? 'bugün' : n === 1 ? 'yarın' : `${n} gün sonra`;
  };
  const fmtDate = (d) => `${d.getDate()} ${AY[d.getMonth()]} ${GUN[d.getDay()]}`;
  const fmtTime = (d) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

  let chartCache = null;
  let returns = {};

  function render(p) {
    if (!p || !p.birthDate) { showForm(null); return; }
    let ch;
    try { ch = N.chart(p); } catch (e) {
      console.error('Harita hesaplanamadı:', e);
      showForm(p);
      return;
    }
    chartCache = ch;
    $('formCard').hidden = true;
    $('profileView').hidden = false;

    // Başlık
    const initials = p.fullName.trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toLocaleUpperCase('tr-TR');
    $('pAvatar').textContent = initials;
    $('pAvatar').className = `prof-avatar el-${ELEMENT_CLASS[ch.sun.sign % 4]}`;
    $('pName').textContent = p.fullName;
    $('pBirth').textContent = `${fmtBirth(p)} · ${age(p)} yaş`;

    // Büyük üçlü
    const moonSign = ch.moonAlt ? `${N.SIGNS[ch.moonAlt[0]]} / ${N.SIGNS[ch.moonAlt[1]]}` : N.SIGNS[ch.moon.sign];
    const tiles = [
      { label: 'Güneş', glyph: N.SIGN_GLYPHS[ch.sun.sign], sign: N.SIGNS[ch.sun.sign], deg: ch.sun.deg, kw: N.KEYWORDS[ch.sun.sign], el: ch.sun.sign % 4, sub: 'Özün, kimliğin' },
      { label: 'Ay', glyph: ch.moonAlt ? N.SIGN_GLYPHS[ch.moonAlt[0]] : N.SIGN_GLYPHS[ch.moon.sign], sign: moonSign, deg: ch.moonAlt ? 'saate bağlı' : (ch.knowsTime ? ch.moon.deg : '≈ ' + ch.moon.deg), kw: ch.moonAlt ? 'Doğum saatin Ay burcunu belirler' : N.KEYWORDS[ch.moon.sign], el: ch.moon.sign % 4, sub: 'Duyguların, iç dünyan' }
    ];
    if (ch.asc) tiles.push({ label: 'Yükselen', glyph: N.SIGN_GLYPHS[ch.asc.sign], sign: N.SIGNS[ch.asc.sign], deg: ch.asc.deg, kw: N.KEYWORDS[ch.asc.sign], el: ch.asc.sign % 4, sub: 'Dışa yansıyan halin' });
    $('big3').innerHTML = tiles.map((t) => `
      <div class="b3 glass el-${ELEMENT_CLASS[t.el]}">
        <span class="b3-label">${t.label}</span>
        <span class="b3-glyph" aria-hidden="true">${g(t.glyph)}</span>
        <span class="b3-sign">${esc(t.sign)}</span>
        <span class="b3-deg">${esc(t.deg)}</span>
        <span class="b3-kw">${esc(t.kw)}</span>
      </div>`).join('') + (ch.asc ? '' : `
      <button type="button" class="b3 b3-missing glass" id="addTimeBtn">
        <span class="b3-label">Yükselen</span>
        <span class="b3-glyph" aria-hidden="true">?</span>
        <span class="b3-sign">${ch.city ? 'Doğum saatini ekle' : 'Hesaplanamıyor'}</span>
        <span class="b3-kw">${ch.city ? 'Yükselen burç ve evler için doğum saati gerekir.' : 'Yurt dışı doğumlarda yükselen hesaplanmaz.'}</span>
      </button>`);
    const addTime = $('addTimeBtn');
    if (addTime && ch.city) addTime.addEventListener('click', () => { showForm(p); setTimeout(() => $('birthTime').focus(), 100); });

    renderToday(ch);
    renderBirthDay(ch);
    renderPlanets(ch);
    renderTheme();
  }

  function renderToday(ch) {
    const now = new Date();
    const items = [];
    if (C && window.Astronomy) {
      const ms = C.signIndex(C.moonLon(now));
      if (ch.asc) {
        const house = ((ms - ch.asc.sign + 12) % 12) + 1;
        items.push({ ico: '☽', title: `Ay ${signLoc(ms)} · ${house}. evinde`, text: `Bugün odak: ${N.HOUSE_THEMES[house - 1].toLocaleLowerCase('tr-TR')}.` });
      } else {
        items.push({ ico: '☽', title: `Ay bugün ${signLoc(ms)}`, text: ms === ch.moon.sign ? 'Ay doğum burcunda: duygusal olarak kendin gibi hissedebilirsin.' : `Senin Ay burcun ${N.SIGNS[ch.moon.sign]}.` });
      }
      if (ms === ch.sun.sign) items.push({ ico: '☉', title: 'Ay Güneş burcunda', text: 'Enerjin yüksek; kendini ifade etmek için güzel bir gün.' });
    }
    const lr = N.nextLunarReturn(ch.moon.lon, now);
    const sr = N.nextSolarReturn(ch.sun.lon, now);
    returns = { lr, sr };
    if (lr) items.push({ ico: '↺', title: `Ay dönüşün: ${fmtDate(lr)}`, text: `${relDays(lr)} · ${fmtTime(lr)} — Ay doğduğun konuma döner; ayın duygusal yeni başlangıcı.`, add: 'lr' });
    if (sr) items.push({ ico: '✦', title: `Güneş dönüşün: ${fmtDate(sr)}`, text: `${relDays(sr)} · ${fmtTime(sr)} — astrolojik doğum günün, yeni kişisel yılın başlangıcı.`, add: 'sr' });

    $('todayList').innerHTML = items.map((it) => `
      <li>
        <span class="td-ico" aria-hidden="true">${g(it.ico)}</span>
        <span class="td-text"><b>${esc(it.title)}</b><small>${esc(it.text)}</small></span>
        ${it.add ? `<button type="button" class="icon-btn td-add" data-add="${it.add}" aria-label="Takvime ekle">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3.5" y="5" width="17" height="15.5" rx="3.5"/><path d="M8 3v3.5M16 3v3.5M3.5 10h17M12 13v5M9.5 15.5h5"/></svg>
        </button>` : ''}
      </li>`).join('');
  }

  $('todayList').addEventListener('click', async (e) => {
    const b = e.target.closest('[data-add]');
    if (!b || !D()) return;
    const isLr = b.dataset.add === 'lr';
    const d = isLr ? returns.lr : returns.sr;
    if (!d) return;
    try {
      const how = await D().addToCalendar({
        begin: d,
        end: new Date(d.getTime() + 30 * 60000),
        title: isLr ? '☽ Ay dönüşüm' : '✦ Güneş dönüşüm',
        body: isLr ? 'Ay doğum haritamdaki konumuna dönüyor. — luna.gram' : 'Güneş doğum haritamdaki konumuna dönüyor; yeni kişisel yılım başlıyor. — luna.gram'
      });
      D().toast(how === 'native' ? 'Takvim açıldı; kaydetmeyi unutma.' : 'Takvim dosyası indirildi.');
    } catch (err) { D().toast('Takvime eklenemedi.'); }
  });

  function renderBirthDay(ch) {
    const bp = ch.birthPhase;
    $('birthPhase').innerHTML = `
      ${moonSvg(bp.elong)}
      <div>
        <b>${esc(bp.name)}</b>
        <small>Doğduğun gün Ay %${Math.round(bp.illum * 100)} aydınlıktı ve ${bp.elong < 180 ? 'büyüyordu' : 'küçülüyordu'}.</small>
      </div>`;
    const max = Math.max(...ch.elements, 1);
    const bar = (label, v, cls) => `<div class="bal-row"><span>${label}</span><span class="bal-track"><i class="${cls}" style="width:${(v / max) * 100}%"></i></span><b>${v}</b></div>`;
    $('balance').innerHTML = `
      <p class="bal-title">Baskın element: <b>${N.ELEMENTS[ch.dominantElement]}</b> · Baskın nitelik: <b>${N.MODES[ch.dominantMode]}</b></p>
      ${ch.elements.map((v, i) => bar(N.ELEMENTS[i], v, `el-${ELEMENT_CLASS[i]}`)).join('')}
      <div class="bal-modes">${ch.modes.map((v, i) => `<span><b>${v}</b>${N.MODES[i]}</span>`).join('')}</div>`;
  }

  function renderPlanets(ch) {
    $('planetsMeta').textContent = ch.asc ? 'Tam burç evleri' : (ch.knowsTime ? '' : 'Saat bilinmediği için evler yok');
    $('planetList').innerHTML = ch.planets.map((pl) => `
      <li>
        <span class="pl-glyph" aria-hidden="true">${g(pl.glyph)}</span>
        <span class="pl-name">${pl.tr}${pl.retro ? ' <em title="Retro">R</em>' : ''}</span>
        <span class="pl-sign"><span aria-hidden="true">${g(N.SIGN_GLYPHS[pl.sign])}</span> ${N.SIGNS[pl.sign]}</span>
        <span class="pl-deg">${pl.key === 'Moon' && !ch.knowsTime ? '≈' : ''}${pl.deg}</span>
        ${pl.house ? `<span class="pl-house" title="${pl.house}. ev: ${esc(N.HOUSE_THEMES[pl.house - 1])}">${pl.house}. ev</span>` : ''}
      </li>`).join('') + (ch.asc ? `
      <li class="pl-angle"><span class="pl-glyph">AC</span><span class="pl-name">Yükselen</span><span class="pl-sign"><span aria-hidden="true">${g(N.SIGN_GLYPHS[ch.asc.sign])}</span> ${N.SIGNS[ch.asc.sign]}</span><span class="pl-deg">${ch.asc.deg}</span><span class="pl-house">1. ev</span></li>
      <li class="pl-angle"><span class="pl-glyph">MC</span><span class="pl-name">Tepe noktası</span><span class="pl-sign"><span aria-hidden="true">${g(N.SIGN_GLYPHS[ch.mc.sign])}</span> ${N.SIGNS[ch.mc.sign]}</span><span class="pl-deg">${ch.mc.deg}</span><span class="pl-house"></span></li>` : '');
  }

  // ---------- Ayarlar ----------
  function renderTheme() {
    const dark = document.documentElement.getAttribute('data-theme') === 'dark';
    $('themeSwitch').checked = dark;
    $('themeHint').textContent = dark ? 'Koyu, yıldızlı gökyüzü' : 'Açık, gündüz gökyüzü';
  }
  $('themeSwitch').addEventListener('change', () => {
    const root = document.documentElement;
    if ($('themeSwitch').checked) { root.setAttribute('data-theme', 'dark'); localStorage.setItem('astro-theme', 'dark'); }
    else { root.removeAttribute('data-theme'); localStorage.setItem('astro-theme', 'light'); }
    if (navigator.vibrate) navigator.vibrate(6);
  });
  new MutationObserver(renderTheme).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  $('editBtn').addEventListener('click', () => showForm(load()));
  $('editBtn2').addEventListener('click', () => showForm(load()));

  let delArmed = false, delTimer;
  $('deleteBtn').addEventListener('click', () => {
    if (!delArmed) {
      delArmed = true;
      $('deleteBtn').classList.add('armed');
      $('deleteLabel').textContent = 'Emin misin? Tekrar dokun';
      clearTimeout(delTimer);
      delTimer = setTimeout(() => { delArmed = false; $('deleteBtn').classList.remove('armed'); $('deleteLabel').textContent = 'Verilerimi sil'; }, 4000);
      return;
    }
    try { localStorage.removeItem(KEY); } catch (e) {}
    delArmed = false;
    $('deleteBtn').classList.remove('armed');
    $('deleteLabel').textContent = 'Verilerimi sil';
    D() && D().toast('Profil bilgilerin silindi.');
    render(null);
  });

  // ---------- Başlat ----------
  if (!N || !window.Astronomy) {
    $('formCard').hidden = false;
    $('formTitle').textContent = 'Astronomi verisi yüklenemedi';
    return;
  }
  fillSelects();
  drawMap();
  render(load());
})();
