// ===== astrologers.js — luna.gram astrolog ve konu verisi =====
// Şimdilik örnek profiller. Pro sürümde bu liste bir sunucudan (API) gelecek;
// alan adları aynı kaldığı sürece sayfa kodunun değişmesi gerekmez.
(function (root) {
  'use strict';

  const TOPICS = [
    {
      id: 'natal', name: 'Doğum haritası',
      icon: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="3"/><path d="M12 3.5v5.5M12 15v5.5M3.5 12H9M15 12h5.5"/>',
      placeholder: 'Ör. Doğum haritamda kariyerimi en çok hangi yerleşimler etkiliyor?'
    },
    {
      id: 'iliski', name: 'İlişki & uyum',
      icon: '<circle cx="9" cy="12" r="5.5"/><circle cx="15" cy="12" r="5.5"/>',
      placeholder: 'Ör. Partnerimle haritalarımız ne kadar uyumlu? (Partnerinin doğum tarihi, saati ve yerini de yaz.)'
    },
    {
      id: 'kariyer', name: 'Kariyer & para',
      icon: '<rect x="3.5" y="7.5" width="17" height="12" rx="3"/><path d="M9 7.5V6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v1.5M3.5 13h17"/>',
      placeholder: 'Ör. Önümüzdeki aylarda iş değiştirmek için uygun bir dönem var mı?'
    },
    {
      id: 'ongoru', name: 'Yıllık öngörü',
      icon: '<path d="M12 3.5l2.2 5.3 5.8.5-4.4 3.8 1.3 5.6L12 15.8l-4.9 2.9 1.3-5.6L4 9.3l5.8-.5z"/>',
      placeholder: 'Ör. Önümüzdeki yıl beni hangi temalar bekliyor?'
    },
    {
      id: 'zamanlama', name: 'Ay & zamanlama',
      icon: '<path d="M19.5 14.2A7.8 7.8 0 1 1 9.8 4.5a6 6 0 0 0 9.7 9.7z"/>',
      placeholder: 'Ör. Dükkân açılışı için önümüzdeki ay en uygun gün hangisi?'
    }
  ];

  const FORMATS = {
    yazili: { name: 'Yazılı', icon: '<path d="M4 6.5h16M4 11.5h16M4 16.5h10"/>' },
    sesli: { name: 'Sesli', icon: '<rect x="9" y="3.5" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5v3"/>' },
    goruntulu: { name: 'Görüntülü', icon: '<rect x="3.5" y="6.5" width="12" height="11" rx="2.5"/><path d="m15.5 10.5 5-3v9l-5-3z"/>' }
  };

  // sample: true → gerçek bir kişi değil, Pro'da gerçek astrologlarla değişecek.
  const ASTROLOGERS = [
    {
      id: 'natal-1', sample: true, glyph: '☉', hue: 'sun',
      title: 'Natal Astroloji',
      topics: ['natal', 'ongoru'],
      tags: ['Doğum haritası', 'Yükselen & evler', 'Transitler'],
      bio: 'Doğum haritandaki temel potansiyelleri, hayat döngülerini ve güncel gezegen geçişlerinin sana etkisini yorumlar.',
      formats: ['yazili', 'goruntulu'],
      response: '24 saat içinde'
    },
    {
      id: 'iliski-2', sample: true, glyph: '♀', hue: 'rose',
      title: 'İlişki & Sinastri',
      topics: ['iliski', 'natal'],
      tags: ['Sinastri', 'Kompozit harita', 'Venüs döngüleri'],
      bio: 'İki haritayı karşılaştırarak ilişki dinamiklerini, uyum alanlarını ve önemli dönemeçleri ele alır.',
      formats: ['yazili', 'sesli'],
      response: '12–24 saat içinde'
    },
    {
      id: 'kariyer-3', sample: true, glyph: '♄', hue: 'earth',
      title: 'Kariyer & Öngörü',
      topics: ['kariyer', 'ongoru'],
      tags: ['Kariyer', 'Solar return', 'Yıllık öngörü'],
      bio: 'İş değişikliği, yeni girişimler ve yıllık planlama için haritana göre dönemsel rehberlik sunar.',
      formats: ['yazili', 'goruntulu'],
      response: '24–48 saat içinde'
    },
    {
      id: 'ay-4', sample: true, glyph: '☾', hue: 'night',
      title: 'Ay & Seçim Astrolojisi',
      topics: ['zamanlama'],
      tags: ['Ay takvimi', 'Ay boşluğu', 'Tarih seçimi'],
      bio: 'Önemli işlerin için en uygun gün ve saati, Ay fazları, Ay boşluğu ve kişisel haritana göre belirler.',
      formats: ['yazili'],
      response: 'Aynı gün'
    }
  ];

  root.LunaAstro = { TOPICS, FORMATS, ASTROLOGERS };
})(typeof window !== 'undefined' ? window : globalThis);
