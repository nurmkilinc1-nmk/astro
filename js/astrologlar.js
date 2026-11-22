// ===== astrologlar.js — luna.gram Astrologlar sayfası =====
(function () {
  'use strict';

  const A = window.LunaAstro;
  const $ = (id) => document.getElementById(id);
  const Q_KEY = 'astro-questions';
  const TOPIC_KEY = 'luna-astro-topic';
  const PRO_KEY = 'luna-pro-interest';
  if (!A) return;

  const topicById = Object.fromEntries(A.TOPICS.map((t) => [t.id, t]));
  const astroById = Object.fromEntries(A.ASTROLOGERS.map((a) => [a.id, a]));
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const ico = (path, cls = '') => `<svg viewBox="0 0 24 24" class="${cls}" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${path}</svg>`;
  const AYLAR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
  const fmtBirth = (s) => {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || ''));
    return m ? `${Number(m[3])} ${AYLAR[Number(m[2]) - 1]} ${m[1]}` : String(s || '');
  };
  const toast = (m) => window.LunaDevice && window.LunaDevice.toast(m);

  let topic = '';
  try { topic = localStorage.getItem(TOPIC_KEY) || ''; } catch (e) {}
  if (topic && !topicById[topic]) topic = '';

  // ---------- Konu seçici ----------
  function renderTopics() {
    const all = [{ id: '', name: 'Tümü', icon: '<circle cx="7" cy="7" r="2.5"/><circle cx="17" cy="7" r="2.5"/><circle cx="7" cy="17" r="2.5"/><circle cx="17" cy="17" r="2.5"/>' }, ...A.TOPICS];
    $('topicChips').innerHTML = all.map((t) => {
      const on = t.id === topic;
      return `<button type="button" class="act-chip${on ? ' on' : ''}" role="radio" aria-checked="${on}" data-topic="${t.id}">${ico(t.icon, 'act-chip-ico')}<span>${t.name}</span></button>`;
    }).join('');
  }
  $('topicChips').addEventListener('click', (e) => {
    const b = e.target.closest('[data-topic]');
    if (!b) return;
    topic = b.dataset.topic;
    try { localStorage.setItem(TOPIC_KEY, topic); } catch (err) {}
    renderTopics();
    renderList();
  });

  // ---------- Astrolog kartları ----------
  function renderList() {
    const list = topic ? A.ASTROLOGERS.filter((a) => a.topics.includes(topic)) : A.ASTROLOGERS;
    $('astroList').innerHTML = list.map((a) => `
      <article class="ast-card glass" data-id="${a.id}">
        <div class="ast-card-top">
          <span class="ast-avatar hue-${a.hue}" aria-hidden="true">${a.glyph}&#xFE0E;</span>
          <div class="ast-card-id">
            <h2 class="ast-name">${esc(a.title)}</h2>
            <span class="ast-sub">${a.sample ? '<span class="ast-sample">Örnek profil</span>' : ''}<span>⏱ ${esc(a.response)}</span></span>
          </div>
        </div>
        <p class="ast-bio">${esc(a.bio)}</p>
        <div class="ast-tags">${a.tags.map((t) => `<span>${esc(t)}</span>`).join('')}</div>
        <div class="ast-card-foot">
          <div class="ast-formats" aria-label="Görüşme türleri">
            ${a.formats.map((f) => `<span title="${A.FORMATS[f].name}">${ico(A.FORMATS[f].icon)}<small>${A.FORMATS[f].name}</small></span>`).join('')}
          </div>
          <button type="button" class="ast-ask" data-ask="${a.id}">Soru sor</button>
        </div>
      </article>`).join('') || '<p class="ast-empty">Bu konu için henüz astrolog yok.</p>';
  }
  $('astroList').addEventListener('click', (e) => {
    const b = e.target.closest('[data-ask]');
    if (b) openAsk(b.dataset.ask);
  });

  // ---------- Soru sorma penceresi ----------
  let askCtx = null;
  function readProfile() {
    try { return JSON.parse(localStorage.getItem('astro-profile') || 'null'); } catch (e) { return null; }
  }

  function renderAskTopics() {
    $('askTopics').innerHTML = A.TOPICS.filter((t) => askCtx.astro.topics.includes(t.id) || t.id === askCtx.topic).map((t) => {
      const on = t.id === askCtx.topic;
      return `<button type="button" class="ask-topic${on ? ' on' : ''}" role="radio" aria-checked="${on}" data-t="${t.id}">${ico(t.icon)}<span>${t.name}</span></button>`;
    }).join('');
    $('askText').placeholder = topicById[askCtx.topic].placeholder;
  }

  function openAsk(id) {
    const astro = astroById[id];
    if (!astro) return;
    askCtx = { astro, topic: topic && astro.topics.includes(topic) ? topic : astro.topics[0] };
    $('askWho').innerHTML = `
      <span class="ast-avatar sm hue-${astro.hue}" aria-hidden="true">${astro.glyph}&#xFE0E;</span>
      <span><small>Soru sor</small><b id="askTitle">${esc(astro.title)}</b></span>`;
    renderAskTopics();

    const p = readProfile();
    $('askBirth').innerHTML = p && p.birthDate
      ? `<div class="birth-ok">${ico('<circle cx="12" cy="8" r="4"/><path d="M4.5 20a7.5 7.5 0 0 1 15 0"/>')}
           <span><b>${esc(p.fullName || 'Doğum bilgilerin')}</b><small>${esc(fmtBirth(p.birthDate))}${p.unknownTime ? ' · saat bilinmiyor' : (p.birthTime ? ' · ' + esc(p.birthTime) : '')}${p.birthPlace ? ' · ' + esc(p.birthPlace) : ''}</small></span>
           <a href="kayit.html">Düzenle</a></div>`
      : `<a class="birth-missing" href="kayit.html">${ico('<circle cx="12" cy="12" r="8.5"/><path d="M12 8v8M8 12h8"/>')}
           <span><b>Doğum bilgilerini ekle</b><small>Daha net bir yorum için tarih, saat ve yer gerekir.</small></span></a>`;

    $('askText').value = '';
    $('askCount').textContent = '0';
    const s = $('askSheet');
    s.hidden = false;
    requestAnimationFrame(() => s.classList.add('open'));
    setTimeout(() => $('askText').focus({ preventScroll: true }), 320);
  }

  function closeAsk() {
    const s = $('askSheet');
    s.classList.remove('open');
    setTimeout(() => { s.hidden = true; }, 260);
  }

  $('askTopics').addEventListener('click', (e) => {
    const b = e.target.closest('[data-t]');
    if (!b) return;
    askCtx.topic = b.dataset.t;
    renderAskTopics();
  });
  $('askText').addEventListener('input', () => { $('askCount').textContent = String($('askText').value.length); });
  $('askClose').addEventListener('click', closeAsk);
  $('askSheet').addEventListener('click', (e) => { if (e.target.id === 'askSheet') closeAsk(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('askSheet').hidden) closeAsk(); });

  $('askForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const text = $('askText').value.trim();
    if (text.length < 10) {
      $('askText').classList.add('invalid');
      $('askText').focus();
      toast('Sorunu biraz daha ayrıntılı yazar mısın?');
      setTimeout(() => $('askText').classList.remove('invalid'), 1200);
      return;
    }
    const p = readProfile();
    const items = readQuestions();
    items.unshift({
      id: `q${Date.now()}`,
      astrologerId: askCtx.astro.id,
      astrologer: askCtx.astro.title,
      topicId: askCtx.topic,
      topic: topicById[askCtx.topic].name,
      text,
      createdAt: new Date().toISOString(),
      status: 'bekliyor',
      birth: p && p.birthDate ? { date: p.birthDate, time: p.unknownTime ? null : p.birthTime || null, place: p.birthPlace || null } : null
    });
    try { localStorage.setItem(Q_KEY, JSON.stringify(items)); } catch (err) {}
    closeAsk();
    renderQuestions();
    toast('Sorun kaydedildi.');
    setTimeout(() => $('myqTitle').scrollIntoView({ behavior: 'smooth', block: 'start' }), 300);
  });

  // ---------- Sorularım ----------
  function readQuestions() {
    try { return JSON.parse(localStorage.getItem(Q_KEY) || '[]') || []; } catch (e) { return []; }
  }
  function when(q) {
    if (!q.createdAt) return q.date || '';
    const d = new Date(q.createdAt);
    const days = Math.floor((Date.now() - d) / 864e5);
    if (days <= 0) return 'Bugün';
    if (days === 1) return 'Dün';
    return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
  }
  let confirmId = null;
  function renderQuestions() {
    const items = readQuestions();
    $('qCount').textContent = items.length ? String(items.length) : '';
    if (!items.length) {
      $('questionList').innerHTML = `<div class="ast-q-empty glass">${ico('<path d="M20.5 11.6c0 4.3-3.8 7.6-8.5 7.6-1.2 0-2.3-.2-3.3-.6L4 20l1.2-3.6a7.2 7.2 0 0 1-1.7-4.8C3.5 7.3 7.3 4 12 4s8.5 3.3 8.5 7.6z"/>')}<p>Henüz bir sorun yok. Yukarıdan bir astrolog seçip ilk sorunu yazabilirsin.</p></div>`;
      return;
    }
    $('questionList').innerHTML = items.map((q, i) => {
      const id = q.id || `old-${i}`;
      const t = topicById[q.topicId];
      return `<article class="ast-q glass">
        <div class="ast-q-top">
          <span class="ast-q-topic">${t ? ico(t.icon) : ''}${esc(q.topic || 'Soru')}</span>
          <span class="ast-q-date">${esc(when(q))}</span>
        </div>
        <p class="ast-q-text">${esc(q.text)}</p>
        <div class="ast-q-foot">
          <span class="ast-q-to">${esc(q.astrologer || '')}</span>
          <span class="ast-q-status">Hizmet açılınca gönderilecek</span>
          <button type="button" class="ast-q-del${confirmId === id ? ' confirm' : ''}" data-del="${id}" aria-label="Soruyu sil">${confirmId === id ? 'Silinsin mi?' : ico('<path d="M5 7h14M10 7V5h4v2M7 7l1 12h8l1-12"/>')}</button>
        </div>
      </article>`;
    }).join('');
  }
  $('questionList').addEventListener('click', (e) => {
    const b = e.target.closest('[data-del]');
    if (!b) return;
    const id = b.dataset.del;
    if (confirmId !== id) {
      confirmId = id;
      renderQuestions();
      setTimeout(() => { if (confirmId === id) { confirmId = null; renderQuestions(); } }, 3500);
      return;
    }
    const items = readQuestions().filter((q, i) => (q.id || `old-${i}`) !== id);
    try { localStorage.setItem(Q_KEY, JSON.stringify(items)); } catch (err) {}
    confirmId = null;
    renderQuestions();
    toast('Soru silindi.');
  });

  // ---------- Pro ilgisi ----------
  function renderPro() {
    let on = false;
    try { on = !!localStorage.getItem(PRO_KEY); } catch (e) {}
    const b = $('proBtn');
    b.textContent = on ? 'İlgini kaydettik ✓' : 'İlgileniyorum';
    b.disabled = on;
  }
  $('proBtn').addEventListener('click', () => {
    try { localStorage.setItem(PRO_KEY, new Date().toISOString()); } catch (e) {}
    renderPro();
    toast('Teşekkürler! Pro açıldığında uygulamada göreceksin.');
  });

  renderTopics();
  renderList();
  renderQuestions();
  renderPro();
})();
