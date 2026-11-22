(function () {
  const path = window.location.pathname.split('?')[0].split('#')[0];
  const file = path.split('/').pop();
  if (file && file !== 'index.html' && file !== '') return;

  function initSkyAndMoon() {
    document.body.classList.add('weather-sky-home');

    // 1. Apple Weather tarzı hafif yıldızlı gökyüzü arka planı
    if (!document.getElementById('skyBackdrop')) {
      const bg = document.createElement('div');
      bg.id = 'skyBackdrop';
      bg.className = 'sky-backdrop';
      bg.setAttribute('aria-hidden', 'true');
      const starCanvas = document.createElement('canvas');
      starCanvas.id = 'skyStarsCanvas';
      bg.appendChild(starCanvas);
      document.body.prepend(bg);
      drawStars(starCanvas);
      window.addEventListener('resize', () => drawStars(starCanvas), { passive: true });
    }

    // 2. Hero üstüne gerçekçi canlı Ay sahnesi ekle (mevcut #wheel korunur)
    const hero = document.querySelector('section.hero');
    if (hero && !document.getElementById('liveMoonStage')) {
      const stage = document.createElement('section');
      stage.id = 'liveMoonStage';
      stage.className = 'live-moon-stage';
      stage.setAttribute('aria-label', 'Canlı Ay Fazı');
      stage.innerHTML = `
        <div class="moon-stage-glass">
          <div class="moon-canvas-wrap">
            <div class="moon-halo" id="moonHalo"></div>
            <canvas id="liveMoonCanvas" width="360" height="360"></canvas>
          </div>
          <div class="moon-stage-info">
            <span class="moon-stage-eyebrow" id="liveMoonTrend">CANLI GÖKYÜZÜ</span>
            <h2 class="moon-stage-title" id="liveMoonPhase">Ay Fazı Hesaplanıyor...</h2>
            <div class="moon-stage-pills">
              <span class="glass-pill" id="liveMoonIllum">Aydınlanma: —</span>
              <span class="glass-pill" id="liveMoonSign">Burç: —</span>
              <span class="glass-pill" id="liveMoonAge">Ay Yaşı: —</span>
            </div>
          </div>
        </div>
      `;
      hero.parentNode.insertBefore(stage, hero);
      renderLiveMoon();
    }
  }

  function drawStars(canvas) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = window.innerWidth;
    const h = window.innerHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    const count = Math.min(95, Math.floor((w * h) / 9000));
    let seed = 42;
    const rand = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };

    for (let i = 0; i < count; i++) {
      const x = rand() * w;
      const y = rand() * h * 0.78;
      const r = 0.6 + rand() * 1.35;
      const alpha = 0.22 + rand() * 0.65;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 250, 240, ${alpha.toFixed(2)})`;
      ctx.fill();
    }
  }

  function getPhaseName(angle) {
    if (angle < 22.5 || angle >= 337.5) return 'Yeniay';
    if (angle < 67.5) return 'Büyüyen Hilal';
    if (angle < 112.5) return 'İlk Dördün';
    if (angle < 157.5) return 'Büyüyen Şişkin Ay';
    if (angle < 202.5) return 'Dolunay';
    if (angle < 247.5) return 'Küçülen Şişkin Ay';
    if (angle < 292.5) return 'Son Dördün';
    return 'Balzamik Hilal';
  }

  function drawRealisticMoon(canvas, phaseAngleDeg, illumFrac) {
    const ctx = canvas.getContext('2d');
    const size = canvas.width;
    const cx = size / 2;
    const cy = size / 2;
    const r = size * 0.43;

    ctx.clearRect(0, 0, size, size);

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.clip();

    // 1. Aydınlık Ay yüzeyi baz gradyanı
    const litGrad = ctx.createRadialGradient(cx - r * 0.22, cy - r * 0.22, r * 0.08, cx, cy, r * 1.05);
    litGrad.addColorStop(0, '#f7f4eb');
    litGrad.addColorStop(0.55, '#dcd6c8');
    litGrad.addColorStop(0.85, '#b8b1a3');
    litGrad.addColorStop(1, '#8c8578');
    ctx.fillStyle = litGrad;
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);

    // 2. Gerçekçi Ay denizleri (maria) ve krater gölgeleri
    const maria = [
      [-0.28, -0.22, 0.26, 0.20, 0.22],
      [0.12, -0.30, 0.22, 0.18, 0.19],
      [0.30, -0.05, 0.20, 0.24, 0.21],
      [-0.10, 0.08, 0.28, 0.22, 0.17],
      [-0.36, 0.18, 0.18, 0.15, 0.16],
      [0.20, 0.26, 0.16, 0.13, 0.15],
      [-0.04, -0.42, 0.18, 0.10, 0.14]
    ];
    maria.forEach(([ox, oy, rx, ry, a]) => {
      ctx.save();
      ctx.translate(cx + ox * r, cy + oy * r);
      ctx.scale(1, ry / rx);
      const mg = ctx.createRadialGradient(0, 0, r * rx * 0.1, 0, 0, r * rx);
      mg.addColorStop(0, `rgba(74, 72, 70, ${a})`);
      mg.addColorStop(1, 'rgba(74, 72, 70, 0)');
      ctx.fillStyle = mg;
      ctx.beginPath();
      ctx.arc(0, 0, r * rx, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    // Küçük krater halkaları
    const craters = [
      [-0.18, 0.42, 0.07], [0.28, -0.34, 0.05], [-0.42, -0.06, 0.055],
      [0.08, 0.18, 0.045], [-0.06, -0.14, 0.04], [0.40, 0.16, 0.04]
    ];
    craters.forEach(([ox, oy, cr]) => {
      ctx.beginPath();
      ctx.arc(cx + ox * r, cy + oy * r, cr * r, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(70, 68, 66, 0.22)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    });

    // 3. Gerçek faz gölgesi (Kuzey Yarımküre: 0-180 büyüyen sağdan aydınlanır, 180-360 küçülen soldan aydınlanır)
    const rad = (phaseAngleDeg * Math.PI) / 180;
    const waxing = phaseAngleDeg <= 180;
    const cosP = Math.cos(rad); // 1=Yeniay, 0=Dördün, -1=Dolunay
    const termRx = Math.abs(cosP) * r;

    ctx.fillStyle = 'rgba(10, 14, 28, 0.87)';
    ctx.beginPath();
    if (waxing) {
      // Sol yarı her zaman gölgede başlar
      ctx.arc(cx, cy, r + 1, Math.PI / 2, (3 * Math.PI) / 2, false);
      // Terminator eğrisi
      ctx.ellipse(cx, cy, Math.max(0.5, termRx), r + 1, 0, -Math.PI / 2, Math.PI / 2, cosP < 0);
    } else {
      // Sağ yarı gölgede
      ctx.arc(cx, cy, r + 1, -Math.PI / 2, Math.PI / 2, false);
      ctx.ellipse(cx, cy, Math.max(0.5, termRx), r + 1, 0, Math.PI / 2, (3 * Math.PI) / 2, cosP < 0);
    }
    ctx.closePath();
    ctx.fill();

    // 4. Küresel kenar derinliği (limb darkening)
    const rimGrad = ctx.createRadialGradient(cx, cy, r * 0.72, cx, cy, r);
    rimGrad.addColorStop(0, 'rgba(0,0,0,0)');
    rimGrad.addColorStop(1, 'rgba(8, 12, 24, 0.38)');
    ctx.fillStyle = rimGrad;
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);

    ctx.restore();

    // Hale yoğunluğunu aydınlanmaya göre ayarla
    const halo = document.getElementById('moonHalo');
    if (halo) {
      const opacity = (0.25 + illumFrac * 0.55).toFixed(2);
      halo.style.opacity = opacity;
    }
  }

  function renderLiveMoon() {
    const canvas = document.getElementById('liveMoonCanvas');
    if (!canvas) return;

    const SIGNS = ['Koç', 'Boğa', 'İkizler', 'Yengeç', 'Aslan', 'Başak', 'Terazi', 'Akrep', 'Yay', 'Oğlak', 'Kova', 'Balık'];
    let angle = 135;
    let illum = 0.85;
    let signName = '—';
    let ageDays = '—';

    if (typeof Astronomy !== 'undefined') {
      try {
        const now = new Date();
        const norm = (deg) => ((deg % 360) + 360) % 360;
        const moonLon = norm(Astronomy.EclipticGeoMoon(now).lon);
        const sunLon = norm(Astronomy.Ecliptic(Astronomy.GeoVector(Astronomy.Body.Sun, now, true)).elon);
        angle = norm(moonLon - sunLon);
        illum = Astronomy.Illumination(Astronomy.Body.Moon, now).phase_fraction;
        signName = `${SIGNS[Math.floor(moonLon / 30) % 12]} (${Math.floor(moonLon % 30)}°)`;
        ageDays = `${((angle / 360) * 29.53).toFixed(1)} gün`;
      } catch (e) {
        console.error('Canli Ay hesaplama hatasi:', e);
      }
    }

    drawRealisticMoon(canvas, angle, illum);
    document.getElementById('liveMoonPhase').textContent = getPhaseName(angle);
    document.getElementById('liveMoonTrend').textContent = angle <= 180 ? 'CANLI GÖKYÜZÜ · BÜYÜYEN AY ↑' : 'CANLI GÖKYÜZÜ · KÜÇÜLEN AY ↓';
    document.getElementById('liveMoonIllum').textContent = `Aydınlanma: %${Math.round(illum * 100)}`;
    document.getElementById('liveMoonSign').textContent = `Ay: ${signName}`;
    document.getElementById('liveMoonAge').textContent = `Yaş: ${ageDays}`;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSkyAndMoon);
  } else {
    initSkyAndMoon();
  }
})();
