'use strict';

// Sozlamalar sahifasi mantiqiyati: 6 bo'lim (hisob, ko'rinish, o'qish, bildirishnomalar, yuklab olish, xavfsizlik)
(function () {
  const LOCAL = {
    readerMode: 'edk_reader_mode',
    readerContinue: 'edk_reader_continue',
    readerOrient: 'edk_reader_orient',
    wifiOnly: 'edk_wifi_only'
  };

  function localBool(key, def) {
    try {
      const v = localStorage.getItem(key);
      return v === null ? def : v === '1';
    } catch (_) { return def; }
  }

  function setLocal(key, value) {
    try { localStorage.setItem(key, value ? '1' : '0'); } catch (_) { /* noop */ }
  }

  const $ = (id) => document.getElementById(id);

  // ---- Bo'limlar menyusi (scroll kuzatuvi) ----
  function initNav() {
    const nav = document.querySelector('.settings-nav');
    if (!nav) return;
    const links = [...nav.querySelectorAll('a')];
    nav.addEventListener('click', () => {
      links.forEach((a) => a.classList.remove('active'));
    });
    const sections = links
      .map((a) => document.querySelector(a.getAttribute('href')))
      .filter(Boolean);
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            links.forEach((a) => a.classList.toggle('active', a.getAttribute('href') === '#' + entry.target.id));
          }
        });
      },
      { rootMargin: '-30% 0px -60% 0px' }
    );
    sections.forEach((s) => observer.observe(s));
  }

  // ---- Yig'iluvchi formalar ----
  function initCollapse() {
    document.querySelectorAll('[data-collapse]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const form = $(btn.dataset.collapse);
        if (!form) return;
        form.classList.toggle('hidden');
        btn.innerHTML = form.classList.contains('hidden')
          ? '<i class="fa-solid fa-pen" aria-hidden="true"></i> Tahrirlash'
          : '<i class="fa-solid fa-eye-slash" aria-hidden="true"></i> Yopish';
        if (!form.classList.contains('hidden')) {
          const first = form.querySelector('input:not([disabled])');
          if (first) first.focus();
        }
      });
    });
  }

  // ---- 1: Hisob va profil ----
  async function loadProfile() {
    try {
      const { user } = await API.get('/api/account/profile');
      $('profile-name').value = user.fullName;
      $('profile-email').value = user.email;
      if (user.tgUsername) {
        $('tg-username').value = user.tgUsername;
        const badge = $('tg-status');
        badge.textContent = '@' + user.tgUsername;
        badge.className = 'status-badge green';
      }
    } catch (err) {
      App.toast(err.message, 'error');
    }
  }

  function initProfile() {
    $('profile-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        await API.patch('/api/account/profile', { fullName: $('profile-name').value });
        App.toast('Profil saqlandi', 'success');
        await App.loadUser();
      } catch (err) {
        App.toast(err.message, 'error');
      }
    });

    $('password-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const current = $('pass-current').value;
      const next = $('pass-new').value;
      if (next !== $('pass-repeat').value) {
        App.toast('Yangi parollar mos kelmadi', 'error');
        return;
      }
      try {
        await API.post('/api/account/password', { currentPassword: current, newPassword: next });
        App.toast('Parol yangilandi. Boshqa qurilmalar chiqarib yuborildi', 'success');
        $('pass-current').value = '';
        $('pass-new').value = '';
        $('pass-repeat').value = '';
        renderSessions();
      } catch (err) {
        App.toast(err.message, 'error');
      }
    });

    $('telegram-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        const { username } = await API.put('/api/account/telegram', { username: $('tg-username').value });
        $('tg-username').value = username;
        const badge = $('tg-status');
        badge.textContent = '@' + username;
        badge.className = 'status-badge green';
        App.toast('Telegram ulandi', 'success');
      } catch (err) {
        App.toast(err.message, 'error');
      }
    });

    $('tg-unlink').addEventListener('click', async () => {
      try {
        await API.del('/api/account/telegram');
        $('tg-username').value = '';
        const badge = $('tg-status');
        badge.textContent = 'Ulanmagan';
        badge.className = 'status-badge gray';
        App.toast('Telegram uzildi', 'success');
      } catch (err) {
        App.toast(err.message, 'error');
      }
    });

    $('logout-btn').addEventListener('click', async () => {
      try {
        await API.post('/api/auth/logout');
        location.href = '/index.html';
      } catch (err) {
        App.toast(err.message, 'error');
      }
    });
  }

  // ---- 2: Tashqi ko'rinish ----
  function initAppearance() {
    const darkSwitch = $('dark-switch');
    darkSwitch.checked = document.documentElement.getAttribute('data-theme') === 'dark';
    darkSwitch.addEventListener('change', () => {
      const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
      if (darkSwitch.checked !== isDark) window.ThemeToggle();
    });

    const seg = $('text-size-seg');
    const markActive = () => {
      const cur = String(window.TextSize.current());
      seg.querySelectorAll('button').forEach((b) => b.classList.toggle('active', b.dataset.size === cur));
    };
    markActive();
    seg.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-size]');
      if (!btn) return;
      window.TextSize.set(btn.dataset.size);
      markActive();
    });
  }

  // ---- 3: Kitob o'qish ----
  function initReading() {
    const mode = $('reader-mode');
    try {
      const saved = localStorage.getItem(LOCAL.readerMode);
      if (saved === 'page' || saved === 'width') mode.value = saved;
    } catch (_) { /* noop */ }
    mode.addEventListener('change', () => {
      try { localStorage.setItem(LOCAL.readerMode, mode.value); } catch (_) { /* noop */ }
      App.toast('O‘qish rejimi saqlandi', 'success');
    });

    const cont = $('reader-continue');
    cont.checked = localBool(LOCAL.readerContinue, true);
    cont.addEventListener('change', () => setLocal(LOCAL.readerContinue, cont.checked));

    const orient = $('reader-orient');
    orient.checked = localBool(LOCAL.readerOrient, true);
    orient.addEventListener('change', () => setLocal(LOCAL.readerOrient, orient.checked));
  }

  // ---- 4: Bildirishnomalar (serverda saqlanadi) ----
  const PREF_MAP = [
    ['pref-new-books', 'notify_new_books'],
    ['pref-tests', 'notify_tests'],
    ['pref-reminders', 'notify_reminders']
  ];

  async function loadNotificationPrefs() {
    try {
      const { preferences } = await API.get('/api/account/preferences');
      for (const [elId, key] of PREF_MAP) $(elId).checked = preferences[key] === '1';
    } catch (err) {
      App.toast(err.message, 'error');
    }
  }

  function initNotifications() {
    for (const [elId, key] of PREF_MAP) {
      $(elId).addEventListener('change', async () => {
        try {
          await API.put('/api/account/preferences', { [key]: $(elId).checked ? '1' : '0' });
          App.toast('Bildirishnoma sozlamasi saqlandi', 'success');
        } catch (err) {
          $(elId).checked = !$(elId).checked;
          App.toast(err.message, 'error');
        }
      });
    }
  }

  // ---- 5: Yuklab olish ----
  async function loadDownloads() {
    const summary = $('downloads-summary');
    const list = $('downloads-list');
    try {
      const { items } = await API.get('/api/account/downloads');
      const totalSize = items.reduce((acc, d) => acc + (d.file_size || 0), 0);
      summary.textContent = items.length
        ? `Jami ${items.length} marta yuklab olingan (${App.fmtBytes(totalSize)})`
        : 'Hozircha hech narsa yuklab olinmagan';
      list.innerHTML = items.slice(0, 8).map((d) => `
        <div class="download-item">
          <span class="dl-icon"><i class="fa-solid fa-file-pdf" aria-hidden="true"></i></span>
          <div class="dl-body">
            <div class="dl-title"><a href="/book.html?id=${encodeURIComponent(d.book_id)}">${App.escapeHtml(d.title)}</a></div>
            <div class="dl-meta">${App.fmtDate(d.created_at)} · ${App.fmtBytes(d.file_size)}</div>
          </div>
        </div>`).join('');
    } catch (err) {
      summary.textContent = 'Yuklab olishlar ro‘yxatini olishda xato';
      App.toast(err.message, 'error');
    }
  }

  function initWifiOnly() {
    const sw = $('wifi-only');
    sw.checked = localBool(LOCAL.wifiOnly, false);
    sw.addEventListener('change', () => {
      setLocal(LOCAL.wifiOnly, sw.checked);
      App.toast(sw.checked ? 'Faqat Wi-Fi rejimi yoqildi' : 'Faqat Wi-Fi rejimi o‘chirildi', 'success');
    });
  }

  async function initCache() {
    const info = $('cache-info');
    const update = async () => {
      let text = 'Brauzer keshida saqlangan fayllar.';
      try {
        if (navigator.storage && navigator.storage.estimate) {
          const est = await navigator.storage.estimate();
          if (est.usage != null) text = `Kesh hajmi: taxminan ${App.fmtBytes(est.usage)}`;
        }
      } catch (_) { /* noop */ }
      info.textContent = text;
    };
    await update();

    $('cache-clear').addEventListener('click', async () => {
      try {
        if (window.caches) {
          const names = await caches.keys();
          await Promise.all(names.map((n) => caches.delete(n)));
        }
        App.toast('Kesh tozalandi', 'success');
      } catch (_) {
        App.toast('Keshni tozalashda xato', 'error');
      }
      await update();
    });
  }

  // ---- 6: Xavfsizlik ----
  function describeDevice(ua) {
    const s = ua || '';
    const os = /Windows/.test(s) ? 'Windows'
      : /Android/.test(s) ? 'Android'
      : /iPhone|iPad|iOS/.test(s) ? 'iOS'
      : /Mac OS X/.test(s) ? 'macOS'
      : /Linux/.test(s) ? 'Linux' : 'Qurilma';
    const browser = /Edg\//.test(s) ? 'Edge'
      : /OPR\//.test(s) ? 'Opera'
      : /Chrome\//.test(s) ? 'Chrome'
      : /Safari\//.test(s) ? 'Safari'
      : /Firefox\//.test(s) ? 'Firefox' : 'Brauzer';
    const icon = /Mobile|Android|iPhone/.test(s) ? 'fa-mobile-screen' : 'fa-laptop';
    return { name: `${os} · ${browser}`, icon };
  }

  async function renderSessions() {
    const list = $('sessions-list');
    try {
      const { items } = await API.get('/api/account/sessions');
      if (!items.length) {
        list.innerHTML = '<p class="muted">Faol sessiya topilmadi</p>';
        return;
      }
      list.innerHTML = items.map((s) => {
        const dev = describeDevice(s.userAgent);
        return `
          <div class="session-item ${s.isCurrent ? 'current' : ''}">
            <span class="s-icon"><i class="fa-solid ${dev.icon}" aria-hidden="true"></i></span>
            <div class="s-body">
              <div class="s-name">
                ${App.escapeHtml(dev.name)}
                ${s.isCurrent ? '<span class="status-badge blue">Joriy qurilma</span>' : ''}
              </div>
              <div class="s-meta">${s.ip ? App.escapeHtml(s.ip) + ' · ' : ''}Kirgan: ${App.fmtDateTime(s.createdAt)}</div>
            </div>
            ${s.isCurrent ? '' : `<button class="s-close" type="button" data-session="${s.id}" title="Sessiyani yopish" aria-label="Sessiyani yopish"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button>`}
          </div>`;
      }).join('');
      list.querySelectorAll('[data-session]').forEach((btn) => {
        btn.addEventListener('click', async () => {
          try {
            await API.del('/api/account/sessions/' + btn.dataset.session);
            App.toast('Sessiya yopildi', 'success');
            renderSessions();
          } catch (err) {
            App.toast(err.message, 'error');
          }
        });
      });
    } catch (err) {
      list.innerHTML = '<p class="muted">Sessiyalarni olishda xato</p>';
    }
  }

  function initSecurity() {
    $('revoke-others').addEventListener('click', async () => {
      try {
        const res = await API.del('/api/account/sessions/others');
        App.toast(`${res.revoked} sessiya yopildi`, 'success');
        renderSessions();
      } catch (err) {
        App.toast(err.message, 'error');
      }
    });

    // Hisobni o'chirish modali — 5 soniyalik himoyalangan kechiktirish
    const modal = $('delete-modal');
    const confirmBtn = $('delete-confirm');
    let timer = null;
    let left = 5;

    function openModal() {
      modal.classList.remove('hidden');
      left = 5;
      confirmBtn.disabled = true;
      $('delete-password').value = '';
      $('delete-error').classList.add('hidden');
      tick();
      timer = setInterval(tick, 1000);
      $('delete-password').focus();
    }
    function tick() {
      $('delete-countdown').textContent = left;
      $('delete-confirm-countdown').textContent = left;
      if (left <= 0) {
        clearInterval(timer);
        timer = null;
        confirmBtn.disabled = false;
        confirmBtn.innerHTML = '<i class="fa-solid fa-trash-can" aria-hidden="true"></i> Hisobni o‘chirish';
      }
      left -= 1;
    }
    function closeModal() {
      modal.classList.add('hidden');
      if (timer) { clearInterval(timer); timer = null; }
    }

    $('delete-account-btn').addEventListener('click', openModal);
    $('delete-cancel').addEventListener('click', closeModal);
    $('delete-modal-x').addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });

    confirmBtn.addEventListener('click', async () => {
      const pass = $('delete-password').value;
      if (!pass) {
        const errBox = $('delete-error');
        errBox.textContent = 'Parolni kiriting';
        errBox.classList.remove('hidden');
        return;
      }
      try {
        await API.del('/api/account', { password: pass });
        location.href = '/index.html';
      } catch (err) {
        const errBox = $('delete-error');
        errBox.textContent = err.message;
        errBox.classList.remove('hidden');
      }
    });
  }

  // ---- Ishga tushirish ----
  document.addEventListener('DOMContentLoaded', async () => {
    const user = await App.requireRolePage();
    if (!user) return;
    initNav();
    initCollapse();
    initProfile();
    initAppearance();
    initReading();
    initNotifications();
    initWifiOnly();
    initCache();
    initSecurity();
    loadProfile();
    loadNotificationPrefs();
    loadDownloads();
    renderSessions();
  });
})();
