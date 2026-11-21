(function () {
  const NAV_ITEMS = [
    { href: 'index.html', label: 'Ana Sayfa' },
    { href: 'gunluk.html', label: 'Günlük' },
    { href: 'aylik-takvim.html', label: 'Aylık Takvim' },
    { href: 'ozel-takvimler.html', label: 'Özel Takvimler' },
    { href: 'astrosozluk.html', label: 'Astrosözlük' },
    { href: 'hakkimda.html', label: 'Hakkımda' }
  ];

  const currentPage = window.location.pathname.split('/').pop() || 'index.html';

  // 1. Ortak Header (data-shared varsa otomatik doldurur)
  const sharedHeader = document.querySelector('header[data-shared]');
  if (sharedHeader && !sharedHeader.innerHTML.trim()) {
    const linksHtml = NAV_ITEMS.map((item) => {
      const isActive = currentPage === item.href ? ' class="active" aria-current="page"' : '';
      return `<a href="${item.href}"${isActive}>${item.label}</a>`;
    }).join('');

    sharedHeader.id = 'mainHeader';
    sharedHeader.innerHTML = `
      <a href="index.html" class="brand">astro.takvim</a>
      <button id="hamburgerBtn" class="hamburger" aria-label="Menü" aria-expanded="false">☰</button>
      <nav id="mainNav">${linksHtml}</nav>
      <div class="header-actions">
        <button id="themeToggle" class="theme-toggle" aria-label="Tema değiştir">◐</button>
        <a href="kayit.html" class="cta-btn">Kaydol</a>
      </div>
    `;
  }

  // 2. Ortak Footer (data-shared varsa otomatik doldurur)
  const sharedFooter = document.querySelector('footer[data-shared]');
  if (sharedFooter && !sharedFooter.innerHTML.trim()) {
    sharedFooter.innerHTML = `
      <p>© ${new Date().getFullYear()} astro.takvim — Ay Takvimi &amp; Gökyüzü Rehberi</p>
    `;
  }

  // 3. Aktif sayfa bağlantısını vurgula
  document.querySelectorAll('#mainNav a').forEach((link) => {
    if (link.getAttribute('href') === currentPage) {
      link.classList.add('active');
      link.setAttribute('aria-current', 'page');
    }
  });

  // 4. Scroll ile Header gölgesi
  const header = document.getElementById('mainHeader');
  if (header && !header.dataset.scrollBound) {
    header.dataset.scrollBound = '1';
    window.addEventListener('scroll', () => {
      header.classList.toggle('scrolled', window.scrollY > 10);
    }, { passive: true });
  }

  // 5. Mobil Hamburger Menü
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

  // 6. Tema Değiştirici
  const root = document.documentElement;
  const savedTheme = localStorage.getItem('astro-theme');
  if (savedTheme === 'dark') {
    root.setAttribute('data-theme', 'dark');
  }

  const themeToggle = document.getElementById('themeToggle');
  if (themeToggle && !themeToggle.dataset.themeBound) {
    themeToggle.dataset.themeBound = '1';
    themeToggle.addEventListener('click', () => {
      const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      if (next === 'dark') {
        root.setAttribute('data-theme', 'dark');
      } else {
        root.removeAttribute('data-theme');
      }
      localStorage.setItem('astro-theme', next);
    });
  }
})();
