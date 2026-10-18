'use strict';

(async function () {
  const me = await Admin.require();
  if (!me) return;

  const tbody = document.querySelector('#users-table tbody');
  const pagerEl = document.getElementById('pager');
  const state = { page: 1 };

  function params() {
    const p = new URLSearchParams();
    const q = document.getElementById('f-q').value.trim();
    const role = document.getElementById('f-role').value;
    const status = document.getElementById('f-status').value;
    if (q) p.set('q', q);
    if (role) p.set('role', role);
    if (status) p.set('status', status);
    p.set('page', state.page);
    return p.toString();
  }

  function render(items) {
    if (!items.length) {
      tbody.innerHTML = '<tr><td colspan="6" class="muted" style="text-align:center;padding:30px">Foydalanuvchi topilmadi</td></tr>';
      return;
    }
    tbody.innerHTML = items.map((u) => {
      const isSelf = u.id === me.id;
      return `
      <tr>
        <td><b>${App.escapeHtml(u.full_name)}</b>${isSelf ? ' <span class="muted">(siz)</span>' : ''}</td>
        <td>${App.escapeHtml(u.email)}</td>
        <td>${Admin.roleBadge(u.role)}</td>
        <td>${Admin.statusBadge(u.status)}</td>
        <td class="muted">${App.fmtDate(u.created_at)}</td>
        <td class="text-right">
          <div class="flex gap-1" style="justify-content:flex-end;flex-wrap:wrap">
            <button class="btn btn-sm btn-outline" data-action="role" data-id="${u.id}" data-role="${u.role}" ${isSelf ? 'disabled' : ''}>Rol</button>
            <button class="btn btn-sm btn-ghost" data-action="pass" data-id="${u.id}">Parol</button>
            ${u.status === 'active'
              ? `<button class="btn btn-sm btn-ghost" data-action="block" data-id="${u.id}" ${isSelf ? 'disabled' : ''}>Bloklash</button>`
              : `<button class="btn btn-sm btn-primary" data-action="unblock" data-id="${u.id}">Faollashtirish</button>`}
            <button class="btn btn-sm btn-danger" data-action="delete" data-id="${u.id}" ${isSelf ? 'disabled' : ''}>O‘chirish</button>
          </div>
        </td>
      </tr>`;
    }).join('');
  }

  async function load() {
    try {
      const data = await API.get('/api/admin/users?' + params());
      render(data.items);
      Admin.pager(pagerEl, { page: data.page, perPage: data.perPage, total: data.total, onPage: (p) => { state.page = p; load(); } });
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="6" class="muted">${App.escapeHtml(err.message)}</td></tr>`;
    }
  }

  document.getElementById('f-apply').addEventListener('click', () => { state.page = 1; load(); });
  document.getElementById('f-q').addEventListener('keydown', (e) => { if (e.key === 'Enter') { state.page = 1; load(); } });
  document.getElementById('add-toggle').addEventListener('click', () => {
    const f = document.getElementById('add-form');
    f.hidden = !f.hidden;
  });

  document.getElementById('add-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const errBox = document.getElementById('u-error');
    errBox.style.display = 'none';
    try {
      await API.post('/api/admin/users', {
        fullName: document.getElementById('u-name').value.trim(),
        email: document.getElementById('u-email').value.trim(),
        password: document.getElementById('u-pass').value,
        role: document.getElementById('u-role').value
      });
      App.toast('Foydalanuvchi qo‘shildi', 'success');
      e.target.reset();
      document.getElementById('add-form').hidden = true;
      load();
    } catch (err) {
      errBox.textContent = err.message;
      errBox.style.display = 'block';
    }
  });

  tbody.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn || btn.disabled) return;
    const id = btn.dataset.id;
    try {
      if (btn.dataset.action === 'role') {
        const role = prompt('Yangi rol: student / teacher / admin', btn.dataset.role);
        if (!role || role === btn.dataset.role) return;
        await API.patch(`/api/admin/users/${id}`, { role });
        App.toast('Rol yangilandi', 'success');
      } else if (btn.dataset.action === 'pass') {
        const pass = prompt('Yangi parol (kamida 8 belgi):');
        if (!pass) return;
        await API.patch(`/api/admin/users/${id}`, { password: pass });
        App.toast('Parol yangilandi', 'success');
      } else if (btn.dataset.action === 'block') {
        if (!confirm('Foydalanuvchini bloklaysizmi? Barcha sessiyalari bekor qilinadi.')) return;
        await API.patch(`/api/admin/users/${id}`, { status: 'blocked' });
        App.toast('Bloklandi');
      } else if (btn.dataset.action === 'unblock') {
        await API.patch(`/api/admin/users/${id}`, { status: 'active' });
        App.toast('Faollashtirildi', 'success');
      } else if (btn.dataset.action === 'delete') {
        if (!confirm('Foydalanuvchini butunlay o‘chirasizmi? Uning natijalari va testlari ham o‘chadi.')) return;
        await API.del(`/api/admin/users/${id}`);
        App.toast('O‘chirildi');
      }
      load();
    } catch (err) {
      App.toast(err.message, 'error');
    }
  });

  load();
})();
