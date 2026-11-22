(function () {
  const ICONS = {
    gunluk: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3z"/><path d="M19 3v3M20.5 4.5h-3M5 17v2M6 18H4"/></svg>',
    takvim: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="17" rx="3"/><path d="M16 2v4M8 2v4M3 10h18"/><circle cx="12" cy="15" r="1.5" fill="currentColor" stroke="none"/></svg>',
    bugun: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.8A8.5 8.5 0 1 1 11.2 3a6.5 6.5 0 0 0 9.8 9.8z"/></svg>',
    astrologlar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3"/><polygon points="12,8 13.4,10.6 16,12 13.4,13.4 12,16 10.6,13.4 8,12 10.6,10.6"/></svg>',
    profil: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4.5 20a7.5 7.5 0 0 1 15 0"/></svg>'
  };

  const BOTTOM_TABS = [
      { href: 'gunluk.html', label: 'Günlük', icon: ICONS.gunluk },
    { href: 'index.html', label: 'Bugün', icon: ICONS.bugun, center: true },
    { href: 'astrologlar.html', label: 'Astrologlar', icon: ICONS.astrologlar }
  ];

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

    if (!document.getElementById('mobileBottomNav') && document.body) {
      const bar = document.createElement('nav');
      bar.id = 'mobileBottomNav';
      bar.className = 'mobile-bottom-nav';
      bar.setAttribute('aria-label', 'Alt Menü');
      bar.innerHTML = BOTTOM_TABS.map((t) => {
        const isActive = currentPage === t.href;
        const active = isActive ? ' active' : '';
        const center = t.center ? ' bottom-tab-center' : '';
        const aria = isActive ? ' aria-current="page"' : '';
        return `<a href="${t.href}" class="bottom-tab${active}${center}"${aria}><span class="tab-icon">${t.icon}</span><span class="tab-label">${t.label}</span></a>`;
      }).join('');
      document.body.appendChild(bar);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAppChrome);
  } else {
    initAppChrome();
  }
})();
