'use strict';

(function () {
  async function init() {
    const user = await App.requireRolePage('student', 'teacher', 'admin');
    if (!user) return;
    document.getElementById('hello').textContent = `Assalomu alaykum, ${user.fullName}!`;
    if (user.role === 'teacher') {
      const firstCard = document.querySelector('.admin-card');
      firstCard.insertAdjacentHTML('beforebegin',
        `<div class="form-success" style="margin:0 0 18px">Siz o‘qituvchi sifatida kirdingiz. Testlarni boshqarish uchun <a href="/teacher.html">o‘qituvchi kabinetiga</a> o‘ting.</div>`);
    }
    loadContinue();
    loadFavorites();
    loadAttempts();
    bindJoin();
  }

  function bindJoin() {
    const input = document.getElementById('test-code');
    const btn = document.getElementById('join-btn');
    const info = document.getElementById('join-info');

    async function join() {
      const code = input.value.trim().toUpperCase();
      if (!code) return App.toast('Test kodini kiriting', 'error');
      info.innerHTML = '<div class="spinner"></div>';
      try {
        const data = await API.post('/api/tests/join', { code });
        const t = data.test;
        if (data.canStart) {
          info.innerHTML = `
            <div class="form-success">
              <b>${App.escapeHtml(t.title)}</b><br>
              ${t.timeLimitMinutes ? `Vaqt: ${t.timeLimitMinutes} daqiqa. ` : 'Vaqt cheklovi yo‘q. '}
              Urinishlar: ${t.attemptsLeft} / ${t.maxAttempts}
              <div style="margin-top:12px"><button class="btn btn-primary" id="start-test">Testni boshlash</button></div>
            </div>`;
          document.getElementById('start-test').addEventListener('click', async () => {
            try {
              const started = await API.post(`/api/tests/${t.id}/start`);
              location.href = `/test.html?attempt=${started.attemptId}`;
            } catch (err) {
              App.toast(err.message, 'error');
            }
          });
        } else {
          info.innerHTML = `<div class="form-error"><b>${App.escapeHtml(t.title)}</b><br>${App.escapeHtml(data.reason || 'Hozircha ochilmagan')}</div>`;
        }
      } catch (err) {
        info.innerHTML = `<div class="form-error">${App.escapeHtml(err.message)}</div>`;
      }
    }
    btn.addEventListener('click', join);
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') join(); });
  }

  async function loadContinue() {
    const el = document.getElementById('continue-list');
    try {
      const data = await API.get('/api/me/progress');
      if (!data.items.length) {
        el.innerHTML = '<p class="muted" style="margin:0">Hozircha o‘qilgan kitob yo‘q. <a href="/library.html">Kutubxonadan boshlang</a>.</p>';
        return;
      }
      el.innerHTML = data.items.map((row) => `
        <article class="book-card">
          <div class="book-body">
            <h3 class="book-title"><a href="/reader.html?id=${row.slug}" style="color:inherit">${App.escapeHtml(row.title)}</a></h3>
            <div class="book-meta">${row.class_number ? row.class_number + '-sinf · ' : ''}${App.escapeHtml(row.subject_name || '')}</div>
            <div class="book-meta">Oxirgi sahifa: <b>${row.last_page}</b> / ${row.page_count || '—'}</div>
            <a class="btn btn-primary btn-sm" href="/reader.html?id=${row.slug}&page=${row.last_page}">Davom ettirish</a>
          </div>
        </article>`).join('');
    } catch (err) {
      el.innerHTML = `<p class="muted">${App.escapeHtml(err.message)}</p>`;
    }
  }

  async function loadFavorites() {
    const el = document.getElementById('favorites-list');
    try {
      const data = await API.get('/api/me/favorites');
      App.renderBooks(el, data.items, { showFav: true });
    } catch (err) {
      el.innerHTML = `<p class="muted">${App.escapeHtml(err.message)}</p>`;
    }
  }

  async function loadAttempts() {
    const tbody = document.querySelector('#attempts-table tbody');
    try {
      const data = await API.get('/api/me/attempts');
      if (!data.items.length) {
        tbody.innerHTML = '<tr><td colspan="6" class="muted">Hozircha test topshirilmagan. Yuqorida kod kiriting.</td></tr>';
        return;
      }
      tbody.innerHTML = data.items.map((a) => {
        const statusBadge = {
          active: '<span class="status-badge blue">Davom etmoqda</span>',
          submitted: '<span class="status-badge green">Topshirilgan</span>',
          expired: '<span class="status-badge red">Vaqt tugadi</span>'
        }[a.status];
        const result = a.status === 'submitted'
          ? (a.show_results === 'never'
            ? '<span class="muted">Yashirilgan</span>'
            : `<b>${a.score}</b> / ${a.max_score} (${a.percent}%)`)
          : '—';
        const action = a.status === 'active'
          ? `<a class="btn btn-sm btn-primary" href="/test.html?attempt=${a.id}">Davom etish</a>`
          : a.status === 'submitted'
            ? `<a class="btn btn-sm btn-outline" href="/result.html?attempt=${a.id}">Ko‘rish</a>`
            : '';
        return `<tr>
          <td>${App.escapeHtml(a.test_title)}</td>
          <td class="nowrap">${App.fmtDateTime(a.started_at)}</td>
          <td>${statusBadge}</td>
          <td>${result}</td>
          <td class="nowrap">${a.time_spent_seconds ? App.fmtDuration(a.time_spent_seconds) : '—'}</td>
          <td class="text-right">${action}</td>
        </tr>`;
      }).join('');
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="6" class="muted">${App.escapeHtml(err.message)}</td></tr>`;
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();
