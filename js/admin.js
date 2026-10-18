'use strict';

// Admin panel umumiy mantiq: ruxsat tekshiruvi, sidebar, chiqish
const Admin = {
  user: null,

  async require() {
    try {
      const data = await API.get('/api/admin/me');
      this.user = data.user;
    } catch (_) {
      location.href = '/admin/login.html?next=' + encodeURIComponent(location.pathname + location.search);
      return null;
    }
    const nameEl = document.getElementById('admin-user-name');
    if (nameEl) nameEl.textContent = this.user.fullName;

    const logoutBtn = document.getElementById('admin-logout');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', async () => {
        try { await API.post('/api/admin/logout'); } catch (_) { /* ignore */ }
        location.href = '/admin/login.html';
      });
    }

    const toggle = document.getElementById('admin-menu-toggle');
    const sidebar = document.getElementById('admin-sidebar');
    if (toggle && sidebar) {
      toggle.addEventListener('click', (e) => {
        e.stopPropagation();
        sidebar.classList.toggle('open');
      });
      document.addEventListener('click', (e) => {
        if (!sidebar.contains(e.target) && !toggle.contains(e.target)) sidebar.classList.remove('open');
      });
    }

    const here = location.pathname;
    document.querySelectorAll('#admin-sidebar a').forEach((a) => {
      if (a.getAttribute('href') === here) a.classList.add('active');
    });
    return this.user;
  },

  roleBadge(role) {
    return `<span class="role-badge ${App.escapeHtml(role)}">${App.roleLabel(role)}</span>`;
  },

  statusBadge(status) {
    return status === 'active'
      ? '<span class="status-badge green">Faol</span>'
      : '<span class="status-badge red">Bloklangan</span>';
  },

  auditLabels: {
    book_create: 'Kitob qo‘shildi', book_update: 'Kitob tahrirlandi', book_delete: 'Kitob o‘chirildi',
    book_publish: 'Kitob nashr etildi', book_hide: 'Kitob yashirildi',
    book_bulk_upload: 'Ommaviy PDF yuklash', books_import: 'CSV/Excel import',
    category_create: 'Tur qo‘shildi', category_update: 'Tur tahrirlandi', category_delete: 'Tur o‘chirildi',
    subject_create: 'Fan qo‘shildi', subject_update: 'Fan tahrirlandi', subject_delete: 'Fan o‘chirildi',
    language_create: 'Til qo‘shildi',
    user_create: 'Foydalanuvchi qo‘shildi', user_update: 'Foydalanuvchi tahrirlandi', user_delete: 'Foydalanuvchi o‘chirildi',
    test_create: 'Test yaratildi', test_update: 'Test tahrirlandi', test_delete: 'Test o‘chirildi',
    test_status: 'Test holati o‘zgardi', test_code_regenerate: 'Test kodi yangilandi',
    settings_update: 'Sozlamalar yangilandi', language_delete: 'Til o‘chirildi'
  },

  auditLabel(action) {
    return this.auditLabels[action] || action;
  },

  auditDetails(a) {
    if (!a.details) return '';
    try {
      const obj = typeof a.details === 'string' ? JSON.parse(a.details) : a.details;
      const s = JSON.stringify(obj);
      return s.length > 120 ? s.slice(0, 117) + '...' : s;
    } catch (_) {
      return String(a.details).slice(0, 120);
    }
  },

  pager(container, { page, perPage, total, onPage }) {
    const pages = Math.max(1, Math.ceil(total / perPage));
    if (pages <= 1) { container.innerHTML = ''; return; }
    const parts = [];
    parts.push(`<button class="btn btn-sm btn-outline" data-p="${page - 1}" ${page <= 1 ? 'disabled' : ''}>←</button>`);
    const from = Math.max(1, page - 2);
    const to = Math.min(pages, from + 4);
    for (let p = from; p <= to; p++) {
      parts.push(`<button class="btn btn-sm ${p === page ? 'btn-primary' : 'btn-outline'}" data-p="${p}" ${p === page ? 'disabled' : ''}>${p}</button>`);
    }
    parts.push(`<button class="btn btn-sm btn-outline" data-p="${page + 1}" ${page >= pages ? 'disabled' : ''}>→</button>`);
    container.innerHTML = `<div class="flex items-center gap-1 flex-wrap"><span class="muted">Jami ${total}</span> ${parts.join('')}</div>`;
    container.querySelectorAll('button[data-p]').forEach((b) => {
      b.addEventListener('click', () => onPage(parseInt(b.dataset.p, 10)));
    });
  }
};
