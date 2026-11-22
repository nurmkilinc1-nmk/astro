(function () {
  const BOTTOM_TABS = [
    { href: 'gunluk.html', label: 'Günlük', icon: '✨' },
    { href: 'aylik-takvim.html', label: 'Takvim', icon: '📅' },
    { href: 'index.html', label: 'Bugün', icon: '🌙', center: true },
    { href: 'astrologlar.html', label: 'Astrologlar', icon: '🔮' },
    { href: 'kayit.html', label: 'Profil', icon: '👤' }
  ];

  const currentPage = window.location.pathname.split('/').pop() || 'index.html';

  document.querySelectorAll('#mainNav a').forEach((link) => {
    if (link.getAttribute('href') === currentPage) {
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

  const hamburger = document.getElementById('hamburgerBtn');
  const nav = document.getElementById('mainNav');
  if (hamburger && nav && !hamburger.dataset.menuBound) {
    hamburger.dataset.menuBound = '1';
    hamburger.addEventListener('click', () => {
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

  const root = document.documentElement;
  if (localStorage.getItem('astro-theme') === 'dark') {
    root.setAttribute('data-theme', 'dark');
  }
  const themeToggle = document.getElementById('themeToggle');
  if (themeToggle && !themeToggle.dataset.themeBound) {
    themeToggle.dataset.themeBound = '1';
    themeToggle.addEventListener('click', () => {
      const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      if (next === 'dark') root.setAttribute('data-theme', 'dark');
      else root.removeAttribute('data-theme');
      localStorage.setItem('astro-theme', next);
    });
  }

  if (!document.getElementById('mobileBottomNav')) {
    const bar = document.createElement('nav');
    bar.id = 'mobileBottomNav';
    bar.className = 'mobile-bottom-nav';
    bar.setAttribute('aria-label', 'Alt Menü');
    bar.innerHTML = BOTTOM_TABS.map((t) => {
      const active = currentPage === t.href ? ' active' : '';
      const center = t.center ? ' bottom-tab-center' : '';
      return `<a href="${t.href}" class="bottom-tab${active}${center}"><span class="tab-icon">${t.icon}</span><span class="tab-label">${t.label}</span></a>`;
    }).join('');
    document.body.appendChild(bar);
  }
})();
