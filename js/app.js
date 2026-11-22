(function () {
  const ICONS = {
    profil: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4.5 20a7.5 7.5 0 0 1 15 0"/></svg>'
  };

  // ---- Alt menü: yazısız, özgün çizgi ikonlar (24px ızgara, 1.6 kalınlık) ----
  const NAV_ICONS = {
    // Günlük rehber: ufuktan doğan güneş + küçük yıldız
    gunluk: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6.5 16.5a5.5 5.5 0 0 1 11 0"/><path d="M3 16.5h18M6 20h12"/><path d="M12 6.5v2M5.4 9.6l1.4 1.4M18.6 9.6l-1.4 1.4"/><path class="nav-accent" d="M19 3.2l.5 1.3 1.3.5-1.3.5-.5 1.3-.5-1.3-1.3-.5 1.3-.5z" fill="currentColor" stroke="none"/></svg>',
    // Gökyüzü takvimi: takvim yaprağı + içinde hilal
    takvim: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3.5" y="5" width="17" height="15.5" rx="4"/><path d="M8 3v3.5M16 3v3.5M3.5 10h17"/><path class="nav-accent" d="M13.9 12.9a3 3 0 1 0 0 4.6 2.4 2.4 0 0 1 0-4.6z" fill="currentColor" stroke="none"/></svg>',
    // Özel takvimler (zamanlama): kum saati + yıldız tozu
    ozel: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 3.5h10M7 20.5h10"/><path d="M8 3.5v2.2a4 4 0 0 0 1.6 3.2L12 11l2.4-2.1A4 4 0 0 0 16 5.7V3.5"/><path d="M8 20.5v-2.2a4 4 0 0 1 1.6-3.2L12 13l2.4 2.1a4 4 0 0 1 1.6 3.2v2.2"/><circle class="nav-accent" cx="12" cy="17.6" r="1.1" fill="currentColor" stroke="none"/><circle class="nav-accent" cx="10.3" cy="18.9" r=".6" fill="currentColor" stroke="none"/><circle class="nav-accent" cx="13.7" cy="18.9" r=".6" fill="currentColor" stroke="none"/></svg>',
    // Astrologlara sor: konuşma balonu + dört köşeli yıldız
    astrologlar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20.5 11.6c0 4.3-3.8 7.6-8.5 7.6-1.2 0-2.3-.2-3.3-.6L4 20l1.2-3.6a7.2 7.2 0 0 1-1.7-4.8C3.5 7.3 7.3 4 12 4s8.5 3.3 8.5 7.6z"/><path class="nav-accent" d="M12 8.2l.9 2.6 2.6.9-2.6.9-.9 2.6-.9-2.6-2.6-.9 2.6-.9z" fill="currentColor" stroke="none"/></svg>'
  };

  // Ortadaki düğme: Ay'ın o anki gerçek fazı (kütüphanesiz yaklaşık hesap, ±1 gün)
  function moonPhaseFraction(date) {
    const SYNODIC = 29.530588853;
    const REF_NEW_MOON = Date.UTC(2000, 0, 6, 18, 14); // 6 Oca 2000 Yeniay
    const days = (date.getTime() - REF_NEW_MOON) / 86400000;
    return (((days / SYNODIC) % 1) + 1) % 1; // 0 Yeniay, 0.5 Dolunay
  }

  function moonIconSvg(f) {
    const cx = 12, cy = 12, r = 8;
    const k = Math.cos(2 * Math.PI * f);
    const rx = Math.max(0.01, Math.abs(k) * r).toFixed(2);
    const top = `${cx} ${cy - r}`, bottom = `${cx} ${cy + r}`;
    const waxing = f < 0.5;
    const crescent = k > 0;
    const limbSweep = waxing ? 1 : 0;
    const termSweep = waxing ? (crescent ? 0 : 1) : (crescent ? 1 : 0);
    const lit = `M${top} A${r} ${r} 0 0 ${limbSweep} ${bottom} A${rx} ${r} 0 0 ${termSweep} ${top}Z`;
    return `<svg viewBox="0 0 24 24" aria-hidden="true" class="nav-moon">
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="currentColor" opacity=".22"/>
      <path d="${lit}" fill="currentColor"/>
      <g fill="#6b5a4e" opacity=".16">
        <circle cx="9.4" cy="9.6" r="1.9"/><circle cx="14.6" cy="8.4" r="1.2"/>
        <circle cx="13.4" cy="14.2" r="2.2"/><circle cx="8.8" cy="15.2" r="1"/>
      </g>
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="currentColor" stroke-width=".8" opacity=".6"/>
    </svg>`;
  }

  const BOTTOM_TABS = [
    { href: 'gunluk.html', label: 'Günlük rehber', icon: NAV_ICONS.gunluk },
    { href: 'aylik-takvim.html', label: 'Gökyüzü takvimi', icon: NAV_ICONS.takvim },
    { href: 'index.html', label: 'Bugün', center: true },
    { href: 'ozel-takvimler.html', label: 'Özel takvimler', icon: NAV_ICONS.ozel },
    { href: 'astrologlar.html', label: 'Astrologlara sor', icon: NAV_ICONS.astrologlar }
  ];
  // Alt sayfalar ait oldukları sekmeyi aktif gösterir
  const TAB_ALIASES = {
    'bahcivanlik.html': 'ozel-takvimler.html', 'detoks.html': 'ozel-takvimler.html',
    'gida-mutfak.html': 'ozel-takvimler.html', 'imza-sozlesme.html': 'ozel-takvimler.html',
    'sac-bakim.html': 'ozel-takvimler.html', 'saglik-tedavi.html': 'ozel-takvimler.html',
    'seyahat.html': 'ozel-takvimler.html', 'sosyal.html': 'ozel-takvimler.html',
    'yeni-baslangiclar.html': 'ozel-takvimler.html', 'danismanlik.html': 'astrologlar.html'
  };

  const rawPath = window.location.pathname.split('?')[0].split('#')[0];
  const fileName = rawPath.split('/').pop();
  const currentPage = (!fileName || fileName === '/') ? 'index.html' : fileName.toLowerCase();

  function applyBrand() {
    document.querySelectorAll('.logo, .brand').forEach((el) => {
      el.innerHTML = 'luna<span>.</span>gram';
    });
    if (document.title && /astro\.takvim/i.test(document.title)) {
      document.title = document.title.replace(/astro\.takvim/gi, 'luna.gram');
    }
  }

  function initAppChrome() {
    applyBrand();
    const headerInner = document.querySelector('.header-inner');
    if (headerInner && !document.getElementById('headerProfileBtn')) headerInner.insertAdjacentHTML('afterbegin', `<a href="kayit.html" id="headerProfileBtn" class="header-profile-btn" aria-label="Profil">${ICONS.profil}</a>`);
    
    document.querySelectorAll('#mainNav a').forEach((link) => {
      const href = (link.getAttribute('href') || '').toLowerCase();
      if (href === currentPage) {
        link.classList.add('active');
        link.setAttribute('aria-current', 'page');
      }
    });

    const header = document.getElementById('mainHeader');
    if (header && !header.dataset.scrollBound) {
      header.dataset.scrollBound = '1';
      window.addEventListener('scroll', () => {
        header.classList.toggle('scrolled', window.scrollY > 10);
      }, { passive: true });
    }

    const old_hamburger = document.getElementById('hamburgerBtn');
    const nav = document.getElementById('mainNav');
    if (old_hamburger && nav && !old_hamburger.dataset.menuBound) {
      const hamburger = old_hamburger.cloneNode(true);
      hamburger.dataset.menuBound = '1';
      old_hamburger.replaceWith(hamburger);
      hamburger.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const isOpen = nav.classList.toggle('open');
        hamburger.setAttribute('aria-expanded', String(isOpen));
      });
      nav.querySelectorAll('a').forEach((a) => {
        a.addEventListener('click', () => {
          nav.classList.remove('open');
          hamburger.setAttribute('aria-expanded', 'false');
        });
      });
    }

    const savedTheme = localStorage.getItem('astro-theme');
    const root = document.documentElement;
    if (savedTheme === 'dark') {
      root.setAttribute('data-theme', 'dark');
    } else {
      root.removeAttribute('data-theme');
    }
    
    const oldThemeBtn = document.getElementById('themeToggle');
    if (oldThemeBtn && !oldThemeBtn.dataset.themeBound) {
      const themeToggle = oldThemeBtn.cloneNode(true);
      themeToggle.dataset.themeBound = '1';
      oldThemeBtn.replaceWith(themeToggle);
      themeToggle.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const isDark = root.getAttribute('data-theme') === 'dark';
      if (isDark) {
        root.removeAttribute('data-theme');
        localStorage.setItem('astro-theme', 'light');
        } else {
        root.setAttribute('data-theme', 'dark');
        localStorage.setItem('astro-theme', 'dark');
      }
      });
    }

    if (!document.getElementById('mobileBottomNav') && document.body) buildBottomNav();
  }

  function buildBottomNav() {
    const activeHref = TAB_ALIASES[currentPage] || currentPage;
    const activeIndex = BOTTOM_TABS.findIndex((t) => t.href === activeHref);

    const bar = document.createElement('nav');
    bar.id = 'mobileBottomNav';
    bar.className = 'mobile-bottom-nav';
    bar.setAttribute('aria-label', 'Alt menü');
    if (activeIndex < 0) bar.classList.add('no-active');
    else if (BOTTOM_TABS[activeIndex].center) bar.classList.add('center-active');

    // Kayan kapsül: önceki sayfadaki konumdan yeni sekmeye kayarak gelir
    let prevIndex = null;
    try { prevIndex = sessionStorage.getItem('nav-index'); } catch (e) {}
    const startIndex = prevIndex !== null && prevIndex !== String(activeIndex) ? Number(prevIndex) : activeIndex;
    if (activeIndex >= 0) {
      bar.style.setProperty('--active-index', startIndex);
      if (startIndex !== activeIndex) {
        requestAnimationFrame(() => requestAnimationFrame(() => bar.style.setProperty('--active-index', activeIndex)));
      }
      try { sessionStorage.setItem('nav-index', String(activeIndex)); } catch (e) {}
    }

    const indicator = '<span class="bottom-nav-indicator" aria-hidden="true"></span>';
    bar.innerHTML = indicator + BOTTOM_TABS.map((t, i) => {
      const isActive = i === activeIndex;
      const cls = ['bottom-tab', isActive ? 'active' : '', t.center ? 'bottom-tab-center' : ''].filter(Boolean).join(' ');
      const icon = t.center ? moonIconSvg(moonPhaseFraction(new Date())) : t.icon;
      const aria = isActive ? ' aria-current="page"' : '';
      return `<a href="${t.href}" class="${cls}" aria-label="${t.label}" title="${t.label}"${aria}><span class="tab-icon">${icon}</span></a>`;
    }).join('');
    document.body.appendChild(bar);

    // Dokunuşta hafif titreşim (Android uygulamasında hissedilir)
    bar.addEventListener('pointerdown', (e) => {
      if (e.target.closest('.bottom-tab') && navigator.vibrate) navigator.vibrate(8);
    }, { passive: true });

    // Aşağı kaydırınca gizlen, yukarı kaydırınca geri gel
    let lastY = window.scrollY;
    let ticking = false;
    window.addEventListener('scroll', () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        const nearBottom = window.innerHeight + y >= document.documentElement.scrollHeight - 40;
        if (y > lastY + 6 && y > 120 && !nearBottom) bar.classList.add('is-hidden');
        else if (y < lastY - 6 || y <= 120 || nearBottom) bar.classList.remove('is-hidden');
        lastY = y;
        ticking = false;
      });
    }, { passive: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAppChrome);
  } else {
    initAppChrome();
  }
})();
