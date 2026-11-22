// ===== device.js — luna.gram: alarm, takvime ekleme ve bildirim balonu =====
// Android uygulamasında yerel LunaAlarm eklentisini (plugins/luna-alarm),
// tarayıcıda .ics takvim dosyasını kullanır. Tüm sayfalar ortak kullanır.
(function () {
  'use strict';

  const Cap = window.Capacitor;
  const isNative = !!(Cap && typeof Cap.isNativePlatform === 'function' && Cap.isNativePlatform());
  const DAY = 864e5;
  const ALARM_WINDOW_MS = 23.9 * 3600 * 1000;

  // ---------- Biçimlendirme (İstanbul saati, sabit UTC+3) ----------
  const AY = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
  const GUN = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
  const GUN_KISA = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];
  const ist = (d) => new Date(d.getTime() + 3 * 3600 * 1000);
  const pad = (n) => String(n).padStart(2, '0');
  const clock = (d) => { const x = ist(d); return `${pad(x.getUTCHours())}:${pad(x.getUTCMinutes())}`; };
  const dayKey = (d) => { const x = ist(d); return `${x.getUTCFullYear()}-${pad(x.getUTCMonth() + 1)}-${pad(x.getUTCDate())}`; };
  const startOfDay = (d) => { const x = ist(d); return Date.UTC(x.getUTCFullYear(), x.getUTCMonth(), x.getUTCDate()); };
  function dayLabel(d, now = new Date()) {
    const x = ist(d);
    if (dayKey(d) === dayKey(now)) return 'Bugün';
    if (dayKey(d) === dayKey(new Date(now.getTime() + DAY))) return 'Yarın';
    return `${x.getUTCDate()} ${AY[x.getUTCMonth()].slice(0, 3)} ${GUN_KISA[x.getUTCDay()]}`;
  }
  function longDate(d) {
    const x = ist(d);
    return `${x.getUTCDate()} ${AY[x.getUTCMonth()]} ${x.getUTCFullYear()}, ${GUN[x.getUTCDay()]}`;
  }
  function duration(ms) {
    const t = Math.max(0, Math.round(ms / 60000));
    const d = Math.floor(t / 1440), h = Math.floor((t % 1440) / 60), m = t % 60;
    if (d > 0) return `${d} g ${h} sa`;
    if (h > 0) return m ? `${h} sa ${m} dk` : `${h} sa`;
    return `${m} dk`;
  }
  function relDays(d, now = new Date()) {
    const n = Math.round((startOfDay(d) - startOfDay(now)) / DAY);
    if (n <= 0) return 'Bugün';
    if (n === 1) return 'Yarın';
    return `${n} gün sonra`;
  }

  // ---------- Yerel eklenti ----------
  let plugin = null;
  function getPlugin() {
    if (!isNative) return null;
    if (!plugin) {
      try {
        plugin = typeof Cap.registerPlugin === 'function' ? Cap.registerPlugin('LunaAlarm') : (Cap.Plugins && Cap.Plugins.LunaAlarm);
      } catch (e) {
        plugin = (Cap.Plugins && Cap.Plugins.LunaAlarm) || null;
      }
    }
    return plugin;
  }

  // ---------- Bildirim balonu ----------
  let toastTimer;
  function toast(msg) {
    let t = document.getElementById('toast');
    if (!t) {
      t = document.createElement('div');
      t.id = 'toast';
      t.className = 'toast';
      t.setAttribute('role', 'status');
      t.setAttribute('aria-live', 'polite');
      t.hidden = true;
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.hidden = false;
    requestAnimationFrame(() => t.classList.add('show'));
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      t.classList.remove('show');
      setTimeout(() => { t.hidden = true; }, 300);
    }, 3200);
  }

  // ---------- Alarm & takvim ----------
  async function setClockAlarm(date, title) {
    const p = getPlugin();
    if (!p) throw new Error('Alarm yalnızca telefon uygulamasında kurulabilir');
    // Alarm telefonun kendi saat dilimine göre kurulur
    await p.setAlarm({ hour: date.getHours(), minute: date.getMinutes(), message: `luna.gram · ${title}`, skipUi: true });
  }

  // opts: { begin: Date, end?: Date, title, body, allDay? }
  async function addToCalendar(opts) {
    const begin = opts.begin;
    const allDay = !!opts.allDay;
    const end = opts.end || new Date(begin.getTime() + (allDay ? DAY : 30 * 60000));
    const p = getPlugin();
    if (p) {
      const b = allDay ? startOfDay(begin) : begin.getTime();
      const e = allDay ? b + DAY : end.getTime();
      await p.addCalendarEvent({ begin: b, end: e, title: opts.title, description: opts.body || '', allDay });
      return 'native';
    }
    const stamp = (d) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    const dateOnly = (ms) => new Date(ms).toISOString().slice(0, 10).replace(/-/g, '');
    const esc = (s) => String(s || '').replace(/[\\;,]/g, (m) => '\\' + m).replace(/\n/g, '\\n');
    const lines = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//luna.gram//TR', 'CALSCALE:GREGORIAN',
      'BEGIN:VEVENT',
      `UID:${begin.getTime()}-${Math.random().toString(36).slice(2, 8)}@luna.gram`,
      `DTSTAMP:${stamp(new Date())}`
    ];
    if (allDay) {
      lines.push(`DTSTART;VALUE=DATE:${dateOnly(startOfDay(begin))}`, `DTEND;VALUE=DATE:${dateOnly(startOfDay(begin) + DAY)}`);
    } else {
      lines.push(`DTSTART:${stamp(begin)}`, `DTEND:${stamp(end)}`);
    }
    lines.push(`SUMMARY:${esc(opts.title)}`, `DESCRIPTION:${esc(opts.body)}`);
    if (!allDay) {
      lines.push('BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${esc(opts.title)}`, 'TRIGGER:PT0M', 'END:VALARM');
    }
    lines.push('END:VEVENT', 'END:VCALENDAR');
    const url = URL.createObjectURL(new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `luna-gram-${dayKey(begin)}.ics`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    return 'ics';
  }

  // ---------- Alarm seçenekleri penceresi ----------
  let sheetCtx = null;
  function ensureSheet() {
    let s = document.getElementById('alarmSheet');
    if (s) return s;
    s = document.createElement('div');
    s.className = 'sheet-backdrop';
    s.id = 'alarmSheet';
    s.hidden = true;
    s.innerHTML = `
      <div class="sheet glass" role="dialog" aria-modal="true" aria-labelledby="alarmSheetTitle">
        <span class="sheet-grip" aria-hidden="true"></span>
        <p class="sheet-kicker" id="alarmSheetKicker"></p>
        <h3 class="sheet-title" id="alarmSheetTitle"></h3>
        <p class="sheet-when" id="alarmSheetWhen"></p>
        <p class="sheet-note" id="alarmSheetNote"></p>
        <div class="sheet-actions">
          <button type="button" class="sheet-btn sheet-btn--primary" id="alarmSheetAlarm">Saat uygulamasına alarm kur</button>
          <button type="button" class="sheet-btn" id="alarmSheetCalendar">Takvime alarmlı hatırlatıcı ekle</button>
          <button type="button" class="sheet-btn sheet-btn--ghost" id="alarmSheetClose">Vazgeç</button>
        </div>
      </div>`;
    document.body.appendChild(s);
    s.addEventListener('click', (e) => { if (e.target === s) closeSheet(); });
    s.querySelector('#alarmSheetClose').addEventListener('click', closeSheet);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !s.hidden) closeSheet(); });
    s.querySelector('#alarmSheetAlarm').addEventListener('click', async () => {
      if (!sheetCtx) return;
      try {
        await setClockAlarm(sheetCtx.date, sheetCtx.title);
        closeSheet();
        toast(`⏰ Alarm kuruldu: ${clock(sheetCtx.date)}`);
      } catch (e) { toast('Alarm kurulamadı.'); }
    });
    s.querySelector('#alarmSheetCalendar').addEventListener('click', async () => {
      if (!sheetCtx) return;
      try {
        const how = await addToCalendar({ begin: sheetCtx.date, end: new Date(sheetCtx.date.getTime() + 15 * 60000), title: `🌙 ${sheetCtx.title}`, body: sheetCtx.body });
        closeSheet();
        toast(how === 'native' ? 'Takvim açıldı; kaydetmeyi unutma.' : 'Takvim dosyası indirildi.');
      } catch (e) { toast('Takvim açılamadı.'); }
    });
    return s;
  }

  function openSheet(ctx, note) {
    const s = ensureSheet();
    const now = new Date();
    sheetCtx = ctx;
    s.querySelector('#alarmSheetKicker').textContent = ctx.kicker || 'Hatırlatıcı';
    s.querySelector('#alarmSheetTitle').textContent = `${dayLabel(ctx.date, now)}, ${clock(ctx.date)}`;
    const rel = relDays(ctx.date, now);
    s.querySelector('#alarmSheetWhen').textContent = `${longDate(ctx.date)} · ${rel === 'Bugün' ? duration(ctx.date - now) + ' sonra' : rel}`;

    const btn = s.querySelector('#alarmSheetAlarm');
    const noteEl = s.querySelector('#alarmSheetNote');
    const within = ctx.date - now < ALARM_WINDOW_MS;
    if (!isNative) {
      btn.hidden = true;
      noteEl.textContent = note || 'Saat uygulamasına alarm, luna.gram telefon uygulamasında kurulur. Buradan takvimine alarmlı bir hatırlatıcı ekleyebilirsin.';
    } else if (!within) {
      btn.hidden = false;
      btn.disabled = true;
      btn.textContent = '24 saat kala alarm kurulabilir';
      noteEl.textContent = note || 'Telefonun saat uygulaması alarmları tarih değil yalnızca saat olarak tutar; bu an 24 saatten uzak olduğu için alarm yanlış gün çalar. Şimdilik takvime tam tarihli, alarmlı bir hatırlatıcı ekle.';
    } else {
      btn.hidden = false;
      btn.disabled = false;
      btn.textContent = 'Saat uygulamasına alarm kur';
      noteEl.textContent = note || '';
    }
    s.hidden = false;
    requestAnimationFrame(() => s.classList.add('open'));
  }

  function closeSheet() {
    const s = document.getElementById('alarmSheet');
    if (!s) return;
    s.classList.remove('open');
    setTimeout(() => { s.hidden = true; }, 260);
  }

  // Ana akış: 24 saat içindeyse doğrudan saat uygulamasına, değilse seçenekler.
  // ctx: { date, title, body, kicker }
  async function alarmFlow(ctx) {
    const now = new Date();
    if (ctx.date <= now) { toast('Bu an geçti.'); return; }
    if (isNative && ctx.date - now < ALARM_WINDOW_MS && getPlugin()) {
      try {
        await setClockAlarm(ctx.date, ctx.title);
        toast(`⏰ Alarm kuruldu: ${dayLabel(ctx.date, now)} ${clock(ctx.date)}`);
      } catch (e) {
        openSheet(ctx, 'Saat uygulaması açılamadı. Takvime alarmlı hatırlatıcı ekleyebilirsin.');
      }
      return;
    }
    openSheet(ctx);
  }

  window.LunaDevice = {
    isNative, toast, setClockAlarm, addToCalendar, alarmFlow, closeSheet,
    fmt: { clock, dayKey, dayLabel, longDate, duration, relDays, startOfDay, AY, GUN, GUN_KISA }
  };
})();
