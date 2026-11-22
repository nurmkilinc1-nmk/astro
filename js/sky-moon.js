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

  // ---------- Gökyüzü arka planı ----------
  function drawSky(canvas) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = window.innerWidth;
    const h = window.innerHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    const dark = isDarkMode();

    if (dark) {
      const count = Math.min(140, Math.floor((w * h) / 6400));
      let seed = 73;
      const rand = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
      for (let i = 0; i < count; i++) {
        const x = rand() * w;
        const y = rand() * h * 0.75;
        const r = 0.4 + rand() * 1.2;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(245, 248, 255, ${(0.16 + rand() * 0.7).toFixed(2)})`;
        ctx.fill();
      }
    }

    const clouds = [
      { x: w * 0.06, y: h * 0.30, rx: Math.max(180, w * 0.28), ry: 110, a: dark ? 0.20 : 0.42 },
      { x: w * 0.18, y: h * 0.42, rx: Math.max(150, w * 0.22), ry: 90, a: dark ? 0.16 : 0.34 },
      { x: w * 0.94, y: h * 0.34, rx: Math.max(190, w * 0.30), ry: 120, a: dark ? 0.22 : 0.44 },
      { x: w * 0.82, y: h * 0.46, rx: Math.max(160, w * 0.24), ry: 95, a: dark ? 0.14 : 0.32 }
    ];
    clouds.forEach((c) => {
      ctx.save();
      ctx.translate(c.x, c.y);
      ctx.scale(1, c.ry / c.rx);
      const g = ctx.createRadialGradient(0, 0, c.rx * 0.08, 0, 0, c.rx);
      if (dark) {
        g.addColorStop(0, `rgba(116, 132, 178, ${c.a})`);
        g.addColorStop(0.55, `rgba(42, 54, 92, ${(c.a * 0.55).toFixed(2)})`);
        g.addColorStop(1, 'rgba(10, 16, 32, 0)');
      } else {
        g.addColorStop(0, `rgba(255, 255, 255, ${c.a})`);
        g.addColorStop(0.6, `rgba(245, 249, 255, ${(c.a * 0.5).toFixed(2)})`);
        g.addColorStop(1, 'rgba(255, 255, 255, 0)');
      }
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, 0, c.rx, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }

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
    const title = document.getElementById('liveMoonPhase');
    if (title) title.textContent = phaseName(g.elong);
    const signEl = document.getElementById('moonSignText');
    if (signEl && g.moonLon !== undefined) {
      const idx = Math.floor(g.moonLon / 30) % 12;
      const inSign = g.moonLon - idx * 30;
      const d = Math.floor(inSign);
      const m = Math.floor((inSign - d) * 60);
      signEl.textContent = `Ay ${SIGNS[idx]} ${d}°${String(m).padStart(2, '0')}′`;
    }
    const illumEl = document.getElementById('moonIllumText');
    if (illumEl) illumEl.textContent = `%${Math.round(g.frac * 100)} aydınlık`;
    const dirEl = document.getElementById('moonTrendText');
    if (dirEl) dirEl.textContent = g.elong < 180 ? 'Büyüyor' : 'Küçülüyor';
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
      const skyCanvas = document.createElement('canvas');
      skyCanvas.id = 'skyStarsCanvas';
      bg.appendChild(skyCanvas);
      document.body.prepend(bg);
      drawSky(skyCanvas);
      let rt;
      window.addEventListener('resize', () => {
        clearTimeout(rt);
        rt = setTimeout(() => { drawSky(skyCanvas); if (geom) drawMoon(document.getElementById('liveMoonCanvas'), geom); }, 150);
      }, { passive: true });
    }

    // Doku yüklenmeden önce düz renkli hızlı bir çizim, sonra gerçek doku
    renderMoon();
    loadTexture().then(renderMoon);
    setInterval(renderMoon, 60 * 1000);

    new MutationObserver(() => {
      const sky = document.getElementById('skyStarsCanvas');
      if (sky) drawSky(sky);
      const mc = document.getElementById('liveMoonCanvas');
      if (mc && geom) drawMoon(mc, geom);
    }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  }

  window.LunaMoon = { computeGeometry, phaseName };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
