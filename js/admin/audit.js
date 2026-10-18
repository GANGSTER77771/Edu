'use strict';

(async function () {
  const user = await Admin.require();
  if (!user) return;

  const tbody = document.querySelector('#audit-table tbody');
  const pagerEl = document.getElementById('pager');
  const state = { page: 1 };

  async function load() {
    try {
      const p = new URLSearchParams();
      const action = document.getElementById('f-action').value.trim();
      if (action) p.set('action', action);
      p.set('page', state.page);
      const items = await API.get('/api/admin/audit-logs?' + p.toString());
      if (!items.items.length) {
        tbody.innerHTML = '<tr><td colspan="5" class="muted" style="text-align:center;padding:30px">Qaydlar topilmadi</td></tr>';
      } else {
        tbody.innerHTML = items.items.map((a) => `
          <tr>
            <td class="muted nowrap">${App.fmtDateTime(a.created_at)}</td>
            <td>${App.escapeHtml(a.actor_name || 'Tizim')}<br><span class="muted">${App.escapeHtml(a.actor_email || '')}</span></td>
            <td><b>${App.escapeHtml(Admin.auditLabel(a.action))}</b><br><span class="muted">${App.escapeHtml(a.action)}</span></td>
            <td class="muted">${App.escapeHtml(a.entity_type || '')}${a.entity_id ? ' #' + App.escapeHtml(String(a.entity_id)) : ''}</td>
            <td class="muted" style="max-width:340px;word-break:break-all">${App.escapeHtml(Admin.auditDetails(a))}</td>
          </tr>`).join('');
      }
      Admin.pager(pagerEl, {
        page: items.page,
        perPage: items.limit,
        total: items.page * items.limit + (items.items.length === items.limit ? 1 : 0),
        onPage: (pg) => { state.page = pg; load(); }
      });
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="5" class="muted">${App.escapeHtml(err.message)}</td></tr>`;
    }
  }

  document.getElementById('f-apply').addEventListener('click', () => { state.page = 1; load(); });
  document.getElementById('f-action').addEventListener('keydown', (e) => { if (e.key === 'Enter') { state.page = 1; load(); } });
  load();
})();
