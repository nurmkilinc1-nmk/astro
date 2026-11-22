(function () {
  const path = window.location.pathname.split('?')[0].split('#')[0];
  const file = path.split('/').pop();
  if (file && file !== 'index.html' && file !== '') return;

  let lastAngle = 135;
  let lastIllum = 0.85;

  function isDarkMode() {
    return document.documentElement.getAttribute('data-theme') === 'dark';
  }

  function initSkyAndMoon() {
    document.body.classList.add('weather-sky-home');

    // 1. Açık Gökyüzü (Gece: Yıldızlar + Gece Bulutları / Gündüz: Yumuşak Gündüz Bulutları)
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
      window.addEventListener('resize', () => drawSky(skyCanvas), { passive: true });
    }

    // 2. Doğrudan gökyüzü üstünde süzülen kutusuz Canlı Ay sahnesi
    const hero = document.querySelector('section.hero');
    if (hero && !document.getElementById('liveMoonStage')) {
      const stage = document.createElement('section');
      stage.id = 'liveMoonStage';
      stage.className = 'live-moon-stage';
      stage.setAttribute('aria-label', 'Canlı Ay Fazı');
      stage.innerHTML = `
        <div class="moon-open-sky">
          <div class="moon-canvas-wrap">
            <div class="moon-halo" id="moonHalo"></div>
            <canvas id="liveMoonCanvas" width="440" height="440"></canvas>
          </div>
          <h2 class="moon-stage-title" id="liveMoonPhase">Ay Fazı Hesaplanıyor...</h2>
          <p class="moon-stage-meta" id="liveMoonMeta">Gökyüzü verileri alınıyor...</p>
        </div>
      `;
      hero.parentNode.insertBefore(stage, hero);
      renderLiveMoon();
    }

    // Tema değiştiğinde gökyüzünü ve Ay'ı anında güncelle
    const observer = new MutationObserver(() => {
      const skyCanvas = document.getElementById('skyStarsCanvas');
      const moonCanvas = document.getElementById('liveMoonCanvas');
      if (skyCanvas) drawSky(skyCanvas);
      if (moonCanvas) drawRealisticMoon(moonCanvas, lastAngle, lastIllum);
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  }

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

    // Gece modunda ince yıldızlar
    if (dark) {
      const count = Math.min(130, Math.floor((w * h) / 6800));
      let seed = 73;
      const rand = () => {
        seed = (seed * 16807) % 2147483647;
        return (seed - 1) / 2147483646;
      };
      for (let i = 0; i < count; i++) {
        const x = rand() * w;
        const y = rand() * h * 0.72;
        const r = 0.5 + rand() * 1.25;
        const alpha = 0.18 + rand() * 0.68;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(245, 248, 255, ${alpha.toFixed(2)})`;
        ctx.fill();
      }
    }

    // İki yandan gelen yumuşak atmosferik bulut katmanları (Gece: lacivert-mor sis / Gündüz: beyaz yumuşak bulut)
    const clouds = [
      { x: w * 0.06, y: h * 0.34, rx: Math.max(180, w * 0.28), ry: 110, a: dark ? 0.22 : 0.45 },
      { x: w * 0.18, y: h * 0.44, rx: Math.max(150, w * 0.22), ry: 90, a: dark ? 0.18 : 0.36 },
      { x: w * 0.94, y: h * 0.38, rx: Math.max(190, w * 0.3), ry: 120, a: dark ? 0.24 : 0.46 },
      { x: w * 0.82, y: h * 0.48, rx: Math.max(160, w * 0.24), ry: 95, a: dark ? 0.16 : 0.34 }
    ];
    clouds.forEach((c) => {
      ctx.save();
      ctx.translate(c.x, c.y);
      ctx.scale(1, c.ry / c.rx);
      const grad = ctx.createRadialGradient(0, 0, c.rx * 0.08, 0, 0, c.rx);
      if (dark) {
        grad.addColorStop(0, `rgba(116, 132, 178, ${c.a})`);
        grad.addColorStop(0.55, `rgba(42, 54, 92, ${(c.a * 0.55).toFixed(2)})`);
        grad.addColorStop(1, 'rgba(10, 16, 32, 0)');
      } else {
        grad.addColorStop(0, `rgba(255, 255, 255, ${c.a})`);
        grad.addColorStop(0.6, `rgba(245, 249, 255, ${(c.a * 0.5).toFixed(2)})`);
        grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
      }
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(0, 0, c.rx, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }

  function getPhaseName(angle) {
    if (angle < 22.5 || angle >= 337.5) return 'Yeniay';
    if (angle < 67.5) return 'Büyüyen Hilal';
    if (angle < 112.5) return 'İlk Dördün';
    if (angle < 157.5) return 'Büyüyen Şişkin Ay';
    if (angle < 202.5) return 'Dolunay';
    if (angle < 247.5) return 'Küçülen Şişkin Ay';
    if (angle < 292.5) return 'Son Dördün';
    return 'Balsamik Hilal';
  }

  function drawRealisticMoon(canvas, phaseAngleDeg, illumFrac) {
    const ctx = canvas.getContext('2d');
    const size = canvas.width;
    const cx = size / 2;
    const cy = size / 2;
    const r = size * 0.43;
    const dark = isDarkMode();

    ctx.clearRect(0, 0, size, size);

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.clip();

    // 1. Aydınlık Ay yüzeyi
    const litGrad = ctx.createRadialGradient(cx - r * 0.2, cy - r * 0.22, r * 0.06, cx, cy, r * 1.06);
    if (dark) {
      litGrad.addColorStop(0, '#fcfaf4');
      litGrad.addColorStop(0.55, '#ded8ca');
      litGrad.addColorStop(0.86, '#b7b0a0');
      litGrad.addColorStop(1, '#857e70');
    } else {
      litGrad.addColorStop(0, '#ffffff');
      litGrad.addColorStop(0.6, '#edf1f6');
      litGrad.addColorStop(0.9, '#cfd8e3');
      litGrad.addColorStop(1, '#b5c2d1');
    }
    ctx.fillStyle = litGrad;
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);

    // 2. Ay denizleri (maria) ve krater detayları
    const maria = [
      [-0.26, -0.22, 0.27, 0.20, 0.22],
      [0.14, -0.28, 0.23, 0.18, 0.19],
      [0.31, -0.04, 0.21, 0.25, 0.22],
      [-0.08, 0.10, 0.28, 0.22, 0.17],
      [-0.36, 0.18, 0.18, 0.15, 0.16],
      [0.21, 0.28, 0.17, 0.14, 0.16],
      [-0.03, -0.42, 0.18, 0.10, 0.14]
    ];
    maria.forEach(([ox, oy, rx, ry, a]) => {
      ctx.save();
      ctx.translate(cx + ox * r, cy + oy * r);
      ctx.scale(1, ry / rx);
      const mg = ctx.createRadialGradient(0, 0, r * rx * 0.1, 0, 0, r * rx);
      const alpha = dark ? a : a * 0.65;
      mg.addColorStop(0, `rgba(68, 70, 76, ${alpha.toFixed(2)})`);
      mg.addColorStop(1, 'rgba(68, 70, 76, 0)');
      ctx.fillStyle = mg;
      ctx.beginPath();
      ctx.arc(0, 0, r * rx, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    const craters = [
      [-0.18, 0.42, 0.068], [0.28, -0.34, 0.052], [-0.42, -0.06, 0.055],
      [0.08, 0.18, 0.045], [-0.06, -0.14, 0.04], [0.40, 0.16, 0.042],
      [0.34, 0.36, 0.035], [0.16, -0.05, 0.038]
    ];
    craters.forEach(([ox, oy, cr]) => {
      ctx.beginPath();
      ctx.arc(cx + ox * r, cy + oy * r, cr * r, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.fill();
      ctx.strokeStyle = dark ? 'rgba(62, 62, 66, 0.24)' : 'rgba(90, 102, 120, 0.18)';
      ctx.lineWidth = 1.6;
      ctx.stroke();
    });

    // 3. Gerçek Ay Fazı Gölgesi (gündüz gökyüzüne karışan yumuşak gölge, gece derin uzay gölgesi)
    const rad = (phaseAngleDeg * Math.PI) / 180;
    const waxing = phaseAngleDeg <= 180;
    const cosP = Math.cos(rad);
    const termRx = Math.abs(cosP) * r;

    ctx.fillStyle = dark ? 'rgba(7, 12, 24, 0.92)' : 'rgba(138, 178, 218, 0.72)';
    ctx.beginPath();
    if (waxing) {
      ctx.arc(cx, cy, r + 1, Math.PI / 2, (3 * Math.PI) / 2, false);
      ctx.ellipse(cx, cy, Math.max(0.5, termRx), r + 1, 0, -Math.PI / 2, Math.PI / 2, cosP < 0);
    } else {
      ctx.arc(cx, cy, r + 1, -Math.PI / 2, Math.PI / 2, false);
      ctx.ellipse(cx, cy, Math.max(0.5, termRx), r + 1, 0, Math.PI / 2, (3 * Math.PI) / 2, cosP < 0);
    }
    ctx.closePath();
    ctx.fill();

    // 4. Kenar yumuşatma
    const rimGrad = ctx.createRadialGradient(cx, cy, r * 0.76, cx, cy, r);
    rimGrad.addColorStop(0, 'rgba(0,0,0,0)');
    rimGrad.addColorStop(1, dark ? 'rgba(7, 12, 24, 0.42)' : 'rgba(138, 178, 218, 0.25)');
    ctx.fillStyle = rimGrad;
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);

    ctx.restore();

    const halo = document.getElementById('moonHalo');
    if (halo) {
      halo.style.opacity = dark ? (0.28 + illumFrac * 0.5).toFixed(2) : (0.18 + illumFrac * 0.25).toFixed(2);
    }
  }

  function renderLiveMoon() {
    const canvas = document.getElementById('liveMoonCanvas');
    if (!canvas) return;

    const SIGNS = ['Koç', 'Boğa', 'İkizler', 'Yengeç', 'Aslan', 'Başak', 'Terazi', 'Akrep', 'Yay', 'Oğlak', 'Kova', 'Balık'];
    let signName = '—';
    let dirArrow = '↗';

    if (typeof Astronomy !== 'undefined') {
      try {
        const now = new Date();
        const norm = (deg) => ((deg % 360) + 360) % 360;
        const moonLon = norm(Astronomy.EclipticGeoMoon(now).lon);
        const sunLon = norm(Astronomy.Ecliptic(Astronomy.GeoVector(Astronomy.Body.Sun, now, true)).elon);
        lastAngle = norm(moonLon - sunLon);
        lastIllum = Astronomy.Illumination(Astronomy.Body.Moon, now).phase_fraction;
        signName = `${SIGNS[Math.floor(moonLon / 30) % 12]} (${Math.floor(moonLon % 30)}°)`;
        dirArrow = lastAngle <= 180 ? '↗' : '↘';
      } catch (e) {
        console.error('Canli Ay hesaplama hatasi:', e);
      }
    }

    drawRealisticMoon(canvas, lastAngle, lastIllum);
    document.getElementById('liveMoonPhase').textContent = getPhaseName(lastAngle);
    document.getElementById('liveMoonMeta').textContent = `${dirArrow} Ay ${signName} burcunda  ·  %${Math.round(lastIllum * 100)} aydınlanma`;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSkyAndMoon);
  } else {
    initSkyAndMoon();
  }
})();
