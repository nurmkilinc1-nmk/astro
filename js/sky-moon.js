// ===== sky-moon.js — Anasayfa gökyüzü + gerçekçi canlı Ay =====
// Ay, NASA LRO (CGI Moon Kit, kamu malı) renk haritası bir küreye sarılarak
// piksel piksel çizilir. Işık yönü ve faz astronomy-engine ile hesaplanır;
// aydınlık kenarın yönü İstanbul'dan o an görüldüğü gibidir.
(function () {
  const path = window.location.pathname.split('?')[0].split('#')[0];
  const file = path.split('/').pop();
  if (file && file !== 'index.html' && file !== '') return;

  const DEG = Math.PI / 180;
  const OBSERVER = { lat: 41.0082, lon: 28.9784, h: 40 }; // İstanbul
  const TEX = { src: 'img/moon-nasa.webp', lonMin: -100, lonMax: 100 };

  let texData = null; // { w, h, px: Uint8ClampedArray }
  let geom = null;

  const isDarkMode = () => document.documentElement.getAttribute('data-theme') === 'dark';
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const smooth = (e0, e1, x) => { const t = clamp((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); };

  // ---------- Hareketli gökyüzü (yıldızlar + süzülen bulutlar) ----------
  const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const sky = { canvas: null, ctx: null, w: 0, h: 0, dpr: 1, stars: [], clouds: [], dark: null, raf: 0, last: 0 };

  function rng(seed) {
    let s = seed;
    return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
  }

  // Bir bulutu ekran dışı tuvale bir kez çiz (yumuşak, üst kenarı ay ışığıyla aydınlanmış)
  function makeCloud(rand, width, dark) {
    const w = Math.round(width), h = Math.round(width * 0.42);
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const x = c.getContext('2d');
    const puffs = 14 + Math.floor(rand() * 10);
    for (let i = 0; i < puffs; i++) {
      const t = i / (puffs - 1);
      const px = w * (0.12 + 0.76 * t) + (rand() - 0.5) * w * 0.08;
      const bump = Math.sin(t * Math.PI);
      const py = h * (0.62 - 0.22 * bump) + (rand() - 0.5) * h * 0.12;
      const r = h * (0.18 + 0.22 * bump) * (0.75 + rand() * 0.5);
      const g = x.createRadialGradient(px, py, 0, px, py, r);
      g.addColorStop(0, 'rgba(255,255,255,0.55)');
      g.addColorStop(0.55, 'rgba(255,255,255,0.28)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      x.fillStyle = g;
      x.beginPath(); x.arc(px, py, r, 0, Math.PI * 2); x.fill();
    }
    // Renk: gece mavi-gri, üstte ay ışığı; gündüz beyaz, altta hafif gölge
    x.globalCompositeOperation = 'source-atop';
    const tint = x.createLinearGradient(0, 0, 0, h);
    if (dark) {
      tint.addColorStop(0, 'rgba(176,190,228,1)');
      tint.addColorStop(0.5, 'rgba(92,106,150,1)');
      tint.addColorStop(1, 'rgba(38,48,82,1)');
    } else {
      tint.addColorStop(0, 'rgba(255,255,255,1)');
      tint.addColorStop(0.7, 'rgba(246,249,255,1)');
      tint.addColorStop(1, 'rgba(214,226,242,1)');
    }
    x.fillStyle = tint;
    x.fillRect(0, 0, w, h);
    return c;
  }

  function setupSky() {
    const c = sky.canvas;
    sky.dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    sky.w = window.innerWidth;
    sky.h = window.innerHeight;
    c.width = Math.round(sky.w * sky.dpr);
    c.height = Math.round(sky.h * sky.dpr);
    sky.ctx = c.getContext('2d');
    sky.dark = isDarkMode();
    const rand = rng(73);

    const starCount = sky.dark ? Math.min(170, Math.floor((sky.w * sky.h) / 4800)) : 0;
    sky.stars = Array.from({ length: starCount }, () => ({
      x: rand() * sky.w,
      y: rand() * sky.h * 0.8,
      r: 0.35 + rand() * 1.15,
      a: 0.25 + rand() * 0.65,
      tw: 0.4 + rand() * 1.6,
      ph: rand() * Math.PI * 2
    }));

    // Üç katman: uzak (küçük, yavaş, silik) → yakın (büyük, hızlı)
    const layers = sky.dark
      ? [{ n: 4, size: 0.55, speed: 3.5, alpha: 0.28, yMin: 0.05, yMax: 0.45 }, { n: 3, size: 0.8, speed: 7, alpha: 0.38, yMin: 0.2, yMax: 0.6 }, { n: 2, size: 1.15, speed: 12, alpha: 0.5, yMin: 0.45, yMax: 0.85 }]
      : [{ n: 4, size: 0.5, speed: 4, alpha: 0.5, yMin: 0.04, yMax: 0.4 }, { n: 3, size: 0.75, speed: 8, alpha: 0.65, yMin: 0.2, yMax: 0.6 }, { n: 2, size: 1.05, speed: 13, alpha: 0.8, yMin: 0.45, yMax: 0.85 }];
    const base = Math.max(240, Math.min(560, sky.w * 0.75));
    sky.clouds = [];
    layers.forEach((L) => {
      for (let i = 0; i < L.n; i++) {
        const img = makeCloud(rand, base * L.size * (0.8 + rand() * 0.45), sky.dark);
        sky.clouds.push({
          img,
          x: (i / L.n) * (sky.w + img.width) - img.width * 0.5 + rand() * 80,
          y: sky.h * (L.yMin + rand() * (L.yMax - L.yMin)) - img.height / 2,
          speed: L.speed * (0.8 + rand() * 0.4),
          alpha: L.alpha * (0.8 + rand() * 0.3)
        });
      }
    });
  }

  function frame(t) {
    const { ctx, w, h, dpr } = sky;
    const dt = sky.last ? Math.min(0.1, (t - sky.last) / 1000) : 0;
    sky.last = t;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    const sec = t / 1000;
    for (const s of sky.stars) {
      const a = s.a * (0.55 + 0.45 * Math.sin(sec * s.tw + s.ph));
      ctx.globalAlpha = Math.max(0, a);
      ctx.fillStyle = '#f4f7ff';
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill();
    }
    for (const c of sky.clouds) {
      c.x += c.speed * dt;
      if (c.x > w + 10) c.x = -c.img.width - 10;
      ctx.globalAlpha = c.alpha;
      ctx.drawImage(c.img, c.x, c.y);
    }
    ctx.globalAlpha = 1;
  }

  function loop(t) {
    sky.raf = 0;
    if (document.hidden) return;
    // ~30 fps yeterli; pil dostu
    if (!sky.last || t - sky.last >= 32) frame(t);
    sky.raf = requestAnimationFrame(loop);
  }
  function startSky() {
    if (reduceMotion) { frame(performance.now()); return; }
    if (!sky.raf) { sky.last = 0; sky.raf = requestAnimationFrame(loop); }
  }
  function stopSky() { if (sky.raf) cancelAnimationFrame(sky.raf); sky.raf = 0; }

  // ---------- Ay geometrisi ----------
  // limbAngle: aydınlık kenarın ekrandaki yönü (yukarıdan, saat yönünün tersine, derece)
  // northAngle: Ay'ın kuzey kutbunun ekrandaki yönü (aynı ölçü)
  function computeGeometry(date) {
    const A = window.Astronomy;
    if (!A) {
      return { phaseAngle: 60, frac: 0.75, elong: 120, limbAngle: -90, northAngle: 0 };
    }
    const obs = new A.Observer(OBSERVER.lat, OBSERVER.lon, OBSERVER.h);
    const ill = A.Illumination(A.Body.Moon, date);
    const m = A.Equator(A.Body.Moon, date, obs, true, true);
    const s = A.Equator(A.Body.Sun, date, obs, true, true);
    const raM = m.ra * 15 * DEG, decM = m.dec * DEG;
    const raS = s.ra * 15 * DEG, decS = s.dec * DEG;

    // Aydınlık kenarın konum açısı (gök kuzeyinden doğuya)
    const pa = Math.atan2(
      Math.cos(decS) * Math.sin(raS - raM),
      Math.sin(decS) * Math.cos(decM) - Math.cos(decS) * Math.sin(decM) * Math.cos(raS - raM)
    );
    // Paralaktik açı: zenitin konum açısı
    const lst = (A.SiderealTime(date) * 15 + OBSERVER.lon) * DEG;
    const H = lst - raM;
    const phi = OBSERVER.lat * DEG;
    const q = Math.atan2(Math.sin(H), Math.tan(phi) * Math.cos(decM) - Math.sin(decM) * Math.cos(H));

    const norm = (d) => ((d % 360) + 360) % 360;
    const moonLon = norm(A.EclipticGeoMoon(date).lon);
    const sunLon = norm(A.Ecliptic(A.GeoVector(A.Body.Sun, date, true)).elon);

    return {
      phaseAngle: ill.phase_angle,
      frac: ill.phase_fraction,
      elong: norm(moonLon - sunLon),
      moonLon,
      limbAngle: (pa - q) / DEG,
      northAngle: -q / DEG
    };
  }

  // ---------- Doku ----------
  function loadTexture() {
    return new Promise((resolve) => {
      const img = new Image();
      img.decoding = 'async';
      img.onload = () => {
        const c = document.createElement('canvas');
        c.width = img.naturalWidth;
        c.height = img.naturalHeight;
        const ctx = c.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(img, 0, 0);
        try {
          texData = { w: c.width, h: c.height, px: ctx.getImageData(0, 0, c.width, c.height).data };
        } catch (e) {
          texData = null;
        }
        resolve();
      };
      img.onerror = () => resolve();
      img.src = TEX.src;
    });
  }

  function sampleTex(lonDeg, latDeg, out) {
    if (!texData) { out[0] = out[1] = out[2] = 190; return; }
    const { w, h, px } = texData;
    const fx = clamp((lonDeg - TEX.lonMin) / (TEX.lonMax - TEX.lonMin) * (w - 1), 0, w - 1.001);
    const fy = clamp((90 - latDeg) / 180 * (h - 1), 0, h - 1.001);
    const x0 = fx | 0, y0 = fy | 0;
    const tx = fx - x0, ty = fy - y0;
    const i00 = (y0 * w + x0) * 4, i10 = i00 + 4, i01 = i00 + w * 4, i11 = i01 + 4;
    for (let c = 0; c < 3; c++) {
      const a = px[i00 + c] + (px[i10 + c] - px[i00 + c]) * tx;
      const b = px[i01 + c] + (px[i11 + c] - px[i01 + c]) * tx;
      out[c] = a + (b - a) * ty;
    }
  }

  // ---------- Gerçekçi Ay çizimi ----------
  function drawMoon(canvas, g) {
    const wrap = canvas.parentElement;
    const css = wrap ? wrap.clientWidth : 220;
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    const size = Math.min(720, Math.round(css * dpr));
    if (canvas.width !== size) { canvas.width = size; canvas.height = size; }
    const ctx = canvas.getContext('2d');
    const img = ctx.createImageData(size, size);
    const data = img.data;

    const dark = isDarkMode();
    const R = size * 0.5 - 1.5;
    const c = size / 2;

    // Işık vektörü (ekran: x sağ, y yukarı, z izleyiciye doğru)
    const alpha = g.phaseAngle * DEG;
    const la = g.limbAngle * DEG;
    const bx = -Math.sin(la), by = Math.cos(la);
    const Lx = Math.sin(alpha) * bx, Ly = Math.sin(alpha) * by, Lz = Math.cos(alpha);
    const rot = g.northAngle * DEG;
    const cr = Math.cos(rot), sr = Math.sin(rot);

    // Yer ışığı: hilal evrelerinde karanlık yüz hafifçe görünür
    const earthshine = (dark ? 0.085 : 0.0) * Math.pow(1 - g.frac, 1.6);
    const exposure = dark ? 1.18 : 1.36;
    const tint = dark ? [1.03, 1.0, 0.95] : [1.0, 1.0, 1.0];
    const rgb = [0, 0, 0];

    for (let y = 0; y < size; y++) {
      const ny = (c - (y + 0.5)) / R;
      for (let x = 0; x < size; x++) {
        const nx = ((x + 0.5) - c) / R;
        const r2 = nx * nx + ny * ny;
        if (r2 > 1.0 + 2.5 / R) continue;
        const edge = clamp((1 - Math.sqrt(r2)) * R + 0.5, 0, 1); // kenar yumuşatma
        const nz = Math.sqrt(Math.max(0, 1 - r2));

        // Ay koordinatları (kuzey kutup dönüşü)
        const ux = nx * cr + ny * sr;
        const uy = -nx * sr + ny * cr;
        const lat = Math.asin(clamp(uy, -1, 1)) / DEG;
        const lon = Math.atan2(ux, nz) / DEG;
        sampleTex(lon, lat, rgb);

        // Lommel–Seeliger (Ay yüzeyine özgü: dolunayda düz parlaklık) + biraz Lambert
        const mu0 = nx * Lx + ny * Ly + nz * Lz;
        const mu = Math.max(nz, 0.02);
        let I = 0;
        if (mu0 > -0.05) {
          const m0 = Math.max(mu0, 0);
          const ls = Math.min(1.35, (2 * m0) / (m0 + mu));
          I = (0.82 * ls + 0.18 * m0) * smooth(-0.035, 0.05, mu0);
        }
        // Kenarda çok hafif kararma ve sıcaklık
        const limb = 0.9 + 0.1 * Math.pow(nz, 0.35);
        const light = I * limb * exposure + earthshine;

        const i = (y * size + x) * 4;
        let r = rgb[0] * light * tint[0], gg = rgb[1] * light * tint[1], bb = rgb[2] * light * tint[2];
        if (!dark) {
          // Gündüz Ay'ı: atmosferden dolayı daha soluk ve hafif mavimsi
          r = r * 0.8 + 238 * 0.2 * smooth(0, 0.3, I);
          gg = gg * 0.8 + 243 * 0.2 * smooth(0, 0.3, I);
          bb = bb * 0.8 + 252 * 0.2 * smooth(0, 0.3, I);
        }
        data[i] = clamp(r, 0, 255);
        data[i + 1] = clamp(gg, 0, 255);
        data[i + 2] = clamp(bb, 0, 255);

        let a;
        if (dark) {
          a = 0.92; // gece: karanlık yüz diskin silueti olarak hafifçe görünür
          if (light < 0.02) { data[i] += 6; data[i + 1] += 9; data[i + 2] += 16; }
        } else {
          // gündüz: karanlık yüz gökyüzüyle karışır, hafif bir iz kalır
          a = clamp(0.025 + 0.95 * smooth(0.0, 0.22, I), 0, 1);
        }
        data[i + 3] = Math.round(255 * a * edge);
      }
    }
    ctx.putImageData(img, 0, 0);

    const halo = document.getElementById('moonHalo');
    if (halo) {
      halo.style.opacity = dark ? (0.25 + g.frac * 0.55).toFixed(2) : (0.15 + g.frac * 0.3).toFixed(2);
    }
  }

  function phaseName(elong) {
    if (elong < 6 || elong >= 354) return 'Yeniay';
    if (elong < 84) return 'Büyüyen Hilal';
    if (elong < 96) return 'İlk Dördün';
    if (elong < 174) return 'Büyüyen Şişkin Ay';
    if (elong < 186) return 'Dolunay';
    if (elong < 264) return 'Küçülen Şişkin Ay';
    if (elong < 276) return 'Son Dördün';
    return 'Küçülen Hilal';
  }

  function updateCaption(g) {
    const SIGNS = ['Koç', 'Boğa', 'İkizler', 'Yengeç', 'Aslan', 'Başak', 'Terazi', 'Akrep', 'Yay', 'Oğlak', 'Kova', 'Balık'];
    const LOC = ['ta', 'da', 'de', 'te', 'da', 'ta', 'de', 'te', 'da', 'ta', 'da', 'ta'];
    const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    set('liveMoonPhase', phaseName(g.elong));
    if (g.moonLon !== undefined) {
      const idx = Math.floor(g.moonLon / 30) % 12;
      set('heroSign', `Ay ${SIGNS[idx]}'${LOC[idx]}`);
    }
    const big = document.getElementById('heroIllum');
    if (big) big.innerHTML = `<span class="hero-pct">%</span>${Math.round(g.frac * 100)}`;
    const canvas = document.getElementById('liveMoonCanvas');
    if (canvas) canvas.setAttribute('aria-label', `${phaseName(g.elong)}, yüzde ${Math.round(g.frac * 100)} aydınlık`);
  }

  function renderMoon() {
    const canvas = document.getElementById('liveMoonCanvas');
    if (!canvas) return;
    try { geom = computeGeometry(new Date()); } catch (e) { console.error('Ay geometrisi hesaplanamadı:', e); }
    if (!geom) return;
    drawMoon(canvas, geom);
    updateCaption(geom);
  }

  function init() {
    document.body.classList.add('weather-sky-home');
    if (!document.getElementById('skyBackdrop')) {
      const bg = document.createElement('div');
      bg.id = 'skyBackdrop';
      bg.className = 'sky-backdrop';
      bg.setAttribute('aria-hidden', 'true');
      sky.canvas = document.createElement('canvas');
      sky.canvas.id = 'skyStarsCanvas';
      bg.appendChild(sky.canvas);
      document.body.prepend(bg);
      setupSky();
      startSky();
      let rt;
      window.addEventListener('resize', () => {
        clearTimeout(rt);
        rt = setTimeout(() => { setupSky(); if (reduceMotion) frame(performance.now()); if (geom) drawMoon(document.getElementById('liveMoonCanvas'), geom); }, 150);
      }, { passive: true });
      document.addEventListener('visibilitychange', () => { if (document.hidden) stopSky(); else startSky(); });
    }

    // Doku yüklenmeden önce düz renkli hızlı bir çizim, sonra gerçek doku
    renderMoon();
    loadTexture().then(renderMoon);
    setInterval(renderMoon, 60 * 1000);

    new MutationObserver(() => {
      if (sky.canvas) { setupSky(); if (reduceMotion) frame(performance.now()); }
      const mc = document.getElementById('liveMoonCanvas');
      if (mc && geom) drawMoon(mc, geom);
    }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  }

  window.LunaMoon = { computeGeometry, phaseName };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
